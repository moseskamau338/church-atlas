<script setup>
defineProps({
  showHeatmap: { type: Boolean, default: false },
  showSabbath: { type: Boolean, default: true },
})
</script>

<template>
  <div class="legend">
    <div class="legend__inner">
      <div class="legend__item">
        <span class="legend__icon">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" fill="#7A2E1F" stroke="#1A1714" stroke-width="0.8" />
            <rect x="8.7" y="5.5" width="2.6" height="8" fill="#F5EDDE" />
            <rect x="6.4" y="7.6" width="7.2" height="2.4" fill="#F5EDDE" />
          </svg>
        </span>
        <span class="legend__label">Church</span>
      </div>
      <div v-if="showSabbath" class="legend__item">
        <span class="legend__icon">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="6" fill="#F5EDDE" stroke="#1A1714" stroke-width="1" />
            <circle cx="10" cy="10" r="2.5" fill="#3A4F2E" />
          </svg>
        </span>
        <span class="legend__label">Sabbath School</span>
      </div>
      <div class="legend__item">
        <span class="legend__icon">
          <svg width="32" height="20" viewBox="0 0 32 20">
            <line x1="3" y1="10" x2="29" y2="10" stroke="#1A1714" stroke-width="1.6" />
            <circle cx="3" cy="10" r="1.6" fill="#1A1714" />
            <circle cx="29" cy="10" r="1.6" fill="#1A1714" />
          </svg>
        </span>
        <span class="legend__label">Distance (km)</span>
      </div>
      <div v-if="showHeatmap" class="legend__item">
        <span class="legend__icon">
          <svg width="22" height="20" viewBox="0 0 22 20">
            <circle cx="11" cy="10" r="9" fill="#7A2E1F" opacity="0.10" />
            <circle cx="11" cy="10" r="6" fill="#7A2E1F" opacity="0.22" />
            <circle cx="11" cy="10" r="3" fill="#7A2E1F" opacity="0.35" />
          </svg>
        </span>
        <span class="legend__label">Membership Density</span>
      </div>
    </div>
  </div>
</template>
