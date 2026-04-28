# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This repo contains three independent projects sharing one git root:

| Directory | Purpose |
|---|---|
| `/` (root) | React landing page + 6-step onboarding + business analytics dashboard + Gemini website-generator feature |
| `cashcast/` | Reddit Devvit app (embedded posts) + a separate React demo/prototype UI |
| `cashcast/server/` | Real forecast API server (Express, port 8787) |

Each project has its own `package.json`. Run `npm install` inside each before working on it.

---

## Root Project (Landing Page + Dashboard)

### Commands
```bash
npm run dev            # Vite frontend → http://localhost:5173
npm run dev:backend    # Express backend (Gemini proxy) → http://localhost:5001
npm run dev:all        # Both concurrently (recommended for Website Beta feature)
npm run build          # tsc + vite build
npm run preview        # Preview production build
```

### Environment
Create `.env.local` in the root:
```
GEMINI_API_KEY=<your key>
# or
VITE_GEMINI_API_KEY=<your key>
```
The backend (`backend.ts`) reads both. The Vite frontend never has access to the key.

Vite proxy: all `/api` requests from the frontend are proxied to `http://localhost:5001`.

### Application Flow

```
App.tsx
  └─ Hero          ← landing page
       │  (zoom animation triggers on "Start Free")
       └─ Onboarding   ← 6-step form (TOTAL_STEPS = 6)
              Step 1: business type selection (10 types)
              Step 2: address via Google Places Autocomplete
              Step 3: daily revenue + profit margin (or use industry averages)
              Step 4: business model (walk-in / mixed / appointment / online)
              Step 5: optional peak traffic time + customer source
              Step 6: promotion style + business name
              │  (on finish: fetchWeather + fetchAnchors run concurrently)
              └─ Dashboard   ← main analytics view
                    ├─ 7-day weather forecast (Open-Meteo API, free)
                    ├─ Traffic anchors (nearby schools, transit, etc. via Google Places + DistanceMatrix)
                    ├─ Competitor analysis (Google Places nearbySearch)
                    └─ "Website Beta" tab → WebsiteBeta.tsx
                              └─ POST /api/generate-website → backend.ts → Gemini API
```

Google Maps JS SDK must be loaded in `index.html` (check the script tag for the API key). The `window.google` global is used directly in `Onboarding.tsx` and `Dashboard.tsx`.

### Backend (`backend.ts`)
- Express on port 5001
- `POST /api/generate-website` — validates input, calls Gemini, returns raw HTML
- `GET /api/models` — lists available Gemini models for the configured key
- Gemini model selection: tries a ranked preference list (`gemini-3.1-pro-preview` first, falls back through flash variants), caches the first successful model name in `cachedModelName`

### Styling Conventions
- **Theme:** Dark, deep purple-black (`--background: 260 87% 3%`). All CSS variables are HSL defined in `src/index.css`.
- **Font:** Geist Sans via `@fontsource/geist-sans`. Use `font-geist` Tailwind class.
- **Glass morphism UI:** Achieved with `backdrop-filter: blur(...)` + `rgba(...)` backgrounds. The `.liquid-glass` utility class is in `src/index.css`. Inline styles are also used heavily for fine-grained glass effects.
- **Custom Tailwind animations:** `animate-fade-in-up`, `animate-marquee`, `animate-blink`, `animate-float`, `animate-draw-chart`. Keyframes are defined in `tailwind.config.js`.
- **Zoom animation:** `.zooming-active` CSS class triggers the `zoomIntoSpace` keyframe (defined in `src/index.css`) on the background element when the user clicks Start.
- The `optionBtnStyle(selected)` pattern in `Onboarding.tsx` returns inline style objects for selection state — prefer this pattern for interactive option buttons.

---

## cashcast/ — Devvit App + React Prototype

### Devvit App Commands (run from `cashcast/`)
```bash
npm run build        # esbuild bundle (tools/build.ts)
npm run type-check   # tsc --build (TypeScript only, no emit)
npm run dev          # devvit playtest (requires Reddit developer account + devvit login)
npm run login        # devvit login
npm run deploy       # build + devvit upload
npm run launch       # build + deploy + devvit publish
```
Node.js >= 22.6.0 is required (uses `--experimental-strip-types` for native TS execution).

### Devvit Architecture
The Reddit app has two separate surfaces:
- **Inline post** (`public/splash.html` + `src/client/splash.ts`): compact card shown in the feed. Start button calls `requestExpandedMode('game')`.
- **Expanded game** (`public/game.html` + `src/client/game.ts`): full-screen interactive counter.

The build tool (`tools/build.ts`) runs two esbuild passes in parallel:
- Client: `src/client/*.ts` → `public/` (ESM, browser platform)
- Server: `src/server/index.ts` → `dist/server/` (CJS, node platform)

**Shared API contract** (`src/shared/api.ts`): the `ApiEndpoint` const object is the single source of truth for URL paths used by both client and server. Add new routes there first.

**Server** (`src/server/server.ts`): uses `@devvit/web/server` for `context`, `reddit`, and `redis`. State is stored per post: `count:{postId}` key in Redis. The `context.postId` is set by the Devvit runtime — do not mock it.

### React Demo Prototype (also in cashcast/)
`cashcast/src/App.tsx` is a separate Vite React app (proxies `/api` to port 8787) with a cinematic onboarding flow:
`vault → zip → business → scan → dashboard`

`AppContext` (`src/context/AppContext.tsx`) holds 10 business types, each with a `SensitivityProfile` (0–100 scores for weather, events, traffic, sports, economic, seasonal). These scores drive the demo data generator.

`buildDemoDashboardData` in `src/data/demoData.ts` uses a seeded PRNG (`mulberry32(hashSeed(zipCode + businessTypeId))`) to produce fully deterministic, stable-looking demo data. All metrics (revenue, forecast, heatmap, events, scenarios) are derived from this one seed — no real APIs are called from this prototype.

ESLint is configured in `cashcast/eslint.config.js` (flat config, TypeScript + react-hooks + react-refresh).
```bash
cd cashcast && npx eslint src/      # lint the prototype src
```

---

## cashcast/server/ — Real Forecast API

### Commands (run from `cashcast/server/` or via root `cashcast/` scripts)
```bash
# From cashcast/ directory:
npx tsx server/index.ts    # run the API directly with tsx
# Or configure a start script — none exists yet, only used by the prototype's Vite proxy
```

### API Endpoints
- `GET /api/health` — health check
- `POST /api/forecast` — 7-day revenue forecast

### POST /api/forecast — Request Schema (Zod validated)
```ts
{
  businessType: string           // e.g. "coffee shop"
  businessName?: string
  address: string                // full street address, geocoded via Nominatim
  averageDailyRevenue: number    // positive number
  dependencyTags: string[]       // 1–3 tags from: "walk-ins / foot traffic",
                                 //   "delivery / pickup", "students / schools",
                                 //   "office workers / commuters", "local residents"
  weekdayPattern: {              // each day: "much_lower" | "lower" | "average" | "higher" | "much_higher"
    monday: ..., tuesday: ..., ..., sunday: ...
  }
}
```

### Signal Pipeline
Each forecast day aggregates signals in this priority order:
1. **Weather** — NWS API (US addresses) or Open-Meteo (international). `scoreWeatherSummary()` maps conditions to impact percentages.
2. **Holidays** — Calendarific (if `CALENDARIFIC_API_KEY` set) else Nager.Date fallback.
3. **School breaks** — OpenHolidays API + Overpass/OSM for nearby school lookup.
4. **Events** — Ticketmaster Discovery API (if `TICKETMASTER_API_KEY` set; skipped otherwise).
5. **Opportunity calendar** — `OPPORTUNITY_CALENDAR` in `server/index.ts` maps hardcoded `MM-DD` dates to business-specific opportunities (Pi Day, National Coffee Day, etc.) with impact boosts and action templates.

`dependencyTags` adjust signal magnitude: e.g., `walk-ins / foot traffic` amplifies negative weather impact by 1.15×; `delivery / pickup` reduces it.

Missing signals (API failures or missing keys) are collected in `missingSignals[]` and returned to the client — the server never hard-fails on a missing external signal.

### Environment (`cashcast/.env.example`)
```
CALENDARIFIC_API_KEY=   # optional; richer holiday + cultural observance data
TICKETMASTER_API_KEY=   # optional; nearby event signal
PORT=8787               # default port
```

### Type Patterns
- `TriggerKind` union (`snow | rain | severe_weather | holiday | long_weekend | school_break | event | heat | cold | neutral`) controls which action template is selected by `actionsForTrigger()`.
- `MissingSignal` type signals graceful degradation — always return partial data rather than erroring.
- `businessFlavor(businessType)` maps a free-text business type to domain-specific language for action recommendations (prep item names, staffing phrases, customer channels).
- TypeScript project references: `tools/tsconfig.base.json`, `tools/tsconfig.client.json`, `tools/tsconfig.server.json`, `tools/tsconfig.shared.json`.
