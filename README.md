<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# RoborNET 2026

Лендинг интернет-провайдера РоборНЭТ (Волгоград). React + TypeScript + Vite. Контент (тарифы, новости, FAQ, всплывающее окно) подгружается с production-сервера в рантайме и редактируется через Telegram-бота `@Smit34AIAssistant_bot` — без пересборки и деплоя.

## Стек

- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS** (CDN, без сборки)
- **Three.js** (через esm.sh) — анимированный hero
- **GSAP + ScrollTrigger** (CDN) — скролл-анимации
- **@google/genai** — текстовый чат и голосовой режим Gemini Live

## Локальный запуск

Требуется Node.js 20+.

```bash
npm install
# .env.local: GEMINI_API_KEY=ваш_ключ
npm run dev          # http://localhost:3000
npm run build        # сборка в /dist
npm run preview      # просмотр продакшен-сборки
```

## Деплой

CI нет. Деплой ручной — scp на сервер.

- **Сервер:** `root@31.44.7.144`
- **Web-root:** `/var/www/robornet/` (NB: не `robornet.ru/`)
- **Nginx:** `/etc/nginx/sites-enabled/robornet.ru` — SPA fallback, HTTPS LetsEncrypt, .json отдаётся с `no-cache`

```bash
npm run build
ssh root@31.44.7.144 'cp /var/www/robornet/index.html /var/www/robornet/index.html.bak.$(date +%Y%m%d_%H%M%S)'
scp dist/index.html root@31.44.7.144:/var/www/robornet/
scp dist/assets/* root@31.44.7.144:/var/www/robornet/assets/
```

## Контент-пайплайн

Источник истины для тарифов/новостей/FAQ/promo — JSON-файлы на сервере:

| URL | Что | Кто редактирует |
|---|---|---|
| `/tariffs.json` | список тарифов | `/robornet → Тарифы` |
| `/news.json` | новости | `/robornet → Новости` |
| `/faq.json` | FAQ | `/robornet → FAQ` |
| `/promo.json` | всплывающее окно (enabled/title/badge/description/buttons/delay) | `/robornet → Всплывающее окно` |

Фронт читает их через [`utils/useLiveContent.ts`](utils/useLiveContent.ts) при первом рендере. Если fetch не удался — используются бандленные значения из [`tariffsData.ts`](tariffsData.ts), [`news.ts`](news.ts), [`constants.ts`](constants.ts), [`constants/promoData.ts`](constants/promoData.ts).

В рантайме хук также мутирует in-place экспортируемые массивы, чтобы `GeminiChat` (импортирующий `TARIFFS` напрямую) тоже видел свежие данные.

## Управление через Telegram-бота

Бот: **[@Smit34AIAssistant_bot](https://t.me/Smit34AIAssistant_bot)** (systemd-сервис `aida-cache-bot.service`)

- `/robornet` — главное меню управления сайтом (тарифы, новости, FAQ, всплывающее окно, статистика Метрики)
- `/help` — справка + кнопка «📖 Документация» (открывает Telegram Mini App)

Полная документация бота: [docs/bot-help.html](docs/bot-help.html), также опубликована в GCS: <https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/bot-help.html>

Код бота: `/var/www/aida-gpt/telegram_cache_bot.py` + аддоны `*_manager_addon.py`. В репозиторий не вошёл.

## Структура

```
App.tsx                  главный компонент-страница, один из всех secitions
components/
  GeminiChat.tsx         плавающий AI-виджет (чат + голосовой режим)
  ThreeHero.tsx          Three.js hero
  Preloader.tsx
  PromoModal.tsx         всплывающее окно (управляется promo.json)
constants/
  contacts.ts
  promoData.ts           fallback-конфиг promo-модалки
utils/
  useLiveContent.ts      fetch tariffs/news/faq/promo с фоллбэком
  audioUtils.ts          PCM-декодеры для Gemini Live voice
services/
  geminiService.ts       обёртка над @google/genai (текст)
docs/
  bot-help.html          документация по командам бота (TG Mini App)
tariffsData.ts           fallback TARIFFS
news.ts                  fallback NEWS_DATA
constants.ts             fallback FAQ
channels.ts              список ТВ-каналов
types.ts
```

## Полезные ссылки

- Продакшен: <https://robornet.ru/>
- Документация бота (Mini App): <https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/bot-help.html>
- AI Studio: <https://ai.studio/apps/drive/1ag7JOAk6ZpQB0oV-tEAn-6XwJPF9u7bY>
