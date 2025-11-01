import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import JSON5 from 'json5';
import { configSchema, type Config } from './schema.js';
import { logger } from '../logger/index.js';

// 加载环境变量
dotenv.config();

let cachedConfig: Config | null = null;

export async function loadConfig(): Promise<Config> {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), 'config.json');

  let userConfig = {};

  if (await fs.pathExists(configPath)) {
    try {
      // 使用 JSON5 解析器,支持注释
      const content = await fs.readFile(configPath, 'utf-8');
      userConfig = JSON5.parse(content);
      logger.info('已加载配置文件: config.json');
    } catch (error) {
      logger.warn('配置文件格式错误,使用默认配置');
    }
  } else {
    logger.info('未找到配置文件,使用默认配置');
  }
  // 直接解析用户配置,Zod 会自动填充默认值
  cachedConfig = configSchema.parse(userConfig);
  // 注意: 不再从环境变量覆盖配置,请在 config.json 中设置
  // 环境变量仅用于数据库连接、日志级别等敏感信息

  return cachedConfig;
}

/**
 * 重置配置缓存(用于 CLI 参数覆盖配置时)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}

/**
 * 更新配置缓存(用于 CLI 参数覆盖配置时)
 */
export function updateConfig(config: Config): void {
  cachedConfig = config;
}

export { type Config };
