<template>
  <div class="fade-in mb-8 sm:mb-10" :style="{ '--delay': '0.05s' }">
    <div class="flex items-start gap-4 sm:gap-5">
      <!-- Emoji / Symbol icon -->
      <span
        class="flex-shrink-0 inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-cinnabar/5 border border-cinnabar/20 text-2xl sm:text-3xl"
        aria-hidden="true"
      >
        {{ emoji }}
      </span>

      <div class="min-w-0">
        <!-- Main title (Ma Shan Zheng display font) -->
        <h1 class="font-display text-3xl sm:text-4xl text-ink-dark leading-tight mb-1">
          {{ title }}
        </h1>
        <!-- Subtitle / year -->
        <p class="font-sans text-sm sm:text-base text-ink-medium">
          {{ subtitle }}
        </p>
        <!-- Badges slot -->
        <div v-if="$slots.badges" class="flex flex-wrap gap-2 mt-2">
          <slot name="badges" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  emoji: string
  title: string
  subtitle: string
}>()
</script>
