<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { hasMapboxToken } from '../../services/mapbox.js'
import { searchPlaces } from '../../services/place-search.js'

const props = defineProps({
  // Map centre used to bias geocoding toward what the user is looking at.
  proximity: { type: Object, default: null },
})
const emit = defineEmits(['add'])

const tokenOk = hasMapboxToken()
const query = ref('')
const results = ref([])
const open = ref(false)
const loading = ref(false)
const error = ref('')
const activeIndex = ref(-1)

let debounce = null
let controller = null

// Coordinates and Plus Codes resolve locally, so search runs even without a
// token; plain text needs the geocoder and quietly returns nothing without one.
watch(query, (q) => {
  clearTimeout(debounce)
  error.value = ''
  if (q.trim().length < 2) {
    results.value = []
    open.value = false
    return
  }
  debounce = setTimeout(run, 280)
})

async function run() {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  try {
    results.value = await searchPlaces(query.value, {
      proximity: props.proximity,
      signal: controller.signal,
    })
    open.value = true
    activeIndex.value = results.value.length ? 0 : -1
  } catch (e) {
    if (e.name !== 'AbortError') error.value = 'Search failed.'
  } finally {
    loading.value = false
  }
}

function pick(r) {
  emit('add', { name: r.name, placeName: r.placeName, lat: r.lat, lng: r.lng })
  query.value = ''
  results.value = []
  open.value = false
  activeIndex.value = -1
}

function onKeydown(e) {
  if (!open.value || !results.value.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % results.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + results.value.length) % results.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (results.value[activeIndex.value]) pick(results.value[activeIndex.value])
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

onBeforeUnmount(() => {
  clearTimeout(debounce)
  controller?.abort()
})
</script>

<template>
  <div class="loc-search">
    <div class="loc-search__field">
      <svg class="loc-search__icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
        <line
          x1="16.5"
          y1="16.5"
          x2="21"
          y2="21"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      <input
        v-model="query"
        type="text"
        class="loc-search__input"
        placeholder="Search a place, paste coordinates or a Plus Code…"
        autocomplete="off"
        spellcheck="false"
        @keydown="onKeydown"
        @focus="open = results.length > 0"
      />
      <span v-if="loading" class="loc-search__spinner" aria-hidden="true" />
    </div>

    <ul v-if="open && results.length" class="loc-search__results">
      <li
        v-for="(r, i) in results"
        :key="r.id"
        class="loc-search__result"
        :class="{ 'is-active': i === activeIndex }"
        @mousedown.prevent="pick(r)"
        @mouseenter="activeIndex = i"
      >
        <span class="loc-search__result-name">{{ r.name }}</span>
        <span class="loc-search__result-place">{{ r.placeName }}</span>
      </li>
    </ul>

    <p v-if="error" class="loc-search__error">{{ error }}</p>
    <p v-else-if="!tokenOk" class="loc-search__note">
      No token: place search is off, but you can still paste
      <code>lat, lng</code> or a full Plus Code, or click the map to drop pins.
    </p>
    <p v-else class="loc-search__note">
      Tip: paste a <code>lat, lng</code> or a Google Plus Code (e.g. <code>QWH9+92 Nairobi</code>)
      and it resolves exactly.
    </p>
  </div>
</template>

<style scoped>
.loc-search {
  position: relative;
}
.loc-search__field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  background: var(--paper);
  border: 1px solid var(--ink);
}
.loc-search__icon {
  color: rgba(26, 23, 20, 0.55);
  flex-shrink: 0;
}
.loc-search__input {
  flex: 1;
  border: 0;
  background: transparent;
  font-family: var(--sans);
  font-size: 14px;
  color: var(--ink);
  outline: none;
}
.loc-search__input::placeholder {
  color: rgba(26, 23, 20, 0.4);
}
.loc-search__input:disabled {
  cursor: not-allowed;
}
.loc-search__spinner {
  width: 12px;
  height: 12px;
  border: 1.5px solid var(--rule-soft);
  border-top-color: var(--burgundy);
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}
.loc-search__results {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1200;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--paper);
  border: 1px solid var(--ink);
  box-shadow: 0 12px 30px -14px rgba(26, 23, 20, 0.5);
  max-height: 320px;
  overflow-y: auto;
}
.loc-search__result {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--rule-vsoft);
}
.loc-search__result:last-child {
  border-bottom: 0;
}
.loc-search__result.is-active {
  background: rgba(122, 46, 31, 0.08);
}
.loc-search__result-name {
  font-family: var(--serif);
  font-size: 15px;
  font-weight: 600;
}
.loc-search__result-place {
  font-family: var(--mono);
  font-size: 10.5px;
  color: rgba(26, 23, 20, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.loc-search__error,
.loc-search__note {
  margin: 6px 2px 0;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: rgba(26, 23, 20, 0.55);
}
.loc-search__error {
  color: var(--burgundy);
}
.loc-search__note code {
  background: rgba(26, 23, 20, 0.07);
  padding: 1px 4px;
}
</style>
