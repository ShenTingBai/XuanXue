<script setup lang="ts">
import { computed } from 'vue'
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'
import type { BaziPillar } from '~/types/bazi'

/**
 * 单柱卡片（页面 Ⅳ 段「把六个字讲清楚」）。
 *
 * 设计基线：docs/design/2026-09-15-bazi-ui-spec.md §2 Ⅳ 段。
 * 硬边界（契约 §21、任务书 §5 措辞红线）：
 * - 不显示十神、藏干、纳音、日主强弱、喜用神，也不给任何吉凶或现实判断；
 * - 日柱卡片额外标注「日干」（传统体系亦称「日主」，首现说明在 Ⅳ 段六问里）；
 * - 五行配色取自 `constants/bazi.ts` 的 `WUXING_COLORS`，回退 `WUXING_FALLBACK_COLOR`；
 *   **颜色不是唯一区分手段**：每个五行都同时给出文字；
 * - 详细内容放卡片下方正常文档流的原生 `details` 折叠区，不使用固定 max-height。
 */

const props = defineProps<{
  /** 柱名（年柱 / 月柱 / 日柱）。 */
  label: string
  pillar: BaziPillar
  /** 是否为日柱：额外标注日干。 */
  isDay?: boolean
}>()

const stem = computed(() => props.pillar.stem)
const branch = computed(() => props.pillar.branch)

function elementColor(element: string): string {
  return WUXING_COLORS[element] ?? WUXING_FALLBACK_COLOR
}

const stemColor = computed(() => elementColor(props.pillar.stemElement))
const branchColor = computed(() => elementColor(props.pillar.branchElement))
</script>

<template>
  <article class="card-warm rounded-xl p-4 sm:p-5" :data-bazi-pillar="label">
    <div class="flex items-center justify-between gap-2">
      <h4 class="font-sans text-xs tracking-[0.2em] text-ink-medium">{{ label }}</h4>
      <!-- 日柱用印章小印标注（不用左色条，避免颜色成为唯一标识） -->
      <span v-if="isDay" class="seal-icon" aria-hidden="true">日</span>
    </div>

    <!-- 干支：天干用地干五行色、地支用地支五行色，同时以文字写明五行 -->
    <p class="mt-2 font-display text-2xl tracking-[0.2em]">
      <span :style="{ color: stemColor }">{{ stem }}</span>
      <span :style="{ color: branchColor }">{{ branch }}</span>
    </p>

    <div class="mt-3 space-y-1.5">
      <p class="bazi-pillar-wuxing text-ink-medium">
        <span class="bazi-swatch" :style="{ backgroundColor: stemColor }" aria-hidden="true" />
        <span>天干 {{ stem }} · {{ pillar.stemElement }}</span>
      </p>
      <p class="bazi-pillar-wuxing text-ink-medium">
        <span class="bazi-swatch" :style="{ backgroundColor: branchColor }" aria-hidden="true" />
        <span>地支 {{ branch }} · {{ pillar.branchElement }}</span>
      </p>
    </div>

    <p v-if="isDay" class="mt-3 text-sm text-ink-dark" data-bazi-day-master>
      日干：{{ stem }}
      <span class="font-sans text-xs text-ink-medium">
        （日柱天干；传统体系中亦称「日主」，本页主用「日干」）
      </span>
    </p>

    <details class="mt-3">
      <summary class="bazi-summary font-sans text-xs">这一柱是怎么来的（展开计算说明）</summary>
      <dl class="mt-2 space-y-1.5 font-sans text-xs leading-relaxed text-ink-medium">
        <div>
          <dt class="inline">天干：</dt>
          <dd class="inline">{{ stem }}（{{ pillar.stemElement }}）</dd>
        </div>
        <div>
          <dt class="inline">地支：</dt>
          <dd class="inline">{{ branch }}（{{ pillar.branchElement }}）</dd>
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
/* 折叠摘要：≥44px 触控目标，键盘焦点可见；
   可展开性靠「方形 ＋/－ 标记 + 悬停底色 + 加深字色」表达，不只靠文字。 */
.bazi-summary {
  display: flex;
  min-height: 44px;
  align-items: center;
  padding-inline: 8px;
  margin-inline: -8px 0;
  border-radius: 6px;
  color: var(--color-ink-dark);
  cursor: pointer;
  list-style: none;
  transition: background var(--transition-fast);
}
.bazi-summary:hover {
  background: color-mix(in srgb, var(--color-ink-dark) 4%, transparent);
}
.bazi-summary::before {
  content: '＋';
  display: grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  border: 1px solid var(--color-cinnabar);
  border-radius: 3px;
  color: var(--color-cinnabar);
  font-size: 0.75rem;
  line-height: 1;
}
details[open] > .bazi-summary::before {
  content: '－';
  background: var(--color-cinnabar);
  color: var(--color-paper-lightest);
}
.bazi-summary:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}
</style>
