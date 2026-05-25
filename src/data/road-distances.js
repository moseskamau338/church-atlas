// Road-distance resolver — swaps great-circle distances for actual road
// distances via the public OSRM service. Falls back to haversine on failure.
// Successful results are cached in localStorage keyed by rounded coord pair.

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

function pairKey(a, b) {
  const r = (v) => v.toFixed(5)
  return `road:${r(a.lat)},${r(a.lng)}::${r(b.lat)},${r(b.lng)}`
}

function readCache(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    if (!raw) return null
    const v = JSON.parse(raw)
    return typeof v === 'number' && isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

function writeCache(key, km) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(km))
  } catch {
    /* storage unavailable — skip */
  }
}

async function fetchOSRM(a, b, fetchImpl = globalThis.fetch) {
  const url = `${OSRM_BASE}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false&alternatives=false&steps=false`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`OSRM ${res.status}`)
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No route')
    const meters = data.routes[0].distance
    return Math.round((meters / 1000) * 10) / 10
  } finally {
    clearTimeout(t)
  }
}

export async function resolveRoadDistance(a, b, { fetchImpl } = {}) {
  const key = pairKey(a, b)
  const hit = readCache(key)
  if (hit) return hit
  try {
    const km = await fetchOSRM(a, b, fetchImpl)
    writeCache(key, km)
    return km
  } catch (e) {
    console.warn('[road-distance] failed:', e.message, '→ falling back to great-circle')
    return null
  }
}

// Test-only helpers.
export const __internal = { pairKey, readCache, writeCache }
