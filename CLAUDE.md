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

**Data layer** — all content is static data files at the root level:
- [tariffsData.ts](tariffsData.ts) — tariff plans (`Tariff[]`)
- [news.ts](news.ts) — news items (`NewsItem[]`)
- [channels.ts](channels.ts) — TV channel categories with image arrays
- [constants.ts](constants.ts) — FAQ items
- [constants/contacts.ts](constants/contacts.ts) — all contact info (phone, address, socials, legal)
- [constants/promoData.ts](constants/promoData.ts) — promo modal config

**Components:**
- [ThreeHero.tsx](components/ThreeHero.tsx) — Three.js WebGL animated hero background. Imports Three.js directly from `esm.sh` CDN (not from node_modules), so `three` package in package.json is a type reference only.
- [GeminiChat.tsx](components/GeminiChat.tsx) — Floating AI chat widget. Exports `toggleGeminiChat(message?)` which other components call via a `CustomEvent` (`'toggle-gemini-chat'`). Supports both text chat and live voice mode via Gemini Live API.
- [Preloader.tsx](components/Preloader.tsx) — Fullscreen loading animation shown on first render.
- [PromoModal.tsx](components/PromoModal.tsx) — Auto-shown promotional modal with configurable delay from `promoData.ts`.

**Services:**
- [services/geminiService.ts](services/geminiService.ts) — Wraps `@google/genai` for text chat; builds system prompt from live site data (tariffs, contacts, FAQ).
- [utils/audioUtils.ts](utils/audioUtils.ts) — Audio decoding helpers for Gemini Live voice streaming.

**GSAP animations** are loaded externally (from CDN via `index.html`), not from npm. They're accessed as `(window as any).gsap` and `(window as any).ScrollTrigger`. Elements with class `gsap-reveal` get scroll-triggered fade-in animations.

**Theme** — dark/light mode toggled via `isDark` state; applies `dark` or `light` class to `<html>`. Tailwind CSS with custom colors `neon-cyan`, `neon-lime`, `neon-coral`.

**Path alias** — `@/` maps to the project root (`.`).

## Key Patterns

- `toggleGeminiChat(message?)` is a global event emitter — call it from anywhere to open the chat, optionally pre-filling a message (used by tariff "Connect" buttons).
- No test framework is configured.
- No ESLint config is present.
