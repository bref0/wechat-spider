import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { logger } from '../logger/index.js';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// 自定义图片规则 - 处理微信的 data-src
turndownService.addRule('wechatImage', {
  filter: 'img',
  replacement: (content, node: any) => {
    const alt = node.getAttribute('alt') || '';
    const src = node.getAttribute('data-src') || node.getAttribute('src') || '';
    const title = node.getAttribute('title') || '';
    const titlePart = title ? ` "${title}"` : '';
    return `\n![${alt}](${src}${titlePart})\n`;
  },
});

export function parseArticleContent(html: string): {
  content: string;
  markdown: string;
  images: string[];
  videos: string[];
} {
  const $ = cheerio.load(html);

  // 提取正文内容
  const contentEle = $('.rich_media_content');

  let htmlContent = '';
  let markdown = '';
  const images: string[] = [];
  const videos: string[] = [];

  if (contentEle.length > 0) {
    htmlContent = contentEle.html() || '';

    // 提取图片链接
    contentEle.find('img').each((_, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      if (src && !images.includes(src)) {
        images.push(src);
      }
    });

    // 提取视频链接
    contentEle.find('iframe, video').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !videos.includes(src)) {
        videos.push(src);
      }
    });

    // 转换为 Markdown
    try {
      markdown = turndownService.turndown(htmlContent);
    } catch (error) {
      logger.error(`Markdown 转换失败: ${error}`);
      markdown = htmlContent;
    }
  }

  return {
    content: htmlContent,
    markdown,
    images,
    videos,
  };
}

export function extractMetaInfo(html: string): {
  title?: string;
  author?: string;
  publishTime?: string;
} {
  const $ = cheerio.load(html);

  const title = $('#activity-name').text().trim() || $('h1').first().text().trim();
  const author = $('#js_author_name').text().trim() || $('.rich_media_meta_text').first().text().trim();
  const publishTime = $('#publish_time').text().trim();

  return {
    title,
    author,
    publishTime,
  };
}
