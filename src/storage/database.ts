import { PrismaClient } from '@prisma/client';
import path from 'path';
import type { Article } from '../types/index.js';

// 修复 Prisma 相对路径问题:将相对路径转换为绝对路径
const dbUrl = process.env.DATABASE_URL || 'file:./data/wechat.db';
const absoluteDbUrl = dbUrl.startsWith('file:./')
  ? `file:${path.resolve(process.cwd(), dbUrl.replace('file:', ''))}`
  : dbUrl;

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: absoluteDbUrl,
    },
  },
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export async function saveArticleToDatabase(article: Article): Promise<void> {
  // 1. 确保账号存在
  const account = await prisma.account.upsert({
    where: {
      name_platform: {
        name: article.accountName,
        platform: 'wechat',
      },
    },
    update: {},
    create: {
      name: article.accountName,
      platform: 'wechat',
    },
  });

  // 3. 保存文章
  await prisma.article.upsert({
    where: { url: article.url },
    update: {
      title: article.title,
      publishTimestamp: article.publishTimestamp,
    },
    create: {
      accountId: account.id,
      title: article.title,
      url: article.url,
      publishTimestamp: article.publishTimestamp
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
