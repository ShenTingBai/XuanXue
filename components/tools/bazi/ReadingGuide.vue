<template>
  <div id="reading-guide" class="mb-8 p-8 rounded-xl card-warm border border-cinnabar/15 scroll-mt-20" tabindex="-1">
    <div class="section-header section-header--tool">
      <span class="bar" aria-hidden="true"></span>
      <span class="seal-icon text-[9px] w-7 h-7" aria-hidden="true">命</span>
      <h2>命理速览</h2>
    </div>
    <p class="font-sans text-xs text-ink-light mb-5">本结果为算法推演，仅供参考，不能替代专业命理师分析。</p>

    <div class="space-y-5 font-sans text-base text-ink-medium leading-relaxed">
      <!-- Section 1: 命局总览 -->
      <div>
        <h3 class="font-sans text-sm font-medium text-ink-dark mb-2">命局总览</h3>
        <p>
          <strong class="text-ink-dark">你是{{ dayMaster }}{{ dayMasterWuxing }}命。</strong>
          日主代表你自己——你出生那天的天干是「{{ dayMaster }}」，五行属「{{ dayMasterWuxing }}」。
          命局整体力量<strong class="text-ink-dark">{{ dayMasterStrength }}</strong>。
        </p>
        <p class="mt-2">
          五行之中，对你最有帮助的能量是
          <strong class="text-cinnabar">{{ favorableElements.join('、') }}</strong>，
          生活中可多接触这些元素相关的事物。
          <template v-if="unfavorableElements.length > 0">
            而<strong class="text-ink-dark">{{ unfavorableElements.join('、') }}</strong>与你相克，
            适当平衡即可，不必刻意回避。
          </template>
        </p>
      </div>

      <!-- Section 2: 神煞精要 -->
      <div v-if="readingGuideShensha.length > 0">
        <h3 class="font-sans text-sm font-medium text-ink-dark mb-2">神煞精要</h3>
        <div class="flex flex-wrap gap-2 mb-2">
          <span
            v-for="shen in readingGuideShensha"
            :key="shen.name + shen.pillar"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
            :class="{
              'bg-wuxing-wood/10 text-wuxing-wood border border-wuxing-wood/25': shen.category === '吉',
              'bg-cinnabar/5 text-cinnabar border border-cinnabar/20': shen.category === '凶',
              'bg-paper-dark/30 text-ink-medium border border-paper-dark/50': shen.category === '中性',
            }"
          >
            <span class="font-display text-sm">{{ shen.name }}</span>
            <span class="opacity-60 text-xs">{{ shen.pillar }}</span>
          </span>
        </div>
        <p class="text-sm">
          <template v-for="(shen, i) in readingGuideShensha" :key="shen.name + shen.pillar">
            <strong :class="shen.category === '吉' ? 'text-wuxing-wood' : shen.category === '凶' ? 'text-cinnabar/80' : 'text-ink-medium'">{{ shen.name }}</strong>（{{ shen.pillar }}）：{{ shen.description }}<template v-if="i < readingGuideShensha.length - 1">；</template>
          </template>
        </p>
      </div>

      <!-- Section 3: 今年运势 -->
      <div v-if="currentYearLiuNian">
        <h3 class="font-sans text-sm font-medium text-ink-dark mb-2">今年运势（{{ currentYearLiuNian.year }}年）</h3>
        <div class="flex items-center gap-3 mb-2">
          <span class="font-display text-lg text-ink-dark">{{ currentYearLiuNian.stem }}{{ currentYearLiuNian.branch }}</span>
          <span class="px-2 py-0.5 rounded text-xs font-medium bg-paper-dark/30 text-ink-medium">{{ currentYearLiuNian.tenGod }}</span>
          <span class="text-xs" :class="currentYearLiuNian.isFavorable ? 'text-wuxing-wood' : currentYearLiuNian.isUnfavorable ? 'text-cinnabar/80' : 'text-ink-medium'">
            {{ currentYearLiuNian.isFavorable ? '喜用' : currentYearLiuNian.isUnfavorable ? '忌神' : '中性' }}
          </span>
          <span class="ml-auto font-sans text-xs text-ink-medium">运势评分 {{ currentYearLiuNian.score }}/100</span>
        </div>
        <p class="text-sm">{{ currentYearLiuNian.summary }}</p>
        <div v-if="currentYearLiuNian.earthRelations.length > 0" class="mt-1.5">
          <p class="text-xs text-ink-medium">流年地支与命局关系：</p>
          <ul class="mt-0.5 space-y-0.5 text-xs text-ink-medium">
            <li v-for="(rel, i) in currentYearLiuNian.earthRelations" :key="i">
              <span class="font-medium">{{ rel.targetPillar }}{{ rel.type }}</span>：{{ rel.description }}
            </li>
          </ul>
        </div>
        <p v-if="currentYearLiuNian.detail?.daYunInteraction" class="mt-1.5 text-xs text-ink-medium">{{ currentYearLiuNian.detail.daYunInteraction }}</p>
      </div>

      <!-- Section 4: 当前大运 -->
      <div v-if="currentDaYun">
        <h3 class="font-sans text-sm font-medium text-ink-dark mb-2">当前大运</h3>
        <div class="flex items-center gap-3 mb-1">
          <span class="font-display text-lg text-ink-dark">{{ currentDaYun.stemBranch }}</span>
          <span class="text-xs text-ink-medium">{{ currentDaYun.startAge }}岁 - {{ currentDaYun.endAge }}岁</span>
        </div>
        <p class="text-sm">{{ currentDaYun.description }}，{{ getDaYunMeaning(currentDaYun.stemTenGod) }}</p>
      </div>

      <!-- Section 5: 五行建议 -->
      <div>
        <h3 class="font-sans text-sm font-medium text-ink-dark mb-2">五行建议</h3>
        <p class="text-sm mb-2">
          你的喜用神为<strong class="text-cinnabar">{{ favorableElements.join('、') }}</strong>，
          生活中多接触与这些元素相关的事物有助于运势提升。
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div v-for="el in favorableElements" :key="el" class="p-2 rounded-lg border" :style="{ borderColor: ELEMENT_COLORS[el] + '40', backgroundColor: ELEMENT_COLORS[el] + '08' }">
            <span class="font-medium" :style="{ color: ELEMENT_COLORS[el] }">{{ el }}</span>
            <span class="text-ink-medium ml-1">{{ ELEMENT_LIFE_AREA[el] }}</span>
          </div>
        </div>
        <template v-if="unfavorableElements.length > 0">
          <p class="text-xs text-ink-medium mt-2 mb-1">以下元素适度即可，不必刻意回避：</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div v-for="el in unfavorableElements" :key="el"
              class="p-2 rounded-lg border"
              :style="{ borderColor: ELEMENT_COLORS[el] + '25', backgroundColor: ELEMENT_COLORS[el] + '05' }">
              <span class="font-medium" :style="{ color: ELEMENT_COLORS[el], opacity: 0.7 }">{{ el }}</span>
              <span class="text-ink-muted ml-1">{{ ELEMENT_LIFE_AREA[el] }}</span>
              <span class="text-ink-muted ml-1">（适度）</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShenSha } from '~/composables/useShenSha'
import type { LiuNianYear } from '~/composables/useLiuNian'
import type { DaYunCycle } from '~/composables/useBaZi'
import { WUXING_COLORS as ELEMENT_COLORS, ELEMENT_LIFE_AREA, getDaYunMeaning } from '~/constants/bazi'

defineProps<{
  dayMaster: string
  dayMasterWuxing: string
  dayMasterStrength: string
  favorableElements: string[]
  unfavorableElements: string[]
  readingGuideShensha: ShenSha[]
  currentYearLiuNian: LiuNianYear | null
  currentDaYun: DaYunCycle | null
}>()
</script>
