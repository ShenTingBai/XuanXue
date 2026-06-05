<script setup lang="ts">
import { clearError } from '#app'

const props = defineProps<{
  error: {
    statusCode: number
    statusMessage?: string
    message?: string
    stack?: string
    data?: unknown
  }
}>()

const is404 = computed(() => props.error.statusCode === 404)

useHead({
  title: is404.value ? '此页未在卷中 · 玄学' : '墨未干，请稍候 · 玄学',
  htmlAttrs: { lang: 'zh-CN' },
})

const handleGoHome = () => {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="ink-wash-bg min-h-screen flex flex-col">
    <!-- Paper grain is already applied by body::after in the global CSS -->
    <div class="relative z-10 flex-1 flex flex-col">
      <!-- ══════════════════════════════════════ -->
      <!--  Main Content                         -->
      <!-- ══════════════════════════════════════ -->
      <div class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div class="max-w-lg mx-auto text-center relative">
          <!-- Watermark character -->
          <span
            class="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
            aria-hidden="true"
          >
            <span
              class="font-display text-[12rem] sm:text-[16rem] leading-none opacity-[0.02] text-ink-dark"
            >
              {{ is404 ? '卷' : '墨' }}
            </span>
          </span>

          <!-- Status code seal -->
          <div class="fade-in mb-8" :style="{ '--delay': '0.05s' }">
            <span
              class="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 border-2 border-cinnabar rounded-full font-display text-3xl sm:text-4xl text-cinnabar"
              style="transform: rotate(-3deg)"
              aria-hidden="true"
            >
              {{ error.statusCode }}
            </span>
          </div>

          <!-- Heading -->
          <h1
            class="fade-in font-display text-4xl sm:text-5xl lg:text-6xl text-ink-dark leading-tight tracking-wide mb-6"
            :style="{ '--delay': '0.1s' }"
          >
            {{ is404 ? '此页未在卷中' : '墨未干，请稍候' }}
          </h1>

          <!-- Subtitle / description -->
          <p
            class="fade-in font-sans text-sm sm:text-base text-ink-light/90 leading-relaxed max-w-sm mx-auto mb-10"
            :style="{ '--delay': '0.15s' }"
          >
            <template v-if="is404">
              你欲寻的篇章不在此刻展开。<br />
              或许路径有误，或许它已散佚于时光之中。
            </template>
            <template v-else>
              卷中笔墨尚在酝酿，推演之路偶遇微澜。<br />
              请稍后再试，或回主页重拾思路。
            </template>
          </p>

          <!-- Ink branch decoration -->
          <div
            class="fade-in mb-10 max-w-[180px] mx-auto"
            :style="{ '--delay': '0.2s' }"
            aria-hidden="true"
          >
            <div class="ink-branch">
              <div class="ink-branch__main" />
              <div class="ink-branch__twig ink-branch__twig--top" />
              <div class="ink-branch__twig ink-branch__twig--bottom" />
              <div class="ink-branch__twig ink-branch__twig--far" />
              <div class="ink-branch__dot ink-branch__dot--near" />
              <div class="ink-branch__dot ink-branch__dot--mid" />
              <div class="ink-branch__dot ink-branch__dot--far" />
            </div>
          </div>

          <!-- Action buttons -->
          <div
            class="fade-in flex flex-col sm:flex-row items-center justify-center gap-4"
            :style="{ '--delay': '0.25s' }"
          >
            <button class="btn-seal" @click="handleGoHome">
              <span>回 到 首 页</span>
            </button>

            <NuxtLink to="/" class="btn-ghost font-sans text-sm tracking-wider">
              或返回首页
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════ -->
      <!--  Footer (simplified)                  -->
      <!-- ══════════════════════════════════════ -->
      <footer class="border-t border-paper-dark/30" role="contentinfo">
        <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="font-display text-base text-ink-dark tracking-wider">玄学</span>
              <span class="text-[0.6rem] text-ink-faint">·</span>
              <span class="text-xs text-ink-light/80 font-sans">命理推演 · 知己知天</span>
            </div>
            <p class="text-xs text-ink-medium/80 font-sans">
              &copy; {{ new Date().getFullYear() }} 玄学 · 仅供娱乐参考
            </p>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>
