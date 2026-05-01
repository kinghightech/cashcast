// Open-Meteo wrapper that returns engine-shaped WeatherInput rows.
// One module covers both the forecast API (future dates) and the archive API
// (past dates) since they return the same daily envelope.

import type { WeatherInput } from '../engine/forecast'

type OpenMeteoDailyResponse = {
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    precipitation_sum: number[]
  }
}

const APP_USER_AGENT = 'KastlyMVP/1.0 (hackathon project)'

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': APP_USER_AGENT },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Open-Meteo request failed ${response.status}: ${body.slice(0, 160)}`)
  }
  return (await response.json()) as T
}

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32
}

// Map WMO weather codes to engine-known condition strings.
function codeToCondition(code: number): string {
  if (code === 0) return 'clear'
  if (code === 1 || code === 2) return 'sunny'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 55) return 'rain'
  if (code >= 61 && code <= 65) return 'rain'
  if (code >= 80 && code <= 82) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunderstorm'
  return 'unknown'
}

function envelopeToWeather(
  data: OpenMeteoDailyResponse,
  isoDate: string,
): WeatherInput | null {
  const idx = data.daily.time.indexOf(isoDate)
  if (idx === -1) return null
  const code = data.daily.weather_code[idx]
  const tempC = data.daily.temperature_2m_max[idx]
  const precip = data.daily.precipitation_sum[idx]
  return {
    condition: codeToCondition(code),
    tempF: celsiusToFahrenheit(tempC),
    precipitationMm: precip ?? 0,
  }
}

export async function fetchForwardWeather(
  latitude: number,
  longitude: number,
  isoDate: string,
): Promise<WeatherInput | null> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: 'weather_code,temperature_2m_max,precipitation_sum',
    timezone: 'auto',
    start_date: isoDate,
    end_date: isoDate,
  })
  const data = await fetchJson<OpenMeteoDailyResponse>(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
  )
  return envelopeToWeather(data, isoDate)
}

export async function fetchHistoricalWeather(
  latitude: number,
  longitude: number,
  isoDate: string,
): Promise<WeatherInput | null> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: isoDate,
    end_date: isoDate,
    daily: 'weather_code,temperature_2m_max,precipitation_sum',
    timezone: 'auto',
  })
  const data = await fetchJson<OpenMeteoDailyResponse>(
    `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`,
  )
  return envelopeToWeather(data, isoDate)
}
