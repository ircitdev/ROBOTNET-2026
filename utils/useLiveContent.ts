import { useEffect, useState } from 'react';
import type { Tariff, NewsItem } from '../types';
import { TARIFFS as FALLBACK_TARIFFS } from '../tariffsData';
import { NEWS_DATA as FALLBACK_NEWS } from '../news';
import { FAQ as FALLBACK_FAQ } from '../constants';
import { PROMO_MODAL_DATA, PromoModalConfig } from '../constants/promoData';

type FaqItem = { question: string; answer: string };

export interface LiveContent {
  tariffs: Tariff[];
  news: NewsItem[];
  faq: FaqItem[];
  promo: PromoModalConfig;
  loaded: boolean;
}

async function fetchArray<T>(url: string, fallback: T[]): Promise<T[]> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return fallback;
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) return fallback;
    return data as T[];
  } catch {
    return fallback;
  }
}

async function fetchObject<T extends object>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return fallback;
    const data = await r.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) return fallback;
    return { ...fallback, ...(data as object) } as T;
  } catch {
    return fallback;
  }
}

export function useLiveContent(): LiveContent {
  const [content, setContent] = useState<LiveContent>({
    tariffs: FALLBACK_TARIFFS,
    news: FALLBACK_NEWS,
    faq: FALLBACK_FAQ,
    promo: PROMO_MODAL_DATA,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchArray<Tariff>('/tariffs.json', FALLBACK_TARIFFS),
      fetchArray<NewsItem>('/news.json', FALLBACK_NEWS),
      fetchArray<FaqItem>('/faq.json', FALLBACK_FAQ),
      fetchObject<PromoModalConfig>('/promo.json', PROMO_MODAL_DATA),
    ]).then(([tariffs, news, faq, promo]) => {
      if (cancelled) return;
      // Sync the in-memory module arrays so consumers that imported them
      // directly (e.g. GeminiChat's TARIFFS reference) see fresh data.
      syncArray(FALLBACK_TARIFFS, tariffs);
      syncArray(FALLBACK_NEWS, news);
      syncArray(FALLBACK_FAQ, faq);
      Object.assign(PROMO_MODAL_DATA, promo);
      setContent({ tariffs, news, faq, promo, loaded: true });
    });
    return () => { cancelled = true; };
  }, []);

  return content;
}

function syncArray<T>(target: T[], next: T[]) {
  target.length = 0;
  for (const item of next) target.push(item);
}
