<template>
  <div class="divider-ink my-8 sm:my-10" role="separator" aria-orientation="horizontal">
    <span v-if="$slots.default" class="ink-divider-label flex items-center gap-3">
      <span class="inline-block w-1.5 h-5 bg-cinnabar rounded-sm" aria-hidden="true"></span>
      <slot />
    </span>
  </div>
</template>

<script setup lang="ts">
// InkDivider — decorative ink-wash style separator
// Can optionally display a label via the default slot
</script>

<style scoped>
.ink-divider-label {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 1.25rem;
  line-height: 1.75rem;
  color: #2C1810;
}

@media (min-width: 640px) {
  .ink-divider-label {
    font-size: 1.5rem;
    line-height: 2rem;
  }
}
</style>
