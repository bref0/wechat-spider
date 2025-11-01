#!/usr/bin/env node
import { Command } from 'commander';
import { WeChatLogin } from '../wechat/login.js';
import { WeChatScraper } from '../wechat/scraper.js';
import { saveArticles } from '../storage';
import { logger } from '../logger';
import { loadConfig } from '../config';
import { searchAccount } from '../wechat/api.js';
import { startInteractive } from './interactive.js';

const program = new Command();

program
  .name('wechat-spider')
  .description('微信公众号爬虫工具 - Node.js TypeScript 版本')
  .version('1.0.0')
  .action(async () => {
    // 无参数时启动交互式菜单
    if (process.argv.length === 2) {
      await startInteractive();
    }
  });

// 登录命令
program
  .command('login')
  .description('登录微信公众平台')
  .action(async () => {
    try {
      const login = new WeChatLogin();
      await login.login();
    } catch (error) {
      logger.error(`登录失败: ${error}`);
      process.exit(1);
    }
  });

// 搜索公众号
program
  .command('search <name>')
  .description('搜索公众号')
  .action(async (name: string) => {
    try {
      const login = new WeChatLogin();
      const { token, cookie } = await login.getLoginInfo();

      logger.info(`搜索公众号: ${name}`);
      const accounts = await searchAccount(token, cookie, name);

      if (accounts.length === 0) {
        logger.warn('未找到匹配的公众号');
        return;
      }

      logger.info(`找到 ${accounts.length} 个匹配的公众号:`);
      accounts.forEach((acc, i) => {
        logger.info(`${i + 1}. ${acc.wpub_name} (fakeid: ${acc.wpub_fakid})`);
      });
    } catch (error) {
      logger.error(`搜索失败: ${error}`);
      process.exit(1);
    }
  });

// 爬取单个公众号
program
  .command('scrape <name>')
  .description('爬取单个公众号')
  .option('-p, --pages <number>', '最大页数', '10')
  .option('-d, --days <number>', '最近几天', '30')
  .option('-l, --limit <number>', '限制文章数量')
  .option('--start-date <date>', '开始日期 (YYYY-MM-DD)')
  .option('--end-date <date>', '结束日期 (YYYY-MM-DD)')
  .option('--all', '爬取所有文章(忽略 pages 限制)')
  .option('--skip-existing', '跳过数据库中已存在的文章')
  .action(async (name: string, options: any) => {
    try {
      const config = await loadConfig();

      const scraper = new WeChatScraper(config); // 传入配置
      const articles = await scraper.scrapeAccount(name, {
        maxPages: options.all ? 999 : parseInt(options.pages),
        days: options.all ? 0 : (options.days ? parseInt(options.days) : undefined), // --all 时禁用日期过滤
        limit: options.limit ? parseInt(options.limit) : undefined,
        startDate: options.startDate,
        endDate: options.endDate,
        skipExisting: options.skipExisting,
      });

      if (articles.length === 0) {
        logger.warn('没有获取到文章');
        return;
      }

      logger.info('开始保存文章...');
      await saveArticles(articles);

      logger.info(`✓ 完成! 共爬取 ${articles.length} 篇文章`);
    } catch (error) {
      logger.error(`爬取失败: ${error}`);
      process.exit(1);
    }
  });

// 批量爬取多个公众号 (从配置文件读取)
program
  .command('batch')
  .description('批量爬取配置文件中的公众号列表')
  .option('-p, --pages <number>', '最大页数')
  .option('-d, --days <number>', '最近几天')
  .option('-l, --limit <number>', '每个公众号限制文章数量')
  .option('--start-date <date>', '开始日期 (YYYY-MM-DD)')
  .option('--end-date <date>', '结束日期 (YYYY-MM-DD)')
  .option('--skip-existing', '跳过数据库中已存在的文章')
  .action(async (options: any) => {
    try {
      const config = await loadConfig();

      // 从配置文件读取公众号列表
      if (!config.batch?.accounts || config.batch.accounts.length === 0) {
        logger.error('配置文件中未设置公众号列表');
        logger.info('\n请在 config.json 中配置:');
        logger.info(JSON.stringify({
          batch: {
            accounts: ['公众号1', '公众号2'],
            accountInterval: 10
          }
        }, null, 2));
        process.exit(1);
      }

      const accounts = config.batch.accounts;
      const accountInterval = config.batch?.accountInterval || 10;
      logger.info(`从配置文件读取到 ${accounts.length} 个公众号`);

      logger.info(`账号间隔: ${accountInterval} 秒`);

      // 逐个爬取
      for (let i = 0; i < accounts.length; i++) {
        const accountName = accounts[i];
        logger.info(`\n[${i + 1}/${accounts.length}] 开始爬取: ${accountName}`);

        try {
          const scraper = new WeChatScraper(config); // 传入配置
          const articles = await scraper.scrapeAccount(accountName, {
            maxPages: options.pages ? parseInt(options.pages) : config.scraper.maxPages,
            days: options.days ? parseInt(options.days) : config.scraper.days,
            limit: options.limit ? parseInt(options.limit) : undefined,
            startDate: options.startDate,
            endDate: options.endDate,
            includeContent: options.content,
            skipExisting: options.skipExisting,
          });

          if (articles.length > 0) {
            await saveArticles(articles);
            logger.info(`✓ ${accountName} 完成! 共爬取 ${articles.length} 篇文章`);
          } else {
            logger.warn(`${accountName} 没有获取到文章`);
          }

          // 账号之间间隔
          if (i < accounts.length - 1) {
            logger.info(`等待 ${accountInterval} 秒后继续...`);
            await new Promise(resolve => setTimeout(resolve, accountInterval * 1000));
          }
        } catch (error) {
          logger.error(`${accountName} 爬取失败: ${error}`);
          // 继续下一个
        }
      }

      logger.info(`\n✓ 批量爬取完成!`);
    } catch (error) {
      logger.error(`批量爬取失败: ${error}`);
      process.exit(1);
    }
  });

program.parse();
