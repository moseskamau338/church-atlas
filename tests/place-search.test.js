import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseCoordinates, extractPlusCode, searchPlaces } from '../src/services/place-search.js'

// Force the no-token path so coordinate/Plus-Code resolution is exercised
// purely locally and the text fallback to Mapbox makes no network call.
beforeEach(() => vi.stubEnv('VITE_MAPBOX_TOKEN', ''))
afterEach(() => vi.unstubAllEnvs())

describe('parseCoordinates', () => {
  it('parses "lat, lng" (Google copy format)', () => {
    expect(parseCoordinates('-1.286389, 36.817223')).toEqual({
      lat: -1.286389,
      lng: 36.817223,
    })
  })

  it('parses space-separated coordinates', () => {
    expect(parseCoordinates('-0.78 37.04')).toEqual({ lat: -0.78, lng: 37.04 })
  })

  it('rejects out-of-range and non-coordinate input', () => {
    expect(parseCoordinates('120, 200')).toBeNull()
    expect(parseCoordinates('Kenhut SDA')).toBeNull()
  })
})

describe('extractPlusCode', () => {
  it('extracts a short code and its locality', () => {
    expect(extractPlusCode('QWH9+92 Nairobi')).toEqual({
      code: 'QWH9+92',
      locality: 'Nairobi',
    })
  })

  it('recognises a full code', () => {
    const r = extractPlusCode('6GCRQWH9+92')
    expect(r.code).toBe('6GCRQWH9+92')
  })

  it('returns null for plain text', () => {
    expect(extractPlusCode('Kenhut SDA')).toBeNull()
  })
})

describe('searchPlaces', () => {
  it('returns a single coordinate result for pasted coordinates', async () => {
    const out = await searchPlaces('-1.2864, 36.8172')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ lat: -1.2864, lng: 36.8172, placeName: 'Coordinates' })
  })

  it('resolves a full Plus Code without any network call', async () => {
    const out = await searchPlaces('6GCRQWH9+92')
    expect(out).toHaveLength(1)
    expect(out[0].lat).toBeCloseTo(-1.2216, 2)
    expect(out[0].lng).toBeCloseTo(36.9176, 2)
  })

  it('recovers a short Plus Code against the map proximity (no token needed)', async () => {
    const out = await searchPlaces('QWH9+92', {
      proximity: { lat: -1.286389, lng: 36.817223 },
    })
    expect(out).toHaveLength(1)
    expect(out[0].lat).toBeCloseTo(-1.2216, 2)
    expect(out[0].lng).toBeCloseTo(36.9176, 2)
  })

  it('returns an empty list for plain text with no token (graceful)', async () => {
    await expect(searchPlaces('Kenhut SDA')).resolves.toEqual([])
  })
})
