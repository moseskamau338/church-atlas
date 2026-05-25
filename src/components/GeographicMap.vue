<script setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import L from 'leaflet'
import { TILE_LAYERS } from './tile-layers.js'

const props = defineProps({
  data: { type: Object, required: true },
  roadKm: { type: Object, default: () => ({}) },
  baseLayer: { type: String, required: true },
  showDistances: { type: Boolean, default: true },
  showEdges: { type: Boolean, default: true },
  showPopulation: { type: Boolean, default: true },
  showHeatmap: { type: Boolean, default: false },
  showSabbath: { type: Boolean, default: true },
  selectedId: { type: String, default: null },
})
const emit = defineEmits(['select', 'register-fit-fn'])

const containerRef = ref(null)
// shallowRef for Leaflet instances — they manage their own internals; Vue's
// deep reactivity would only slow things down.
const map = shallowRef(null)
const tileLayers = shallowRef({})
const markers = shallowRef({})
const edgesGroup = shallowRef(null)
const heatmapGroup = shallowRef(null)
let resizeObserver = null
let fitOpts = null
let bounds = null

function buildChurchIcon(role, isSelected) {
  const size = 40
  const color = role === 'Mother Church' ? '#7A2E1F' : '#3A4F2E'
  const ringColor = isSelected ? '#F5EDDE' : 'rgba(245,237,222,0.55)'
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 5}" fill="${color}" stroke="#1A1714" stroke-width="1.4"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="none" stroke="${ringColor}" stroke-width="1.5"/>
      <rect x="${size / 2 - 1.5}" y="${size / 2 - 8}" width="3" height="13" fill="#F5EDDE"/>
      <rect x="${size / 2 - 5}" y="${size / 2 - 4.5}" width="11" height="3" fill="#F5EDDE"/>
    </svg>`
  return L.divIcon({
    className: 'church-marker',
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const TIP_DIRS = { gathera: 'top', muthithi: 'bottom', kigumo: 'top' }

function renderMarkersAndEdges() {
  const m = map.value
  if (!m) return

  Object.values(markers.value).forEach((mk) => mk.remove())
  markers.value = {}
  if (edgesGroup.value) edgesGroup.value.remove()

  if (props.showEdges) {
    const eg = L.layerGroup().addTo(m)
    edgesGroup.value = eg

    props.data.edges.forEach((edge) => {
      const a = props.data.churches.find((c) => c.id === edge.from)
      const b = props.data.churches.find((c) => c.id === edge.to)
      if (!a || !b) return
      L.polyline(
        [
          [a.lat, a.lng],
          [b.lat, b.lng],
        ],
        { color: '#F5EDDE', weight: 5, opacity: 0.55, lineCap: 'round' },
      ).addTo(eg)
      L.polyline(
        [
          [a.lat, a.lng],
          [b.lat, b.lng],
        ],
        { color: '#1A1714', weight: 2.2, opacity: 0.95, lineCap: 'round' },
      ).addTo(eg)
      if (props.showDistances) {
        const mid = [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2]
        const km = props.roadKm[`${edge.from}__${edge.to}`] ?? edge.km
        L.marker(mid, {
          interactive: false,
          icon: L.divIcon({
            className: 'edge-label',
            html: `<span class="edge-label__pill">${km} km</span>`,
            iconSize: [56, 22],
            iconAnchor: [28, 11],
          }),
        }).addTo(eg)
      }
    })

    if (props.showSabbath) {
      props.data.sabbathEdges.forEach((edge) => {
        const a = props.data.churches.find((c) => c.id === edge.from)
        const ss = props.data.sabbathSchools.find((s) => s.fullId === edge.to)
        if (!a || !ss) return
        L.polyline(
          [
            [a.lat, a.lng],
            [ss.lat, ss.lng],
          ],
          { color: '#F5EDDE', weight: 4, opacity: 0.45, lineCap: 'round' },
        ).addTo(eg)
        L.polyline(
          [
            [a.lat, a.lng],
            [ss.lat, ss.lng],
          ],
          {
            color: '#1A1714',
            weight: 1.6,
            opacity: 0.75,
            lineCap: 'round',
            dashArray: '4 4',
          },
        ).addTo(eg)
        if (props.showDistances) {
          const mid = [(a.lat + ss.lat) / 2, (a.lng + ss.lng) / 2]
          const km = props.roadKm[`${edge.from}__${edge.to}`] ?? edge.km
          L.marker(mid, {
            interactive: false,
            icon: L.divIcon({
              className: 'edge-label edge-label--sabbath',
              html: `<span class="edge-label__pill edge-label__pill--sabbath">${km} km</span>`,
              iconSize: [48, 18],
              iconAnchor: [24, 9],
            }),
          }).addTo(eg)
        }
      })
    }
  }

  props.data.churches.forEach((c) => {
    const marker = L.marker([c.lat, c.lng], {
      icon: buildChurchIcon(c.role, props.selectedId === c.id),
      title: c.name,
      zIndexOffset: c.role === 'Mother Church' ? 1000 : 500,
    }).addTo(m)

    marker.bindTooltip(
      `<div class="church-tip__name">${c.name.replace(' SDA', '')}</div>
       <div class="church-tip__role">${c.role.toUpperCase()}</div>
       ${props.showPopulation ? `<div class="church-tip__meta">${c.members} members</div>` : ''}`,
      {
        permanent: true,
        direction: TIP_DIRS[c.id] || 'top',
        offset: L.point(0, 0),
        className: 'church-tip',
        opacity: 1,
      },
    )
    marker.on('click', () => emit('select', c.id))
    markers.value[c.id] = marker
  })

  if (props.showSabbath) {
    props.data.sabbathSchools.forEach((ss) => {
      const ssMarker = L.marker([ss.lat, ss.lng], {
        icon: L.divIcon({
          className: 'sabbath-marker',
          html: `<svg width="14" height="14" viewBox="0 0 14 14">
                   <circle cx="7" cy="7" r="6" fill="#F5EDDE" stroke="#1A1714" stroke-width="1.2"/>
                   <circle cx="7" cy="7" r="2.5" fill="#3A4F2E"/>
                 </svg>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
        title: `${ss.name} (Sabbath school of ${ss.parentName})`,
        zIndexOffset: 200,
      }).addTo(m)
      ssMarker.bindTooltip(
        `<div class="church-tip__name church-tip__name--small">${ss.name}</div>
         <div class="church-tip__role">SABBATH SCHOOL</div>`,
        {
          permanent: true,
          direction: 'bottom',
          offset: L.point(0, 2),
          className: 'church-tip church-tip--sabbath',
          opacity: 1,
        },
      )
      markers.value[ss.fullId] = ssMarker
    })
  }
}

function renderHeatmap() {
  const m = map.value
  if (!m) return
  if (heatmapGroup.value) {
    heatmapGroup.value.remove()
    heatmapGroup.value = null
  }
  if (!props.showHeatmap) return
  const hg = L.layerGroup().addTo(m)
  heatmapGroup.value = hg
  const maxMembers = Math.max(...props.data.churches.map((c) => c.members))
  props.data.churches.forEach((c) => {
    const t = c.members / maxMembers
    ;[1.0, 0.7, 0.45].forEach((r, i) => {
      L.circle([c.lat, c.lng], {
        radius: (1800 + t * 5200) * r,
        color: '#7A2E1F',
        weight: 0,
        fillColor: '#7A2E1F',
        fillOpacity: 0.06 + i * 0.05 + t * 0.05,
        interactive: false,
      }).addTo(hg)
    })
  })
}

onMounted(() => {
  const allPoints = [
    ...props.data.churches.map((c) => [c.lat, c.lng]),
    ...props.data.sabbathSchools.map((s) => [s.lat, s.lng]),
  ]
  bounds = L.latLngBounds(allPoints)
  fitOpts = {
    paddingTopLeft: [30, 70],
    paddingBottomRight: [30, 40],
  }

  const m = L.map(containerRef.value, {
    zoomControl: false,
    attributionControl: false,
    preferCanvas: false,
    worldCopyJump: false,
  })
  m.fitBounds(bounds, fitOpts)

  Object.entries(TILE_LAYERS).forEach(([key, conf]) => {
    tileLayers.value[key] = L.tileLayer(conf.url, {
      attribution: conf.attribution,
      maxZoom: conf.maxZoom,
      crossOrigin: 'anonymous',
    })
  })
  tileLayers.value[props.baseLayer].addTo(m)

  L.control
    .attribution({ prefix: false, position: 'bottomleft' })
    .addAttribution(TILE_LAYERS[props.baseLayer].attribution)
    .addTo(m)
  L.control.scale({ position: 'bottomright', imperial: false, metric: true }).addTo(m)
  L.control.zoom({ position: 'topright' }).addTo(m)

  map.value = m
  emit('register-fit-fn', () => m.fitBounds(bounds, fitOpts))

  setTimeout(() => m.invalidateSize(), 100)
  resizeObserver = new ResizeObserver(() => m.invalidateSize())
  resizeObserver.observe(containerRef.value)

  renderMarkersAndEdges()
  renderHeatmap()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  map.value?.remove()
  map.value = null
})

watch(
  () => props.baseLayer,
  (next) => {
    const m = map.value
    if (!m) return
    Object.entries(tileLayers.value).forEach(([key, layer]) => {
      if (key === next) {
        if (!m.hasLayer(layer)) layer.addTo(m)
      } else if (m.hasLayer(layer)) {
        m.removeLayer(layer)
      }
    })
  },
)

watch(
  () => [
    props.showDistances,
    props.showEdges,
    props.showSabbath,
    props.showPopulation,
    props.selectedId,
    props.roadKm,
  ],
  () => renderMarkersAndEdges(),
  { deep: true },
)

watch(
  () => props.showHeatmap,
  () => renderHeatmap(),
)
</script>

<template>
  <div class="map-panel">
    <div class="map-panel__label">
      <span class="map-panel__label-dot map-panel__label-dot--green" />
      Geographic
    </div>
    <div ref="containerRef" class="leaflet-host" />
    <div class="north-arrow" aria-hidden="true">
      <svg viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="rgba(245,237,222,0.92)"
          stroke="#1A1714"
          stroke-width="1"
        />
        <path
          d="M 20 6 L 24 22 L 20 19 L 16 22 Z"
          fill="#7A2E1F"
          stroke="#1A1714"
          stroke-width="0.6"
        />
        <path d="M 20 34 L 24 22 L 20 25 L 16 22 Z" fill="#1A1714" opacity="0.55" />
        <text
          x="20"
          y="13"
          text-anchor="middle"
          font-size="7"
          font-family="IBM Plex Mono, monospace"
          font-weight="700"
          fill="#1A1714"
        >
          N
        </text>
      </svg>
    </div>
  </div>
</template>
