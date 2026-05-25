<template>
  <div class="fade-in mb-6" :style="{ '--delay': '0.15s' }">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div
        v-for="item in items"
        :key="item.label"
        class="wuxing-card"
        :class="`wuxing-card--${item.color}`"
      >
        <div class="font-display text-lg sm:text-xl text-ink-dark mb-0.5">{{ item.value }}</div>
        <div class="font-sans text-xs text-ink-light tracking-wider">{{ item.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShengXiaoResult } from '~/composables/useShengXiao'

const props = defineProps<{
  result: ShengXiaoResult
}>()

function wuxingColor(): string {
  const map: Record<string, string> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' }
  return map[props.result.wuXing] || 'earth'
}

const items = [
  { label: '五行', value: props.result.wuXing, color: wuxingColor() },
  { label: '纳音', value: props.result.naYin, color: 'earth' },
  { label: '地支', value: props.result.earthlyBranch, color: wuxingColor() },
  { label: '方向', value: props.result.direction, color: 'earth' },
]
</script>
