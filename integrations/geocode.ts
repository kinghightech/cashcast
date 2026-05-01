// Nominatim wrapper that returns just lat/lon for a free-form address (or zip).
// Identical provider to the existing server/index.ts geocoder, but exposes a
// minimal contract so the engine HTTP layer doesn't have to import everything.

const APP_USER_AGENT = 'KastlyMVP/1.0 (hackathon project)'

export type GeoPoint = {
  latitude: number
  longitude: number
  displayName: string
}

type NominatimSearchResult = {
  lat: string
  lon: string
  display_name: string
}

export async function geocode(query: string): Promise<GeoPoint> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
  })
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: { Accept: 'application/json', 'User-Agent': APP_USER_AGENT },
    },
  )
  if (!response.ok) {
    throw new Error(`Geocode failed ${response.status}`)
  }
  const data = (await response.json()) as NominatimSearchResult[]
  if (!data.length) {
    throw new Error(`Could not geocode "${query}".`)
  }
  const top = data[0]
  return {
    latitude: Number(top.lat),
    longitude: Number(top.lon),
    displayName: top.display_name,
  }
}
