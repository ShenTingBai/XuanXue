<script setup lang="ts">
import { ref } from 'vue'

/**
 * 记录卡：大字规范化公历 + 副行原历法表达 + 用于计算说明 + 转换与确认详情。
 *
 * 纯展示：所有文案与日期由页面格式化后传入，组件不做换算，也不读档案接口。
 */
defineProps<{
  /** 规范化公历的展示文本，如「1990年5月5日」。 */
  solarText: string
  /** 副行：原历法表达或农历对照；空串时不渲染该行。 */
  noteText: string
  /** 换算规则版本原文。 */
  conversionVersion: string
  /** 已格式化的最后确认时间。 */
  confirmedAt: string
  /** 原始口径标签，如「农历（本人主动填写）」。 */
  rawLabel: string
}>()

const explainOpen = ref(false)
</script>

<template>
  <div class="record">
    <span class="record-seal" aria-hidden="true">录</span>
    <p class="record-kicker">出生日期 · 公历</p>
    <p class="record-value">{{ solarText }}</p>
    <p v-if="noteText" class="record-note">{{ noteText }}</p>

    <dl class="trace">
      <div class="trace-item">
        <dt>用于计算</dt>
        <dd>工具按公历日期计算；你填写的原始口径一并保留，用于展示与追溯</dd>
      </div>
    </dl>

    <details class="details">
      <summary>转换与确认详情</summary>
      <dl class="details-body">
        <div class="trace-item">
          <dt>换算规则</dt>
          <dd>
            <span>{{ conversionVersion }}</span>
            <button
              type="button"
              class="explain-toggle"
              :aria-expanded="explainOpen"
              aria-controls="record-rule-explain"
              @click="explainOpen = !explainOpen"
            >
              换算依据是什么？
            </button>
          </dd>
        </div>
        <div class="trace-item">
          <dt>最后确认</dt>
          <dd class="num">{{ confirmedAt }}</dd>
        </div>
        <div class="trace-item">
          <dt>原始口径</dt>
          <dd>{{ rawLabel }}</dd>
        </div>
      </dl>
      <p v-if="explainOpen" id="record-rule-explain" class="explain">
        不同版本的历表，可能把同一个农历生日换算成不同的公历。这里记录的是你保存当时所用的换算版本，方便日后核对；它只说明日期是怎么换算的，不参与任何吉凶判断。
      </p>
    </details>
  </div>
</template>

<style scoped>
.record {
  position: relative;
  padding: 30px 32px;
  border: 1px solid var(--color-ink-faint);
  border-radius: 16px;
  background: var(--color-paper-light);
}

.record-seal {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  background: var(--color-cinnabar);
  color: var(--color-paper-lightest);
  font-family: var(--font-display);
  font-size: 1.1875rem;
  line-height: 1;
  opacity: 0.94;
}

.record-kicker {
  margin: 0 0 10px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  color: var(--color-ink-medium);
}

.record-value {
  margin: 0 0 8px;
  padding-right: 44px;
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 3.4vw, 2.375rem);
  line-height: 1.25;
  letter-spacing: 0.04em;
  color: var(--color-ink-dark);
}

.record-note {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-ink-medium);
}

.trace {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 40px;
  margin: 22px 0 0;
}

.trace-item dt {
  margin-bottom: 4px;
  font-size: 0.75rem;
  color: var(--color-ink-medium);
}

.trace-item dd {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--color-ink-dark);
}

.num {
  font-variant-numeric: tabular-nums;
}

.details {
  margin-top: 22px;
  padding-top: 14px;
  border-top: 1px dashed var(--color-ink-faint);
}

.details summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  font-size: 0.8125rem;
  color: var(--color-ink-medium);
  cursor: pointer;
  list-style: none;
}

.details summary::-webkit-details-marker {
  display: none;
}

.details summary::before {
  content: '+';
  font-family: var(--font-sans);
}

.details[open] summary::before {
  content: '−';
}

.details summary:hover {
  color: var(--color-ink-dark);
}

.details-body {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 40px;
  padding-top: 14px;
  margin: 0;
}

.details-body dt {
  margin-bottom: 3px;
  font-size: 0.75rem;
  color: var(--color-ink-medium);
}

.details-body dd {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-ink-dark);
}

.explain-toggle {
  display: inline;
  margin-left: 8px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.75rem;
  color: var(--color-ink-medium);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.explain-toggle:hover {
  color: var(--color-ink-dark);
}

.explain {
  margin: 14px 0 0;
  padding: 12px 14px;
  border: 1px solid var(--color-ink-faint);
  border-radius: 10px;
  background: var(--color-paper-lightest);
  font-size: 0.8125rem;
  line-height: 1.75;
  color: var(--color-ink-medium);
}
</style>
