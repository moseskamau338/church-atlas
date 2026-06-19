// Canonical Mapbox basemap choices for the Traverse geographic panel. Shared by
// the map component (renders the switcher), the session store (validates the
// persisted value) and the share-link codec (validates the decoded value), so
// the set of valid style ids lives in exactly one place.
export const BASE_STYLES = [
  { id: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'streets', label: 'Street', url: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'outdoors', label: 'Outdoor', url: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'light', label: 'Muted', url: 'mapbox://styles/mapbox/light-v11' },
]

export const DEFAULT_BASE_STYLE = 'satellite'
export const BASE_STYLE_IDS = new Set(BASE_STYLES.map((s) => s.id))
