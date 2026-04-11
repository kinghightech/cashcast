import type { BusinessTypeProfile } from '../context/AppContext'

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical'

export type LiveSignal = {
  id: string
  label: string
  value: string
  delta: number
  direction: 'up' | 'down'
  source: string
}

export type RevenueImpact = {
  projectedChangePercent: number
  riskLevel: RiskLevel
  confidence: number
  drivers: string[]
}

export type StabilitySnapshot = {
  score: number
  momentum: number
  volatility: number
}

export type AIInsight = {
  title: string
  summary: string
  recommendations: string[]
}

export type MarketContextData = {
  competitors: number
  marketShare: number
  competitiveIndex: number
  avgTicketNearby: number
}

export type ForecastPoint = {
  day: string
  dateLabel: string
  baseline: number
  forecast: number
  demandIndex: number
}

export type HeatmapCell = {
  row: number
  col: number
  zone: string
  demand: number
}

export type EventCard = {
  id: string
  title: string
  category: 'event' | 'weather' | 'sports' | 'holiday'
  severity: 'Low' | 'Medium' | 'High'
  eta: string
  impact: number
}

export type ScenarioStrategy = {
  id: string
  name: string
  shortLabel: string
  description: string
  cost: number
  liftPercent: number
  confidence: number
}

export type DemoDashboardData = {
  zipCode: string
  businessName: string
  generatedAt: string
  liveSignals: LiveSignal[]
  revenueImpact: RevenueImpact
  stability: StabilitySnapshot
  aiInsight: AIInsight
  marketContext: MarketContextData
  forecast: ForecastPoint[]
  heatmap: HeatmapCell[]
  events: EventCard[]
  scenarios: ScenarioStrategy[]
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const baseDrivers = [
  'Rain probability increasing after 4 PM',
  'Transit delays in core commuter routes',
  'University activity index above seasonal baseline',
  'Large event flow near downtown zone',
  'Household spend confidence softening week-over-week',
  'Competitor discount pressure within 1.2 miles',
]

const scenarioTemplates: Omit<ScenarioStrategy, 'cost' | 'liftPercent' | 'confidence'>[] = [
  {
    id: 'promotion',
    name: 'Limited-Time Promotion',
    shortLabel: 'Promotion',
    description: 'Introduce a time-boxed offer on high-margin items during low-demand windows.',
  },
  {
    id: 'delivery',
    name: 'Expand Delivery Radius',
    shortLabel: 'Delivery',
    description: 'Open one additional delivery zone and batch prep for peak request windows.',
  },
  {
    id: 'extended-hours',
    name: 'Extended Hours',
    shortLabel: 'Extended Hours',
    description: 'Stay open 60-90 minutes later for late commuter and event demand capture.',
  },
  {
    id: 'marketing',
    name: 'Hyperlocal Marketing Push',
    shortLabel: 'Marketing',
    description: 'Deploy 72-hour geo-targeted campaigns near high-density demand pockets.',
  },
  {
    id: 'staff',
    name: 'Dynamic Staffing Shift',
    shortLabel: 'Staffing',
    description: 'Move labor to forecasted spikes and trim low-efficiency intervals.',
  },
  {
    id: 'discount',
    name: 'Basket Builder Discount',
    shortLabel: 'Discount',
    description: 'Use paired-item discounting to increase average order value under soft demand.',
  },
]

const businessEventBias: Record<string, string[]> = {
  'coffee-shop': ['Morning commuter swell', 'Campus assignment week', 'Rainy-day hot drink uplift'],
  grocery: ['Storm pantry loading', 'Weekend family stock-up', 'Holiday prep traffic'],
  'gas-station': ['Commute congestion surge', 'Price volatility reaction', 'Weekend road trip traffic'],
  restaurant: ['Arena event dinner rush', 'Date-night reservation spike', 'Weekend brunch overflow'],
  retail: ['Mall footfall momentum', 'Payday apparel spike', 'Tourist shopping pulse'],
  pharmacy: ['Cold and allergy season', 'Clinic referral demand', 'Prescription refill cycle'],
  gym: ['Post-holiday fitness push', 'Weather indoor workout shift', 'Corporate challenge week'],
  'convenience-store': ['Late-night traffic lift', 'Transit stopover demand', 'Quick basket replenishment'],
  bar: ['Game-night watch crowd', 'Concert after-flow traffic', 'Weekend nightlife pulse'],
  salon: ['Pre-event grooming appointments', 'Payday beauty bookings', 'Wedding season demand'],
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function hashSeed(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state += 0x6d2b79f5
    let temp = Math.imul(state ^ (state >>> 15), 1 | state)
    temp ^= temp + Math.imul(temp ^ (temp >>> 7), 61 | temp)
    return ((temp ^ (temp >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]
}

function percentile(random: () => number, min: number, max: number): number {
  return min + (max - min) * random()
}

function buildLiveSignals(profile: BusinessTypeProfile, random: () => number): LiveSignal[] {
  const trafficShift = Math.round((profile.sensitivity.traffic - 50) * 0.4 + percentile(random, -8, 8))
  const weatherShift = Math.round((profile.sensitivity.weather - 50) * 0.3 + percentile(random, -6, 6))
  const sentimentShift = Math.round(percentile(random, -5, 7))
  const pricingShift = Math.round(percentile(random, -3, 5))
  const economicShift = Math.round((profile.sensitivity.economic - 50) * 0.2 + percentile(random, -4, 4))

  return [
    {
      id: 'foot-traffic',
      label: 'Foot Traffic Index',
      value: `${Math.round(percentile(random, 78, 132))}`,
      delta: trafficShift,
      direction: trafficShift >= 0 ? 'up' : 'down',
      source: 'Pedestrian mobility feed',
    },
    {
      id: 'dynamic-pricing',
      label: 'Competitor Pricing',
      value: `${Math.round(percentile(random, 94, 108))}%`,
      delta: pricingShift,
      direction: pricingShift >= 0 ? 'up' : 'down',
      source: 'Market basket scanner',
    },
    {
      id: 'local-sentiment',
      label: 'Local Sentiment',
      value: `${Math.round(percentile(random, 58, 87))}/100`,
      delta: sentimentShift,
      direction: sentimentShift >= 0 ? 'up' : 'down',
      source: 'Neighborhood social pulse',
    },
    {
      id: 'weather-pressure',
      label: 'Weather Pressure',
      value: `${Math.round(percentile(random, 23, 76))}%`,
      delta: weatherShift,
      direction: weatherShift >= 0 ? 'up' : 'down',
      source: 'Regional weather model',
    },
    {
      id: 'economic-momentum',
      label: 'Economic Momentum',
      value: `${Math.round(percentile(random, 45, 92))}/100`,
      delta: economicShift,
      direction: economicShift >= 0 ? 'up' : 'down',
      source: 'Hyperlocal economic feed',
    },
  ]
}

function buildRevenueImpact(profile: BusinessTypeProfile, random: () => number): RevenueImpact {
  const volatility =
    (profile.sensitivity.events + profile.sensitivity.weather + profile.sensitivity.traffic) / 3
  const projectedChangePercent = Math.round(percentile(random, -9, 16) + (volatility - 50) * 0.12)
  const confidence = Math.round(percentile(random, 72, 93))
  const riskRaw = 100 - confidence + Math.max(0, -projectedChangePercent * 2)

  let riskLevel: RiskLevel = 'Low'
  if (riskRaw > 60) riskLevel = 'Critical'
  else if (riskRaw > 45) riskLevel = 'High'
  else if (riskRaw > 30) riskLevel = 'Moderate'

  const shuffled = [...baseDrivers].sort(() => random() - 0.5)

  return {
    projectedChangePercent,
    riskLevel,
    confidence,
    drivers: shuffled.slice(0, 3),
  }
}

function buildStability(profile: BusinessTypeProfile, impact: RevenueImpact, random: () => number) {
  const sensitivityAvg =
    (profile.sensitivity.weather +
      profile.sensitivity.events +
      profile.sensitivity.traffic +
      profile.sensitivity.economic) /
    4
  const baseline = 76 - (sensitivityAvg - 50) * 0.2 - Math.abs(impact.projectedChangePercent) * 0.7

  return {
    score: clamp(Math.round(baseline + percentile(random, -4, 6)), 28, 94),
    momentum: clamp(Math.round(percentile(random, -18, 24)), -25, 30),
    volatility: clamp(Math.round(percentile(random, 18, 67) + (sensitivityAvg - 50) * 0.2), 10, 85),
  }
}

function buildAIInsight(
  profile: BusinessTypeProfile,
  zipCode: string,
  impact: RevenueImpact,
  random: () => number,
): AIInsight {
  const localBias = pick(businessEventBias[profile.id] ?? businessEventBias['coffee-shop'], random)
  const movement = impact.projectedChangePercent >= 0 ? 'upside pocket' : 'compression window'

  return {
    title: `${profile.name} opportunity scan for ${zipCode}`,
    summary: `Model confidence is ${impact.confidence}% with a projected ${movement} of ${Math.abs(impact.projectedChangePercent)}%. Primary trigger: ${localBias.toLowerCase()}.`,
    recommendations: [
      'Front-load prep and staffing 90 minutes before the modeled spike window.',
      'Shift marketing spend toward zones with strongest demand heat and low competitor density.',
      'Use bundle pricing to protect margin if real-time sentiment slips below baseline.',
    ],
  }
}

function buildMarketContext(profile: BusinessTypeProfile, random: () => number): MarketContextData {
  const competitionPressure = (profile.sensitivity.economic + profile.sensitivity.traffic) / 2

  return {
    competitors: Math.round(percentile(random, 6, 24)),
    marketShare: clamp(Math.round(percentile(random, 7, 29)), 4, 34),
    competitiveIndex: clamp(Math.round(percentile(random, 48, 87) + (competitionPressure - 50) * 0.25), 30, 96),
    avgTicketNearby: Math.round(percentile(random, 12, 48) * 100) / 100,
  }
}

function buildForecast(profile: BusinessTypeProfile, random: () => number): ForecastPoint[] {
  const baseRevenue = Math.round(percentile(random, 1800, 4100))
  const eventWeight = profile.sensitivity.events / 100
  const weatherWeight = profile.sensitivity.weather / 100

  return DAY_LABELS.map((day, index) => {
    const date = new Date()
    date.setDate(date.getDate() + index)

    const weekendBoost = index >= 4 ? percentile(random, 0.02, 0.18) : percentile(random, -0.08, 0.06)
    const noise = percentile(random, -0.12, 0.16)
    const demandLift = weekendBoost + noise + eventWeight * 0.07 - weatherWeight * 0.04

    const baseline = Math.round(baseRevenue * (1 + index * 0.01))
    const forecast = Math.round(baseline * (1 + demandLift))

    return {
      day,
      dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      baseline,
      forecast,
      demandIndex: clamp(Math.round(100 + demandLift * 100), 68, 148),
    }
  })
}

function buildHeatmap(random: () => number): HeatmapCell[] {
  const rows = 6
  const cols = 8
  const data: HeatmapCell[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const hotspotDistance = Math.abs(row - 2.5) + Math.abs(col - 5)
      const gradient = 98 - hotspotDistance * 10
      const noise = percentile(random, -18, 14)

      data.push({
        row,
        col,
        zone: `Z-${row + 1}${col + 1}`,
        demand: clamp(Math.round(gradient + noise), 18, 99),
      })
    }
  }

  return data
}

function buildEventCards(profile: BusinessTypeProfile, random: () => number): EventCard[] {
  const biasEvents = businessEventBias[profile.id] ?? businessEventBias['coffee-shop']
  const categories: EventCard['category'][] = ['event', 'weather', 'sports', 'holiday']

  return Array.from({ length: 4 }).map((_, index) => {
    const impact = Math.round(percentile(random, -7, 18))
    const severity: EventCard['severity'] = impact > 10 ? 'High' : impact > 4 ? 'Medium' : 'Low'

    return {
      id: `event-${index}`,
      title: `${pick(biasEvents, random)} ${index + 1}`,
      category: categories[index % categories.length],
      severity,
      eta: `${Math.round(percentile(random, 3, 48))}h`,
      impact,
    }
  })
}

function buildScenarios(profile: BusinessTypeProfile, random: () => number): ScenarioStrategy[] {
  const eventFactor = profile.sensitivity.events / 100
  const trafficFactor = profile.sensitivity.traffic / 100

  return scenarioTemplates.map((template, index) => {
    const baseLift = percentile(random, 2.1, 11.8)
    const strategyTilt = index % 2 === 0 ? eventFactor : trafficFactor

    return {
      ...template,
      cost: Math.round(percentile(random, 250, 2400)),
      liftPercent: Math.round((baseLift + strategyTilt * 3.8) * 10) / 10,
      confidence: Math.round(percentile(random, 61, 92)),
    }
  })
}

export function calculateScenarioOutcome(
  strategy: ScenarioStrategy,
  revenueImpact: RevenueImpact,
  market: MarketContextData,
): { projectedRevenueChange: number; payoffScore: number } {
  const base = strategy.liftPercent + revenueImpact.projectedChangePercent * 0.45
  const marketDrag = (market.competitiveIndex - 60) * 0.08
  const projectedRevenueChange = Math.round((base - marketDrag) * 10) / 10

  const costPenalty = Math.min(strategy.cost / 2500, 1)
  const confidenceBoost = strategy.confidence / 100
  const payoffScore = clamp(
    Math.round((projectedRevenueChange * confidenceBoost - costPenalty * 4) * 10 + 65),
    12,
    98,
  )

  return { projectedRevenueChange, payoffScore }
}

export function buildDemoDashboardData(
  zipCode: string,
  profile: BusinessTypeProfile,
): DemoDashboardData {
  const random = mulberry32(hashSeed(`${zipCode}:${profile.id}`))
  const liveSignals = buildLiveSignals(profile, random)
  const revenueImpact = buildRevenueImpact(profile, random)
  const stability = buildStability(profile, revenueImpact, random)
  const marketContext = buildMarketContext(profile, random)

  return {
    zipCode,
    businessName: profile.name,
    generatedAt: new Date().toISOString(),
    liveSignals,
    revenueImpact,
    stability,
    aiInsight: buildAIInsight(profile, zipCode, revenueImpact, random),
    marketContext,
    forecast: buildForecast(profile, random),
    heatmap: buildHeatmap(random),
    events: buildEventCards(profile, random),
    scenarios: buildScenarios(profile, random),
  }
}
