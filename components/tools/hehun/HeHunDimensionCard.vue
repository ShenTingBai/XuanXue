<template>
  <div class="fade-in dimension-card" :style="{ '--delay': delay }" role="region" :aria-label="dim.name">
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
    <div class="dim-bar-wrap" role="progressbar" :aria-valuenow="barValue" aria-valuemin="0" aria-valuemax="100">
      <div class="dim-bar-bg">
        <div class="dim-bar-fill" :style="{ width: barPercent + '%', background: scoreColor }" />
      </div>
    </div>

    <!-- Items (sub-details) -->
    <div v-if="dim.items && dim.items.length > 0" class="dim-items">
      <div
        v-for="(item, i) in dim.items"
        :key="i"
        class="dim-item"
      >
        <span class="dim-item__name">{{ item.name }}</span>
        <span class="dim-item__relation">{{ item.relation }}</span>
        <span
          class="dim-item__score"
          :style="{ color: item.score >= 0 ? '#3D6B4B' : '#C62828' }"
        >
          {{ item.score >= 0 ? '+' : '' }}{{ item.score }}
        </span>
        <p class="dim-item__detail">{{ item.detail }}</p>
      </div>
    </div>

    <!-- Details text -->
    <div v-else class="dim-details">
      <p v-for="(d, i) in dim.details" :key="i" class="dim-detail-line">{{ d }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HeHunDimension } from '~/composables/useHeHun'

const props = defineProps<{
  dim: HeHunDimension
  delay?: string
}>()

const scoreColor = computed(() => {
  const d = props.dim
  const ratio = d.maxScore > 0 ? d.score / d.maxScore : 0
  if (ratio >= 0.6) return '#3D6B4B'
  if (ratio <= 0.3) return '#C62828'
  return '#7A5E12'
})

const levelBg = computed(() => {
  const d = props.dim
  const ratio = d.maxScore > 0 ? d.score / d.maxScore : 0
  if (ratio >= 0.6) return 'rgba(61, 107, 75, 0.08)'
  if (ratio <= 0.3) return 'rgba(198, 40, 40, 0.08)'
  return 'rgba(122, 94, 18, 0.08)'
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
  background: linear-gradient(135deg, #FBF4E6 0%, #F5EBD6 100%);
  border-radius: 0.625rem;
  border: 1px solid rgba(44, 26, 14, 0.03);
  padding: 1rem 1.125rem;
}

.dim-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.dim-name {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-ink-dark, #2C1810);
  letter-spacing: 0.05em;
}

.dim-meta {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

.dim-score {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
}

.dim-max {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.55rem;
  color: var(--color-ink-light, #8A7A6A);
}

.dim-level {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.5rem;
  padding: 0.05rem 0.35rem;
  border-radius: 999px;
  letter-spacing: 0.05em;
  margin-left: 0.2rem;
}

.dim-level.吉 {
  color: #3D6B4B;
}
.dim-level.凶 {
  color: #C62828;
}
.dim-level.中 {
  color: #7A5E12;
}

/* ── Progress bar ── */
.dim-bar-wrap {
  margin-bottom: 0.625rem;
}

.dim-bar-bg {
  height: 4px;
  background: rgba(44, 26, 14, 0.06);
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
  border-top: 1px solid rgba(44, 26, 14, 0.03);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.5rem;
}

.dim-item__name {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--color-ink-medium, #5A4A3A);
  letter-spacing: 0.03em;
}

.dim-item__relation {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.65rem;
  color: var(--color-ink-dark, #2C1810);
  letter-spacing: 0.08em;
}

.dim-item__score {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
}

.dim-item__detail {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.6rem;
  color: var(--color-ink-light, #8A7A6A);
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
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.6rem;
  color: var(--color-ink-medium, #5A4A3A);
  line-height: 1.55;
  letter-spacing: 0.03em;
  padding: 0.2rem 0;
  border-top: 1px solid rgba(44, 26, 14, 0.02);
}

/* ── Animation ── */
.fade-in {
  animation: cardIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay, 0s);
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
