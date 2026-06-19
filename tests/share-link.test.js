import { describe, expect, it } from 'vitest'
import { encodeSession, decodeSession } from '../src/services/share-link.js'

const session = {
  mode: 'walking',
  connectionMode: 'origin',
  showDurations: false,
  originId: 'b',
  locations: [
    { id: 'a', name: 'Kenhut SDA', lat: -0.78376, lng: 37.04415 },
    { id: 'b', name: 'Café René — Nairobi', lat: -1.286389, lng: 36.817223 },
  ],
}

describe('share-link round-trip', () => {
  it('encodes to a URL-safe string', () => {
    const s = encodeSession(session)
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/) // base64url, no +/=
  })

  it('restores mode, connections, durations and origin index', () => {
    const out = decodeSession(encodeSession(session))
    expect(out.mode).toBe('walking')
    expect(out.connectionMode).toBe('origin')
    expect(out.showDurations).toBe(false)
    expect(out.originIndex).toBe(1) // 'b' is the second location
  })

  it('restores points (incl. unicode names) within coordinate precision', () => {
    const out = decodeSession(encodeSession(session))
    expect(out.locations).toHaveLength(2)
    expect(out.locations[1].name).toBe('Café René — Nairobi')
    expect(out.locations[0].lat).toBeCloseTo(-0.78376, 5)
    expect(out.locations[0].lng).toBeCloseTo(37.04415, 5)
  })

  it('returns null for corrupt or empty input', () => {
    expect(decodeSession('')).toBeNull()
    expect(decodeSession('!!!not-base64!!!')).toBeNull()
    expect(decodeSession(undefined)).toBeNull()
  })

  it('falls back to safe defaults for unknown enum values', () => {
    const out = decodeSession(
      encodeSession({ ...session, mode: 'teleport', connectionMode: 'xyz' }),
    )
    expect(out.mode).toBe('direct')
    expect(out.connectionMode).toBe('all')
  })

  it('clamps an out-of-range origin index to 0', () => {
    // originId that matches no location → findIndex returns -1 when encoding.
    const out = decodeSession(encodeSession({ ...session, originId: 'missing' }))
    expect(out.originIndex).toBe(0)
  })
})
