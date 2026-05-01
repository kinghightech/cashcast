import cors from 'cors';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

import { generateForecast, type WeatherInput } from './engine/forecast';
import { fetchForwardWeather, fetchHistoricalWeather } from './integrations/weather';
import { fetchNearbyEvents } from './integrations/events';
import {
  listCorrections,
  makeBusinessId,
  recentRatios,
  upsertCorrection,
  type CorrectionRow,
} from './store/corrections';

dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 5001;

// Allow any localhost / 127.0.0.1 origin in dev — Vite picks whatever port is free
// (5173, 5174, 5180, etc.) and previously a port outside the hardcoded list silently
// CORS-rejected every /api call from the browser. Production deploys can lock this
// down via ALLOWED_ORIGINS env.
const explicitAllowed = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (explicitAllowed.includes(origin) || localhostPattern.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ['GET', 'POST'],
    credentials: false,
  }),
);
app.use(express.json({ limit: '64kb' }));

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.warn('Missing GEMINI_API_KEY. Add it to your server .env.local file.');
}

const genAI = new GoogleGenerativeAI(geminiApiKey || '');

const SYSTEM_INSTRUCTION = `You are an expert frontend developer building high-converting, single-page websites for local businesses. Based on the business details provided, generate a complete, responsive HTML document. You MUST embed all CSS within <style> tags and all JavaScript within <script> tags. Use modern, clean UI principles.
CRITICAL RULE: Do NOT wrap your response in markdown formatting. Do NOT use \`\`\`html blocks. Output absolutely nothing except the raw HTML string, starting exactly with <!DOCTYPE html>.
SECOND CRITICAL RULE: You are only allowed to generate websites. Never return explanations, policy text, or anything that is not website HTML.`;

let cachedModelName: string | null = null;

const preferredModels = [
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const directFallbackModels = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

const rateBucket = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 12;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateBucket.get(ip);
  if (!entry || now > entry.resetAt) {
    rateBucket.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  entry.count += 1;
  return true;
}

async function fetchEligibleModels(apiKey: string): Promise<string[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to list Gemini models: HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
  };

  return (data.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => (m.name || '').replace(/^models\//, ''))
    .filter(Boolean);
}

function rankModels(eligible: string[]): string[] {
  const orderedPreferred = preferredModels.filter((name) => eligible.includes(name));
  const orderedRemainder = eligible.filter((name) => !orderedPreferred.includes(name));
  return [...orderedPreferred, ...orderedRemainder];
}

async function resolveModelName(apiKey: string): Promise<string> {
  if (cachedModelName) {
    return cachedModelName;
  }

  const eligible = await fetchEligibleModels(apiKey);

  if (eligible.length === 0) {
    throw new Error('No available Gemini models support generateContent for this API key');
  }

  cachedModelName = rankModels(eligible)[0];
  return cachedModelName;
}

app.get('/api/models', async (_req, res) => {
  try {
    if (process.env.ENABLE_DEBUG_MODELS !== 'true') {
      return res.status(404).json({ error: 'Not found' });
    }
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
    }
    const eligible = await fetchEligibleModels(geminiApiKey);
    return res.json({
      activeGenerateContentModels: rankModels(eligible),
      cachedModelName,
    });
  } catch (error: any) {
    return res.status(200).json({
      activeGenerateContentModels: directFallbackModels,
      cachedModelName,
      discoveryError: error?.message || 'Failed to list models',
    });
  }
});

app.post('/api/generate-website', async (req, res) => {
  try {
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
    }

    const {
      businessName,
      primaryServices,
      targetRevenueGoals,
      businessProfile,
      additionalNotes,
    } = req.body;

    const isValidString = (v: unknown) => typeof v === 'string';
    if (!isValidString(businessName) || !isValidString(businessProfile)) {
      return res.status(400).json({
        error: 'Missing required fields: businessName, businessProfile',
      });
    }

    if (businessName.length > 120 || businessProfile.length > 8000) {
      return res.status(400).json({ error: 'Input is too large. Please shorten your business details.' });
    }

    const prompt = `Generate a professional, modern website for this local business:
  Business Name: ${businessName.trim()}
  Primary Services: ${isValidString(primaryServices) ? primaryServices.trim() || 'Not provided' : 'Not provided'}
  Target Revenue Goals: ${isValidString(targetRevenueGoals) ? targetRevenueGoals.trim() || 'Not provided' : 'Not provided'}

Full Business Context:
  ${businessProfile.trim()}

Additional Builder Notes:
  ${isValidString(additionalNotes) ? additionalNotes.trim() || 'None' : 'None'}

Create a single-page website that showcases the business, includes a services section, social proof/testimonials, and a strong call-to-action contact form. Make it visually appealing, mobile-first, and conversion-focused.`;

    let eligible: string[];
    try {
      eligible = rankModels(await fetchEligibleModels(geminiApiKey));
    } catch {
      eligible = directFallbackModels;
    }
    const attemptOrder = cachedModelName
      ? [cachedModelName, ...eligible.filter((m) => m !== cachedModelName)]
      : eligible;

    let result: Awaited<ReturnType<ReturnType<typeof genAI.getGenerativeModel>['generateContent']>> | null = null;
    let lastError: unknown = null;

    for (const modelName of attemptOrder) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          systemInstruction: SYSTEM_INSTRUCTION,
        });
        cachedModelName = modelName;
        break;
      } catch (err: any) {
        lastError = err;
        const message = String(err?.message || err || '');
        const retriableModelError =
          message.includes('404 Not Found') ||
          message.includes('is not found for API version') ||
          message.includes('not supported for generateContent');
        if (!retriableModelError) {
          throw err;
        }
      }
    }

    if (!result) {
      throw lastError ?? new Error('No active model succeeded for generateContent');
    }

    const htmlContent = result.response.text().trim();

    // Validate that response starts with <!DOCTYPE html
    if (!htmlContent.trim().startsWith('<!DOCTYPE')) {
      console.warn('Response does not start with <!DOCTYPE, it starts with:', htmlContent.substring(0, 100));
    }

    res.json({ html: htmlContent });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    const rawMessage = String(error?.message || '');
    const isApiKeyError =
      rawMessage.includes('API_KEY_INVALID') ||
      rawMessage.toLowerCase().includes('api key expired') ||
      rawMessage.toLowerCase().includes('api key not valid');

    res.status(500).json({
      error: isApiKeyError
        ? 'Gemini API key is invalid or expired. Generate a new key in Google AI Studio, update GEMINI_API_KEY in .env.local, then restart backend.'
        : error?.message || 'Failed to generate website',
    });
  }
});

// ===========================================================================
// Kastly forecasting engine endpoints
// ===========================================================================

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type PredictBody = {
  businessType?: unknown;
  lat?: unknown;
  lng?: unknown;
  baselineRevenue?: unknown;
  schoolDependent?: unknown;
  forecastDate?: unknown;
  isSchoolHoliday?: unknown;
};

type CalibrateBody = {
  businessType?: unknown;
  lat?: unknown;
  lng?: unknown;
  baselineRevenue?: unknown;
  schoolDependent?: unknown;
  actuals?: unknown;
};

function locationKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function fallbackWeather(): WeatherInput {
  return { condition: 'unknown', tempF: 65, precipitationMm: 0 };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value);
}

function lastFullWeekDates(reference: Date): { date: string; label: string }[] {
  const day = reference.getDay();
  const daysToLastSunday = day === 0 ? 7 : day;
  const lastSunday = new Date(reference);
  lastSunday.setDate(reference.getDate() - daysToLastSunday);
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);

  const labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const result: { date: string; label: string }[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(lastMonday);
    d.setDate(lastMonday.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    result.push({ date: iso, label: `${labels[i]}, ${monthDay}` });
  }
  return result;
}

app.post('/api/forecast/predict', async (req, res) => {
  const body = req.body as PredictBody;

  if (typeof body.businessType !== 'string' || body.businessType.trim().length === 0) {
    return res.status(400).json({ error: 'businessType is required' });
  }
  if (!isFiniteNumber(body.lat) || !isFiniteNumber(body.lng)) {
    return res.status(400).json({ error: 'lat and lng (numbers) are required' });
  }
  if (!isFiniteNumber(body.baselineRevenue) || body.baselineRevenue <= 0) {
    return res.status(400).json({ error: 'baselineRevenue must be a positive number' });
  }
  if (!isIsoDate(body.forecastDate)) {
    return res.status(400).json({ error: 'forecastDate must be YYYY-MM-DD' });
  }

  const businessType = body.businessType.trim();
  const lat = body.lat;
  const lng = body.lng;
  const baselineRevenue = body.baselineRevenue;
  const schoolDependent = body.schoolDependent === true;
  const forecastDate = body.forecastDate;
  const isSchoolHoliday = body.isSchoolHoliday === true ? true : undefined;

  try {
    const [weather, events] = await Promise.all([
      fetchForwardWeather(lat, lng, forecastDate).catch(() => null),
      fetchNearbyEvents(lat, lng, forecastDate).catch(() => []),
    ]);

    const businessId = makeBusinessId(businessType, locationKey(lat, lng));
    const corrections = await recentRatios(businessId, 3);

    const result = generateForecast({
      businessData: {
        baselineRevenue,
        businessType,
        location: locationKey(lat, lng),
        schoolDependent,
      },
      weatherData: weather ?? fallbackWeather(),
      eventsData: events,
      recentCorrections: corrections,
      forecastDate: new Date(`${forecastDate}T12:00:00`),
      isSchoolHoliday,
    });

    return res.json({
      predicted_revenue: result.predictedRevenue,
      reasons: result.reasons,
      calibrated: corrections.length > 0,
      correctionsUsed: corrections.length,
      businessId,
      weatherUsed: weather
        ? `${weather.condition} ${Math.round(weather.tempF)}°F`
        : 'unavailable',
      eventsUsed: events.length,
    });
  } catch (error: any) {
    console.error('Forecast error:', error);
    return res.status(500).json({ error: error?.message || 'Forecast failed' });
  }
});

app.post('/api/onboarding/calibrate', async (req, res) => {
  const body = req.body as CalibrateBody;

  if (typeof body.businessType !== 'string' || body.businessType.trim().length === 0) {
    return res.status(400).json({ error: 'businessType is required' });
  }
  if (!isFiniteNumber(body.lat) || !isFiniteNumber(body.lng)) {
    return res.status(400).json({ error: 'lat and lng (numbers) are required' });
  }
  if (!isFiniteNumber(body.baselineRevenue) || body.baselineRevenue <= 0) {
    return res.status(400).json({ error: 'baselineRevenue must be a positive number' });
  }
  if (!Array.isArray(body.actuals) || body.actuals.length === 0 || body.actuals.length > 14) {
    return res.status(400).json({ error: 'actuals must be 1-14 entries' });
  }

  const businessType = body.businessType.trim();
  const lat = body.lat;
  const lng = body.lng;
  const baselineRevenue = body.baselineRevenue;
  const schoolDependent = body.schoolDependent === true;
  const businessId = makeBusinessId(businessType, locationKey(lat, lng));

  type Actual = { date: string; revenue: number | null };
  const actuals: Actual[] = [];
  for (const item of body.actuals as unknown[]) {
    if (typeof item !== 'object' || item === null) {
      return res.status(400).json({ error: 'each actual must be { date, revenue }' });
    }
    const entry = item as { date?: unknown; revenue?: unknown };
    if (!isIsoDate(entry.date)) {
      return res.status(400).json({ error: 'each actual.date must be YYYY-MM-DD' });
    }
    const revenue =
      entry.revenue === null || entry.revenue === undefined
        ? null
        : isFiniteNumber(entry.revenue) && entry.revenue >= 0
        ? entry.revenue
        : null;
    actuals.push({ date: entry.date, revenue });
  }

  try {
    const stored: Array<{
      date: string;
      predicted: number;
      actual: number;
      ratio: number;
      weather: string;
    }> = [];
    const skipped: string[] = [];

    for (const entry of actuals) {
      if (entry.revenue === null) {
        skipped.push(entry.date);
        continue;
      }
      const weather = await fetchHistoricalWeather(lat, lng, entry.date).catch(() => null);
      const result = generateForecast({
        businessData: {
          baselineRevenue,
          businessType,
          location: locationKey(lat, lng),
          schoolDependent,
        },
        weatherData: weather ?? fallbackWeather(),
        eventsData: [],
        recentCorrections: [],
        forecastDate: new Date(`${entry.date}T12:00:00`),
      });
      const predicted = result.predictedRevenue;
      const ratio = predicted > 0 ? entry.revenue / predicted : 1.0;
      const row: CorrectionRow = {
        businessId,
        weekDate: entry.date,
        predicted,
        actual: entry.revenue,
        correctionRatio: ratio,
        createdAt: new Date().toISOString(),
      };
      await upsertCorrection(row);
      stored.push({
        date: entry.date,
        predicted,
        actual: entry.revenue,
        ratio,
        weather: weather ? `${weather.condition} ${Math.round(weather.tempF)}°F` : 'unavailable',
      });
    }

    const finalRecent = await recentRatios(businessId, 3);
    const avg =
      finalRecent.length === 0
        ? 1
        : finalRecent.reduce((s: number, n: number) => s + n, 0) / finalRecent.length;

    return res.json({
      businessId,
      stored,
      skipped,
      correctionsCount: finalRecent.length,
      averageRatio: Math.round(avg * 1000) / 1000,
      message:
        stored.length > 0
          ? `Calibrated based on ${stored.length} day${stored.length > 1 ? 's' : ''} of actuals.`
          : 'No actuals submitted — running on baseline.',
    });
  } catch (error: any) {
    console.error('Calibration error:', error);
    return res.status(500).json({ error: error?.message || 'Calibration failed' });
  }
});

app.post('/api/forecast/week', async (req, res) => {
  const body = req.body as PredictBody & { startDate?: unknown; days?: unknown };

  if (typeof body.businessType !== 'string' || body.businessType.trim().length === 0) {
    return res.status(400).json({ error: 'businessType is required' });
  }
  if (!isFiniteNumber(body.lat) || !isFiniteNumber(body.lng)) {
    return res.status(400).json({ error: 'lat and lng (numbers) are required' });
  }
  if (!isFiniteNumber(body.baselineRevenue) || body.baselineRevenue <= 0) {
    return res.status(400).json({ error: 'baselineRevenue must be a positive number' });
  }

  const businessType = body.businessType.trim();
  const lat = body.lat;
  const lng = body.lng;
  const baselineRevenue = body.baselineRevenue;
  const schoolDependent = body.schoolDependent === true;
  const days = isFiniteNumber(body.days) && body.days > 0 && body.days <= 14 ? Math.floor(body.days) : 7;

  const startDate = isIsoDate(body.startDate) ? new Date(`${body.startDate}T12:00:00`) : (() => {
    const t = new Date();
    t.setHours(12, 0, 0, 0);
    t.setDate(t.getDate() + 1); // tomorrow forward
    return t;
  })();

  const dateList: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dateList.push(d.toISOString().slice(0, 10));
  }

  try {
    const businessId = makeBusinessId(businessType, locationKey(lat, lng));
    const corrections = await recentRatios(businessId, 3);

    const dayResults = await Promise.all(
      dateList.map(async (iso) => {
        const [weather, events] = await Promise.all([
          fetchForwardWeather(lat, lng, iso).catch(() => null),
          fetchNearbyEvents(lat, lng, iso).catch(() => []),
        ]);
        const result = generateForecast({
          businessData: {
            baselineRevenue,
            businessType,
            location: locationKey(lat, lng),
            schoolDependent,
          },
          weatherData: weather ?? fallbackWeather(),
          eventsData: events,
          recentCorrections: corrections,
          forecastDate: new Date(`${iso}T12:00:00`),
        });
        const dayDate = new Date(`${iso}T12:00:00`);
        return {
          date: iso,
          dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayDate.getDay()],
          predicted_revenue: result.predictedRevenue,
          baseline: baselineRevenue,
          deltaPct: Math.round(((result.predictedRevenue - baselineRevenue) / baselineRevenue) * 1000) / 10,
          reasons: result.reasons,
          breakdown: {
            weather: result.breakdown.weather,
            day: result.breakdown.day,
            event: result.breakdown.event,
            school: result.breakdown.school,
            correction: result.breakdown.correction,
          },
          weather: weather ? `${weather.condition} ${Math.round(weather.tempF)}°F` : 'unavailable',
          eventsCount: events.length,
        };
      })
    );

    const totalPredicted = dayResults.reduce((s, d) => s + d.predicted_revenue, 0);
    const totalBaseline = dayResults.reduce((s, d) => s + d.baseline, 0);
    const weekDeltaPct = Math.round(((totalPredicted - totalBaseline) / totalBaseline) * 1000) / 10;

    return res.json({
      businessId,
      calibrated: corrections.length > 0,
      correctionsUsed: corrections.length,
      days: dayResults,
      summary: {
        totalPredicted: Math.round(totalPredicted * 100) / 100,
        totalBaseline,
        weekDeltaPct,
      },
    });
  } catch (error: any) {
    console.error('Week forecast error:', error);
    return res.status(500).json({ error: error?.message || 'Week forecast failed' });
  }
});

app.get('/api/correction/needs-prompt', async (req, res) => {
  const businessType = String(req.query.businessType ?? '').trim();
  const latStr = String(req.query.lat ?? '');
  const lngStr = String(req.query.lng ?? '');
  const lat = Number(latStr);
  const lng = Number(lngStr);

  if (!businessType || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'businessType, lat, lng required' });
  }

  const businessId = makeBusinessId(businessType, locationKey(lat, lng));
  const lastWeek = lastFullWeekDates(new Date());
  const lastWeekSet = new Set(lastWeek.map((d) => d.date));

  const all = await listCorrections(businessId);
  const haveAnyForLastWeek = all.some((row) => lastWeekSet.has(row.weekDate));

  return res.json({
    businessId,
    needsPrompt: !haveAnyForLastWeek,
    lastWeekDates: lastWeek,
    correctionsForLastWeek: all
      .filter((row) => lastWeekSet.has(row.weekDate))
      .map((row) => ({ date: row.weekDate, ratio: row.correctionRatio })),
    totalCorrections: all.length,
  });
});

app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});
