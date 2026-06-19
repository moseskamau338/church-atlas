// Shared session state for the Traverse tool. A single module-level reactive
// store (the app doesn't use Pinia) keeps the location list, travel mode and
// derived distance matrix in sync across the search box, matrix table and both
// map panels — and persists the session to localStorage so it survives reload.

import { computed, reactive, watch } from 'vue'
import { haversineKm, round1 } from '../services/geo.js'
import { getMatrix, hasMapboxToken, MODE_PROFILES, MATRIX_MAX_POINTS } from '../services/mapbox.js'

const STORAGE_KEY = 'traverse:session:v1'

// Distinct, paper-friendly marker palette. Cycles if a session exceeds it.
export const PALETTE = [
  '#7A2E1F', // burgundy
  '#3A4F2E', // forest
  '#B8893B', // gold
  '#2E5A6B', // teal
  '#8A3D5E', // plum
  '#4A5240', // olive
  '#A85432', // terracotta
  '#3B4A7A', // indigo
  '#6B6130', // brass
  '#5E2E5A', // mulberry
  '#2F6F5A', // pine
  '#94402A', // rust
]

export const MODES = [
  { id: 'direct', label: 'Direct', hint: 'Straight-line, ignores roads' },
  { id: 'driving', label: 'Driving', hint: 'Best vehicle route' },
  { id: 'walking', label: 'Walking', hint: 'Best walking route' },
  { id: 'cycling', label: 'Cycling', hint: 'Best cycling route' },
]

let _seq = 0
const nextId = () => `loc_${Date.now().toString(36)}_${(_seq++).toString(36)}`

function load() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const saved = load()

const state = reactive({
  locations: saved?.locations ?? [],
  mode: saved?.mode ?? 'direct',
  originId: saved?.originId ?? null,
  connectionMode: saved?.connectionMode ?? 'all', // 'all' | 'origin' | 'none'
  showDurations: saved?.showDurations ?? true,
})

// Matrix of routed results, keyed by mode. `direct` is computed locally.
const routed = reactive({
  loading: false,
  error: '',
  mode: null, // which mode the cached grid belongs to
  distances: null,
  durations: null,
})

// Persist a trimmed snapshot whenever the session changes.
watch(
  () => ({
    locations: state.locations,
    mode: state.mode,
    originId: state.originId,
    connectionMode: state.connectionMode,
    showDurations: state.showDurations,
  }),
  (snap) => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(snap))
    } catch {
      /* storage unavailable — non-fatal */
    }
  },
  { deep: true },
)

function colorFor(index) {
  return PALETTE[index % PALETTE.length]
}

// Re-stamp colors by position so they stay stable and contiguous.
function recolor() {
  state.locations.forEach((loc, i) => {
    loc.color = colorFor(i)
  })
}

function addLocation({ name, placeName, lat, lng }) {
  // Skip near-duplicates (within ~25 m).
  const dup = state.locations.find(
    (l) => Math.abs(l.lat - lat) < 2.5e-4 && Math.abs(l.lng - lng) < 2.5e-4,
  )
  if (dup) return dup
  const loc = {
    id: nextId(),
    name: name || 'Dropped pin',
    placeName: placeName || '',
    lat,
    lng,
    color: colorFor(state.locations.length),
  }
  state.locations.push(loc)
  if (!state.originId) state.originId = loc.id
  return loc
}

function removeLocation(id) {
  const i = state.locations.findIndex((l) => l.id === id)
  if (i === -1) return
  state.locations.splice(i, 1)
  if (state.originId === id) state.originId = state.locations[0]?.id ?? null
  recolor()
}

function renameLocation(id, name) {
  const loc = state.locations.find((l) => l.id === id)
  if (loc) loc.name = name
}

function clearAll() {
  state.locations.splice(0)
  state.originId = null
  routed.distances = null
  routed.durations = null
  routed.mode = null
  routed.error = ''
}

function setMode(mode) {
  state.mode = mode
}

// Replace the whole session from a decoded share-link snapshot.
function hydrate(snap) {
  if (!snap || !Array.isArray(snap.locations)) return
  const next = snap.locations.map((l, i) => ({
    id: nextId(),
    name: l.name || `Point ${i + 1}`,
    placeName: '',
    lat: l.lat,
    lng: l.lng,
    color: colorFor(i),
  }))
  state.locations.splice(0, state.locations.length, ...next)
  if (snap.mode) state.mode = snap.mode
  if (snap.connectionMode) state.connectionMode = snap.connectionMode
  if (typeof snap.showDurations === 'boolean') state.showDurations = snap.showDurations
  const oi = snap.originIndex
  state.originId =
    oi != null && state.locations[oi] ? state.locations[oi].id : (state.locations[0]?.id ?? null)
  routed.distances = null
  routed.durations = null
  routed.mode = null
  routed.error = ''
}

const isDirect = computed(() => state.mode === 'direct')
const points = computed(() => state.locations)

// Direct (great-circle) matrix — symmetric, computed locally and instantly.
const directMatrix = computed(() => {
  const locs = state.locations
  const n = locs.length
  const distances = Array.from({ length: n }, () => Array(n).fill(null))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      distances[i][j] = i === j ? 0 : round1(haversineKm(locs[i], locs[j]))
    }
  }
  return { distances, durations: null }
})

// Fetch the routed matrix for the active mode. Debounced via the watcher below.
let matrixToken = 0
async function refreshRoutedMatrix() {
  if (isDirect.value) return
  if (!hasMapboxToken()) {
    routed.error = 'Add a Mapbox token to use routed modes.'
    return
  }
  const locs = state.locations
  if (locs.length < 2) {
    routed.distances = null
    routed.durations = null
    routed.mode = state.mode
    return
  }
  if (locs.length > MATRIX_MAX_POINTS) {
    routed.error = `Routed matrix supports up to ${MATRIX_MAX_POINTS} points.`
    return
  }
  const profile = MODE_PROFILES[state.mode]
  const myToken = ++matrixToken
  routed.loading = true
  routed.error = ''
  try {
    const { distances, durations } = await getMatrix(profile, locs)
    if (myToken !== matrixToken) return // superseded
    routed.distances = distances.map((row) => row.map((v) => (v == null ? null : round1(v))))
    routed.durations = durations.map((row) => row.map((v) => (v == null ? null : Math.round(v))))
    routed.mode = state.mode
  } catch (e) {
    if (myToken !== matrixToken) return
    routed.error = e.message || 'Routing failed.'
    routed.distances = null
    routed.durations = null
  } finally {
    if (myToken === matrixToken) routed.loading = false
  }
}

// Recompute the routed grid when mode or the point set changes.
let debounceTimer = null
watch(
  () => [state.mode, state.locations.map((l) => `${l.lat},${l.lng}`).join('|')],
  () => {
    if (isDirect.value) return
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(refreshRoutedMatrix, 250)
  },
)

// Unified matrix the UI consumes regardless of mode.
const matrix = computed(() => {
  if (isDirect.value) return { ...directMatrix.value, ready: true }
  return {
    distances: routed.mode === state.mode ? routed.distances : null,
    durations: routed.mode === state.mode ? routed.durations : null,
    ready: routed.mode === state.mode && !!routed.distances,
  }
})

// Pairs of indices to draw as connections, based on connectionMode.
const edgeIndices = computed(() => {
  const n = state.locations.length
  const out = []
  if (state.connectionMode === 'none' || n < 2) return out
  if (state.connectionMode === 'origin') {
    const oi = state.locations.findIndex((l) => l.id === state.originId)
    if (oi === -1) return out
    for (let j = 0; j < n; j++) if (j !== oi) out.push([oi, j])
    return out
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) out.push([i, j])
  }
  return out
})

export function useDistanceSession() {
  return {
    state,
    routed,
    points,
    isDirect,
    matrix,
    edgeIndices,
    MODES,
    PALETTE,
    addLocation,
    removeLocation,
    renameLocation,
    clearAll,
    setMode,
    hydrate,
    refreshRoutedMatrix,
  }
}
