<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ShengXiaoResult } from '~/types/shengxiao'

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
/** 完整结果图片 DOM，供页面导入（明确包含本次出生日期）。 */
const resultCardEl = ref<HTMLElement | null>(null)
defineExpose({ privacyCardEl, resultCardEl })

/** 隐私文化卡片数据：不含完整出生日期。 */
const cultureCardItems = computed(() => [
  { label: '生肖', value: props.result.animal },
  { label: '地支', value: props.result.earthlyBranch },
  { label: '干支年', value: props.result.ganZhiYear },
  { label: '年干五行', value: props.result.stemElement },
  { label: '年支五行', value: props.result.branchElement },
  { label: '纳音', value: props.result.naYin },
])
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

      <!-- 契约 §9.1：结果第一层保留来源入口；详细来源清单由页面 Ⅳ 段承载，此处不再重复同名标题。 -->
      <p class="mt-3 font-sans text-sm">
        <a href="#shengxiao-scope" class="text-cinnabar underline">
          查看依据与范围（来源清单与规则版本）
        </a>
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

      <!--
        完整结果图片的固定版式目标：
        - 与交互结果区分离，避免把按钮、折叠件和导航截入图片；
        - 明确包含出生日期，入口处另有提示，不与默认脱敏卡片混用；
        - 仅保留可核验结果字段和来源入口，不复制 Ⅳ 段来源台账。
        离屏方式（2026-09-27 真实浏览器验收修正）：0 尺寸 stage 承担「不可见且不占布局」，
        裁剪属性留在不被克隆的 stage 上；html-to-image 克隆节点不归零 computed 的
        left:-100000px，负偏移会把内容画到 foreignObject 视口外，产物尺寸正确但整张空白
        （与八字 BaziExportCards 同根因同修法）；导出目标保持卡片自身 left/top 0。
      -->
      <div class="verified-result__export-stage" aria-hidden="true">
        <div ref="resultCardEl" class="verified-result__export-card" data-result-card>
          <div class="verified-result__export-title">生肖结果</div>
          <p class="verified-result__export-note">本图片包含本次输入的公历出生日期。</p>
          <dl class="verified-result__export-grid">
            <div>
              <dt>公历出生日期</dt>
              <dd>{{ result.inputDate }}</dd>
            </div>
            <div>
              <dt>农历日期</dt>
              <dd>{{ result.lunarDate }}</dd>
            </div>
            <div>
              <dt>干支年</dt>
              <dd>{{ result.ganZhiYear }}</dd>
            </div>
            <div>
              <dt>生肖</dt>
              <dd>{{ result.animal }}</dd>
            </div>
            <div>
              <dt>对应地支</dt>
              <dd>{{ result.earthlyBranch }}</dd>
            </div>
            <div>
              <dt>规则版本</dt>
              <dd>{{ result.ruleVersion }}</dd>
            </div>
            <div>
              <dt>农历年公历起</dt>
              <dd>{{ result.yearBoundary.startDate }}</dd>
            </div>
            <div>
              <dt>农历年公历止</dt>
              <dd>{{ result.yearBoundary.endDate }}</dd>
            </div>
            <div>
              <dt>时区</dt>
              <dd>{{ result.yearBoundary.timezone }}</dd>
            </div>
          </dl>
          <p class="verified-result__export-source">来源入口：页面 Ⅳ「依据与范围」</p>
        </div>
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
/*
 * 离屏舞台：自身 0×0 + overflow hidden，页面不可见也不占布局。
 * 裁剪放在这个不被克隆的容器上：html-to-image 只克隆卡片自身，卡片 computed
 * left/top 保持 0，内容不会被画到 foreignObject 视口外（left:-100000px 的
 * 克隆产物是尺寸正确但整张空白的 PNG，2026-09-27 隔离生产预览实测复现）。
 */
.verified-result__export-stage {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: hidden;
}
.verified-result__export-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 640px;
  box-sizing: border-box;
  padding: 2rem;
  border: 1px solid var(--color-ink-faint);
  border-radius: 1rem;
  background: var(--color-paper-lightest);
  color: var(--color-ink-dark);
}
.verified-result__export-title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  color: var(--color-ink-dark);
}
.verified-result__export-note,
.verified-result__export-source {
  margin-top: 0.75rem;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--color-ink-medium);
}
.verified-result__export-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}
.verified-result__export-grid dt {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-light);
}
.verified-result__export-grid dd {
  margin-top: 0.25rem;
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--color-ink-dark);
  word-break: break-word;
}
@media (max-width: 360px) {
  .verified-result__grid {
    grid-template-columns: 1fr;
  }
}
</style>
