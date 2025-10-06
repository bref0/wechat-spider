import { WeChatLogin } from './login.js';
import { searchAccount, getArticlesList, getArticleContent } from './api.js';
import { parseArticleContent } from './parser.js';
import { logger } from '../logger/index.js';
import { loadConfig } from '../config/index.js';
import { filterExistingArticles } from '../storage/database.js';
import type { Article } from '../types/index.js';

export class WeChatScraper {
  private login: WeChatLogin;
  private config: any;

  constructor(config?: any) {
    this.login = new WeChatLogin();
    this.config = config;
  }

  async scrapeAccount(
    accountName: string,
    options: {
      maxPages?: number;
      days?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      includeContent?: boolean;
      skipExisting?: boolean;
    } = {}
  ): Promise<Article[]> {
    const config = this.config || await loadConfig();
    const maxPages = options.maxPages || config.scraper.maxPages;
    // 只有在未指定 limit 和 startDate/endDate 时才使用默认 days
    const days = options.limit || options.startDate || options.endDate ? options.days : (options.days ?? config.scraper.days);
    const limit = options.limit;
    const includeContent = options.includeContent ?? true;

    logger.info(`开始爬取公众号: ${accountName}`);

    // 获取登录信息
    const { token, cookie } = await this.login.getLoginInfo();

    // 搜索公众号
    logger.info('搜索公众号...');
    const accounts = await searchAccount(token, cookie, accountName);

    if (accounts.length === 0) {
      throw new Error(`未找到公众号: ${accountName}`);
    }

    const account = accounts[0];
    logger.info(`✓ 找到公众号: ${account.wpub_name} (${account.wpub_fakid})`);

    // 计算日期范围
    let startTime = 0;
    let endTime = Date.now() / 1000;
    let enableDateFilter = false; // 是否启用日期过滤

    if (options.startDate) {
      startTime = new Date(options.startDate).getTime() / 1000;
      enableDateFilter = true;
    } else if (days && days > 0) { // days > 0 才启用过滤
      startTime = Date.now() / 1000 - days * 24 * 60 * 60;
      enableDateFilter = true;
    }

    if (options.endDate) {
      endTime = new Date(options.endDate).getTime() / 1000;
      enableDateFilter = true;
    }

    logger.info(`开始获取文章列表 (最多 ${maxPages} 页)...`);
    if (options.startDate || options.endDate) {
      logger.info(
        `日期范围: ${options.startDate || '不限'} 至 ${options.endDate || '今天'}`
      );
    } else if (days && days > 0) {
      logger.info(`获取最近 ${days} 天的文章`);
    } else {
      logger.info(`获取所有文章(不限日期)`);
    }
    if (limit) {
      logger.info(`限制数量: ${limit} 篇`);
    }

    const articles: Article[] = [];
    let shouldStop = false;

    for (let page = 0; page < maxPages; page++) {
      const begin = page * 5;
      logger.debug(`正在请求第 ${page + 1} 页 (begin=${begin}, fakeid=${account.wpub_fakid})`);

      const articleList = await getArticlesList(token, cookie, account.wpub_fakid, begin);

      logger.debug(`API 返回: ${articleList.length} 篇文章`);

      if (articleList.length === 0) {
        if (page === 0) {
          logger.warn('第一页就没有文章,可能原因:');
          logger.warn('  1. 该公众号没有发布过文章');
          logger.warn('  2. 登录 token 已过期');
          logger.warn('  3. 被微信限流/封禁');
          logger.warn('  4. 公众号 fakeid 不正确');
        } else {
          logger.info('没有更多文章了');
        }
        break;
      }

      logger.info(`第 ${page + 1}/${maxPages} 页: 获取到 ${articleList.length} 篇文章`);

      for (const item of articleList) {
        // 过滤日期(仅在启用日期过滤时)
        if (enableDateFilter) {
          if (item.update_time < startTime) {
            logger.info(`文章超出日期范围(早于 ${new Date(startTime * 1000).toLocaleDateString()}),停止爬取`);
            shouldStop = true;
            break;
          }

          if (item.update_time > endTime) {
            continue; // 跳过未来的文章
          }
        }

        const article: Article = {
          accountName: account.wpub_name,
          title: item.title,
          url: item.link,
          publishTime: new Date(item.update_time * 1000),
          publishTimestamp: item.update_time,
          digest: item.digest || '',
        };

        articles.push(article);

        // 检查是否达到限制数量
        if (limit && articles.length >= limit) {
          logger.info(`已达到限制数量 ${limit} 篇,停止爬取`);
          shouldStop = true;
          break;
        }
      }

      // 如果需要停止,退出外层循环
      if (shouldStop || (limit && articles.length >= limit)) {
        break;
      }

      // 请求间隔
      if (page < maxPages - 1) {
        const delay = config.scraper.requestInterval * 1000;
        logger.info(`等待 ${config.scraper.requestInterval} 秒...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    logger.info(`✓ 共获取 ${articles.length} 篇文章`);

    // 过滤已存在的文章 (如果启用 skipExisting)
    let filteredArticles = articles;
    if (options.skipExisting) {
      const config = await loadConfig();
      if (config.storage.mode === 'database' || config.storage.mode === 'both') {
        logger.info('检查数据库中已存在的文章...');
        const urls = articles.map((a) => a.url);
        const existingUrls = await filterExistingArticles(urls);

        if (existingUrls.length > 0) {
          logger.info(`发现 ${existingUrls.length} 篇文章已存在,将跳过`);
          const existingUrlSet = new Set(existingUrls);
          filteredArticles = articles.filter((a) => !existingUrlSet.has(a.url));
          logger.info(`剩余 ${filteredArticles.length} 篇新文章`);
        } else {
          logger.info('没有发现已存在的文章');
        }
      } else {
        logger.warn('--skip-existing 仅在 database 或 both 模式下有效');
      }
    }

    // 获取文章内容
    if (includeContent) {
      logger.info('开始获取文章内容...');

      for (let i = 0; i < filteredArticles.length; i++) {
        const article = filteredArticles[i];
        logger.info(`[${i + 1}/${filteredArticles.length}] ${article.title}`);

        try {
          const html = await getArticleContent(article.url, cookie);
          const parsed = parseArticleContent(html);

          article.content = parsed.markdown;
          article.images = parsed.images;
          article.videos = parsed.videos;

          // 请求间隔
          if (i < filteredArticles.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
        } catch (error) {
          logger.error(`获取文章内容失败: ${error}`);
        }
      }
    }

    logger.info(`✓ 爬取完成,共 ${filteredArticles.length} 篇文章`);
    return filteredArticles;
  }
}
