import { z } from 'zod';

export const configSchema = z.object({
  storage: z.object({
    mode: z.enum(['database']),

    database: z.object({
      type: z.enum(['mysql']),
      url: z.string(),
    }),
  }),

  scraper: z.object({
    requestInterval: z.number(),
    maxPages: z.number(),
    days: z.number(),
  }),

  // 批量爬取配置
  batch: z.object({
    // 要爬取的公众号列表
    accounts: z.array(z.string()),
    // 账号间隔时间 (秒) - 顺序执行,避免被封
    accountInterval: z.number(),
  }).optional(),
});

export type Config = z.infer<typeof configSchema>;
