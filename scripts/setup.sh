#!/bin/bash

echo "🚀 初始化微信公众号爬虫项目..."

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "❌ Node.js 版本过低,需要 >= 22.0.0"
  echo "   当前版本: $(node -v)"
  exit 1
fi

echo "✓ Node.js 版本: $(node -v)"

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
  echo "❌ 未安装 pnpm,请运行: npm install -g pnpm"
  exit 1
fi

echo "✓ pnpm 已安装"

# 安装依赖
echo ""
echo "📦 安装依赖..."
pnpm install

# 生成 Prisma Client
echo ""
echo "🗄️  生成 Prisma Client..."
pnpm db:generate

# 检查配置文件
if [ -f ".env" ]; then
  echo "✓ .env 已存在"
else
  echo "❌ .env 不存在,请从仓库重新克隆"
  exit 1
fi

if [ -f "config.json" ]; then
  echo "✓ config.json 已存在 (支持 JSON5 注释)"
else
  echo "❌ config.json 不存在,请从仓库重新克隆或运行 pnpm dev 使用配置向导"
  exit 1
fi

# 创建必要的目录
mkdir -p output data logs

echo ""
echo "✅ 初始化完成!"
echo ""
echo "下一步:"
echo "  1. 登录微信公众平台:"
echo "     pnpm spider:login"
echo ""
echo "  2. 搜索公众号:"
echo "     pnpm dev search \"公众号名称\""
echo ""
echo "  3. 爬取文章:"
echo "     pnpm dev scrape \"公众号名称\" --mode local --pages 5"
echo ""
echo "详细使用方法请查看: README.md 和 USAGE.md"
