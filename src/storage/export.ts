import { createObjectCsvWriter } from 'csv-writer';
import { prisma } from './database.js';
import { logger } from '../logger/index.js';
import { loadConfig } from '../config/index.js';

export async function exportAccountToCSV(
  accountName: string,
  outputPath: string
): Promise<number> {
  const config = await loadConfig();

  const articles = await prisma.article.findMany({
    where: { account: { name: accountName } },
    include: { account: true },
    orderBy: { publishTime: 'desc' },
  });

  if (articles.length === 0) {
    logger.warn(`没有找到公众号 "${accountName}" 的文章`);
    return 0;
  }

  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'accountName', title: '公众号' },
      { id: 'title', title: '标题' },
      { id: 'publishTime', title: '发布时间' },
      { id: 'url', title: '链接' },
      { id: 'content', title: '内容' },
    ],
    encoding: config.export.csv.encoding as BufferEncoding,
  });

  const records = articles.map((a) => ({
    accountName: a.account.name,
    title: a.title,
    publishTime: a.publishTime?.toLocaleString('zh-CN') || '',
    url: a.url,
    content: config.export.csv.includeContent ? a.content || '' : '',
  }));

  await csvWriter.writeRecords(records);
  logger.info(`✓ 导出 ${records.length} 篇文章到 ${outputPath}`);

  return records.length;
}
