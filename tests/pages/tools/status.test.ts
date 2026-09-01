// @vitest-environment happy-dom
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

  it('在默认布局主内容地标内只保留一个 main', () => {
    const wrapper = mount(ToolStatusPage, {
      global: {
        stubs: {
          ToolPageLayout: { template: '<main id="main-content"><slot /></main>' },
          PageHero: {
            props: ['title'],
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
      expect(wrapper.find('h1').exists()).toBe(true)
      expect(wrapper.find('section[aria-labelledby="tool-status-heading"]').exists()).toBe(true)
      expect(wrapper.find('h2#tool-status-heading').exists()).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })
})
