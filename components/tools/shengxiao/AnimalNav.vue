<template>
  <div class="flex lg:flex-col gap-1">
    <p class="px-3 pt-1 pb-2 text-xs text-ink-light tracking-[0.12em] font-sans">十二生肖</p>
    <button
      v-for="(animal, idx) in animals"
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
        class="branch-seal flex-shrink-0"
        :class="idx === currentIndex ? 'branch-seal--active' : ''"
        aria-hidden="true"
        >{{ animal.branch }}</span
      >
      <span class="font-sans">{{ animal.name }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ANIMALS, BRANCHES } from '~/constants/bazi'

defineProps<{
  currentIndex: number
}>()

defineEmits<{
  select: [index: number]
}>()

const animals = ANIMALS.map((name, i) => ({
  name,
  branch: BRANCHES[i],
}))
</script>

<style scoped>
.branch-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 2px;
  border: 1px solid rgba(44, 26, 14, 0.12);
  background: rgba(44, 26, 14, 0.02);
  color: var(--color-ink-medium);
  font-family: var(--font-display);
  font-size: 0.8125rem;
  transition: all 0.2s ease;
}

.branch-seal--active {
  border-color: rgba(198, 40, 40, 0.25);
  background: rgba(198, 40, 40, 0.08);
  color: var(--color-cinnabar);
}

button:hover .branch-seal:not(.branch-seal--active) {
  border-color: rgba(44, 26, 14, 0.2);
  background: rgba(44, 26, 14, 0.04);
}
</style>
