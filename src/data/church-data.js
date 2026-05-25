// Gathera SDA District — church data.
// In production this would come from a CMS. Coordinates are real (verified via
// Google Maps). Membership figures are exact where supplied by the user;
// reachable-population figures are placeholders pending KNBS census wiring.

export const district = {
  name: 'Gathera SDA District',
  county: "Murang'a County",
  subCounty: 'Muranga South Sub-County',
  leader: 'Pr. Francis Karanja',
  leaderTitle: 'District Pastor',
  updated: 'May 2026',
}

export const wards = [
  { id: 'gatanga', name: 'Gatanga Ward', population: 14820 },
  { id: 'muthithi', name: 'Muthithi Ward', population: 11340 },
  { id: 'kamira', name: 'Kamira Ward', population: 12500 },
]

export const churches = [
  {
    id: 'gathera',
    name: 'Gathera SDA',
    role: 'Mother Church',
    ward: 'gatanga',
    members: 50,
    founded: 1974,
    services: 'Sabbath · 09:00',
    lat: -0.7837603,
    lng: 37.0441453,
    sx: 0.3,
    sy: 0.22,
    sabbathSchools: [
      { id: 'kaharo', name: 'Kaharo', lat: -0.7976877, lng: 37.0603925, sx: 0.46, sy: 0.36 },
      { id: 'gachocho', name: 'Gachocho', lat: -0.7852216, lng: 36.9982275, sx: 0.12, sy: 0.3 },
    ],
  },
  {
    id: 'muthithi',
    name: 'Muthithi SDA',
    role: 'Local Church',
    ward: 'muthithi',
    members: 80,
    founded: 1989,
    services: 'Sabbath · 09:30',
    lat: -0.8413387,
    lng: 37.0912994,
    sx: 0.78,
    sy: 0.76,
    sabbathSchools: [],
  },
  {
    id: 'kamira',
    name: 'Kamira SDA',
    role: 'Local Church',
    ward: 'kamira',
    members: 65,
    founded: 1996,
    services: 'Sabbath · 10:00',
    lat: -0.8161724,
    lng: 37.0567938,
    sx: 0.56,
    sy: 0.58,
    sabbathSchools: [],
  },
]

// Haversine great-circle distance in km between two {lat, lng} points.
export function haversineKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

const round1 = (n) => Math.round(n * 10) / 10

// Complete graph between mother churches.
export function buildMotherEdges(list) {
  const edges = []
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      edges.push({
        kind: 'mother',
        from: list[i].id,
        to: list[j].id,
        km: round1(haversineKm(list[i], list[j])),
      })
    }
  }
  return edges
}

// Sabbath-school edges: each school connects to its parent (mother) church only.
export function buildSabbathEdges(list) {
  const edges = []
  list.forEach((c) => {
    ;(c.sabbathSchools || []).forEach((ss) => {
      edges.push({
        kind: 'sabbath',
        from: c.id,
        to: `${c.id}__${ss.id}`,
        km: round1(haversineKm(c, ss)),
      })
    })
  })
  return edges
}

export const edges = buildMotherEdges(churches)
export const sabbathEdges = buildSabbathEdges(churches)

// Flat list of every sabbath-school node, each tagged with its parent.
export const sabbathSchools = churches.flatMap((c) =>
  (c.sabbathSchools || []).map((ss) => ({
    ...ss,
    parentId: c.id,
    parentName: c.name,
    fullId: `${c.id}__${ss.id}`,
  })),
)

export function buildSummary({
  churches: cs = churches,
  wards: ws = wards,
  sabbathSchools: ss = sabbathSchools,
  edges: es = edges,
} = {}) {
  const totalMembers = cs.reduce((s, c) => s + c.members, 0)
  const reachablePop = ws.reduce((s, w) => s + w.population, 0)
  const avgEdgeKm = es.length ? es.reduce((s, e) => s + e.km, 0) / es.length : 0
  return {
    totalChurches: cs.length,
    totalSabbath: ss.length,
    totalMembers,
    reachablePop,
    wardsCovered: ws.length,
    avgEdgeKm: round1(avgEdgeKm),
  }
}

export const summary = buildSummary()

// Convenience bundle so consumers can import a single object.
export const churchData = {
  district,
  wards,
  churches,
  edges,
  sabbathEdges,
  sabbathSchools,
  summary,
}

export default churchData
