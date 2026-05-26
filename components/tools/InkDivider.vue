<template>
  <component :is="headingTag" class="divider-ink my-8 sm:my-10">
    <span v-if="$slots.default" class="ink-divider-label flex items-center gap-3 text-ink-dark">
      <span class="inline-block w-1.5 h-5 bg-cinnabar rounded-sm" aria-hidden="true"></span>
      <slot />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  level?: 2 | 3
}>(), {
  level: 2,
})

const headingTag = computed(() => `h${props.level}`)
</script>

<style scoped>
.ink-divider-label {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 1.25rem;
  line-height: 1.75rem;
}

@media (min-width: 640px) {
  .ink-divider-label {
    font-size: 1.5rem;
    line-height: 2rem;
  }
}
</style>
