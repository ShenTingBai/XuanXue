<script setup lang="ts">
import { getHiddenToolFromQuery } from '~/constants/tool-catalog'

const route = useRoute()

const hiddenTool = computed(() => getHiddenToolFromQuery(route.query.tool))

useHead({
  title: '功能整理中 · 玄·道',
})

watch(
  hiddenTool,
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
    <section v-if="hiddenTool" class="max-w-[48rem] mx-auto" aria-labelledby="tool-status-heading">
      <PageHero emoji="整" :title="hiddenTool.name" subtitle="功能状态说明" />

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
