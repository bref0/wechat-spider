# 宝塔 Linux 服务器部署指南

本文档介绍如何在宝塔面板管理的 Linux 服务器上部署微信公众号爬虫并设置定时任务。

## 前置要求

- ✅ 宝塔 Linux 面板 7.0+
- ✅ Node.js 22+ (通过宝塔安装)
- ✅ PM2 进程管理器 (可选,用于守护进程)
- ✅ Chrome/Chromium 浏览器 (用于登录)

---

## 一、服务器环境准备

### 1.1 安装 Node.js 22+

在宝塔面板中:

```
软件商店 > 运行环境 > Node 版本管理器 > 安装 Node.js 22.x
```

或使用命令行:

```bash
# 使用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22
node -v  # 应显示 v22.x.x
```

### 1.2 安装 pnpm

```bash
npm install -g pnpm
pnpm -v  # 验证安装
```

### 1.3 安装 Chrome/Chromium (Headless 模式)

```bash
# Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y \
  chromium-browser \
  chromium-codecs-ffmpeg

# CentOS/RHEL
sudo yum install -y chromium

# 验证安装
chromium --version
```

如果系统没有 Chromium,使用 Playwright 自动下载:

```bash
# 项目中会自动下载,无需手动操作
```

---

## 二、部署项目

### 2.1 上传项目文件

**方式1**: 通过宝塔文件管理上传

1. 进入 `文件` > `/www/wwwroot/`
2. 创建目录 `wechat-spider-node`
3. 上传项目文件压缩包并解压

**方式2**: 使用 Git (推荐)

```bash
cd /www/wwwroot
git clone <你的仓库地址> wechat-spider-node
cd wechat-spider-node
```

### 2.2 安装依赖

```bash
cd /www/wwwroot/wechat-spider-node
pnpm install
```

### 2.3 初始化项目

```bash
pnpm setup  # 运行初始化脚本
```

这会:
- 安装依赖
- 生成 Prisma Client
- 初始化数据库
- 创建必要目录

### 2.4 配置文件

#### 修改 `.env` (如需要)

```bash
vi .env
```

默认配置一般无需修改,数据库会自动创建在 `data/wechat.db`。

#### 修改 `config.json`

```bash
vi config.json
```

配置你要爬取的公众号列表:

```json
{
  "batch": {
    "accounts": [
      "公众号1",
      "公众号2",
      "公众号3"
    ],
    "accountInterval": 30
  }
}
```

---

## 三、首次登录

**重要**: 微信登录需要扫码,必须在**有图形界面**的环境首次登录。

### 3.1 本地登录(推荐)

在 Mac 上完成首次登录:

```bash
pnpm spider:login
```

登录成功后会生成 `wechat_cache.json`,将此文件上传到服务器:

```bash
# 在 Mac 上
scp wechat_cache.json root@你的服务器IP:/www/wwwroot/wechat-spider-node/
```

### 3.2 服务器登录(需要 X11 转发)

如果服务器有图形界面或配置了 X11 转发:

```bash
ssh -X root@服务器IP
cd /www/wwwroot/wechat-spider-node
pnpm spider:login
```

### 3.3 无头模式注意事项

登录缓存 (`wechat_cache.json`) 有效期为 **96 小时**(4天),过期后需要重新登录。

建议:
- 定期检查缓存是否过期
- 使用更长的缓存时间(修改 `.env` 中的 `WECHAT_CACHE_EXPIRE_HOURS`)

---

## 四、测试运行

### 4.1 手动测试批量爬取

```bash
pnpm exec tsx src/cli/index.ts batch --limit 2
```

参数说明:
- `--limit 2`: 每个公众号只爬取 2 篇(测试用)
- `-d 7`: 只爬取最近 7 天
- `--mode both`: 同时保存到本地和数据库

### 4.2 查看输出

```bash
# 查看本地文件
ls -lh output/

# 查看数据库
pnpm db:studio  # 打开 Prisma Studio (http://localhost:5555)
```

---

## 五、设置定时任务

### 5.1 使用宝塔计划任务(推荐)

1. 进入 `计划任务` > `添加计划任务`
2. 配置如下:

| 字段 | 值 |
|------|-----|
| 任务类型 | Shell 脚本 |
| 任务名称 | 微信公众号爬虫 |
| 执行周期 | 每天 02:00 (凌晨2点) |
| 脚本内容 | 见下方 |

**脚本内容**:

```bash
#!/bin/bash
cd /www/wwwroot/wechat-spider-node
/root/.nvm/versions/node/v22.13.0/bin/pnpm exec tsx src/cli/index.ts batch
```

注意:
- 路径需要根据实际情况修改
- `pnpm` 的路径可通过 `which pnpm` 查看
- Node.js 路径可通过 `which node` 查看

### 5.2 使用系统 crontab

```bash
crontab -e
```

添加以下内容:

```bash
# 每天凌晨2点执行
0 2 * * * /www/wwwroot/wechat-spider-node/scripts/cron-batch.sh >> /www/wwwroot/wechat-spider-node/logs/cron.log 2>&1
```

常用时间配置:
- 每 6 小时: `0 */6 * * *`
- 每 12 小时: `0 */12 * * *`
- 每天凌晨 2 点: `0 2 * * *`
- 工作日每天早上 9 点: `0 9 * * 1-5`

### 5.3 查看定时任务日志

```bash
# 查看宝塔计划任务日志
cat /www/server/cron/<任务ID>.log

# 查看自定义日志
tail -f /www/wwwroot/wechat-spider-node/logs/cron.log
```

---

## 六、使用 PM2 守护进程(可选)

如果需要爬虫持续运行而不是定时执行,可以使用 PM2:

### 6.1 安装 PM2

```bash
npm install -g pm2
```

### 6.2 创建 PM2 配置

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'wechat-spider',
    script: 'src/cli/index.ts',
    interpreter: 'tsx',
    cwd: '/www/wwwroot/wechat-spider-node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    cron_restart: '0 2 * * *', // 每天凌晨2点重启
  }]
}
```

### 6.3 启动服务

```bash
pm2 start ecosystem.config.js
pm2 save          # 保存进程列表
pm2 startup       # 设置开机自启
```

### 6.4 查看状态

```bash
pm2 list          # 查看进程列表
pm2 logs wechat-spider  # 查看日志
pm2 restart wechat-spider  # 重启
pm2 stop wechat-spider     # 停止
```

---

## 七、数据备份

### 7.1 备份数据库

```bash
# 手动备份
cp data/wechat.db data/wechat.db.backup.$(date +%Y%m%d)

# 定时备份 (添加到 crontab)
0 3 * * * cp /www/wwwroot/wechat-spider-node/data/wechat.db /www/wwwroot/wechat-spider-node/data/wechat.db.backup.$(date +\%Y\%m\%d)
```

### 7.2 备份输出文件

```bash
# 压缩备份
tar -czf output-backup-$(date +%Y%m%d).tar.gz output/

# 定时备份并清理旧文件
0 4 * * 0 cd /www/wwwroot/wechat-spider-node && tar -czf backup/output-$(date +\%Y\%m\%d).tar.gz output/ && find backup/ -name "*.tar.gz" -mtime +30 -delete
```

---

## 八、常见问题

### 8.1 登录缓存过期

**问题**: `未登录或登录已过期,请先运行: pnpm spider login`

**解决**:
1. 在本地 Mac 重新登录获取新的 `wechat_cache.json`
2. 上传到服务器覆盖旧文件
3. 或增加缓存时间: 修改 `.env` 中 `WECHAT_CACHE_EXPIRE_HOURS=168` (7天)

### 8.2 Chrome 无法启动

**问题**: `Error: Failed to launch the browser process!`

**解决**:

```bash
# 安装 Chrome 依赖
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libgbm1 \
  libasound2
```

或修改 `src/wechat/login.ts` 使用系统 Chrome:

```typescript
const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/chromium-browser',  // 指定 Chrome 路径
});
```

### 8.3 权限问题

**问题**: `EACCES: permission denied`

**解决**:

```bash
# 修改项目所有权
chown -R www:www /www/wwwroot/wechat-spider-node

# 或使用 root 用户运行(不推荐)
```

### 8.4 内存不足

**问题**: 服务器内存不足导致 Chrome 崩溃

**解决**:
- 减少并发数: 修改 `config.json` 中 `media.download.concurrent`
- 增加 swap 空间
- 升级服务器配置

---

## 九、监控与维护

### 9.1 日志监控

```bash
# 实时查看日志
tail -f logs/spider.log

# 查看错误日志
grep ERROR logs/spider.log

# 查看最近100行
tail -n 100 logs/spider.log
```

### 9.2 磁盘空间监控

```bash
# 查看目录大小
du -sh output/
du -sh data/

# 清理旧数据(超过30天)
find output/ -type d -mtime +30 -exec rm -rf {} \;
```

### 9.3 设置告警(可选)

使用宝塔面板的监控功能或配置邮件通知:

```bash
# 在 cron-batch.sh 末尾添加
if [ $EXIT_CODE -ne 0 ]; then
  echo "爬取失败!" | mail -s "微信爬虫错误" your@email.com
fi
```

---

## 十、性能优化

### 10.1 减少请求间隔

**风险**: 可能被微信封禁

修改 `config.json`:

```json
{
  "scraper": {
    "requestInterval": 5  // 从10秒减少到5秒(谨慎)
  }
}
```

### 10.2 禁用媒体下载

如果只需要文本内容:

```json
{
  "storage": {
    "local": {
      "downloadMedia": false
    },
    "database": {
      "downloadMedia": false
    }
  }
}
```

### 10.3 只使用数据库存储

```json
{
  "storage": {
    "mode": "database"  // 不保存本地文件
  }
}
```

---

## 十一、更新部署

### 11.1 从 Git 更新

```bash
cd /www/wwwroot/wechat-spider-node
git pull
pnpm install  # 更新依赖
pnpm db:push  # 更新数据库(如有 schema 变更)
pm2 restart wechat-spider  # 重启服务(如使用 PM2)
```

### 11.2 手动更新

1. 备份现有数据
2. 上传新文件覆盖
3. 运行 `pnpm install`
4. 重启服务

---

## 附录

### A. 目录结构

```
/www/wwwroot/wechat-spider-node/
├── src/              # 源代码
├── output/           # 爬取的文章(本地存储)
├── data/             # 数据库文件
│   └── wechat.db
├── logs/             # 日志文件
├── scripts/          # 工具脚本
│   └── cron-batch.sh # 定时任务脚本
├── config.json       # 配置文件
├── .env              # 环境变量
└── wechat_cache.json # 登录缓存
```

### B. 常用命令

```bash
# 查看配置
cat config.json

# 查看数据库
pnpm db:studio

# 导出 CSV
pnpm exec tsx src/cli/index.ts export "公众号名称"

# 查看帮助
pnpm exec tsx src/cli/index.ts --help
```

### C. 联系支持

如有问题,请查看:
- [README.md](./README.md)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/your-repo/issues)
