<script setup lang="ts">
import PageFooter from '~/components/tools/PageFooter.vue'

useSeoMeta({
  title: '账号 — 玄·道',
  ogTitle: '账号 — 玄·道',
  description: '账号设置',
  ogDescription: '账号设置',
  ogType: 'website',
})

// 旧档案页面在 R4 前只重定向到 /account，不读取路由参数、不调用旧档案接口。
const router = useRouter()

onMounted(() => {
  router.replace('/account')
})
</script>

<template>
  <div class="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
    <p class="font-sans text-sm text-ink-medium tracking-[0.1em]">正在前往账号设置…</p>
  </div>
  <PageFooter />
</template>
