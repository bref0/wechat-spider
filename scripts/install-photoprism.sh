#!/bin/bash

# PhotoPrism 一键安装脚本 (macOS Apple Silicon)
# 用途: 在 Mac 上部署 PhotoPrism 管理微信公众号爬取的图片

set -e

echo "🚀 PhotoPrism 一键安装脚本"
echo "=============================="
echo ""

# 检查是否为 Mac
if [[ "$(uname)" != "Darwin" ]]; then
    echo "❌ 此脚本仅支持 macOS"
    exit 1
fi

# 检查是否为 Apple Silicon
if [[ "$(uname -m)" != "arm64" ]]; then
    echo "❌ 此脚本仅支持 Apple Silicon (M1/M2/M3)"
    exit 1
fi

# 1. 检查 Docker
echo "📦 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ 未安装 Docker"
    echo ""
    echo "请先安装 Docker Desktop:"
    echo "  1. 访问: https://www.docker.com/products/docker-desktop"
    echo "  2. 下载 Docker Desktop for Mac (Apple Silicon)"
    echo "  3. 安装并启动 Docker Desktop"
    echo ""
    echo "或使用 Homebrew 安装:"
    echo "  brew install --cask docker"
    exit 1
fi

echo "✅ Docker 已安装: $(docker --version)"

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo "⚠️  Docker 未运行,请启动 Docker Desktop"
    echo "正在尝试启动..."
    open -a Docker
    echo "等待 Docker 启动(30秒)..."
    sleep 30

    if ! docker info &> /dev/null; then
        echo "❌ Docker 启动失败,请手动启动 Docker Desktop 后重试"
        exit 1
    fi
fi

echo "✅ Docker 正在运行"
echo ""

# 2. 设置目录
PHOTOPRISM_DIR="$HOME/photoprism"
WECHAT_IMAGES_DIR="/Users/xiaofeiwu/Documents/my-test/pachong-gzh/wechat-spider-node/output"

echo "📁 创建 PhotoPrism 目录..."
mkdir -p "$PHOTOPRISM_DIR"/{originals,storage,database}

# 链接微信公众号图片目录
if [ -d "$WECHAT_IMAGES_DIR" ]; then
    echo "🔗 链接微信公众号图片目录..."
    ln -sf "$WECHAT_IMAGES_DIR" "$PHOTOPRISM_DIR/originals/wechat-images"
    echo "✅ 已链接: $WECHAT_IMAGES_DIR -> $PHOTOPRISM_DIR/originals/wechat-images"
else
    echo "⚠️  微信图片目录不存在,跳过链接"
fi

echo ""

# 3. 创建 docker-compose.yml
echo "📝 创建配置文件..."
cat > "$PHOTOPRISM_DIR/docker-compose.yml" << 'EOF'
version: '3.5'

services:
  photoprism:
    image: photoprism/photoprism:latest
    container_name: photoprism
    restart: unless-stopped
    stop_grace_period: 10s
    depends_on:
      - mariadb
    security_opt:
      - seccomp:unconfined
      - apparmor:unconfined
    ports:
      - "2342:2342"
    environment:
      PHOTOPRISM_ADMIN_USER: "admin"
      PHOTOPRISM_ADMIN_PASSWORD: "wechat2024"  # 请修改为强密码
      PHOTOPRISM_AUTH_MODE: "password"
      PHOTOPRISM_SITE_URL: "http://localhost:2342/"
      PHOTOPRISM_DISABLE_TLS: "false"
      PHOTOPRISM_DEFAULT_TLS: "true"
      PHOTOPRISM_ORIGINALS_LIMIT: 5000
      PHOTOPRISM_HTTP_COMPRESSION: "gzip"
      PHOTOPRISM_LOG_LEVEL: "info"
      PHOTOPRISM_READONLY: "false"
      PHOTOPRISM_EXPERIMENTAL: "false"
      PHOTOPRISM_DISABLE_CHOWN: "false"
      PHOTOPRISM_DISABLE_WEBDAV: "false"
      PHOTOPRISM_DISABLE_SETTINGS: "false"
      PHOTOPRISM_DISABLE_TENSORFLOW: "false"
      PHOTOPRISM_DISABLE_FACES: "false"
      PHOTOPRISM_DISABLE_CLASSIFICATION: "false"
      PHOTOPRISM_DISABLE_VECTORS: "false"
      PHOTOPRISM_DISABLE_RAW: "false"
      PHOTOPRISM_RAW_PRESETS: "false"
      PHOTOPRISM_JPEG_QUALITY: 85
      PHOTOPRISM_DETECT_NSFW: "false"
      PHOTOPRISM_UPLOAD_NSFW: "true"
      PHOTOPRISM_DATABASE_DRIVER: "mysql"
      PHOTOPRISM_DATABASE_SERVER: "mariadb:3306"
      PHOTOPRISM_DATABASE_NAME: "photoprism"
      PHOTOPRISM_DATABASE_USER: "photoprism"
      PHOTOPRISM_DATABASE_PASSWORD: "insecure"
      PHOTOPRISM_SITE_CAPTION: "微信公众号图片管理"
      PHOTOPRISM_SITE_DESCRIPTION: ""
      PHOTOPRISM_SITE_AUTHOR: ""
      HOME: "/photoprism"
    working_dir: "/photoprism"
    volumes:
      - "./originals:/photoprism/originals"
      - "./storage:/photoprism/storage"

  mariadb:
    image: mariadb:11
    container_name: photoprism-mariadb
    restart: unless-stopped
    stop_grace_period: 5s
    security_opt:
      - seccomp:unconfined
      - apparmor:unconfined
    command: --innodb-buffer-pool-size=512M --transaction-isolation=READ-COMMITTED --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci --max-connections=512 --innodb-rollback-on-timeout=OFF --innodb-lock-wait-timeout=120
    volumes:
      - "./database:/var/lib/mysql"
    environment:
      MARIADB_AUTO_UPGRADE: "1"
      MARIADB_INITDB_SKIP_TZINFO: "1"
      MARIADB_DATABASE: "photoprism"
      MARIADB_USER: "photoprism"
      MARIADB_PASSWORD: "insecure"
      MARIADB_ROOT_PASSWORD: "insecure"
EOF

echo "✅ 配置文件已创建"
echo ""

# 4. 启动 PhotoPrism
echo "🚀 启动 PhotoPrism..."
cd "$PHOTOPRISM_DIR"
docker-compose up -d

echo ""
echo "⏳ 等待服务启动(30秒)..."
sleep 30

# 5. 检查状态
echo ""
echo "📊 检查服务状态..."
docker-compose ps

echo ""
echo "=============================="
echo "✅ PhotoPrism 安装完成!"
echo "=============================="
echo ""
echo "📍 访问地址: http://localhost:2342"
echo "👤 用户名: admin"
echo "🔑 密码: wechat2024"
echo ""
echo "📁 图片目录:"
echo "  - 微信公众号: $PHOTOPRISM_DIR/originals/wechat-images"
echo "  - 其他图片: $PHOTOPRISM_DIR/originals/"
echo ""
echo "🔧 常用命令:"
echo "  启动: cd $PHOTOPRISM_DIR && docker-compose up -d"
echo "  停止: cd $PHOTOPRISM_DIR && docker-compose stop"
echo "  重启: cd $PHOTOPRISM_DIR && docker-compose restart"
echo "  查看日志: cd $PHOTOPRISM_DIR && docker-compose logs -f"
echo "  卸载: cd $PHOTOPRISM_DIR && docker-compose down -v"
echo ""
echo "💡 首次使用:"
echo "  1. 访问 http://localhost:2342 登录"
echo "  2. 点击左侧 Library > Index 开始索引图片"
echo "  3. 等待索引完成后即可浏览和搜索"
echo ""
