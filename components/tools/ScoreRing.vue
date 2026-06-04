<template>
  <div class="score-ring-wrapper" :style="{ width: size + 'px', height: size + 'px' }">
    <svg
      class="score-ring-svg"
      viewBox="0 0 120 120"
      :aria-label="ariaLabel"
      role="img"
    >
      <!-- Background circle -->
      <circle
        cx="60" cy="60" r="52"
        fill="none"
        stroke="#E0D5C0"
        stroke-width="6"
      />
      <!-- Score circle -->
      <circle
        cx="60" cy="60" r="52"
        fill="none"
        stroke-width="6"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :stroke="computedStrokeColor"
        class="score-ring-fill"
        :style="{ filter: `drop-shadow(0 0 3px ${computedStrokeColor}4D)` }"
      />
    </svg>
    <div class="score-ring-text" aria-hidden="true">
      <span class="score-number" :style="{ fontSize: scoreFontSize }">{{ displayScore }}</span>
      <span v-if="label" class="score-label" :style="{ fontSize: labelFontSize }">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'

const props = withDefaults(defineProps<{
  score?: number
  size?: number
  label?: string
  strokeColor?: string
}>(), {
  size: 120,
})

const computedStrokeColor = computed(() => {
  if (props.strokeColor) return props.strokeColor
  if (props.score == null) return WUXING_COLORS['火']
  const s = Math.max(0, Math.min(100, Number(props.score)))
  if (s >= 75) return WUXING_COLORS['木']
  if (s >= 60) return WUXING_COLORS['土']
  if (s >= 45) return WUXING_FALLBACK_COLOR
  return WUXING_COLORS['火']
})

const safeScore = computed(() => {
  const s = Number(props.score ?? NaN)
  return Number.isFinite(s) ? Math.max(0, Math.min(100, s)) : 0
})

const displayScore = computed(() => {
  const s = Number(props.score ?? NaN)
  return Number.isFinite(s) ? Math.round(s) : '--'
})

const ariaLabel = computed(() => {
  const s = Number(props.score ?? NaN)
  if (!Number.isFinite(s)) return '暂无评分'
  return `${props.label || '评分'}：${Math.round(s)}${props.label ? '' : '分'}`
})

const radius = 52
const circumference = 2 * Math.PI * radius

const dashOffset = computed(() => {
  const fraction = safeScore.value / 100
  return circumference - fraction * circumference
})

const scoreFontSize = computed(() => {
  const ratio = props.label ? 0.3 : 0.42
  return Math.max(12, props.size * ratio) + 'px'
})
const labelFontSize = computed(() => Math.max(10, props.size * 0.12) + 'px')
</script>

<style scoped>
.score-ring-wrapper {
  position: relative;
}

.score-ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-ring-fill {
  transition: stroke-dashoffset 1s ease-out;
}

.score-ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.score-number {
  font-family: var(--font-display);
  font-size: 2.25rem;
  line-height: 1;
  color: #2C1810;
}

.score-label {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem;
  margin-top: 2px;
  color: var(--color-ink-medium);
}
</style>
