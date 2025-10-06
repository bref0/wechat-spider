import { z } from 'zod';

export const configSchema = z.object({
  storage: z.object({
    mode: z.enum(['local', 'database', 'both']).default('local'),

    local: z.object({
      baseDir: z.string().default('./output'),
      folderNameTemplate: z.string().default('{title}_{date}'),
      downloadMedia: z.boolean().default(true),
      saveAs: z.enum(['markdown', 'html']).default('markdown'),
      includeMetadata: z.boolean().default(true),
      sanitizeFolderName: z.boolean().default(true),
    }),

    database: z.object({
      type: z.enum(['sqlite', 'mysql']).default('sqlite'),
      url: z.string().default('file:./data/wechat.db'),
      saveMediaUrls: z.boolean().default(true),
      downloadMedia: z.boolean().default(false),
      mediaDir: z.string().default('./data/media'),
    }),
  }),

  media: z.object({
    download: z.object({
      images: z.boolean().default(true),
      videos: z.boolean().default(true),
      timeout: z.number().default(30000),
      retryTimes: z.number().default(3),
      concurrent: z.number().default(5),
    }),
    naming: z.object({
      useOriginalName: z.boolean().default(false),
      pattern: z.string().default('{type}-{index}.{ext}'),
    }),
  }),

  scraper: z.object({
    requestInterval: z.number().default(10),
    maxPages: z.number().default(10),
    days: z.number().default(30),
  }),

  export: z.object({
    csv: z.object({
      enabled: z.boolean().default(true),
      encoding: z.string().default('utf8'),
      includeContent: z.boolean().default(true),
      includeMediaLinks: z.boolean().default(true),
    }),
  }),

  // 批量爬取配置
  batch: z.object({
    // 要爬取的公众号列表
    accounts: z.array(z.string()).default([]),
    // 账号间隔时间 (秒) - 顺序执行,避免被封
    accountInterval: z.number().default(10),
  }).optional(),
});

export type Config = z.infer<typeof configSchema>;
