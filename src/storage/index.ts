import { loadConfig } from '../config/index.js';
import { saveArticleToDatabase } from './database.js';
import { logger } from '../logger/index.js';
import type { Article } from '../types/index.js';

export async function saveArticle(article: Article): Promise<void> {
  const config = await loadConfig();
  const mode = config.storage.mode;

  try {
    await saveArticleToDatabase(article);
    logger.info(`✓ 文章保存成功 (${mode} 模式): ${article.title}`);
  } catch (error) {
    logger.error(`✗ 文章保存失败: ${error}`);
    throw error;
  }
}

export async function saveArticles(articles: Article[]): Promise<void> {
  for (const article of articles) {
    await saveArticle(article);
  }
}
