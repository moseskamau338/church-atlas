import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  hasMapboxToken,
  geocode,
  reverseGeocode,
  getRoute,
  getMatrix,
  MODE_PROFILES,
  MATRIX_MAX_POINTS,
} from '../src/services/mapbox.js'

const pts = [
  { lat: -1.29, lng: 36.82 },
  { lat: -0.78, lng: 37.04 },
]

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

// The token is read lazily from import.meta.env, so stubbing it forces the
// no-token path deterministically regardless of any local .env.local.
describe('without a token', () => {
  beforeEach(() => vi.stubEnv('VITE_MAPBOX_TOKEN', ''))

  it('reports no token', () => {
    expect(hasMapboxToken()).toBe(false)
  })

  it('geocode resolves to an empty list without calling the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(geocode('Nairobi')).resolves.toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('reverseGeocode resolves to null', async () => {
    await expect(reverseGeocode(-1.29, 36.82)).resolves.toBeNull()
  })

  it('getRoute and getMatrix reject so callers fall back to direct', async () => {
    await expect(getRoute('driving', pts)).rejects.toThrow(/token/i)
    await expect(getMatrix('driving', pts)).rejects.toThrow(/token/i)
  })
})

describe('with a token (network mocked)', () => {
  beforeEach(() => vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test'))

  it('geocode hits the Search Box forward endpoint and normalises features', async () => {
    const json = {
      features: [
        {
          properties: { mapbox_id: 'abc', name: 'Kenhut', full_address: 'Kenhut, Kenya' },
          geometry: { coordinates: [37.04, -0.78] },
        },
      ],
    }
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => json })
    const out = await geocode('Kenhut', { proximity: { lat: -1, lng: 37 } })
    const url = fetchSpy.mock.calls[0][0]
    expect(url).toContain('/search/searchbox/v1/forward')
    expect(url).toContain('q=Kenhut')
    expect(url).toContain('proximity=37%2C-1')
    expect(out).toEqual([
      { id: 'abc', name: 'Kenhut', placeName: 'Kenhut, Kenya', lng: 37.04, lat: -0.78 },
    ])
  })

  it('getRoute returns distance, duration and geometry', async () => {
    const json = {
      code: 'Ok',
      routes: [
        {
          distance: 12345,
          duration: 600,
          geometry: {
            coordinates: [
              [37, -0.7],
              [37.1, -0.8],
            ],
          },
        },
      ],
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => json })
    const r = await getRoute('walking', pts)
    expect(r.distanceKm).toBeCloseTo(12.345, 3)
    expect(r.durationMin).toBeCloseTo(10, 3)
    expect(r.coordinates).toHaveLength(2)
  })
})

describe('constants', () => {
  it('maps every routed UI mode to a Mapbox profile', () => {
    expect(MODE_PROFILES).toMatchObject({
      driving: 'driving',
      walking: 'walking',
      cycling: 'cycling',
    })
    expect(MODE_PROFILES.train).toBeUndefined()
  })

  it('caps the matrix at Mapbox’s documented 25-coordinate limit', () => {
    expect(MATRIX_MAX_POINTS).toBe(25)
  })
})
