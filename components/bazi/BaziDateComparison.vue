<script setup lang="ts">
import { computed } from 'vue'
import type { BaziDateComparison } from '~/types/bazi'

/**
 * 日期对照（页面 Ⅳ 段）：用户原始表达 → 规范化公历 → 对应农历 → 转换规则版本。
 *
 * 依据契约 §4 与设计文档 §3 Ⅳ.3：
 * - 必须区分「用户填写」与「依规则换算」，不得把换算结果显示成用户输入；
 * - 农历必须带闰月状态（普通月 / 闰月），不得省略；
 * - 只呈现历法事实，不掺入传统分类或规则差异判断。
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

    <dl class="mt-3 space-y-3 font-sans text-sm leading-relaxed">
      <div class="flex flex-col gap-1 sm:flex-row sm:gap-3">
        <dt class="sm:w-40 flex-shrink-0 text-ink-medium">你填写的（原始表达）</dt>
        <dd class="text-ink-dark" data-bazi-original>{{ comparison.originalExpression }}</dd>
      </div>
      <div class="flex flex-col gap-1 sm:flex-row sm:gap-3">
        <dt class="sm:w-40 flex-shrink-0 text-ink-medium">依规则换算的公历</dt>
        <dd class="text-ink-dark editorial-num" data-bazi-solar>
          {{ comparison.normalizedSolar }}
        </dd>
      </div>
      <div class="flex flex-col gap-1 sm:flex-row sm:gap-3">
        <dt class="sm:w-40 flex-shrink-0 text-ink-medium">对应农历</dt>
        <dd class="text-ink-dark editorial-num" data-bazi-lunar>{{ lunarText }}</dd>
      </div>
      <div class="flex flex-col gap-1 sm:flex-row sm:gap-3">
        <dt class="sm:w-40 flex-shrink-0 text-ink-medium">换算规则版本</dt>
        <dd class="text-ink-dark" data-bazi-conversion-version>
          {{ comparison.conversionVersion }}
        </dd>
      </div>
    </dl>

    <p class="mt-3 font-sans text-xs text-ink-medium leading-relaxed">
      标「依规则换算」的两行是程序按上述版本算出的结果，不是你填写的内容；若与历书不一致，以历书为准并请反馈。
    </p>
  </section>
</template>
