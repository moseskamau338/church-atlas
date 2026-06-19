<script setup>
import MorePanel from './MorePanel.vue'

const logoUrl = `${import.meta.env.BASE_URL}sda-logo.svg`

defineProps({
  data: { type: Object, required: true },
  exporting: { type: Boolean, default: false },
  showCardPanel: { type: Boolean, default: false },
  showMore: { type: Boolean, default: false },
  baseLayer: { type: String, required: true },
  tweaks: { type: Object, required: true },
})
defineEmits(['export', 'fit', 'toggle-more', 'close-more', 'base-layer-change', 'set-tweak'])
</script>

<template>
  <header class="masthead">
    <div class="masthead__rule masthead__rule--top" />
    <div class="masthead__inner">
      <div class="masthead__brand">
        <div class="masthead__brand-mark" aria-hidden="true">
          <img :src="logoUrl" alt="" class="masthead__brand-mark-img" />
        </div>
        <div class="masthead__brand-text">
          <div class="masthead__eyebrow">SDA · Church Atlas · {{ data.district.updated }}</div>
          <h1 class="masthead__title">{{ data.district.name }}</h1>
          <div class="masthead__sub">
            <span>{{ data.district.subCounty }}</span>
            <span class="masthead__sep">·</span>
            <span>{{ data.district.county }}</span>
          </div>
        </div>
      </div>

      <div class="masthead__controls __export-hide">
        <button class="ctl-btn" title="Fit all churches to view" @click="$emit('fit')">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" stroke-linecap="round" />
          </svg>
          <span>Fit</span>
        </button>

        <div :class="['split-btn', { 'is-open': showMore }]">
          <button
            class="split-btn__main"
            :disabled="exporting"
            title="Download a PNG of the full dashboard"
            @click="$emit('export')"
          >
            <template v-if="exporting">
              <span class="ctl-spinner" />
              <span>Exporting…</span>
            </template>
            <template v-else>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M12 3v12m0 0l-4-4m4 4l4-4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke-linecap="round" />
              </svg>
              <span>Export PNG</span>
            </template>
          </button>
          <button
            class="split-btn__chevron"
            title="Map type, display options, paper tone"
            aria-label="More options"
            data-more-btn
            :aria-expanded="showMore"
            @click="$emit('toggle-more')"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                :d="showMore ? 'M2 8 L6 4 L10 8' : 'M2 4 L6 8 L10 4'"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <MorePanel
            v-if="showMore"
            :base-layer="baseLayer"
            :tweaks="tweaks"
            @close="$emit('close-more')"
            @base-layer-change="$emit('base-layer-change', $event)"
            @set-tweak="(k, v) => $emit('set-tweak', k, v)"
          />
        </div>
      </div>
    </div>
    <div class="masthead__rule masthead__rule--bot" />
  </header>
</template>
