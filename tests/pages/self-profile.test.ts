// @vitest-environment happy-dom
import { ref, shallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import SelfProfilePage from '~/pages/self-profile.vue'

const api = {
  profile: shallowRef(null),
  error: ref<string | null>(null),
  loadProfile: vi.fn(),
  clear: vi.fn(),
}
vi.mock('~/composables/useSelfProfile', () => ({ useSelfProfile: () => api }))

let wrapper: VueWrapper | undefined
beforeEach(() => {
  api.error.value = null
  api.profile.value = null
  api.loadProfile.mockReset().mockResolvedValue({ status: 'success', profile: null })
  vi.stubGlobal('useSeoMeta', vi.fn())
  vi.stubGlobal('useRouter', () => ({ replace: vi.fn() }))
  vi.stubGlobal('useAuth', () => ({
    authStatus: ref('authenticated'),
    currentAccount: ref({ id: 1, nickname: '验收账号' }),
    restoreError: ref(null),
    restoreSession: vi.fn().mockResolvedValue(undefined),
  }))
})
afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

describe('本人档案首次加载', () => {
  async function openPage() {
    wrapper = mount(SelfProfilePage, {
      global: { stubs: { NuxtLink: true, teleport: true } },
    })
    await flushPromises()
    return wrapper
  }

  it('成功读取空档案时展示空态与录入入口，展开编辑器后才渲染日期输入', async () => {
    const page = await openPage()
    expect(api.loadProfile).toHaveBeenCalledOnce()
    expect(page.text()).toContain('尚未录入出生资料')
    // 编辑器默认收起：日期选择器尚未渲染。
    expect(page.findAll('select')).toHaveLength(0)

    const entry = page.findAll('button').find(button => button.text().includes('录入出生日期'))
    expect(entry).toBeTruthy()
    await entry!.trigger('click')
    expect(page.findAll('select')).toHaveLength(3)
    expect(page.text()).toContain('查看本次变更')
    expect(page.text()).not.toContain('重新加载')
  })

  it('卷目索引四节锚点与页面 section 一一对应', async () => {
    const page = await openPage()
    const hrefs = page.findAll('[data-profile-index] a').map(link => link.attributes('href'))
    expect(hrefs).toEqual(['#sec-record', '#sec-usage', '#sec-scope', '#sec-archive'])
    for (const href of hrefs) {
      expect(page.find(href as string).exists()).toBe(true)
    }
  })

  it('读取失败显示错误与重试；重试成功后恢复空态与录入入口', async () => {
    api.loadProfile.mockImplementationOnce(async () => {
      api.error.value = '无法获取本人档案，请稍后重试'
      return { status: 'failure' }
    })
    const page = await openPage()
    expect(page.get('[role="alert"]').text()).toContain('无法获取本人档案')
    expect(page.findAll('select')).toHaveLength(0)

    api.loadProfile.mockImplementationOnce(async () => {
      api.error.value = null
      return { status: 'success', profile: null }
    })
    await page.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(page.text()).toContain('尚未录入出生资料')
    const entry = page.findAll('button').find(button => button.text().includes('录入出生日期'))
    await entry!.trigger('click')
    expect(page.findAll('select')).toHaveLength(3)
  })
})
