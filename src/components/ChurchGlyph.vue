<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: { type: Number, default: 36 },
  color: { type: String, default: '#7A2E1F' },
  inkColor: { type: String, default: '#1A1714' },
})

const dims = computed(() => ({ w: props.size, h: props.size * 1.05 }))

const housePath = computed(() => {
  const { w, h } = dims.value
  return `M ${-w * 0.4} ${h * 0.5}
          L ${-w * 0.4} ${-h * 0.1}
          L 0 ${-h * 0.55}
          L ${w * 0.4} ${-h * 0.1}
          L ${w * 0.4} ${h * 0.5} Z`
})
</script>

<template>
  <g>
    <ellipse
      :cx="0"
      :cy="dims.h * 0.55"
      :rx="dims.w * 0.42"
      :ry="dims.w * 0.08"
      fill="#1A1714"
      opacity="0.18"
    />
    <path
      :d="housePath"
      :fill="color"
      :stroke="inkColor"
      stroke-width="1.4"
      stroke-linejoin="round"
    />
    <rect
      :x="-dims.w * 0.1"
      :y="dims.h * 0.1"
      :width="dims.w * 0.2"
      :height="dims.h * 0.4"
      :fill="inkColor"
      opacity="0.85"
    />
    <rect
      :x="-dims.w * 0.04"
      :y="-dims.h * 0.38"
      :width="dims.w * 0.08"
      :height="dims.h * 0.26"
      fill="#F5EDDE"
    />
    <rect
      :x="-dims.w * 0.15"
      :y="-dims.h * 0.3"
      :width="dims.w * 0.3"
      :height="dims.w * 0.08"
      fill="#F5EDDE"
    />
  </g>
</template>
