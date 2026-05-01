# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This repo contains three independent projects sharing one git root:

| Directory | Purpose |
|---|---|
| `/` (root) | React landing page + 7-step onboarding + business analytics dashboard + Gemini website-generator + **Kastly forecasting engine** (Monte Carlo revenue prediction with weekly correction loop) |
| `cashcast/` | Reddit Devvit app (embedded posts) + a separate React demo/prototype UI |
| `cashcast/server/` | Older standalone forecast API server (Express, port 8787) — superseded by the engine in the root project, kept for reference |

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
GEMINI_API_KEY=<your key>          # Required — Gemini website generator
TICKETMASTER_API_KEY=<your key>    # Required — nearby event signal in the engine; without it event multiplier defaults to 1.0
```
`backend.ts` loads both `.env` and `.env.local` via `dotenv`. The Vite frontend never has access to either key — they only land in the Express process.

Vite proxy: all `/api` requests from the frontend are proxied to `http://localhost:5001` (`vite.config.ts`).

### Application Flow

```
App.tsx
  └─ Hero          ← landing page
       │  (zoom animation triggers on "Start Free")
       └─ Onboarding   ← 7-step form (TOTAL_STEPS = 7)
              Step 1: business type selection (10 types)
              Step 2: address via Google Places Autocomplete
              Step 3: daily revenue + profit margin (or use industry averages)
              Step 4: business model (walk-in / mixed / appointment / online)
              Step 5: optional peak traffic time + customer source
              Step 6: promotion style + business name
              Step 7: last week's daily actuals (calibration) — POST /api/onboarding/calibrate
              │  (on finish: fetchWeather + fetchAnchors run concurrently)
              └─ Dashboard   ← main analytics view
                    ├─ "📈 Calibrated · N days (avg X.XX)" pill in top bar (if calibrated)
                    ├─ WeeklyCheckin Monday banner (if last week has no corrections)
                    ├─ Week Outlook card + 7-day forecast chart — driven by /api/forecast/week
                    ├─ 7-day weather forecast (Open-Meteo API, free)
                    ├─ Traffic anchors (nearby schools, transit, etc. via Google Places + DistanceMatrix)
                    ├─ Competitor analysis (Google Places nearbySearch)
                    └─ "Website Beta" tab → WebsiteBeta.tsx
                              └─ POST /api/generate-website → backend.ts → Gemini API
```

Google Maps JS SDK must be loaded in `index.html` (check the script tag for the API key). The `window.google` global is used directly in `Onboarding.tsx` and `Dashboard.tsx`.

### Kastly Forecasting Engine (`engine/`, `integrations/`, `store/`)

Pure-TS Monte Carlo engine that takes baseline revenue + signals and returns a single mean revenue prediction with plain-English reasons.

**Multiplier stack** (`engine/forecast.ts`) — five layers, each sampled in parallel through a 1000-trial Monte Carlo with Box-Muller normal noise (Mulberry32 PRNG, optional seed):
1. **Weather** — snow 0.60 · heavy rain (>10mm) 0.75 · light rain (1–10mm) 0.88 · extreme heat (90°F+) 0.85 · cloudy 0.93 · clear/sunny 1.10
2. **Day of week** — Mon 0.80 · Tue 0.85 · Wed 0.90 · Thu 0.95 · Fri 1.20 · Sat 1.30 · Sun 1.10
3. **Event** (strongest match wins) — major ≤0.5 mi 1.40 · major ≤2 mi 1.20 · minor ≤0.5 mi 1.15 · else 1.00
4. **School** (only if `schoolDependent`) — holiday/weekend 0.70 · active school day 1.15 · else 1.00
5. **Correction** — recency-weighted average of the last 3 stored ratios (`[0.2, 0.3, 0.5]` for newest), clamped to `[0.5, 1.5]`

Per-multiplier σ in Monte Carlo: weather 0.10, day 0.05, event 0.15, school 0.05, correction 0.03.

Reasons layer emits a templated bullet for each multiplier that deviates from 1.00 by more than 5% (e.g. `🌧️ Heavy rain forecasted — foot traffic expected to drop 25%`).

**Integrations** (`integrations/`):
- `weather.ts` — Open-Meteo forecast API (forward) + archive API (historical for retroactive calibration). Maps WMO codes → engine condition strings.
- `events.ts` — Ticketmaster Discovery API. Returns engine-shaped `EventInput[]` with distance + size (`major` for sports/music/arts segment, else `minor`). No-op (returns `[]`) if `TICKETMASTER_API_KEY` is missing.
- `geocode.ts` — Nominatim (used by the engine for free-form address → lat/lon if needed; the React app already has lat/lng from Google Places).

**Correction store** (`store/corrections.ts`) — JSON file at `store/data/corrections.json` (gitignored), keyed by `${slugifiedBusinessType}-${lat3},${lng3}`. One row per (businessId, weekDate). The recency-weighted reduction lives in the engine module so the store stays a dumb persistence layer.

### Backend (`backend.ts`)
- Express on port 5001
- `POST /api/generate-website` — validates input, calls Gemini, returns raw HTML
- `GET /api/models` — lists available Gemini models for the configured key (gated behind `ENABLE_DEBUG_MODELS=true`)
- Gemini model selection: tries a ranked preference list (`gemini-3.1-pro-preview` first, falls back through flash variants), caches the first successful model name in `cachedModelName`

**Kastly engine endpoints:**
- `POST /api/forecast/predict` — single-day prediction. Body: `{ businessType, lat, lng, baselineRevenue, schoolDependent?, forecastDate (YYYY-MM-DD), isSchoolHoliday? }`. Returns `{ predicted_revenue, reasons[], calibrated, correctionsUsed, businessId, weatherUsed, eventsUsed }`.
- `POST /api/forecast/week` — batched 7-day forecast (parallel internal `predict` calls). Same body + optional `startDate` and `days` (default 7). Drives the dashboard's Week Outlook + chart.
- `POST /api/onboarding/calibrate` — accepts last week's actuals `[{ date, revenue }, ...]`, fetches historical weather per day, runs the engine retroactively without a correction multiplier, computes `actual / predicted` ratio, persists each row.
- `GET /api/correction/needs-prompt?businessType=X&lat=Y&lng=Z` — returns `{ needsPrompt, lastWeekDates[], correctionsForLastWeek[], totalCorrections }`. `WeeklyCheckin` fetches this on dashboard mount and only renders when `needsPrompt` is `true`.

Dashboard fetches `/api/forecast/week` on mount and re-fetches whenever `calibrationVersion` bumps (after a successful Monday submission). Engine output drives `weekAvg` and the SVG line chart; the heuristic `generateAIForecast` remains as a fallback if the engine call fails.

**Verifying engine math:**
```bash
npx tsx engine/scenarios.ts    # Re-runs the 3 spec scenarios with seeded RNG and prints the multiplier breakdown for each
```
The three canonical scenarios produce raw stack products of 0.704× / 2.07× / 0.462× the baseline. Monte Carlo means should land within ~0.5% of those.

**Heuristic shared across Onboarding + Dashboard:** `SCHOOL_DEPENDENT_BUSINESSES` is duplicated in `src/components/Onboarding.tsx` and `src/components/Dashboard.tsx`. Keep them in sync — both are passed to the engine as the `schoolDependent` flag. Eventually consolidate into a shared module.

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
