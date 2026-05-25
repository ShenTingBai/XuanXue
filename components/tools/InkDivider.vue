<template>
  <div class="divider-ink my-8 sm:my-10" role="separator" aria-orientation="horizontal">
    <span v-if="$slots.default" class="font-display text-xl sm:text-2xl text-ink-dark flex items-center gap-3">
      <span class="inline-block w-1.5 h-5 bg-cinnabar rounded-sm" aria-hidden="true"></span>
      <slot />
    </span>
  </div>
</template>

<script setup lang="ts">
// InkDivider — decorative ink-wash style separator
// Can optionally display a label via the default slot
</script>
