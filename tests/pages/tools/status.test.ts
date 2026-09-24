// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { computed, watch } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ToolStatusPage from '~/pages/tools/status.vue'

const navigateTo = vi.fn()

/**
 * 出版版外壳替身：只保留布局主线（`main#main-content` 由 default layout 提供，
 * 页标题由 Masthead 渲染），其余插槽内容原样透出。
 */
const shellStub = {
  name: 'ToolEditorialShellStub',
  props: [
    'indexItems',
    'indexFootnote',
    'edition',
    'title',
    'subtitle',
    'statusText',
    'metaText',
    'seal',
  ],
  template: '<main id="main-content"><h1>{{ title }}</h1><slot /></main>',
}

const nuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

describe('工具状态页', () => {
  beforeEach(() => {
    vi.stubGlobal('useRoute', () => ({ query: { tool: 'ziwei' } }))
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('useHead', () => {})
    vi.stubGlobal('navigateTo', navigateTo)
  })

  afterEach(() => {
    navigateTo.mockClear()
    vi.unstubAllGlobals()
  })

  it('显式导入 ToolEditorialShell，不再自建 ToolPageLayout / PageHero', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/tools/status.vue'), 'utf-8')
    expect(source).toContain(
      "import ToolEditorialShell from '~/components/editorial/ToolEditorialShell.vue'",
    )
    // 外壳统一后报头由 Masthead 承担：再引入旧布局或页内报头就是第二套外壳。
    expect(source).not.toContain('ToolPageLayout')
    expect(source).not.toContain('PageHero')
  })

  it('合法不可公开工具真实显示工具名称与“功能整理中”', () => {
    const wrapper = mount(ToolStatusPage, {
      global: {
        stubs: {
          ToolEditorialShell: shellStub,
          NuxtLink: nuxtLinkStub,
        },
      },
    })

    try {
      expect(wrapper.findAll('main')).toHaveLength(1)
      expect(wrapper.find('main').attributes('id')).toBe('main-content')
      // 工具名称通过外壳 title（Masthead 主标题）渲染
      expect(wrapper.find('h1').text()).toContain('紫微斗数')
      expect(wrapper.find('h2#tool-status-heading').exists()).toBe(true)
      expect(wrapper.find('h2#tool-status-heading').text()).toContain('功能整理中')
      // 卷目只有一项，且锚点落在页内真实存在的分节上（不为凑索引编造段落）
      const shell = wrapper.findComponent(shellStub)
      expect(shell.props('indexItems')).toEqual([
        { num: 'Ⅰ', label: '功能状态', href: '#tool-status' },
      ])
      expect(wrapper.find('#tool-status').exists()).toBe(true)
      // 页面保持只读，无输入或计算控件
      expect(wrapper.find('input').exists()).toBe(false)
      expect(wrapper.find('button').exists()).toBe(false)
      expect(wrapper.find('form').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  it('未知工具参数回首页', async () => {
    vi.stubGlobal('useRoute', () => ({ query: { tool: 'not-a-tool' } }))
    const wrapper = mount(ToolStatusPage, {
      global: {
        stubs: {
          ToolEditorialShell: shellStub,
          NuxtLink: nuxtLinkStub,
        },
      },
    })
    try {
      expect(navigateTo).toHaveBeenCalledWith('/')
    } finally {
      wrapper.unmount()
    }
  })
})
