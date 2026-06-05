<!--
  MethodologyNote — 算法溯源内联折叠卡片

  使用方式：放在 section-header 所在行的右侧

  <div class="flex items-center justify-between">
    <div class="section-header"><h2>合婚综论</h2></div>
    <MethodologyNote
      :classical="[...]"
      :synthesis="[...]"
    />
  </div>
-->
<script setup lang="ts">
export interface ClassicalSource {
  method: string
  source: string
}

defineProps<{
  /** 经典来源列表 */
  classical?: ClassicalSource[]
  /** 开发者合成项 */
  synthesis?: string[]
  /** 工具名（用于 aria-label），可选 */
  tool?: string
}>()

const expanded = ref(false)
const contentId = useId()

function toggle() {
  expanded.value = !expanded.value
}

function close() {
  expanded.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close()
  }
}
</script>

<template>
  <div class="methodology-root">
    <!-- Toggle: 注 ▾ / 注 ▴ -->
    <button
      :aria-expanded="expanded"
      :aria-controls="contentId"
      :aria-label="`${tool || ''}算法溯源`"
      class="methodology-toggle"
      @click="toggle"
      @keydown.enter="toggle"
      @keydown.space.prevent="toggle"
    >
      <span class="methodology-toggle__char">注</span>
      <span class="methodology-toggle__arrow" aria-hidden="true">{{ expanded ? '▴' : '▾' }}</span>
    </button>

    <!-- Collapse panel -->
    <Transition name="methodology-collapse">
      <div
        v-if="expanded"
        :id="contentId"
        class="methodology-panel"
        role="region"
        :aria-label="`${tool || ''}算法溯源详情`"
        @keydown="onKeydown"
      >
        <div class="methodology-panel__grid">
          <!-- Classical sources -->
          <div v-if="classical && classical.length" class="methodology-panel__col">
            <p class="methodology-panel__col-label">经典来源</p>
            <ul class="methodology-panel__list">
              <li v-for="item in classical" :key="item.method" class="methodology-panel__item">
                <span class="methodology-panel__method">{{ item.method }}</span>
                <span class="methodology-panel__source">{{ item.source }}</span>
              </li>
            </ul>
          </div>

          <!-- Developer synthesis -->
          <div
            v-if="synthesis && synthesis.length"
            class="methodology-panel__col methodology-panel__col--synth"
          >
            <p class="methodology-panel__col-label methodology-panel__col-label--synth">
              开发者合成
            </p>
            <ul class="methodology-panel__list">
              <li
                v-for="item in synthesis"
                :key="item"
                class="methodology-panel__item methodology-panel__item--synth"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </div>

        <p class="methodology-panel__disclaimer">⚠ 合成部分为工程校准，非经典原文数据</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ── Root ── */
.methodology-root {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

/* ── Toggle: 注 ▾ ── */
.methodology-toggle {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-ink-muted);
  transition: color 0.2s ease;
  border-radius: 3px;
}

.methodology-toggle:hover {
  color: var(--color-cinnabar);
}

.methodology-toggle:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}

.methodology-toggle__char {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  line-height: 1;
}

.methodology-toggle__arrow {
  font-size: 0.5rem;
  line-height: 1;
  transition: transform 0.2s ease;
}

/* ── Panel ── */
.methodology-panel {
  margin-top: 0.5rem;
  width: 100%;
  min-width: 280px;
  max-width: 420px;
  background: var(--color-paper-lightest);
  border: 1px solid color-mix(in srgb, var(--color-ink-faint) 20%, transparent);
  border-radius: 8px;
  padding: 0.875rem 1rem;
  overflow: hidden;
}

.methodology-panel__grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (min-width: 480px) {
  .methodology-panel__grid {
    flex-direction: row;
    gap: 1.5rem;
  }
}

.methodology-panel__col {
  flex: 1;
  min-width: 0;
}

.methodology-panel__col--synth {
  padding-top: 0;
  border-top: 1px solid color-mix(in srgb, var(--color-ink-faint) 12%, transparent);
}

@media (min-width: 480px) {
  .methodology-panel__col--synth {
    padding-top: 0;
    border-top: none;
    border-left: 1px solid color-mix(in srgb, var(--color-ink-faint) 12%, transparent);
    padding-left: 1.5rem;
  }
}

.methodology-panel__col-label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-ink);
  letter-spacing: 0.08em;
  margin-bottom: 0.4rem;
}

.methodology-panel__col-label--synth {
  color: var(--color-ink-muted);
}

.methodology-panel__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.methodology-panel__item {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  line-height: 1.55;
  color: var(--color-ink-medium);
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  overflow-wrap: break-word;
}

.methodology-panel__item--synth {
  color: var(--color-ink-muted);
  padding-left: 0.5rem;
  border-left: 2px solid color-mix(in srgb, var(--color-ink-faint) 25%, transparent);
}

.methodology-panel__method {
  font-weight: 500;
  color: var(--color-ink);
  white-space: nowrap;
}

.methodology-panel__source {
  color: var(--color-ink-light);
}

.methodology-panel__disclaimer {
  margin-top: 0.625rem;
  padding-top: 0.5rem;
  border-top: 1px solid color-mix(in srgb, var(--color-ink-faint) 10%, transparent);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-muted);
  line-height: 1.5;
  letter-spacing: 0.02em;
}

/* ── Collapse transition ── */
.methodology-collapse-enter-active,
.methodology-collapse-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.methodology-collapse-enter-from,
.methodology-collapse-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  padding-top: 0;
  padding-bottom: 0;
  border-width: 0;
}

.methodology-collapse-enter-to,
.methodology-collapse-leave-from {
  max-height: 400px;
  opacity: 1;
}
</style>
