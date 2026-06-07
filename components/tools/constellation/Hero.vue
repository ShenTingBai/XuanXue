<template>
  <div class="fade-in card-warm rounded-xl p-8 mb-6" :style="{ '--delay': '0.05s' }">
    <div class="flex items-start gap-4 sm:gap-6">
      <span class="flex-shrink-0 text-5xl sm:text-6xl" aria-hidden="true">{{ result.symbol }}</span>
      <div class="min-w-0">
        <h1 class="font-display text-2xl sm:text-3xl text-ink-dark leading-tight break-words">
          {{ result.name }}
        </h1>
        <p class="font-sans text-sm sm:text-base text-ink-medium mt-1">
          {{ result.dateRange }}
        </p>
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans border mt-3"
          :class="elementBadgeClass(result.element)"
        >
          {{ elementLabel(result.element) }}
        </span>
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
  火: '火象星座',
  土: '土象星座',
  风: '风象星座',
  水: '水象星座',
}

function elementLabel(element: string): string {
  return elementLabels[element] || element + '象'
}

function elementBadgeClass(element: string): string {
  const map: Record<string, string> = {
    火: 'element-badge--fire',
    土: 'element-badge--earth',
    风: 'element-badge--wind',
    水: 'element-badge--water',
  }
  return map[element] || 'element-badge--default'
}
</script>

<style scoped>
.element-badge--fire {
  border-color: color-mix(in srgb, var(--color-cinnabar) 30%, transparent);
  color: var(--color-cinnabar);
  background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
}
.element-badge--earth {
  border-color: color-mix(in srgb, var(--color-gold) 30%, transparent);
  color: var(--color-gold);
  background: color-mix(in srgb, var(--color-gold) 5%, transparent);
}
.element-badge--wind {
  border-color: color-mix(in srgb, var(--color-jade) 30%, transparent);
  color: var(--color-jade);
  background: color-mix(in srgb, var(--color-jade) 5%, transparent);
}
.element-badge--water {
  border-color: color-mix(in srgb, var(--color-wuxing-water) 30%, transparent);
  color: var(--color-wuxing-water);
  background: color-mix(in srgb, var(--color-wuxing-water) 5%, transparent);
}
.element-badge--default {
  border-color: color-mix(in srgb, var(--color-ink-faint) 30%, transparent);
  color: var(--color-ink-medium);
  background: color-mix(in srgb, var(--color-ink-faint) 10%, transparent);
}
</style>
