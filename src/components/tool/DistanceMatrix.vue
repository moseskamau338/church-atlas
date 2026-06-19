<script setup>
import { computed } from 'vue'
import { useDistanceSession } from '../../composables/useDistanceSession.js'

const { state, matrix, routed, isDirect } = useDistanceSession()

const locs = computed(() => state.locations)

const modeLabel = computed(
  () =>
    ({
      direct: 'Direct (straight-line)',
      driving: 'Driving',
      walking: 'Walking',
      cycling: 'Cycling',
    })[state.mode],
)

// Min / max off-diagonal distance for highlighting extremes.
const extremes = computed(() => {
  const d = matrix.value.distances
  if (!d) return { min: null, max: null }
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < d.length; i++) {
    for (let j = 0; j < d.length; j++) {
      if (i === j) continue
      const v = d[i][j]
      if (v == null) continue
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  return { min: min === Infinity ? null : min, max: max === -Infinity ? null : max }
})

function cellClass(i, j) {
  if (i === j) return 'is-diag'
  const v = matrix.value.distances?.[i]?.[j]
  if (v == null) return ''
  if (
    extremes.value.max != null &&
    v === extremes.value.max &&
    extremes.value.min !== extremes.value.max
  )
    return 'is-max'
  if (extremes.value.min != null && v === extremes.value.min) return 'is-min'
  return ''
}

const showDur = computed(() => state.showDurations && !isDirect.value && matrix.value.durations)
</script>

<template>
  <section class="matrix">
    <div class="matrix__head">
      <h2 class="matrix__title">Distance Matrix</h2>
      <div class="matrix__meta">
        <span class="matrix__mode">{{ modeLabel }}</span>
        <span class="matrix__unit">km{{ showDur ? ' · min' : '' }}</span>
      </div>
    </div>

    <p v-if="locs.length < 2" class="matrix__empty">
      Add at least two locations to see distances between every point.
    </p>

    <p v-else-if="routed.loading && !matrix.ready" class="matrix__status">
      <span class="ctl-spinner matrix__spinner" /> Routing {{ modeLabel.toLowerCase() }} distances…
    </p>

    <p
      v-else-if="routed.error && !isDirect && !matrix.ready"
      class="matrix__status matrix__status--error"
    >
      {{ routed.error }}
    </p>

    <div v-else-if="matrix.ready" class="matrix__scroll">
      <table class="matrix__table">
        <thead>
          <tr>
            <th class="matrix__corner" aria-hidden="true"></th>
            <th v-for="(c, j) in locs" :key="c.id" class="matrix__colhead">
              <span class="matrix__swatch" :style="{ background: c.color }">{{ j + 1 }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in locs" :key="r.id">
            <th class="matrix__rowhead">
              <span class="matrix__swatch" :style="{ background: r.color }">{{ i + 1 }}</span>
              <span class="matrix__rowname">{{ r.name }}</span>
            </th>
            <td v-for="(c, j) in locs" :key="c.id" class="matrix__cell" :class="cellClass(i, j)">
              <template v-if="i === j">·</template>
              <template v-else-if="matrix.distances[i][j] == null">—</template>
              <template v-else>
                <span class="matrix__km">{{ matrix.distances[i][j].toFixed(1) }}</span>
                <span v-if="showDur" class="matrix__min">{{ matrix.durations[i][j] }}′</span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="matrix.ready && locs.length >= 2" class="matrix__legend">
      <span class="matrix__legend-item"><i class="dot dot--min" /> shortest</span>
      <span class="matrix__legend-item"><i class="dot dot--max" /> longest</span>
      <span v-if="!isDirect" class="matrix__legend-note">rows = from · columns = to</span>
    </div>
  </section>
</template>

<style scoped>
.matrix {
  border: 1px solid var(--rule);
  background: var(--paper);
  padding: 16px 18px 18px;
}
.matrix__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--rule);
  padding-bottom: 8px;
  margin-bottom: 12px;
}
.matrix__title {
  margin: 0;
  font-family: var(--serif);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.matrix__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.matrix__mode {
  background: var(--ink);
  color: var(--paper);
  padding: 3px 8px;
}
.matrix__unit {
  color: rgba(26, 23, 20, 0.55);
}
.matrix__empty,
.matrix__status {
  font-family: var(--serif);
  font-style: italic;
  font-size: 15px;
  color: rgba(26, 23, 20, 0.6);
  display: flex;
  align-items: center;
  gap: 8px;
}
.matrix__status--error {
  font-style: normal;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--burgundy);
}
.matrix__spinner {
  border-color: var(--rule-soft);
  border-top-color: var(--burgundy);
}
.matrix__scroll {
  overflow-x: auto;
}
.matrix__table {
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.matrix__corner,
.matrix__colhead,
.matrix__rowhead,
.matrix__cell {
  border: 1px solid var(--rule-vsoft);
}
.matrix__colhead {
  padding: 6px;
  text-align: center;
}
.matrix__rowhead {
  padding: 6px 10px 6px 6px;
  text-align: left;
  white-space: nowrap;
  position: sticky;
  left: 0;
  background: var(--paper);
}
.matrix__rowhead {
  display: table-cell;
}
.matrix__swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: var(--paper);
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 600;
  vertical-align: middle;
}
.matrix__rowname {
  font-family: var(--serif);
  font-size: 13px;
  font-weight: 600;
  margin-left: 8px;
}
.matrix__cell {
  padding: 7px 12px;
  text-align: center;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink);
  min-width: 56px;
}
.matrix__cell.is-diag {
  background: rgba(26, 23, 20, 0.05);
  color: rgba(26, 23, 20, 0.3);
}
.matrix__cell.is-min {
  background: rgba(58, 79, 46, 0.16);
  font-weight: 600;
}
.matrix__cell.is-max {
  background: rgba(122, 46, 31, 0.13);
  font-weight: 600;
}
.matrix__km {
  display: block;
}
.matrix__min {
  display: block;
  font-size: 9.5px;
  color: rgba(26, 23, 20, 0.5);
}
.matrix__legend {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: rgba(26, 23, 20, 0.6);
}
.matrix__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.dot {
  width: 9px;
  height: 9px;
  display: inline-block;
}
.dot--min {
  background: rgba(58, 79, 46, 0.45);
}
.dot--max {
  background: rgba(122, 46, 31, 0.4);
}
.matrix__legend-note {
  margin-left: auto;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
</style>
