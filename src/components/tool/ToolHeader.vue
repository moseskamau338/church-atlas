<script setup>
defineProps({
  title: { type: String, required: true },
  tagline: { type: String, default: '' },
  exporting: { type: Boolean, default: false },
  canShare: { type: Boolean, default: false },
  shareCopied: { type: Boolean, default: false },
})
defineEmits(['export', 'share'])
</script>

<template>
  <header class="masthead">
    <div class="masthead__rule masthead__rule--top" />
    <div class="masthead__inner">
      <div class="masthead__brand">
        <div class="tool-mark" aria-hidden="true">
          <svg viewBox="0 0 40 40" width="38" height="38">
            <circle cx="20" cy="20" r="18" fill="none" stroke="#1A1714" stroke-width="1.4" />
            <circle cx="13" cy="24" r="3.2" fill="#7A2E1F" stroke="#1A1714" stroke-width="1" />
            <circle cx="28" cy="14" r="3.2" fill="#3A4F2E" stroke="#1A1714" stroke-width="1" />
            <line
              x1="13"
              y1="24"
              x2="28"
              y2="14"
              stroke="#1A1714"
              stroke-width="1.3"
              stroke-dasharray="2.5 2"
            />
          </svg>
        </div>
        <div class="masthead__brand-text">
          <div class="masthead__eyebrow">Distance & Route Workbench</div>
          <h1 class="masthead__title">{{ title }}</h1>
          <div v-if="tagline" class="masthead__sub">
            <span>{{ tagline }}</span>
          </div>
        </div>
      </div>

      <div class="masthead__controls __export-hide">
        <button
          class="ctl-btn"
          :class="{ 'is-active': shareCopied }"
          :disabled="!canShare"
          title="Copy a link that reproduces this session"
          @click="$emit('share')"
        >
          <span>{{ shareCopied ? 'Link copied ✓' : 'Share' }}</span>
        </button>
        <button
          class="ctl-btn ctl-btn--primary"
          :disabled="exporting"
          title="Export the current view as a PNG"
          @click="$emit('export')"
        >
          <span v-if="exporting" class="ctl-spinner" />
          <span>{{ exporting ? 'Exporting…' : 'Export PNG' }}</span>
        </button>
      </div>
    </div>
    <div class="masthead__rule masthead__rule--bot" />
  </header>
</template>

<style scoped>
.tool-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
}
</style>
