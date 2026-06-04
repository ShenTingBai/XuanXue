<script setup lang="ts">
/**
 * MonthlyFortune.vue — Collapsible card showing 12-month fortune breakdown
 * for the ShengXiao tool page. Displays each month's stem-branch, score bar,
 * fortune level badge, and a one-line tip.
 */
import { getMonthBranch } from '~/composables/useSolarTerms'
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'
import type { MonthlyFortuneResult, MonthlyFortuneItem } from '~/composables/useMonthlyFortune'

const props = defineProps<{
  result: MonthlyFortuneResult
  currentYear: number
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

const expanded = ref(false)

const monthListId = useId()

// Count summary for collapsed state
const levelCounts = computed(() => {
  let wang = 0, ping = 0, ruo = 0
  for (const m of props.result.months) {
    if (m.level === '旺') wang++
    else if (m.level === '平') ping++
    else ruo++
  }
  return { wang: wang, ping, ruo }
})

// Determine which month we're currently in
const currentBranch = computed(() => {
  if (!import.meta.client) return ''
  const now = new Date()
  return getMonthBranch(now.getFullYear(), now.getMonth() + 1, now.getDate())
})

function isCurrentMonth(month: MonthlyFortuneItem): boolean {
  return month.monthBranch === currentBranch.value
}

function toggleExpanded() {
  expanded.value = !expanded.value
  emit('toggle')
}

// Color helpers
function levelColor(level: '旺' | '平' | '弱'): string {
  if (level === '旺') return WUXING_COLORS['木'] // jade green
  if (level === '弱') return WUXING_COLORS['火'] // cinnabar red
  return WUXING_COLORS['土'] // gold
}

function levelBgHex(level: '旺' | '平' | '弱'): string {
  const color = levelColor(level)
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r},${g},${b},0.12)`
}

function levelBorderHex(level: '旺' | '平' | '弱'): string {
  const color = levelColor(level)
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r},${g},${b},0.3)`
}

// Score bar width as percentage
function barWidth(score: number): string {
  return `${score}%`
}

function barColor(level: '旺' | '平' | '弱'): string {
  return levelColor(level)
}
</script>

<template>
  <div class="card-warm rounded-xl p-8 fade-in" :style="{ '--delay': '0.35s' }">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-display text-xl text-ink-dark">
        {{ currentYear }}年 逐月运势
      </h2>
      <button
        :aria-expanded="expanded"
        :aria-controls="monthListId"
        @click="toggleExpanded"
        @keydown.enter="toggleExpanded"
        @keydown.space.prevent="toggleExpanded"
        class="btn-cin text-sm"
      >
        <span class="sr-only">{{ expanded ? '收起' : '展开' }}逐月运势</span>
        <span aria-hidden="true">{{ expanded ? '收起 ▲' : '展开 ▼' }}</span>
      </button>
    </div>

    <!-- Summary bar (always visible) -->
    <div class="flex items-center gap-4 mb-3" aria-live="polite">
      <div class="flex items-center gap-2 text-sm">
        <span class="inline-block w-3 h-3 rounded-full" :style="{ backgroundColor: WUXING_COLORS['木'] }" aria-hidden="true"></span>
        <span class="text-ink-medium">旺 {{ levelCounts.wang }}</span>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span class="inline-block w-3 h-3 rounded-full" :style="{ backgroundColor: WUXING_COLORS['土'] }" aria-hidden="true"></span>
        <span class="text-ink-medium">平 {{ levelCounts.ping }}</span>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span class="inline-block w-3 h-3 rounded-full" :style="{ backgroundColor: WUXING_COLORS['火'] }" aria-hidden="true"></span>
        <span class="text-ink-medium">弱 {{ levelCounts.ruo }}</span>
      </div>
    </div>

    <!-- Month grid (expandable) -->
    <Transition name="expand">
      <div
        v-if="expanded"
        :id="monthListId"
        role="list"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4"
        aria-label="逐月运势列表"
      >
        <div
          v-for="(month, idx) in result.months"
          :key="month.monthIndex"
          role="listitem"
          :class="[
            'rounded-lg p-4 border transition-colors fade-in',
            isCurrentMonth(month) ? 'border-l-2' : 'border-paper-medium/40',
          ]"
          :style="{
            backgroundColor: levelBgHex(month.level),
            borderColor: isCurrentMonth(month) ? levelColor(month.level) : levelBorderHex(month.level),
            '--delay': `${0.05 + idx * 0.04}s`,
          }"
        >
          <!-- Month header row -->
          <div class="flex items-center justify-between mb-1">
            <div>
              <span class="font-sans text-sm font-medium text-ink-dark">
                {{ month.monthName }}
              </span>
              <span v-if="isCurrentMonth(month)" class="ml-1.5 px-1.5 py-0.5 text-xs rounded" :style="{ backgroundColor: levelBgHex(month.level), color: levelColor(month.level) }">
                本月
              </span>
            </div>
            <span
              class="px-1.5 py-0.5 text-xs rounded font-medium"
              :style="{ backgroundColor: levelBgHex(month.level), color: levelColor(month.level), border: `1px solid ${levelBorderHex(month.level)}` }"
            >
              {{ month.levelLabel }}
            </span>
          </div>

          <!-- Stem-branch and date range -->
          <div class="text-xs text-ink-light mb-2">
            <span class="font-medium text-ink-medium">{{ month.monthStem }}{{ month.monthBranch }}</span>
            <span class="mx-1" aria-hidden="true">·</span>
            <span>{{ month.gregorianLabel }}</span>
          </div>

          <!-- Score bar -->
          <div class="mb-2">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-xs text-ink-light">{{ month.relationship }}</span>
              <span
                class="text-xs font-medium"
                :style="{ color: barColor(month.level) }"
              >
                {{ month.score }}
              </span>
            </div>
            <div class="h-1.5 bg-ink-dark/8 rounded-full overflow-hidden" role="progressbar" :aria-valuenow="month.score" aria-valuemin="0" aria-valuemax="100" :aria-label="`${month.monthName}运势得分${month.score}`">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: barWidth(month.score), backgroundColor: barColor(month.level) }"
              />
            </div>
          </div>

          <!-- Tip -->
          <p class="text-xs text-ink-medium leading-relaxed">
            {{ month.tip }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Expand/collapse transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 2000px;
}
</style>
