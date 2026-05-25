<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, required: true },
})

const stats = computed(() => {
  const s = props.data.summary
  return [
    { label: 'Churches', value: s.totalChurches, unit: 'local' },
    { label: 'Sabbath Schools', value: s.totalSabbath, unit: 'branches' },
    { label: 'Membership', value: s.totalMembers.toLocaleString(), unit: 'souls' },
    { label: 'Reachable Pop.', value: s.reachablePop.toLocaleString(), unit: 'people · est.' },
    { label: 'Wards Covered', value: s.wardsCovered, unit: 'adm' },
    { label: 'Avg Distance', value: s.avgEdgeKm, unit: 'km' },
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
            <div class="stat__unit">{{ stat.unit }}</div>
          </div>
        </template>
      </div>

      <div class="colophon__signature">
        <div class="colophon__signature-label">{{ data.district.leaderTitle }}</div>
        <div class="colophon__signature-name">{{ data.district.leader }}</div>
      </div>
    </div>
    <div class="colophon__byline">
      <span>Plate · I</span>
      <span>Compiled from CMS records, May 2026</span>
      <span>Road distances · OSRM (great-circle fallback)</span>
    </div>
    <div class="colophon__license">
      <span>Population data · KNBS Kenya Population &amp; Housing Census, Volume 1 (2019)</span>
      <span class="colophon__license-sep">·</span>
      <span>
        Licensed under
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          class="colophon__license-link"
          >CC BY 4.0</a
        >
      </span>
    </div>
  </footer>
</template>
