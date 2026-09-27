<script setup lang="ts">
/**
 * 共享依据折叠壳（原生 details/summary）。
 *
 * 2026-09-27 工具页主体收敛（design-system §4.2b）：八字「依据与范围」与生肖Ⅳ段
 * 「来源清单」此前各维护一套收起/展开视觉（原生 details vs marginal-toggle 按钮），
 * 本组件把壳统一为一个文件：原生 details 键盘行为、方形 ＋/－ 标记、
 * 展开/收起双标签、焦点环与卡片内边距。
 *
 * 边界：
 * - 只承载 UI 外壳，不读取业务数据；内容一律走默认 slot；
 * - aria-expanded 由受控 open 同步（原生 summary 不自动携带该属性），
 *   aria-controls 指向内容区 id，供辅助技术与页面回归测试定位；
 * - 收起态内容仍保留在 DOM（details 语义），可见性由浏览器决定；
 * - mark-class 仅用于保留历史回归钩子类名（如八字 bazi-fold-mark），不引入新样式。
 *
 * @author LiXinwen
 */
// 模板直接使用属性名，script 侧无需持有 props 引用
withDefaults(
  defineProps<{
    /** 收起态摘要文案（如「展开：来源清单…」）。 */
    closedLabel: string
    /** 展开态摘要文案（如「收起：来源清单…」）。 */
    openLabel: string
    /** 展开内容区 id：summary 的 aria-controls 指向它。 */
    contentId: string
    /** 受控展开状态；父页面在重新生成结果时置回 false 复位收起态。 */
    open?: boolean
    /** 附加到 ＋/－ 标记上的历史钩子类名（默认无）。 */
    markClass?: string
  }>(),
  { open: false, markClass: '' },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

/** 用户点击 summary 后原生 details 先切换 open，再以 toggle 事件把新状态同步给父级。 */
function onToggle(event: Event) {
  emit('update:open', (event.target as HTMLDetailsElement).open)
}
</script>

<template>
  <details class="evidence-disclosure card-warm rounded-xl" :open="open" @toggle="onToggle">
    <summary
      class="evidence-disclosure__summary"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="contentId"
    >
      <span class="evidence-disclosure__mark" :class="markClass" aria-hidden="true" />
      <span class="evidence-disclosure__label evidence-disclosure__label--closed">
        {{ closedLabel }}
      </span>
      <span class="evidence-disclosure__label evidence-disclosure__label--open">
        {{ openLabel }}
      </span>
    </summary>
    <div :id="contentId" class="evidence-disclosure__body">
      <slot />
    </div>
  </details>
</template>

<style scoped>
/* 摘要即按钮：原生 details 键盘可达；展开区无固定 max-height，不裁切内容。 */
.evidence-disclosure__summary {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 44px;
  padding: 1.25rem 1.5rem;
  border-radius: inherit;
  cursor: pointer;
  list-style: none;
  transition: background var(--transition-fast);
}
.evidence-disclosure__summary::-webkit-details-marker {
  display: none;
}
.evidence-disclosure__summary:hover {
  background: color-mix(in srgb, var(--color-ink-dark) 4%, transparent);
}
.evidence-disclosure__summary:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}
/* 展开/收起双标签同时渲染：被 display:none 的标签不进入可访问性树。 */
.evidence-disclosure__label {
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  color: var(--color-ink-dark);
}
.evidence-disclosure__label--open {
  display: none;
}
details[open] > .evidence-disclosure__summary .evidence-disclosure__label--closed {
  display: none;
}
details[open] > .evidence-disclosure__summary .evidence-disclosure__label--open {
  display: inline;
}
/* 方形 ＋/－ 标记：展开后填充朱砂（与三柱卡、六问折叠同一视觉）。 */
.evidence-disclosure__mark {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  border: 1px solid var(--color-cinnabar);
  border-radius: 3px;
  color: var(--color-cinnabar);
  font-size: 0.75rem;
  line-height: 1;
}
.evidence-disclosure__mark::before {
  content: '＋';
}
details[open] .evidence-disclosure__mark {
  background: var(--color-cinnabar);
  color: var(--color-paper-lightest);
}
details[open] .evidence-disclosure__mark::before {
  content: '－';
}
.evidence-disclosure__body {
  padding: 0 1.5rem 1.5rem;
}
/* 展开区第一个子元素不再额外留白（摘要底部已有内边距）。 */
.evidence-disclosure__body > :first-child {
  margin-top: 0;
}
</style>
