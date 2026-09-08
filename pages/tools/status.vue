<script setup lang="ts">
import { getStatusOnlyToolFromQuery } from '~/constants/tool-catalog'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import PageHero from '~/components/tools/PageHero.vue'

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
</script>

<template>
  <ToolPageLayout>
    <section
      v-if="statusOnlyTool"
      class="max-w-[48rem] mx-auto"
      aria-labelledby="tool-status-heading"
    >
      <PageHero emoji="整" :title="statusOnlyTool.name" subtitle="功能状态说明" />

      <section aria-labelledby="tool-status-heading" class="card-warm rounded-xl p-8">
        <h2 id="tool-status-heading" class="font-display text-xl text-ink-dark mb-4">功能整理中</h2>
        <p class="font-sans text-sm sm:text-base text-ink-medium leading-relaxed">
          该功能正在依据与规则整理中，暂不提供新的计算结果。
        </p>
        <NuxtLink to="/" class="btn-ghost no-underline inline-flex mt-6"> 返回首页 </NuxtLink>
      </section>
    </section>
  </ToolPageLayout>
</template>
