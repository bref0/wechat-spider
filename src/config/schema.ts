import { z } from 'zod';

export const configSchema = z.object({
  storage: z.object({
    mode: z.enum(['database']).default(),

    database: z.object({
      type: z.enum(['mysql']).default(),
      url: z.string().default(),
    }),
  }),

  scraper: z.object({
    requestInterval: z.number().default(),
    maxPages: z.number().default(),
    days: z.number().default(),
  }),

  // 批量爬取配置
  batch: z.object({
    // 要爬取的公众号列表
    accounts: z.array(z.string()).default(),
    // 账号间隔时间 (秒) - 顺序执行,避免被封
    accountInterval: z.number().default(),
  }).optional(),
});

export type Config = z.infer<typeof configSchema>;
