// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { computed, watch } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ToolStatusPage from '~/pages/tools/status.vue'

const navigateTo = vi.fn()

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

  it('显式导入 ToolPageLayout 与 PageHero，避免真实运行时组件解析 warning', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/tools/status.vue'), 'utf-8')
    expect(source).toContain("import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'")
    expect(source).toContain("import PageHero from '~/components/tools/PageHero.vue'")
  })

  it('合法不可公开工具真实显示工具名称与“功能整理中”', () => {
    const wrapper = mount(ToolStatusPage, {
      global: {
        stubs: {
          ToolPageLayout: { template: '<main id="main-content"><slot /></main>' },
          PageHero: {
            props: ['title', 'subtitle'],
            template: '<header><h1>{{ title }}</h1></header>',
          },
          NuxtLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>',
          },
        },
      },
    })

    try {
      expect(wrapper.findAll('main')).toHaveLength(1)
      expect(wrapper.find('main').attributes('id')).toBe('main-content')
      // 工具名称通过 PageHero title 渲染
      expect(wrapper.find('h1').text()).toContain('紫微斗数')
      expect(wrapper.find('h2#tool-status-heading').exists()).toBe(true)
      expect(wrapper.find('h2#tool-status-heading').text()).toContain('功能整理中')
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
          ToolPageLayout: { template: '<main id="main-content"><slot /></main>' },
          PageHero: { props: ['title'], template: '<header><h1>{{ title }}</h1></header>' },
          NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
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
