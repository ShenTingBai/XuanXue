<script setup lang="ts">
import { computed } from 'vue'
import type { BaziDateComparison } from '~/types/bazi'

/**
 * 日期对照（页面 Ⅳ 段）：用户原始表达 → 规范化公历 → 对应农历 → 转换规则版本。
 *
 * 设计基线：docs/design/2026-09-15-bazi-ui-spec.md §2 Ⅳ 段（强化「你填写的 / 换算的」标签）。
 * 依据契约 §4 与任务书 §2 第 4 条：
 * - 必须区分「用户填写」与「依规则换算」，不得把换算结果显示成用户输入；
 * - 农历必须带闰月状态（普通月 / 闰月），不得省略；
 * - 只呈现历法事实，不掺入传统分类或规则差异判断；
 * - 窄屏不产生页面级横向滚动：对照项在窄屏改为上下排列，不靠横向滚动兜底。
 */

const props = defineProps<{
  comparison: BaziDateComparison
}>()

const lunarText = computed(() => {
  const lunar = props.comparison.lunar
  return `${lunar.year} 年${lunar.isLeapMonth ? '闰' : ''}${lunar.month} 月${lunar.day} 日（${
    lunar.isLeapMonth ? '闰月' : '普通月'
  }）`
})
</script>

<template>
  <section
    class="card-warm rounded-xl p-6 sm:p-8"
    data-bazi-date-comparison
    aria-labelledby="bazi-date-heading"
  >
    <h3 id="bazi-date-heading" class="font-display text-lg text-ink-dark">日期对照</h3>

    <dl class="mt-4 space-y-4 font-sans text-sm leading-relaxed">
      <!-- 你填写的：用户原始表达 -->
      <div class="bazi-compare-row">
        <dt class="bazi-compare-key">你填写的（原始表达）</dt>
        <dd class="text-ink-dark" data-bazi-original>{{ comparison.originalExpression }}</dd>
      </div>
      <!-- 依规则换算的：两行换算结果，标签明确标出「依规则换算」 -->
      <div class="bazi-compare-row">
        <dt class="bazi-compare-key">依规则换算的公历</dt>
        <dd class="text-ink-dark editorial-num" data-bazi-solar>
          {{ comparison.normalizedSolar }}
        </dd>
      </div>
      <div class="bazi-compare-row">
        <dt class="bazi-compare-key">依规则换算的农历</dt>
        <dd class="text-ink-dark editorial-num" data-bazi-lunar>{{ lunarText }}</dd>
      </div>
      <div class="bazi-compare-row">
        <dt class="bazi-compare-key">换算规则版本</dt>
        <dd class="text-ink-dark" data-bazi-conversion-version>
          {{ comparison.conversionVersion }}
        </dd>
      </div>
    </dl>

    <p class="mt-4 font-sans text-xs leading-relaxed text-ink-medium">
      标「依规则换算」的两行是程序按上述版本算出的结果，不是你填写的内容；若与历书不一致，以历书为准并请反馈。
    </p>
  </section>
</template>

<style scoped>
/* 宽屏键值两列；窄屏上下排列（不产生横向滚动） */
.bazi-compare-row {
  display: grid;
  grid-template-columns: 11rem minmax(0, 1fr);
  gap: 12px;
}
.bazi-compare-key {
  color: var(--color-ink-medium);
}
@media (max-width: 560px) {
  .bazi-compare-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
}
</style>
