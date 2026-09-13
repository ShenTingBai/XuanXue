<script setup lang="ts">
/**
 * 出版版报头：印章、眉题、标题、副题、状态胶囊与元信息行。
 *
 * 纯展示：状态与时间文案由页面格式化后传入，组件不推断业务状态，
 * 供本人档案页与账号与安全页共用。
 */
defineProps<{
  /** 眉题，如「第一阶段 · 出生日期字段组」。 */
  edition: string
  /** 报头主标题。 */
  title: string
  /** 副题，一行说明这份内容属于谁、谁能看。 */
  subtitle: string
  /** 状态胶囊文案；为空则不渲染胶囊。 */
  statusText?: string
  /** 元信息行文案（已格式化）；为空时显示占位。 */
  metaText?: string
}>()
</script>

<template>
  <header class="masthead">
    <span class="seal" aria-hidden="true">玄</span>
    <p class="edition">{{ edition }}</p>
    <h1 class="title">{{ title }}</h1>
    <p class="sub">{{ subtitle }}</p>
    <div class="meta">
      <span v-if="statusText" class="tag">{{ statusText }}</span>
      <span class="meta-text">{{ metaText || '—' }}</span>
    </div>
  </header>
</template>

<style scoped>
.masthead {
  position: relative;
  padding-bottom: 40px;
}

.seal {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  margin-bottom: 20px;
  border-radius: 9px;
  background: var(--color-cinnabar);
  color: var(--color-paper-lightest);
  font-family: var(--font-display);
  font-size: 1.75rem;
  line-height: 1;
  box-shadow: 0 6px 18px -10px var(--color-cinnabar-deepest);
}

.edition {
  margin: 0 0 12px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  letter-spacing: 0.18em;
  color: var(--color-ink-medium);
}

.title {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: clamp(2rem, 4.4vw, 2.75rem);
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.05em;
  color: var(--color-ink-dark);
  overflow-wrap: anywhere;
}

.sub {
  margin: 0 0 20px;
  font-size: 0.875rem;
  letter-spacing: 0.04em;
  color: var(--color-ink-medium);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--color-ink-faint);
  border-radius: 999px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  color: var(--color-ink-medium);
}

.meta-text {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink-medium);
}
</style>
