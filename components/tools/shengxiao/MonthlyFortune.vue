<script setup lang="ts">
/**
 * MonthlyFortune.vue — Collapsible card showing 12-month fortune breakdown
 * for the ShengXiao tool page. Displays each month's stem-branch, score bar,
 * fortune level badge, and a one-line tip.
 */
import { getMonthBranch } from '~/composables/useSolarTerms'
import { WUXING_COLORS } from '~/constants/bazi'
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
  let wang = 0,
    ping = 0,
    ruo = 0
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

function levelBgStyle(level: '旺' | '平' | '弱'): string {
  return `color-mix(in srgb, ${levelColor(level)} 12%, transparent)`
}

function levelBorderStyle(level: '旺' | '平' | '弱'): string {
  return `color-mix(in srgb, ${levelColor(level)} 30%, transparent)`
}

// Score bar width as percentage
function barWidth(score: number): string {
  return `${score}%`
}

function barColor(level: '旺' | '平' | '弱'): string {
  return levelColor(level)
}

/** Brief one-word annotation for each branch relationship type */
function relationshipAnnotation(rel: string): string {
  const map: Record<string, string> = {
    六合: '贵人',
    三合: '人缘',
    相冲: '变动',
    相刑: '是非',
    相害: '暗阻',
    相破: '破耗',
  }
  return map[rel] || ''
}
</script>

<template>
  <div class="card-warm rounded-xl p-8 fade-in" :style="{ '--delay': '0.35s' }">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="font-display text-xl text-ink-dark">{{ currentYear }}年 逐月运势</h2>
      <button
        :aria-expanded="expanded"
        :aria-controls="monthListId"
        class="marginal-toggle"
        @click="toggleExpanded"
        @keydown.enter="toggleExpanded"
        @keydown.space.prevent="toggleExpanded"
      >
        <span class="marginal-toggle__rule" aria-hidden="true"></span>
        <span>{{ expanded ? '收起' : '展开' }}</span>
        <span class="marginal-toggle__arrow" aria-hidden="true">▼</span>
      </button>
    </div>

    <!-- Summary bar (always visible) -->
    <div class="flex items-center gap-4 mb-3" aria-live="polite">
      <div class="flex items-center gap-2 text-sm">
        <span
          class="inline-block w-3 h-3 rounded-full"
          :style="{ backgroundColor: WUXING_COLORS['木'] }"
          aria-hidden="true"
        ></span>
        <span class="text-ink-medium">旺 {{ levelCounts.wang }}</span>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span
          class="inline-block w-3 h-3 rounded-full"
          :style="{ backgroundColor: WUXING_COLORS['土'] }"
          aria-hidden="true"
        ></span>
        <span class="text-ink-medium">平 {{ levelCounts.ping }}</span>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span
          class="inline-block w-3 h-3 rounded-full"
          :style="{ backgroundColor: WUXING_COLORS['火'] }"
          aria-hidden="true"
        ></span>
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
            backgroundColor: levelBgStyle(month.level),
            borderColor: isCurrentMonth(month)
              ? levelColor(month.level)
              : levelBorderStyle(month.level),
            '--delay': `${0.05 + idx * 0.04}s`,
          }"
        >
          <!-- Month header row -->
          <div class="flex items-center justify-between mb-1">
            <div>
              <span class="font-sans text-sm font-medium text-ink-dark">
                {{ month.monthName }}
              </span>
              <span
                v-if="isCurrentMonth(month)"
                class="ml-1.5 px-1.5 py-0.5 text-xs rounded"
                :style="{
                  backgroundColor: levelBgStyle(month.level),
                  color: levelColor(month.level),
                }"
              >
                本月
              </span>
            </div>
            <span
              class="px-1.5 py-0.5 text-xs rounded font-medium"
              :style="{
                backgroundColor: levelBgStyle(month.level),
                color: levelColor(month.level),
                border: `1px solid ${levelBorderStyle(month.level)}`,
              }"
            >
              {{ month.levelLabel }}
            </span>
          </div>

          <!-- Stem-branch and date range -->
          <div class="text-xs text-ink-medium mb-2">
            <span class="font-medium text-ink-dark"
              >{{ month.monthStem }}{{ month.monthBranch }}</span
            >
            <span class="mx-1" aria-hidden="true">·</span>
            <span>{{ month.gregorianLabel }}</span>
          </div>

          <!-- Score bar -->
          <div class="mb-2">
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-xs text-ink-medium">
                {{ month.relationship }}
                <span v-if="relationshipAnnotation(month.relationship)" class="text-ink-light ml-1"
                  >·{{ relationshipAnnotation(month.relationship) }}</span
                >
              </span>
              <span class="text-sm font-semibold" :style="{ color: barColor(month.level) }">
                {{ month.score }}
              </span>
            </div>
            <div
              class="h-1.5 bg-ink-dark/8 rounded-full overflow-hidden"
              role="progressbar"
              :aria-valuenow="month.score"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="`${month.monthName}运势得分${month.score}`"
            >
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
