<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useDistanceSession } from '../../composables/useDistanceSession.js'
import { getMapboxToken, hasMapboxToken, reverseGeocode } from '../../services/mapbox.js'

const props = defineProps({
  lines: { type: Array, default: () => [] },
})

const { state, matrix, addLocation } = useDistanceSession()

const tokenOk = hasMapboxToken()
const containerRef = ref(null)
const map = shallowRef(null)
const markers = shallowRef([])
const ready = ref(false)
const dropping = ref(false)

const STYLES = [
  { id: 'satellite', label: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'streets', label: 'Street', url: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'outdoors', label: 'Outdoor', url: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'light', label: 'Muted', url: 'mapbox://styles/mapbox/light-v11' },
]
const styleId = ref('satellite')
const styleUrl = computed(() => STYLES.find((s) => s.id === styleId.value).url)

const SRC = 'traverse-lines'

const indexById = computed(() => {
  const m = {}
  state.locations.forEach((l, i) => (m[l.id] = i))
  return m
})

function lineFeatures() {
  return props.lines.map((ln) => {
    const i = indexById.value[ln.fromId]
    const j = indexById.value[ln.toId]
    const km = matrix.value.distances?.[i]?.[j]
    return {
      type: 'Feature',
      properties: {
        color: ln.color,
        label: km != null ? `${km.toFixed(1)} km` : '',
        dashed: ln.straight ? 1 : 0,
      },
      geometry: { type: 'LineString', coordinates: ln.coordinates },
    }
  })
}

// (Re)install the line source + layers. Called on first load and after every
// style switch (a style change wipes custom sources/layers).
function installLayers() {
  const m = map.value
  if (!m || m.getSource(SRC)) return
  m.addSource(SRC, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: lineFeatures() },
  })
  m.addLayer({
    id: 'traverse-lines-casing',
    type: 'line',
    source: SRC,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#F5EDDE', 'line-width': 6, 'line-opacity': 0.7 },
  })
  m.addLayer({
    id: 'traverse-lines-main',
    type: 'line',
    source: SRC,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 3,
      'line-opacity': 0.95,
      'line-dasharray': [2, 1.5],
    },
  })
  m.addLayer({
    id: 'traverse-lines-label',
    type: 'symbol',
    source: SRC,
    layout: {
      'symbol-placement': 'line-center',
      'text-field': ['get', 'label'],
      'text-size': 11,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
    },
    paint: {
      'text-color': '#1A1714',
      'text-halo-color': '#F5EDDE',
      'text-halo-width': 2,
    },
  })
}

function updateLines() {
  const src = map.value?.getSource(SRC)
  if (src) src.setData({ type: 'FeatureCollection', features: lineFeatures() })
}

function buildMarkerEl(loc, index) {
  const el = document.createElement('div')
  el.className = 'traverse-marker'
  el.style.background = loc.color
  el.textContent = String(index + 1)
  el.title = loc.name
  return el
}

function renderMarkers() {
  markers.value.forEach((m) => m.remove())
  markers.value = []
  const m = map.value
  if (!m) return
  state.locations.forEach((loc, i) => {
    const marker = new mapboxgl.Marker({ element: buildMarkerEl(loc, i), anchor: 'center' })
      .setLngLat([loc.lng, loc.lat])
      .setPopup(new mapboxgl.Popup({ offset: 18, closeButton: false }).setText(loc.name))
      .addTo(m)
    markers.value.push(marker)
  })
}

function fit() {
  const m = map.value
  if (!m || !state.locations.length) return
  const b = new mapboxgl.LngLatBounds()
  state.locations.forEach((l) => b.extend([l.lng, l.lat]))
  props.lines.forEach((ln) => ln.coordinates.forEach((c) => b.extend(c)))
  m.fitBounds(b, { padding: 70, maxZoom: 15, duration: 600 })
}

async function onMapClick(e) {
  dropping.value = true
  const { lng, lat } = e.lngLat
  let name = 'Dropped pin'
  let placeName = ''
  try {
    const r = await reverseGeocode(lat, lng)
    if (r) {
      name = r.name
      placeName = r.placeName
    }
  } catch {
    /* keep the default name */
  } finally {
    dropping.value = false
  }
  addLocation({ name, placeName, lat, lng })
}

onMounted(() => {
  if (!tokenOk) return
  mapboxgl.accessToken = getMapboxToken()
  const m = new mapboxgl.Map({
    container: containerRef.value,
    style: styleUrl.value,
    center: state.locations.length
      ? [state.locations[0].lng, state.locations[0].lat]
      : [37.04, -0.79],
    zoom: state.locations.length ? 9 : 6,
    attributionControl: false,
    // Required so html-to-image can read the WebGL canvas for PNG export.
    preserveDrawingBuffer: true,
  })
  m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
  m.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
  m.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-right')
  m.on('load', () => {
    ready.value = true
    installLayers()
    renderMarkers()
    fit()
  })
  // Re-install custom layers after a basemap style swap.
  m.on('style.load', () => {
    if (ready.value) installLayers()
  })
  m.on('click', onMapClick)
  map.value = m
})

onBeforeUnmount(() => {
  markers.value.forEach((m) => m.remove())
  map.value?.remove()
  map.value = null
})

watch(styleUrl, (url) => map.value?.setStyle(url))
watch(
  () => state.locations.map((l) => `${l.id}:${l.lat},${l.lng}:${l.color}`).join('|'),
  () => {
    if (!ready.value) return
    renderMarkers()
  },
)
watch(
  () => props.lines,
  () => {
    if (ready.value) updateLines()
  },
  { deep: true },
)

defineExpose({ fit })
</script>

<template>
  <div class="map-panel">
    <div class="map-panel__label">
      <span class="map-panel__label-dot map-panel__label-dot--green" />
      Geographic
    </div>

    <div v-if="tokenOk" class="map-panel__layer-switcher __export-hide">
      <button
        v-for="s in STYLES"
        :key="s.id"
        class="layer-btn"
        :class="{ 'is-active': styleId === s.id }"
        @click="styleId = s.id"
      >
        {{ s.label }}
      </button>
    </div>

    <button v-if="tokenOk" class="geo-fit __export-hide" title="Fit all points" @click="fit">
      Fit
    </button>

    <span v-if="dropping" class="geo-dropping">Resolving pin…</span>

    <div v-if="tokenOk" ref="containerRef" class="leaflet-host" />

    <div v-else class="geo-notoken">
      <h3>Map needs a Mapbox token</h3>
      <p>
        Add <code>VITE_MAPBOX_TOKEN</code> to a <code>.env.local</code> file and restart the dev
        server to enable the geographic map, place search and routed distances.
      </p>
      <p class="geo-notoken__hint">
        The schematic and the <strong>Direct</strong> distance matrix work without a token.
      </p>
    </div>
  </div>
</template>

<style scoped>
.geo-fit {
  position: absolute;
  bottom: 16px;
  right: 64px;
  z-index: 1000;
  padding: 6px 11px;
  background: rgba(245, 237, 222, 0.95);
  border: 1px solid var(--ink);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  cursor: pointer;
}
.geo-fit:hover {
  background: var(--ink);
  color: var(--paper);
}
.geo-dropping {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 1000;
  padding: 5px 10px;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.geo-notoken {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  padding: 30px;
  background:
    repeating-linear-gradient(45deg, rgba(26, 23, 20, 0.025) 0 14px, transparent 14px 28px),
    var(--paper);
}
.geo-notoken h3 {
  margin: 0;
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 600;
}
.geo-notoken p {
  margin: 0;
  max-width: 360px;
  font-family: var(--sans);
  font-size: 13px;
  line-height: 1.55;
  color: rgba(26, 23, 20, 0.7);
}
.geo-notoken code {
  font-family: var(--mono);
  font-size: 12px;
  background: rgba(26, 23, 20, 0.08);
  padding: 1px 5px;
}
.geo-notoken__hint {
  font-style: italic;
  color: rgba(26, 23, 20, 0.55) !important;
}
</style>

<style>
/* Marker element is created imperatively, so its style is global (unscoped). */
.traverse-marker {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f5edde;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  border: 2px solid #1a1714;
  box-shadow: 0 2px 6px rgba(26, 23, 20, 0.4);
  cursor: pointer;
}
</style>
