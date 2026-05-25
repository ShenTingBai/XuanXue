<template>
  <div class="fade-in" :style="{ '--delay': '0.5s' }">
    <InkDivider>流年详批（&plusmn;{{ range }}年）</InkDivider>

    <p class="font-sans text-sm text-ink-light/70 mb-3 leading-relaxed">
      以今年（{{ currentYear }}年）为中心的{{ years.length }}年运势概述。高亮卡片为今年展开详批，其余年份为紧凑概览。
    </p>

    <!-- No data state -->
    <p v-if="years.length === 0" class="font-sans text-xs text-ink-light/60">
      暂无流年数据
    </p>

    <div v-else class="space-y-4">
      <!-- Years loop -->
      <div v-for="(year, idx) in years" :key="year.year">
        <!-- Current year: expanded card -->
        <div v-if="year.detail"
          class="card-paper-solid rounded-xl p-4 sm:p-5 border-2 border-cinnabar bg-cinnabar/3"
          :role="'region'"
          :aria-label="`${year.year}年流年详批`"
        >
          <!-- Header row -->
          <div class="flex items-baseline gap-3 mb-3 flex-wrap">
            <span class="font-display text-2xl text-cinnabar font-medium">{{ year.year }}</span>
            <span class="font-display text-xl text-ink-dark">{{ year.stem }}{{ year.branch }}年</span>
            <span class="font-sans text-sm text-cinnabar font-medium">{{ year.tenGod }}</span>
            <!-- Score ring -->
            <div class="ml-auto flex items-center gap-1.5">
              <svg class="w-10 h-10 -rotate-90"
                viewBox="0 0 36 36"
                :aria-label="`运势评分 ${year.score}分`"
                role="img"
              >
                <circle cx="18" cy="18" r="14" fill="none" stroke="#D4C9B820" stroke-width="4" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  :stroke="scoreColor(year.score)"
                  stroke-width="4" stroke-linecap="round"
                  :stroke-dasharray="`${(year.score / 100) * 87.96} 87.96`"
                />
              </svg>
              <span class="font-sans text-sm font-medium" :style="{ color: scoreColor(year.score) }">
                {{ year.score }}
              </span>
            </div>
          </div>

          <!-- Summary -->
          <p class="font-sans text-sm text-ink-medium mb-3">{{ year.summary }}</p>

          <!-- Detail sections -->
          <div class="space-y-3">
            <!-- DaYun + year interaction -->
            <div class="font-sans text-xs text-ink-light bg-paper-lightest/60 rounded-lg p-2.5">
              <span class="font-medium text-ink-dark">大运{{ year.daYunStem }}{{ year.daYunBranch }}</span>
              <span class="mx-1">&middot;</span>
              {{ year.detail.daYunInteraction }}
            </div>

            <!-- Earth relations -->
            <div>
              <h5 class="font-sans text-xs font-medium text-ink-dark mb-1.5">四柱地支关系</h5>
              <div v-if="year.earthRelations.length > 0" class="space-y-1.5">
                <div v-for="rel in year.earthRelations" :key="rel.targetPillar + rel.type"
                  class="flex items-center gap-2 text-xs font-sans"
                >
                  <span class="px-1.5 py-0.5 rounded text-[0.65rem] font-medium"
                    :style="relationBadgeStyle(rel.type)"
                  >{{ rel.type }}</span>
                  <span class="text-ink-medium">{{ rel.targetPillar }}({{ rel.target }})</span>
                  <span class="text-ink-light/60">{{ rel.description }}</span>
                </div>
              </div>
              <p v-else class="font-sans text-xs text-ink-light/60">
                流年地支与命局各柱无特殊关系
              </p>
            </div>

            <!-- Monthly stems grid -->
            <div>
              <h5 class="font-sans text-xs font-medium text-ink-dark mb-2">流月干支</h5>
              <div class="grid grid-cols-4 sm:grid-cols-6 gap-1.5" role="grid">
                <div v-for="ms in year.detail.monthlyStems" :key="ms.month"
                  class="text-center rounded py-1 px-1 bg-paper-lightest/80 border border-paper-dark/30"
                  role="gridcell"
                >
                  <div class="font-sans text-[0.6rem] text-ink-light">{{ monthLabel(ms.month) }}</div>
                  <div class="font-display text-xs text-ink-dark">{{ ms.stem }}{{ ms.branch }}</div>
                </div>
              </div>
            </div>

            <!-- Year-specific shensha tags -->
            <div v-if="year.shenSha.length > 0">
              <h5 class="font-sans text-xs font-medium text-ink-dark mb-1.5">流年神煞</h5>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="ss in year.shenSha" :key="ss.name"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-sans cursor-default"
                  :style="shenShaBadgeStyle(ss.category)"
                  :title="ss.description"
                >{{ ss.name }}</span>
              </div>
            </div>

            <!-- Pillars interaction -->
            <div>
              <h5 class="font-sans text-xs font-medium text-ink-dark mb-1.5">各柱影响</h5>
              <ul class="space-y-0.5">
                <li v-for="(interaction, i) in year.detail.pillarsInteraction" :key="i"
                  class="font-sans text-xs text-ink-medium"
                >{{ interaction }}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Other years: compact card -->
        <div v-else
          class="card-paper-solid rounded-xl p-3 sm:p-4 border border-paper-dark hover:border-ink-faint transition-colors cursor-pointer"
          role="button"
          :aria-expanded="expandedYears.has(idx)"
          :aria-label="`${year.year}年 ${year.stem}${year.branch} 流年运势`"
          :tabindex="0"
          @click="toggleExpand(idx)"
          @keydown.enter.prevent="toggleExpand(idx)"
          @keydown.space.prevent="toggleExpand(idx)"
        >
          <!-- Row layout -->
          <div class="flex items-center gap-2.5">
            <span class="font-sans text-sm text-ink-dark font-medium w-12 flex-shrink-0">{{ year.year }}</span>
            <span class="font-display text-lg text-ink-dark w-14 flex-shrink-0">{{ year.stem }}{{ year.branch }}</span>
            <span class="font-sans text-xs px-1.5 py-0.5 rounded"
              :style="tenGodBadgeStyle(year.isFavorable, year.isUnfavorable)"
            >{{ year.tenGod }}</span>
            <!-- Score bar -->
            <div class="flex-1 h-1.5 rounded-full bg-paper-dark/40 overflow-hidden">
              <div class="h-full rounded-full transition-all"
                :style="{ width: year.score + '%', background: scoreColor(year.score) }"
              />
            </div>
            <span class="font-sans text-xs font-medium w-8 text-right" :style="{ color: scoreColor(year.score) }">
              {{ year.score }}
            </span>
          </div>
          <p class="font-sans text-xs text-ink-light/70 mt-1.5 truncate">{{ year.summary }}</p>

          <!-- Expanded detail -->
          <div v-if="expandedYears.has(idx)" class="mt-3 pt-3 border-t border-paper-dark/50 space-y-2">
            <div v-if="year.earthRelations.length > 0">
              <div v-for="rel in year.earthRelations" :key="rel.targetPillar + rel.type"
                class="flex items-center gap-2 text-xs font-sans"
              >
                <span class="px-1.5 py-0.5 rounded text-[0.65rem] font-medium"
                  :style="relationBadgeStyle(rel.type)"
                >{{ rel.type }}</span>
                <span class="text-ink-medium">{{ rel.targetPillar }}({{ rel.target }})</span>
                <span class="text-ink-light/60 hidden sm:inline">{{ rel.description }}</span>
              </div>
            </div>
            <p v-else class="font-sans text-xs text-ink-light/60">流年地支与命局无特殊关系</p>

            <!-- Shensha tags for expanded compact card -->
            <div v-if="year.shenSha.length > 0" class="flex flex-wrap gap-1">
              <span v-for="ss in year.shenSha" :key="ss.name"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-sans cursor-default"
                :style="shenShaBadgeStyle(ss.category)"
                :title="ss.description"
              >{{ ss.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LiuNianYear } from '~/composables/useLiuNian'
import InkDivider from '~/components/tools/InkDivider.vue'

const props = defineProps<{
  years: LiuNianYear[]
  currentYear: number
  range: number
}>()

const expandedYears = ref(new Set<number>())

function toggleExpand(idx: number) {
  if (expandedYears.value.has(idx)) {
    expandedYears.value.clear()
  } else {
    expandedYears.value.clear()
    expandedYears.value.add(idx)
  }
}

const MONTH_LABELS: Record<number, string> = {
  1: '寅', 2: '卯', 3: '辰', 4: '巳', 5: '午', 6: '未',
  7: '申', 8: '酉', 9: '戌', 10: '亥', 11: '子', 12: '丑',
}

function monthLabel(month: number): string {
  return MONTH_LABELS[month] || String(month)
}

function scoreColor(score: number): string {
  if (score >= 70) return '#4A7C59'
  if (score >= 50) return '#B8860B'
  if (score >= 30) return '#8E8E8E'
  return '#C62828'
}

const RELATION_COLORS: Record<string, { bg: string; text: string }> = {
  '合': { bg: '#4A7C5918', text: '#4A7C59' },
  '冲': { bg: '#C6282818', text: '#C62828' },
  '刑': { bg: '#B8860B18', text: '#B8860B' },
  '害': { bg: '#8E8E8E18', text: '#8E8E8E' },
  '破': { bg: '#6B5B4F18', text: '#6B5B4F99' },
}

function relationBadgeStyle(type: string): Record<string, string> {
  const colors = RELATION_COLORS[type] || { bg: '#6B5B4F18', text: '#6B5B4F' }
  return { background: colors.bg, color: colors.text }
}

function tenGodBadgeStyle(isFavorable: boolean, isUnfavorable: boolean): Record<string, string> {
  if (isFavorable) {
    return { background: '#4A7C5918', color: '#4A7C59' }
  }
  if (isUnfavorable) {
    return { background: '#C628280E', color: '#C6282890' }
  }
  return { background: '#6B5B4F12', color: '#6B5B4F' }
}

function shenShaBadgeStyle(category: '吉' | '凶' | '中性'): Record<string, string> {
  switch (category) {
    case '吉':
      return { background: '#4A7C5918', color: '#4A7C59', border: '1px solid #4A7C5930' }
    case '凶':
      return { background: '#C628280E', color: '#C6282890', border: '1px solid #C6282820' }
    case '中性':
      return { background: '#6B5B4F12', color: '#6B5B4F', border: '1px solid #6B5B4F28' }
    default:
      return { background: '#6B5B4F12', color: '#6B5B4F', border: '1px solid #6B5B4F28' }
  }
}
</script>
