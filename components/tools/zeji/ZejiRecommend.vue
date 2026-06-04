<script setup lang="ts">
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'
import type { ZejiDayResult } from '~/composables/useZeJi'
import { TWELVE_STAR_COLOR } from '~/constants/zeji'

const props = defineProps<{
  recommendedDates: ZejiDayResult[]
  eventType: string
  eventName: string
}>()

// Rank symbols
const RANK_SYMBOLS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮']

function scoreColor(score: number): string {
  if (score >= 80) return WUXING_COLORS['木']
  if (score >= 60) return WUXING_COLORS['土']
  if (score >= 40) return WUXING_COLORS['金']
  return WUXING_COLORS['火']
}

function scoreLabel(score: number): string {
  if (score >= 90) return '上吉'
  if (score >= 70) return '吉'
  if (score >= 50) return '平'
  if (score >= 30) return '凶'
  return '大凶'
}
</script>

<template>
  <div class="card-warm rounded-xl p-6 sm:p-8">
    <h2 class="font-display text-lg sm:text-xl text-ink-dark tracking-[0.2em] mb-4">
      推荐{{ eventName }}吉日
    </h2>

    <!-- Empty state -->
    <div
      v-if="recommendedDates.length === 0"
      class="py-10 text-center"
    >
      <p class="text-sm text-ink-light/70 tracking-[0.08em]">
        暂无适合{{ eventName }}的吉日，请查看其他月份
      </p>
    </div>

    <!-- Recommended dates list -->
    <div v-else class="space-y-3">
      <div
        v-for="(day, index) in recommendedDates"
        :key="day.solarDate"
        class="rec-item rounded-lg p-4 border border-paper-dark/20"
      >
        <!-- Rank + Date -->
        <div class="flex items-center gap-3 mb-2">
          <span
            class="font-display text-lg flex-shrink-0"
            :style="{ color: scoreColor(day.score) }"
            aria-hidden="true"
          >{{ RANK_SYMBOLS[index] || index + 1 }}</span>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-sans text-sm text-ink-dark font-medium tracking-[0.05em]">
                {{ day.lunarMonthName }}{{ day.lunarDayName }}
              </span>
              <span class="text-[0.6rem] text-ink-light/60">
                {{ day.solarDate }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-[0.6rem] text-ink-muted tracking-[0.06em]">
                {{ day.lunarYearGanZhi }}年 {{ day.lunarMonthGanZhi }}月 {{ day.lunarDayGanZhi }}日
              </span>
            </div>
          </div>

          <!-- Score badge -->
          <div
            class="flex-shrink-0 px-2.5 py-1 rounded-full text-[0.65rem] font-medium"
            :style="{
              background: scoreColor(day.score) + '15',
              color: scoreColor(day.score),
              border: '1px solid ' + scoreColor(day.score) + '30',
            }"
          >
            {{ scoreLabel(day.score) }}
          </div>
        </div>

        <!-- Almanac info -->
        <div class="flex items-center gap-3 flex-wrap text-[0.6rem] text-ink-light/80 ml-7">
          <!-- 十二值星 -->
          <span
            class="px-1.5 py-0.5 rounded text-[0.55rem] font-medium"
            :style="{
              background: (TWELVE_STAR_COLOR[day.twelveStarLevel] || WUXING_COLORS['土']) + '12',
              color: TWELVE_STAR_COLOR[day.twelveStarLevel] || WUXING_COLORS['土'],
            }"
          >{{ day.twelveStar }}</span>

          <!-- 二十八宿 -->
          <span v-if="day.xiu" class="text-ink-muted">{{ day.xiu }}</span>

          <!-- 天神 -->
          <span
            v-if="day.tianShenType"
            class="px-1.5 py-0.5 rounded text-[0.55rem]"
            :style="{
              background: day.tianShenType === '黄道' ? 'color-mix(in srgb, ' + WUXING_COLORS['木'] + ' 10%, transparent)' : 'color-mix(in srgb, ' + WUXING_COLORS['火'] + ' 8%, transparent)',
              color: day.tianShenType === '黄道' ? WUXING_COLORS['木'] : WUXING_COLORS['火'],
            }"
          >{{ day.tianShenType }}·{{ day.tianShen }}</span>
        </div>

        <!-- Match reasons -->
        <div v-if="day.matchReasons.length > 0" class="mt-2 ml-7">
          <div class="flex flex-wrap gap-1">
            <span
              v-for="reason in day.matchReasons"
              :key="reason"
              class="text-[0.55rem] text-ink-light/70 tracking-[0.04em]"
            >
              {{ reason }}
              <span class="text-ink-light/30 mx-0.5" v-if="day.matchReasons.indexOf(reason) < day.matchReasons.length - 1">·</span>
            </span>
          </div>
        </div>

        <!-- Matched 宜 items -->
        <div v-if="day.matchedYi.length > 0" class="mt-1.5 ml-7 flex flex-wrap gap-1">
          <span
            v-for="yi in day.matchedYi"
            :key="yi"
            class="text-[0.5rem] px-1.5 py-0.5 rounded-sm"
            :style="{ background: 'color-mix(in srgb, ' + WUXING_COLORS['木'] + ' 6%, transparent)', color: WUXING_COLORS['木'] }"
          >宜{{ yi }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rec-item {
  transition: background 0.2s ease;
}

.rec-item:hover {
  background: rgba(44, 26, 14, 0.015);
}
</style>
