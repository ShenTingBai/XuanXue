<template>
  <div class="fade-in card-paper-solid rounded-2xl p-6 sm:p-8 mb-6" :style="{ '--delay': '0.05s' }">
    <div class="flex items-start gap-4 sm:gap-6">
      <span class="flex-shrink-0 text-5xl sm:text-6xl" aria-hidden="true">{{ result.symbol }}</span>
      <div class="min-w-0">
        <h1 class="font-display text-3xl sm:text-4xl text-ink-dark">
          {{ result.name }}
        </h1>
        <p class="font-sans text-sm sm:text-base text-ink-medium mt-1">
          {{ result.dateRange }}
        </p>
        <div class="flex flex-wrap gap-2 mt-3">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans border"
            :class="elementBadgeClass(result.element)"
          >
            {{ elementLabel(result.element) }}
          </span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans bg-ink-faint/20 text-ink-medium border border-ink-faint/30">
            守护星 · {{ result.rulingPlanet }}
          </span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans bg-ink-faint/20 text-ink-medium border border-ink-faint/30">
            幸运色 · {{ result.luckyColor }}
          </span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans bg-ink-faint/20 text-ink-medium border border-ink-faint/30">
            幸运数字 · {{ result.luckyNumber }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ConstellationResult } from '~/composables/useConstellation'

defineProps<{
  result: ConstellationResult
}>()

const elementLabels: Record<string, string> = {
  '火': '火象星座',
  '土': '土象星座',
  '风': '风象星座',
  '水': '水象星座',
}

function elementLabel(element: string): string {
  return elementLabels[element] || element + '象'
}

function elementBadgeClass(element: string): string {
  const map: Record<string, string> = {
    '火': 'border-wuxing-fire/30 text-wuxing-fire bg-wuxing-fire/5',
    '土': 'border-wuxing-earth/30 text-wuxing-earth bg-wuxing-earth/5',
    '风': 'border-wuxing-wood/30 text-wuxing-wood bg-wuxing-wood/5',
    '水': 'border-wuxing-water/30 text-wuxing-water bg-wuxing-water/5',
  }
  return map[element] || 'border-ink-faint/30 text-ink-medium bg-ink-faint/10'
}
</script>
