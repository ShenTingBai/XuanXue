// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import IndexNav from '~/components/editorial/IndexNav.vue'

/**
 * 出版版卷目导航的几何回归测试。
 *
 * 空态八字页的Ⅲ段很短：锚点滚到吸顶线后，Ⅳ段已经进入视口上部。
 * 当前节必须按“最后一个越过吸顶线的章节”判定，不能按某个窄视口带里谁更高来判定。
 *
 * 另注：happy-dom 不做真实布局（getBoundingClientRect 恒为 0），因此触控命中区
 * 只能断言**样式声明**；真实 ≥44px 的 border box 由浏览器验收记录确认，
 * 不在此处伪造几何通过。
 */

const items = [
  { num: 'Ⅰ', label: '工具说明', href: '#section-guide' },
  { num: 'Ⅱ', label: '本次操作', href: '#section-input' },
  { num: 'Ⅲ', label: '核心结果摘要', href: '#section-summary' },
  { num: 'Ⅳ', label: '通俗解释与详细结果', href: '#section-detail' },
]

const sectionRects: Record<string, { top: number; bottom: number }> = {}
let wrapper: VueWrapper | undefined
let originalRect: typeof HTMLElement.prototype.getBoundingClientRect

const Host = defineComponent({
  setup() {
    return () =>
      h('div', [
        h(IndexNav, { items }),
        ...items.map(item => h('section', { id: item.href.slice(1) })),
      ])
  },
})

beforeEach(() => {
  originalRect = HTMLElement.prototype.getBoundingClientRect
  HTMLElement.prototype.getBoundingClientRect = function () {
    const rect = sectionRects[this.id]
    if (!rect) return originalRect.call(this)
    return {
      x: 0,
      y: rect.top,
      top: rect.top,
      right: 800,
      bottom: rect.bottom,
      left: 0,
      width: 800,
      height: rect.bottom - rect.top,
      toJSON: () => ({}),
    }
  }
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  HTMLElement.prototype.getBoundingClientRect = originalRect
  for (const key of Object.keys(sectionRects)) delete sectionRects[key]
  vi.unstubAllGlobals()
})

describe('IndexNav 当前章节高亮', () => {
  it('短章节滚到 5rem 吸顶线时保持该章节高亮，不提前跳到下一章', async () => {
    Object.assign(sectionRects, {
      'section-guide': { top: -900, bottom: -500 },
      'section-input': { top: -500, bottom: 80 },
      // Ⅲ 段只有 80px 高，锚点落点与全局 scroll-margin-top: 5rem 对齐。
      'section-summary': { top: 80, bottom: 160 },
      'section-detail': { top: 160, bottom: 720 },
    })

    wrapper = mount(Host, { attachTo: document.body })
    await nextTick()
    await nextTick()

    const active = wrapper.find('[data-profile-index] a.is-active')
    expect(active.attributes('href')).toBe('#section-summary')
  })

  it('卷目锚点与 active class 不因命中区调整而改变', async () => {
    Object.assign(sectionRects, {
      'section-guide': { top: -900, bottom: -500 },
      'section-input': { top: -500, bottom: 80 },
      'section-summary': { top: 80, bottom: 160 },
      'section-detail': { top: 160, bottom: 720 },
    })

    wrapper = mount(Host, { attachTo: document.body })
    await nextTick()
    await nextTick()

    // 锚点：四项 href 与 data-profile-index 容器保持原样
    const links = wrapper.findAll('[data-profile-index] a.index-link')
    expect(links).toHaveLength(items.length)
    expect(links.map(l => l.attributes('href'))).toEqual(items.map(i => i.href))
    // active 仍由几何判定落在Ⅲ，而不是因为样式改动而漂移
    expect(wrapper.findAll('[data-profile-index] a.is-active')).toHaveLength(1)
    expect(wrapper.find('[data-profile-index] a.is-active').attributes('href')).toBe(
      '#section-summary',
    )
  })
})

describe('IndexNav 触控命中区（§18.1）', () => {
  /**
   * happy-dom 无真实布局，不能断言 getBoundingClientRect 高度；
   * 这里断言样式声明层：基础规则须给出 44px 命中区下限，
   * 移动端规则须把内容垂直居中（否则 min-height 会把文字顶到上沿）。
   * 真实 ≥44px 的 border box 由浏览器验收记录确认。
   */
  const source = () =>
    readFileSync(resolve(process.cwd(), 'components/editorial/IndexNav.vue'), 'utf-8')

  /** 截取 `selector { ... }` 规则块正文；找不到返回空串。 */
  function ruleBlock(css: string, selector: string): string {
    const start = css.indexOf(selector)
    if (start < 0) return ''
    const open = css.indexOf('{', start)
    const close = css.indexOf('}', open)
    if (open < 0 || close < 0) return ''
    return css.slice(open + 1, close)
  }

  it('基础 .index-link 规则含 min-height: 44px 命中区下限', () => {
    const css = source()
    const block = ruleBlock(css, '.index-link {')
    expect(block, '.index-link 基础规则必须存在').not.toBe('')
    expect(block).toContain('min-height: 44px')
  })

  it('≤920px 移动端 .index-link 使用垂直居中配合 min-height', () => {
    const css = source()
    const mediaStart = css.indexOf('@media (max-width: 920px)')
    expect(mediaStart, '必须保留 ≤920px 移动端规则').toBeGreaterThan(-1)
    const mediaBlock = css.slice(mediaStart)
    const block = ruleBlock(mediaBlock, '.index-link {')
    expect(block, '移动端 .index-link 规则必须存在').not.toBe('')
    expect(block).toContain('align-items: center')
    // 移动端不得用负外边距或缩小字号来"解决"命中区问题
    expect(block).toContain('margin-inline: 0')
    expect(block).not.toContain('font-size')
  })

  it('不得通过禁用缩放或全局 overflow 掩盖命中区问题', () => {
    const css = source()
    expect(css).not.toContain('user-scalable=no')
    expect(css).not.toContain('maximum-scale')
    expect(css).not.toContain('overflow: hidden')
  })
})
