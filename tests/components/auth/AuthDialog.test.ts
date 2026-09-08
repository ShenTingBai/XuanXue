// @vitest-environment happy-dom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AuthDialog from '~/components/auth/AuthDialog.vue'

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
vi.stubGlobal('useAuth', () => ({
  login: vi.fn(),
  register: vi.fn(),
}))

// 组件内容经 <Teleport to="body"> 渲染到 document.body；
// wrapper.find 只搜索组件根子树，查不到传送后的弹层，因此查询统一走 document。
function mountDialog(props: { show: boolean }) {
  return mount(AuthDialog, { props, attachTo: document.body })
}

function findInDialog(selector: string): HTMLElement | null {
  return document.querySelector(`[role="dialog"] ${selector}`) as HTMLElement | null
}

function focusablesInDialog(): HTMLElement[] {
  const dialog = document.querySelector('[role="dialog"]')
  if (!dialog) return []
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(el => !el.hasAttribute('disabled'))
}

describe('AuthDialog', () => {
  beforeEach(() => {
    stateMap.clear()
    document.body.innerHTML = ''
  })

  it('show=false 时不渲染弹层', () => {
    mountDialog({ show: false })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('show=true 渲染 dialog 语义与标题', async () => {
    mountDialog({ show: true })
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.querySelector('[aria-modal="true"]')).not.toBeNull()
  })

  it('初始 show=true 挂载后标题自动获得焦点（不依赖手动 focus）', async () => {
    mountDialog({ show: true })
    await flushPromises()
    const title = document.getElementById('auth-dialog-title')
    expect(title).not.toBeNull()
    // 组件 watcher immediate 自动聚焦标题，测试不手动制造焦点
    expect(document.activeElement).toBe(title)
  })

  it('false→true 时记录触发按钮、标题获得焦点、关闭后返回触发按钮', async () => {
    // 先以 false 挂载，模拟外部页面的触发按钮
    const wrapper = mountDialog({ show: false })
    // 构造一个外部触发按钮并聚焦它
    const trigger = document.createElement('button')
    trigger.id = 'external-trigger'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    // false→true 打开：标题自动聚焦
    await wrapper.setProps({ show: true })
    await flushPromises()
    const title = document.getElementById('auth-dialog-title')
    expect(document.activeElement).toBe(title)

    // 关闭：焦点返回触发按钮
    await wrapper.setProps({ show: false })
    await flushPromises()
    expect(document.activeElement).toBe(trigger)
  })

  it('Escape 关闭并发出 close 事件', async () => {
    const wrapper = mountDialog({ show: true })
    await flushPromises()
    const dialog = findInDialog('')?.closest('[role="dialog"]')
    const wrap = document.querySelector('.auth-dialog-wrap') as HTMLElement
    expect(wrap).not.toBeNull()
    wrap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(dialog).not.toBeNull()
  })

  it('认证成功发出 authenticated 并关闭', async () => {
    const wrapper = mountDialog({ show: true })
    await flushPromises()
    // 通过子组件 AuthForm 的 authenticated 事件驱动，不直接调用组件内部方法
    const form = wrapper.findComponent({ name: 'AuthForm' })
    expect(form.exists()).toBe(true)
    form.vm.$emit('authenticated')
    await flushPromises()
    expect(wrapper.emitted('authenticated')).toBeTruthy()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('初始标题获得焦点时 Shift+Tab 回到最后一个可聚焦元素（不离开弹层）', async () => {
    mountDialog({ show: true })
    await flushPromises()
    // 初始 show=true 已自动聚焦标题，无需手动 focus
    const title = document.getElementById('auth-dialog-title')
    expect(document.activeElement).toBe(title)

    const wrap = document.querySelector('.auth-dialog-wrap') as HTMLElement
    wrap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    await flushPromises()

    const focusables = focusablesInDialog()
    const lastFocusable = focusables[focusables.length - 1]
    expect(document.activeElement).toBe(lastFocusable)
    // 焦点仍在弹层内
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('从标题 Tab 进入第一个可聚焦元素', async () => {
    mountDialog({ show: true })
    await flushPromises()
    const title = document.getElementById('auth-dialog-title')
    expect(document.activeElement).toBe(title)
    const wrap = document.querySelector('.auth-dialog-wrap') as HTMLElement
    wrap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    await flushPromises()

    const focusables = focusablesInDialog()
    expect(focusables.length).toBeGreaterThan(0)
    expect(document.activeElement).toBe(focusables[0])
  })

  it('背板点击关闭', async () => {
    const wrapper = mountDialog({ show: true })
    await flushPromises()
    const backdrop = document.querySelector('.auth-dialog-backdrop') as HTMLElement
    expect(backdrop).not.toBeNull()
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
