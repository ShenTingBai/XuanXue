<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 卷目索引：出版版页面的分节锚点导航（共用件）。
 *
 * 当前使用者：/self-profile、/account、/tools/bazi。
 * - 桌面为 sticky 左栏；≤920px 转为正文上方的两行网格（不再 sticky）。
 * - 当前节高亮使用 IntersectionObserver，只在客户端注册，卸载时断开，SSR 阶段不触碰 DOM。
 * - 点击锚点后把焦点交给目标节，键盘与读屏用户不会停留在原处。
 *
 * 注意：DOM 钩子仍沿用 `data-profile-index`（历史命名），因为 /self-profile 与 /account
 * 的既有页面测试以它选择卷目；改名会牵动两个已验收页面的测试，改由后续专项处理。
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

  /**
   * 按当前几何重算当前节。
   *
   * 不能只看回调里的 `entries`——它只含「本次交叉状态发生变化」的目标，两种情况会失准：
   * ① 连续滚动或跳转之后，最后一次变化的那一节不一定是当前节；
   * ② 页内折叠/展开改变布局，让某一节在高亮带内长大、把下一节挤出带外，
   *    被挤出的那一节只发出「离开」事件，回调里没有可选项，高亮就停在旧值。
   * 因此每次回调都重算全集：优先取覆盖高亮带的那一节，否则取最靠上的相交节，
   * 再不然取最后一节顶边已在带上方的（滚到底时保持末节高亮）。
   */
  const syncActive = () => {
    const bandTop = window.innerHeight * 0.25
    const bandBottom = window.innerHeight * 0.35
    let intersecting: HTMLElement | null = null
    let covering: HTMLElement | null = null
    let lastAbove: HTMLElement | null = null
    for (const target of targets) {
      const rect = target.getBoundingClientRect()
      if (rect.top <= bandTop && rect.bottom >= bandBottom) {
        covering = target
        break
      }
      if (!intersecting && rect.top <= bandBottom && rect.bottom >= bandTop) {
        intersecting = target
      }
      if (rect.top <= bandTop) lastAbove = target
    }
    const active = covering ?? intersecting ?? lastAbove
    if (active?.id) activeHref.value = `#${active.id}`
  }

  observer = new IntersectionObserver(syncActive, {
    // 视口上四分之一到下一次分节之间算「当前节」，避免两节同时高亮。
    rootMargin: '-25% 0px -65% 0px',
    threshold: 0,
  })
  targets.forEach(target => observer?.observe(target))
  // 进页先对齐一次当前节，不必等第一次滚动。
  syncActive()
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
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 10px;
  /* 左右各 8px 内边距配合同值负外边距：文字 x 不变，悬停底色向两侧各扩 8px，
     活动项指示条落在文字左侧的留白里，不挤压正文列。 */
  padding: 9px 8px;
  margin-inline: -8px 0;
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--color-ink-medium);
  text-decoration: none;
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.index-link:hover,
.index-link:focus-visible {
  color: var(--color-ink-dark);
  background: color-mix(in srgb, var(--color-ink-dark) 4%, transparent);
}

.index-num {
  width: 18px;
  font-family: var(--font-display);
  font-size: 0.9375rem;
}

.index-link.is-active {
  color: var(--color-ink-dark);
}

/* 当前节三重编码：左侧指示条 + 朱砂序号 + 加深字色（不只靠颜色区分）。 */
.index-link.is-active .index-num {
  color: var(--color-cinnabar);
}

.index-link.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  border-radius: 1px;
  background: var(--color-cinnabar);
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
    /* 横向网格里没有左侧空间放指示条：取消负外边距，活动项改用下边框。 */
    padding: 4px 8px;
    margin-inline: 0;
  }

  .index-link.is-active::before {
    display: none;
  }

  .index-link.is-active {
    border-bottom: 2px solid var(--color-cinnabar);
  }

  .index-foot {
    display: none;
  }
}
</style>
