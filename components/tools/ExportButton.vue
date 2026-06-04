<script setup lang="ts">
const props = defineProps<{
  targetRef: HTMLElement | null
  filename: string
  isExporting: boolean
}>()

const emit = defineEmits<{
  export: []
}>()

const showSuccess = ref(false)
let successTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.isExporting, (val, oldVal) => {
  if (oldVal && !val) {
    showSuccess.value = true
    if (successTimer) clearTimeout(successTimer)
    successTimer = setTimeout(() => {
      showSuccess.value = false
    }, 2000)
  }
})

onUnmounted(() => {
  if (successTimer) clearTimeout(successTimer)
})

const isDisabled = computed(() => props.isExporting || !props.targetRef)
</script>

<template>
  <button
    :disabled="isDisabled"
    @click="emit('export')"
    class="export-btn"
    :aria-label="isExporting ? '导出中...' : showSuccess ? '已保存' : '存为图片'"
  >
    <span v-if="isExporting" class="flex items-center gap-1">
      <span class="export-spinner" aria-hidden="true" />
      <span>导出中...</span>
    </span>
    <span v-else-if="showSuccess">✓ 已保存</span>
    <span v-else>📥 存为图片</span>
  </button>
</template>

<style scoped>
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-family: "Noto Sans SC", sans-serif;
  color: var(--color-ink-medium);
  transition: all 0.2s ease;
}
.export-btn:hover:not(:disabled) {
  color: var(--color-cinnabar);
  background: rgba(198, 40, 40, 0.04);
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
  border: 1.5px solid rgba(198, 40, 40, 0.3);
  border-top-color: var(--color-cinnabar);
  border-radius: 50%;
  animation: export-spin 0.6s linear infinite;
}
@keyframes export-spin {
  to { transform: rotate(360deg); }
}
</style>
