<template>
  <div class="fade-in card-paper-solid rounded-xl p-6 sm:p-8 mb-6" :style="{ '--delay': '0.05s' }">
    <div class="flex items-start gap-4 sm:gap-6">
      <span class="flex-shrink-0 text-5xl sm:text-6xl" aria-hidden="true">{{ result.animalEmoji }}</span>
      <div class="min-w-0">
        <h1 class="font-display text-3xl sm:text-4xl text-ink-dark">
          {{ result.animal }}
        </h1>
        <p class="font-sans text-sm sm:text-base text-ink-medium mt-1">
          {{ result.stemBranch }}年 · {{ result.year }} · {{ result.yangOrYin }}性
        </p>
        <div class="flex flex-wrap gap-2 mt-3">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans border"
            :class="badgeClass(result.wuXing)"
          >
            {{ result.naYin }}命
          </span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans bg-ink-faint/20 text-ink-medium border border-ink-faint/30">
            {{ result.earthlyBranch }} · {{ result.direction }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShengXiaoResult } from '~/composables/useShengXiao'

defineProps<{
  result: ShengXiaoResult
}>()

function badgeClass(wuXing: string): string {
  const map: Record<string, string> = {
    '木': 'border-wuxing-wood/30 text-wuxing-wood bg-wuxing-wood/5',
    '火': 'border-wuxing-fire/30 text-wuxing-fire bg-wuxing-fire/5',
    '土': 'border-wuxing-earth/30 text-wuxing-earth bg-wuxing-earth/5',
    '金': 'border-wuxing-metal/30 text-wuxing-metal bg-wuxing-metal/5',
    '水': 'border-wuxing-water/30 text-wuxing-water bg-wuxing-water/5',
  }
  return map[wuXing] || 'border-ink-faint/30 text-ink-medium bg-ink-faint/10'
}
</script>
