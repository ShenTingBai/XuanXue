<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ShengXiaoResult } from '~/types/shengxiao'
import { resolveSourceLink, resolveSourceTitle } from '~/constants/shengxiao-sources'

/**
 * 生肖结果展示组件（契约 §9.1 基础结果 + §9.2 传统分类 + §23.1 信息层级）。
 *
 * - 只接收规范化的领域结果对象，不自行计算；
 * - 传统分类准确命名：年干五行、年支五行、纳音，不写「你的生肖五行」；
 * - 解释正月初一与八字立春差异（契约 §8.2，文案已获批）；
 * - 隐私文化卡片 DOM 只含文化分类与版本，不含出生日期/昵称/账号标识。
 */
const props = defineProps<{
  result: ShengXiaoResult
}>()

/** 详细传统分类默认收起；生肖、地支、干支年、年界与范围始终直接可见。 */
const classificationExpanded = ref(false)

/** 隐私文化卡片 DOM，供页面导入（不含出生日期）。 */
const privacyCardEl = ref<HTMLElement | null>(null)
defineExpose({ privacyCardEl })

/** 隐私文化卡片数据：不含完整出生日期。 */
const cultureCardItems = computed(() => [
  { label: '生肖', value: props.result.animal },
  { label: '地支', value: props.result.earthlyBranch },
  { label: '干支年', value: props.result.ganZhiYear },
  { label: '年干五行', value: props.result.stemElement },
  { label: '年支五行', value: props.result.branchElement },
  { label: '纳音', value: props.result.naYin },
])

function visibleSources() {
  return props.result.sourceRefs.map(ref => ({
    ref,
    title: resolveSourceTitle(ref),
    link: resolveSourceLink(ref),
  }))
}
</script>

<template>
  <div class="verified-result space-y-6">
    <!-- 基础结果（契约 §9.1） -->
    <section class="card-warm rounded-xl p-6 sm:p-8" aria-labelledby="shengxiao-result-heading">
      <div class="flex items-center justify-between mb-4">
        <h2
          id="shengxiao-result-heading"
          class="section-header font-display text-xl text-ink-dark !mb-0"
        >
          生肖结果
        </h2>
      </div>

      <dl class="verified-result__grid">
        <div class="verified-result__cell">
          <dt>公历出生日期</dt>
          <dd>{{ result.inputDate }}</dd>
        </div>
        <div class="verified-result__cell">
          <dt>农历日期</dt>
          <dd>{{ result.lunarDate }}</dd>
        </div>
        <div class="verified-result__cell">
          <dt>干支年</dt>
          <dd>{{ result.ganZhiYear }}</dd>
        </div>
        <div class="verified-result__cell">
          <dt>生肖</dt>
          <dd class="text-cinnabar">{{ result.animal }}</dd>
        </div>
        <div class="verified-result__cell">
          <dt>对应地支</dt>
          <dd>{{ result.earthlyBranch }}</dd>
        </div>
      </dl>

      <p class="mt-4 font-sans text-sm text-ink-medium leading-relaxed">
        本页按农历正月初一判断民俗生肖；八字年柱按精确立春判断。两者服务于不同的文化与术数用途，因此可能出现不同结果，并不代表其中一个计算错误。
      </p>
    </section>

    <!-- 传统分类（契约 §9.2）：详细传统分类解释默认收起。
         生肖、地支、干支年与下方「年界与范围」始终直接可见，
         折叠只影响详细程度，不隐藏年界、范围、隐私与关键限制。 -->
    <section
      class="card-warm rounded-xl p-6 sm:p-8"
      aria-labelledby="shengxiao-classification-heading"
    >
      <div class="flex items-start justify-between gap-4 mb-4">
        <h2
          id="shengxiao-classification-heading"
          class="section-header font-display text-xl text-ink-dark !mb-0"
        >
          传统分类
        </h2>
        <button
          :aria-expanded="classificationExpanded"
          aria-controls="shengxiao-classification-panel"
          class="marginal-toggle flex-shrink-0"
          @click="classificationExpanded = !classificationExpanded"
          @keydown.enter="classificationExpanded = !classificationExpanded"
          @keydown.space.prevent="classificationExpanded = !classificationExpanded"
        >
          <span class="marginal-toggle__rule" aria-hidden="true" />
          <span>{{ classificationExpanded ? '收起' : '展开' }}</span>
          <span class="marginal-toggle__arrow" aria-hidden="true">▼</span>
        </button>
      </div>
      <Transition name="expand">
        <div v-if="classificationExpanded" id="shengxiao-classification-panel">
          <dl class="verified-result__grid">
            <div class="verified-result__cell">
              <dt>年干五行</dt>
              <dd>{{ result.stemElement }}</dd>
            </div>
            <div class="verified-result__cell">
              <dt>年干阴阳</dt>
              <dd>{{ result.yinYang }}</dd>
            </div>
            <div class="verified-result__cell">
              <dt>年支五行</dt>
              <dd>{{ result.branchElement }}</dd>
            </div>
            <div class="verified-result__cell">
              <dt>六十甲子纳音</dt>
              <dd>{{ result.naYin }}</dd>
            </div>
          </dl>
        </div>
      </Transition>
      <!-- 关键限制：不随详细字段折叠——「不能推出什么」必须先于展开可见。 -->
      <p class="mt-3 font-sans text-xs text-ink-medium leading-relaxed">
        年干五行、年支五行与纳音是三个不同的传统分类概念，不代表个人整体五行强弱，也不能推出喜用神、性格或命运。
      </p>
    </section>

    <!-- 年界与版本 -->
    <section class="card-warm rounded-xl p-6 sm:p-8" aria-labelledby="shengxiao-boundary-heading">
      <h2 id="shengxiao-boundary-heading" class="section-header font-display text-xl text-ink-dark">
        年界与范围
      </h2>
      <dl class="verified-result__grid">
        <div class="verified-result__cell">
          <dt>该农历年公历起</dt>
          <dd>{{ result.yearBoundary.startDate }}</dd>
        </div>
        <div class="verified-result__cell">
          <dt>该农历年公历止</dt>
          <dd>{{ result.yearBoundary.endDate }}</dd>
        </div>
        <div class="verified-result__cell">
          <dt>时区</dt>
          <dd>{{ result.yearBoundary.timezone }}</dd>
        </div>
        <div class="verified-result__cell">
          <dt>规则版本</dt>
          <dd>{{ result.ruleVersion }}</dd>
        </div>
      </dl>
    </section>

    <!-- 依据与范围（正常阅读流，替代悬浮注） -->
    <section class="card-warm rounded-xl p-6 sm:p-8" aria-labelledby="shengxiao-sources-heading">
      <h2 id="shengxiao-sources-heading" class="section-header font-display text-xl text-ink-dark">
        依据与范围
      </h2>
      <p class="font-sans text-sm text-ink-medium leading-relaxed">
        生肖年界采用中国农历正月初一（契约
        §8.1）。传统分类仅表示特定传统体系的分类对应关系，不作个人命运判断。
      </p>
      <ul class="mt-3 space-y-2">
        <li v-for="s in visibleSources()" :key="s.ref" class="font-sans text-sm">
          <a
            :href="s.link"
            target="_blank"
            rel="noopener noreferrer"
            class="text-cinnabar underline break-words"
          >
            {{ s.title }}
          </a>
          <span class="text-ink-light">（{{ s.ref }}）</span>
        </li>
      </ul>
    </section>

    <!-- 间距留在导出节点外，避免根节点外边距进入图片而裁掉底部。 -->
    <div>
      <!-- 隐私文化卡片：DOM 不含出生日期，仅文化分类与版本 -->
      <div
        ref="privacyCardEl"
        class="verified-result__card"
        aria-label="生肖文化卡片"
        data-privacy-card
      >
        <div class="verified-result__card-title">生肖文化卡片</div>
        <ul class="verified-result__card-list">
          <li v-for="item in cultureCardItems" :key="item.label">
            <span class="verified-result__card-label">{{ item.label }}</span>
            <span class="verified-result__card-value">{{ item.value }}</span>
          </li>
        </ul>
        <p class="verified-result__card-version">规则版本：{{ result.ruleVersion }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 折叠过渡：与设计系统 §4.1 标准模式一致。 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 2000px;
  opacity: 1;
}
.verified-result__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.verified-result__cell dt {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-light);
}
.verified-result__cell dd {
  margin-top: 0.25rem;
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--color-ink-dark);
  word-break: break-word;
}
.verified-result__card {
  border: 1px dashed color-mix(in srgb, var(--color-ink-faint) 40%, transparent);
  border-radius: 0.75rem;
  padding: 1.25rem;
}
.verified-result__card-title {
  font-family: var(--font-display);
  font-size: 1.125rem;
  color: var(--color-ink-dark);
  margin-bottom: 0.75rem;
}
.verified-result__card-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}
.verified-result__card-label {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-light);
  margin-right: 0.375rem;
}
.verified-result__card-value {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--color-ink-dark);
}
.verified-result__card-version {
  margin-top: 0.75rem;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-medium);
}
@media (max-width: 360px) {
  .verified-result__grid {
    grid-template-columns: 1fr;
  }
}
</style>
