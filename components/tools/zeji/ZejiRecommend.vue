<script setup lang="ts">
import { WUXING_COLORS } from '~/constants/bazi'
import type { ZejiDayResult } from '~/composables/useZeJi'
import { TWELVE_STAR_COLOR } from '~/constants/zeji'

const props = defineProps<{
  recommendedDates: ZejiDayResult[]
  eventType: string
  eventName: string
}>()

const RANK_SYMBOLS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮']

// ── Curated top-N display ──
const INITIAL_VISIBLE = 3
const MIN_FOR_COLLAPSE = 5 // ≤5 items → just show all, no need to collapse

const showAll = ref(false)
const hasMore = computed(() => props.recommendedDates.length > MIN_FOR_COLLAPSE)
const hiddenCount = computed(() => props.recommendedDates.length - INITIAL_VISIBLE)

const visibleDates = computed(() => {
  if (!hasMore.value || showAll.value) return props.recommendedDates
  return props.recommendedDates.slice(0, INITIAL_VISIBLE)
})

function toggleShowAll() {
  showAll.value = !showAll.value
}

// Track which cards are expanded (Set of indices)
const expanded = ref(new Set<number>())

function toggleExpand(index: number) {
  const next = new Set(expanded.value)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  expanded.value = next
}

function isExpanded(index: number): boolean {
  return expanded.value.has(index)
}

function scoreColor(score: number): string {
  if (score >= 85) return WUXING_COLORS['木']
  if (score >= 65) return WUXING_COLORS['木']
  if (score >= 45) return WUXING_COLORS['土']
  return WUXING_COLORS['火']
}

function scoreLabel(score: number): string {
  if (score >= 85) return '上吉'
  if (score >= 65) return '吉'
  if (score >= 45) return '平'
  return '凶'
}

// Filter matchReasons: separate yi/ji items (shown as badges) from context (值星 desc, 天神 desc)
function contextReasons(reasons: string[]): string[] {
  return reasons.filter(r => !r.startsWith('宜「') && !r.startsWith('忌「'))
}

// Build tooltip text for 值星 badge
function starTooltip(day: ZejiDayResult): string {
  const reason = day.matchReasons.find(r => r.includes('日·'))
  const base = reason || `${day.twelveStar}日`
  const guide =
    day.twelveStarLevel === '吉' ? '黄道吉日' : day.twelveStarLevel === '凶' ? '黑道凶日' : '平日'
  return `${base}（${guide}）`
}

// Build tooltip text for 天神 badge
function shenTooltip(day: ZejiDayResult): string {
  const reason = day.matchReasons.find(r => r.startsWith('黄道·') || r.startsWith('黑道·'))
  const base = reason || `${day.tianShenType}·${day.tianShen}`
  const guide = day.tianShenType === '黄道' ? '黄道吉神，诸事皆宜' : '黑道凶神，宜谨慎行事'
  return `${base} — ${guide}`
}
</script>

<template>
  <div class="card-warm rounded-xl p-8">
    <h2 class="font-display text-lg sm:text-xl text-ink-dark tracking-[0.2em] mb-4">
      推荐{{ eventName }}吉日
    </h2>

    <!-- Empty state -->
    <div v-if="recommendedDates.length === 0" class="py-10 text-center">
      <p class="text-sm text-ink-medium tracking-[0.08em]">本月暂无{{ eventName }}吉日</p>
      <p class="text-xs text-ink-light mt-1">可切换月份查看，或点击日历格子查看每日详情</p>
    </div>

    <!-- Recommended dates list — curated: top 3, then expandable -->
    <div v-else>
      <div class="space-y-2">
        <div
          v-for="(day, index) in visibleDates"
          :key="day.solarDate"
          class="rec-card"
          :class="{ 'rec-card--expanded': isExpanded(index) }"
          :style="{ '--score-color': scoreColor(day.score) }"
          role="article"
          :aria-expanded="isExpanded(index)"
          :aria-label="`${day.lunarMonthName}${day.lunarDayName}，评分${day.score}，${scoreLabel(day.score)}`"
        >
          <!-- ── Left: Score Seal ── -->
          <div
            class="rec-seal"
            :style="{
              background: scoreColor(day.score) + '0A',
              borderColor: scoreColor(day.score) + '20',
            }"
          >
            <span class="rec-seal__rank" aria-hidden="true">{{
              RANK_SYMBOLS[index] || index + 1
            }}</span>
            <span class="rec-seal__score" :style="{ color: scoreColor(day.score) }">{{
              day.score
            }}</span>
            <span class="rec-seal__label" :style="{ color: scoreColor(day.score) }">{{
              scoreLabel(day.score)
            }}</span>
          </div>

          <!-- ── Right: Body ── -->
          <div class="rec-body">
            <!-- Always visible — Row 1: Date -->
            <div class="rec-body__date">
              <span class="rec-body__lunar">{{ day.lunarMonthName }}{{ day.lunarDayName }}</span>
              <span class="rec-body__solar">{{ day.solarDate }}</span>
            </div>

            <!-- Always visible — Row 2: Core indicators (值星 + 天神 + 宜) -->
            <div class="rec-body__tags">
              <!-- 值星 badge with tooltip -->
              <span
                class="rec-tag"
                :style="{
                  background:
                    (TWELVE_STAR_COLOR[day.twelveStarLevel] || WUXING_COLORS['土']) + '0E',
                  color: TWELVE_STAR_COLOR[day.twelveStarLevel] || WUXING_COLORS['土'],
                  borderColor:
                    (TWELVE_STAR_COLOR[day.twelveStarLevel] || WUXING_COLORS['土']) + '22',
                }"
                :title="starTooltip(day)"
                >{{ day.twelveStar }}日</span
              >

              <!-- 天神 badge with tooltip -->
              <span
                v-if="day.tianShen"
                class="rec-tag"
                :style="{
                  background:
                    day.tianShenType === '黄道'
                      ? 'color-mix(in srgb, ' + WUXING_COLORS['木'] + ' 8%, transparent)'
                      : 'color-mix(in srgb, ' + WUXING_COLORS['火'] + ' 6%, transparent)',
                  color: day.tianShenType === '黄道' ? WUXING_COLORS['木'] : WUXING_COLORS['火'],
                  borderColor:
                    day.tianShenType === '黄道'
                      ? 'color-mix(in srgb, ' + WUXING_COLORS['木'] + ' 16%, transparent)'
                      : 'color-mix(in srgb, ' + WUXING_COLORS['火'] + ' 12%, transparent)',
                }"
                :title="shenTooltip(day)"
                >{{ day.tianShen }}</span
              >

              <!-- Matched 宜 — the most actionable info -->
              <span
                v-for="yi in day.matchedYi"
                :key="yi"
                class="rec-tag rec-tag--yi"
                :title="`宜${yi}：此日适合${yi}`"
                >{{ yi }}</span
              >
            </div>

            <!-- ══ Expandable detail ══ -->
            <div class="rec-body__extra" :class="{ 'rec-body__extra--open': isExpanded(index) }">
              <div class="rec-body__extra-inner">
                <!-- 干支 + 二十八宿 -->
                <div class="rec-body__meta">
                  <span
                    >{{ day.lunarYearGanZhi }}年 {{ day.lunarMonthGanZhi }}月
                    {{ day.lunarDayGanZhi }}日</span
                  >
                  <span v-if="day.xiu" class="rec-body__xiu">{{ day.xiu }}</span>
                </div>

                <!-- Context reasons — 值星 desc + 天神 desc -->
                <p v-if="contextReasons(day.matchReasons).length > 0" class="rec-body__context">
                  {{ contextReasons(day.matchReasons).join(' · ') }}
                </p>

                <!-- Matched 忌 — risk indicators (show only when expanded, and only if there are matches) -->
                <div v-if="day.matchedJi.length > 0" class="rec-body__ji">
                  <span class="rec-body__ji-label">需注意</span>
                  <span v-for="ji in day.matchedJi" :key="ji" class="rec-tag rec-tag--ji">{{
                    ji
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Expand/collapse trigger -->
            <button
              class="rec-body__toggle"
              :aria-label="isExpanded(index) ? '收起详情' : '展开详情'"
              @click.stop="toggleExpand(index)"
              @keydown.enter.stop="toggleExpand(index)"
              @keydown.space.prevent.stop="toggleExpand(index)"
            >
              <span class="rec-body__toggle-text">{{ isExpanded(index) ? '收起' : '详情' }}</span>
              <span
                class="rec-body__toggle-arrow"
                :class="{ 'rec-body__toggle-arrow--open': isExpanded(index) }"
                aria-hidden="true"
                >▾</span
              >
            </button>
          </div>
        </div>
      </div>

      <!-- "View all" expander — ink-scroll unfurling aesthetic -->
      <button
        v-if="hasMore"
        class="rec-show-all"
        :aria-expanded="showAll"
        @click="toggleShowAll"
        @keydown.enter="toggleShowAll"
        @keydown.space.prevent="toggleShowAll"
      >
        <span class="rec-show-all__line" aria-hidden="true"></span>
        <span class="rec-show-all__text">
          <template v-if="!showAll">查看全部 {{ hiddenCount }} 个吉日</template>
          <template v-else>收起</template>
        </span>
        <span
          class="rec-show-all__arrow"
          :class="{ 'rec-show-all__arrow--open': showAll }"
          aria-hidden="true"
          >▾</span
        >
        <span class="rec-show-all__line" aria-hidden="true"></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── Card grid: seal (48px) + body (1fr) ── */
.rec-card {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 0.625rem;
  align-items: start;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(44, 26, 14, 0.05);
  background: rgba(251, 248, 244, 0.35);
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow: inset 3px 0 0 0 var(--score-color, transparent);
  cursor: default;
}

.rec-card:hover {
  background: rgba(251, 248, 244, 0.58);
  border-color: rgba(44, 26, 14, 0.09);
}

.rec-card--expanded {
  background: rgba(251, 248, 244, 0.5);
  border-color: rgba(44, 26, 14, 0.08);
  box-shadow:
    inset 3px 0 0 0 var(--score-color, transparent),
    0 1px 4px rgba(44, 26, 14, 0.04);
}

/* ── Seal ── */
.rec-seal {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 0.375rem 0.125rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
}

.rec-seal__rank {
  font-family: var(--font-display);
  font-size: 0.75rem;
  line-height: 1.2;
  color: var(--color-ink-muted);
}

.rec-seal__score {
  font-family: var(--font-display);
  font-size: 1.125rem;
  line-height: 1.1;
  font-weight: 700;
}

.rec-seal__label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  line-height: 1;
  letter-spacing: 0.1em;
  font-weight: 500;
  margin-top: 0.0625rem;
}

/* ── Body ── */
.rec-body {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  min-width: 0;
}

.rec-body__date {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.rec-body__lunar {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-ink-dark);
  letter-spacing: 0.06em;
  line-height: 1.3;
}

.rec-body__solar {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  letter-spacing: 0.04em;
  line-height: 1.3;
}

/* ── Tags (always visible) ── */
.rec-body__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.rec-tag {
  display: inline-block;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  line-height: 1.3;
  padding: 0.0625rem 0.375rem;
  border-radius: 3px;
  border: 1px solid transparent;
  white-space: nowrap;
  cursor: help;
}

.rec-tag--yi {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["木"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["木"]');
  border: none;
}

.rec-tag--ji {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 6%, transparent);
  color: v-bind('WUXING_COLORS["火"]');
  border: none;
}

/* ── Expandable extra section ── */
.rec-body__extra {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease;
  overflow: hidden;
}

.rec-body__extra--open {
  grid-template-rows: 1fr;
}

.rec-body__extra-inner {
  min-height: 0;
}

.rec-body__meta {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-muted);
  letter-spacing: 0.05em;
  line-height: 1.4;
  padding-top: 0.25rem;
}

.rec-body__xiu {
  margin-left: 0.25rem;
  color: var(--color-ink-muted);
}

.rec-body__context {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-muted);
  letter-spacing: 0.04em;
  line-height: 1.4;
  margin: 0.125rem 0 0;
}

.rec-body__ji {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
  margin-top: 0.25rem;
}

.rec-body__ji-label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: color-mix(in srgb, var(--color-cinnabar) 65%, var(--color-ink-medium));
  letter-spacing: 0.05em;
}

/* ── Expand/collapse toggle ── */
.rec-body__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  align-self: flex-start;
  margin-top: 0.1875rem;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.rec-body__toggle:hover .rec-body__toggle-text,
.rec-body__toggle:hover .rec-body__toggle-arrow {
  color: var(--color-ink-medium);
}

.rec-body__toggle:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
  border-radius: 2px;
}

.rec-body__toggle-text {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-muted);
  letter-spacing: 0.06em;
  transition: color 0.2s;
}

.rec-body__toggle-arrow {
  display: inline-block;
  font-size: 0.6875rem;
  transition: transform 0.25s ease;
  color: var(--color-ink-muted);
  line-height: 1;
}

.rec-body__toggle-arrow--open {
  transform: rotate(180deg);
}

/* ── "View all" expander — scroll-unfurling motif ── */
.rec-show-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.5rem 0;
  border: none;
  background: none;
  cursor: pointer;
}

.rec-show-all:hover .rec-show-all__text,
.rec-show-all:hover .rec-show-all__arrow {
  color: var(--color-ink-medium);
}

.rec-show-all:hover .rec-show-all__line {
  background: var(--color-ink-muted);
}

.rec-show-all:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
  border-radius: 3px;
}

.rec-show-all__line {
  flex: 1;
  height: 1px;
  background: var(--color-ink-faint);
  max-width: 2rem;
  transition: background 0.2s;
}

.rec-show-all__text {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-muted);
  letter-spacing: 0.08em;
  white-space: nowrap;
  transition: color 0.2s;
}

.rec-show-all__arrow {
  display: inline-block;
  font-size: 0.6875rem;
  transition: transform 0.25s ease;
  color: var(--color-ink-muted);
  line-height: 1;
}

.rec-show-all__arrow--open {
  transform: rotate(180deg);
}
</style>
