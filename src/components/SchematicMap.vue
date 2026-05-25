<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import ChurchGlyph from './ChurchGlyph.vue'

const props = defineProps({
  data: { type: Object, required: true },
  roadKm: { type: Object, default: () => ({}) },
  showDistances: { type: Boolean, default: true },
  showPopulation: { type: Boolean, default: true },
  showEdges: { type: Boolean, default: true },
  showSabbath: { type: Boolean, default: true },
  selectedId: { type: String, default: null },
  paperTone: { type: String, default: 'cream' },
  resetSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['select'])

const W = 720
const H = 720

const svgRef = ref(null)
const vp = reactive({ cx: 0.5, cy: 0.5, scale: 1 })

watch(
  () => props.resetSignal,
  () => {
    vp.cx = 0.5
    vp.cy = 0.5
    vp.scale = 1
  },
)

const paperFill = computed(() => {
  if (props.paperTone === 'sepia') return '#EDDFC4'
  if (props.paperTone === 'parchment') return '#EFE6D2'
  return '#F5EDDE'
})

// Project each church + its sabbath schools into SVG coordinates.
const placed = computed(() => {
  const pad = 90
  const project = (n) => ({
    ...n,
    x: pad + n.sx * (W - pad * 2),
    y: pad + n.sy * (H - pad * 2),
  })
  return props.data.churches.map((c) => ({
    ...project(c),
    _sabbath: (c.sabbathSchools || []).map((ss) =>
      project({ ...ss, parentId: c.id, fullId: `${c.id}__${ss.id}` }),
    ),
  }))
})

const byId = computed(() => {
  const m = {}
  placed.value.forEach((c) => {
    m[c.id] = c
    c._sabbath.forEach((ss) => {
      m[ss.fullId] = ss
    })
  })
  return m
})

const viewBox = computed(() => {
  const vw = W / vp.scale
  const vh = H / vp.scale
  const vx = vp.cx * W - vw / 2
  const vy = vp.cy * H - vh / 2
  return { vx, vy, vw, vh, str: `${vx} ${vy} ${vw} ${vh}` }
})

const motherEdges = computed(() => {
  if (!props.showEdges) return []
  return props.data.edges
    .map((edge) => {
      const a = byId.value[edge.from]
      const b = byId.value[edge.to]
      if (!a || !b) return null
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const nx = -dy / len
      const ny = dx / len
      return {
        key: `${edge.from}__${edge.to}`,
        a,
        b,
        labelX: mx + nx * 18,
        labelY: my + ny * 18,
        km: props.roadKm[`${edge.from}__${edge.to}`] ?? edge.km,
      }
    })
    .filter(Boolean)
})

const sabbathEdges = computed(() => {
  if (!props.showEdges || !props.showSabbath) return []
  return props.data.sabbathEdges
    .map((edge) => {
      const a = byId.value[edge.from]
      const b = byId.value[edge.to]
      if (!a || !b) return null
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const nx = -dy / len
      const ny = dx / len
      return {
        key: `ss-edge-${edge.from}__${edge.to}`,
        a,
        b,
        labelX: mx + nx * 14,
        labelY: my + ny * 14,
        km: props.roadKm[`${edge.from}__${edge.to}`] ?? edge.km,
      }
    })
    .filter(Boolean)
})

const sabbathNodes = computed(() =>
  props.showSabbath ? placed.value.flatMap((c) => c._sabbath) : [],
)

let dragging = false
let lastX = 0
let lastY = 0

const onMouseDown = (e) => {
  if (e.target.closest('[data-church]')) return
  dragging = true
  lastX = e.clientX
  lastY = e.clientY
  svgRef.value.style.cursor = 'grabbing'
}
const onMouseMove = (e) => {
  if (!dragging) return
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
  const rect = svgRef.value.getBoundingClientRect()
  const cvw = W / vp.scale
  const cvh = H / vp.scale
  const ndx = (dx / rect.width) * (cvw / W)
  const ndy = (dy / rect.height) * (cvh / H)
  vp.cx = Math.min(1.4, Math.max(-0.4, vp.cx - ndx))
  vp.cy = Math.min(1.4, Math.max(-0.4, vp.cy - ndy))
}
const onMouseUp = () => {
  dragging = false
  if (svgRef.value) svgRef.value.style.cursor = 'grab'
}
const onWheel = (e) => {
  e.preventDefault()
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
  vp.scale = Math.min(6, Math.max(0.5, vp.scale * factor))
}

onMounted(() => {
  const svg = svgRef.value
  svg.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  svg.addEventListener('wheel', onWheel, { passive: false })
})
onBeforeUnmount(() => {
  const svg = svgRef.value
  if (svg) {
    svg.removeEventListener('mousedown', onMouseDown)
    svg.removeEventListener('wheel', onWheel)
  }
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
    <svg
      ref="svgRef"
      class="schematic-svg"
      :viewBox="viewBox.str"
      preserveAspectRatio="xMidYMid meet"
      :style="{ cursor: 'grab', background: paperFill }"
    >
      <defs>
        <pattern
          id="paperHatch"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="#1A1714" stroke-width="0.3" opacity="0.05" />
        </pattern>
        <pattern id="paperGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="#1A1714"
            stroke-width="0.25"
            opacity="0.06"
          />
        </pattern>
      </defs>
      <rect
        :x="viewBox.vx"
        :y="viewBox.vy"
        :width="viewBox.vw"
        :height="viewBox.vh"
        fill="url(#paperGrid)"
      />
      <rect
        :x="viewBox.vx"
        :y="viewBox.vy"
        :width="viewBox.vw"
        :height="viewBox.vh"
        fill="url(#paperHatch)"
      />

      <g :transform="`translate(${W - 70}, 70)`" opacity="0.55">
        <circle r="22" fill="none" stroke="#1A1714" stroke-width="0.8" />
        <path d="M 0 -22 L 4 0 L 0 22 L -4 0 Z" fill="#1A1714" opacity="0.7" />
        <text
          text-anchor="middle"
          y="-28"
          font-size="10"
          font-family="IBM Plex Mono, monospace"
          fill="#1A1714"
          letter-spacing="1.5"
        >
          N
        </text>
      </g>

      <text
        :x="90"
        :y="H - 50"
        font-family="IBM Plex Mono, monospace"
        font-size="9"
        letter-spacing="2"
        fill="#1A1714"
        opacity="0.55"
      >
        NOT TO SCALE · NODE · LINK · KM
      </text>

      <g v-for="edge in motherEdges" :key="edge.key">
        <line
          :x1="edge.a.x"
          :y1="edge.a.y"
          :x2="edge.b.x"
          :y2="edge.b.y"
          stroke="#1A1714"
          stroke-width="1.6"
          stroke-linecap="round"
          opacity="0.82"
        />
        <circle :cx="edge.a.x" :cy="edge.a.y" r="3" fill="#1A1714" opacity="0.85" />
        <circle :cx="edge.b.x" :cy="edge.b.y" r="3" fill="#1A1714" opacity="0.85" />
        <text
          v-if="showDistances"
          :x="edge.labelX"
          :y="edge.labelY + 4"
          text-anchor="middle"
          font-size="13"
          font-family="IBM Plex Mono, monospace"
          fill="#1A1714"
          font-weight="600"
          :stroke="paperFill"
          stroke-width="4"
          stroke-linejoin="round"
          paint-order="stroke"
        >
          {{ edge.km }} km
        </text>
      </g>

      <g v-for="edge in sabbathEdges" :key="edge.key">
        <line
          :x1="edge.a.x"
          :y1="edge.a.y"
          :x2="edge.b.x"
          :y2="edge.b.y"
          stroke="#1A1714"
          stroke-width="1"
          stroke-linecap="round"
          stroke-dasharray="3 3"
          opacity="0.55"
        />
        <text
          v-if="showDistances"
          :x="edge.labelX"
          :y="edge.labelY + 3.5"
          text-anchor="middle"
          font-size="10"
          font-family="IBM Plex Mono, monospace"
          fill="#1A1714"
          font-weight="600"
          opacity="0.95"
          :stroke="paperFill"
          stroke-width="3"
          stroke-linejoin="round"
          paint-order="stroke"
        >
          {{ edge.km }} km
        </text>
      </g>

      <g
        v-for="ss in sabbathNodes"
        :key="ss.fullId"
        :data-sabbath="ss.fullId"
        :transform="`translate(${ss.x}, ${ss.y})`"
      >
        <circle r="5" fill="#F5EDDE" stroke="#1A1714" stroke-width="1.2" />
        <circle r="2" fill="#3A4F2E" />
        <text
          x="0"
          y="20"
          text-anchor="middle"
          font-family="EB Garamond, Georgia, serif"
          font-style="italic"
          font-size="13"
          font-weight="500"
          fill="#1A1714"
          opacity="0.95"
          :stroke="paperFill"
          stroke-width="3"
          stroke-linejoin="round"
          paint-order="stroke"
        >
          {{ ss.name }}
        </text>
      </g>

      <g
        v-for="c in placed"
        :key="c.id"
        :data-church="c.id"
        :transform="`translate(${c.x}, ${c.y})`"
        :style="{ cursor: 'pointer' }"
        @click="emit('select', c.id)"
      >
        <circle
          v-if="selectedId === c.id"
          r="34"
          fill="none"
          stroke="#7A2E1F"
          stroke-width="1.5"
          stroke-dasharray="3 3"
          opacity="0.7"
        />
        <ChurchGlyph :size="36" color="#7A2E1F" />
        <text
          x="0"
          y="38"
          text-anchor="middle"
          font-family="EB Garamond, Georgia, serif"
          font-size="18"
          font-weight="600"
          letter-spacing="1.4"
          fill="#1A1714"
          :stroke="paperFill"
          stroke-width="3.5"
          stroke-linejoin="round"
          paint-order="stroke"
          :style="{ textTransform: 'uppercase' }"
        >
          {{ c.name.replace(' SDA', '') }}
        </text>
      </g>
    </svg>
  </div>
</template>
