export interface Article {
  accountName: string;
  title: string;
  url: string;
  publishTime?: Date;
  publishTimestamp?: number;
  content?: string;
  summary?: string;
  digest?: string;
  images?: string[];
  videos?: string[];
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

export interface MediaFile {
  url: string;
  type: 'image' | 'video';
  localPath?: string;
}

export interface SaveOptions {
  mode?: 'local' | 'database' | 'both';
  downloadMedia?: boolean;
}
