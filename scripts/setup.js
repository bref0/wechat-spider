#!/usr/bin/env node

/**
 * 跨平台初始化脚本 (支持 Windows/macOS/Linux)
 * 用法: node scripts/setup.js 或 pnpm setup
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// 颜色输出 (跨平台)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function error(message) {
  log('❌', message, colors.red);
  process.exit(1);
}

function success(message) {
  log('✓', message, colors.green);
}

function info(message) {
  log('📋', message, colors.blue);
}

// 检查命令是否存在
function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// 获取 Node.js 主版本号
function getNodeVersion() {
  const version = process.version;
  return parseInt(version.slice(1).split('.')[0]);
}

// 执行命令
function run(command, errorMessage) {
  try {
    execSync(command, { stdio: 'inherit', cwd: rootDir });
  } catch (err) {
    error(errorMessage || `执行失败: ${command}`);
  }
}

// 主函数
async function setup() {
  console.log('\n🚀 初始化微信公众号爬虫项目...\n');

  // 1. 检查 Node.js 版本
  const nodeVersion = getNodeVersion();
  if (nodeVersion < 22) {
    error(`Node.js 版本过低,需要 >= 22.0.0 (当前: ${process.version})`);
  }
  success(`Node.js 版本: ${process.version}`);

  // 2. 检查 pnpm
  if (!commandExists('pnpm')) {
    error('未安装 pnpm,请运行: npm install -g pnpm');
  }
  success('pnpm 已安装');

  // 3. 安装依赖
  console.log('\n📦 安装依赖...');
  run('pnpm install', '依赖安装失败');

  // 4. 生成 Prisma Client
  console.log('\n🗄️  生成 Prisma Client...');
  run('pnpm db:generate', 'Prisma Client 生成失败');

  // 5. 初始化数据库
  console.log('\n🗄️  初始化数据库...');
  run('pnpm db:push', '数据库初始化失败');

  // 6. 检查配置文件
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    success('.env 已存在');
  } else {
    error('.env 不存在,请从仓库重新克隆');
  }

  const configPath = path.join(rootDir, 'config.json');
  if (fs.existsSync(configPath)) {
    success('config.json 已存在 (支持 JSON5 注释)');
  } else {
    error('config.json 不存在,请从仓库重新克隆或运行 pnpm dev 使用配置向导');
  }

  // 7. 创建必要的目录
  const dirs = ['output', 'data', 'logs'];
  dirs.forEach((dir) => {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  success('已创建必要目录');

  // 8. 显示下一步提示
  console.log('\n✅ 初始化完成!\n');
  info('下一步:');
  console.log('  1. 使用交互式菜单:');
  console.log('     pnpm dev\n');
  console.log('  2. 或使用命令行:');
  console.log('     pnpm spider:login           # 登录');
  console.log('     pnpm dev scrape "公众号"    # 爬取');
  console.log('');
  console.log('详细使用方法请查看: README.md 和 USAGE.md\n');
}

// 运行
setup().catch((err) => {
  error(`初始化失败: ${err.message}`);
});
