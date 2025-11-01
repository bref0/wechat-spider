import inquirer from 'inquirer';
import { logger } from '../logger';
import { WeChatLogin } from '../wechat/login.js';
import { WeChatScraper } from '../wechat/scraper.js';
import { loadConfig } from '../config';
import { saveArticles } from '../storage';

/**
 * 主交互式菜单
 *
 * 注意: 此文件使用 console.log 而非 logger.info
 * 原因: logger.info 会与 inquirer 的终端渲染冲突,导致重复显示
 */
export async function startInteractive() {
  console.log('🚀 欢迎使用微信公众号爬虫工具\n');

  // 主循环
  while (true) {
    try {
      const { action } = await inquirer.prompt([
        {
          type: 'rawlist',
          name: 'action',
          message: '请选择操作 (输入数字):',
          choices: [
            { name: '🔐 登录微信公众平台', value: 'login' },
            { name: '📄 爬取单个公众号', value: 'scrape' },
            { name: '📚 批量爬取多个公众号', value: 'batch' },
            { name: '❌ 退出', value: 'exit' },
          ],
        },
      ]);

      if (action === 'exit') {
        logger.info('👋 再见!');
        process.exit(0);
      }

      // 进入子菜单前显示分隔线
      console.log('\n' + '='.repeat(60) + '\n');

      switch (action) {
        case 'login':
          await handleLogin();
          break;
        case 'scrape':
          await handleScrape();
          break;
        case 'batch':
          await handleBatch();
          break;
      }

      // 操作完成后显示分隔线(返回主菜单)
      console.log('\n' + '='.repeat(60) + '\n');
    } catch (error) {
      // 捕获 Ctrl+C 退出
      if (error instanceof Error && error.message.includes('User force closed the prompt')) {
        console.log('\n\n👋 已取消操作');
        process.exit(0);
      }
      logger.error(`操作失败: ${error}`);
      // 操作失败后也显示分隔线
      console.log('\n' + '='.repeat(60) + '\n');
    }
  }
}

/**
 * 处理登录
 */
async function handleLogin() {
  logger.info('开始登录微信公众平台...\n');
  const login = new WeChatLogin();
  await login.login();
  logger.info('\n✅ 登录成功!');

  // 等待所有异步日志输出完成,避免覆盖主菜单
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

/**
 * 处理单个公众号爬取
 */
async function handleScrape() {
  let options: any = {};

  // 输入公众号名称
  const { accountName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'accountName',
      message: '请输入公众号名称:',
      validate: (input) => {
        if (!input || !input.trim()) {
          return '公众号名称不能为空';
        }
        return true;
      },
    },
  ]);

  // 开始爬取
  console.log(`\n开始爬取公众号: ${accountName}`);

  const scraper = new WeChatScraper();
  const articles = await scraper.scrapeAccount(accountName.trim(), {
    maxPages: options.pages,
    limit: options.limit,
    days: options.days,
    startDate: options.startDate,
    endDate: options.endDate,
    skipExisting: options.skipExisting,
  });

  console.log(`\n✅ 共爬取 ${articles.length} 篇文章`);

  // 保存文章
  await saveArticles(articles);

  console.log('\n✅ 爬取完成!');

  // 等待所有异步日志输出完成,避免覆盖主菜单
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

/**
 * 处理批量爬取
 */
async function handleBatch() {
  const config = await loadConfig();

    // 检查配置文件中是否有公众号列表
    const hasConfigAccounts = config.batch?.accounts && config.batch.accounts.length > 0;

    let accounts: string[] = [];

    const { accountSource } = await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'accountSource',
      message: '选择公众号来源:',
      choices: [
        ...(hasConfigAccounts
          ? [{ name: `使用 config.json 配置 (${config.batch?.accounts?.length ?? 0} 个)`, value: 'config' }]
          : []),
        { name: '手动输入公众号列表', value: 'manual' },
        { name: '← 返回上一级', value: 'back' },
      ],
    },
  ]);

  if (accountSource === 'back') {
    return;
  }

  if (accountSource === 'config') {
    accounts = config.batch?.accounts ?? [];
    console.log(`\n将爬取以下公众号: ${accounts.join(', ')}`);
  } else {
    const { manualAccounts } = await inquirer.prompt([
      {
        type: 'input',
        name: 'manualAccounts',
        message: '请输入公众号列表 (用逗号或顿号分隔):',
        validate: (input) => {
          if (!input || !input.trim()) {
            return '公众号列表不能为空';
          }
          return true;
        },
        filter: (input) => {
          // 支持中英文逗号、顿号分隔
          return input
              .split(/[,，、]/)  // 英文逗号, 中文逗号，顿号
              .map((s: string) => s.trim())
              .filter((s: string) => s);
        },
      },
    ]);
    accounts = manualAccounts;
  }

  // 询问是否使用默认配置
  const { useDefaultConfig } = await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'useDefaultConfig',
      message: '爬取参数配置:',
      choices: [
        { name: '使用 config.json 默认配置', value: 'default' },
        { name: '自定义参数', value: 'custom' },
        { name: '← 返回上一级', value: 'back' },
      ],
    },
  ]);

  if (useDefaultConfig === 'back') {
    return;
  }

  let options: any = {};

  if (useDefaultConfig === 'custom') {
    // 进入3级菜单前显示分隔线
    console.log('\n' + '='.repeat(60) + '\n');

    // 自定义参数 (复用单个爬取的逻辑)
    const customConfig = await inquirer.prompt([
      {
        type: 'rawlist',
        name: 'paramType',
        message: '选择爬取范围:',
        choices: [
          { name: '按天数 - 爬取最近 N 天', value: 'days' },
          { name: '按数量 - 爬取前 N 篇', value: 'limit' },
          { name: '按页数 - 爬取前 N 页', value: 'pages' },
          { name: '← 返回上一级', value: 'back' },
        ],
      },
    ]);

    if (customConfig.paramType === 'back') {
      console.log('\n' + '='.repeat(60) + '\n');
      return;
    }

    // 进入4级菜单(具体参数输入)前显示分隔线
    console.log('\n' + '='.repeat(60) + '\n');

    switch (customConfig.paramType) {
      case 'days':
        const { days } = await inquirer.prompt([
          {
            type: 'number',
            name: 'days',
            message: '爬取最近多少天的文章:',
            default: config.scraper.days,
            validate: (input) => (input ?? 0) > 0 || '必须大于 0',
          },
        ]);
        options.days = days;
        break;

      case 'limit':
        const { limit } = await inquirer.prompt([
          {
            type: 'number',
            name: 'limit',
            message: '爬取多少篇文章:',
            default: 10,
            validate: (input) => (input ?? 0) > 0 || '必须大于 0',
          },
        ]);
        options.limit = limit;
        break;

      case 'pages':
        const { pages } = await inquirer.prompt([
          {
            type: 'number',
            name: 'pages',
            message: '爬取多少页:',
            default: config.scraper.maxPages,
            validate: (input) => (input ?? 0) > 0 || '必须大于 0',
          },
        ]);
        options.pages = pages;
        break;
    }

    const { skipExisting } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'skipExisting',
        message: '是否跳过已爬取的文章?',
        default: false,
      },
    ]);
    options.skipExisting = skipExisting;
  }

  // 账号间隔
  const { accountInterval } = await inquirer.prompt([
    {
      type: 'number',
      name: 'accountInterval',
      message: '账号之间的间隔时间 (秒):',
      default: config.batch?.accountInterval || 10,
      validate: (input) => (input ?? 0) >= 0 || '不能为负数',
    },
  ]);

  // 开始批量爬取
  console.log(`\n开始批量爬取 ${accounts.length} 个公众号...`);

  const scraper = new WeChatScraper();

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    logger.info(`\n[${i + 1}/${accounts.length}] 正在爬取: ${account}`);

    try {
      const articles = await scraper.scrapeAccount(account, {
        maxPages: options.pages,
        limit: options.limit,
        days: options.days,
        skipExisting: options.skipExisting,
      });

      logger.info(`✅ ${account} 爬取完成,共 ${articles.length} 篇文章`);

      // 保存文章
      await saveArticles(articles);
    } catch (error) {
      logger.error(`❌ ${account} 爬取失败: ${error}`);
    }

    // 如果不是最后一个,等待间隔
    if (i < accounts.length - 1) {
      logger.info(`⏳ 等待 ${accountInterval} 秒后继续...`);
      await new Promise((resolve) => setTimeout(resolve, accountInterval * 1000));
    }
  }

  console.log('\n✅ 批量爬取完成!');

  // 等待所有异步日志输出完成,避免覆盖主菜单
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
