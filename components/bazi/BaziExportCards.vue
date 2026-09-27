<script setup lang="ts">
import { ref } from 'vue'

/**
 * 八字双轨导出卡片（契约 §23.3：简洁分享版 / 完整自用版）。
 *
 * - 两个固定宽度的离屏导出目标：不截图页面，导航、输入控件、账号区、
 *   保存按钮与 Ⅴ 段来源清单全文都不会进入图片；
 * - 简洁分享卡不含精确出生资料：原始表达、规范化公历与农历由页面扣下，只传结果；
 * - 完整自用卡包含页面传入的完整出生输入，由用户在操作区主动选择导出；
 * - 字段白名单全部由 props 输入：组件不读取账号、档案或服务端，
 *   也不自行补默认值——无结果时页面不渲染本组件，不伪造导出内容。
 *
 * @author LiXinwen
 */
defineProps<{
  /** 结果状态行：与状态横幅同一事实（日期级三柱 / 跨节候选），不新增判断。 */
  statusText: string
  /** 柱行：唯一情形三柱并列；候选情形年月组合各一行（甲/乙文字标注），日柱恒有一行。 */
  pillars: Array<{
    label: string
    value: string
    note: string
    isDay: boolean
    dayMaster?: string
  }>
  /** 完整自用卡的精确出生输入行（原始表达 + 规范化换算）；简洁分享卡必须传空数组。 */
  birthRows: Array<{ label: string; value: string }>
  /** 两种图片都保留的边界与限制说明（精简组，不是 Ⅴ 段来源清单全文）。 */
  limitations: string[]
  ruleVersion: string
  sourceSetVersion: string
  /** 引擎名与版本（实现工具标注，不作规则权威）。 */
  engineLabel: string
  /** 计算时间：当前生成批次的北京时间查询日期（asOfDate）。 */
  asOfDate: string
}>()

/** 简洁分享卡 DOM（不含出生资料），供页面传入 useExportImage。 */
const simpleCardEl = ref<HTMLElement | null>(null)
/** 完整自用卡 DOM（含完整出生输入），供页面传入 useExportImage。 */
const fullCardEl = ref<HTMLElement | null>(null)
defineExpose({ simpleCardEl, fullCardEl })
</script>

<template>
  <!--
    两张卡都离屏且 aria-hidden：导出目标不占页面阅读流，知情义务由操作区按钮旁的
    文案承担。离屏方式用「0 尺寸容器裁剪」而不是卡片自身负偏移：html-to-image
    克隆节点时不会归零 computed 的 left，负偏移会把内容画到 foreignObject 视口外，
    产物整张空白（2026-09-27 真实浏览器验收实测）；卡片自身保持 left/top 0，
    裁剪只由不被克隆的父容器承担。
  -->
  <div class="bazi-export-stage" aria-hidden="true">
    <!-- 简洁分享卡：默认脱敏（契约 §23.3），不含出生日期与个人资料 -->
    <div ref="simpleCardEl" class="bazi-export-card" data-bazi-export-simple>
      <div class="bazi-export-card__title">八字排盘 · 分享卡</div>
      <p class="bazi-export-card__status">{{ statusText }}</p>

      <ul class="bazi-export-card__pillars">
        <li
          v-for="row in pillars"
          :key="row.label"
          class="bazi-export-card__pillar"
          :class="{ 'bazi-export-card__pillar--day': row.isDay }"
        >
          <span class="bazi-export-card__pillar-label">{{ row.label }}</span>
          <span class="bazi-export-card__pillar-value">{{ row.value }}</span>
          <span class="bazi-export-card__pillar-note">{{ row.note }}</span>
          <span v-if="row.dayMaster" class="bazi-export-card__pillar-master">
            日干 {{ row.dayMaster }}
          </span>
        </li>
      </ul>

      <dl class="bazi-export-card__meta">
        <div>
          <dt>规则版本</dt>
          <dd>{{ ruleVersion }}</dd>
        </div>
        <div>
          <dt>来源集合版本</dt>
          <dd>{{ sourceSetVersion }}</dd>
        </div>
        <div>
          <dt>引擎</dt>
          <dd>{{ engineLabel }}</dd>
        </div>
        <div>
          <dt>计算时间</dt>
          <dd>{{ asOfDate }}（北京时间查询日期）</dd>
        </div>
      </dl>

      <ul class="bazi-export-card__limits">
        <li v-for="item in limitations" :key="item">{{ item }}</li>
      </ul>

      <p class="bazi-export-card__source">完整来源与限制：见页面「依据与范围」</p>
    </div>

    <!-- 完整自用卡：用户主动选择后包含完整出生输入（不含账号与档案无关字段） -->
    <div ref="fullCardEl" class="bazi-export-card" data-bazi-export-full>
      <div class="bazi-export-card__title">八字基础排盘 · 完整版</div>
      <p class="bazi-export-card__note">本图片包含本次填写的完整出生日期，仅建议保存到本人设备。</p>
      <p class="bazi-export-card__status">{{ statusText }}</p>

      <dl class="bazi-export-card__birth">
        <div v-for="row in birthRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>

      <ul class="bazi-export-card__pillars">
        <li
          v-for="row in pillars"
          :key="row.label"
          class="bazi-export-card__pillar"
          :class="{ 'bazi-export-card__pillar--day': row.isDay }"
        >
          <span class="bazi-export-card__pillar-label">{{ row.label }}</span>
          <span class="bazi-export-card__pillar-value">{{ row.value }}</span>
          <span class="bazi-export-card__pillar-note">{{ row.note }}</span>
          <span v-if="row.dayMaster" class="bazi-export-card__pillar-master">
            日干 {{ row.dayMaster }}
          </span>
        </li>
      </ul>

      <dl class="bazi-export-card__meta">
        <div>
          <dt>规则版本</dt>
          <dd>{{ ruleVersion }}</dd>
        </div>
        <div>
          <dt>来源集合版本</dt>
          <dd>{{ sourceSetVersion }}</dd>
        </div>
        <div>
          <dt>引擎</dt>
          <dd>{{ engineLabel }}</dd>
        </div>
        <div>
          <dt>计算时间</dt>
          <dd>{{ asOfDate }}（北京时间查询日期）</dd>
        </div>
      </dl>

      <ul class="bazi-export-card__limits">
        <li v-for="item in limitations" :key="item">{{ item }}</li>
      </ul>

      <p class="bazi-export-card__source">完整来源与限制：见页面「依据与范围」</p>
    </div>
  </div>
</template>

<style scoped>
/*
 * 离屏舞台：0 尺寸 + overflow hidden，页面完全不可见也不占布局。
 * 裁剪放在这个不被克隆的容器上：html-to-image 只克隆卡片自身，
 * 卡片的 computed left/top 因此保持 0，不会把内容画到 foreignObject 视口外。
 */
.bazi-export-stage {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: hidden;
}
/* 固定 640px 版式：两张卡用同一宽度与纸色底，不截页面容器。 */
.bazi-export-card {
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
.bazi-export-card__title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  color: var(--color-ink-dark);
}
.bazi-export-card__note {
  margin-top: 0.75rem;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--color-ink-medium);
}
.bazi-export-card__status {
  margin-top: 0.75rem;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-ink-medium);
}
.bazi-export-card__pillars {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 1.25rem 0 0;
  padding: 0;
  list-style: none;
}
/* 日柱格用更实描边区分（与页面三柱一览一致：区分来自边框，不来自颜色）。 */
.bazi-export-card__pillar {
  min-width: 0;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-ink-faint);
  border-radius: 0.75rem;
}
.bazi-export-card__pillar--day {
  border-color: var(--color-ink-medium);
}
.bazi-export-card__pillar-label {
  display: block;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  color: var(--color-ink-medium);
}
.bazi-export-card__pillar-value {
  display: block;
  margin-top: 0.25rem;
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 0.15em;
  color: var(--color-ink-dark);
  overflow-wrap: anywhere;
}
.bazi-export-card__pillar-note,
.bazi-export-card__pillar-master {
  display: block;
  margin-top: 0.25rem;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--color-ink-medium);
  overflow-wrap: anywhere;
}
.bazi-export-card__birth,
.bazi-export-card__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 1.25rem 0 0;
}
.bazi-export-card__birth dt,
.bazi-export-card__meta dt {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-light);
}
.bazi-export-card__birth dd,
.bazi-export-card__meta dd {
  margin-top: 0.25rem;
  font-family: var(--font-sans);
  font-size: 1rem;
  color: var(--color-ink-dark);
  overflow-wrap: anywhere;
}
.bazi-export-card__limits {
  margin: 1.25rem 0 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--color-ink-medium);
}
.bazi-export-card__limits > li + li {
  margin-top: 4px;
}
.bazi-export-card__source {
  margin-top: 1.25rem;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-medium);
}
</style>
