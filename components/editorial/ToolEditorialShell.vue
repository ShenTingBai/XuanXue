<script setup lang="ts">
import IndexNav from '~/components/editorial/IndexNav.vue'
import Masthead from '~/components/editorial/Masthead.vue'
import PageFooter from '~/components/tools/PageFooter.vue'

/**
 * 工具页统一外壳（组合件，2026-09-21）。
 *
 * 只做组合，不做设计：内部固定
 *   `.editorial-shell` → `IndexNav`（卷目） + `article.editorial-article`（`Masthead` + 内容）
 * → 页脚。
 * 工具页之间**只应有**段落、输入、结果与来源的差异，不应再出现第二套外壳
 * （此前 shengxiao / zeji / hehun 等 11 个工具页各自用 ToolPageLayout + 自建导航，
 * 与 bazi / account / self-profile 的出版版外壳并存）。
 *
 * 边界与用法约定：
 * - 组件**不推断**工具状态：状态胶囊、元信息、规则版本一律由页面格式化后传入；
 * - 不定义新的颜色、圆角或按钮；所有视觉来自既有的 `editorial-*`、`Masthead`、`IndexNav`；
 * - `indexFootnote` 必填：卷目脚注写该页**真实边界**（能用什么、不能用什么），
 *   不得沿用账号页的「账号名下唯一一份」文案，也不得为了让索引好看而编造结论；
 * - `indexItems` 的锚点必须指向页面**已有**的段落，不得为了让卷目变长而新增段
 *   （设计系统：卷目只是既有段序的目录）；
 * - 页面需要根级 scoped 样式时，请把样式挂在**页面自己渲染的容器**上
 *   （例如默认插槽里的 `<div class="bazi-page">`）。不要指望给外壳传 class 就能命中：
 *   本组件是多根结构（页脚与 `after` 插槽是根级兄弟），且子组件渲染的节点不带父组件的
 *   scope id，父组件的 scoped 选择器无法选中外壳内部元素。
 */
withDefaults(
  defineProps<{
    /** 卷目条目：num 为汉字数字，href 指向页面已有的段落 id。 */
    indexItems: Array<{ num: string; label: string; href: string }>
    /** 卷目脚注：本页真实边界，换行分两行呈现，窄屏隐藏。 */
    indexFootnote: string
    /** 眉题，如「工具 · 日期级排盘（年 / 月 / 日三柱）」。 */
    edition: string
    /** 报头主标题。 */
    title: string
    /** 副题，一行说明这条内容是什么。 */
    subtitle: string
    /** 状态胶囊文案；为空则不渲染胶囊（如内部验证中）。 */
    statusText?: string
    /** 元信息行文案（已格式化），如「规则版本 …」。 */
    metaText?: string
    /** 印章文字：工具页传自己的单字印章。 */
    seal?: string
  }>(),
  { seal: '玄' },
)
</script>

<template>
  <div class="editorial-shell">
    <IndexNav :items="indexItems" :footnote="indexFootnote" />

    <article class="editorial-article">
      <Masthead
        :seal="seal"
        :edition="edition"
        :title="title"
        :subtitle="subtitle"
        :status-text="statusText"
        :meta-text="metaText"
      />
      <!-- 报头补充区：放页面级事实/边界条，避免各工具重复自建报头。 -->
      <slot name="masthead-extra" />
      <slot />
    </article>
  </div>

  <!-- 根级附加区：弹层等不属于阅读流的节点，保持与外壳同级。 -->
  <slot name="after" />
  <PageFooter />
</template>
