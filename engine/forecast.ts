// Kastly forecasting engine.
//
// Pure functions only. No HTTP, no I/O. The HTTP layer feeds in pre-fetched
// weather + events + corrections and gets back a single mean revenue prediction
// plus plain-English reasons.
//
// Mirrors the Python spec: weather × day-of-week × event × school × correction
// multiplier stack, run through a 1000-trial Monte Carlo, with a templated
// reasons layer for any multiplier that deviates from 1.00 by more than 5%.

export type WeatherCondition =
  | 'clear'
  | 'sunny'
  | 'cloudy'
  | 'rain'
  | 'heavy_rain'
  | 'snow'
  | 'thunderstorm'
  | 'fog'
  | 'unknown'

export type WeatherInput = {
  condition: WeatherCondition | string
  tempF: number
  precipitationMm: number
}

export type EventInput = {
  distanceMiles: number
  size: 'major' | 'minor'
  name?: string
}

export type BusinessData = {
  baselineRevenue: number
  businessType: string
  location: string
  schoolDependent: boolean
}

export type ForecastInput = {
  businessData: BusinessData
  weatherData: WeatherInput
  eventsData: EventInput[]
  recentCorrections: number[]
  forecastDate: Date
  isSchoolHoliday?: boolean
  trials?: number
  randomSeed?: number
}

export type MultiplierBreakdown = {
  weather: number
  day: number
  event: number
  school: number
  correction: number
  baseline: number
  monteCarloMean: number
  weatherLabel: string
  dayLabel: string
  eventLabel: string
  schoolLabel: string
  correctionLabel: string
  strongestEvent: EventInput | null
}

export type ForecastOutput = {
  predictedRevenue: number
  reasons: string[]
  breakdown: MultiplierBreakdown
}

const DAY_OF_WEEK_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

// Mon=1..Sun=0 (JS Date.getDay convention). Spec values:
// Mon: 0.80, Tue: 0.85, Wed: 0.90, Thu: 0.95, Fri: 1.20, Sat: 1.30, Sun: 1.10
const DAY_OF_WEEK_MULTIPLIERS: Record<number, number> = {
  0: 1.10, // Sunday
  1: 0.80, // Monday
  2: 0.85, // Tuesday
  3: 0.90, // Wednesday
  4: 0.95, // Thursday
  5: 1.20, // Friday
  6: 1.30, // Saturday
}

export function dayOfWeekMultiplier(date: Date): { value: number; label: string } {
  const dow = date.getDay()
  const value = DAY_OF_WEEK_MULTIPLIERS[dow] ?? 1.0
  return { value, label: DAY_OF_WEEK_NAMES[dow] }
}

// Weather multiplier — checked in priority order so snow trumps cloudy etc.
export function weatherMultiplier(weather: WeatherInput): {
  value: number
  label: string
} {
  const condition = weather.condition.toLowerCase()
  const precip = weather.precipitationMm
  const tempF = weather.tempF

  if (/snow|sleet|blizzard|ice/.test(condition)) {
    return { value: 0.60, label: 'Snow' }
  }
  if (precip > 10 || /heavy rain|thunderstorm|storm/.test(condition)) {
    return { value: 0.75, label: 'Heavy rain' }
  }
  if (precip >= 1 || /rain|drizzle|showers/.test(condition)) {
    return { value: 0.88, label: 'Light rain' }
  }
  if (tempF >= 90) {
    return { value: 0.85, label: 'Extreme heat' }
  }
  if (/cloudy|overcast|fog/.test(condition)) {
    return { value: 0.93, label: 'Cloudy' }
  }
  if (/clear|sunny/.test(condition)) {
    return { value: 1.10, label: 'Clear & sunny' }
  }
  return { value: 1.0, label: 'Mild weather' }
}

// Event multiplier — only the strongest nearby event counts.
export function eventMultiplier(events: EventInput[]): {
  value: number
  label: string
  strongest: EventInput | null
} {
  if (!events || events.length === 0) {
    return { value: 1.0, label: 'No nearby events', strongest: null }
  }

  const tiers: Array<{
    test: (e: EventInput) => boolean
    value: number
    label: string
  }> = [
    {
      test: (e) => e.size === 'major' && e.distanceMiles <= 0.5,
      value: 1.40,
      label: 'Major event nearby (≤0.5 mi)',
    },
    {
      test: (e) => e.size === 'major' && e.distanceMiles <= 2,
      value: 1.20,
      label: 'Major event nearby (≤2 mi)',
    },
    {
      test: (e) => e.size === 'minor' && e.distanceMiles <= 0.5,
      value: 1.15,
      label: 'Minor event nearby (≤0.5 mi)',
    },
  ]

  for (const tier of tiers) {
    const match = events.find(tier.test)
    if (match) {
      return { value: tier.value, label: tier.label, strongest: match }
    }
  }

  return { value: 1.0, label: 'Events too far to impact', strongest: null }
}

export function schoolMultiplier(
  schoolDependent: boolean,
  date: Date,
  isSchoolHoliday?: boolean,
): { value: number; label: string } {
  if (!schoolDependent) {
    return { value: 1.0, label: 'Not school-dependent' }
  }

  const dow = date.getDay()
  const isWeekend = dow === 0 || dow === 6
  const offSchool = isWeekend || isSchoolHoliday === true

  if (offSchool) {
    return { value: 0.70, label: 'School holiday or weekend' }
  }
  return { value: 1.15, label: 'Active school day' }
}

// Weighted recency: oldest 0.2, mid 0.3, newest 0.5. Cap [0.5, 1.5].
export function weightedCorrection(corrections: number[]): {
  value: number
  label: string
} {
  if (!corrections || corrections.length === 0) {
    return { value: 1.0, label: 'No prior corrections' }
  }
  const recent = corrections.slice(-3)
  let raw: number
  if (recent.length === 1) raw = recent[0]
  else if (recent.length === 2) raw = recent[0] * 0.4 + recent[1] * 0.6
  else raw = recent[0] * 0.2 + recent[1] * 0.3 + recent[2] * 0.5

  const capped = Math.max(0.5, Math.min(1.5, raw))
  const sampleSize = recent.length
  return {
    value: capped,
    label: `${sampleSize}-week weighted (raw ${raw.toFixed(3)}, capped ${capped.toFixed(3)})`,
  }
}

export function calculateCorrectionRatio(predicted: number, actual: number): number {
  if (predicted <= 0) return 1.0
  return actual / predicted
}

// Mulberry32: deterministic PRNG when a seed is provided. Otherwise we fall
// back to Math.random — 1000 trials gives a stable mean either way.
function makeRng(seed?: number): () => number {
  if (seed === undefined) return Math.random
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Box-Muller transform — sample from N(mean, std).
function randNormal(mean: number, std: number, rng: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return mean + std * z
}

export function monteCarloForecast(
  baseline: number,
  weatherMult: number,
  dayMult: number,
  eventMult: number,
  schoolMult: number,
  correctionMult: number,
  trials = 1000,
  seed?: number,
): number {
  const rng = makeRng(seed)
  let sum = 0
  for (let i = 0; i < trials; i += 1) {
    const w = weatherMult * randNormal(1, 0.10, rng)
    const d = dayMult * randNormal(1, 0.05, rng)
    const e = eventMult * randNormal(1, 0.15, rng)
    const s = schoolMult * randNormal(1, 0.05, rng)
    const c = correctionMult * randNormal(1, 0.03, rng)
    sum += baseline * w * d * e * s * c
  }
  return Math.round((sum / trials) * 100) / 100
}

// ---------- Plain-English reasons ----------

const FIVE_PCT = 0.05

function pctDelta(multiplier: number): { word: 'up' | 'down'; magnitude: number } {
  const delta = multiplier - 1
  return {
    word: delta >= 0 ? 'up' : 'down',
    magnitude: Math.round(Math.abs(delta) * 100),
  }
}

function weatherReason(weather: WeatherInput, mult: number): string | null {
  if (Math.abs(mult - 1) <= FIVE_PCT) return null
  const { word, magnitude } = pctDelta(mult)
  const condition = weather.condition.toLowerCase()
  let prefix = ''
  if (/snow|sleet|blizzard|ice/.test(condition)) {
    prefix = '🌨️ Snow forecasted'
  } else if (weather.precipitationMm > 10 || /heavy rain|thunderstorm|storm/.test(condition)) {
    prefix = '🌧️ Heavy rain forecasted'
  } else if (weather.precipitationMm >= 1 || /rain|drizzle|showers/.test(condition)) {
    prefix = '🌦️ Light rain forecasted'
  } else if (weather.tempF >= 90) {
    prefix = '🥵 Extreme heat'
  } else if (/cloudy|overcast|fog/.test(condition)) {
    prefix = '☁️ Cloudy day'
  } else if (/clear|sunny/.test(condition)) {
    prefix = '☀️ Clear and sunny'
  } else {
    prefix = '🌤️ Weather impact'
  }
  const tail =
    word === 'down'
      ? `foot traffic expected to drop ${magnitude}%`
      : `foot traffic expected to lift ${magnitude}%`
  return `${prefix} — ${tail}`
}

function dayReason(date: Date, mult: number): string | null {
  if (Math.abs(mult - 1) <= FIVE_PCT) return null
  const { word, magnitude } = pctDelta(mult)
  const dayName = DAY_OF_WEEK_NAMES[date.getDay()]
  const flavor =
    word === 'down'
      ? `${dayName}s are historically your slowest day`
      : `${dayName}s are typically your strongest day`
  const tail = word === 'down' ? `down ${magnitude}%` : `up ${magnitude}%`
  return `📅 ${flavor} — ${tail}`
}

function eventReason(strongest: EventInput | null, mult: number): string | null {
  if (!strongest || Math.abs(mult - 1) <= FIVE_PCT) return null
  const { magnitude } = pctDelta(mult)
  const distance =
    strongest.distanceMiles < 1
      ? `${Math.round(strongest.distanceMiles * 10) / 10} mile away`
      : `${Math.round(strongest.distanceMiles)} miles away`
  const eventName = strongest.name ?? (strongest.size === 'major' ? 'Major event' : 'Event')
  return `🎉 ${eventName} ${distance} — surge expected, +${magnitude}%`
}

function schoolReason(schoolDependent: boolean, mult: number): string | null {
  if (!schoolDependent || Math.abs(mult - 1) <= FIVE_PCT) return null
  const { word, magnitude } = pctDelta(mult)
  if (word === 'down') {
    return `🎒 School holiday or weekend — local families likely traveling, down ${magnitude}%`
  }
  return `🎒 Active school day — student traffic in your favor, up ${magnitude}%`
}

function correctionReason(mult: number, sampleSize: number): string | null {
  if (sampleSize === 0 || Math.abs(mult - 1) <= FIVE_PCT) return null
  const { word, magnitude } = pctDelta(mult)
  if (word === 'up') {
    return `📈 You've beaten forecasts by avg ${magnitude}% recently — baseline adjusted up`
  }
  return `📉 Recent forecasts ran ${magnitude}% high vs your actuals — baseline adjusted down`
}

// ---------- Main entry point ----------

export function generateForecast(input: ForecastInput): ForecastOutput {
  const {
    businessData,
    weatherData,
    eventsData,
    recentCorrections,
    forecastDate,
    isSchoolHoliday,
    trials,
    randomSeed,
  } = input

  const weather = weatherMultiplier(weatherData)
  const day = dayOfWeekMultiplier(forecastDate)
  const event = eventMultiplier(eventsData ?? [])
  const school = schoolMultiplier(businessData.schoolDependent, forecastDate, isSchoolHoliday)
  const correction = weightedCorrection(recentCorrections ?? [])

  const monteMean = monteCarloForecast(
    businessData.baselineRevenue,
    weather.value,
    day.value,
    event.value,
    school.value,
    correction.value,
    trials ?? 1000,
    randomSeed,
  )

  const reasons = [
    weatherReason(weatherData, weather.value),
    dayReason(forecastDate, day.value),
    eventReason(event.strongest, event.value),
    schoolReason(businessData.schoolDependent, school.value),
    correctionReason(correction.value, (recentCorrections ?? []).length),
  ].filter((r): r is string => Boolean(r))

  return {
    predictedRevenue: monteMean,
    reasons,
    breakdown: {
      weather: weather.value,
      day: day.value,
      event: event.value,
      school: school.value,
      correction: correction.value,
      baseline: businessData.baselineRevenue,
      monteCarloMean: monteMean,
      weatherLabel: weather.label,
      dayLabel: day.label,
      eventLabel: event.label,
      schoolLabel: school.label,
      correctionLabel: correction.label,
      strongestEvent: event.strongest,
    },
  }
}
