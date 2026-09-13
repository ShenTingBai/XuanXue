// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ref, shallowRef } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import AccountPage from '~/pages/account.vue'
import type { SelfProfileSummary } from '~/types/self-profile'
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_SERVICE_TERMS_VERSION,
} from '~/constants/account-policy'

const profileApi = {
  summary: shallowRef<SelfProfileSummary | null>(null),
  error: ref<string | null>(null),
  loadSummary: vi.fn(),
  clear: vi.fn(),
}
vi.mock('~/composables/useSelfProfile', () => ({ useSelfProfile: () => profileApi }))

const actions = {
  logout: vi.fn(),
  logoutAll: vi.fn(),
  deleteAccount: vi.fn(),
}
const replace = vi.fn()

let wrapper: VueWrapper | undefined

beforeEach(() => {
  profileApi.summary.value = null
  profileApi.error.value = null
  profileApi.loadSummary.mockReset().mockResolvedValue({ status: 'success' })
  profileApi.clear.mockReset()
  actions.logout.mockReset().mockResolvedValue(undefined)
  actions.logoutAll.mockReset().mockResolvedValue(undefined)
  actions.deleteAccount.mockReset().mockResolvedValue(undefined)
  replace.mockClear()
  vi.stubGlobal('useSeoMeta', vi.fn())
  vi.stubGlobal('useRouter', () => ({ replace }))
  vi.stubGlobal('useAuth', () => ({
    authStatus: ref('authenticated'),
    currentAccount: ref({ id: 1, nickname: '验收账号', createdAt: '2026-09-13T02:15:00.000Z' }),
    restoreError: ref(null),
    restoreSession: vi.fn().mockResolvedValue(undefined),
    logout: actions.logout,
    logoutAll: actions.logoutAll,
    deleteAccount: actions.deleteAccount,
  }))
})

afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

async function openPage() {
  wrapper = mount(AccountPage, {
    global: { stubs: { NuxtLink: true, teleport: true } },
  })
  await flushPromises()
  return wrapper
}

async function openDeleteDialog(page: VueWrapper) {
  await page.get('button[aria-controls="account-danger-body"]').trigger('click')
  const entry = page.findAll('button').find(button => button.text().includes('注销账号'))
  await entry!.trigger('click')
  await flushPromises()
}

describe('账号与安全页结构', () => {
  it('四节锚点与卷目索引一一对应', async () => {
    const page = await openPage()
    const hrefs = page.findAll('[data-profile-index] a').map(link => link.attributes('href'))
    expect(hrefs).toEqual(['#sec-account', '#sec-session', '#sec-data', '#sec-close'])
    for (const href of hrefs) {
      expect(page.find(href as string).exists()).toBe(true)
    }
  })

  it('展示昵称、创建时间、账号状态与真实政策版本', async () => {
    const page = await openPage()
    const text = page.text()
    expect(text).toContain('验收账号')
    // createdAt 2026-09-13T02:15Z 在 Asia/Shanghai 为同一天
    expect(text).toContain('创建于 2026-09-13')
    expect(text).toContain('账号状态：正常')
    expect(text).toContain('昵称规则')
    expect(text).toContain(CURRENT_PRIVACY_POLICY_VERSION)
    expect(text).toContain(CURRENT_SERVICE_TERMS_VERSION)
  })

  it('读取本人档案最小摘要，失败不伪装成未建档', async () => {
    const page = await openPage()
    expect(profileApi.loadSummary).toHaveBeenCalled()
    expect(page.text()).toContain('正在读取档案状态…')

    profileApi.summary.value = {
      exists: true,
      profileId: 'p1',
      version: 1,
      hasBirthDate: true,
      canImport: true,
    }
    await flushPromises()
    expect(page.text()).toContain('已保存出生日期')

    profileApi.summary.value = {
      exists: true,
      profileId: 'p1',
      version: 2,
      hasBirthDate: false,
      canImport: false,
    }
    await flushPromises()
    expect(page.text()).toContain('档案已保留 · 出生日期已删除')

    profileApi.summary.value = {
      exists: false,
      profileId: null,
      version: null,
      hasBirthDate: false,
      canImport: false,
    }
    await flushPromises()
    expect(page.text()).toContain('尚未建档')

    profileApi.summary.value = null
    profileApi.error.value = '读取失败'
    await flushPromises()
    expect(page.text()).toContain('暂时无法读取档案状态')
  })
})

describe('会话动作', () => {
  it('退出当前设备调用 logout 并回首页', async () => {
    const page = await openPage()
    const button = page.findAll('button').find(b => b.text().includes('退出当前设备'))
    await button!.trigger('click')
    await flushPromises()
    expect(actions.logout).toHaveBeenCalledOnce()
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('退出所有设备调用 logoutAll 并回首页', async () => {
    const page = await openPage()
    const button = page.findAll('button').find(b => b.text().includes('退出所有设备'))
    await button!.trigger('click')
    await flushPromises()
    expect(actions.logoutAll).toHaveBeenCalledOnce()
    expect(replace).toHaveBeenCalledWith('/')
  })

  it('退出失败时提示错误且不跳转，保持登录状态', async () => {
    actions.logout.mockRejectedValueOnce(new Error('退出失败，请稍后再试'))
    const page = await openPage()
    const button = page.findAll('button').find(b => b.text().includes('退出当前设备'))
    await button!.trigger('click')
    await flushPromises()
    expect(page.text()).toContain('退出失败')
    expect(replace).not.toHaveBeenCalled()
  })
})

describe('注销账号（独立危险区）', () => {
  it('默认折叠，展开后才能进入注销流程', async () => {
    const page = await openPage()
    const toggle = page.get('button[aria-controls="account-danger-body"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await openDeleteDialog(page).catch(() => {})
    // 折叠时危险区内的按钮不可见（v-show），展开后才可用
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(page.find('#delete-dialog-title').exists()).toBe(true)
  })

  it('昵称不一致时拒绝注销且不提交', async () => {
    const page = await openPage()
    await openDeleteDialog(page)
    await page.get('#delete-nickname').setValue('别的昵称')
    await page.get('#delete-password').setValue('Whatever-123')
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(actions.deleteAccount).not.toHaveBeenCalled()
    expect(page.text()).toContain('昵称与当前账号不一致')
  })

  it('缺少密码时拒绝注销且不提交', async () => {
    const page = await openPage()
    await openDeleteDialog(page)
    await page.get('#delete-nickname').setValue('验收账号')
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(actions.deleteAccount).not.toHaveBeenCalled()
    expect(page.text()).toContain('请输入当前密码')
  })

  it('昵称与密码正确时注销并回首页', async () => {
    const page = await openPage()
    await openDeleteDialog(page)
    await page.get('#delete-nickname').setValue('验收账号')
    await page.get('#delete-password').setValue('Whatever-123')
    await page.get('form').trigger('submit')
    await flushPromises()
    expect(actions.deleteAccount).toHaveBeenCalledWith('验收账号', 'Whatever-123')
    expect(replace).toHaveBeenCalledWith('/')
  })
})

describe('页面页脚统一', () => {
  it('本人档案页与账号与安全页都渲染全站页脚', () => {
    // 全站惯例：页面级页面与工具页（ToolPageLayout）都带 PageFooter；
    // 2026-09-13 用户要求两页统一，档案页补齐。
    for (const file of ['pages/self-profile.vue', 'pages/account.vue']) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf-8')
      expect(source).toContain("from '~/components/tools/PageFooter.vue'")
      expect(source).toContain('<PageFooter />')
    }
  })
})

describe('账号级与档案级删除互不混放', () => {
  it('账号页不提供删除本人档案', async () => {
    const page = await openPage()
    expect(page.text()).not.toContain('删除整份档案')
    expect(page.text()).not.toContain('删除出生日期')
  })

  it('本人档案页不提供注销账号', () => {
    const source = readFileSync(resolve(process.cwd(), 'pages/self-profile.vue'), 'utf-8')
    expect(source).not.toContain('注销')
  })
})
