import pino from 'pino';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const logFile = process.env.LOG_FILE || './logs/spider.log';

// 确保日志目录存在
const logDir = dirname(logFile);
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        level: 'info',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
      {
        target: 'pino/file',
        level: 'info',
        options: {
          destination: logFile,
          mkdir: true,
        },
      },
    ],
  },
});
