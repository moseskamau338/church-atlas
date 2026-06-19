<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useDistanceSession } from '../../composables/useDistanceSession.js'
import { makeProjector } from '../../services/geo.js'

const props = defineProps({
  // Resolved connection geometry from the shared useRouteGeometry composable.
  lines: { type: Array, default: () => [] },
})

const { state, matrix } = useDistanceSession()

const W = 1000
const PAD = 110

const svgRef = ref(null)
const vp = reactive({ cx: 0.5, cy: 0.5, scale: 1 })

// Markers and labels render at a constant *screen* size by counter-scaling with
// the zoom (1 / scale). That's the key to readable clusters: zooming spreads
// the node positions apart while the glyphs stay the same size, so points that
// overlap at the overview separate as you zoom in.
const inv = computed(() => 1 / vp.scale)
// Keep the overview uncluttered — reveal text only once zoomed in a little.
const showNames = computed(() => vp.scale >= 1.5)
const showEdgeLabels = computed(() => vp.scale >= 1.3)

// One projector covering nodes AND every route vertex, so paths stay in frame.
const projector = computed(() => {
  const anchors = state.locations.map((l) => ({ lat: l.lat, lng: l.lng }))
  for (const ln of props.lines) {
    for (const [lng, lat] of ln.coordinates) anchors.push({ lat, lng })
  }
  return makeProjector(anchors)
})

const toXY = (lng, lat) => {
  const [ux, uy] = projector.value(lng, lat)
  return [PAD + ux * (W - PAD * 2), PAD + uy * (W - PAD * 2)]
}

const nodes = computed(() =>
  state.locations.map((l, i) => {
    const [x, y] = toXY(l.lng, l.lat)
    return { ...l, x, y, index: i + 1 }
  }),
)

const indexById = computed(() => {
  const m = {}
  state.locations.forEach((l, i) => (m[l.id] = i))
  return m
})

const edges = computed(() =>
  props.lines.map((ln) => {
    const pts = ln.coordinates.map(([lng, lat]) => toXY(lng, lat))
    const path = pts
      .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(' ')
    const mid = pts[Math.floor(pts.length / 2)] || pts[0]
    const i = indexById.value[ln.fromId]
    const j = indexById.value[ln.toId]
    const km = matrix.value.distances?.[i]?.[j]
    const fromName = state.locations[i]?.name
    const toName = state.locations[j]?.name
    return {
      key: ln.key,
      path,
      color: ln.color,
      labelX: mid?.[0],
      labelY: mid?.[1],
      km,
      title:
        km != null ? `${fromName} → ${toName}: ${km.toFixed(1)} km` : `${fromName} → ${toName}`,
    }
  }),
)

// Only edges whose distance is known — keeps the label template from touching
// an undefined `km` during the brief gap while a routed matrix is refreshing.
const edgeLabels = computed(() => edges.value.filter((e) => e.km != null))

const viewBox = computed(() => {
  const v = W / vp.scale
  const vx = vp.cx * W - v / 2
  const vy = vp.cy * W - v / 2
  return `${vx} ${vy} ${v} ${v}`
})

// --- pan / zoom (mirrors the church schematic) ---
let dragging = false
let lastX = 0
let lastY = 0
const onMouseDown = (e) => {
  dragging = true
  lastX = e.clientX
  lastY = e.clientY
  svgRef.value.style.cursor = 'grabbing'
}
const onMouseMove = (e) => {
  if (!dragging) return
  const rect = svgRef.value.getBoundingClientRect()
  vp.cx = Math.min(1.4, Math.max(-0.4, vp.cx - (e.clientX - lastX) / rect.width / vp.scale))
  vp.cy = Math.min(1.4, Math.max(-0.4, vp.cy - (e.clientY - lastY) / rect.height / vp.scale))
  lastX = e.clientX
  lastY = e.clientY
}
const onMouseUp = () => {
  dragging = false
  if (svgRef.value) svgRef.value.style.cursor = 'grab'
}
const onWheel = (e) => {
  e.preventDefault()
  const f = e.deltaY < 0 ? 1.12 : 1 / 1.12
  vp.scale = Math.min(12, Math.max(0.5, vp.scale * f))
}
const zoomBy = (f) => {
  vp.scale = Math.min(12, Math.max(0.5, vp.scale * f))
}
const resetView = () => {
  vp.cx = 0.5
  vp.cy = 0.5
  vp.scale = 1
}

onMounted(() => {
  const svg = svgRef.value
  svg.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})
onBeforeUnmount(() => {
  svgRef.value?.removeEventListener('wheel', onWheel)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div class="map-panel">
    <div class="map-panel__label">
      <span class="map-panel__label-dot" />
      Schematic
    </div>

    <div class="schematic-tools __export-hide">
      <button title="Zoom in" @click="zoomBy(1.3)">+</button>
      <button title="Zoom out" @click="zoomBy(1 / 1.3)">−</button>
      <button class="is-text" title="Reset view" @click="resetView">Reset</button>
    </div>

    <svg
      ref="svgRef"
      class="schematic-svg"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      :style="{ cursor: 'grab', background: '#F5EDDE' }"
      @mousedown="onMouseDown"
    >
      <defs>
        <pattern id="toolGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="#1A1714"
            stroke-width="0.25"
            opacity="0.06"
          />
        </pattern>
      </defs>
      <rect x="-500" y="-500" width="2000" height="2000" fill="url(#toolGrid)" />

      <!-- connections: paper casing + colored line, both constant-width -->
      <g v-for="e in edges" :key="e.key">
        <title>{{ e.title }}</title>
        <path
          :d="e.path"
          fill="none"
          stroke="#F5EDDE"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.75"
          vector-effect="non-scaling-stroke"
        />
        <path
          :d="e.path"
          fill="none"
          :stroke="e.color"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.95"
          vector-effect="non-scaling-stroke"
        />
      </g>

      <!-- edge distance labels (constant screen size, revealed on zoom) -->
      <g
        v-for="e in edgeLabels"
        v-show="showEdgeLabels"
        :key="`lbl-${e.key}`"
        :transform="`translate(${e.labelX}, ${e.labelY}) scale(${inv})`"
      >
        <text
          x="0"
          y="-7"
          text-anchor="middle"
          font-size="22"
          font-family="IBM Plex Mono, monospace"
          font-weight="600"
          fill="#1A1714"
          stroke="#F5EDDE"
          stroke-width="5"
          stroke-linejoin="round"
          paint-order="stroke"
        >
          {{ e.km.toFixed(1) }} km
        </text>
      </g>

      <!-- nodes (constant screen size: glyph stays put, cluster spreads on zoom) -->
      <g v-for="n in nodes" :key="n.id" :transform="`translate(${n.x}, ${n.y}) scale(${inv})`">
        <title>{{ n.index }}. {{ n.name }}</title>
        <text
          v-show="showNames"
          x="0"
          y="42"
          text-anchor="middle"
          font-family="EB Garamond, Georgia, serif"
          font-size="26"
          font-weight="600"
          fill="#1A1714"
          stroke="#F5EDDE"
          stroke-width="5"
          stroke-linejoin="round"
          paint-order="stroke"
        >
          {{ n.name }}
        </text>
        <circle r="18" :fill="n.color" stroke="#1A1714" stroke-width="2" />
        <text
          text-anchor="middle"
          y="7"
          font-family="IBM Plex Mono, monospace"
          font-size="20"
          font-weight="600"
          fill="#F5EDDE"
        >
          {{ n.index }}
        </text>
      </g>

      <text
        v-if="!nodes.length"
        :x="W / 2"
        :y="W / 2"
        text-anchor="middle"
        font-family="EB Garamond, Georgia, serif"
        font-style="italic"
        font-size="22"
        fill="#1A1714"
        opacity="0.4"
      >
        Add locations to plot them here
      </text>
    </svg>

    <div class="schematic-caption">
      {{
        state.mode === 'direct'
          ? 'Straight-line · not to scale'
          : `${state.mode} route · not to scale`
      }}
      <template v-if="nodes.length && (!showNames || !showEdgeLabels)">
        · <span class="schematic-caption__hint">zoom in for names &amp; distances</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.schematic-tools {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 1000;
  display: flex;
  gap: 0;
  background: rgba(245, 237, 222, 0.97);
  border: 1px solid var(--ink);
}
.schematic-tools button {
  min-width: 32px;
  padding: 6px 9px;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--rule-soft);
  font-family: var(--mono);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  color: var(--ink);
}
.schematic-tools button.is-text {
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.schematic-tools button:last-child {
  border-right: 0;
}
.schematic-tools button:hover {
  background: var(--ink);
  color: var(--paper);
}
.schematic-caption {
  position: absolute;
  bottom: 12px;
  left: 14px;
  z-index: 1000;
  pointer-events: none;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(26, 23, 20, 0.55);
}
.schematic-caption__hint {
  color: var(--burgundy);
}
</style>
