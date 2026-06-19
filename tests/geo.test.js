import { describe, expect, it } from 'vitest'
import { haversineKm, geodesicLine, boundsOf, makeProjector } from '../src/services/geo.js'

const gathera = { lat: -0.7837603, lng: 37.0441453 }
const muthithi = { lat: -0.8413387, lng: 37.0912994 }

describe('haversineKm', () => {
  it('is zero for identical points', () => {
    expect(haversineKm(gathera, gathera)).toBe(0)
  })

  it('is symmetric', () => {
    expect(haversineKm(gathera, muthithi)).toBeCloseTo(haversineKm(muthithi, gathera), 9)
  })

  it('matches a known great-circle distance (~8.4 km)', () => {
    expect(haversineKm(gathera, muthithi)).toBeGreaterThan(8)
    expect(haversineKm(gathera, muthithi)).toBeLessThan(9)
  })
})

describe('geodesicLine', () => {
  it('starts and ends at the endpoints in [lng, lat] order', () => {
    const line = geodesicLine(gathera, muthithi, 8)
    expect(line).toHaveLength(9)
    expect(line[0][0]).toBeCloseTo(gathera.lng, 5)
    expect(line[0][1]).toBeCloseTo(gathera.lat, 5)
    expect(line[8][0]).toBeCloseTo(muthithi.lng, 5)
    expect(line[8][1]).toBeCloseTo(muthithi.lat, 5)
  })

  it('collapses to a single point for identical endpoints', () => {
    expect(geodesicLine(gathera, gathera)).toEqual([[gathera.lng, gathera.lat]])
  })
})

describe('boundsOf', () => {
  it('returns null for an empty list', () => {
    expect(boundsOf([])).toBeNull()
  })

  it('spans the extremes', () => {
    const b = boundsOf([gathera, muthithi])
    expect(b.minLat).toBe(muthithi.lat)
    expect(b.maxLat).toBe(gathera.lat)
    expect(b.minLng).toBe(gathera.lng)
    expect(b.maxLng).toBe(muthithi.lng)
  })
})

describe('makeProjector', () => {
  it('maps anchor points inside the unit square', () => {
    const project = makeProjector([gathera, muthithi])
    for (const p of [gathera, muthithi]) {
      const [x, y] = project(p.lng, p.lat)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(1)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(1)
    }
  })

  it('puts north (higher latitude) above south (lower y)', () => {
    const project = makeProjector([gathera, muthithi])
    const [, yNorth] = project(gathera.lng, gathera.lat) // gathera is further north
    const [, ySouth] = project(muthithi.lng, muthithi.lat)
    expect(yNorth).toBeLessThan(ySouth)
  })
})
