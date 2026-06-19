// Smart query resolution for the Traverse search box. Before hitting Mapbox's
// geocoder (which has thinner POI coverage than Google in many regions), this
// handles two things Mapbox can't: raw coordinates pasted from anywhere, and
// Google Plus Codes (Open Location Code) — e.g. "QWH9+92 Nairobi".

import { OpenLocationCode } from 'open-location-code'
import { geocode } from './mapbox.js'

const olc = new OpenLocationCode()

// "lat, lng" or "lat lng" — Google copies coordinates as "lat, lng".
const COORD_RE = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/

// A Plus Code token: 2–8 chars from the OLC alphabet, a '+', then 2–7 more.
// (Short codes drop the leading chars and rely on a nearby reference.)
const PLUS_RE = /\b([23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,7})\b/i

export function parseCoordinates(query) {
  const m = query.match(COORD_RE)
  if (!m) return null
  const lat = parseFloat(m[1])
  const lng = parseFloat(m[2])
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

// Pull a Plus Code (and any trailing locality, e.g. "Nairobi") out of a query.
export function extractPlusCode(query) {
  const m = query.match(PLUS_RE)
  if (!m) return null
  const code = m[1].toUpperCase()
  if (!olc.isValid(code)) return null
  const locality = query.replace(m[0], '').replace(/[,]/g, ' ').trim()
  return { code, locality }
}

function resultFromArea(area, label, placeName) {
  return {
    id: `olc:${label}`,
    name: label,
    placeName: placeName || 'Plus Code',
    lat: area.latitudeCenter,
    lng: area.longitudeCenter,
  }
}

// Resolve a Plus Code to a place result, recovering short codes against a
// reference (the trailing locality, else the current map proximity).
async function resolvePlusCode(query, { proximity, signal } = {}) {
  const parsed = extractPlusCode(query)
  if (!parsed) return null
  const { code, locality } = parsed

  if (olc.isFull(code)) {
    return resultFromArea(olc.decode(code), code, locality || 'Plus Code')
  }

  // Short code — needs a reference point to recover the full code.
  let ref = proximity
  let refLabel = ''
  if (locality) {
    const matches = await geocode(locality, { proximity, limit: 1, signal })
    if (matches.length) {
      ref = { lat: matches[0].lat, lng: matches[0].lng }
      refLabel = matches[0].name
    }
  }
  if (!ref) return null // can't resolve a short code without a reference
  try {
    const full = olc.recoverNearest(code, ref.lat, ref.lng)
    const label = locality ? `${code} ${refLabel || locality}` : code
    return resultFromArea(olc.decode(full), label, 'Plus Code')
  } catch {
    return null
  }
}

// Main entry: returns an array of place results for the search dropdown.
// Coordinates and Plus Codes short-circuit to a single deterministic result;
// everything else goes to the Mapbox geocoder.
export async function searchPlaces(query, { proximity, signal } = {}) {
  const q = query.trim()
  if (!q) return []

  const coords = parseCoordinates(q)
  if (coords) {
    return [
      {
        id: 'coord',
        name: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
        placeName: 'Coordinates',
        ...coords,
      },
    ]
  }

  const plus = await resolvePlusCode(q, { proximity, signal })
  if (plus) return [plus]

  return geocode(q, { proximity, signal })
}
