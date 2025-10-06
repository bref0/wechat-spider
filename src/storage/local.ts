import path from 'path';
import fs from 'fs-extra';
import { logger } from '../logger/index.js';
import { loadConfig } from '../config/index.js';
import { downloadMedia } from '../media/downloader.js';
import type { Article, MediaFile } from '../types/index.js';

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 100);
}

export async function generateFolderName(article: Article): Promise<string> {
  const config = await loadConfig();
  const template = config.storage.local.folderNameTemplate;

  const date = article.publishTime?.toISOString().split('T')[0] || 'unknown';

  let folderName = template.replace('{title}', article.title).replace('{date}', date);

  if (config.storage.local.sanitizeFolderName) {
    folderName = sanitizeFilename(folderName);
  }

  return folderName;
}

export async function saveArticleToLocal(article: Article): Promise<string> {
  const config = await loadConfig();

  const accountDir = path.join(config.storage.local.baseDir, article.accountName);
  const folderName = await generateFolderName(article);
  const articleDir = path.join(accountDir, folderName);

  await fs.ensureDir(articleDir);

  // 1. 保存元数据
  if (config.storage.local.includeMetadata) {
    const metadata = {
      title: article.title,
      url: article.url,
      publishTime: article.publishTime?.toISOString(),
      downloadedAt: new Date().toISOString(),
      images: article.images || [],
      videos: article.videos || [],
    };

    await fs.writeJson(path.join(articleDir, 'article.json'), metadata, {
      spaces: 2,
    });
  }

  // 2. 下载图片和视频
  let finalContent = article.content || '';

  if (config.storage.local.downloadMedia && (article.images?.length || article.videos?.length)) {
    const mediaList: MediaFile[] = [
      ...(article.images || []).map((url) => ({ url, type: 'image' as const })),
      ...(article.videos || []).map((url) => ({ url, type: 'video' as const })),
    ];

    logger.info(`开始下载 ${mediaList.length} 个媒体文件...`);
    const downloadedMedia = await downloadMedia(mediaList, articleDir);

    // 替换内容中的链接为本地路径
    downloadedMedia.forEach((media) => {
      if (media.localPath) {
        const relativePath = path.relative(articleDir, media.localPath);
        finalContent = finalContent.replace(media.url, relativePath);
      }
    });
  }

  // 3. 保存文章内容
  const ext = config.storage.local.saveAs === 'markdown' ? 'md' : 'html';
  await fs.writeFile(path.join(articleDir, `article.${ext}`), finalContent, 'utf-8');

  logger.info(`✓ 文章已保存: ${articleDir}`);

  return articleDir;
}
