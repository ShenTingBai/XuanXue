<template>
  <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" :class="{ 'xl:relative': hasRightSidebar && !hasLeftSidebar }">
    <div class="lg:flex lg:gap-8">
      <!-- Side nav: hidden on <lg, shown on lg+ (only when slot is provided) -->
      <aside v-if="hasLeftSidebar" class="hidden lg:block lg:w-44 xl:w-52 flex-shrink-0">
        <nav class="sticky top-20 space-y-1" aria-label="工具导航">
          <slot name="nav" />
        </nav>
      </aside>

      <!-- Main content area -->
      <div class="flex-1 min-w-0">
        <!-- Mobile nav: shown on <lg, hidden on lg+ (only when slot is provided) -->
        <div v-if="$slots['mobile-nav']" class="lg:hidden mb-6 overflow-x-auto -mx-4 px-4">
          <nav class="flex gap-1 pb-2" aria-label="工具导航（移动端）">
            <slot name="mobile-nav" />
          </nav>
        </div>

        <slot />
      </div>

      <!-- Right sidebar in-flow: only when left nav also exists (balances the layout) -->
      <aside v-if="hasRightSidebar && hasLeftSidebar" class="hidden xl:block w-56 flex-shrink-0">
        <slot name="nav-right" />
      </aside>
    </div>

    <!-- Right sidebar absolute: when NO left nav, floated outside content flow so content stays centered -->
    <aside v-if="hasRightSidebar && !hasLeftSidebar" class="hidden xl:block absolute top-8 right-8 w-56">
      <slot name="nav-right" />
    </aside>
  </div>
</template>

<script setup lang="ts">
// ToolPageLayout — three-column layout for tool pages
// Slot 'nav': desktop sidebar navigation (left)
// Slot 'mobile-nav': horizontal scroll navigation for mobile
// Default slot: main content area
// Slot 'nav-right': right sidebar (info panels)
//
// When only #nav-right is provided (no #nav), the sidebar renders as an absolute-positioned
// overlay so the main content stays centered in the viewport (used by the BaZi page).
// When both #nav and #nav-right are provided, both are in the normal flex flow.

const slots = useSlots()
const hasLeftSidebar = computed(() => !!slots.nav)
const hasRightSidebar = computed(() => !!slots['nav-right'])
</script>
