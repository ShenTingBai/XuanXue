<template>
  <div class="fade-in" :style="{ '--delay': '0.5s' }">
    <div class="flex items-center gap-2.5 flex-wrap mb-3">
      <span class="font-display text-base text-ink tracking-wide">流年详批</span>
      <span class="font-sans text-xs text-ink-light">（±{{ range }}年）</span>
      <span class="inline-flex items-center gap-1.5 text-xs font-sans text-ink-medium ml-auto">
        <span
          class="inline-block w-2 h-2 rounded-full"
          :style="{ background: scoreColor(80) }"
          aria-hidden="true"
        ></span
        >75+ 顺遂
        <span
          class="inline-block w-2 h-2 rounded-full"
          :style="{ background: scoreColor(65) }"
          aria-hidden="true"
        ></span
        >60-74 平稳
        <span
          class="inline-block w-2 h-2 rounded-full"
          :style="{ background: scoreColor(50) }"
          aria-hidden="true"
        ></span
        >45-59 需注意
        <span
          class="inline-block w-2 h-2 rounded-full"
          :style="{ background: scoreColor(30) }"
          aria-hidden="true"
        ></span
        >&lt;45 挑战
      </span>
    </div>

    <p class="font-sans text-base text-ink-medium mb-3 leading-relaxed">
      以今年（{{ currentYear }}年）为中心的{{
        years.length
      }}年运势概述。高亮卡片为今年展开详批，其余年份为紧凑概览。
    </p>

    <!-- No data state -->
    <p v-if="years.length === 0" class="font-sans text-sm text-ink-muted">暂无流年数据</p>

    <div v-else class="space-y-4">
      <!-- Years loop -->
      <div v-for="(year, idx) in years" :key="year.year">
        <!-- Current year: expanded card -->
        <div
          v-if="year.detail"
          class="card-warm rounded-xl p-8 border-2 border-cinnabar liunian-current-bg"
          :role="'region'"
          :aria-label="`${year.year}年流年详批`"
        >
          <!-- Header row -->
          <div class="flex items-baseline gap-3 mb-3 flex-wrap">
            <span class="font-display text-2xl text-cinnabar font-medium">{{ year.year }}</span>
            <span class="font-display text-xl text-ink-dark"
              >{{ year.stem }}{{ year.branch }}年</span
            >
            <span class="font-sans text-base text-cinnabar font-medium">{{ year.tenGod }}</span>
            <!-- Score ring — red for the current year (正念/本年) -->
            <div class="ml-auto flex items-center gap-1.5">
              <ScoreRing
                :score="year.score"
                :size="40"
                label=""
                stroke-color="var(--color-cinnabar)"
                text-color="var(--color-cinnabar)"
              />
            </div>
          </div>

          <!-- Summary -->
          <p class="font-sans text-base text-ink-medium mb-3">{{ year.summary }}</p>

          <!-- Detail sections -->
          <div class="space-y-3">
            <!-- DaYun + year interaction -->
            <div class="font-sans text-sm text-ink-light bg-paper-lightest/60 rounded-lg p-2.5">
              <span class="font-medium text-ink-dark"
                >大运{{ year.daYunStem }}{{ year.daYunBranch }}</span
              >
              <span class="mx-1">&middot;</span>
              {{ year.detail.daYunInteraction }}
            </div>

            <!-- Earth relations -->
            <div>
              <h5 class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-2">
                四柱地支关系
              </h5>
              <div v-if="year.earthRelations.length > 0" class="space-y-1.5">
                <div
                  v-for="rel in year.earthRelations"
                  :key="rel.targetPillar + rel.type"
                  class="flex items-center gap-2 text-sm font-sans"
                >
                  <span
                    class="px-1.5 py-0.5 rounded text-xs font-medium"
                    :style="relationBadgeStyle(rel.type)"
                    >{{ rel.type }}</span
                  >
                  <span class="text-ink-medium">{{ rel.targetPillar }}({{ rel.target }})</span>
                  <span class="text-ink-muted">{{ rel.description }}</span>
                </div>
              </div>
              <p v-else class="font-sans text-sm text-ink-muted">流年地支与命局各柱无特殊关系</p>
            </div>

            <!-- Monthly stems grid -->
            <div>
              <h5 class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-2">
                流月干支
              </h5>
              <div class="grid grid-cols-4 sm:grid-cols-6 gap-1.5" role="grid">
                <div
                  v-for="ms in year.detail.monthlyStems"
                  :key="ms.month"
                  class="text-center rounded py-1 px-1 liunian-month-bg border liunian-month-border"
                  role="gridcell"
                >
                  <div class="font-sans text-xs text-ink-light">{{ monthLabel(ms.month) }}</div>
                  <div class="font-display text-sm text-ink-dark">{{ ms.stem }}{{ ms.branch }}</div>
                </div>
              </div>
            </div>

            <!-- Year-specific shensha tags -->
            <div v-if="year.shenSha.length > 0">
              <h5 class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-2">
                流年神煞
              </h5>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="ss in year.shenSha"
                  :key="ss.name"
                  class="inline-flex items-center px-2 py-0.5 rounded text-sm font-sans cursor-default"
                  :style="shenShaBadgeStyleLocal(ss.category)"
                  :title="ss.description"
                  >{{ ss.name }}</span
                >
              </div>
            </div>

            <!-- Pillars interaction -->
            <div>
              <h5 class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-2">
                各柱影响
              </h5>
              <ul class="space-y-0.5">
                <li
                  v-for="(interaction, i) in year.detail.pillarsInteraction"
                  :key="i"
                  class="font-sans text-sm text-ink-medium"
                >
                  {{ interaction }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Other years: compact card -->
        <div
          v-else
          class="card-warm rounded-xl p-4 border border-paper-dark hover:border-ink-faint transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cinnabar"
          role="button"
          :aria-expanded="expandedYearIdx === idx"
          :aria-label="`${year.year}年 ${year.stem}${year.branch} 流年运势`"
          :tabindex="0"
          @click="toggleExpand(idx)"
          @keydown.enter.prevent="toggleExpand(idx)"
          @keydown.space.prevent="toggleExpand(idx)"
        >
          <!-- Row layout -->
          <div class="flex items-center gap-2.5">
            <span class="font-sans text-sm text-ink-dark font-medium w-12 flex-shrink-0">{{
              year.year
            }}</span>
            <span class="font-display text-lg text-ink-dark w-14 flex-shrink-0"
              >{{ year.stem }}{{ year.branch }}</span
            >
            <span
              class="font-sans text-sm px-1.5 py-0.5 rounded"
              :style="tenGodBadgeStyle(year.isFavorable, year.isUnfavorable)"
              >{{ year.tenGod }}</span
            >
            <span class="sr-only"
              >({{ year.isFavorable ? '喜用神' : year.isUnfavorable ? '忌神' : '中性' }})</span
            >
            <!-- Score bar -->
            <div class="flex-1 h-1.5 rounded-full liunian-score-track overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :style="{ width: year.score + '%', background: scoreColor(year.score) }"
              />
            </div>
            <span
              class="font-sans text-sm font-medium w-8 text-right"
              :style="{ color: scoreColor(year.score) }"
            >
              {{ year.score }}
            </span>
          </div>
          <p class="font-sans text-sm text-ink-light mt-1.5 truncate">{{ year.summary }}</p>

          <!-- Expanded detail -->
          <Transition name="expand">
            <div
              v-if="expandedYearIdx === idx"
              class="mt-3 pt-3 border-t border-paper-dark/50 space-y-2"
            >
              <div v-if="year.earthRelations.length > 0">
                <div
                  v-for="rel in year.earthRelations"
                  :key="rel.targetPillar + rel.type"
                  class="flex items-center gap-2 text-sm font-sans"
                >
                  <span
                    class="px-1.5 py-0.5 rounded text-xs font-medium"
                    :style="relationBadgeStyle(rel.type)"
                    >{{ rel.type }}</span
                  >
                  <span class="text-ink-medium">{{ rel.targetPillar }}({{ rel.target }})</span>
                  <span class="text-ink-muted">{{ rel.description }}</span>
                </div>
              </div>
              <p v-else class="font-sans text-sm text-ink-muted">流年地支与命局无特殊关系</p>

              <!-- Shensha tags for expanded compact card -->
              <div v-if="year.shenSha.length > 0" class="flex flex-wrap gap-1">
                <span
                  v-for="ss in year.shenSha"
                  :key="ss.name"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-sans cursor-default"
                  :style="shenShaBadgeStyleLocal(ss.category)"
                  :title="ss.description"
                  >{{ ss.name }}</span
                >
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiuNianYear } from '~/composables/useLiuNian'
import ScoreRing from '~/components/tools/ScoreRing.vue'
import { shenShaBadgeStyle, WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'

defineProps<{
  years: LiuNianYear[]
  currentYear: number
  range: number
}>()

const expandedYearIdx = ref<number | null>(null)

function toggleExpand(idx: number) {
  expandedYearIdx.value = expandedYearIdx.value === idx ? null : idx
}

const MONTH_LABELS: Record<number, string> = {
  1: '寅',
  2: '卯',
  3: '辰',
  4: '巳',
  5: '午',
  6: '未',
  7: '申',
  8: '酉',
  9: '戌',
  10: '亥',
  11: '子',
  12: '丑',
}

function monthLabel(month: number): string {
  const branch = MONTH_LABELS[month]
  return branch ? `${branch}(${month})` : String(month)
}

function scoreColor(score: number): string {
  if (score >= 75) return WUXING_COLORS['木']
  if (score >= 60) return WUXING_COLORS['土']
  if (score >= 45) return WUXING_FALLBACK_COLOR
  return WUXING_COLORS['火']
}

const RELATION_COLORS: Record<string, string> = {
  合: WUXING_COLORS['木'],
  冲: WUXING_COLORS['火'],
  刑: WUXING_COLORS['土'],
  害: WUXING_COLORS['金'],
  破: WUXING_FALLBACK_COLOR,
}

function relationBadgeStyle(type: string): Record<string, string> {
  const color = RELATION_COLORS[type]
  if (!color)
    return {
      background: `color-mix(in srgb, ${WUXING_FALLBACK_COLOR} 9%, transparent)`,
      color: WUXING_FALLBACK_COLOR,
    }
  return { background: `color-mix(in srgb, ${color} 9%, transparent)`, color }
}

function tenGodBadgeStyle(isFavorable: boolean, isUnfavorable: boolean): Record<string, string> {
  if (isFavorable) {
    return {
      background: `color-mix(in srgb, ${WUXING_COLORS['木']} 9%, transparent)`,
      color: WUXING_COLORS['木'],
    }
  }
  if (isUnfavorable) {
    return {
      background: `color-mix(in srgb, ${WUXING_COLORS['火']} 5%, transparent)`,
      color: WUXING_COLORS['火'],
    }
  }
  return {
    background: `color-mix(in srgb, ${WUXING_FALLBACK_COLOR} 7%, transparent)`,
    color: WUXING_FALLBACK_COLOR,
  }
}

function shenShaBadgeStyleLocal(category: '吉' | '凶' | '中性'): Record<string, string> {
  const s = shenShaBadgeStyle(category)
  return { background: s.bg, color: s.text, border: `1px solid ${s.border}` }
}
</script>

<style scoped>
.liunian-current-bg {
  background: color-mix(in srgb, var(--color-cinnabar) 3%, transparent);
}
.liunian-month-bg {
  background: color-mix(in srgb, var(--color-paper-lightest) 80%, transparent);
}
.liunian-score-track {
  background: color-mix(in srgb, var(--color-paper-dark) 40%, transparent);
}
.liunian-month-border {
  border-color: color-mix(in srgb, var(--color-paper-dark) 30%, transparent);
}
</style>
