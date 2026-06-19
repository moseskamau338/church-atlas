// Mapbox API wrappers for the Traverse tool: geocoding (search box),
// Directions (real route geometry + distance/time per mode) and the Matrix API
// (full pairwise grid in one request). The token is read from
// `VITE_MAPBOX_TOKEN`; with no token, callers fall back to direct/great-circle
// measurement and the search box is disabled.

// Read lazily (not a captured const) so tests can stub the env and so the
// value tracks `import.meta.env`, which Vite statically inlines at build time.
export function getMapboxToken() {
  return import.meta.env.VITE_MAPBOX_TOKEN || ''
}

export function hasMapboxToken() {
  return Boolean(getMapboxToken())
}

// Maps our UI travel modes to Mapbox routing profiles. `direct` is handled
// locally in geo.js and never reaches the network.
export const MODE_PROFILES = {
  driving: 'driving',
  walking: 'walking',
  cycling: 'cycling',
}

// Search Box is Mapbox's newer search stack — notably better POI coverage than
// the legacy `mapbox.places` geocoder, which matters for small businesses and
// churches. The `/forward` and `/reverse` endpoints are single-call and don't
// need a session token.
const SEARCHBOX_BASE = 'https://api.mapbox.com/search/searchbox/v1'
const DIRECTIONS_BASE = 'https://api.mapbox.com/directions/v5/mapbox'
const MATRIX_BASE = 'https://api.mapbox.com/directions-matrix/v1/mapbox'

// Mapbox Matrix caps at 25 coordinates per request.
export const MATRIX_MAX_POINTS = 25

async function getJSON(url, signal) {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Mapbox ${res.status}: ${body.slice(0, 160)}`)
  }
  return res.json()
}

// Normalise a Search Box GeoJSON feature into our lightweight place object.
function fromSearchBoxFeature(f) {
  const p = f.properties || {}
  return {
    id: p.mapbox_id || f.id || `${f.geometry?.coordinates?.join(',')}`,
    name: p.name || p.name_preferred || 'Unnamed place',
    placeName: p.full_address || p.place_formatted || p.name || '',
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }
}

// Forward-geocode a free-text query. `proximity` ({lat,lng}) biases results
// toward the current map centre. Returns lightweight place objects.
export async function geocode(query, { proximity, limit = 6, signal } = {}) {
  if (!hasMapboxToken() || !query.trim()) return []
  const params = new URLSearchParams({
    q: query,
    access_token: getMapboxToken(),
    limit: String(limit),
    language: 'en',
  })
  if (proximity) params.set('proximity', `${proximity.lng},${proximity.lat}`)
  const url = `${SEARCHBOX_BASE}/forward?${params}`
  const data = await getJSON(url, signal)
  return (data.features || []).map(fromSearchBoxFeature)
}

// Reverse-geocode a dropped pin into a human-readable name.
export async function reverseGeocode(lat, lng, { signal } = {}) {
  if (!hasMapboxToken()) return null
  const params = new URLSearchParams({
    longitude: String(lng),
    latitude: String(lat),
    access_token: getMapboxToken(),
    limit: '1',
    language: 'en',
  })
  const url = `${SEARCHBOX_BASE}/reverse?${params}`
  const data = await getJSON(url, signal)
  const f = data.features?.[0]
  return f ? fromSearchBoxFeature(f) : null
}

// Best route between an ordered list of points for one profile. Returns the
// total distance (km), duration (min) and the GeoJSON LineString coordinates
// of the actual path. Throws if no token / no route.
export async function getRoute(profile, points, { signal } = {}) {
  if (!hasMapboxToken()) throw new Error('No Mapbox token')
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
  const params = new URLSearchParams({
    access_token: getMapboxToken(),
    geometries: 'geojson',
    overview: 'full',
    alternatives: 'false',
  })
  const url = `${DIRECTIONS_BASE}/${profile}/${coords}?${params}`
  const data = await getJSON(url, signal)
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`No route (${data.code || 'unknown'})`)
  }
  const route = data.routes[0]
  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    coordinates: route.geometry.coordinates, // [[lng,lat], ...]
  }
}

// Full pairwise distance/duration matrix for a profile. distances are in km,
// durations in minutes; cell [i][j] is the cost from point i to point j.
// Returns null entries where Mapbox could not route a pair.
export async function getMatrix(profile, points, { signal } = {}) {
  if (!hasMapboxToken()) throw new Error('No Mapbox token')
  if (points.length > MATRIX_MAX_POINTS) {
    throw new Error(`Matrix supports up to ${MATRIX_MAX_POINTS} points`)
  }
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';')
  const params = new URLSearchParams({
    access_token: getMapboxToken(),
    annotations: 'distance,duration',
  })
  const url = `${MATRIX_BASE}/${profile}/${coords}?${params}`
  const data = await getJSON(url, signal)
  if (data.code !== 'Ok') throw new Error(`Matrix failed (${data.code})`)
  const km = (m) => (m == null ? null : m / 1000)
  const min = (s) => (s == null ? null : s / 60)
  return {
    distances: (data.distances || []).map((row) => row.map(km)),
    durations: (data.durations || []).map((row) => row.map(min)),
  }
}
