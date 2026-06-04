<template>
  <div class="fade-in mb-6" :style="{ '--delay': '0.1s' }">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div
        v-for="item in items"
        :key="item.label"
        class="wuxing-card"
        :class="[`wuxing-card--${item.color}`, item.label === '元素' ? 'cursor-pointer' : '']"
        @click="item.label === '元素' ? toggleElementExpanded() : undefined"
        @keydown.enter="item.label === '元素' ? toggleElementExpanded() : undefined"
        @keydown.space.prevent="item.label === '元素' ? toggleElementExpanded() : undefined"
        :tabindex="item.label === '元素' ? 0 : undefined"
        :role="item.label === '元素' ? 'button' : undefined"
        :aria-expanded="item.label === '元素' ? elementExpanded : undefined"
      >
        <div class="flex items-center gap-1.5">
          <div class="font-display text-lg sm:text-xl text-ink-dark mb-0.5">{{ item.value }}</div>
          <span v-if="item.label === '元素'" class="text-[0.65rem] text-ink-light mb-0.5" aria-hidden="true">{{ elementExpanded ? '▾' : '▸' }}</span>
        </div>
        <div class="font-sans text-xs text-ink-light tracking-wider">{{ item.label }}</div>

        <!-- Element explanation (expandable) -->
        <Transition name="attr-expand">
          <div v-if="item.label === '元素' && elementExpanded" class="attr-explanation mt-2 pt-2 border-t border-ink-faint/10">
            <p class="attr-explanation__text">
              西方四元素与五行不同：<span class="attr-explanation__highlight">{{ result.element }}象星座</span>{{ elementDescription }}。
            </p>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Lucky info subsection -->
    <div class="mt-5 pt-4 border-t border-ink-faint/15">
      <h3 class="font-sans text-[0.72rem] text-ink-medium tracking-widest mb-3">幸运信息</h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="text-center">
          <div class="font-display text-base text-ink-dark mb-0.5">{{ result.luckyColor }}</div>
          <div class="font-sans text-[0.72rem] text-ink-medium tracking-wider">幸运颜色</div>
        </div>
        <div class="text-center">
          <div class="font-display text-base text-ink-dark mb-0.5">{{ result.luckyNumber }}</div>
          <div class="font-sans text-[0.72rem] text-ink-medium tracking-wider">幸运数字</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attr-explanation {
  overflow: hidden;
}

.attr-explanation__text {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.72rem;
  color: var(--color-ink-medium);
  line-height: 1.65;
  letter-spacing: 0.03em;
}

.attr-explanation__highlight {
  color: var(--color-cinnabar);
  font-weight: 500;
}

.attr-expand-enter-active,
.attr-expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.attr-expand-enter-from,
.attr-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.attr-expand-enter-to,
.attr-expand-leave-from {
  opacity: 1;
  max-height: 6rem;
}
</style>

<script setup lang="ts">
import type { ConstellationResult } from '~/composables/useConstellation'

const props = defineProps<{
  result: ConstellationResult
}>()

const elementExpanded = ref(false)

function toggleElementExpanded() {
  elementExpanded.value = !elementExpanded.value
}

const ELEMENT_DESCRIPTIONS: Record<string, string> = {
  '火': '热情主动、行动力强，如同火焰般充满能量与感染力',
  '土': '稳重务实、脚踏实地，如大地般可靠且善于积累',
  '风': '思维敏捷、善于沟通，如风般自由流动且富创造力',
  '水': '情感深邃、直觉敏锐，如水般善感且富有共情力',
}

const elementDescription = computed(() => ELEMENT_DESCRIPTIONS[props.result.element] || '')

function elementColorClass(): string {
  const map: Record<string, string> = {
    '火': 'fire', '土': 'earth', '风': 'wood', '水': 'water',
  }
  return map[props.result.element] || 'earth'
}

const items = computed(() => [
  { label: '元素', value: `${props.result.element}象`, color: elementColorClass() },
  { label: '守护星', value: props.result.rulingPlanet, color: 'earth' },
  { label: '日期', value: props.result.dateRange, color: 'earth' },
  { label: '符号', value: props.result.symbol, color: elementColorClass() },
])
</script>
