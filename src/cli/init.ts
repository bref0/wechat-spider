import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../logger/index.js';

/**
 * 交互式配置向导
 * 通过问答方式生成 config.json
 *
 * 注意: 此文件使用 console.log 而非 logger.info
 * 原因: logger.info 会与 inquirer 的终端渲染冲突,导致重复显示
 *
 * @param isInInteractiveMenu - 是否在交互式菜单中调用
 */
export async function initConfig(isInInteractiveMenu: boolean = false) {
  console.log('🚀 欢迎使用微信公众号爬虫配置向导\n');

  const answers = await inquirer.prompt([
    // ==================== 存储配置 ====================
    {
      type: 'list',
      name: 'storageMode',
      message: '选择存储模式:',
      choices: [
        { name: 'local - 本地文件 (每篇文章一个文件夹)', value: 'local' },
        { name: 'database - 数据库 (SQLite)', value: 'database' },
        { name: 'both - 两者都保存', value: 'both' },
      ],
      default: 'local',
    },

    // Local 存储配置
    {
      type: 'input',
      name: 'localBaseDir',
      message: '本地文件保存目录:',
      default: './output',
      when: (answers) => answers.storageMode === 'local' || answers.storageMode === 'both',
    },
    {
      type: 'input',
      name: 'folderNameTemplate',
      message: '文件夹命名模板 ({title}, {date}, {account}):',
      default: '{title}_{date}',
      when: (answers) => answers.storageMode === 'local' || answers.storageMode === 'both',
    },
    {
      type: 'list',
      name: 'saveAs',
      message: '文章保存格式:',
      choices: [
        { name: 'markdown - Markdown 格式 (推荐)', value: 'markdown' },
        { name: 'html - HTML 格式', value: 'html' },
      ],
      default: 'markdown',
      when: (answers) => answers.storageMode === 'local' || answers.storageMode === 'both',
    },
    {
      type: 'confirm',
      name: 'localDownloadMedia',
      message: '本地存储是否下载媒体文件?',
      default: true,
      when: (answers) => answers.storageMode === 'local' || answers.storageMode === 'both',
    },
    {
      type: 'confirm',
      name: 'includeMetadata',
      message: '是否包含元数据文件 (metadata.json)?',
      default: true,
      when: (answers) => answers.storageMode === 'local' || answers.storageMode === 'both',
    },
    {
      type: 'confirm',
      name: 'sanitizeFolderName',
      message: '是否清理文件夹名称中的特殊字符?',
      default: true,
      when: (answers) => answers.storageMode === 'local' || answers.storageMode === 'both',
    },

    // Database 存储配置
    {
      type: 'list',
      name: 'dbType',
      message: '数据库类型:',
      choices: [
        { name: 'sqlite - SQLite (推荐)', value: 'sqlite' },
        { name: 'mysql - MySQL', value: 'mysql' },
        { name: 'postgresql - PostgreSQL', value: 'postgresql' },
      ],
      default: 'sqlite',
      when: (answers) => answers.storageMode === 'database' || answers.storageMode === 'both',
    },
    {
      type: 'input',
      name: 'dbUrl',
      message: '数据库连接字符串:',
      default: (answers: any) => {
        if (answers.dbType === 'sqlite') return 'file:./data/wechat.db';
        if (answers.dbType === 'mysql') return 'mysql://user:password@localhost:3306/wechat';
        if (answers.dbType === 'postgresql') return 'postgresql://user:password@localhost:5432/wechat';
        return 'file:./data/wechat.db';
      },
      when: (answers) => answers.storageMode === 'database' || answers.storageMode === 'both',
    },
    {
      type: 'confirm',
      name: 'dbSaveMediaUrls',
      message: '数据库是否保存媒体文件 URL?',
      default: true,
      when: (answers) => answers.storageMode === 'database' || answers.storageMode === 'both',
    },
    {
      type: 'confirm',
      name: 'dbDownloadMedia',
      message: '数据库是否下载媒体文件到本地?',
      default: false,
      when: (answers) => answers.storageMode === 'database' || answers.storageMode === 'both',
    },
    {
      type: 'input',
      name: 'dbMediaDir',
      message: '数据库媒体文件保存目录:',
      default: './data/media',
      when: (answers) => answers.dbDownloadMedia,
    },

    // ==================== 媒体文件配置 ====================
    {
      type: 'confirm',
      name: 'downloadImages',
      message: '是否下载图片?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'downloadVideos',
      message: '是否下载视频?',
      default: true,
    },
    {
      type: 'number',
      name: 'mediaTimeout',
      message: '媒体下载超时 (毫秒):',
      default: 30000,
    },
    {
      type: 'number',
      name: 'mediaRetryTimes',
      message: '媒体下载重试次数:',
      default: 3,
    },
    {
      type: 'number',
      name: 'mediaConcurrent',
      message: '媒体并发下载数量:',
      default: 5,
    },
    {
      type: 'confirm',
      name: 'useOriginalName',
      message: '媒体文件是否使用原始文件名?',
      default: false,
    },
    {
      type: 'input',
      name: 'mediaNamingPattern',
      message: '媒体文件命名模式 ({type}, {index}, {ext}):',
      default: '{type}-{index}.{ext}',
      when: (answers) => !answers.useOriginalName,
    },

    // ==================== 爬虫配置 ====================
    {
      type: 'number',
      name: 'requestInterval',
      message: '请求间隔 (秒, 建议 10-15):',
      default: 10,
      validate: (input) => {
        if (input < 5) {
          return '建议不要小于 5 秒,避免被限制';
        }
        return true;
      },
    },
    {
      type: 'number',
      name: 'maxPages',
      message: '默认爬取最大页数:',
      default: 10,
    },
    {
      type: 'number',
      name: 'days',
      message: '默认爬取最近多少天:',
      default: 30,
    },

    // ==================== 导出配置 ====================
    {
      type: 'confirm',
      name: 'csvEnabled',
      message: '是否启用 CSV 导出?',
      default: true,
    },
    {
      type: 'list',
      name: 'csvEncoding',
      message: 'CSV 文件编码:',
      choices: [
        { name: 'utf8 - UTF-8 (推荐)', value: 'utf8' },
        { name: 'gbk - GBK (兼容 Excel)', value: 'gbk' },
      ],
      default: 'utf8',
      when: (answers) => answers.csvEnabled,
    },
    {
      type: 'confirm',
      name: 'csvIncludeContent',
      message: 'CSV 是否包含文章内容?',
      default: true,
      when: (answers) => answers.csvEnabled,
    },
    {
      type: 'confirm',
      name: 'csvIncludeMediaLinks',
      message: 'CSV 是否包含媒体链接?',
      default: true,
      when: (answers) => answers.csvEnabled,
    },

    // ==================== 批量爬取配置 ====================
    {
      type: 'input',
      name: 'accounts',
      message: '添加公众号列表 (用逗号或顿号分隔, 可留空):',
      default: '',
      filter: (input) => {
        if (!input) return [];
        // 支持中英文逗号、顿号分隔
        return input
          .split(/[,,,、]/)
          .map((s: string) => s.trim())
          .filter((s: string) => s);
      },
    },
    {
      type: 'number',
      name: 'accountInterval',
      message: '批量爬取时账号间隔 (秒, 建议 10-30):',
      default: 10,
      validate: (input) => {
        if (input < 5) {
          return '间隔不能少于 5 秒,避免被封';
        }
        return true;
      },
      when: (answers) => answers.accounts && answers.accounts.length > 1,
    },
  ]);

  // 生成配置对象
  const config = {
    storage: {
      mode: answers.storageMode,
      local: {
        baseDir: answers.localBaseDir || './output',
        folderNameTemplate: answers.folderNameTemplate || '{title}_{date}',
        downloadMedia: answers.localDownloadMedia !== undefined ? answers.localDownloadMedia : true,
        saveAs: answers.saveAs || 'markdown',
        includeMetadata: answers.includeMetadata !== undefined ? answers.includeMetadata : true,
        sanitizeFolderName: answers.sanitizeFolderName !== undefined ? answers.sanitizeFolderName : true,
      },
      database: {
        type: answers.dbType || 'sqlite',
        url: answers.dbUrl || 'file:./data/wechat.db',
        saveMediaUrls: answers.dbSaveMediaUrls !== undefined ? answers.dbSaveMediaUrls : true,
        downloadMedia: answers.dbDownloadMedia || false,
        mediaDir: answers.dbMediaDir || './data/media',
      },
    },
    media: {
      download: {
        images: answers.downloadImages,
        videos: answers.downloadVideos,
        timeout: answers.mediaTimeout || 30000,
        retryTimes: answers.mediaRetryTimes || 3,
        concurrent: answers.mediaConcurrent || 5,
      },
      naming: {
        useOriginalName: answers.useOriginalName || false,
        pattern: answers.mediaNamingPattern || '{type}-{index}.{ext}',
      },
    },
    scraper: {
      requestInterval: answers.requestInterval,
      maxPages: answers.maxPages,
      days: answers.days,
    },
    export: {
      csv: {
        enabled: answers.csvEnabled !== undefined ? answers.csvEnabled : true,
        encoding: answers.csvEncoding || 'utf8',
        includeContent: answers.csvIncludeContent !== undefined ? answers.csvIncludeContent : true,
        includeMediaLinks: answers.csvIncludeMediaLinks !== undefined ? answers.csvIncludeMediaLinks : true,
      },
    },
    batch: {
      accounts: answers.accounts || [],
      accountInterval: answers.accountInterval || 10,
    },
  };

  // 保存配置文件
  const configPath = path.join(process.cwd(), 'config.json');

  // 如果文件已存在,询问是否覆盖
  if (await fs.pathExists(configPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'config.json 已存在,是否覆盖?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log('已取消');
      return;
    }
  }

  // 写入文件 (带注释的 JSON5 格式)
  const configContent = `{
  // ==================== 存储配置 ====================
  // 存储模式: 'local' (本地文件) | 'database' (数据库) | 'both' (两者都有)
  "storage": {
    "mode": "${config.storage.mode}",

    // 本地存储配置 (mode = 'local' 或 'both' 时生效)
    "local": {
      "baseDir": "${config.storage.local.baseDir}",                    // 文件保存目录
      "folderNameTemplate": "${config.storage.local.folderNameTemplate}", // 文件夹命名模板 (支持变量: {title}, {date}, {account})
      "downloadMedia": ${config.storage.local.downloadMedia},          // 是否下载媒体文件 (图片/视频)
      "saveAs": "${config.storage.local.saveAs}",                      // 文章保存格式: 'markdown' | 'html'
      "includeMetadata": ${config.storage.local.includeMetadata},      // 是否生成元数据文件 (metadata.json)
      "sanitizeFolderName": ${config.storage.local.sanitizeFolderName} // 是否清理文件夹名称中的特殊字符
    },

    // 数据库存储配置 (mode = 'database' 或 'both' 时生效)
    "database": {
      "type": "${config.storage.database.type}",                       // 数据库类型: 'sqlite' | 'mysql' | 'postgresql'
      "url": "${config.storage.database.url}",                         // 数据库连接字符串
      "saveMediaUrls": ${config.storage.database.saveMediaUrls},       // 是否保存媒体文件 URL
      "downloadMedia": ${config.storage.database.downloadMedia},       // 是否下载媒体文件到本地
      "mediaDir": "${config.storage.database.mediaDir}"                // 媒体文件保存目录 (downloadMedia=true 时生效)
    }
  },

  // ==================== 媒体文件配置 ====================
  "media": {
    "download": {
      "images": ${config.media.download.images},                       // 是否下载图片
      "videos": ${config.media.download.videos},                       // 是否下载视频
      "timeout": ${config.media.download.timeout},                     // 下载超时时间 (毫秒)
      "retryTimes": ${config.media.download.retryTimes},               // 下载失败重试次数
      "concurrent": ${config.media.download.concurrent}                // 并发下载数量
    },
    "naming": {
      "useOriginalName": ${config.media.naming.useOriginalName},       // 是否使用原始文件名
      "pattern": "${config.media.naming.pattern}"                      // 文件命名模式 (支持变量: {type}, {index}, {ext})
    }
  },

  // ==================== 爬虫配置 ====================
  "scraper": {
    "requestInterval": ${config.scraper.requestInterval},              // 请求间隔 (秒) - 建议 10-15 秒
    "maxPages": ${config.scraper.maxPages},                            // 默认爬取最大页数
    "days": ${config.scraper.days}                                     // 默认爬取最近多少天
  },

  // ==================== 导出配置 ====================
  "export": {
    "csv": {
      "enabled": ${config.export.csv.enabled},                         // 是否启用 CSV 导出
      "encoding": "${config.export.csv.encoding}",                     // 文件编码: 'utf8' | 'gbk'
      "includeContent": ${config.export.csv.includeContent},           // 是否包含文章内容
      "includeMediaLinks": ${config.export.csv.includeMediaLinks}      // 是否包含媒体链接
    }
  },

  // ==================== 批量爬取配置 ====================
  "batch": {
    // 公众号列表 (支持在 init 时用逗号/顿号分隔输入)
    "accounts": ${JSON.stringify(config.batch.accounts, null, 4).replace(/\n/g, '\n    ')},
    "accountInterval": ${config.batch.accountInterval}                 // 账号间隔 (秒) - 顺序执行,避免被封
  }
}
`;

  await fs.writeFile(configPath, configContent, 'utf-8');

  console.log('\n✅ 配置已保存到 config.json');

  // 显示配置摘要
  console.log('\n📋 配置摘要:');
  console.log(`  📁 存储模式: ${config.storage.mode}`);

  if (config.storage.mode === 'local' || config.storage.mode === 'both') {
    console.log(`  📂 本地目录: ${config.storage.local.baseDir}`);
    console.log(`  📝 保存格式: ${config.storage.local.saveAs}`);
  }

  if (config.storage.mode === 'database' || config.storage.mode === 'both') {
    console.log(`  🗄️  数据库: ${config.storage.database.type}`);
  }

  console.log(`  🖼️  下载图片: ${config.media.download.images ? '是' : '否'}`);
  console.log(`  🎬 下载视频: ${config.media.download.videos ? '是' : '否'}`);
  console.log(`  ⏱️  请求间隔: ${config.scraper.requestInterval} 秒`);
  console.log(`  📄 默认页数: ${config.scraper.maxPages}`);
  console.log(`  📅 默认天数: ${config.scraper.days}`);
  console.log(`  📊 CSV 导出: ${config.export.csv.enabled ? '启用' : '禁用'}`);

  if (config.batch.accounts.length > 0) {
    console.log(`  📱 公众号列表 (${config.batch.accounts.length} 个): ${config.batch.accounts.join(', ')}`);
    console.log(`  ⏱️  账号间隔: ${config.batch.accountInterval} 秒`);
  }

  if (isInInteractiveMenu) {
    // 在交互式菜单中,提示返回主菜单
    console.log('\n✨ 配置完成! 即将返回主菜单...');
    console.log('\n💡 提示:');
    console.log('  - 选择"登录"进行微信公众平台登录');
    console.log('  - 选择"爬取单个公众号"或"批量爬取"开始使用');
    if (config.batch.accounts.length > 0) {
      console.log(`  - 批量列表已配置 ${config.batch.accounts.length} 个公众号: ${config.batch.accounts.join(', ')}`);
    }
  } else {
    // 在 CLI 模式中,提示命令
    console.log('\n🚀 下一步:');
    console.log('  1. 启动交互式菜单: pnpm dev');
    console.log('  2. 或使用命令行:');
    console.log('     - 登录: pnpm spider:login');
    console.log('     - 爬取: pnpm dev scrape "公众号名称"');
    if (config.batch.accounts.length > 0) {
      console.log('     - 批量: pnpm dev batch');
    }
    console.log('  3. 修改配置: 直接编辑 config.json');
  }
}
