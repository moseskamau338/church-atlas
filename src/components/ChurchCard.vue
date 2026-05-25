<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  church: { type: Object, required: true },
  ward: { type: Object, default: null },
})
defineEmits(['close'])

const copied = ref(false)
const coords = computed(() => `${props.church.lat.toFixed(6)}, ${props.church.lng.toFixed(6)}`)
const mapsUrl = computed(
  () => `https://www.google.com/maps/search/?api=1&query=${props.church.lat},${props.church.lng}`,
)

async function copyCoords() {
  try {
    await navigator.clipboard.writeText(coords.value)
    copied.value = true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = coords.value
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      copied.value = true
    } catch {
      /* clipboard unavailable */
    }
    document.body.removeChild(ta)
  }
  setTimeout(() => (copied.value = false), 1800)
}

const futureItems = [
  'History & founding narrative',
  'Pastor & elder roster',
  'Sabbath schools (branch churches)',
  'Photo gallery',
]
</script>

<template>
  <aside class="church-card">
    <button class="church-card__close" aria-label="Close" @click="$emit('close')">×</button>
    <div class="church-card__photo">
      <div class="church-card__photo-placeholder">
        <svg viewBox="0 0 100 100" width="48" height="48">
          <path
            d="M 30 75 L 30 45 L 50 28 L 70 45 L 70 75 Z"
            fill="none"
            stroke="#1A1714"
            stroke-width="1.4"
            opacity="0.5"
          />
          <rect
            x="46"
            y="50"
            width="8"
            height="20"
            fill="none"
            stroke="#1A1714"
            stroke-width="1.4"
            opacity="0.5"
          />
          <rect x="48.5" y="32" width="3" height="10" fill="#7A2E1F" opacity="0.7" />
          <rect x="44" y="35" width="12" height="3" fill="#7A2E1F" opacity="0.7" />
        </svg>
        <div class="church-card__photo-caption">photo · pending upload</div>
      </div>
    </div>
    <h2 class="church-card__name">{{ church.name }}</h2>
    <div class="church-card__meta">
      <div class="field">
        <div class="field__label">Ward</div>
        <div class="field__value">{{ ward ? ward.name : '—' }}</div>
      </div>
      <div class="field">
        <div class="field__label">Founded</div>
        <div class="field__value">{{ church.founded }}</div>
      </div>
      <div class="field">
        <div class="field__label">Membership</div>
        <div class="field__value">{{ church.members.toLocaleString() }}</div>
      </div>
      <div class="field">
        <div class="field__label">Services</div>
        <div class="field__value">{{ church.services }}</div>
      </div>
    </div>

    <div class="church-card__pin">
      <div class="church-card__pin-head">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke-linejoin="round" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Location pin</span>
      </div>
      <div class="church-card__pin-coords">{{ coords }}</div>
      <div class="church-card__pin-actions">
        <a
          class="pin-btn pin-btn--primary"
          :href="mapsUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M14 3h7v7M10 14L21 3M5 5h6M5 19h14v-6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Open in Google Maps</span>
        </a>
        <button class="pin-btn" aria-label="Copy coordinates" @click="copyCoords">
          <template v-if="copied">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
            >
              <path d="M5 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>Copied</span>
          </template>
          <template v-else>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="1.5" />
              <path d="M5 15V5a2 2 0 012-2h10" stroke-linecap="round" />
            </svg>
            <span>Copy</span>
          </template>
        </button>
      </div>
    </div>

    <div class="church-card__future">
      <div class="church-card__future-label">Coming soon</div>
      <ul class="church-card__future-list">
        <li v-for="item in futureItems" :key="item">{{ item }}</li>
      </ul>
    </div>
  </aside>
</template>
