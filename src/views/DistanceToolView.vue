<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toPng } from 'html-to-image'
import { useDistanceSession } from '../composables/useDistanceSession.js'
import { useRouteGeometry } from '../composables/useRouteGeometry.js'
import { encodeSession, decodeSession } from '../services/share-link.js'
import ToolHeader from '../components/tool/ToolHeader.vue'
import ToolControls from '../components/tool/ToolControls.vue'
import LocationSearch from '../components/tool/LocationSearch.vue'
import LocationList from '../components/tool/LocationList.vue'
import DistanceMatrix from '../components/tool/DistanceMatrix.vue'
import ToolSchematicMap from '../components/tool/ToolSchematicMap.vue'
import ToolGeographicMap from '../components/tool/ToolGeographicMap.vue'

// Single source of truth for the tool's display name — rename here.
const TOOL_NAME = 'Traverse'

const route = useRoute()
const router = useRouter()
const { state, points, edgeIndices, addLocation, hydrate } = useDistanceSession()
const { lines } = useRouteGeometry({ points, state, edgeIndices })

const exporting = ref(false)
const drawerOpen = ref(false)
const share = reactive({ copied: false })

// Bias place search toward the centroid of what's already on the map.
const proximity = computed(() => {
  if (!state.locations.length) return null
  const n = state.locations.length
  const lat = state.locations.reduce((s, l) => s + l.lat, 0) / n
  const lng = state.locations.reduce((s, l) => s + l.lng, 0) / n
  return { lat, lng }
})

// --- shareable link ---
async function handleShare() {
  const s = encodeSession(state)
  const href = window.location.origin + router.resolve({ name: 'traverse', query: { s } }).href
  try {
    await navigator.clipboard.writeText(href)
    share.copied = true
    setTimeout(() => (share.copied = false), 2200)
  } catch {
    window.prompt('Copy this shareable link:', href)
  }
}

// Load a session that was passed in via ?s=, then strip it from the URL so the
// address bar stays clean while editing. The session lives on in localStorage.
onMounted(() => {
  const s = route.query.s
  if (typeof s === 'string' && s) {
    const snap = decodeSession(s)
    if (snap && snap.locations.length) {
      hydrate(snap)
      router.replace({ name: 'traverse' })
    }
  }
})

function onKeydown(e) {
  if (e.key === 'Escape') drawerOpen.value = false
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

async function handleExport() {
  exporting.value = true
  try {
    const node = document.getElementById('tool-export-root')
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      backgroundColor: '#F5EDDE',
      cacheBust: true,
      filter: (n) =>
        !(
          n.classList &&
          (n.classList.contains('__export-hide') ||
            n.classList.contains('mapboxgl-control-container'))
        ),
    })
    const link = document.createElement('a')
    link.download = `${TOOL_NAME}_${new Date().toISOString().slice(0, 10)}.png`
    link.href = dataUrl
    link.click()
  } catch (err) {
    console.error('Export failed:', err)
    alert('Export failed — see console for details.')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="app">
    <div id="tool-export-root" class="export-root">
      <ToolHeader
        :title="TOOL_NAME"
        tagline="Add locations · measure every distance · driving · walking · cycling · direct"
        :exporting="exporting"
        :can-share="state.locations.length > 0"
        :share-copied="share.copied"
        @export="handleExport"
        @share="handleShare"
      />

      <!-- Desktop: controls inline above the grid -->
      <ToolControls layout="row" class="tool-toolbar tool-only-desktop" />

      <!-- Mobile: a button that opens the configuration/places drawer -->
      <button class="drawer-trigger tool-only-mobile __export-hide" @click="drawerOpen = true">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <path
            d="M3 6h18M3 12h18M3 18h18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <span>Configure &amp; places</span>
        <span v-if="state.locations.length" class="drawer-trigger__count">{{
          state.locations.length
        }}</span>
      </button>

      <div class="tool-grid">
        <aside class="tool-side tool-only-desktop">
          <LocationSearch :proximity="proximity" @add="addLocation" />
          <LocationList />
        </aside>

        <main class="map-stage tool-stage">
          <ToolSchematicMap :lines="lines" />
          <ToolGeographicMap :lines="lines" />
        </main>
      </div>

      <DistanceMatrix />
    </div>

    <!-- Mobile drawer (controls + places) -->
    <Transition name="scrim">
      <div
        v-if="drawerOpen"
        class="drawer-scrim tool-only-mobile __export-hide"
        @click="drawerOpen = false"
      />
    </Transition>
    <Transition name="drawer">
      <aside v-if="drawerOpen" class="drawer tool-only-mobile __export-hide">
        <header class="drawer__head">
          <span class="drawer__title">Configure &amp; places</span>
          <button class="drawer__close" aria-label="Close" @click="drawerOpen = false">✕</button>
        </header>
        <div class="drawer__body">
          <ToolControls layout="column" />
          <hr class="drawer__rule" />
          <LocationSearch :proximity="proximity" @add="addLocation" />
          <LocationList />
        </div>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.tool-toolbar {
  padding: 12px 2px 16px;
}
.tool-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  margin-bottom: 14px;
}
.tool-side {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--rule);
  background: var(--paper);
  padding: 14px;
  max-height: clamp(320px, calc(100vh - 310px), 620px);
}
.tool-stage {
  margin-bottom: 0;
}

/* responsive show/hide helpers */
.tool-only-mobile {
  display: none;
}

@media (max-width: 1080px) {
  .tool-grid {
    grid-template-columns: 1fr;
  }
  .tool-only-desktop {
    display: none !important;
  }
  .tool-only-mobile {
    display: flex;
  }
}

/* mobile drawer trigger */
.drawer-trigger {
  align-items: center;
  gap: 9px;
  width: 100%;
  margin: 12px 0 14px;
  padding: 12px 14px;
  background: var(--ink);
  color: var(--paper);
  border: 0;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
}
.drawer-trigger__count {
  margin-left: auto;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--burgundy);
  color: var(--paper);
  font-size: 11px;
}

/* drawer + scrim */
.drawer-scrim {
  position: fixed;
  inset: 0;
  z-index: 3400;
  background: rgba(26, 23, 20, 0.45);
}
.drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 3500;
  width: min(86vw, 360px);
  flex-direction: column;
  background: var(--paper);
  border-right: 1px solid var(--ink);
  box-shadow: 0 0 40px -8px rgba(26, 23, 20, 0.5);
}
.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--rule);
}
.drawer__title {
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 600;
}
.drawer__close {
  border: 0;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: var(--ink);
  padding: 2px 6px;
}
.drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
}
.drawer__rule {
  border: 0;
  border-top: 1px solid var(--rule-soft);
  margin: 16px 0 4px;
  width: 100%;
}

/* transitions */
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.26s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(-100%);
}
.scrim-enter-active,
.scrim-leave-active {
  transition: opacity 0.26s ease;
}
.scrim-enter-from,
.scrim-leave-to {
  opacity: 0;
}
</style>
