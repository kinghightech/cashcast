# CashCast MVP

CashCast is a predictive operations dashboard for local businesses. This MVP asks for minimal owner inputs, then fetches real location-aware external signals to produce a 7-day outlook and actionable recommendations.

## What This Build Includes

- 4-step onboarding flow (business basics, revenue baseline, weekday pattern, dependency tags)
- Real geocoding from business address
- Real weather lookup
  - U.S. addresses: National Weather Service forecast + alerts
  - Non-U.S. addresses: Open-Meteo forecast
- Real holiday lookup using Nager.Date
- Real nearby school context using Overpass OpenStreetMap
- Optional school holiday feed via OpenHolidays when available
- Optional nearby events via Ticketmaster Discovery API (if key provided)
- 7-day forecast with impact band, reasons, and 2-3 suggested actions
- Explicit missing-signal reporting (no fabricated fallback data)

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript

## Local Setup

1. Install dependencies:

   npm install

2. Optional: configure environment variables:

   - Copy .env.example to .env
   - Set TICKETMASTER_API_KEY if you want event signals

3. Start frontend and backend together:

   npm run dev

4. Open app:

   http://localhost:5173

Backend runs on http://localhost:8787 and is proxied through Vite for /api routes.

## API Endpoints

- GET /api/health
- POST /api/forecast

Request payload for /api/forecast:

{
  "businessType": "Coffee shop",
  "businessName": "Bean & Bloom",
  "address": "14 Brattle St, Cambridge, MA 02138",
  "averageDailyRevenue": 2200,
  "dependencyTags": ["Walk-ins / foot traffic", "Students / schools"],
  "weekdayPattern": {
    "monday": "average",
    "tuesday": "average",
    "wednesday": "average",
    "thursday": "average",
    "friday": "higher",
    "saturday": "much_higher",
    "sunday": "higher"
  }
}

## Notes For Demo

- Forecast output is directional, not accounting-precision P/L.
- Missing provider data is shown directly in the Signal Integrity panel.
- Event signal is optional and does not block core forecast functionality.
