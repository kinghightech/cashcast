import cors from 'cors'
import express, { type Request, type Response } from 'express'
import { z } from 'zod'

const app = express()
const PORT = Number(process.env.PORT ?? 8787)
const APP_USER_AGENT = 'CashCastMVP/1.0 (hackathon project)'

app.use(cors())
app.use(express.json())

const weekdayStrengthSchema = z.enum([
  'much_lower',
  'lower',
  'average',
  'higher',
  'much_higher',
])

const forecastRequestSchema = z.object({
  businessType: z.string().min(1),
  businessName: z.string().optional(),
  address: z.string().min(5),
  averageDailyRevenue: z.number().positive(),
  dependencyTags: z.array(z.string().min(1)).min(1).max(3),
  weekdayPattern: z.object({
    monday: weekdayStrengthSchema,
    tuesday: weekdayStrengthSchema,
    wednesday: weekdayStrengthSchema,
    thursday: weekdayStrengthSchema,
    friday: weekdayStrengthSchema,
    saturday: weekdayStrengthSchema,
    sunday: weekdayStrengthSchema,
  }),
})

type ForecastRequestBody = z.infer<typeof forecastRequestSchema>
type DayStatus = 'weaker' | 'normal' | 'stronger'

type MissingSignal = {
  signal: 'weather' | 'holidays' | 'schools' | 'events'
  message: string
}

type GeoResult = {
  latitude: number
  longitude: number
  displayName: string
  city?: string
  state?: string
  postalCode?: string
  countryCode: string
  subdivisionCode?: string
}

type WeatherDay = {
  date: string
  summary: string
  highC?: number
  lowC?: number
  impactPct: number
  reasons: string[]
  severeAlert?: boolean
}

type HolidayDay = {
  date: string
  name: string
  longWeekend: boolean
  isPublic: boolean
  isOpportunity: boolean
  opportunityNote: string
  opportunityActions: string[]
}

type OpportunityDef = {
  name: string
  businessKeys: string[]
  note: string
  impactBoostPct: number
  actions: string[]
}

const OPPORTUNITY_CALENDAR: Record<string, OpportunityDef> = {
  '03-14': {
    name: 'Pi Day (3.14)',
    businessKeys: ['coffee', 'bakery', 'cafe', 'restaurant', 'quick'],
    note: 'Pi Day (March 14th) is a viral food holiday — customers actively seek pie and circular-food deals. Coffee shops and bakeries often see a surprise bump from creative "pi/pie" promotions.',
    impactBoostPct: 0.13,
    actions: [
      'Create a Pi Day deal around a circular item — pie slice, round cookie, or donut.',
      'Post a "3.14% off all pies/pastries" graphic before opening — Pi Day posts reliably go viral locally.',
      'Prep extra of your circular or pie-type items for the mid-morning rush.',
    ],
  },
  '09-29': {
    name: 'National Coffee Day',
    businessKeys: ['coffee', 'cafe'],
    note: 'National Coffee Day is the single highest-traffic organic promotion day for coffee shops. Expect above-normal demand and very strong social media reach.',
    impactBoostPct: 0.22,
    actions: [
      'Offer a free drip coffee with any purchase — this converts social-media followers into in-store visits.',
      'Double your batch prep for the morning rush — National Coffee Day reliably drives a significant spike.',
      'Post your National Coffee Day promotion by 7 AM for maximum morning reach.',
    ],
  },
  '11-01': {
    name: 'National Espresso Day',
    businessKeys: ['coffee', 'cafe'],
    note: 'National Espresso Day drives coffee-specific social engagement and promo traffic to cafes.',
    impactBoostPct: 0.1,
    actions: [
      'Feature an espresso special or a flight of espresso styles on your menu today.',
      'Post an espresso-focused social story before opening.',
      'Offer a free double-shot upgrade to drive trial.',
    ],
  },
  '02-14': {
    name: "Valentine's Day",
    businessKeys: ['coffee', 'bakery', 'cafe', 'restaurant', 'quick'],
    note: "Valentine's Day is a top-5 revenue day for cafes, bakeries, and coffee shops — couples and gifting drive strong midday and afternoon demand.",
    impactBoostPct: 0.2,
    actions: [
      "Create a Valentine's bundle (drink + pastry) at a slight premium — couples convert very well on this day.",
      'Add a heart-themed item to your display case or menu board.',
      "Drive pre-orders or add-ons by February 12th so you can prep accurately.",
    ],
  },
  '06-07': {
    name: 'National Donut Day',
    businessKeys: ['bakery', 'coffee', 'cafe', 'quick'],
    note: 'National Donut Day reliably drives walk-in traffic for bakeries and coffee shops — customers actively search for the deal.',
    impactBoostPct: 0.15,
    actions: [
      'Offer a free donut with any drink purchase — this is the proven National Donut Day play.',
      'Increase donut or fried pastry prep significantly above normal.',
      'Post a National Donut Day story right at opening time.',
    ],
  },
  '01-23': {
    name: 'National Pie Day',
    businessKeys: ['bakery', 'restaurant', 'cafe'],
    note: 'National Pie Day (Jan 23) is a high-opportunity day for bakeries — themed promotions perform strongly.',
    impactBoostPct: 0.1,
    actions: [
      'Feature a pie-of-the-day deal or a highlighted slice special.',
      'Increase whole pie production for pre-orders today.',
      'Post a "celebrate National Pie Day" offer on social.',
    ],
  },
  '10-04': {
    name: 'National Taco Day',
    businessKeys: ['restaurant', 'quick'],
    note: 'National Taco Day is one of the highest social-sharing food holidays — QSR and casual restaurants see strong demand spikes.',
    impactBoostPct: 0.16,
    actions: [
      'Run a taco special or a limited bundle deal for today only.',
      'Increase protein and taco-related prep volume above normal.',
      'Post a National Taco Day promo before 10 AM.',
    ],
  },
  '04-02': {
    name: 'National Peanut Butter Cookie Day',
    businessKeys: ['bakery', 'coffee', 'cafe'],
    note: 'A minor but high-engagement baking holiday — good for showcasing signature cookie items.',
    impactBoostPct: 0.06,
    actions: [
      'Feature a peanut butter cookie prominently today.',
      'Run a "cookie + coffee" or "cookie + tea" pairing deal.',
    ],
  },
  '03-08': {
    name: "International Women's Day",
    businessKeys: ['coffee', 'bakery', 'cafe', 'restaurant', 'quick'],
    note: "International Women's Day sees strong community attendance at local cafes and gathering spots — a great day for community-forward messaging.",
    impactBoostPct: 0.08,
    actions: [
      'Run a women-celebrating theme for the day with a featured item.',
      'Offer a community discount or donation tie-in.',
    ],
  },
  '09-22': {
    name: 'First Day of Fall',
    businessKeys: ['coffee', 'bakery', 'cafe', 'restaurant'],
    note: 'First Day of Fall is a major trigger for seasonal demand — pumpkin, spice, and warm drinks see a traffic and engagement spike.',
    impactBoostPct: 0.1,
    actions: [
      'Launch your fall seasonal menu today if not already live.',
      'Feature pumpkin, apple, or cinnamon items and drinks prominently.',
      'Post a "fall is officially here" social story with your seasonal item.',
    ],
  },
  '12-21': {
    name: 'Winter Solstice / First Day of Winter',
    businessKeys: ['coffee', 'cafe', 'bakery'],
    note: 'Winter Solstice drives strong "warm comfort" demand — the shortest day of the year resonates well with cozy cafe messaging.',
    impactBoostPct: 0.08,
    actions: [
      'Feature a "warm up on the longest night" hot drink or cozy item as your daily special.',
      'Post a solstice-themed social story with your warmest menu item.',
    ],
  },
  '03-20': {
    name: 'First Day of Spring',
    businessKeys: ['coffee', 'bakery', 'cafe', 'restaurant'],
    note: 'First Day of Spring brings optimism and an outdoor social mood — foot traffic picks up as people emerge.',
    impactBoostPct: 0.08,
    actions: [
      'Launch a spring menu item or seasonal special today.',
      'Post a "spring has arrived" promotion featuring a fresh seasonal item.',
    ],
  },
  '06-21': {
    name: 'First Day of Summer',
    businessKeys: ['coffee', 'cafe', 'restaurant', 'quick'],
    note: 'Summer launch day — iced drinks, outdoor seating, and fresh items see strong demand.',
    impactBoostPct: 0.09,
    actions: [
      'Feature your coldest or most refreshing drink front-and-center today.',
      'Post a "summer starts today" seasonal announcement.',
    ],
  },
  '10-31': {
    name: 'Halloween',
    businessKeys: ['bakery', 'coffee', 'cafe', 'restaurant', 'quick'],
    note: 'Halloween drives themed item demand and strong afternoon/evening traffic for food businesses.',
    impactBoostPct: 0.14,
    actions: [
      'Feature a Halloween-themed item, drink, or treat as your daily special.',
      'Offer a small discount for customers who come in costume.',
      'Post a Halloween countdown social post by morning.',
    ],
  },
  '11-26': {
    name: 'Thanksgiving Eve',
    businessKeys: ['bakery', 'restaurant', 'quick', 'cafe', 'coffee'],
    note: 'The day before Thanksgiving is one of the highest takeout and bakery pre-order days of the year.',
    impactBoostPct: 0.18,
    actions: [
      'Drive pre-orders for pie, bread, or any shareable item today.',
      'Staff up on Wednesday afternoon — the pre-pickup rush is very real.',
      'Post a "order your Thanksgiving staples today" reminder before noon.',
    ],
  },
  '12-24': {
    name: 'Christmas Eve',
    businessKeys: ['bakery', 'coffee', 'cafe', 'restaurant'],
    note: 'Christmas Eve drives gifting, last-minute treats, and a strong morning rush at cafes and bakeries.',
    impactBoostPct: 0.2,
    actions: [
      'Feature gift boxes, holiday bundles, or take-home treats prominently.',
      'Prep early and open on time — the morning rush is your peak demand window.',
      'Post a Christmas Eve special or gift-giving idea by 7 AM.',
    ],
  },
  '05-04': {
    name: 'Star Wars Day ("May the 4th")',
    businessKeys: ['coffee', 'cafe', 'bakery', 'quick'],
    note: 'A viral internet holiday — local businesses doing Star Wars themed items get strong organic social reach with very low effort.',
    impactBoostPct: 0.07,
    actions: [
      'Feature a Star Wars themed item, drink name, or promo — creativity wins here.',
      'Post a "May the 4th be with you" social story with your special.',
    ],
  },
  '11-27': {
    name: 'Black Friday',
    businessKeys: ['coffee', 'bakery', 'cafe', 'restaurant', 'quick'],
    note: 'Black Friday brings very high foot traffic to commercial areas — if you are near shopping, expect a strong surge in walk-ins and impulse visits.',
    impactBoostPct: 0.17,
    actions: [
      'Staff up significantly — foot traffic in commercial areas is at its yearly peak today.',
      'Feature a quick-serve or grab-and-go deal to capture high-volume shoppers.',
      'Prep for a longer-than-usual business day and restock at midday.',
    ],
  },
  '12-26': {
    name: 'Day After Christmas',
    businessKeys: ['coffee', 'cafe', 'bakery'],
    note: 'The day after Christmas sees a strong "out of the house" mood — people visit cafes to decompress or catch up with family.',
    impactBoostPct: 0.1,
    actions: [
      'Feature a cozy post-holiday special.',
      'Post a "take a break from family, visit us" lighthearted social message.',
    ],
  },
}

function getOpportunityForDate(
  date: string,
  businessType: string,
): OpportunityDef | null {
  const mmdd = date.slice(5) // "YYYY-MM-DD" → "MM-DD"
  const def = OPPORTUNITY_CALENDAR[mmdd]
  if (!def) return null
  const btLower = businessType.toLowerCase()
  const relevant = def.businessKeys.some((kw) => btLower.includes(kw))
  return relevant ? def : null
}

type EventDay = {
  date: string
  count: number
  names: string[]
}

type SchoolHolidayRange = {
  startDate: string
  endDate: string
  name: string
}

type SignalItem = {
  type: string
  label: string
  direction: 'up' | 'down' | 'none'
}

type ForecastDay = {
  date: string
  weekday: string
  weatherSummary: string | null
  baselineRevenue: number
  predictedRevenue: number
  impactPercent: number
  impactBand: string
  status: DayStatus
  reasons: string[]
  actions: string[]
  signals: SignalItem[]
}

type TriggerKind =
  | 'snow'
  | 'rain'
  | 'severe_weather'
  | 'holiday'
  | 'long_weekend'
  | 'school_break'
  | 'event'
  | 'heat'
  | 'cold'
  | 'neutral'

const weekdayOrder = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

const weekdayDisplay: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

const weekdayMultiplier: Record<z.infer<typeof weekdayStrengthSchema>, number> = {
  much_lower: 0.75,
  lower: 0.9,
  average: 1,
  higher: 1.12,
  much_higher: 1.25,
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': APP_USER_AGENT,
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Request failed ${response.status}: ${body.slice(0, 160)}`)
  }

  return (await response.json()) as T
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function todayDateKeys(count = 7): string[] {
  const keys: string[] = []
  const base = new Date()

  for (let i = 1; i <= count; i += 1) {
    const d = new Date(base)
    d.setUTCDate(base.getUTCDate() + i)
    keys.push(d.toISOString().slice(0, 10))
  }

  return keys
}

function weekdayFromDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00Z`)
  return weekdayDisplay[date.getUTCDay()]
}

function strengthForDate(
  dateKey: string,
  pattern: ForecastRequestBody['weekdayPattern'],
): z.infer<typeof weekdayStrengthSchema> {
  const date = new Date(`${dateKey}T12:00:00Z`)
  const dayName = weekdayOrder[(date.getUTCDay() + 6) % 7]
  return pattern[dayName]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeDependencyTags(tags: string[]): Set<string> {
  return new Set(tags.map((tag) => tag.trim().toLowerCase()))
}

function parseBooleanSignal(value: string, regex: RegExp): boolean {
  return regex.test(value.toLowerCase())
}

function pickImpactBand(impactPercent: number): string {
  if (impactPercent <= -30) return 'Major downside'
  if (impactPercent <= -10) return 'Moderate downside'
  if (impactPercent < 10) return 'Neutral'
  if (impactPercent < 30) return 'Moderate upside'
  return 'Major upside'
}

function pickStatus(impactPercent: number): DayStatus {
  if (impactPercent <= -8) return 'weaker'
  if (impactPercent >= 8) return 'stronger'
  return 'normal'
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function toPercent(value: number): number {
  return Math.round(value * 1000) / 10
}

function scoreWeatherSummary(
  summary: string,
  highC: number | undefined,
  severeAlert: boolean,
): {
  impactPct: number
  reasons: string[]
  trigger: TriggerKind
} {
  const lower = summary.toLowerCase()

  if (severeAlert) {
    return {
      impactPct: -0.3,
      reasons: ['Severe weather alert issued for this area.'],
      trigger: 'severe_weather',
    }
  }

  if (parseBooleanSignal(lower, /snow|sleet|blizzard|ice/)) {
    return {
      impactPct: -0.24,
      reasons: ['Snow or ice conditions often reduce walk-in traffic.'],
      trigger: 'snow',
    }
  }

  if (parseBooleanSignal(lower, /thunder|storm|heavy rain/)) {
    return {
      impactPct: -0.16,
      reasons: ['Storm conditions can lower spontaneous visits.'],
      trigger: 'rain',
    }
  }

  if (parseBooleanSignal(lower, /rain|showers|drizzle/)) {
    return {
      impactPct: -0.1,
      reasons: ['Rain can reduce walk-ins during peak windows.'],
      trigger: 'rain',
    }
  }

  if (typeof highC === 'number' && highC >= 34) {
    return {
      impactPct: -0.08,
      reasons: ['Very hot temperatures may suppress foot traffic.'],
      trigger: 'heat',
    }
  }

  if (typeof highC === 'number' && highC <= 0) {
    return {
      impactPct: -0.1,
      reasons: ['Cold weather can shorten dwell time and reduce trips.'],
      trigger: 'cold',
    }
  }

  if (parseBooleanSignal(lower, /sunny|clear/)) {
    return {
      impactPct: 0.05,
      reasons: ['Clear weather may support stronger local traffic.'],
      trigger: 'neutral',
    }
  }

  return {
    impactPct: 0,
    reasons: [],
    trigger: 'neutral',
  }
}

function businessFlavor(businessType: string): {
  prepItem: string
  staffingPhrase: string
  customerChannel: string
} {
  const key = businessType.toLowerCase()

  if (key.includes('coffee')) {
    return {
      prepItem: 'pastry and milk prep',
      staffingPhrase: 'morning rush staffing',
      customerChannel: 'pickup pre-order',
    }
  }

  if (key.includes('bakery')) {
    return {
      prepItem: 'baked item batch sizes',
      staffingPhrase: 'opening shift coverage',
      customerChannel: 'pre-order pickup',
    }
  }

  if (key.includes('restaurant') || key.includes('quick')) {
    return {
      prepItem: 'fast-moving menu prep',
      staffingPhrase: 'peak service staffing',
      customerChannel: 'takeout and pickup',
    }
  }

  return {
    prepItem: 'high-turn inventory prep',
    staffingPhrase: 'peak-hour staffing',
    customerChannel: 'pickup promotion',
  }
}

function actionsForTrigger(
  trigger: TriggerKind,
  businessType: string,
  dependencyTags: Set<string>,
): string[] {
  const flavor = businessFlavor(businessType)
  const hasDelivery = dependencyTags.has('delivery / pickup')
  const hasWalkIns = dependencyTags.has('walk-ins / foot traffic')
  const hasStudents = dependencyTags.has('students / schools')
  const hasOffice = dependencyTags.has('office workers / commuters')
  const hasResidents = dependencyTags.has('local residents')

  switch (trigger) {
    case 'severe_weather': {
      const actions = [
        `Alert team leads now about severe weather — consider staffing down for safety.`,
        `Suspend ${flavor.prepItem} at normal levels — severe conditions will significantly reduce traffic.`,
      ]
      if (hasDelivery) {
        actions.push('Pause or limit delivery operations — safety risk for drivers. Post a notice.')
      } else if (hasWalkIns) {
        actions.push('Post a closure or reduced-hours notice on social and Google — customers will search.')
      }
      return actions
    }

    case 'snow': {
      const actions = [
        `Reduce ${flavor.prepItem} for the expected walk-in shortfall.`,
        `Notify your opening shift about likely staffing flexibility today.`,
      ]
      if (hasDelivery) {
        actions.push('Heavily promote delivery and pre-order — snow shifts demand from walk-in to delivery.')
        actions.push('Add a "free delivery / no minimum" incentive today to offset walk-in loss.')
      } else {
        actions.push(`Promote ${flavor.customerChannel} to capture demand digitally.`)
      }
      return actions
    }

    case 'rain': {
      const actions = [
        `Scale back ${flavor.prepItem} by roughly 10–15% for the rainy-day dip.`,
        `Loosen ${flavor.staffingPhrase} slightly for likely slower morning walk-in windows.`,
      ]
      if (hasDelivery) {
        actions.push('Feature a rainy-day delivery deal in your morning social post — rain boosts delivery demand.')
      } else if (hasWalkIns) {
        actions.push('Add a "rainy day" in-store discount to convert hesitant walk-ins.')
      }
      return actions
    }

    case 'heat': {
      return [
        hasDelivery
          ? 'Promote delivery during peak heat hours — customers avoid going out.'
          : `Tune ${flavor.prepItem} to avoid weather-related overproduction.`,
        'Feature your coldest or most refreshing menu items prominently today.',
        'Schedule a same-day "beat the heat" social post by 10 AM.',
      ]
    }

    case 'cold': {
      return [
        `Tune ${flavor.prepItem} to avoid cold-weather overproduction.`,
        'Feature your warmest, most comforting menu items today.',
        hasDelivery
          ? 'Highlight delivery — cold weather pushes customers toward ordering in.'
          : 'Rebalance staffing to your most resilient sales windows.',
      ]
    }

    case 'school_break': {
      const actions = [
        hasStudents
          ? 'Reduce after-school prep and staffing coverage — student traffic will drop.'
          : `Adjust ${flavor.prepItem} for a likely quieter student-linked period.`,
      ]
      if (hasResidents) {
        actions.push('Shift promotion messaging toward local residents and families for this period.')
      } else if (hasOffice) {
        actions.push('Focus your offers on office worker traffic — this segment is unaffected by school breaks.')
      } else {
        actions.push('Rebalance staffing toward your most reliable customer segments.')
      }
      actions.push('Avoid overstaffing the afterschool window until normal schedule resumes.')
      return actions
    }

    case 'holiday':
    case 'long_weekend': {
      const actions: string[] = []
      if (hasOffice) {
        actions.push('Expect below-normal commuter traffic — office worker revenue will be suppressed.')
        actions.push(`Offset with a holiday-specific ${flavor.customerChannel} campaign.`)
      } else {
        actions.push(`Increase ${flavor.prepItem} before expected peak periods.`)
        actions.push(`Plan extra ${flavor.staffingPhrase} during your top 3 selling hours.`)
      }
      if (hasResidents) {
        actions.push('Launch a limited-time holiday offer targeting local residents to capture leisure traffic.')
      } else {
        actions.push('Launch a limited-time holiday deal to capture intent early.')
      }
      return actions
    }

    case 'event': {
      return [
        'Add quick-serve or grab-and-go menu items for post-event traffic spikes.',
        hasDelivery
          ? 'Enable delivery and pickup for the post-event window — event crowds avoid parking.'
          : 'Prepare an event-night offer for nearby visitors.',
        'Evaluate extending hours or adding staff if the event ends near your close time.',
      ]
    }

    default: {
      return [
        'Keep staffing at your standard level for this day.',
        'Run a light same-day promotion to maintain demand.',
        'Review close-of-day outcomes to tune next week baseline.',
      ]
    }
  }
}

async function geocodeAddress(address: string): Promise<GeoResult> {
  type NominatimSearchResult = {
    lat: string
    lon: string
    display_name: string
    address?: {
      city?: string
      town?: string
      village?: string
      county?: string
      state?: string
      postcode?: string
      country_code?: string
      'ISO3166-2-lvl4'?: string
    }
  }

  const query = new URLSearchParams({
    q: address,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
  })

  const data = await fetchJson<NominatimSearchResult[]>(
    `https://nominatim.openstreetmap.org/search?${query.toString()}`,
  )

  if (!data.length) {
    throw new Error('Unable to geocode the provided address.')
  }

  const top = data[0]
  const city =
    top.address?.city ?? top.address?.town ?? top.address?.village ?? top.address?.county

  return {
    latitude: Number(top.lat),
    longitude: Number(top.lon),
    displayName: top.display_name,
    city,
    state: top.address?.state,
    postalCode: top.address?.postcode,
    countryCode: (top.address?.country_code ?? 'us').toUpperCase(),
    subdivisionCode: top.address?.['ISO3166-2-lvl4'],
  }
}

async function fetchNwsWeather(
  latitude: number,
  longitude: number,
): Promise<{ days: WeatherDay[]; alerts: string[] }> {
  type NwsPointsResponse = {
    properties: {
      forecast: string
      forecastHourly: string
    }
  }

  type NwsForecastResponse = {
    properties: {
      periods: Array<{
        startTime: string
        isDaytime: boolean
        temperature: number
        temperatureUnit: 'F' | 'C'
        shortForecast: string
      }>
    }
  }

  type NwsAlertsResponse = {
    features: Array<{
      properties: {
        event: string
        severity: string
      }
    }>
  }

  const points = await fetchJson<NwsPointsResponse>(
    `https://api.weather.gov/points/${latitude},${longitude}`,
  )

  const forecast = await fetchJson<NwsForecastResponse>(points.properties.forecast)
  const alerts = await fetchJson<NwsAlertsResponse>(
    `https://api.weather.gov/alerts/active?point=${latitude},${longitude}`,
  )

  const severeAlertText = alerts.features
    .filter((feature) => {
      const severity = feature.properties.severity.toLowerCase()
      return severity === 'severe' || severity === 'extreme'
    })
    .map((feature) => feature.properties.event)

  const map = new Map<string, WeatherDay>()

  for (const period of forecast.properties.periods) {
    const date = period.startTime.slice(0, 10)
    const base = map.get(date)

    const tempC =
      period.temperatureUnit === 'F'
        ? ((period.temperature - 32) * 5) / 9
        : period.temperature

    if (!base) {
      map.set(date, {
        date,
        summary: period.shortForecast,
        highC: period.isDaytime ? tempC : undefined,
        lowC: !period.isDaytime ? tempC : undefined,
        impactPct: 0,
        reasons: [],
      })
      continue
    }

    if (period.isDaytime) {
      base.highC = typeof base.highC === 'number' ? Math.max(base.highC, tempC) : tempC
      base.summary = period.shortForecast
    } else {
      base.lowC = typeof base.lowC === 'number' ? Math.min(base.lowC, tempC) : tempC
    }
  }

  const dateKeys = unique(forecast.properties.periods.map((p) => p.startTime.slice(0, 10))).slice(0, 7)
  const days: WeatherDay[] = dateKeys
    .map((date) => map.get(date))
    .filter((day): day is WeatherDay => Boolean(day))
    .map((day) => {
      const scored = scoreWeatherSummary(
        day.summary,
        day.highC,
        severeAlertText.length > 0,
      )

      return {
        ...day,
        impactPct: scored.impactPct,
        reasons: scored.reasons,
        severeAlert: severeAlertText.length > 0,
      }
    })

  return {
    days,
    alerts: severeAlertText,
  }
}

async function fetchOpenMeteoWeather(
  latitude: number,
  longitude: number,
): Promise<{ days: WeatherDay[]; alerts: string[] }> {
  type OpenMeteoResponse = {
    daily: {
      time: string[]
      weather_code: number[]
      temperature_2m_max: number[]
      temperature_2m_min: number[]
      precipitation_probability_max: number[]
    }
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '7',
  })

  const data = await fetchJson<OpenMeteoResponse>(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
  )

  const days: WeatherDay[] = data.daily.time.map((date, idx) => {
    const code = data.daily.weather_code[idx]
    const precip = data.daily.precipitation_probability_max[idx]
    const highC = data.daily.temperature_2m_max[idx]
    const lowC = data.daily.temperature_2m_min[idx]

    let summary = 'No major weather condition'
    if (code >= 71 && code <= 77) summary = 'Snow expected'
    else if (code >= 51 && code <= 67) summary = 'Rain expected'
    else if (code >= 95) summary = 'Thunderstorm risk'
    else if (precip >= 50) summary = 'High rain probability'
    else if (code === 0) summary = 'Clear sky'

    const scored = scoreWeatherSummary(summary, highC, false)

    return {
      date,
      summary,
      highC,
      lowC,
      impactPct: scored.impactPct,
      reasons: scored.reasons,
      severeAlert: false,
    }
  })

  return {
    days,
    alerts: [],
  }
}

async function fetchWeather(
  geo: GeoResult,
): Promise<{ data: WeatherDay[]; alerts: string[]; missing?: MissingSignal }> {
  const isUs = geo.countryCode === 'US'

  try {
    if (isUs) {
      const nws = await fetchNwsWeather(geo.latitude, geo.longitude)
      return {
        data: nws.days,
        alerts: nws.alerts,
      }
    }

    const meteo = await fetchOpenMeteoWeather(geo.latitude, geo.longitude)
    return {
      data: meteo.days,
      alerts: meteo.alerts,
    }
  } catch {
    return {
      data: [],
      alerts: [],
      missing: {
        signal: 'weather',
        message: 'Weather provider could not return a forecast for this address.',
      },
    }
  }
}

async function fetchHolidays(
  countryCode: string,
  dateKeys: string[],
  businessType = '',
): Promise<{ data: HolidayDay[]; missing?: MissingSignal }> {
  if (dateKeys.length === 0) {
    return { data: [] }
  }

  const first = dateKeys[0]
  const last = dateKeys[dateKeys.length - 1]
  const startYear = Number(first.slice(0, 4))
  const endYear = Number(last.slice(0, 4))
  const years = unique([startYear, endYear])

  type CalendarificHoliday = {
    name: string
    date: { iso: string }
    type: string[]
  }

  type NagerHoliday = {
    date: string
    localName: string
    counties?: string[]
    global: boolean
  }

  const enrichWithOpportunity = (days: HolidayDay[]): HolidayDay[] => {
    const result = days.map((day) => {
      const opp = getOpportunityForDate(day.date, businessType)
      if (!opp) return day
      return { ...day, isOpportunity: true, opportunityNote: opp.note, opportunityActions: opp.actions }
    })
    const existingDates = new Set(result.map((d) => d.date))
    for (const dk of dateKeys) {
      if (existingDates.has(dk)) continue
      const opp = getOpportunityForDate(dk, businessType)
      if (!opp) continue
      const dow = new Date(`${dk}T12:00:00Z`).getUTCDay()
      result.push({
        date: dk,
        name: opp.name,
        longWeekend: dow === 1 || dow === 5,
        isPublic: false,
        isOpportunity: true,
        opportunityNote: opp.note,
        opportunityActions: opp.actions,
      })
    }
    return result
  }

  const calKey = process.env.CALENDARIFIC_API_KEY
  if (calKey) {
    try {
      const all: CalendarificHoliday[] = []
      for (const year of years) {
        const params = new URLSearchParams({ api_key: calKey, country: countryCode, year: String(year) })
        const response = await fetchJson<{ response: { holidays: CalendarificHoliday[] } }>(
          `https://calendarific.com/api/v2/holidays?${params.toString()}`,
        )
        all.push(...(response.response.holidays ?? []))
      }
      const data: HolidayDay[] = all
        .filter((h) => { const iso = h.date.iso.slice(0, 10); return iso >= first && iso <= last })
        .map((h) => {
          const iso = h.date.iso.slice(0, 10)
          const dow = new Date(`${iso}T12:00:00Z`).getUTCDay()
          return {
            date: iso,
            name: h.name,
            longWeekend: dow === 1 || dow === 5,
            isPublic: h.type.some((t) => /national|public/i.test(t)),
            isOpportunity: false,
            opportunityNote: '',
            opportunityActions: [],
          }
        })
      return { data: enrichWithOpportunity(data) }
    } catch {
      // Fall through to Nager.Date
    }
  }

  try {
    const all: NagerHoliday[] = []

    for (const year of years) {
      const data = await fetchJson<NagerHoliday[]>(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      )
      all.push(...data)
    }

    const data: HolidayDay[] = all
      .filter((holiday) => holiday.date >= first && holiday.date <= last)
      .map((holiday) => {
        const dow = new Date(`${holiday.date}T12:00:00Z`).getUTCDay()
        return {
          date: holiday.date,
          name: holiday.localName,
          longWeekend: dow === 1 || dow === 5,
          isPublic: true,
          isOpportunity: false,
          opportunityNote: '',
          opportunityActions: [],
        }
      })

    return { data: enrichWithOpportunity(data) }
  } catch {
    return {
      data: [],
      missing: {
        signal: 'holidays',
        message: 'Holiday provider could not return trusted data for this region.',
      },
    }
  }
}

async function fetchNearbySchools(
  latitude: number,
  longitude: number,
): Promise<{ names: string[]; missing?: MissingSignal }> {
  const overpassQuery = `[out:json][timeout:25];(node["amenity"="school"](around:2500,${latitude},${longitude});way["amenity"="school"](around:2500,${latitude},${longitude});relation["amenity"="school"](around:2500,${latitude},${longitude}););out center 30;`

  type OverpassResponse = {
    elements: Array<{
      tags?: {
        name?: string
      }
    }>
  }

  try {
    const response = await fetchJson<OverpassResponse>(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      },
    )

    const names = unique(
      response.elements
        .map((element) => element.tags?.name)
        .filter((name): name is string => Boolean(name)),
    ).slice(0, 10)

    return { names }
  } catch {
    return {
      names: [],
      missing: {
        signal: 'schools',
        message: 'School proximity lookup failed for this location.',
      },
    }
  }
}

async function fetchSchoolHolidays(
  countryCode: string,
  subdivisionCode: string | undefined,
  dateKeys: string[],
): Promise<{ ranges: SchoolHolidayRange[]; missing?: MissingSignal }> {
  if (dateKeys.length === 0) {
    return { ranges: [] }
  }

  const validFrom = dateKeys[0]
  const validTo = dateKeys[dateKeys.length - 1]

  const query = new URLSearchParams({
    countryIsoCode: countryCode,
    validFrom,
    validTo,
  })

  if (subdivisionCode) {
    query.set('subdivisionCode', subdivisionCode)
  }

  type OpenHolidayName = {
    text: string
  }

  type OpenHolidayRange = {
    startDate: string
    endDate: string
    name: OpenHolidayName[]
  }

  try {
    const data = await fetchJson<OpenHolidayRange[]>(
      `https://openholidaysapi.org/SchoolHolidays?${query.toString()}`,
    )

    return {
      ranges: data.map((item) => ({
        startDate: item.startDate,
        endDate: item.endDate,
        name: item.name?.[0]?.text ?? 'School holiday',
      })),
    }
  } catch {
    return {
      ranges: [],
      missing: {
        signal: 'schools',
        message:
          'School closure feed unavailable. Nearby schools are shown, but closure effects are marked missing.',
      },
    }
  }
}

async function fetchEvents(
  latitude: number,
  longitude: number,
  dateKeys: string[],
): Promise<{ events: EventDay[]; missing?: MissingSignal }> {
  const apiKey = process.env.TICKETMASTER_API_KEY

  if (!apiKey) {
    return {
      events: [],
      missing: {
        signal: 'events',
        message:
          'Ticketmaster API key not configured. Event impact is optional and currently unavailable.',
      },
    }
  }

  if (dateKeys.length === 0) {
    return { events: [] }
  }

  const startDateTime = `${dateKeys[0]}T00:00:00Z`
  const endDateTime = `${dateKeys[dateKeys.length - 1]}T23:59:59Z`

  const params = new URLSearchParams({
    apikey: apiKey,
    latlong: `${latitude},${longitude}`,
    radius: '8',
    unit: 'miles',
    startDateTime,
    endDateTime,
    size: '100',
    sort: 'date,asc',
  })

  type TicketmasterEvent = {
    name: string
    dates?: {
      start?: {
        localDate?: string
      }
    }
  }

  type TicketmasterResponse = {
    _embedded?: {
      events?: TicketmasterEvent[]
    }
  }

  try {
    const data = await fetchJson<TicketmasterResponse>(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
    )

    const grouped = new Map<string, EventDay>()

    for (const event of data._embedded?.events ?? []) {
      const localDate = event.dates?.start?.localDate
      if (!localDate) continue

      const existing = grouped.get(localDate)
      if (!existing) {
        grouped.set(localDate, {
          date: localDate,
          count: 1,
          names: [event.name],
        })
      } else {
        existing.count += 1
        if (existing.names.length < 3) {
          existing.names.push(event.name)
        }
      }
    }

    return {
      events: [...grouped.values()],
    }
  } catch {
    return {
      events: [],
      missing: {
        signal: 'events',
        message: 'Event provider call failed. Event signal is marked unavailable.',
      },
    }
  }
}

function findSchoolHolidayForDate(
  ranges: SchoolHolidayRange[],
  date: string,
): SchoolHolidayRange | undefined {
  return ranges.find((range) => range.startDate <= date && range.endDate >= date)
}

function buildForecast(
  input: ForecastRequestBody,
  dateKeys: string[],
  weatherDays: WeatherDay[],
  holidayDays: HolidayDay[],
  schoolHolidayRanges: SchoolHolidayRange[],
  eventDays: EventDay[],
): ForecastDay[] {
  const dependencyTags = normalizeDependencyTags(input.dependencyTags)

  const weatherByDate = new Map(weatherDays.map((day) => [day.date, day]))
  const holidayByDate = new Map(holidayDays.map((day) => [day.date, day]))
  const eventsByDate = new Map(eventDays.map((day) => [day.date, day]))

  return dateKeys.map((date) => {
    const weekday = weekdayFromDateKey(date)
    const weekdayStrength = strengthForDate(date, input.weekdayPattern)
    const dayBaseline = input.averageDailyRevenue * weekdayMultiplier[weekdayStrength]

    let signalPct = 0
    let primaryTrigger: TriggerKind = 'neutral'
    let strongestMagnitude = 0
    const reasons: string[] = []
    const signals: SignalItem[] = []
    let opportunityActions: string[] = []

    const weather = weatherByDate.get(date)
    if (weather) {
      let weatherImpact = weather.impactPct

      if (dependencyTags.has('walk-ins / foot traffic') && weatherImpact < 0) {
        weatherImpact *= 1.15
      }
      if (dependencyTags.has('delivery / pickup') && weatherImpact < 0) {
        weatherImpact *= 0.9
      }

      signalPct += weatherImpact
      reasons.push(...weather.reasons)

      const magnitude = Math.abs(weatherImpact)
      if (magnitude > strongestMagnitude) {
        strongestMagnitude = magnitude

        const summary = weather.summary.toLowerCase()
        if (weather.severeAlert) primaryTrigger = 'severe_weather'
        else if (/snow|sleet|ice/.test(summary)) primaryTrigger = 'snow'
        else if (/rain|storm|thunder/.test(summary)) primaryTrigger = 'rain'
        else if (weatherImpact < 0 && weather.highC !== undefined && weather.highC >= 34) {
          primaryTrigger = 'heat'
        } else if (weatherImpact < 0 && weather.highC !== undefined && weather.highC <= 0) {
          primaryTrigger = 'cold'
        }
      }

      signals.push({
        type: 'weather',
        label: weather.summary,
        direction: weatherImpact < -0.02 ? 'down' : weatherImpact > 0.02 ? 'up' : 'none',
      })
    }

    const holiday = holidayByDate.get(date)
    if (holiday) {
      if (holiday.isOpportunity && !holiday.isPublic) {
        const opp = getOpportunityForDate(date, input.businessType)
        const boostPct = opp?.impactBoostPct ?? 0.1
        signalPct += boostPct
        reasons.push(holiday.opportunityNote || `${holiday.name} is a high-opportunity day for your business.`)
        opportunityActions = holiday.opportunityActions
        const magnitude = Math.abs(boostPct)
        if (magnitude > strongestMagnitude) {
          strongestMagnitude = magnitude
          primaryTrigger = 'holiday'
        }
        signals.push({ type: 'opportunity', label: holiday.name, direction: 'up' })
      } else {
        let holidayImpact = 0.14
        if (dependencyTags.has('office workers / commuters')) {
          holidayImpact -= 0.06
        }
        if (dependencyTags.has('local residents')) {
          holidayImpact += 0.03
        }
        if (holiday.longWeekend) {
          holidayImpact += 0.05
        }
        if (holiday.isOpportunity) {
          const opp = getOpportunityForDate(date, input.businessType)
          holidayImpact += opp?.impactBoostPct ?? 0.08
          opportunityActions = holiday.opportunityActions
        }

        signalPct += holidayImpact
        reasons.push(
          holiday.isOpportunity
            ? holiday.opportunityNote || `${holiday.name} is an opportunity day for your business.`
            : holiday.longWeekend
            ? `${holiday.name} creates a long-weekend traffic shift.`
            : `${holiday.name} can change local demand patterns.`,
        )

        const magnitude = Math.abs(holidayImpact)
        if (magnitude > strongestMagnitude) {
          strongestMagnitude = magnitude
          primaryTrigger = holiday.longWeekend ? 'long_weekend' : 'holiday'
        }
        signals.push({
          type: holiday.isOpportunity ? 'opportunity' : 'holiday',
          label: holiday.name,
          direction: holidayImpact > 0 ? 'up' : 'down',
        })
      }
    }

    if (dependencyTags.has('students / schools')) {
      const schoolHoliday = findSchoolHolidayForDate(schoolHolidayRanges, date)
      if (schoolHoliday) {
        const schoolImpact = -0.14
        signalPct += schoolImpact
        reasons.push(`${schoolHoliday.name} may lower student-linked demand.`)

        const magnitude = Math.abs(schoolImpact)
        if (magnitude > strongestMagnitude) {
          strongestMagnitude = magnitude
          primaryTrigger = 'school_break'
        }
        signals.push({ type: 'school', label: schoolHoliday.name, direction: 'down' })
      }
    }

    const eventDay = eventsByDate.get(date)
    if (eventDay && eventDay.count > 0) {
      const eventImpact = 0.08 + Math.min(eventDay.count, 3) * 0.04
      signalPct += eventImpact
      reasons.push(
        `${eventDay.count} nearby event${eventDay.count > 1 ? 's' : ''} may increase local traffic.`,
      )

      const magnitude = Math.abs(eventImpact)
      if (magnitude > strongestMagnitude) {
        strongestMagnitude = magnitude
        primaryTrigger = 'event'
      }
      signals.push({
        type: 'event',
        label: `${eventDay.count} nearby event${eventDay.count > 1 ? 's' : ''}`,
        direction: 'up',
      })
    }

    const safeSignalPct = clamp(signalPct, -0.5, 0.5)
    const predicted = dayBaseline * (1 + safeSignalPct)
    const impactPercent = toPercent(safeSignalPct)

    const finalActions =
      opportunityActions.length > 0
        ? opportunityActions
        : actionsForTrigger(primaryTrigger, input.businessType, dependencyTags)

    if (reasons.length === 0) {
      reasons.push('No major external signal detected beyond your normal weekday pattern.')
    }

    return {
      date,
      weekday,
      weatherSummary: weather?.summary ?? null,
      baselineRevenue: roundCurrency(dayBaseline),
      predictedRevenue: roundCurrency(predicted),
      impactPercent,
      impactBand: pickImpactBand(impactPercent),
      status: pickStatus(impactPercent),
      reasons,
      actions: finalActions,
      signals,
    }
  })
}

function toHeadline(day: ForecastDay): string {
  if (day.status === 'weaker') {
    return `${day.weekday} looks weaker than usual (${day.impactPercent}%).`
  }

  if (day.status === 'stronger') {
    return `${day.weekday} looks stronger than usual (+${day.impactPercent}%).`
  }

  return `${day.weekday} is tracking close to normal.`
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.post('/api/forecast', async (req: Request, res: Response) => {
  const parsed = forecastRequestSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid forecast request payload.',
      issues: parsed.error.issues,
    })
  }

  const input = parsed.data
  const missingSignals: MissingSignal[] = []

  try {
    const geo = await geocodeAddress(input.address)

    const weatherResult = await fetchWeather(geo)
    if (weatherResult.missing) {
      missingSignals.push(weatherResult.missing)
    }

    const today = todayKey()
    const weatherDateKeys = weatherResult.data.map((day) => day.date).filter((d) => d > today)
    const dateKeys = weatherDateKeys.length ? weatherDateKeys : todayDateKeys(7)

    const [holidaysResult, schoolNearbyResult, schoolHolidayResult, eventsResult] =
      await Promise.all([
        fetchHolidays(geo.countryCode, dateKeys, input.businessType),
        fetchNearbySchools(geo.latitude, geo.longitude),
        fetchSchoolHolidays(geo.countryCode, geo.subdivisionCode, dateKeys),
        fetchEvents(geo.latitude, geo.longitude, dateKeys),
      ])

    if (holidaysResult.missing) missingSignals.push(holidaysResult.missing)
    if (schoolNearbyResult.missing) missingSignals.push(schoolNearbyResult.missing)
    if (schoolHolidayResult.missing) missingSignals.push(schoolHolidayResult.missing)
    if (eventsResult.missing) missingSignals.push(eventsResult.missing)

    const forecast = buildForecast(
      input,
      dateKeys,
      weatherResult.data,
      holidaysResult.data,
      schoolHolidayResult.ranges,
      eventsResult.events,
    )

    const sortedByMagnitude = [...forecast].sort(
      (a, b) => Math.abs(b.impactPercent) - Math.abs(a.impactPercent),
    )
    const primaryAlert = sortedByMagnitude[0]

    const weeklyStory = [
      primaryAlert
        ? toHeadline(primaryAlert)
        : 'No major shifts detected for the next 7 days.',
      weatherResult.alerts.length
        ? `Weather alerts active: ${weatherResult.alerts.join(', ')}.`
        : null,
      schoolNearbyResult.names.length
        ? `${schoolNearbyResult.names.length} nearby school reference point${
            schoolNearbyResult.names.length > 1 ? 's' : ''
          } found.`
        : 'No nearby school references found in open geospatial data.',
    ]
      .filter(Boolean)
      .join(' ')

    return res.json({
      profile: {
        businessName: input.businessName?.trim() || null,
        businessType: input.businessType,
        normalizedAddress: geo.displayName,
        city: geo.city ?? null,
        state: geo.state ?? null,
        postalCode: geo.postalCode ?? null,
        countryCode: geo.countryCode,
      },
      summary: {
        headline: primaryAlert ? toHeadline(primaryAlert) : 'Baseline forecast generated.',
        story: weeklyStory,
        firstValueMessage:
          'Your dashboard is ready. Forecast uses real location signals and marks unavailable sources explicitly.',
      },
      primaryAlert: primaryAlert
        ? {
            date: primaryAlert.date,
            weekday: primaryAlert.weekday,
            status: primaryAlert.status,
            impactPercent: primaryAlert.impactPercent,
            impactBand: primaryAlert.impactBand,
            reasons: primaryAlert.reasons,
            actions: primaryAlert.actions,
          }
        : null,
      daily: forecast,
      alerts: [
        ...forecast
          .filter((day) => day.status !== 'normal')
          .slice(0, 5)
          .map((day) => ({
            date: day.date,
            title:
              day.status === 'weaker'
                ? `${day.weekday}: softer demand risk`
                : `${day.weekday}: stronger demand opportunity`,
            severity: day.impactBand,
            type: day.status === 'weaker' ? ('risk' as const) : ('opportunity' as const),
          })),
        ...holidaysResult.data
          .filter(
            (h) =>
              h.isOpportunity &&
              !forecast.some((f) => f.date === h.date && f.status !== 'normal'),
          )
          .map((h) => ({
            date: h.date,
            title: `${weekdayFromDateKey(h.date)}: ${h.name} — opportunity day`,
            severity: 'Opportunity',
            type: 'opportunity' as const,
          })),
      ],
      locationSignals: {
        nearbySchools: schoolNearbyResult.names,
      },
      missingSignals,
      sources: {
        weather: geo.countryCode === 'US' ? 'National Weather Service' : 'Open-Meteo',
        holidays: process.env.CALENDARIFIC_API_KEY ? 'Calendarific' : 'Nager.Date',
        schools: 'Overpass OpenStreetMap + OpenHolidays (if available)',
        events: process.env.TICKETMASTER_API_KEY ? 'Ticketmaster Discovery' : 'Unavailable',
        geocoding: 'Nominatim OpenStreetMap',
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to generate forecast due to an external service error.'

    return res.status(500).json({
      message,
    })
  }
})

app.listen(PORT, () => {
  console.log(`CashCast API running on http://localhost:${PORT}`)
})
