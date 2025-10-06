import { PrismaClient } from '@prisma/client';
import { logger } from '../logger/index.js';
import { loadConfig } from '../config/index.js';
import { downloadMedia } from '../media/downloader.js';
import path from 'path';
import type { Article, MediaFile } from '../types/index.js';

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
  const config = await loadConfig();

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

  // 2. 处理媒体文件
  let mediaData: any = {
    images: article.images || [],
    videos: article.videos || [],
  };

  if (config.storage.database.downloadMedia && (article.images?.length || article.videos?.length)) {
    const mediaDir = path.join(
      config.storage.database.mediaDir,
      account.name,
      article.title.slice(0, 50)
    );

    const mediaList: MediaFile[] = [
      ...(article.images || []).map((url) => ({ url, type: 'image' as const })),
      ...(article.videos || []).map((url) => ({ url, type: 'video' as const })),
    ];

    const downloaded = await downloadMedia(mediaList, mediaDir);

    mediaData = {
      images: downloaded
        .filter((m) => m.localPath && m.type === 'image')
        .map((m) => ({ url: m.url, localPath: m.localPath })),
      videos: downloaded
        .filter((m) => m.localPath && m.type === 'video')
        .map((m) => ({ url: m.url, localPath: m.localPath })),
    };
  }

  // 3. 保存文章
  await prisma.article.upsert({
    where: { url: article.url },
    update: {
      title: article.title,
      content: article.content,
      publishTime: article.publishTime,
      publishTimestamp: article.publishTimestamp,
      digest: article.digest,
      media: JSON.stringify(mediaData),
    },
    create: {
      accountId: account.id,
      title: article.title,
      url: article.url,
      content: article.content,
      publishTime: article.publishTime,
      publishTimestamp: article.publishTimestamp,
      digest: article.digest,
      media: JSON.stringify(mediaData),
    },
  });

  logger.info(`✓ 数据库已保存: ${article.title}`);
}

/**
 * 检查文章URL是否已存在于数据库
 */
export async function articleExists(url: string): Promise<boolean> {
  const article = await prisma.article.findUnique({
    where: { url },
    select: { id: true },
  });
  return article !== null;
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
