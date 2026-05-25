import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveRoadDistance } from '../src/data/road-distances.js'

const a = { lat: -0.7837603, lng: 37.0441453 }
const b = { lat: -0.8413387, lng: 37.0912994 }

function okResponse(meters) {
  return {
    ok: true,
    json: async () => ({ code: 'Ok', routes: [{ distance: meters }] }),
  }
}

beforeEach(() => {
  globalThis.localStorage?.clear?.()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolveRoadDistance', () => {
  it('returns km rounded to 1 decimal on a successful response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(12345)) // 12.345 km
    const km = await resolveRoadDistance(a, b, { fetchImpl })
    expect(km).toBe(12.3)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][0]).toContain('router.project-osrm.org')
  })

  it('caches successful results — second call does not hit the network', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse(5000))
    await resolveRoadDistance(a, b, { fetchImpl })
    await resolveRoadDistance(a, b, { fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('returns null on HTTP failure (caller falls back to haversine)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) })
    const km = await resolveRoadDistance(a, b, { fetchImpl })
    expect(km).toBeNull()
  })

  it('returns null when OSRM responds with code !== "Ok"', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'NoRoute', routes: [] }),
    })
    const km = await resolveRoadDistance(a, b, { fetchImpl })
    expect(km).toBeNull()
  })

  it('does not cache failures', async () => {
    const fail = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    await resolveRoadDistance(a, b, { fetchImpl: fail })
    const succeed = vi.fn().mockResolvedValue(okResponse(7000))
    const km = await resolveRoadDistance(a, b, { fetchImpl: succeed })
    expect(km).toBe(7)
    expect(succeed).toHaveBeenCalledTimes(1)
  })
})
