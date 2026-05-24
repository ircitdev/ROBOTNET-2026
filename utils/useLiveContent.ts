import { useEffect, useState } from 'react';
import type { Tariff, NewsItem } from '../types';
import { TARIFFS as FALLBACK_TARIFFS } from '../tariffsData';
import { NEWS_DATA as FALLBACK_NEWS } from '../news';
import { FAQ as FALLBACK_FAQ } from '../constants';

type FaqItem = { question: string; answer: string };

export interface LiveContent {
  tariffs: Tariff[];
  news: NewsItem[];
  faq: FaqItem[];
  loaded: boolean;
}

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return fallback;
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) return fallback;
    return data as T;
  } catch {
    return fallback;
  }
}

export function useLiveContent(): LiveContent {
  const [content, setContent] = useState<LiveContent>({
    tariffs: FALLBACK_TARIFFS,
    news: FALLBACK_NEWS,
    faq: FALLBACK_FAQ,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJson<Tariff[]>('/tariffs.json', FALLBACK_TARIFFS),
      fetchJson<NewsItem[]>('/news.json', FALLBACK_NEWS),
      fetchJson<FaqItem[]>('/faq.json', FALLBACK_FAQ),
    ]).then(([tariffs, news, faq]) => {
      if (cancelled) return;
      // Sync the in-memory module arrays so consumers that imported them
      // directly (e.g. GeminiChat's TARIFFS reference) see fresh data.
      syncArray(FALLBACK_TARIFFS, tariffs);
      syncArray(FALLBACK_NEWS, news);
      syncArray(FALLBACK_FAQ, faq);
      setContent({ tariffs, news, faq, loaded: true });
    });
    return () => { cancelled = true; };
  }, []);

  return content;
}

function syncArray<T>(target: T[], next: T[]) {
  target.length = 0;
  for (const item of next) target.push(item);
}
