<script setup lang="ts">
import { computed } from 'vue'
import { BAZI_FAILURE_REASONS } from '~/constants/bazi-rules'
import type { ToolResultState } from '~/types/tool-result'

/**
 * 八字结果状态横幅（页面 Ⅲ 段，位于摘要之前）。
 *
 * 依据治理规范 §4.3（状态先于摘要）、§7.3/§7.4 与设计规格
 * docs/design/2026-09-15-bazi-ui-spec.md §3（状态矩阵）+ §4（可访问性）：
 * - 只用 `ToolResultState` 的四维表达，不新增并列总状态；
 * - 四类状态一律**文字 + 图标 + 颜色三重编码**：颜色只是第三重，
 *   不得成为唯一区分手段（图标 `aria-hidden`，语义由文字承担）；
 * - 失败类用 `role="alert"`，成功与提示用 `role="status"`；
 * - 不回退默认结果：`engine_error` 明确写「未生成任何默认结果」；
 * - 保存失败是独立反馈（`saveFailed`），不改变结果状态本身。
 */

const props = defineProps<{
  state: ToolResultState
  /** stale 时展示旧结果所用输入的摘要（如「公历 2000-08-07」）。 */
  staleInputSummary?: string
  /** candidate 时涉及的「节」名（如「立春」）。 */
  boundaryTerm?: string
  /** 保存失败提示（保存流程单独反馈，不改变结果状态）。 */
  saveFailed?: boolean
}>()

/** 状态图标：与文案、色相共同构成三重编码；判定顺序必须与模板分支一致。 */
const glyph = computed(() => {
  if (props.state.phase === 'failure') return '!'
  if (props.state.phase === 'processing') return '⋯'
  // stale 优先于 candidate：此时模板显示的是「输入已修改」，图标必须是 ↻，
  // 否则图标与文字互相矛盾（R5-C 真机验收实测：stale 的候选结果显示成 ⋯）。
  if (props.state.phase === 'success' && props.state.freshness === 'stale') return '↻'
  if (props.state.phase === 'success' && props.state.successQualifier === 'candidate') return '⋯'
  return '✓'
})

/** 状态色相：jade 成功 / gold 候选与过期 / alert 失败 / muted 处理中。 */
const tone = computed(() => {
  if (props.state.phase === 'failure') return 'alert'
  if (props.state.phase === 'processing') return 'muted'
  if (props.state.phase === 'success' && props.state.freshness === 'stale') return 'gold'
  if (props.state.phase === 'success' && props.state.successQualifier === 'candidate') return 'gold'
  return 'jade'
})

/** 失败类别 → 用户可见文案；具体原因优先取错误码文案表。 */
const failureText = computed(() => {
  if (props.state.phase !== 'failure') return ''
  const code = props.state.failureDetailCode ?? ''
  const specific = BAZI_FAILURE_REASONS[code]
  if (specific) return specific
  switch (props.state.failureCategory) {
    case 'unsupported_input':
      return '超出当前支持范围（1901-01-01 至今）'
    case 'engine_error':
      return '历法计算未完成，未生成任何默认结果'
    case 'network_error':
      return '网络中断，本次结果仍未保存'
    default:
      return '日期无效，请检查出生日期'
  }
})

/** 失败类别 → 输入是否保留的说明（治理规范 §7.3）。 */
const failureHint = computed(() => {
  if (props.state.phase !== 'failure') return ''
  return props.state.failureCategory === 'engine_error'
    ? '输入已保留，可稍后重新生成。'
    : '输入已保留，可直接修改后重新生成。'
})

const boundaryLabel = computed(() => (props.boundaryTerm ? `〈${props.boundaryTerm}〉` : '节气'))
</script>

<template>
  <section aria-live="polite" aria-atomic="true" data-bazi-status>
    <!-- 处理中 -->
    <div v-if="state.phase === 'processing'" class="bazi-status" :data-tone="tone" role="status">
      <span class="bazi-status__glyph" aria-hidden="true">{{ glyph }}</span>
      <p class="bazi-status__text">正在生成三柱…</p>
    </div>

    <!-- 失败：日期无效 / 超出范围 / 引擎未完成 -->
    <div v-else-if="state.phase === 'failure'" class="bazi-status" :data-tone="tone" role="alert">
      <span class="bazi-status__glyph" aria-hidden="true">{{ glyph }}</span>
      <div class="min-w-0">
        <p class="bazi-status__title">未能生成结果</p>
        <p class="bazi-status__text">
          <span v-if="state.failureCategory === 'invalid_input'">日期无效：</span>
          <span v-else-if="state.failureCategory === 'unsupported_input'">超出当前支持范围：</span>
          {{ failureText }}
        </p>
        <p class="bazi-status__hint">{{ failureHint }}</p>
      </div>
    </div>

    <!-- 成功：stale 优先提示（保留旧结果，不自动重算） -->
    <div
      v-else-if="state.phase === 'success' && state.freshness === 'stale'"
      class="bazi-status"
      :data-tone="tone"
      role="status"
    >
      <span class="bazi-status__glyph" aria-hidden="true">{{ glyph }}</span>
      <div class="min-w-0">
        <p class="bazi-status__text bazi-status__text--strong">输入已修改，结果尚未更新。</p>
        <p v-if="staleInputSummary" class="bazi-status__hint">
          下列结果对应的是修改前的输入：{{
            staleInputSummary
          }}。主动点击「生成三柱结果」后才会重新计算。
        </p>
      </div>
    </div>

    <!-- 成功：候选（跨节，年柱/月柱有两种可能） -->
    <div
      v-else-if="state.phase === 'success' && state.successQualifier === 'candidate'"
      class="bazi-status"
      :data-tone="tone"
      role="status"
    >
      <span class="bazi-status__glyph" aria-hidden="true">{{ glyph }}</span>
      <div class="min-w-0">
        <p class="bazi-status__text bazi-status__text--strong">
          该日期跨{{ boundaryLabel }}，年柱与月柱各有 2 种可能，见下方逐项对比。
        </p>
        <p class="bazi-status__hint">日柱不受影响：它只由日期决定，因此仍然唯一。</p>
      </div>
    </div>

    <!-- 成功：日期级结果（缺出生时刻 → partial，完整性分母写明 3/4） -->
    <div v-else-if="state.phase === 'success'" class="bazi-status" :data-tone="tone" role="status">
      <span class="bazi-status__glyph" aria-hidden="true">{{ glyph }}</span>
      <div class="min-w-0">
        <p class="bazi-status__text bazi-status__text--strong">
          已生成日期级结果：三柱（年、月、日）／共四柱，缺时柱。
        </p>
        <p class="bazi-status__hint">
          缺少出生时刻不是错误：时柱需要出生时刻，本版只依据出生日期。
        </p>
      </div>
    </div>

    <!-- 保存失败：本次结果仍未保存，可重试（不改变结果状态） -->
    <p v-if="saveFailed" class="bazi-status__savefail" role="alert" data-bazi-save-failed>
      保存未完成：本次结果仍未保存，可稍后重试。页面上的结果不会被删除。
    </p>
  </section>
</template>

<style scoped>
/* 状态卡：图标 + 文字两列；色相只作第三重编码，描边与图标同时表达轻重。 */
.bazi-status {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 22px;
  border: 1px solid var(--color-ink-faint);
  border-left-width: 3px;
  border-radius: 10px;
  background: var(--color-paper-lightest);
}

.bazi-status__glyph {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  border: 1px solid currentColor;
  font-size: 0.8125rem;
  line-height: 1;
}

.bazi-status__title {
  margin: 0 0 4px;
  font-family: var(--font-display);
  font-size: 1.0625rem;
  color: var(--color-ink-dark);
}

.bazi-status__text {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--color-ink-medium);
}

.bazi-status__text--strong {
  color: var(--color-ink-dark);
}

.bazi-status__hint {
  margin: 4px 0 0;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--color-ink-medium);
}

/* ── 色相：成功 / 候选与过期 / 失败 / 处理中 ── */
.bazi-status[data-tone='jade'] {
  color: var(--color-jade);
  border-left-color: var(--color-jade);
  background: color-mix(in srgb, var(--color-jade) 5%, var(--color-paper-lightest));
}

.bazi-status[data-tone='gold'] {
  color: var(--color-gold);
  border-left-color: var(--color-gold);
  background: color-mix(in srgb, var(--color-gold) 6%, var(--color-paper-lightest));
}

.bazi-status[data-tone='alert'] {
  color: var(--color-cinnabar-dark);
  border-left-color: var(--color-cinnabar-dark);
  background: color-mix(in srgb, var(--color-cinnabar-dark) 5%, var(--color-paper-lightest));
}

.bazi-status[data-tone='muted'] {
  color: var(--color-ink-medium);
  border-left-color: var(--color-ink-faint);
}

/* 保存失败：单独一行，朱砂描边 + 文字说明，不用整块红底 */
.bazi-status__savefail {
  margin: 12px 0 0;
  padding: 12px 16px;
  border: 1px solid color-mix(in srgb, var(--color-cinnabar-dark) 40%, transparent);
  border-radius: 10px;
  background: var(--color-paper-lightest);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--color-cinnabar-dark);
}
</style>
