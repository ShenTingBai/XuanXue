<script setup lang="ts">
import { computed } from 'vue'
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'
import type { BaziScenario } from '~/types/bazi'

/**
 * 候选逐项对比（页面 Ⅳ 段，仅当结果跨「节」时显示）。
 *
 * 依据契约 §22.1 与规则台账 R-BZ-008：
 * - 每个情形按**完整的年柱 + 月柱整组**并列展示，禁止跨情形拼合，情形数不得叉乘；
 * - 每项必须带文字原因（如「立春前（当日 00:00 至 04:02）」），**不得只用颜色区分**；
 * - 情形数由引擎给出（恰好 2），组件不自行组合中间态；
 * - 边界距午夜小于阈值时，显式提示该判定对精度敏感。
 */

const props = defineProps<{
  scenarios: BaziScenario[]
  /** 涉及的「节」名（用于标题与精度提示）。 */
  boundaryTerm: string
  /** 边界是否迫近日界（距午夜 < BAZI_NEAR_MIDNIGHT_MINUTES）。 */
  nearMidnight?: boolean
  /** 边界时刻（北京时间 YYYY-MM-DD HH:mm）。 */
  boundaryInstant?: string
}>()

function elementColor(element: string): string {
  return WUXING_COLORS[element] ?? WUXING_FALLBACK_COLOR
}

/** 情形的文字标签：pre/post 必须落到可见文字，避免仅靠颜色区分。 */
function branchLabel(branch: BaziScenario['branch']): string {
  return branch === 'pre' ? '边界之前' : '边界之后'
}

const heading = computed(() => `跨越「${props.boundaryTerm || '节气'}」的两种可能`)
</script>

<template>
  <section
    class="card-warm rounded-xl p-6 sm:p-8"
    data-bazi-candidates
    aria-labelledby="bazi-candidates-heading"
  >
    <h3 id="bazi-candidates-heading" class="font-display text-lg text-ink-dark">{{ heading }}</h3>

    <p class="mt-2 font-sans text-sm text-ink-medium leading-relaxed">
      出生日期落在「{{
        boundaryTerm
      }}」当天，而填写内容不含出生时刻，因此无法确定这一刻之前还是之后。
      下面是两个完整情形，各自给出整组年柱与月柱；请勿把一个情形的年柱与另一个情形的月柱拼在一起使用。
      日柱由日期唯一确定，因此不在此列表中。
    </p>

    <p
      v-if="boundaryInstant"
      class="mt-2 font-sans text-xs text-ink-medium"
      data-bazi-boundary-instant
    >
      该「{{ boundaryTerm }}」的交节时刻（北京时间，分钟级）：{{ boundaryInstant }}
    </p>

    <p
      v-if="nearMidnight"
      class="mt-3 font-sans text-sm text-ink-dark border-l-[3px] border-l-cinnabar pl-3"
      role="alert"
      data-bazi-near-midnight
    >
      该边界迫近日界：交节时刻距 00:00 不足 5 分钟，判定结果对该时刻的精度敏感。
      若需要确定唯一的年柱与月柱，请补充出生时刻或与历书核对交节时刻。
    </p>

    <ol class="mt-4 grid gap-4 sm:grid-cols-2">
      <li
        v-for="(scenario, index) in scenarios"
        :key="`${scenario.branch}-${scenario.yearPillar.stem}${scenario.monthPillar.stem}`"
        class="rounded-lg border border-paper-dark p-4"
        :data-bazi-scenario="scenario.branch"
      >
        <p class="font-sans text-xs text-ink-medium tracking-[0.15em]">
          情形 {{ index + 1 }} · {{ branchLabel(scenario.branch) }}
        </p>
        <p class="mt-1 font-sans text-sm text-ink-dark" data-bazi-scenario-reason>
          {{ scenario.reason }}
        </p>

        <dl class="mt-3 space-y-2 font-sans text-xs text-ink-medium">
          <div class="flex flex-wrap items-center gap-2">
            <dt>年柱</dt>
            <dd class="font-display text-xl text-ink-dark tracking-[0.15em]">
              {{ scenario.yearPillar.stem }}{{ scenario.yearPillar.branch }}
            </dd>
            <dd class="flex items-center gap-1.5">
              <span
                class="bazi-swatch"
                :style="{ backgroundColor: elementColor(scenario.yearPillar.stemElement) }"
                aria-hidden="true"
              />
              <span>{{ scenario.yearPillar.stemElement }}</span>
            </dd>
            <dd class="flex items-center gap-1.5">
              <span
                class="bazi-swatch"
                :style="{ backgroundColor: elementColor(scenario.yearPillar.branchElement) }"
                aria-hidden="true"
              />
              <span>{{ scenario.yearPillar.branchElement }}</span>
            </dd>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <dt>月柱</dt>
            <dd class="font-display text-xl text-ink-dark tracking-[0.15em]">
              {{ scenario.monthPillar.stem }}{{ scenario.monthPillar.branch }}
            </dd>
            <dd class="flex items-center gap-1.5">
              <span
                class="bazi-swatch"
                :style="{ backgroundColor: elementColor(scenario.monthPillar.stemElement) }"
                aria-hidden="true"
              />
              <span>{{ scenario.monthPillar.stemElement }}</span>
            </dd>
            <dd class="flex items-center gap-1.5">
              <span
                class="bazi-swatch"
                :style="{ backgroundColor: elementColor(scenario.monthPillar.branchElement) }"
                aria-hidden="true"
              />
              <span>{{ scenario.monthPillar.branchElement }}</span>
            </dd>
          </div>
        </dl>
      </li>
    </ol>
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
