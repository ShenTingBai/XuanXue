<template>
  <div class="fade-in mb-6" :style="{ '--delay': '0.1s' }">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div
        v-for="item in items"
        :key="item.label"
        class="wuxing-card"
        :class="[`wuxing-card--${item.color}`]"
      >
        <div class="font-display text-lg sm:text-xl text-ink-dark mb-0.5">{{ item.value }}</div>
        <div class="font-sans text-xs text-ink-medium tracking-wider">{{ item.label }}</div>
      </div>
    </div>
    <!-- Element description footnote -->
    <p class="mt-3 font-sans text-xs text-ink-medium leading-relaxed">
      西方四元素与五行不同：<span class="text-cinnabar font-medium">{{ result.element }}象星座</span>{{ elementDescription }}。
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ConstellationResult } from '~/composables/useConstellation'

const props = defineProps<{
  result: ConstellationResult
}>()

const ELEMENT_DESCRIPTIONS: Record<string, string> = {
  '火': '热情主动、行动力强，如同火焰般充满能量与感染力',
  '土': '稳重务实、脚踏实地，如大地般可靠且善于积累',
  '风': '思维敏捷、善于沟通，如风般自由流动且富创造力',
  '水': '情感深邃、直觉敏锐，如水般善感且富有共情力',
}

const elementDescription = computed(() => ELEMENT_DESCRIPTIONS[props.result.element] || '')

/**
 * Western four-element color palette.
 * Distinct from the Chinese five-element (wuxing-*) system.
 * Uses Ink Resonance tokens with clear semantic intent:
 *   Fire → cinnabar warmth,  Earth → gold tone,
 *   Air → jade lightness,    Water → blue depth.
 */
function elementColorClass(): string {
  const map: Record<string, string> = {
    '火': 'fire',
    '土': 'earth',
    '风': 'air',
    '水': 'water',
  }
  return map[props.result.element] || 'earth'
}

const items = computed(() => [
  { label: '元素', value: `${props.result.element}象`, color: elementColorClass() },
  { label: '守护星', value: props.result.rulingPlanet, color: 'metal' },
  { label: '幸运颜色', value: props.result.luckyColor, color: 'earth' },
  { label: '幸运数字', value: String(props.result.luckyNumber), color: 'earth' },
])
</script>
