<template>
  <div
    class="fade-in dimension-card"
    :class="{ 'dim-card--primary': dim.name === '日柱（夫妻宫）' }"
    :style="{ '--delay': delay }"
    role="region"
    :aria-label="dim.name"
  >
    <!-- Header -->
    <div class="dim-header">
      <h3 class="dim-name">{{ dim.name }}</h3>
      <div class="dim-meta">
        <span class="dim-score" :style="{ color: scoreColor }">
          {{ dim.score >= 0 ? '+' : '' }}{{ dim.score }}
        </span>
        <span class="dim-max">/ {{ dim.maxScore }}</span>
        <span class="dim-level" :class="dim.level" :style="{ background: levelBg }">
          {{ dim.level }}
        </span>
      </div>
    </div>

    <!-- Progress bar -->
    <div
      class="dim-bar-wrap"
      role="progressbar"
      :aria-valuenow="barValue"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="dim-bar-bg">
        <div class="dim-bar-fill" :style="{ width: barPercent + '%', background: scoreColor }" />
      </div>
    </div>

    <!-- Items (sub-details) -->
    <div v-if="dim.items && dim.items.length > 0" class="dim-items">
      <div v-for="(item, i) in dim.items" :key="i" class="dim-item">
        <span class="dim-item__name">{{ item.name }}</span>
        <span class="dim-item__relation">{{ item.relation }}</span>
        <span
          class="dim-item__score"
          :style="{ color: item.score >= 0 ? WUXING_COLORS['木'] : WUXING_COLORS['火'] }"
        >
          {{ item.score >= 0 ? '+' : '' }}{{ item.score }}
        </span>
        <p class="dim-item__detail">{{ item.detail }}</p>
      </div>
    </div>

    <!-- Details text (fallback) -->
    <div v-else class="dim-details">
      <p v-for="(d, i) in dim.details" :key="i" class="dim-detail-line">{{ d }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WUXING_COLORS } from '~/constants/bazi'
import type { HeHunDimension } from '~/composables/useHeHun'

const props = defineProps<{
  dim: HeHunDimension
  delay?: string
}>()

const scoreColor = computed(() => {
  const d = props.dim
  const ratio = d.maxScore > 0 ? d.score / d.maxScore : 0
  if (ratio >= 0.6) return WUXING_COLORS['木']
  if (ratio <= 0.3) return WUXING_COLORS['火']
  return WUXING_COLORS['土']
})

const levelBg = computed(() => {
  const d = props.dim
  const ratio = d.maxScore > 0 ? d.score / d.maxScore : 0
  if (ratio >= 0.6) return `color-mix(in srgb, ${WUXING_COLORS['木']} 8%, transparent)`
  if (ratio <= 0.3) return `color-mix(in srgb, ${WUXING_COLORS['火']} 8%, transparent)`
  return `color-mix(in srgb, ${WUXING_COLORS['土']} 8%, transparent)`
})

const barValue = computed(() => {
  const d = props.dim
  const ratio = d.maxScore > 0 ? d.score / d.maxScore : 0
  return Math.round(Math.max(0, Math.min(100, (ratio + 1) * 50)))
})

const barPercent = computed(() => {
  return Math.max(0, Math.min(100, barValue.value))
})
</script>

<style scoped>
.dimension-card {
  background: var(--color-paper-lightest);
  border-radius: 0.625rem;
  border: 1px solid color-mix(in srgb, var(--color-ink-faint) 15%, transparent);
  padding: 1.125rem 1.25rem;
}

/* Primary card (日柱) — left cinnabar accent */
.dim-card--primary {
  border-left: 3px solid var(--color-cinnabar);
  padding-left: calc(1.25rem - 3px);
  box-shadow:
    0 2px 12px color-mix(in srgb, var(--color-ink-muted) 4%, transparent),
    0 0 0 1px color-mix(in srgb, var(--color-cinnabar) 4%, transparent) inset;
}

.dim-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.dim-name {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-ink);
  letter-spacing: 0.05em;
}

.dim-meta {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

.dim-score {
  font-family: var(--font-sans);
  font-size: 0.9rem;
  font-weight: 600;
}

.dim-max {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-light);
}

.dim-level {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  padding: 0.08rem 0.4rem;
  border-radius: 999px;
  letter-spacing: 0.05em;
  margin-left: 0.2rem;
  font-weight: 500;
}

.dim-level.吉 {
  color: v-bind('WUXING_COLORS["木"]');
}
.dim-level.凶 {
  color: v-bind('WUXING_COLORS["火"]');
}
.dim-level.中 {
  color: v-bind('WUXING_COLORS["土"]');
}

/* ── Progress bar ── */
.dim-bar-wrap {
  margin-bottom: 0.625rem;
}

.dim-bar-bg {
  height: 4px;
  background: color-mix(in srgb, var(--color-ink-faint) 18%, transparent);
  border-radius: 999px;
  overflow: hidden;
}

.dim-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ── Items ── */
.dim-items {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.dim-item {
  padding: 0.35rem 0;
  border-top: 1px solid color-mix(in srgb, var(--color-ink-faint) 10%, transparent);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.5rem;
}

.dim-item:first-child {
  border-top: none;
}

.dim-item__name {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-ink-medium);
  letter-spacing: 0.03em;
}

.dim-item__relation {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.75rem;
  color: var(--color-ink);
  letter-spacing: 0.08em;
}

.dim-item__score {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
}

.dim-item__detail {
  width: 100%;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  line-height: 1.5;
  letter-spacing: 0.02em;
}

/* ── Details ── */
.dim-details {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.dim-detail-line {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-medium);
  line-height: 1.55;
  letter-spacing: 0.03em;
  padding: 0.2rem 0;
  border-top: 1px solid color-mix(in srgb, var(--color-ink-faint) 8%, transparent);
}

.dim-detail-line:first-child {
  border-top: none;
}

/* ── Animation ── */
.fade-in {
  animation: cardIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay, 0s);
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
