<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, required: true },
})

// Injected by Vite (see vite.config.js `define`). Sourced from package.json so
// release-please's version bump shows up in the UI without any extra wiring.
const version = __APP_VERSION__

// Curated stats: drop the technical ones (reachable pop "est.", wards "adm",
// avg-distance "km") that confused non-technical readers. The atlas already
// communicates geography via the maps — the footer only needs human counts.
const stats = computed(() => {
  const s = props.data.summary
  return [
    { label: 'Churches', value: s.totalChurches },
    { label: 'Sabbath Schools', value: s.totalSabbath },
    { label: 'Membership', value: s.totalMembers.toLocaleString() },
  ]
})
</script>

<template>
  <footer class="colophon">
    <div class="colophon__rule" />
    <div class="colophon__inner">
      <div class="colophon__stats">
        <template v-for="(stat, i) in stats" :key="stat.label">
          <div v-if="i > 0" class="stat-divider" aria-hidden="true" />
          <div class="stat">
            <div class="stat__label">{{ stat.label }}</div>
            <div class="stat__value">{{ stat.value }}</div>
          </div>
        </template>
      </div>

      <div class="colophon__signature">
        <div class="colophon__signature-label">{{ data.district.leaderTitle }}</div>
        <div class="colophon__signature-name">{{ data.district.leader }}</div>
      </div>
    </div>
    <div class="colophon__byline">
      <span>Updated {{ data.district.updated }}</span>
      <span>
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          class="colophon__license-link"
          >CC BY 4.0</a
        >
      </span>
      <span class="colophon__version">v{{ version }}</span>
    </div>
  </footer>
</template>
