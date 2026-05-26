<template>
  <div class="fade-in card-paper-solid rounded-xl p-8 mb-6" :style="{ '--delay': '0.15s' }">
    <FortuneBars :items="fortuneItems" />

    <InkDivider class="mt-6">综合运势</InkDivider>

    <div class="flex flex-col items-center py-4">
      <div class="flex items-start">
        <span
          class="text-5xl sm:text-6xl font-display leading-none"
          :class="scoreColorClass(horoscope.overall)"
        >
          {{ horoscope.overall }}
        </span>
        <span class="font-sans text-base text-ink-light mt-1 ml-1">/ 100</span>
      </div>
      <p class="font-sans text-sm text-ink-medium mt-2">{{ scoreLabel(horoscope.overall) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ConstellationResult } from '~/composables/useConstellation'
import FortuneBars from '~/components/tools/FortuneBars.vue'
import InkDivider from '~/components/tools/InkDivider.vue'

const props = defineProps<{
  horoscope: ConstellationResult['todayHoroscope']
}>()

const fortuneItems = computed(() => [
  { label: '综合', score: props.horoscope.overall },
  { label: '爱情', score: props.horoscope.love },
  { label: '事业', score: props.horoscope.career },
  { label: '财运', score: props.horoscope.wealth },
  { label: '健康', score: props.horoscope.health },
])

function scoreColorClass(score: number): string {
  if (score >= 75) return 'text-wuxing-wood'
  if (score >= 60) return 'text-gold'
  if (score >= 45) return 'text-ink-medium'
  return 'text-cinnabar'
}

function scoreLabel(score: number): string {
  if (score >= 80) return '运势极佳，万事顺遂'
  if (score >= 60) return '运势不错，把握良机'
  if (score >= 40) return '运势平稳，稳中求进'
  if (score >= 20) return '运势欠佳，多加谨慎'
  return '运势低迷，静待时机'
}
</script>
