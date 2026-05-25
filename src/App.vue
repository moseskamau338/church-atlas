<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue'
import { toPng } from 'html-to-image'
import churchData from './data/church-data.js'
import { resolveRoadDistance } from './data/road-distances.js'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import SchematicMap from './components/SchematicMap.vue'
import GeographicMap from './components/GeographicMap.vue'
import MapLegend from './components/MapLegend.vue'
import ChurchCard from './components/ChurchCard.vue'

const data = churchData

const baseLayer = ref('satellite')
const selectedId = ref(null)
const showCardPanel = ref(false)
const showMore = ref(false)
const exporting = ref(false)
const resetSignal = ref(0)
const roadKm = reactive({})

// Display tweaks — mirrors the EDITMODE block from the prototype.
const tweaks = reactive({
  showPopulation: true,
  showEdges: true,
  showDistances: true,
  showSabbath: true,
  paperTone: 'cream',
  showHeatmap: false,
})
const setTweak = (k, v) => {
  tweaks[k] = v
}

// `fitFn` lives on the geographic map and is registered by it on mount.
const fitFn = shallowRef(null)
const registerFitFn = (fn) => {
  fitFn.value = fn
}

const selectedChurch = computed(() =>
  selectedId.value ? data.churches.find((c) => c.id === selectedId.value) : null,
)
const selectedWard = computed(() =>
  selectedChurch.value ? data.wards.find((w) => w.id === selectedChurch.value.ward) : null,
)

function handleSelect(id) {
  selectedId.value = id
  showCardPanel.value = true
}

function handleFit() {
  fitFn.value?.()
  resetSignal.value += 1
}

function handleCloseCard() {
  showCardPanel.value = false
  selectedId.value = null
}

async function handleExport() {
  exporting.value = true
  try {
    const node = document.getElementById('export-root')
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      backgroundColor: '#F5EDDE',
      cacheBust: true,
      filter: (n) => {
        if (
          n.classList &&
          (n.classList.contains('__export-hide') ||
            n.classList.contains('leaflet-control-zoom') ||
            n.classList.contains('leaflet-control-attribution'))
        ) {
          return false
        }
        return true
      },
    })
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    link.download = `${data.district.name.replace(/\s+/g, '_')}_${stamp}.png`
    link.href = dataUrl
    link.click()
  } catch (err) {
    console.error('Export failed:', err)

    alert('Export failed — see console for details.')
  } finally {
    exporting.value = false
  }
}

// Resolve real road distances via OSRM on mount.
let cancelled = false
onMounted(async () => {
  const tasks = []
  data.edges.forEach((e) => {
    const a = data.churches.find((c) => c.id === e.from)
    const b = data.churches.find((c) => c.id === e.to)
    if (a && b) tasks.push({ key: `${e.from}__${e.to}`, a, b })
  })
  data.sabbathEdges.forEach((e) => {
    const a = data.churches.find((c) => c.id === e.from)
    const b = data.sabbathSchools.find((s) => s.fullId === e.to)
    if (a && b) tasks.push({ key: `${e.from}__${e.to}`, a, b })
  })
  for (const t of tasks) {
    const km = await resolveRoadDistance(t.a, t.b)
    if (cancelled) return
    if (km != null) roadKm[t.key] = km
  }
})
onBeforeUnmount(() => {
  cancelled = true
})
</script>

<template>
  <div :class="['app', `paper-${tweaks.paperTone}`]">
    <div id="export-root" class="export-root">
      <AppHeader
        :data="data"
        :exporting="exporting"
        :show-card-panel="showCardPanel"
        :show-more="showMore"
        :base-layer="baseLayer"
        :tweaks="tweaks"
        @export="handleExport"
        @fit="handleFit"
        @toggle-more="showMore = !showMore"
        @close-more="showMore = false"
        @base-layer-change="baseLayer = $event"
        @set-tweak="setTweak"
      />

      <main class="map-stage">
        <SchematicMap
          :data="data"
          :road-km="roadKm"
          :show-distances="tweaks.showDistances"
          :show-population="tweaks.showPopulation"
          :show-edges="tweaks.showEdges"
          :show-sabbath="tweaks.showSabbath"
          :selected-id="selectedId"
          :paper-tone="tweaks.paperTone"
          :reset-signal="resetSignal"
          @select="handleSelect"
        />
        <GeographicMap
          :data="data"
          :road-km="roadKm"
          :base-layer="baseLayer"
          :show-distances="tweaks.showDistances"
          :show-edges="tweaks.showEdges"
          :show-sabbath="tweaks.showSabbath"
          :show-population="tweaks.showPopulation"
          :show-heatmap="tweaks.showHeatmap"
          :selected-id="selectedId"
          @select="handleSelect"
          @register-fit-fn="registerFitFn"
        />
      </main>

      <MapLegend :show-heatmap="tweaks.showHeatmap" :show-sabbath="tweaks.showSabbath" />
      <AppFooter :data="data" />
    </div>

    <ChurchCard
      v-if="showCardPanel && selectedChurch"
      :church="selectedChurch"
      :ward="selectedWard"
      @close="handleCloseCard"
    />
  </div>
</template>
