<script setup lang="ts">
import { getStatusOnlyToolFromQuery } from '~/constants/tool-catalog'
import ToolEditorialShell from '~/components/editorial/ToolEditorialShell.vue'

const route = useRoute()

const statusOnlyTool = computed(() => getStatusOnlyToolFromQuery(route.query.tool))

useHead({
  title: '功能整理中 · 玄·道',
})

watch(
  statusOnlyTool,
  tool => {
    if (!tool) {
      void navigateTo('/')
    }
  },
  { immediate: true },
)

/**
 * 卷目与脚注。
 *
 * 状态页只有一个真实分节（功能状态说明），不满足出版版版式「≥4 个锚点节」的适用判据；
 * 与其为凑满卷目编造段落，只列这一项——围栏落地页需要的是与工具页同一套外壳，
 * 不是更长的索引。
 */
const indexItems = [{ num: 'Ⅰ', label: '功能状态', href: '#tool-status' }]

/**
 * 卷目脚注：本页边界——该工具尚未公开。
 * 围栏状态说明由报头「不含计算入口」与正文状态卡共同承担，脚注不再重复，
 * 避免同一语义三处出现（脚注 ≤920px 隐藏，也不是状态文案的归宿）。
 */
const indexFootnote = '功能未公开'
</script>

<template>
  <!--
    围栏落地页：不可公开工具被重定向到这里。
    这不是计算页——除状态说明与回首页链接外，不放置任何输入、按钮或表单。
  -->
  <ToolEditorialShell
    v-if="statusOnlyTool"
    :index-items="indexItems"
    :index-footnote="indexFootnote"
    seal="整"
    edition="工具状态 · 未公开"
    :title="statusOnlyTool.name"
    subtitle="功能状态说明"
    status-text="功能整理中"
    meta-text="本页只说明状态 · 不含计算入口"
  >
    <section
      id="tool-status"
      class="editorial-section editorial-section--first"
      aria-labelledby="tool-status-heading"
    >
      <div class="card-warm rounded-xl p-8">
        <h2 id="tool-status-heading" class="font-display text-xl text-ink-dark mb-4">功能整理中</h2>
        <p class="font-sans text-sm sm:text-base text-ink-medium leading-relaxed">
          该功能正在依据与规则整理中，暂不提供新的计算结果。
        </p>
        <NuxtLink to="/" class="btn-ghost no-underline inline-flex mt-6"> 返回首页 </NuxtLink>
      </div>
    </section>
  </ToolEditorialShell>
</template>
