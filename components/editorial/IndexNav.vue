<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 卷目索引：出版版页面的分节锚点导航（共用件）。
 *
 * 当前使用者：/self-profile、/account、/tools/bazi。
 * - 桌面为 sticky 左栏；≤920px 转为正文上方的两行网格（不再 sticky）。
 * - 当前节按吸顶线处最后一个已越线的章节高亮；只在客户端监听滚动与几何变化，卸载时清理。
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
let targets: HTMLElement[] = []
let resizeObserver: ResizeObserver | null = null
let mutationObserver: MutationObserver | null = null
let syncFrame: number | null = null
let mounted = false

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 解析锚点目标：同名 id 在一页内唯一，重复查询开销可忽略。 */
function resolveTargets(): HTMLElement[] {
  return props.items
    .map(item => document.querySelector<HTMLElement>(item.href))
    .filter((el): el is HTMLElement => el !== null)
}

/**
 * 目标是否需要重解析。
 *
 * 段落并非总在挂载时就存在：工具页会在异步恢复会话/档案后才渲染结果段，
 * 切换内容的 `:key` 重绘也会整体替换节点。旧实现在挂载时一次性快照，
 * 遇到这两种情况会拿到空列表或已脱节的节点，当前节高亮从此失效。
 */
function targetsStale(): boolean {
  return targets.length === 0 || targets.some(target => !target.isConnected)
}

/** 重新绑定章节几何监听：目标集合变化后必须重挂，否则折叠展开不会触发重算。 */
function observeTargets() {
  if (resizeObserver) resizeObserver.disconnect()
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(scheduleSync)
  targets.forEach(target => resizeObserver?.observe(target))
}

/**
 * 按当前几何重算当前节。
 *
 * 分节统一使用 `scroll-margin-top: 5rem` 避开吸顶栏，因此当前节就是吸顶线处
 * 最后一个顶边已越线的章节。该规则不依赖章节高度：空态Ⅲ段即使只有约 80px，
 * 滚到它时也不会因为Ⅳ段同时出现在视口上部而提前高亮Ⅳ。
 */
function syncActive() {
  if (targetsStale()) {
    targets = resolveTargets()
    observeTargets()
  }
  if (!targets.length) return

  const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const activationLine = rootFontSize * 5 + 1
  let active = targets[0] ?? null
  for (const target of targets) {
    if (target.getBoundingClientRect().top > activationLine) break
    active = target
  }
  if (active?.id) activeHref.value = `#${active.id}`
}

/** 滚动事件按动画帧合并，避免同一帧内重复读取全部章节布局。 */
function scheduleSync() {
  if (syncFrame !== null) return
  syncFrame = window.requestAnimationFrame(() => {
    syncFrame = null
    syncActive()
  })
}

onMounted(() => {
  mounted = true
  // IndexNav 常与章节作为同一父节点的兄弟挂载；等待一轮 tick，确保兄弟章节
  // 已进入 DOM 后再查询锚点，避免初始高亮为空。
  void nextTick(() => {
    if (!mounted) return
    targets = resolveTargets()
    observeTargets()

    // 监听器无条件挂载：段落晚于挂载出现时，仍需在首次滚动/重算时能拿到它们。
    window.addEventListener('scroll', scheduleSync, { passive: true })
    window.addEventListener('resize', scheduleSync)
    if (typeof MutationObserver !== 'undefined') {
      // 章节晚渲染或 keyed 重绘时不必然触发 scroll，靠 DOM 变化兜底重新解析。
      mutationObserver = new MutationObserver(scheduleSync)
      mutationObserver.observe(document.body, { childList: true, subtree: true })
    }
    syncActive()
  })
})

onBeforeUnmount(() => {
  mounted = false
  window.removeEventListener('scroll', scheduleSync)
  window.removeEventListener('resize', scheduleSync)
  if (syncFrame !== null) window.cancelAnimationFrame(syncFrame)
  syncFrame = null
  resizeObserver?.disconnect()
  resizeObserver = null
  mutationObserver?.disconnect()
  mutationObserver = null
  targets = []
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
  /* 治理规范 §18.1 触控目标：border box 命中区至少 44px。字号与文字密度不变，
     扩大的是可点击区域而不是文字本身。 */
  min-height: 44px;
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
    /* 移动端把上下内边距压到 4px 后，行高只剩约 34px（低于 §18.1 的 44px）。
       min-height 补足命中区；内容改为垂直居中，避免 baseline 对齐
       在拉高的盒子里把文字顶到上沿。 */
    align-items: center;
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
