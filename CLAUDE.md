# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **RoborNET 2026** ISP (Internet Service Provider) landing page — a single-page React/TypeScript app for a Volgograd internet provider. It features tariff plans, interactive TV channel browser, news section, FAQ, contacts, and an integrated Gemini AI chat assistant.

## Commands

```bash
# Install dependencies
npm install

# Start dev server at http://localhost:3000
npm run dev

# Production build (outputs to /dist)
npm run build

# Preview production build
npm run preview
```

## Environment

Requires `.env.local` with:
```
GEMINI_API_KEY=your_key_here
```

The Vite config exposes this as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.

## Architecture

The entire app is a single page (`App.tsx`) with no routing. Sections render sequentially by ID: `#hero`, `#about-network`, `#tariffs`, `#tv`, `#news`, `#faq`, `#help`, `#official`, `#documents`.

**Data layer** — content is fetched at runtime from JSON files served alongside the site (`/tariffs.json`, `/news.json`, `/faq.json`, `/promo.json`). The TS files at the project root act as **fallbacks** if fetch fails:

- [tariffsData.ts](tariffsData.ts) — tariff plans (`Tariff[]`) — fallback for `/tariffs.json`
- [news.ts](news.ts) — news items (`NewsItem[]`) — fallback for `/news.json`
- [constants.ts](constants.ts) — FAQ items — fallback for `/faq.json`
- [constants/promoData.ts](constants/promoData.ts) — promo modal config (`PromoModalConfig`) — fallback for `/promo.json`
- [channels.ts](channels.ts) — TV channel categories (NOT live, bundled only)
- [constants/contacts.ts](constants/contacts.ts) — contact info (NOT live, bundled only)

The live-content layer lives in [utils/useLiveContent.ts](utils/useLiveContent.ts). It:

1. Fetches the four JSON files in parallel on first render with `cache: 'no-store'`.
2. Falls back to bundled defaults on network/parse failures or empty arrays.
3. **Mutates the exported fallback arrays in place** (`syncArray`, `Object.assign`) so modules that imported `TARIFFS`/`NEWS_DATA`/`FAQ`/`PROMO_MODAL_DATA` directly (e.g. [GeminiChat.tsx](components/GeminiChat.tsx) uses `TARIFFS` in the AI system prompt) see fresh data without prop drilling.

**Components:**

- [ThreeHero.tsx](components/ThreeHero.tsx) — Three.js WebGL animated hero background. Imports Three.js directly from `esm.sh` CDN (not from node_modules), so `three` package in package.json is a type reference only.
- [GeminiChat.tsx](components/GeminiChat.tsx) — Floating AI chat widget. Exports `toggleGeminiChat(message?)` which other components call via a `CustomEvent` (`'toggle-gemini-chat'`). Supports text chat (relayed via `aida.smit34.ru/chat`) and live voice mode via Gemini Live API. Microphone is requested **explicitly** (`requestMicrophone`) with typed error states (`denied`/`notfound`/`busy`/`insecure`/`unsupported`).
- [Preloader.tsx](components/Preloader.tsx) — Fullscreen loading animation shown on first render.
- [PromoModal.tsx](components/PromoModal.tsx) — Auto-shown promotional modal. Accepts a `config` prop; when `config.enabled === false` the modal is suppressed entirely. Frequency cap is one show per day via `localStorage.robornet_promo_shown`.

**Services:**
- [services/geminiService.ts](services/geminiService.ts) — Wraps `@google/genai` for text chat; builds system prompt from live site data (tariffs, contacts, FAQ).
- [utils/audioUtils.ts](utils/audioUtils.ts) — Audio decoding helpers for Gemini Live voice streaming.

**GSAP animations** are loaded externally (from CDN via `index.html`), not from npm. They're accessed as `(window as any).gsap` and `(window as any).ScrollTrigger`. Elements with class `gsap-reveal` get scroll-triggered fade-in animations.

**Theme** — dark/light mode toggled via `isDark` state; applies `dark` or `light` class to `<html>`. Tailwind CSS with custom colors `neon-cyan`, `neon-lime`, `neon-coral`.

**Path alias** — `@/` maps to the project root (`.`).

## Production / deployment

Deployment is manual (no CI). The site is served by nginx from `/var/www/robornet/` on `root@31.44.7.144`.

```bash
npm run build
ssh root@31.44.7.144 'cp /var/www/robornet/index.html /var/www/robornet/index.html.bak.$(date +%Y%m%d_%H%M%S)'
scp dist/index.html root@31.44.7.144:/var/www/robornet/
scp dist/assets/* root@31.44.7.144:/var/www/robornet/assets/
```

The nginx config at `/etc/nginx/sites-enabled/robornet.ru` already serves `*.json` with `Cache-Control: no-cache, must-revalidate` and `Access-Control-Allow-Origin: *`. Reloading nginx is **not** required after editing JSON.

## Telegram admin bot

The site's content (tariffs, news, FAQ, promo modal) is edited via **[@Smit34AIAssistant_bot](https://t.me/Smit34AIAssistant_bot)** — entry command `/robornet`. The bot writes the four JSON files in `/var/www/robornet/` directly; the site fetches them fresh on next page load.

- systemd unit: `aida-cache-bot.service`
- Bot code: `/var/www/aida-gpt/telegram_cache_bot.py`
- Robornet module: `/var/www/aida-gpt/robornet_manager_addon.py` (single file: managers + keyboards + handlers)
- Restart after server-side edits: `systemctl restart aida-cache-bot.service`
- Bot code is **not** in this repository — server is the source of truth for the bot.

`/help` includes an inline `WebAppInfo` button "📖 Документация" that opens [docs/bot-help.html](docs/bot-help.html) as a Telegram Mini App. The file is hosted at `https://storage.googleapis.com/uspeshnyy-projects/smit/robotnet.ru/bot-help.html` (GCS bucket `uspeshnyy-projects` with public read).

To update the docs: edit [docs/bot-help.html](docs/bot-help.html), then upload to GCS via the server:

```bash
scp docs/bot-help.html root@31.44.7.144:/tmp/
ssh root@31.44.7.144 'PATH=$PATH:/root/google-cloud-sdk/bin gsutil \
  -h "Content-Type:text/html; charset=utf-8" \
  -h "Cache-Control:public, max-age=300" \
  cp /tmp/bot-help.html gs://uspeshnyy-projects/smit/robotnet.ru/bot-help.html'
```

## Key Patterns

- `toggleGeminiChat(message?)` is a global event emitter — call it from anywhere to open the chat, optionally pre-filling a message (used by tariff "Connect" buttons).
- When adding a new live-editable field, always wire it in three places: bot manager (`robornet_manager_addon.py`), `useLiveContent.ts` fetch + fallback sync, and the consuming React component prop / `useLiveContent()` field.
- Fallback values in `tariffsData.ts` / `news.ts` / `constants.ts` / `constants/promoData.ts` are NOT the source of truth in production — JSON files on the server are. After local edits, decide whether to also update the server JSON (or accept that the server values will override the fallbacks once fetched).
- No test framework is configured.
- No ESLint config is present.
