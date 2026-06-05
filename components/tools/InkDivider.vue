<template>
  <component :is="headingTag" class="divider-ink my-8 sm:my-10">
    <span
      v-if="$slots.default"
      class="ink-divider-label flex items-center gap-3"
      :class="color === 'cinnabar' ? 'text-cinnabar' : 'text-ink-dark'"
    >
      <span class="inline-block w-1.5 h-5 bg-cinnabar rounded-sm" aria-hidden="true"></span>
      <slot />
    </span>
  </component>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    level?: 2 | 3
    color?: 'ink' | 'cinnabar'
  }>(),
  {
    level: 2,
    color: 'ink',
  },
)

const headingTag = computed(() => `h${props.level}`)
</script>

<style scoped>
.ink-divider-label {
  font-family: var(--font-display);
  font-size: 1.25rem;
  line-height: 1.75rem;
}

@media (min-width: 640px) {
  .ink-divider-label {
    font-family: var(--font-display);
    font-size: 1.5rem;
    line-height: 2rem;
  }
}
</style>
