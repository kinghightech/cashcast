// Spec verification scenarios. Run with:
//   npx tsx server/engine/scenarios.ts
//
// Prints baseline, every multiplier with label, the raw stack product,
// the Monte Carlo mean, and the reasons array — so you can eyeball that
// the math matches the spec before shipping.

import { generateForecast, type ForecastInput } from './forecast'

type Scenario = {
  title: string
  expected: string
  input: ForecastInput
}

function fmtMoney(n: number): string {
  return `$${n.toFixed(2)}`
}

function fmtMult(n: number): string {
  const sign = n >= 1 ? '+' : ''
  const pct = ((n - 1) * 100).toFixed(1)
  return `${n.toFixed(3)} (${sign}${pct}%)`
}

const scenarios: Scenario[] = [
  {
    title: 'Coffee shop · Monday · light rain · no events · no school dep · no corrections',
    expected: 'baseline × 0.80 × 0.88 × 1.00 × 1.00 × 1.00 = 0.704 × baseline',
    input: {
      businessData: {
        baselineRevenue: 1000,
        businessType: 'coffee shop',
        location: '02101',
        schoolDependent: false,
      },
      weatherData: { condition: 'rain', tempF: 58, precipitationMm: 4 },
      eventsData: [],
      recentCorrections: [],
      forecastDate: new Date('2026-05-04T12:00:00'), // Monday
      randomSeed: 42,
    },
  },
  {
    title: 'Restaurant · Friday · sunny · major event 0.5mi · no school dep · +12% correction',
    expected: 'baseline × 1.20 × 1.10 × 1.40 × 1.00 × 1.12 = ~2.07 × baseline',
    input: {
      businessData: {
        baselineRevenue: 2000,
        businessType: 'restaurant',
        location: '02101',
        schoolDependent: false,
      },
      weatherData: { condition: 'clear', tempF: 72, precipitationMm: 0 },
      eventsData: [{ distanceMiles: 0.5, size: 'major', name: 'Concert' }],
      recentCorrections: [1.12],
      forecastDate: new Date('2026-05-08T12:00:00'), // Friday
      randomSeed: 42,
    },
  },
  {
    title: 'Retail · Sunday · snow · no events · school holiday · school dependent',
    expected: 'baseline × 1.10 × 0.60 × 1.00 × 0.70 × 1.00 = 0.462 × baseline',
    input: {
      businessData: {
        baselineRevenue: 1500,
        businessType: 'retail',
        location: '02101',
        schoolDependent: true,
      },
      weatherData: { condition: 'snow', tempF: 28, precipitationMm: 6 },
      eventsData: [],
      recentCorrections: [],
      forecastDate: new Date('2026-05-10T12:00:00'), // Sunday
      isSchoolHoliday: true,
      randomSeed: 42,
    },
  },
]

console.log('\n=== Kastly forecast engine — scenario verification ===\n')

for (const scenario of scenarios) {
  const result = generateForecast(scenario.input)
  const b = result.breakdown
  const stackProduct =
    b.weather * b.day * b.event * b.school * b.correction
  const expectedFromStack = b.baseline * stackProduct

  console.log(`▶ ${scenario.title}`)
  console.log(`  expected: ${scenario.expected}`)
  console.log(`  baseline:        ${fmtMoney(b.baseline)}`)
  console.log(`  weather mult:    ${fmtMult(b.weather)}  ← ${b.weatherLabel}`)
  console.log(`  day mult:        ${fmtMult(b.day)}  ← ${b.dayLabel}`)
  console.log(`  event mult:      ${fmtMult(b.event)}  ← ${b.eventLabel}`)
  console.log(`  school mult:     ${fmtMult(b.school)}  ← ${b.schoolLabel}`)
  console.log(`  correction mult: ${fmtMult(b.correction)}  ← ${b.correctionLabel}`)
  console.log(`  raw stack product: ${stackProduct.toFixed(4)}`)
  console.log(`  raw stack revenue: ${fmtMoney(expectedFromStack)}`)
  console.log(`  Monte Carlo mean:  ${fmtMoney(b.monteCarloMean)}  (1000 trials)`)
  console.log(`  reasons:`)
  if (result.reasons.length === 0) {
    console.log(`    (no signals deviated >5% from neutral)`)
  } else {
    for (const reason of result.reasons) {
      console.log(`    • ${reason}`)
    }
  }
  console.log('')
}

console.log('=== done ===\n')
