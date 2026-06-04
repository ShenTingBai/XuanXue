<template>
  <div class="fade-in card-warm rounded-xl p-8 mb-6" :style="{ '--delay': '0.15s' }">
    <div class="section-header">
      <h2>今日运势</h2>
    </div>

    <FortuneBars :items="fortuneItems" />

    <!-- Interpretation text -->
    <p class="mt-4 font-sans text-sm text-ink leading-relaxed">
      {{ interpretation }}
    </p>

    <!-- Scoring basis note -->
    <p class="mt-3 pt-3 border-t border-ink-faint/15 font-sans text-xs text-ink-medium leading-relaxed">
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

const interpretation = computed(() => {
  const o = props.horoscope.overall
  const l = props.horoscope.love
  const c = props.horoscope.career
  const w = props.horoscope.wealth
  const h = props.horoscope.health
  const avg = Math.round((o + l + c + w + h) / 5)

  const parts: string[] = []

  // Overall tone
  if (avg >= 75) {
    parts.push('今日星象顺遂，各方面能量充沛，是行动与决策的良机。')
  } else if (avg >= 55) {
    parts.push('今日运势平稳，宜稳中求进，不宜冒进。保持日常节奏即可。')
  } else if (avg >= 35) {
    parts.push('今日星象略显紧张，部分领域可能遇到阻力。宜放缓脚步，多些耐心。')
  } else {
    parts.push('今日星象挑战较多，情绪与事务易有波折。宜静不宜动，多向内观照。')
  }

  // Highlight extremes
  const maxScore = Math.max(o, l, c, w, h)
  const minScore = Math.min(o, l, c, w, h)
  const labels: Record<string, string> = { overall: '综合', love: '爱情', career: '事业', wealth: '财运', health: '健康' }

  const maxLabel = Object.entries({ overall: o, love: l, career: c, wealth: w, health: h })
    .find(([, v]) => v === maxScore)?.[0]
  const minLabel = Object.entries({ overall: o, love: l, career: c, wealth: w, health: h })
    .find(([, v]) => v === minScore)?.[0]

  if (maxScore >= 70 && maxLabel) {
    parts.push(`${labels[maxLabel]}运势最佳，可重点投入此领域。`)
  }
  if (minScore <= 40 && minLabel) {
    parts.push(`${labels[minLabel]}方面稍弱，适当降低期待，顺势而为即可。`)
  }

  return parts.join('')
})
</script>
