<template>
  <div class="flex lg:flex-col gap-1">
    <p class="px-3 pt-1 pb-2 text-xs text-ink-light tracking-[0.12em] font-sans">十二星座</p>
    <button
      v-for="(zodiac, idx) in ZODIACS"
      :key="idx"
      :class="[
        'flex items-center gap-3 px-5 py-3.5 rounded-r-lg text-base transition-colors w-full text-left border-l-2',
        idx === currentIndex
          ? 'border-l-cinnabar bg-cinnabar/6 text-cinnabar font-medium'
          : 'border-l-transparent text-ink-medium hover:text-ink-dark hover:bg-paper-medium/50',
      ]"
      :aria-current="idx === currentIndex ? 'true' : undefined"
      @click="$emit('select', idx)"
      @keydown.enter="$emit('select', idx)"
      @keydown.space.prevent="$emit('select', idx)"
    >
      <span
        class="symbol-seal flex-shrink-0"
        :class="idx === currentIndex ? 'symbol-seal--active' : ''"
        aria-hidden="true"
        >{{ zodiac.symbol }}</span
      >
      <span class="font-sans">{{ zodiac.name }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ZODIACS } from '~/composables/useConstellation'

defineProps<{
  currentIndex: number
}>()

defineEmits<{
  select: [index: number]
}>()
</script>

<style scoped>
.symbol-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.9375rem;
  color: var(--color-ink-medium);
  transition: color 0.2s ease;
}

.symbol-seal--active {
  color: var(--color-cinnabar);
}

button:hover .symbol-seal:not(.symbol-seal--active) {
  color: var(--color-ink);
}
</style>
