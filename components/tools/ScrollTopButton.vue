<template>
  <button
    class="scroll-top-btn fixed bottom-8 right-6 z-50 flex items-center justify-center rounded-lg text-cinnabar backdrop-blur-sm shadow-lg hover:bg-cinnabar hover:text-paper-lightest transition-colors duration-300"
    :class="sizeClass"
    aria-label="回到顶部"
    v-bind="$attrs"
  >
    <svg
      aria-hidden="true"
      class="w-5 h-5"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    >
      <path d="M10 16V4M4 10l6-6 6 6" />
    </svg>
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'lg'
  }>(),
  {
    size: 'lg',
  },
)

const sizeClass = computed(() => {
  return props.size === 'sm' ? 'w-10 h-10' : 'w-14 h-14'
})
</script>

<style scoped>
.scroll-top-btn {
  border: 1px solid color-mix(in srgb, var(--color-cinnabar) 40%, transparent);
  background: color-mix(in srgb, var(--color-paper-lightest) 80%, transparent);
}
</style>
