<template>
  <div class="flex justify-center mb-5" role="tablist" aria-label="命盘视图切换">
    <div class="inline-flex rounded-lg border border-ink-faint/25 bg-paper-dark/60 p-0.5">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        role="tab"
        :aria-selected="currentView === tab.value"
        class="tab-btn font-display cursor-pointer transition-all duration-300 relative"
        :class="currentView === tab.value ? 'tab-active' : 'tab-inactive'"
        @click="emit('update:current-view', tab.value)"
        @keydown.enter="emit('update:current-view', tab.value)"
        @keydown.space.prevent="emit('update:current-view', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentView: 'celestial' | 'grid'
}>()

const emit = defineEmits<{
  'update:current-view': [value: 'celestial' | 'grid']
}>()

const tabs = [
  { value: 'celestial' as const, label: '天星图' },
  { value: 'grid' as const, label: '回宫图' },
]
</script>

<style scoped>
.tab-btn {
  padding: 0.35rem 1.6rem;
  font-size: 1rem;
  letter-spacing: 0.12em;
  border-radius: 7px;
  border: none;
  background: transparent;
}

.tab-inactive {
  color: #8B7D6B;
}
.tab-inactive:hover {
  color: #5D4E37;
  background: rgba(93, 78, 55, 0.04);
}

.tab-active {
  color: #1A1A1A;
  background: #F5F0E8;
  box-shadow:
    0 1px 3px rgba(93, 78, 55, 0.1),
    0 0 0 1px rgba(93, 78, 55, 0.06);
}
</style>
