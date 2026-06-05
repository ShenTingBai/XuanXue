<template>
  <div :id="sectionId" class="card-warm rounded-xl p-8 mb-6 scroll-mt-20" tabindex="-1">
    <!-- Clickable header bar -->
    <button
      type="button"
      class="flex items-center justify-between cursor-pointer select-none text-left w-full bg-transparent border-none"
      :aria-expanded="expanded"
      :aria-controls="`${sectionId}-content`"
      @click="emit('toggle', sectionId)"
      @keydown.enter="emit('toggle', sectionId)"
      @keydown.space.prevent="emit('toggle', sectionId)"
    >
      <div class="flex items-center gap-3 min-w-0">
        <span
          class="inline-block w-1.5 h-5 bg-cinnabar rounded-sm flex-shrink-0"
          aria-hidden="true"
        ></span>
        <h2 class="font-display text-xl text-ink-dark truncate">{{ title }}</h2>
        <span class="text-xs text-ink-light flex-shrink-0">({{ subtitle }})</span>
      </div>
      <svg
        class="w-5 h-5 text-ink-medium transition-transform duration-300 flex-shrink-0 ml-3"
        :class="{ 'rotate-180': expanded }"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <hr class="border-paper-dark/50 my-4" aria-hidden="true" />

    <!-- Collapsible content with smooth grid-rows animation -->
    <div
      :id="`${sectionId}-content`"
      class="collapsible-grid"
      :class="{ 'collapsible-grid--open': expanded }"
      role="region"
      :aria-labelledby="sectionId"
    >
      <div class="collapsible-grid__inner">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  sectionId: string
  title: string
  subtitle: string
  expanded: boolean
}>()

const emit = defineEmits<{
  toggle: [sectionId: string]
}>()
</script>

<style scoped>
/*
 * Animation pattern: grid-template-rows transition is an approved alternative to
 * the expand transition pattern for collapsible content. It uses 0fr → 1fr grid
 * track sizing with overflow:hidden on the inner wrapper, avoiding the need for
 * explicit max-height calculations while preserving smooth open/close animation.
 */
.collapsible-grid {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s ease;
}

.collapsible-grid--open {
  grid-template-rows: 1fr;
}

.collapsible-grid__inner {
  overflow: hidden;
}
</style>
