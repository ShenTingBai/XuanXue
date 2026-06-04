<template>
  <div class="fade-in card-warm rounded-xl p-8 mb-6" :style="{ '--delay': '0.15s' }">
    <div class="section-header">
      <h2>今日运势</h2>
    </div>

    <FortuneBars :items="fortuneItems" />

    <!-- Scoring basis note -->
    <p class="mt-4 pt-3 border-t border-ink-faint/15 font-sans text-[0.72rem] text-ink-medium leading-relaxed">
      评分依据：日相（太阳过宫方位）提供季节基调，月相（月球黄经位置）驱动每日波动，元素共振调节情感与行动倾向。基准 50 分，相位 ±20 分，元素 ±6 分，压缩至 0-100 区间。
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ConstellationResult } from '~/composables/useConstellation'
import FortuneBars from '~/components/tools/FortuneBars.vue'

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
</script>
