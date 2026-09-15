<script setup lang="ts">
import { computed } from 'vue'
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'
import type { BaziPillar, BaziYearMonthPillars } from '~/types/bazi'

/**
 * 五行构成（页面 Ⅳ 段）：只统计已展示的那几个字的**字面出现次数**。
 *
 * 硬边界（治理规范 §21.2 禁止伪精确五行比例；契约 §16）：
 * - 这是字面统计，**不是**旺衰、强弱、平衡或喜忌判断；
 * - 不输出百分比、比例、权重或任何评分型表达；
 * - 只列出实际出现（次数 ≥ 1）的五行，**不使用「缺某行」这类措辞**，避免滑向用神判断；
 * - 跨节时年柱与月柱各有两种可能，此时只统计唯一确定的日柱两个字，并写明取值范围。
 */

const props = defineProps<{
  /** 日柱：任何状态下都唯一确定。 */
  dayPillar: BaziPillar
  /** 唯一情形下的年柱与月柱；跨节时候选存在两种可能，此值为 null。 */
  yearMonth: BaziYearMonthPillars | null
}>()

/** 五行固定顺序（木火土金水），保证同一结果每次渲染顺序一致。 */
const ELEMENT_ORDER = ['木', '火', '土', '金', '水'] as const

const pillars = computed<BaziPillar[]>(() =>
  props.yearMonth
    ? [props.yearMonth.year, props.yearMonth.month, props.dayPillar]
    : [props.dayPillar],
)

const charCount = computed(() => pillars.value.length * 2)

/** 字面计数：天干五行 + 地支五行各计一次。 */
const counts = computed(() => {
  const tally = new Map<string, number>()
  for (const pillar of pillars.value) {
    for (const element of [pillar.stemElement, pillar.branchElement]) {
      tally.set(element, (tally.get(element) ?? 0) + 1)
    }
  }
  return ELEMENT_ORDER.filter(element => (tally.get(element) ?? 0) > 0).map(element => ({
    element,
    count: tally.get(element) ?? 0,
    color: WUXING_COLORS[element] ?? WUXING_FALLBACK_COLOR,
  }))
})
</script>

<template>
  <section
    class="card-warm rounded-xl p-6 sm:p-8"
    data-bazi-element-composition
    aria-labelledby="bazi-elements-heading"
  >
    <h3 id="bazi-elements-heading" class="font-display text-lg text-ink-dark">五行构成</h3>

    <p class="mt-2 font-sans text-sm leading-relaxed text-ink-medium">
      口径：统计{{ yearMonth ? '年柱、月柱、日柱共 3 柱 6 个字' : '唯一确定的日柱 2 个字' }}
      （每柱天干、地支各一次）本身的基础五行。
    </p>

    <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
      <li v-for="item in counts" :key="item.element" class="bazi-pillar-wuxing text-ink-dark">
        <span class="bazi-swatch" :style="{ backgroundColor: item.color }" aria-hidden="true" />
        <span>{{ item.element }} ×{{ item.count }}</span>
      </li>
    </ul>

    <p class="mt-3 font-sans text-xs leading-relaxed text-ink-medium">
      这只是一种字面统计：{{ charCount }} 个字里各出现几次，仅此而已。
      它不代表旺衰、强弱、平衡与否，也不用于任何喜忌判断，更不构成对个人的判断。
    </p>

    <p
      v-if="!yearMonth"
      class="mt-2 font-sans text-xs leading-relaxed text-ink-medium"
      data-bazi-elements-scope
    >
      该日期跨「节」，年柱与月柱各有两种可能，因此这里只统计唯一确定的日柱两个字；
      两种情形各自的完整三柱见上方逐项对比。
    </p>
  </section>
</template>

<style scoped>
.bazi-swatch {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 2px;
  border: 1px solid color-mix(in srgb, var(--color-ink-faint) 60%, transparent);
  flex-shrink: 0;
}
</style>
