<script setup lang="ts">
/**
 * 分节标题：汉字数字 + 标题，四节共用。
 *
 * 汉字数字只作视觉序号（aria-hidden），语义由标题文本承担。
 */
defineProps<{
  num: string
  title: string
}>()
</script>

<template>
  <div class="section-head">
    <span class="section-num" aria-hidden="true">{{ num }}</span>
    <h2 class="section-title">{{ title }}</h2>
  </div>
</template>

<style scoped>
.section-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 26px;
}

.section-num {
  font-family: var(--font-display);
  font-size: 1.25rem;
  line-height: 1;
  color: var(--color-ink-medium);
}

.section-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.375rem, 2.4vw, 1.625rem);
  letter-spacing: 0.05em;
  color: var(--color-ink-dark);
}
</style>
