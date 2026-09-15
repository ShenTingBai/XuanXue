<script setup lang="ts">
import { computed } from 'vue'
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'
import type { BaziPillar } from '~/types/bazi'

/**
 * 单柱卡片（页面 Ⅳ 段）：干支 + 天干五行 + 地支五行。
 *
 * 硬边界（契约 §21、设计文档 §5）：
 * - 不显示十神、藏干、纳音、日主强弱、喜用神，也不给任何吉凶或现实判断；
 * - 日柱卡片额外标注「日干」（传统体系亦称「日主」，首现说明在 Ⅳ 段六问里）；
 * - 五行配色取自 `constants/bazi.ts` 的 `WUXING_COLORS`，回退色用 `WUXING_FALLBACK_COLOR`，
 *   但颜色不是唯一区分手段：每个五行都同时给出文字；
 * - 详细内容放卡片下方的正常文档流折叠区（原生 `details`），不使用固定 max-height。
 */

const props = defineProps<{
  /** 柱名（年柱 / 月柱 / 日柱）。 */
  label: string
  pillar: BaziPillar
  /** 是否为日柱：额外标注日干。 */
  isDay?: boolean
}>()

const ganZhi = computed(() => `${props.pillar.stem}${props.pillar.branch}`)

function elementColor(element: string): string {
  return WUXING_COLORS[element] ?? WUXING_FALLBACK_COLOR
}

const stemColor = computed(() => elementColor(props.pillar.stemElement))
const branchColor = computed(() => elementColor(props.pillar.branchElement))
</script>

<template>
  <article class="bazi-pillar card-warm rounded-xl p-5" :data-bazi-pillar="label">
    <h3 class="font-sans text-xs text-ink-medium tracking-[0.2em]">{{ label }}</h3>

    <p class="mt-2 font-display text-3xl text-ink-dark tracking-[0.2em]">{{ ganZhi }}</p>

    <dl class="mt-3 space-y-1 font-sans text-xs text-ink-medium">
      <div class="flex flex-wrap items-center gap-x-2">
        <dt>天干五行</dt>
        <dd class="flex items-center gap-1.5">
          <span class="bazi-swatch" :style="{ backgroundColor: stemColor }" aria-hidden="true" />
          <span>{{ pillar.stemElement }}</span>
        </dd>
      </div>
      <div class="flex flex-wrap items-center gap-x-2">
        <dt>地支五行</dt>
        <dd class="flex items-center gap-1.5">
          <span class="bazi-swatch" :style="{ backgroundColor: branchColor }" aria-hidden="true" />
          <span>{{ pillar.branchElement }}</span>
        </dd>
      </div>
    </dl>

    <p v-if="isDay" class="mt-3 font-sans text-sm text-ink-dark" data-bazi-day-master>
      日干：{{ pillar.stem }}
      <span class="font-sans text-xs text-ink-medium">
        （日柱天干；传统体系中亦称「日主」，本页主用「日干」）
      </span>
    </p>

    <details class="mt-3">
      <summary class="bazi-summary font-sans text-xs text-ink-medium">
        这一柱是怎么来的（展开计算说明）
      </summary>
      <dl class="mt-2 space-y-1.5 font-sans text-xs text-ink-medium leading-relaxed">
        <div>
          <dt class="inline">天干：</dt>
          <dd class="inline">{{ pillar.stem }}（{{ pillar.stemElement }}）</dd>
        </div>
        <div>
          <dt class="inline">地支：</dt>
          <dd class="inline">{{ pillar.branch }}（{{ pillar.branchElement }}）</dd>
        </div>
        <div>
          <dt class="inline">本页只做：</dt>
          <dd class="inline">
            按日期与节气边界查出这两个字并标注其传统五行分类，不据此推断强弱、喜忌或任何现实结论。
          </dd>
        </div>
        <div>
          <dt class="inline">不代表：</dt>
          <dd class="inline">
            干支与其五行是传统分类标签，不代表个人能力、性格、运势或健康；单个五行也不构成整体判断。
          </dd>
        </div>
      </dl>
    </details>
  </article>
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
.bazi-summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
  list-style: none;
}
.bazi-summary::before {
  content: '＋';
  margin-right: 0.375rem;
}
details[open] > .bazi-summary::before {
  content: '－';
}
.bazi-summary:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}
</style>
