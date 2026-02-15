
export interface Tariff {
  id: string;
  name: string;
  price: number;
  speed: number;
  tvChannels?: string;
  isPopular?: boolean;
  type: 'apartment' | 'house';
  features?: string[];
  nightSpeed?: number;
  isWireless?: boolean;
  buttonText?: string;
}

export interface NewsItem {
  id: number;
  date: string;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  fullText?: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}
