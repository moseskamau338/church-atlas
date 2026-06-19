// Serialises a Traverse session into a compact, URL-safe string for shareable
// links (no backend — the whole session rides in `#/traverse?s=...`). The
// payload is minified JSON: mode, connection settings, origin index, and each
// point as [lat, lng, name]. Coordinates are rounded to ~0.1 m precision.

const r6 = (n) => Math.round(n * 1e6) / 1e6

// UTF-8-safe base64url (handles non-ASCII place names).
function toBase64Url(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
  return decodeURIComponent(escape(atob(b64 + pad)))
}

export function encodeSession(state) {
  const payload = {
    v: 1,
    m: state.mode,
    c: state.connectionMode,
    d: state.showDurations ? 1 : 0,
    o: state.locations.findIndex((l) => l.id === state.originId),
    p: state.locations.map((l) => [r6(l.lat), r6(l.lng), l.name]),
  }
  return toBase64Url(JSON.stringify(payload))
}

const MODES = new Set(['direct', 'driving', 'walking', 'cycling'])
const CONNECTIONS = new Set(['all', 'origin', 'none'])

// Returns a normalised snapshot, or null if the string is missing/corrupt.
export function decodeSession(s) {
  if (!s || typeof s !== 'string') return null
  try {
    const o = JSON.parse(fromBase64Url(s))
    if (!o || !Array.isArray(o.p)) return null
    const locations = o.p
      .map((row) => ({ lat: Number(row[0]), lng: Number(row[1]), name: String(row[2] ?? '') }))
      .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
    return {
      mode: MODES.has(o.m) ? o.m : 'direct',
      connectionMode: CONNECTIONS.has(o.c) ? o.c : 'all',
      showDurations: o.d !== 0,
      originIndex: Number.isInteger(o.o) ? o.o : 0,
      locations,
    }
  } catch {
    return null
  }
}
