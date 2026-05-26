<template>
  <div class="flex justify-center mb-2" role="tablist" aria-label="命盘视图切换">
    <button
      role="tab"
      :aria-selected="currentView === 'celestial'"
      class="tab-switch px-8 py-2 font-display text-[1.1rem] tracking-[0.1em] cursor-pointer transition-all duration-300 relative border border-paper-dark/30 border-b-0 rounded-t-lg first-of-type:border-r-0"
      :class="currentView === 'celestial' ? 'active' : 'inactive'"
      @click="emit('update:current-view', 'celestial')"
      @keydown.enter="emit('update:current-view', 'celestial')"
      @keydown.space.prevent="emit('update:current-view', 'celestial')"
    >
      天星图
    </button>
    <button
      role="tab"
      :aria-selected="currentView === 'grid'"
      class="tab-switch px-8 py-2 font-display text-[1.1rem] tracking-[0.1em] cursor-pointer transition-all duration-300 relative border border-paper-dark/30 border-b-0 rounded-t-lg"
      :class="currentView === 'grid' ? 'active' : 'inactive'"
      @click="emit('update:current-view', 'grid')"
      @keydown.enter="emit('update:current-view', 'grid')"
      @keydown.space.prevent="emit('update:current-view', 'grid')"
    >
      回宫图
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentView: 'celestial' | 'grid'
}>()

const emit = defineEmits<{
  'update:current-view': [value: 'celestial' | 'grid']
}>()
</script>

<style scoped>
.tab-switch {
  background: #EDE4D3;
  color: #7A6A5C;
}
.tab-switch.inactive:hover {
  color: #6B5B4F;
  background: #E0D5C0;
}
.tab-switch.active {
  background: #F5F0E8;
  color: #1E1210;
  z-index: 1;
}
.tab-switch.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: #C62828;
}
</style>
