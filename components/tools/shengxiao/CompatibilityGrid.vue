<template>
  <div class="fade-in mt-8 mb-6" :style="{ '--delay': '0.5s' }">
    <div class="section-header">
      <h2>生肖配对</h2>
    </div>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
      <div
        v-for="item in items"
        :key="item.animal"
        class="card-warm rounded-xl p-3 sm:p-4 text-center transition-all duration-300 cursor-default hover:-translate-y-0.5"
        :class="borderClass(item.level)"
        :title="item.relation"
      >
        <div class="text-2xl sm:text-3xl mb-1" aria-hidden="true">{{ item.emoji }}</div>
        <div class="font-display text-base text-ink-dark">{{ item.animal }}</div>
        <span
          class="inline-block mt-1 px-2 py-0.5 rounded text-[0.625rem] font-sans tracking-wider"
          :class="levelClass(item.level)"
        >
          {{ item.relation }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Compatibility } from '~/composables/useShengXiao'

defineProps<{
  items: Compatibility[]
}>()

function borderClass(level: string): string {
  return level === 'great'
    ? 'hover:border-jade'
    : level === 'good'
      ? 'hover:border-gold'
      : 'hover:border-cinnabar/30'
}

function levelClass(level: string): string {
  return level === 'great'
    ? 'bg-wuxing-wood/10 text-wuxing-wood'
    : level === 'good'
      ? 'bg-gold/10 text-gold'
      : 'bg-cinnabar/5 text-cinnabar/80'
}
</script>
