import { describe, expect, it } from 'vitest'
import churchData, {
  buildMotherEdges,
  buildSabbathEdges,
  buildSummary,
  churches,
  haversineKm,
  sabbathSchools,
} from '../src/data/church-data.js'

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0)
  })

  it('measures ~111 km for 1° of latitude at the equator', () => {
    const km = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
    expect(km).toBeGreaterThan(110)
    expect(km).toBeLessThan(112)
  })

  it('is symmetric', () => {
    const a = { lat: -0.78, lng: 37.04 }
    const b = { lat: -0.84, lng: 37.09 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6)
  })
})

describe('buildMotherEdges', () => {
  it('builds a complete graph (n choose 2 edges)', () => {
    const list = [
      { id: 'a', lat: 0, lng: 0 },
      { id: 'b', lat: 0, lng: 1 },
      { id: 'c', lat: 1, lng: 0 },
      { id: 'd', lat: 1, lng: 1 },
    ]
    const edges = buildMotherEdges(list)
    expect(edges).toHaveLength(6)
    expect(new Set(edges.map((e) => `${e.from}-${e.to}`)).size).toBe(6)
  })

  it('tags each edge with kind=mother and rounded km', () => {
    const edges = buildMotherEdges(churches)
    edges.forEach((e) => {
      expect(e.kind).toBe('mother')
      expect(Number.isFinite(e.km)).toBe(true)
      expect(e.km).toBe(Math.round(e.km * 10) / 10)
    })
  })

  it('returns no edges for a single node', () => {
    expect(buildMotherEdges([{ id: 'x', lat: 0, lng: 0 }])).toEqual([])
  })
})

describe('buildSabbathEdges', () => {
  it('connects each sabbath school to its parent only', () => {
    const edges = buildSabbathEdges(churches)
    const expected = churches.reduce((n, c) => n + (c.sabbathSchools?.length || 0), 0)
    expect(edges).toHaveLength(expected)
    edges.forEach((e) => {
      expect(e.kind).toBe('sabbath')
      expect(churches.some((c) => c.id === e.from)).toBe(true)
      expect(e.to.startsWith(`${e.from}__`)).toBe(true)
    })
  })
})

describe('sabbathSchools flat list', () => {
  it('tags every entry with parent metadata + fullId', () => {
    expect(sabbathSchools.length).toBeGreaterThan(0)
    sabbathSchools.forEach((s) => {
      expect(s.parentId).toBeTruthy()
      expect(s.parentName).toBeTruthy()
      expect(s.fullId).toBe(`${s.parentId}__${s.id}`)
    })
  })
})

describe('buildSummary', () => {
  it('sums membership, ward population, counts churches/sabbath schools', () => {
    const s = buildSummary()
    expect(s.totalChurches).toBe(churches.length)
    expect(s.totalSabbath).toBe(sabbathSchools.length)
    expect(s.totalMembers).toBe(churches.reduce((acc, c) => acc + c.members, 0))
    expect(s.reachablePop).toBeGreaterThan(0)
    expect(s.avgEdgeKm).toBeGreaterThan(0)
  })

  it('handles an empty edge list without dividing by zero', () => {
    const s = buildSummary({ churches: [], wards: [], sabbathSchools: [], edges: [] })
    expect(s.avgEdgeKm).toBe(0)
  })
})

describe('default churchData export', () => {
  it('bundles district, churches, edges, sabbathEdges, summary', () => {
    expect(churchData.district.name).toBe('Gathera SDA District')
    expect(churchData.churches.length).toBeGreaterThan(0)
    expect(churchData.edges.length).toBeGreaterThan(0)
    expect(churchData.summary.totalChurches).toBe(churchData.churches.length)
  })
})
