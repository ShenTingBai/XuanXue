<script setup lang="ts">
/**
 * 出版版提示条：位于分节内容之后的一段边界说明。
 *
 * 纯展示容器，文案由各页给出，避免每个分节各写一份同样的边框样式。
 */
</script>

<template>
  <p class="note">
    <slot />
  </p>
</template>

<style scoped>
.note {
  margin: 20px 0 0;
  padding: 14px 16px;
  border: 1px solid var(--color-ink-faint);
  border-radius: 10px;
  background: var(--color-paper-light);
  font-size: 0.84375rem;
  line-height: 1.75;
  color: var(--color-ink-medium);
}
</style>
