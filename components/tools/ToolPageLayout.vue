<template>
  <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    <div class="lg:flex lg:gap-8">
      <!-- Side nav: hidden on <lg, shown on lg+ (only when slot is provided) -->
      <aside v-if="$slots.nav" class="hidden lg:block lg:w-44 xl:w-52 flex-shrink-0">
        <nav class="sticky top-20 space-y-1" aria-label="工具导航">
          <slot name="nav" />
        </nav>
      </aside>

      <!-- Main content area -->
      <div class="flex-1 min-w-0">
        <!-- Mobile nav: shown on <lg, hidden on lg+ (only when slot is provided) -->
        <div
          v-if="$slots['mobile-nav']"
          class="lg:hidden mb-6 overflow-x-auto -mx-4 px-4 scroll-hint-x scrollbar-hide"
        >
          <nav class="flex gap-1 pb-2" aria-label="工具导航（移动端）">
            <slot name="mobile-nav" />
          </nav>
        </div>

        <slot />
      </div>

      <!-- Right sidebar: hidden on <lg, shown on lg+ (only when slot is provided) -->
      <aside v-if="$slots['nav-right']" class="hidden lg:block w-52 flex-shrink-0">
        <slot name="nav-right" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
// ToolPageLayout — three-column layout for tool pages
// Slot 'nav': desktop sidebar navigation (left)
// Slot 'mobile-nav': horizontal scroll navigation for mobile
// Default slot: main content area
// Slot 'nav-right': right sidebar (info panels)
</script>
