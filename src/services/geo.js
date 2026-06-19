// Pure geometry helpers for the Traverse tool. No network, no Mapbox — this is
// the "direct measurement" backend (great-circle distance + geodesic lines)
// and the projection math shared by the schematic view.

const R = 6371 // mean Earth radius, km
const toRad = (d) => (d * Math.PI) / 180
const toDeg = (r) => (r * 180) / Math.PI

// Great-circle (haversine) distance in km between two {lat, lng} points.
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Interpolate `steps` points along the great-circle arc from a to b. Returns
// [lng, lat] pairs (GeoJSON order) so it can drop straight into Mapbox sources.
// A straight screen line is a fine approximation over short hops, but the arc
// stays honest as the points spread out.
export function geodesicLine(a, b, steps = 64) {
  const φ1 = toRad(a.lat)
  const λ1 = toRad(a.lng)
  const φ2 = toRad(b.lat)
  const λ2 = toRad(b.lng)
  const Δ =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
      ),
    )
  if (Δ === 0) return [[a.lng, a.lat]]
  const out = []
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const A = Math.sin((1 - f) * Δ) / Math.sin(Δ)
    const B = Math.sin(f * Δ) / Math.sin(Δ)
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
    const z = A * Math.sin(φ1) + B * Math.sin(φ2)
    const φ = Math.atan2(z, Math.sqrt(x * x + y * y))
    const λ = Math.atan2(y, x)
    out.push([toDeg(λ), toDeg(φ)])
  }
  return out
}

// Bounding box over a list of {lat, lng}. Returns null for an empty list.
export function boundsOf(points) {
  if (!points.length) return null
  let minLat = Infinity
  let minLng = Infinity
  let maxLat = -Infinity
  let maxLng = -Infinity
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return { minLat, minLng, maxLat, maxLng }
}

// Build a reusable projector from a set of anchor points. Returns a function
// project(lng, lat) -> [x, y] in the unit square [0,1]², using an
// equirectangular projection scaled to the anchors' aspect (north = up). Both
// the schematic's nodes and the route geometry run through the same projector
// so a routed path lands exactly between its endpoints.
export function makeProjector(points) {
  const b = boundsOf(points)
  if (!b) return () => [0.5, 0.5]
  const midLatRad = toRad((b.minLat + b.maxLat) / 2)
  const lngScale = Math.cos(midLatRad) || 1
  const minX = b.minLng * lngScale
  const maxX = b.maxLng * lngScale
  const spanX = maxX - minX || 1
  const spanY = b.maxLat - b.minLat || 1
  const span = Math.max(spanX, spanY)
  const offX = (span - spanX) / 2
  const offY = (span - spanY) / 2
  return (lng, lat) => [
    (lng * lngScale - minX + offX) / span,
    1 - (lat - b.minLat + offY) / span, // flip: north up
  ]
}

// Project {lat, lng} points into a unit square [0,1]² for the schematic view.
// Uses an equirectangular projection scaled to the data's own aspect so the
// arrangement reads true even though the diagram is "not to scale". Latitude
// is flipped (north = up). Returns a map keyed by the caller-supplied id plus
// the {x, y} unit coordinates.
export function projectToUnitSquare(points) {
  const b = boundsOf(points)
  if (!b) return []
  // Correct longitude for latitude so east-west distances aren't exaggerated.
  const midLatRad = toRad((b.minLat + b.maxLat) / 2)
  const lngScale = Math.cos(midLatRad) || 1
  const xs = points.map((p) => p.lng * lngScale)
  const ys = points.map((p) => p.lat)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  // Preserve aspect ratio: fit the larger span to [0,1] and centre the other.
  const span = Math.max(spanX, spanY)
  const offX = (span - spanX) / 2
  const offY = (span - spanY) / 2
  return points.map((p, i) => ({
    ...p,
    x: (xs[i] - minX + offX) / span,
    y: 1 - (ys[i] - minY + offY) / span, // flip: north up
  }))
}

export const round1 = (n) => Math.round(n * 10) / 10
