import { chromium } from 'playwright';
import fs from 'fs-extra';
import { logger } from '../logger/index.js';
import type { LoginCache } from '../types/index.js';

export class WeChatLogin {
  private cacheFile: string;
  private cacheExpireMs: number;

  constructor(
    cacheFile = process.env.WECHAT_CACHE_FILE || 'wechat_cache.json',
    expireHours = Number(process.env.WECHAT_CACHE_EXPIRE_HOURS) || 96
  ) {
    this.cacheFile = cacheFile;
    this.cacheExpireMs = expireHours * 60 * 60 * 1000;
  }

  async checkCache(): Promise<LoginCache | null> {
    if (!(await fs.pathExists(this.cacheFile))) {
      logger.info('缓存文件不存在,需要重新登录');
      return null;
    }

    const cache: LoginCache = await fs.readJson(this.cacheFile);
    const isExpired = Date.now() - cache.timestamp > this.cacheExpireMs;

    if (isExpired) {
      const hours = ((Date.now() - cache.timestamp) / (1000 * 60 * 60)).toFixed(1);
      logger.info(`缓存已过期 (${hours} 小时前),需要重新登录`);
      return null;
    }

    logger.info('✓ 使用缓存的登录信息');
    return cache;
  }

  async login(): Promise<LoginCache> {
    const cache = await this.checkCache();
    if (cache) return cache;

    logger.info('启动浏览器,准备登录微信公众平台...');

    const browser = await chromium.launch({
      headless: false,
      channel: 'chrome', // 使用系统 Chrome
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://mp.weixin.qq.com/');

    logger.info('📱 请使用微信扫码登录...');
    logger.info('⏳ 扫码成功后请等待约 10-20 秒获取登录信息...');

    try {
      // 优化: 使用轮询检查 URL,更快响应登录成功
      const startTime = Date.now();
      const timeout = 120000; // 2 分钟超时

      while (Date.now() - startTime < timeout) {
        const url = page.url();
        if (url.includes('token=')) {
          // 登录成功,立即获取数据
          const urlObj = new URL(url);
          const token = urlObj.searchParams.get('token');

          if (!token) {
            throw new Error('无法获取 token');
          }

          const cookies = await context.cookies();
          const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

          await browser.close();

          const loginData: LoginCache = {
            token,
            cookie: cookieString,
            timestamp: Date.now(),
          };

          await fs.writeJson(this.cacheFile, loginData, { spaces: 2 });
          logger.info('✓ 登录成功,已保存缓存');

          return loginData;
        }

        // 每 200ms 检查一次 URL,减少响应延迟
        await page.waitForTimeout(200);
      }

      throw new Error('登录超时,请重试');
    } catch (error) {
      await browser.close();
      throw new Error(`登录失败: ${error}`);
    }
  }

  async getLoginInfo(): Promise<LoginCache> {
    const cache = await this.checkCache();
    if (!cache) {
      throw new Error('未登录或登录已过期,请先运行: pnpm spider login');
    }
    return cache;
  }
}

export async function quickLogin(): Promise<LoginCache> {
  const loginManager = new WeChatLogin();
  return await loginManager.login();
}
