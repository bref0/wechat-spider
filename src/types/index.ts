export interface Article {
  title: string;
  url: string;
  publishTimestamp?: number;
  accountName: string;
}

export interface LoginCache {
  token: string;
  cookie: string;
  timestamp: number;
}

export interface WeChatAccount {
  wpub_name: string;
  wpub_fakid: string;
}
