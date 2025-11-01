import { z } from 'zod';

export const configSchema = z.object({
  storage: z.object({
    mode: z.enum(['database']).default('database'),

    database: z.object({
      type: z.enum(['sqlite', 'mysql']).default('sqlite'),
      url: z.string().default('file:./data/wechat.db'),
      saveMediaUrls: z.boolean().default(true),
      downloadMedia: z.boolean().default(false),
      mediaDir: z.string().default('./data/media'),
    }),
  }),

  scraper: z.object({
    requestInterval: z.number().default(10),
    maxPages: z.number().default(10),
    days: z.number().default(30),
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
