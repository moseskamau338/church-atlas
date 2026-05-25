<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { TILE_LAYERS } from './tile-layers.js'

defineProps({
  baseLayer: { type: String, required: true },
  tweaks: { type: Object, required: true },
})
const emit = defineEmits(['close', 'base-layer-change', 'set-tweak'])

const panelRef = ref(null)

const onDoc = (e) => {
  if (panelRef.value && !panelRef.value.contains(e.target)) {
    if (e.target.closest('[data-more-btn]')) return
    emit('close')
  }
}
const onKey = (e) => {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('mousedown', onDoc)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDoc)
  document.removeEventListener('keydown', onKey)
})

const toneOptions = [
  { value: 'cream', label: 'Cream', swatch: '#F5EDDE' },
  { value: 'parchment', label: 'Parchment', swatch: '#EFE6D2' },
  { value: 'sepia', label: 'Sepia', swatch: '#EDDFC4' },
]

const toggles = [
  { key: 'showDistances', label: 'Distance labels' },
  { key: 'showPopulation', label: 'Member counts' },
  { key: 'showEdges', label: 'Edges (connections)' },
  { key: 'showSabbath', label: 'Sabbath schools' },
  { key: 'showHeatmap', label: 'Membership heatmap' },
]
</script>

<template>
  <div ref="panelRef" class="more-panel __export-hide">
    <div class="more-panel__arrow" aria-hidden="true" />

    <div class="more-panel__section">
      <div class="more-panel__label">Base Map</div>
      <div class="more-panel__grid more-panel__grid--2">
        <button
          v-for="(conf, key) in TILE_LAYERS"
          :key="key"
          :class="['more-chip', { 'is-active': baseLayer === key }]"
          @click="$emit('base-layer-change', key)"
        >
          <span class="more-chip__dot" :data-layer="key" />
          {{ conf.label }}
        </button>
      </div>
    </div>

    <div class="more-panel__section">
      <div class="more-panel__label">Display</div>
      <button
        v-for="row in toggles"
        :key="row.key"
        type="button"
        :class="['toggle-row', { 'is-on': tweaks[row.key] }]"
        @click="$emit('set-tweak', row.key, !tweaks[row.key])"
      >
        <span class="toggle-row__label">{{ row.label }}</span>
        <span class="toggle-row__switch" aria-hidden="true">
          <span class="toggle-row__knob" />
        </span>
      </button>
    </div>

    <div class="more-panel__section">
      <div class="more-panel__label">Paper Tone</div>
      <div class="more-panel__grid more-panel__grid--3">
        <button
          v-for="o in toneOptions"
          :key="o.value"
          :class="['more-chip', { 'is-active': tweaks.paperTone === o.value }]"
          @click="$emit('set-tweak', 'paperTone', o.value)"
        >
          <span class="more-chip__swatch" :style="{ background: o.swatch }" />
          {{ o.label }}
        </button>
      </div>
    </div>
  </div>
</template>
