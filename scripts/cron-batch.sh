#!/bin/bash

# 定时批量爬取脚本 (用于 cron job)
# 使用方法: 在 crontab 中添加
# 0 */6 * * * /path/to/cron-batch.sh >> /path/to/logs/cron.log 2>&1

# 切换到项目目录
cd "$(dirname "$0")/.." || exit 1

# 记录开始时间
echo "============================================================"
echo "$(date '+%Y-%m-%d %H:%M:%S') - 开始定时爬取"
echo "============================================================"

# 设置 Node.js 环境 (如果使用 nvm)
# export NVM_DIR="$HOME/.nvm"
# [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 运行批量爬取 (使用 CLI 命令)
pnpm exec tsx src/cli/index.ts batch

# 记录结束时间
EXIT_CODE=$?
echo "============================================================"
echo "$(date '+%Y-%m-%d %H:%M:%S') - 爬取完成 (退出码: $EXIT_CODE)"
echo "============================================================"

exit $EXIT_CODE
