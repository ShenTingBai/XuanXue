<script setup lang="ts">
import { ref } from 'vue'

/**
 * 出版版危险区外壳：默认折叠，展开后显示插槽内容。
 *
 * 默认折叠降低误触；折叠状态用 aria-expanded/aria-controls 表达。
 * 条目样式用 :slotted 维护，保证档案页与账号页的危险区视觉只有一个来源。
 */
defineProps<{
  /** 折叠体 id：同一页面内必须唯一，aria-controls 指向它。 */
  bodyId: string
  /** 折叠按钮文案。 */
  label?: string
}>()

const open = ref(false)
</script>

<template>
  <div class="danger">
    <button
      type="button"
      class="danger-toggle"
      :aria-expanded="open"
      :aria-controls="bodyId"
      @click="open = !open"
    >
      <span class="danger-toggle-label">
        <span class="danger-mark" aria-hidden="true">※</span>{{ label || '危险操作 · 展开查看' }}
      </span>
      <svg
        class="chev"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>

    <div v-show="open" :id="bodyId" class="danger-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.danger {
  overflow: hidden;
  border: 1px solid var(--color-ink-faint);
  border-radius: 16px;
  background: var(--color-paper-light);
}

.danger-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 60px;
  padding: 16px 24px;
  border: 0;
  background: transparent;
  color: var(--color-ink-dark);
  text-align: left;
  transition: background var(--transition-fast);
}

.danger-toggle:hover {
  background: color-mix(in srgb, var(--color-ink-dark) 5%, transparent);
}

.danger-toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9375rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.danger-mark {
  color: var(--color-ink-medium);
}

.chev {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  color: var(--color-ink-medium);
  transition: transform var(--transition-fast);
}

.danger-toggle[aria-expanded='true'] .chev {
  transform: rotate(90deg);
}

.danger-body {
  padding: 4px 24px 24px;
  border-top: 1px solid var(--color-ink-faint);
}

/* 插槽内条目：样式留在外壳里，调用方只写结构与文案。 */
:slotted(.danger-item) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 0;
}

:slotted(.danger-item + .danger-item) {
  border-top: 1px solid var(--color-ink-faint);
}

:slotted(.danger-title) {
  margin: 0 0 5px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-ink-dark);
}

:slotted(.danger-item p) {
  max-width: 58ch;
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-ink-medium);
}
</style>
