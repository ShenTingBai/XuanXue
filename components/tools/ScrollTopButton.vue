<template>
  <button
    class="fixed bottom-8 z-50 flex items-center justify-center rounded-lg border border-cinnabar/40 bg-paper-lightest/80 text-cinnabar backdrop-blur-sm shadow-lg hover:bg-cinnabar hover:text-paper-lightest transition-colors duration-300"
    :class="sizeClass"
    aria-label="回到顶部"
    v-bind="$attrs"
  >
    <svg aria-hidden="true" class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M10 16V4M4 10l6-6 6 6" />
    </svg>
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  size?: 'sm' | 'lg'
}>(), {
  size: 'lg',
})

const sizeClass = computed(() => {
  return 'w-14 h-14'
})
</script>
