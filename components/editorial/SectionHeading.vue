<script setup lang="ts">
/**
 * 分节标题：汉字数字 + 标题，出版版页面的分节共用（共用件）。
 *
 * 汉字数字只作视觉序号（aria-hidden），语义由标题文本承担。
 * 需要 section 用 aria-labelledby 指向标题时传 headingId。
 */
defineProps<{
  num: string
  title: string
  /** 可选：把 id 落到 h2 上，供所在 section 的 aria-labelledby 指向；不传则不渲染 id。 */
  headingId?: string
}>()
</script>

<template>
  <div class="section-head">
    <span class="section-num" aria-hidden="true">{{ num }}</span>
    <h2 :id="headingId" class="section-title">{{ title }}</h2>
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
