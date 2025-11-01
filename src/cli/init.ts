import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';

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
        { name: 'database - 数据库 (SQLite)', value: 'database' },
        { name: 'both - 两者都保存', value: 'both' },
      ],
      default: 'database',
    },

    // Database 存储配置
    {
      type: 'list',
      name: 'dbType',
      message: '数据库类型:',
      choices: [
        { name: 'mysql - MySQL', value: 'mysql' },
      ],
      default: 'mysql',
      when: (answers) => answers.storageMode === 'database'
    },
    {
      type: 'input',
      name: 'dbUrl',
      message: '数据库连接字符串:',
      default: () => {
        return 'mysql://user:password@localhost:3306/wechat';
      },
      when: (answers) => answers.storageMode === 'database'
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
      database: {
        type: answers.dbType || 'mysql',
        url: answers.dbUrl || 'mysql://user:password@localhost:3306/wechat',
      },
    },
    scraper: {
      requestInterval: answers.requestInterval,
      maxPages: answers.maxPages,
      days: answers.days,
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
  "storage": {
    "mode": "${config.storage.mode}",

    // 数据库存储配置
    "database": {
      "type": "${config.storage.database.type}",                       // 数据库类型: 'sqlite' | 'mysql' | 'postgresql'
      "url": "${config.storage.database.url}",                         // 数据库连接字符串
    }
  },

  // ==================== 爬虫配置 ====================
  "scraper": {
    "requestInterval": ${config.scraper.requestInterval},              // 请求间隔 (秒) - 建议 10-15 秒
    "maxPages": ${config.scraper.maxPages},                            // 默认爬取最大页数
    "days": ${config.scraper.days}                                     // 默认爬取最近多少天
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

  if (config.storage.mode === 'database' || config.storage.mode === 'both') {
    console.log(`  🗄️  数据库: ${config.storage.database.type}`);
  }

  console.log(`  ⏱️  请求间隔: ${config.scraper.requestInterval} 秒`);
  console.log(`  📄 默认页数: ${config.scraper.maxPages}`);
  console.log(`  📅 默认天数: ${config.scraper.days}`);

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
