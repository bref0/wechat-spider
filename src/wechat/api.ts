import axios from 'axios';
import { logger } from '../logger/index.js';
import type { WeChatAccount } from '../types/index.js';

export async function searchAccount(
  token: string,
  cookie: string,
  query: string
): Promise<WeChatAccount[]> {
  const url = 'https://mp.weixin.qq.com/cgi-bin/searchbiz';

  try {
    const response = await axios.get(url, {
      headers: {
        cookie,
      },
      params: {
        action: 'search_biz',
        scene: 1,
        begin: 0,
        count: 10,
        query,
        token,
        lang: 'zh_CN',
        f: 'json',
        ajax: 1,
      },
    });

    const data = response.data;

    if (!data.list || data.list.length === 0) {
      logger.warn(`未找到公众号: ${query}`);
      return [];
    }

    return data.list.map((item: any) => ({
      wpub_name: item.nickname,
      wpub_fakid: item.fakeid,
    }));
  } catch (error) {
    logger.error(`搜索公众号失败: ${error}`);
    return [];
  }
}

export async function getArticlesList(
  token: string,
  cookie: string,
  fakeid: string,
  begin: number
): Promise<any[]> {
  const url = 'https://mp.weixin.qq.com/cgi-bin/appmsg';

  try {
    logger.debug(`请求文章列表: fakeid=${fakeid}, begin=${begin}`);

    const response = await axios.get(url, {
      headers: {
        cookie,
      },
      params: {
        action: 'list_ex',
        begin,
        count: 5,
        fakeid,
        type: 9,
        query: '',
        token,
        lang: 'zh_CN',
        f: 'json',
        ajax: 1,
      },
    });

    const data = response.data;

    logger.debug(`API 响应状态: ${response.status}`);
    logger.debug(`响应数据结构: ${JSON.stringify(Object.keys(data))}`);

    // 检查错误信息
    if (data.base_resp) {
      logger.debug(`base_resp: ${JSON.stringify(data.base_resp)}`);
      if (data.base_resp.ret !== 0) {
        logger.error(`微信 API 返回错误: ret=${data.base_resp.ret}, err_msg=${data.base_resp.err_msg}`);
        return [];
      }
    }

    if (!data.app_msg_list) {
      logger.warn('响应中没有 app_msg_list 字段');
      logger.debug(`完整响应: ${JSON.stringify(data).slice(0, 500)}...`);
      return [];
    }

    logger.debug(`成功获取 ${data.app_msg_list.length} 篇文章`);
    return data.app_msg_list;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error(`HTTP 请求失败: ${error.response?.status} ${error.response?.statusText}`);
      logger.debug(`响应数据: ${JSON.stringify(error.response?.data).slice(0, 500)}`);
    } else {
      logger.error(`获取文章列表失败: ${error}`);
    }
    return [];
  }
}

export async function getArticleContent(
  url: string,
  cookie: string
): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        cookie,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    return response.data;
  } catch (error) {
    logger.error(`获取文章内容失败: ${error}`);
    return '';
  }
}
