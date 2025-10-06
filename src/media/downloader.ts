import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import pLimit from 'p-limit';
import { logger } from '../logger/index.js';
import { loadConfig } from '../config/index.js';
import type { MediaFile } from '../types/index.js';

export async function downloadFile(
  url: string,
  outputPath: string,
  retries?: number
): Promise<boolean> {
  const config = await loadConfig();
  const maxRetries = retries ?? config.media.download.retryTimes;

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: config.media.download.timeout,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, response.data);

    logger.info(`✓ 下载成功: ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    if (maxRetries > 0) {
      logger.warn(`下载失败,重试中... (剩余 ${maxRetries} 次)`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return downloadFile(url, outputPath, maxRetries - 1);
    }

    logger.error(`✗ 下载失败: ${url}`);
    return false;
  }
}

export async function downloadMedia(
  mediaList: MediaFile[],
  articleDir: string
): Promise<MediaFile[]> {
  const config = await loadConfig();
  const limit = pLimit(config.media.download.concurrent);

  const imageCount = { current: 0 };
  const videoCount = { current: 0 };

  const tasks = mediaList.map((media) =>
    limit(async () => {
      const ext = path.extname(new URL(media.url).pathname) || (media.type === 'image' ? '.jpg' : '.mp4');

      const index = media.type === 'image' ? ++imageCount.current : ++videoCount.current;

      const fileName = config.media.naming.pattern
        .replace('{type}', media.type)
        .replace('{index}', String(index))
        .replace('{ext}', ext.slice(1));

      const subDir = media.type === 'image' ? 'images' : 'videos';
      const localPath = path.join(articleDir, subDir, fileName);

      const success = await downloadFile(media.url, localPath);

      return {
        ...media,
        localPath: success ? localPath : undefined,
      };
    })
  );

  return await Promise.all(tasks);
}
