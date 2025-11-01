import { saveArticleToDatabase } from './database.js';
import { logger } from '../logger';
import type { Article } from '../types';

export async function saveArticle(article: Article): Promise<void> {
  try {
    await saveArticleToDatabase(article);
    logger.info(`✓ 文章保存成功: ${article.title}`);
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
