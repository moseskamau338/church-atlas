// Resolves the geometry for the connections currently drawn on the maps.
// Direct mode is computed locally as great-circle arcs; routed modes pull the
// real path from the Mapbox Directions API (cached per profile + coordinate
// pair, so the schematic and geographic panels share one fetch).

import { ref, watch } from 'vue'
import { geodesicLine, round1 } from '../services/geo.js'
import { getRoute, hasMapboxToken, MODE_PROFILES } from '../services/mapbox.js'

const geomCache = new Map() // key -> { coordinates, distanceKm, durationMin }

function pairKey(profile, a, b) {
  const r = (v) => v.toFixed(5)
  return `${profile}:${r(a.lng)},${r(a.lat)}->${r(b.lng)},${r(b.lat)}`
}

export function useRouteGeometry({ points, state, edgeIndices }) {
  // Reactive list of drawn connections with resolved geometry.
  const lines = ref([])
  const loading = ref(false)

  let runToken = 0

  async function rebuild() {
    // Snapshot the locations array: routed mode awaits network calls, and if the
    // underlying reactive array is mutated meanwhile, the `pairs` indices would
    // point at the wrong (or missing) entries. The copy keeps indices stable.
    const locs = points.value.slice()
    const mode = state.mode
    const pairs = edgeIndices.value
    const myToken = ++runToken

    // Direct: synchronous great-circle arcs, no network.
    if (mode === 'direct' || !hasMapboxToken()) {
      loading.value = false
      lines.value = pairs.map(([i, j]) => {
        const a = locs[i]
        const b = locs[j]
        return {
          key: `${a.id}__${b.id}`,
          fromId: a.id,
          toId: b.id,
          color: a.color,
          coordinates: geodesicLine(a, b),
          straight: true,
        }
      })
      return
    }

    // Routed: fetch (or reuse cached) geometry per pair.
    const profile = MODE_PROFILES[mode]
    loading.value = true
    // Promise.all preserves input order, so `results` matches `pairs` order
    // regardless of which fetch resolves first — no churn for v-for consumers.
    const results = await Promise.all(
      pairs.map(async ([i, j]) => {
        const a = locs[i]
        const b = locs[j]
        const key = pairKey(profile, a, b)
        let geom = geomCache.get(key)
        if (!geom) {
          try {
            const r = await getRoute(profile, [a, b])
            geom = {
              coordinates: r.coordinates,
              distanceKm: round1(r.distanceKm),
              durationMin: Math.round(r.durationMin),
            }
            geomCache.set(key, geom)
          } catch {
            // Fall back to a straight arc so the connection still renders.
            geom = { coordinates: geodesicLine(a, b), straight: true }
          }
        }
        return {
          key: `${a.id}__${b.id}`,
          fromId: a.id,
          toId: b.id,
          color: a.color,
          ...geom,
        }
      }),
    )
    if (myToken !== runToken) return // superseded by a newer rebuild
    lines.value = results
    loading.value = false
  }

  watch(
    () => [
      state.mode,
      state.connectionMode,
      state.originId,
      points.value.map((l) => `${l.id}:${l.lat},${l.lng}`).join('|'),
    ],
    rebuild,
    { immediate: true },
  )

  return { lines, loading, rebuild }
}
