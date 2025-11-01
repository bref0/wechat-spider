import { PrismaClient } from '@prisma/client';
import type { Article } from '../types';
import {logger} from "../logger";

// 修复 Prisma 相对路径问题:将相对路径转换为绝对路径
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  logger.error('请检查 .env 文件中的 DATABASE_URL 配置');
  process.exit(0);
}

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export async function saveArticleToDatabase(article: Article): Promise<void> {
  // 转换为北京时间
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  // 1. 保存公众号
  const account = await prisma.account.upsert({
    where: {name: article.accountName},
    update: {},
    create: {
      name: article.accountName,
      created_at: beijingTime,
      updated_at: beijingTime,
    },
  });

  // 2. 保存文章
  await prisma.article.upsert({
    where: { url: article.url },
    update: {
      title: article.title,
      publish_timestamp: article.publishTimestamp,
      updated_at: beijingTime,
    },
    create: {
      account_id: account.id,
      title: article.title,
      url: article.url,
      publish_timestamp: article.publishTimestamp,
      created_at: beijingTime,
      updated_at: beijingTime,
    },
  });
}

/**
 * 批量检查文章URL是否存在
 */
export async function filterExistingArticles(urls: string[]): Promise<string[]> {
  const existingArticles = await prisma.article.findMany({
    where: {
      url: {
        in: urls,
      },
    },
    select: { url: true },
  });

  const existingUrls = new Set(existingArticles.map((a) => a.url));
  return urls.filter((url) => existingUrls.has(url));
}
