<script setup>
import { MODES } from '../../composables/useDistanceSession.js'
import { hasMapboxToken } from '../../services/mapbox.js'

defineProps({
  modelValue: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])

const tokenOk = hasMapboxToken()
// Direct mode never needs the network; routed modes do.
const isDisabled = (id) => id !== 'direct' && !tokenOk
</script>

<template>
  <div class="mode-switcher" role="group" aria-label="Travel mode">
    <button
      v-for="m in MODES"
      :key="m.id"
      type="button"
      class="mode-btn"
      :class="{ 'is-active': modelValue === m.id }"
      :disabled="isDisabled(m.id)"
      :title="isDisabled(m.id) ? 'Add a Mapbox token to enable routed modes' : m.hint"
      @click="emit('update:modelValue', m.id)"
    >
      {{ m.label }}
    </button>
  </div>
</template>

<style scoped>
.mode-switcher {
  display: inline-flex;
  border: 1px solid var(--ink);
  background: rgba(245, 237, 222, 0.97);
}
.mode-btn {
  padding: 8px 14px;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--rule-soft);
  font-family: var(--mono);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  color: var(--ink);
  transition: background 100ms;
}
.mode-btn:last-child {
  border-right: 0;
}
.mode-btn:hover:not(:disabled) {
  background: rgba(26, 23, 20, 0.08);
}
.mode-btn.is-active {
  background: var(--burgundy);
  color: var(--paper);
}
.mode-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
</style>
