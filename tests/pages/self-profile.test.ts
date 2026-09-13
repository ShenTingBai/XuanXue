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

  it('成功读取空档案时展示真实日期输入与保存入口', async () => {
    const page = await openPage()
    expect(api.loadProfile).toHaveBeenCalledOnce()
    expect(page.text()).toContain('还没有本人档案')
    expect(page.findAll('select')).toHaveLength(3)
    expect(page.text()).toContain('查看差异并保存')
    expect(page.text()).not.toContain('重新加载')
  })

  it('读取失败显示错误；重试成功后恢复首次建档表单', async () => {
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
    expect(page.text()).toContain('还没有本人档案')
    expect(page.findAll('select')).toHaveLength(3)
  })
})
