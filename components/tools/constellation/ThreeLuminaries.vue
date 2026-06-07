<template>
  <div
    class="fade-in mt-8 mb-6"
    role="group"
    aria-labelledby="sanyuan-heading"
    :style="{ '--delay': '0.15s' }"
  >
    <div class="section-header">
      <h2 id="sanyuan-heading">三垣 · 星盘</h2>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <!-- ☀ 太阳 — 外在性格 -->
      <div
        class="card-warm rounded-xl p-5 min-h-[140px] flex flex-col border-t-2 luminary-sun fade-in"
        :style="{ '--delay': '0.2s' }"
      >
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-xl flex-shrink-0" aria-hidden="true">☀</span>
          <span class="font-display text-base text-ink tracking-wide"
            >太阳 · {{ result.name }}</span
          >
        </div>
        <span class="text-sm text-ink-medium font-sans tracking-wider mb-2"
          >外在性格 · 你展现给世界的样子</span
        >
        <p class="text-sm text-ink-medium font-sans leading-relaxed flex-1">
          {{ result.personality }}
        </p>
      </div>

      <!-- ☽ 月亮 — 内在情感（有数据） -->
      <div
        v-if="result.moonSign"
        class="card-warm rounded-xl p-5 min-h-[140px] flex flex-col border-t-2 luminary-moon fade-in"
        :style="{ '--delay': '0.25s' }"
      >
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-xl flex-shrink-0" aria-hidden="true">☽</span>
          <span class="font-display text-base text-ink tracking-wide"
            >月亮 · {{ result.moonSign.name }}</span
          >
          <span
            class="luminary-badge--moon inline-flex items-center px-1.5 py-0.5 rounded text-xs font-sans tracking-wider ml-auto"
            >本命盘</span
          >
        </div>
        <span class="text-sm text-ink-medium font-sans tracking-wider mb-2"
          >内在情感 · 你真实的情绪底色</span
        >
        <p class="text-sm text-ink-medium font-sans leading-relaxed flex-1">
          {{ result.moonSign.interpretation }}
        </p>
        <p
          class="text-xs text-ink-medium font-sans mt-1.5 leading-relaxed border-t luminary-info-divider pt-1.5"
        >
          ⓘ 基于月球平黄经（±5°精度），边界日期可能偏移
        </p>
      </div>
      <!-- ☽ 月亮（缺数据） -->
      <div
        v-else
        class="card-warm rounded-xl p-5 min-h-[140px] flex flex-col items-center justify-center text-center opacity-55 border-t-2 luminary-moon-missing fade-in"
        :style="{ '--delay': '0.25s' }"
      >
        <span class="text-xl mb-1" aria-hidden="true">☽</span>
        <span class="font-display text-sm text-ink-light">月亮 · 缺出生年份</span>
        <NuxtLink
          :to="`/profile/${currentProfile?.id}`"
          class="text-sm text-cinnabar font-sans underline underline-offset-2 mt-2"
        >
          编辑档案 → 填写出生年份及日期
        </NuxtLink>
      </div>

      <!-- ↑ 上升 — 社交面具（有数据） -->
      <div
        v-if="result.risingSign"
        class="card-warm rounded-xl p-5 min-h-[140px] flex flex-col border-t-2 luminary-rising fade-in"
        :style="{ '--delay': '0.3s' }"
      >
        <div class="flex items-center gap-2 mb-1.5">
          <span class="text-xl flex-shrink-0" aria-hidden="true">↑</span>
          <span class="font-display text-base text-ink tracking-wide"
            >上升 · {{ result.risingSign.name }}</span
          >
          <span
            class="luminary-badge--rising inline-flex items-center px-1.5 py-0.5 rounded text-xs font-sans tracking-wider ml-auto"
            >本命盘</span
          >
        </div>
        <span class="text-sm text-ink-medium font-sans tracking-wider mb-2"
          >社交面具 · 你给别人的第一印象</span
        >
        <p class="text-sm text-ink-medium font-sans leading-relaxed flex-1">
          {{ result.risingSign.interpretation }}
        </p>
        <p
          class="text-xs text-ink-medium font-sans mt-1.5 leading-relaxed border-t luminary-info-divider pt-1.5"
        >
          ⓘ 假定中国时区（UTC+8/北纬35°），结果近似
        </p>
      </div>
      <!-- ↑ 上升（缺数据） -->
      <div
        v-else
        class="card-warm rounded-xl p-5 min-h-[140px] flex flex-col items-center justify-center text-center opacity-55 border-t-2 luminary-rising-missing fade-in"
        :style="{ '--delay': '0.3s' }"
      >
        <span class="text-xl mb-1" aria-hidden="true">↑</span>
        <span class="font-display text-sm text-ink-light">上升 · 缺出生时辰</span>
        <NuxtLink
          :to="`/profile/${currentProfile?.id}`"
          class="text-sm text-cinnabar font-sans underline underline-offset-2 mt-2"
        >
          编辑档案 → 填写出生时辰（子丑寅卯…）
        </NuxtLink>
      </div>
    </div>

    <!-- 探索模式脚注 -->
    <div v-if="selectedZodiac !== userZodiacIndex" class="text-center mt-3">
      <p class="text-xs text-ink-medium font-sans tracking-wider">
        ── 月亮与上升基于您的出生数据，不随探索星座改变 ──
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConstellationResult } from '~/composables/useConstellation'

defineProps<{
  result: ConstellationResult
  selectedZodiac: number
  userZodiacIndex: number
}>()

const { currentProfile } = useAuth()
</script>

<style scoped>
.luminary-badge--moon {
  border: 1px solid color-mix(in srgb, var(--color-cinnabar) 20%, transparent);
  color: color-mix(in srgb, var(--color-cinnabar) 70%, transparent);
  background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
}
.luminary-badge--rising {
  border: 1px solid color-mix(in srgb, var(--color-gold) 20%, transparent);
  color: color-mix(in srgb, var(--color-gold) 70%, transparent);
  background: color-mix(in srgb, var(--color-gold) 5%, transparent);
}

/* ── Card top borders ── */
.luminary-sun {
  border-top-color: color-mix(in srgb, var(--color-jade) 15%, transparent);
}
.luminary-moon {
  border-top-color: color-mix(in srgb, var(--color-cinnabar) 15%, transparent);
}
.luminary-moon-missing {
  border-top-color: color-mix(in srgb, var(--color-cinnabar) 10%, transparent);
}
.luminary-rising {
  border-top-color: color-mix(in srgb, var(--color-gold) 20%, transparent);
}
.luminary-rising-missing {
  border-top-color: color-mix(in srgb, var(--color-gold) 15%, transparent);
}

/* ── Info note divider ── */
.luminary-info-divider {
  border-color: color-mix(in srgb, var(--color-ink-faint) 20%, transparent);
}
</style>
