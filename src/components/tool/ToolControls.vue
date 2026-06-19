<script setup>
import { useDistanceSession } from '../../composables/useDistanceSession.js'
import ModeSwitcher from './ModeSwitcher.vue'

defineProps({
  // 'row' for the desktop toolbar, 'column' for the mobile drawer.
  layout: { type: String, default: 'row' },
})

const { state } = useDistanceSession()

const CONNECTION_MODES = [
  { id: 'all', label: 'All pairs' },
  { id: 'origin', label: 'From origin' },
  { id: 'none', label: 'None' },
]
</script>

<template>
  <div class="tool-controls" :class="`tool-controls--${layout}`">
    <div class="tool-controls__group">
      <span class="tool-controls__label">Mode</span>
      <ModeSwitcher v-model="state.mode" />
    </div>
    <div class="tool-controls__group">
      <span class="tool-controls__label">Connections</span>
      <div class="seg">
        <button
          v-for="c in CONNECTION_MODES"
          :key="c.id"
          class="seg__btn"
          :class="{ 'is-active': state.connectionMode === c.id }"
          @click="state.connectionMode = c.id"
        >
          {{ c.label }}
        </button>
      </div>
    </div>
    <label class="tool-controls__toggle">
      <input v-model="state.showDurations" type="checkbox" />
      <span>Show travel time</span>
    </label>
  </div>
</template>

<style scoped>
.tool-controls {
  display: flex;
  gap: 18px 24px;
}
.tool-controls--row {
  align-items: center;
  flex-wrap: wrap;
}
.tool-controls--column {
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
}
.tool-controls__group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tool-controls--column .tool-controls__group {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.tool-controls__label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(26, 23, 20, 0.55);
}
.seg {
  display: inline-flex;
  border: 1px solid var(--ink);
  background: rgba(245, 237, 222, 0.97);
}
.tool-controls--column .seg {
  width: 100%;
}
.seg__btn {
  flex: 1;
  padding: 8px 13px;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--rule-soft);
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  color: var(--ink);
  white-space: nowrap;
}
.seg__btn:last-child {
  border-right: 0;
}
.seg__btn.is-active {
  background: var(--burgundy);
  color: var(--paper);
}
.tool-controls__toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(26, 23, 20, 0.7);
  cursor: pointer;
}
</style>
