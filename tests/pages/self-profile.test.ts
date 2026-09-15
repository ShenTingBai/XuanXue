// @vitest-environment happy-dom
import { ref, shallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import SelfProfilePage from '~/pages/self-profile.vue'

/** 完整出生日期档案：删除整档的确认弹层只在此状态下可达。 */
const savedProfile = {
  id: 'profile-1',
  accountId: 1,
  version: 3,
  birthDate: {
    raw: { calendar: 'solar', year: 1990, month: 6, day: 15, isLeapMonth: null },
    solarDate: '1990-06-15',
    conversionVersion: 'profile-birth-date-v1',
    confirmedAt: '2026-09-14T02:00:00.000Z',
  },
  useAllowed: true,
  createdAt: '2026-09-14T02:00:00.000Z',
  updatedAt: '2026-09-14T02:00:00.000Z',
}

const api = {
  profile: shallowRef<typeof savedProfile | null>(null),
  error: ref<string | null>(null),
  loadProfile: vi.fn(),
  loadSummary: vi.fn(),
  clear: vi.fn(),
  historyWithBirthInputCount: ref(0),
  deleteProfile: vi.fn(),
}
vi.mock('~/composables/useSelfProfile', () => ({ useSelfProfile: () => api }))

let wrapper: VueWrapper | undefined
beforeEach(() => {
  api.error.value = null
  api.profile.value = null
  api.historyWithBirthInputCount.value = 0
  api.loadProfile.mockReset().mockResolvedValue({ status: 'success', profile: null })
  api.loadSummary.mockReset().mockResolvedValue({ status: 'success', summary: null })
  api.deleteProfile.mockReset().mockResolvedValue(true)
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
    // 删除整档前必须先知道「仍含出生输入的历史条数」，因此进入页面就要读摘要
    // （R5-B 浏览器验收实测：只读完整档案会让该条数恒为 0，弹层永远不显示选择框）。
    expect(api.loadSummary).toHaveBeenCalledOnce()
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

  it('删除整档前必须先看到历史条数并显式选择处置方式，未选择时不发出请求', async () => {
    api.profile.value = savedProfile
    api.historyWithBirthInputCount.value = 3
    const page = await openPage()

    const openButton = page.findAll('button').find(button => button.text().includes('删除整份档案'))
    expect(openButton).toBeTruthy()
    await openButton!.trigger('click')

    // 弹层内直接显示条数与两个选项，让用户在确认前就看到后果。
    expect(page.get('.auth-dialog-panel').text()).toContain('3 条历史快照包含保存时的出生输入')
    const radios = page.findAll('.auth-dialog-panel input[type="radio"]')
    expect(radios.map(radio => radio.attributes('value'))).toEqual(['keep', 'delete'])
    // 不设默认值：未选择前两个选项都不选中。
    expect(radios.every(radio => !(radio.element as HTMLInputElement).checked)).toBe(true)

    // 未选择就确认：拒绝执行，且错误提示留在弹层内（不能只显示在弹层背后）。
    const confirm = () =>
      page
        .get('.auth-dialog-panel')
        .findAll('button')
        .find(button => button.text().includes('确认删除'))!
    await confirm().trigger('click')
    await flushPromises()
    expect(api.deleteProfile).not.toHaveBeenCalled()
    expect(page.get('.auth-dialog-panel [role="alert"]').text()).toContain(
      '请先选择历史记录的处置方式',
    )

    // 选「保留」：守卫提示撤掉，出现“档案删除不等于出生输入消失”的提示，并只发送 keep。
    await radios[0]!.setValue()
    await flushPromises()
    expect(page.find('.auth-dialog-panel [role="alert"]').exists()).toBe(false)
    expect(page.text()).toContain('档案删除不代表这些出生资料已消失')

    await confirm().trigger('click')
    await flushPromises()
    expect(api.deleteProfile).toHaveBeenCalledTimes(1)
    expect(api.deleteProfile).toHaveBeenCalledWith({ profileId: 'profile-1', version: 3 }, 'keep')
  })
})
