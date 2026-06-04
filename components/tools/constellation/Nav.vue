<template>
  <div class="flex lg:flex-col gap-1">
    <button
      v-for="(zodiac, idx) in ZODIACS"
      :key="idx"
      @click="$emit('select', idx)"
      @keydown.enter="$emit('select', idx)"
      @keydown.space.prevent="$emit('select', idx)"
      :class="[
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
        idx === currentIndex
          ? 'bg-cinnabar/10 text-cinnabar font-medium'
          : 'text-ink-medium hover:text-ink-dark hover:bg-paper-medium/50',
      ]"
      :aria-current="idx === currentIndex ? 'true' : undefined"
    >
      <span class="text-base flex-shrink-0" aria-hidden="true">{{ zodiac.symbol }}</span>
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
