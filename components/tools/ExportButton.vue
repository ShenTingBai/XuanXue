<script setup lang="ts">
const props = defineProps<{
  targetRef: HTMLElement | null
  filename: string
  isExporting: boolean
  exportError?: string | null
}>()

const emit = defineEmits<{
  export: []
}>()

const showSuccess = ref(false)
let successTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.isExporting,
  (val, oldVal) => {
    if (oldVal && !val) {
      if (!props.exportError) {
        showSuccess.value = true
        if (successTimer) clearTimeout(successTimer)
        successTimer = setTimeout(() => {
          showSuccess.value = false
        }, 2000)
      }
    }
  },
)

onUnmounted(() => {
  if (successTimer) clearTimeout(successTimer)
})

const isDisabled = computed(() => props.isExporting || !props.targetRef)

const showExportError = ref(false)
let errorTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.exportError,
  err => {
    if (err) {
      showExportError.value = true
      showSuccess.value = false
      if (errorTimer) clearTimeout(errorTimer)
      errorTimer = setTimeout(() => {
        showExportError.value = false
      }, 5000)
    }
  },
)

onUnmounted(() => {
  if (errorTimer) clearTimeout(errorTimer)
})
</script>

<template>
  <div class="relative inline-flex flex-col items-center">
    <button
      :disabled="isDisabled"
      class="export-btn"
      :aria-label="isExporting ? '导出中...' : showSuccess ? '已保存' : '存为图片'"
      @click="emit('export')"
    >
      <span v-if="isExporting" class="flex items-center gap-1">
        <span class="export-spinner" aria-hidden="true" />
        <span>导出中...</span>
      </span>
      <span v-else-if="showSuccess">✓ 已保存</span>
      <span v-else class="flex items-center gap-1">
        <svg class="export-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 11v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M8 2v8m0 0-3-3m3 3 3-3"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>存为图片</span>
      </span>
    </button>
    <Transition name="fade">
      <span v-if="showExportError" class="text-xs text-cinnabar mt-1 whitespace-nowrap">
        导出失败，请重试
      </span>
    </Transition>
  </div>
</template>

<style scoped>
.export-btn {
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
.export-btn:hover:not(:disabled) {
  color: var(--color-cinnabar);
  background: color-mix(in srgb, var(--color-cinnabar) 4%, transparent);
}
.export-btn:active:not(:disabled) {
  transform: scale(0.97);
}
.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.export-spinner {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border: 1.5px solid color-mix(in srgb, var(--color-cinnabar) 30%, transparent);
  border-top-color: var(--color-cinnabar);
  border-radius: 50%;
  animation: export-spin 0.6s linear infinite;
}
@keyframes export-spin {
  to {
    transform: rotate(360deg);
  }
}
.export-icon {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
