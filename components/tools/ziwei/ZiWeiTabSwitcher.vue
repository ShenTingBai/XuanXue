<template>
  <div class="flex justify-center mb-5" role="tablist" aria-label="命盘视图切换">
    <div class="inline-flex rounded-lg border border-ink-faint/25 bg-paper-dark/60 p-0.5">
      <button
        v-for="(tab, idx) in tabs"
        :id="'tab-' + tab.value"
        :key="tab.value"
        :ref="setTabRef(idx)"
        role="tab"
        :aria-selected="currentView === tab.value"
        :aria-controls="`panel-${tab.value}`"
        :tabindex="currentView === tab.value ? 0 : -1"
        class="tab-btn font-display cursor-pointer transition-all duration-300 relative"
        :class="currentView === tab.value ? 'tab-active' : 'tab-inactive'"
        @click="emit('update:current-view', tab.value)"
        @keydown.enter="emit('update:current-view', tab.value)"
        @keydown.space.prevent="emit('update:current-view', tab.value)"
        @keydown.left.prevent="focusTab((idx - 1 + tabs.length) % tabs.length)"
        @keydown.right.prevent="focusTab((idx + 1) % tabs.length)"
        @keydown.home.prevent="focusTab(0)"
        @keydown.end.prevent="focusTab(tabs.length - 1)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

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

// Template refs for tab button elements
const tabRefs = ref<(HTMLElement | null)[]>([])

function setTabRef(idx: number) {
  return (el: unknown) => {
    tabRefs.value[idx] = el as HTMLElement | null
  }
}

function focusTab(idx: number): void {
  const el = tabRefs.value[idx]
  if (el) el.focus()
}
</script>

<style scoped>
.tab-btn {
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  letter-spacing: 0.12em;
  border-radius: 8px;
  border: none;
  background: transparent;
}

.tab-inactive {
  color: var(--color-ink-medium);
}
.tab-inactive:hover {
  color: var(--color-ink-medium);
  background: color-mix(in srgb, var(--color-ink-medium) 4%, transparent);
}

.tab-active {
  color: var(--color-ink-darkest);
  background: var(--color-paper);
  box-shadow:
    0 1px 3px color-mix(in srgb, var(--color-ink-muted) 10%, transparent),
    0 0 0 1px color-mix(in srgb, var(--color-ink-muted) 6%, transparent);
}
</style>
