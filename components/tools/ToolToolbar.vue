<script setup lang="ts">
defineProps<{
  showHistory?: boolean
}>()

const router = useRouter()

function goBack() {
  if (import.meta.client && window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const emit = defineEmits<{
  history: []
}>()
</script>

<template>
  <div class="flex items-center justify-between mb-6">
    <button class="toolbar-btn" aria-label="返回上一页" @click="goBack">
      <svg
        aria-hidden="true"
        class="w-3.5 h-3.5"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      >
        <path d="M7.5 2.5l-4 3.5 4 3.5" />
      </svg>
      <span>返回</span>
    </button>

    <span class="hidden sm:block h-4 w-px bg-ink-faint/20" aria-hidden="true" />

    <slot name="extra" />

    <button
      v-if="showHistory"
      class="toolbar-btn toolbar-btn--right"
      aria-haspopup="dialog"
      @click="emit('history')"
    >
      <span>历史记录</span>
      <svg
        aria-hidden="true"
        class="w-3.5 h-3.5"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      >
        <path d="M4.5 2.5l4 3.5-4 3.5" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-family: var(--font-sans);
  color: var(--color-ink-medium);
  transition: all 0.2s ease;
}
.toolbar-btn:hover {
  color: var(--color-cinnabar);
  background: rgba(198, 40, 40, 0.04);
}
.toolbar-btn:active {
  transform: scale(0.97);
}
.toolbar-btn--right {
  margin-left: auto;
}
</style>
