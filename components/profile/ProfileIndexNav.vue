<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 卷目索引：出版版页面的分节锚点导航。
 *
 * - 桌面为 sticky 左栏；≤920px 转为正文上方的两行网格（不再 sticky）。
 * - 当前节高亮使用 IntersectionObserver，只在客户端注册，卸载时断开，SSR 阶段不触碰 DOM。
 * - 点击锚点后把焦点交给目标节，键盘与读屏用户不会停留在原处。
 */
const props = withDefaults(
  defineProps<{
    items: Array<{ num: string; label: string; href: string }>
    /** 卷目脚注；用换行分隔两行，窄屏隐藏。 */
    footnote?: string
  }>(),
  { footnote: '账号名下唯一一份\n仅账号本人可见' },
)

const activeHref = ref('')
let observer: IntersectionObserver | null = null

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return
  const targets = props.items
    .map(item => document.querySelector<HTMLElement>(item.href))
    .filter((el): el is HTMLElement => el !== null)
  if (!targets.length) return
  observer = new IntersectionObserver(
    entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible?.target.id) activeHref.value = `#${visible.target.id}`
    },
    // 视口上四分之一到下一次分节之间算「当前节」，避免两节同时高亮。
    { rootMargin: '-25% 0px -65% 0px', threshold: 0 },
  )
  targets.forEach(target => observer?.observe(target))
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

function onSelect(item: { href: string }, event: MouseEvent) {
  const target = document.querySelector<HTMLElement>(item.href)
  if (!target) return
  event.preventDefault()
  activeHref.value = item.href
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  })
  target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}
</script>

<template>
  <aside class="index" data-profile-index>
    <p class="index-title">卷 目</p>
    <nav class="index-list" aria-label="页内卷目">
      <a
        v-for="item in items"
        :key="item.href"
        class="index-link"
        :class="{ 'is-active': activeHref === item.href }"
        :href="item.href"
        @click="onSelect(item, $event)"
      >
        <span class="index-num" aria-hidden="true">{{ item.num }}</span>
        <span class="index-label">{{ item.label }}</span>
      </a>
    </nav>
    <p class="index-foot">{{ footnote }}</p>
  </aside>
</template>

<style scoped>
.index {
  position: sticky;
  top: 5rem;
  padding: 48px 30px 40px 0;
}

.index-title {
  margin: 0 0 18px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  color: var(--color-ink-medium);
}

.index-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.index-link {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 9px 0;
  font-size: 0.875rem;
  color: var(--color-ink-medium);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.index-link:hover,
.index-link:focus-visible {
  color: var(--color-ink-dark);
}

.index-num {
  width: 18px;
  font-family: var(--font-display);
  font-size: 0.9375rem;
}

.index-label {
  position: relative;
}

.index-link.is-active {
  color: var(--color-ink-dark);
}

/* 当前节下划线：仅桌面索引显示，窄屏网格里隐藏。 */
.index-link.is-active .index-label::after {
  content: '';
  position: absolute;
  inset: auto 0 -5px 0;
  height: 1px;
  background: var(--color-ink-dark);
}

.index-foot {
  margin: 22px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--color-ink-faint);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  line-height: 1.7;
  white-space: pre-line;
  color: var(--color-ink-medium);
}

@media (max-width: 920px) {
  .index {
    position: static;
    padding: 28px 0 20px;
    border-bottom: 1px solid var(--color-ink-faint);
  }

  .index-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px 18px;
  }

  .index-link {
    padding: 4px 0;
  }

  .index-link.is-active .index-label::after {
    display: none;
  }

  .index-foot {
    display: none;
  }
}
</style>
