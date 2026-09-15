<script setup lang="ts">
import { computed } from 'vue'
import { BAZI_FAILURE_REASONS } from '~/constants/bazi-rules'
import type { ToolResultState } from '~/types/tool-result'

/**
 * 八字结果状态横幅（页面 Ⅲ 段，位于摘要之前）。
 *
 * 依据治理规范 §4.3（状态先于摘要）、§7.3/§7.4 与设计文档 §3 的状态文案词典。
 * 约束：
 * - 只用 `ToolResultState` 的四维表达，不新增并列总状态；
 * - 文案随状态变化，颜色不是唯一区分手段：每条状态都带文字标签与语义角色
 *   （成功/提示用 `role="status"`，失败用 `role="alert"`）；
 * - 不回退默认结果：`engine_error` 明确写「未生成任何默认结果」；
 * - 完整性与缺失项由专用字段承担，不靠限定词暗示。
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
    <div v-if="state.phase === 'processing'" class="card-warm rounded-xl p-6 sm:p-8" role="status">
      <p class="font-sans text-sm text-ink-medium">正在生成三柱…</p>
    </div>

    <!-- 失败：日期无效 / 超出范围 / 引擎未完成 -->
    <div
      v-else-if="state.phase === 'failure'"
      class="card-warm rounded-xl p-6 sm:p-8 border-l-[3px] border-l-cinnabar"
      role="alert"
    >
      <h2 class="font-display text-lg text-ink-dark">未能生成结果</h2>
      <p class="mt-2 font-sans text-sm text-ink-medium">
        <span v-if="state.failureCategory === 'invalid_input'">日期无效：</span>
        <span v-else-if="state.failureCategory === 'unsupported_input'">超出当前支持范围：</span>
        {{ failureText }}
      </p>
      <p class="mt-1 font-sans text-xs text-ink-medium">{{ failureHint }}</p>
    </div>

    <!-- 成功：stale 优先提示（保留旧结果，不自动重算） -->
    <div
      v-else-if="state.phase === 'success' && state.freshness === 'stale'"
      class="card-warm rounded-xl p-6 sm:p-8 border-l-[3px] border-l-gold"
      role="status"
    >
      <p class="font-sans text-sm text-ink-dark">输入已修改，结果尚未更新。</p>
      <p v-if="staleInputSummary" class="mt-1 font-sans text-xs text-ink-medium">
        下列结果对应的是修改前的输入：{{
          staleInputSummary
        }}。主动点击「生成三柱结果」后才会重新计算。
      </p>
    </div>

    <!-- 成功：候选（跨节，年柱/月柱有两种可能） -->
    <div
      v-else-if="state.phase === 'success' && state.successQualifier === 'candidate'"
      class="card-warm rounded-xl p-6 sm:p-8 border-l-[3px] border-l-gold"
      role="status"
    >
      <p class="font-sans text-sm text-ink-dark">
        该日期跨{{ boundaryLabel }}，年柱与月柱各有 2 种可能，见下方逐项对比。
      </p>
      <p class="mt-1 font-sans text-xs text-ink-medium">
        日柱不受影响：它只由日期决定，因此仍然唯一。
      </p>
    </div>

    <!-- 成功：日期级结果（缺出生时刻 → partial，完整性分母写明 3/4） -->
    <div
      v-else-if="state.phase === 'success'"
      class="card-warm rounded-xl p-6 sm:p-8 border-l-[3px] border-l-jade"
      role="status"
    >
      <p class="font-sans text-sm text-ink-dark">
        已生成日期级结果：三柱（年、月、日）／共四柱，缺时柱。
      </p>
      <p class="mt-1 font-sans text-xs text-ink-medium">
        缺少出生时刻不是错误：时柱需要出生时刻，本版只依据出生日期。
      </p>
    </div>

    <!-- 保存失败：本次结果仍未保存，可重试（不改变结果状态） -->
    <p
      v-if="saveFailed"
      class="mt-3 font-sans text-sm text-cinnabar"
      role="alert"
      data-bazi-save-failed
    >
      保存未完成：本次结果仍未保存，可稍后重试。页面上的结果不会被删除。
    </p>
  </section>
</template>
