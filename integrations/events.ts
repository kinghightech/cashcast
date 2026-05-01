// Ticketmaster wrapper that returns engine-shaped EventInput[] for a single
// date and origin point. "size" is approximated from venue capacity if
// available, else falls back to event classification heuristics.

import type { EventInput } from '../engine/forecast'

const APP_USER_AGENT = 'KastlyMVP/1.0 (hackathon project)'

type TicketmasterVenue = {
  location?: { latitude?: string; longitude?: string }
  distance?: number
  generalInfo?: { generalRule?: string }
  capacity?: number
}

type TicketmasterEvent = {
  name: string
  classifications?: Array<{
    segment?: { name?: string }
    genre?: { name?: string }
  }>
  _embedded?: {
    venues?: TicketmasterVenue[]
  }
  dates?: {
    start?: { localDate?: string }
  }
}

type TicketmasterResponse = {
  _embedded?: { events?: TicketmasterEvent[] }
}

function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 3958.8
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

// Major-vs-minor heuristic: any sports/concert in segment classification
// counts as "major"; everything else is "minor".
function classifySize(event: TicketmasterEvent): 'major' | 'minor' {
  const segment = event.classifications?.[0]?.segment?.name?.toLowerCase() ?? ''
  if (/sports|music|arts/.test(segment)) return 'major'
  return 'minor'
}

export async function fetchNearbyEvents(
  latitude: number,
  longitude: number,
  isoDate: string,
): Promise<EventInput[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY
  if (!apiKey) return [] // engine treats no-events as multiplier 1.00 — safe default

  const params = new URLSearchParams({
    apikey: apiKey,
    latlong: `${latitude},${longitude}`,
    radius: '5',
    unit: 'miles',
    startDateTime: `${isoDate}T00:00:00Z`,
    endDateTime: `${isoDate}T23:59:59Z`,
    size: '50',
  })

  let data: TicketmasterResponse
  try {
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`,
      { headers: { Accept: 'application/json', 'User-Agent': APP_USER_AGENT } },
    )
    if (!response.ok) return []
    data = (await response.json()) as TicketmasterResponse
  } catch {
    return []
  }

  const events: EventInput[] = []
  for (const event of data._embedded?.events ?? []) {
    const venue = event._embedded?.venues?.[0]
    let distanceMiles: number | undefined
    if (typeof venue?.distance === 'number') {
      distanceMiles = venue.distance
    } else if (
      venue?.location?.latitude !== undefined &&
      venue?.location?.longitude !== undefined
    ) {
      distanceMiles = haversineMiles(
        latitude,
        longitude,
        Number(venue.location.latitude),
        Number(venue.location.longitude),
      )
    }
    if (distanceMiles === undefined) continue
    events.push({
      name: event.name,
      distanceMiles,
      size: classifySize(event),
    })
  }

  // Sort closest first so engine sees the strongest candidates per tier.
  events.sort((a, b) => a.distanceMiles - b.distanceMiles)
  return events
}
