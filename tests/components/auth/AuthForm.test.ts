// @vitest-environment happy-dom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AuthForm from '~/components/auth/AuthForm.vue'

// ============================================================================
// Global mocks
// ============================================================================

const stateMap = new Map<string, { value: any }>()
vi.stubGlobal(
  'useState',
  vi.fn(<T>(key: string, init?: () => T): { value: T } => {
    if (!stateMap.has(key)) {
      stateMap.set(key, { value: init ? init() : undefined })
    }
    return stateMap.get(key)!
  }),
)

const mockLogin = vi.fn()
const mockRegister = vi.fn()
vi.stubGlobal('useAuth', () => ({
  login: mockLogin,
  register: mockRegister,
}))

const mockAccount = {
  id: 1,
  nickname: 'testuser',
  status: 'active',
  ageConfirmedAt: '2026-09-08T00:00:00.000Z',
  privacyPolicyVersion: '2026-09-08',
  serviceTermsVersion: '2026-09-08',
  createdAt: '2026-09-08T00:00:00.000Z',
  updatedAt: '2026-09-08T00:00:00.000Z',
}

// ============================================================================
// Tests
// ============================================================================

describe('AuthForm', () => {
  beforeEach(() => {
    stateMap.clear()
    mockLogin.mockReset()
    mockRegister.mockReset()
  })

  it('登录模式渲染昵称/密码字段，不渲染确认与注册勾选', () => {
    const wrapper = mount(AuthForm, { props: { mode: 'login' } })
    expect(wrapper.find('#auth-nickname').exists()).toBe(true)
    expect(wrapper.find('#auth-password').exists()).toBe(true)
    expect(wrapper.find('#auth-confirm-password').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('我已年满十四周岁')
  })

  it('注册模式渲染密码确认、年龄与双规则确认', () => {
    const wrapper = mount(AuthForm, { props: { mode: 'register' } })
    expect(wrapper.find('#auth-confirm-password').exists()).toBe(true)
    expect(wrapper.text()).toContain('我已年满十四周岁')
    expect(wrapper.text()).toContain('《隐私政策》')
    expect(wrapper.text()).toContain('《服务规则》')
  })

  it('密码首尾字符保留：登录提交不 trim 密码', async () => {
    const wrapper = mount(AuthForm, { props: { mode: 'login' } })
    await wrapper.find('#auth-nickname').setValue('testuser')
    await wrapper.find('#auth-password').setValue('  password123  ')
    await wrapper.find('form').trigger('submit.prevent')
    expect(mockLogin).toHaveBeenCalledWith('testuser', '  password123  ')
  })

  it('密码 8–64 边界校验', async () => {
    const wrapper = mount(AuthForm, { props: { mode: 'login' } })
    await wrapper.find('#auth-nickname').setValue('testuser')
    await wrapper.find('#auth-password').setValue('1234567')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('密码至少需要8个字符')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('注册时密码确认不一致阻止提交', async () => {
    const wrapper = mount(AuthForm, { props: { mode: 'register' } })
    await wrapper.find('#auth-nickname').setValue('newuser')
    await wrapper.find('#auth-password').setValue('password123')
    await wrapper.find('#auth-confirm-password').setValue('password999')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('两次输入的密码不一致')
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('注册时未勾选年龄或规则确认阻止提交', async () => {
    const wrapper = mount(AuthForm, { props: { mode: 'register' } })
    await wrapper.find('#auth-nickname').setValue('newuser')
    await wrapper.find('#auth-password').setValue('password123')
    await wrapper.find('#auth-confirm-password').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('请确认已满十四周岁')
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('注册成功提交固定版本并发出 authenticated 事件', async () => {
    mockRegister.mockResolvedValueOnce({ account: mockAccount })
    const wrapper = mount(AuthForm, { props: { mode: 'register' } })
    await wrapper.find('#auth-nickname').setValue('newuser')
    await wrapper.find('#auth-password').setValue('password123')
    await wrapper.find('#auth-confirm-password').setValue('password123')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.findAll('input[type="checkbox"]').forEach(c => c.setValue(true))
    await wrapper.find('form').trigger('submit.prevent')
    expect(mockRegister).toHaveBeenCalledWith(
      'newuser',
      'password123',
      true,
      '2026-09-08',
      '2026-09-08',
    )
    expect(wrapper.emitted('authenticated')).toBeTruthy()
  })

  it('服务端错误保持可见并可重试', async () => {
    mockLogin.mockRejectedValueOnce(
      Object.assign(new Error('Unauthorized'), { data: { statusMessage: '昵称或密码错误' } }),
    )
    const wrapper = mount(AuthForm, { props: { mode: 'login' } })
    await wrapper.find('#auth-nickname').setValue('baduser')
    await wrapper.find('#auth-password').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.text()).toContain('昵称或密码错误')
    // 可重试：再次提交
    mockLogin.mockResolvedValueOnce({ account: mockAccount })
    await wrapper.find('form').trigger('submit.prevent')
    expect(mockLogin).toHaveBeenCalledTimes(2)
  })

  it('重复提交时禁用（loading 态）', async () => {
    let resolveLogin: (v: any) => void
    mockLogin.mockReturnValueOnce(
      new Promise(res => {
        resolveLogin = res
      }),
    )
    const wrapper = mount(AuthForm, { props: { mode: 'login' } })
    await wrapper.find('#auth-nickname').setValue('testuser')
    await wrapper.find('#auth-password').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()
    resolveLogin!({ account: mockAccount })
    await vi.waitFor(() =>
      expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined(),
    )
  })
})
