<template>
  <div class="divider-ink my-8 sm:my-10" role="separator" aria-orientation="horizontal">
    <span v-if="$slots.default" class="font-sans text-xs tracking-[0.2em] uppercase">
      <slot />
    </span>
  </div>
</template>

<script setup lang="ts">
// InkDivider — decorative ink-wash style separator
</script>
