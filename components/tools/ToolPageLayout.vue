<template>
  <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
    <div class="lg:flex lg:gap-8">
      <aside class="hidden lg:block lg:w-44 xl:w-52 flex-shrink-0">
        <nav class="sticky top-20 space-y-1" aria-label="工具导航">
          <slot name="nav" />
        </nav>
      </aside>
      <div class="flex-1 min-w-0">
        <div class="lg:hidden mb-6 overflow-x-auto -mx-4 px-4">
          <nav class="flex gap-1 pb-2" aria-label="工具导航（移动端）">
            <slot name="mobile-nav" />
          </nav>
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ToolPageLayout — two-column layout for tool pages
</script>
