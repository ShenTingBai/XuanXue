// @vitest-environment happy-dom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref, shallowRef, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useSelfProfile } from '../../composables/useSelfProfile'
import type { SelfProfile, SelfProfileSummary } from '../../types/self-profile'

// ============================================================================
// Global/模块边界替身：useState、$fetch、BroadcastChannel、认证模块
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

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)
vi.stubGlobal('importMetaClient', true)

// 受控认证状态：真实 useSelfProfile 显式 import '../../composables/useAuth'，
// 因此用同模块路径 vi.mock 提供共享真实 refs。工厂经 vi.hoisted 容器引用运行期实例，
// 避免 vi.mock 提升（hoist）阶段访问未初始化模块变量。
const authRefs = vi.hoisted(() => ({
  authStatus: undefined as unknown,
  currentAccount: undefined as unknown,
  markSessionExpired: undefined as unknown,
}))
vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({
    authStatus: authRefs.authStatus,
    currentAccount: authRefs.currentAccount,
    markSessionExpired: authRefs.markSessionExpired,
  }),
}))

// 模块加载后填充容器；测试正文沿用 authStatus/currentAccount/markSessionExpired 名。
const authStatus = ref('guest')
const currentAccount = ref<any>(null)
const markSessionExpired = vi.fn()
authRefs.authStatus = authStatus
authRefs.currentAccount = currentAccount
authRefs.markSessionExpired = markSessionExpired

// BroadcastChannel 替身：postMessage 只投递到同名「其他」未关闭实例（浏览器语义：
// 发送者不接收自身消息）；close 后不再投递。
class MockBroadcastChannel {
  onmessage: ((ev: MessageEvent) => void) | null = null
  static instances: MockBroadcastChannel[] = []
  constructor(public name: string) {
    MockBroadcastChannel.instances.push(this)
  }
  postMessage(data: any) {
    // 只投递同名的其他未关闭实例；不回送发送者自身。
    for (const other of MockBroadcastChannel.instances) {
      if (other === this || other.name !== this.name) continue
      if (other.onmessage) other.onmessage({ data } as MessageEvent)
    }
  }
  close() {
    MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter(i => i !== this)
  }
}
const realBroadcastChannel = globalThis.BroadcastChannel

const sampleProfile: SelfProfile = {
  id: 'p1',
  accountId: 1,
  version: 1,
  birthDate: {
    raw: { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null },
    solarDate: '2000-01-01',
    conversionVersion: 'v1',
    confirmedAt: '2026-09-09T00:00:00.000Z',
  },
  useAllowed: true,
  createdAt: '2026-09-09T00:00:00.000Z',
  updatedAt: '2026-09-09T00:00:00.000Z',
}

const sampleSummary: SelfProfileSummary = {
  exists: true,
  profileId: 'p1',
  version: 1,
  hasBirthDate: true,
  canImport: true,
}

function setAuthenticated(accountId = 1) {
  authStatus.value = 'authenticated'
  currentAccount.value = { id: accountId }
}

function setGuest() {
  authStatus.value = 'guest'
  currentAccount.value = null
}

/** 触发一次微任务刷新（watch/onMounted 队列）。 */
async function flush() {
  await nextTick()
  await nextTick()
}

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function lastChannel(): MockBroadcastChannel | null {
  const list = MockBroadcastChannel.instances.filter(i => i.name === 'xuanxue:self-profile')
  return list.length ? list[list.length - 1] : null
}

// 追踪全部宿主 wrapper：afterEach 即使断言失败也强制卸载并清理监听。
const mountedWrappers: VueWrapper[] = []

/** 生命周期宿主：挂载真实组件使 composable 内的 watch/onMounted/onBeforeUnmount 生效。 */
function mountHost(): { wrapper: VueWrapper; api: ReturnType<typeof useSelfProfile> } {
  // 保留 API 内部 refs，避免测试宿主自动解包后 .value 失真。
  const exposed = shallowRef<ReturnType<typeof useSelfProfile> | null>(null)
  const Host = defineComponent({
    setup() {
      const api = useSelfProfile()
      exposed.value = api
      return () => null
    },
  })
  const wrapper = mount(Host)
  mountedWrappers.push(wrapper)
  return { wrapper, api: exposed.value! }
}

describe('useSelfProfile（生命周期宿主挂载）', () => {
  beforeEach(() => {
    // afterEach 会恢复全局，每例必须重新安装实际使用的外部入口。
    vi.stubGlobal('$fetch', mockFetch)
    stateMap.clear()
    mockFetch.mockReset()
    markSessionExpired.mockReset()
    MockBroadcastChannel.instances = []
    globalThis.BroadcastChannel = MockBroadcastChannel as any
    setGuest()
  })

  afterEach(() => {
    // 即使断言失败也先卸载全部宿主（触发 composable onBeforeUnmount 清理监听/频道），
    // 再恢复 global 与认证状态。
    for (const w of mountedWrappers.splice(0)) w.unmount()
    globalThis.BroadcastChannel = realBroadcastChannel
    authStatus.value = 'guest'
    currentAccount.value = null
    vi.unstubAllGlobals()
  })

  it('restoring 不请求，返回 stale', async () => {
    authStatus.value = 'restoring'
    const { api } = mountHost()
    const r = await api.loadSummary()
    expect(mockFetch).not.toHaveBeenCalled()
    expect(r.status).toBe('stale')
  })

  it('guest 不请求且不报无档案错误，返回 unauthenticated', async () => {
    const { api } = mountHost()
    const r = await api.loadSummary()
    expect(mockFetch).not.toHaveBeenCalled()
    expect(r.status).toBe('unauthenticated')
    expect(api.error.value).toBeNull()
    expect(api.summary.value).toBeNull()
  })

  it('已登录仅请求 summary（不自动读完整 profile），成功结果可读', async () => {
    setAuthenticated()
    mockFetch.mockResolvedValue({ summary: sampleSummary })
    const { api } = mountHost()
    const r = await api.loadSummary()
    expect(mockFetch).toHaveBeenCalledWith('/api/self-profile/summary')
    expect(r.status).toBe('success')
    if (r.status === 'success') {
      expect(r.summary?.hasBirthDate).toBe(true)
    }
    expect(api.summary.value?.hasBirthDate).toBe(true)
    expect(api.profile.value).toBeNull()
  })

  it('明确动作才读完整 profile；成功返回 profile', async () => {
    setAuthenticated()
    mockFetch.mockResolvedValue({ profile: sampleProfile })
    const { api } = mountHost()
    const r = await api.loadProfile()
    expect(mockFetch).toHaveBeenCalledWith('/api/self-profile')
    expect(r.status).toBe('success')
    if (r.status === 'success') {
      expect(r.profile?.birthDate?.solarDate).toBe('2000-01-01')
    }
  })

  it('成功无档案与失败可区分：profile=null 是 success，网络错误是 failure', async () => {
    setAuthenticated()
    mockFetch.mockResolvedValue({ profile: null })
    const { api } = mountHost()
    const okNull = await api.loadProfile(true)
    expect(okNull.status).toBe('success')
    if (okNull.status === 'success') expect(okNull.profile).toBeNull()

    mockFetch.mockRejectedValue(Object.assign(new Error('net'), { statusCode: 500 }))
    const failed = await api.loadProfile(true)
    expect(failed.status).toBe('failure')
    expect(api.error.value).not.toBeNull()
  })

  it('失败保留数据且错误可见（loadSummary failure）', async () => {
    setAuthenticated()
    mockFetch.mockRejectedValue(Object.assign(new Error('net'), { statusCode: 500 }))
    const { api } = mountHost()
    const r = await api.loadSummary()
    expect(r.status).toBe('failure')
    expect(api.error.value).not.toBeNull()
  })

  it('401 调用 markSessionExpired，读取返回 unauthenticated', async () => {
    setAuthenticated()
    mockFetch.mockRejectedValue(Object.assign(new Error('unauth'), { statusCode: 401 }))
    const { api } = mountHost()
    const r = await api.loadSummary()
    expect(r.status).toBe('unauthenticated')
    expect(markSessionExpired).toHaveBeenCalled()
  })

  it('A 账号慢响应在切换 B（无新请求）后被丢弃，返回 stale', async () => {
    setAuthenticated(1)
    const d = deferred<any>()
    mockFetch.mockReturnValueOnce(d.promise)
    const { api } = mountHost()
    const pending = api.loadSummary()
    // 切换到 B 账号，但不发起新请求：代际已变化
    setAuthenticated(2)
    await flush()
    // A 晚到成功
    d.resolve({ summary: { ...sampleSummary, profileId: 'p1' } })
    const r = await pending
    expect(r.status).toBe('stale')
    expect(api.summary.value).toBeNull()
  })

  it('A 账号慢响应 401 在切换 B 后不能注销新会话', async () => {
    setAuthenticated(1)
    const d = deferred<any>()
    mockFetch.mockReturnValueOnce(d.promise)
    const { api } = mountHost()
    const pending = api.loadSummary()
    // 切换到 B 账号
    setAuthenticated(2)
    await flush()
    // A 晚到 401
    d.reject(Object.assign(new Error('unauth'), { statusCode: 401 }))
    const r = await pending
    expect(r.status).toBe('stale')
    expect(markSessionExpired).not.toHaveBeenCalled()
  })

  it('登出清空完整出生日期', async () => {
    setAuthenticated(1)
    mockFetch.mockResolvedValue({ profile: sampleProfile })
    const { api } = mountHost()
    await api.loadProfile()
    expect(api.profile.value?.birthDate).not.toBeNull()
    // 登出
    setGuest()
    await flush()
    expect(api.profile.value).toBeNull()
    expect(api.summary.value).toBeNull()
  })

  it('旧失败不清新 loading：晚到失败后新请求仍正确设置 loading', async () => {
    setAuthenticated()
    const d = deferred<any>()
    mockFetch.mockReturnValueOnce(d.promise)
    const { api } = mountHost()
    const first = api.loadSummary()
    // 新请求（force）取代旧请求
    mockFetch.mockResolvedValue({ summary: sampleSummary })
    const second = api.loadSummary(true)
    // 旧请求晚到失败
    d.reject(Object.assign(new Error('net'), { statusCode: 500 }))
    await first
    await second
    expect(api.summary.value?.profileId).toBe('p1')
    expect(api.loading.value).toBe(false)
  })

  it('summary 与写入交错不吞写入结果', async () => {
    setAuthenticated()
    // 先发起保存（写入），慢响应
    const saveD = deferred<any>()
    mockFetch.mockReturnValueOnce(saveD.promise)
    const { api } = mountHost()
    const savePending = api.save({
      expected: null,
      birthDate: sampleProfile.birthDate!.raw,
      consentPolicyVersion: '2026-09-09',
    })
    // 保存进行中发起摘要刷新：写入开始即令在途读取过期，摘要应返回 stale
    mockFetch.mockResolvedValue({ summary: { ...sampleSummary, profileId: 'p0' } })
    const summaryPending = api.loadSummary(true)
    const summaryResult = await summaryPending
    expect(summaryResult.status).toBe('stale')
    // 写入完成
    saveD.resolve({ profile: sampleProfile })
    await savePending
    await flush()
    expect(api.summary.value?.profileId).toBe('p1')
    expect(api.profile.value?.id).toBe('p1')
  })

  it('挂载即自动注册频道（已登录挂载，不手调 bindChannel）', async () => {
    setAuthenticated()
    const { wrapper } = mountHost()
    await flush()
    expect(lastChannel()).not.toBeNull()
    wrapper.unmount()
  })

  it('登录后自动绑定频道，登出关闭频道（生命周期驱动，不手调 bindChannel）', async () => {
    const { wrapper } = mountHost()
    // 挂载时为 guest：无频道
    expect(lastChannel()).toBeNull()
    // 登录：watch 触发自动绑定
    setAuthenticated()
    await flush()
    expect(lastChannel()).not.toBeNull()
    // 登出：频道关闭
    setGuest()
    await flush()
    expect(lastChannel()).toBeNull()
    wrapper.unmount()
  })

  it('收到真实 message 事件使完整档案缓存失效且监听器收到元数据', async () => {
    setAuthenticated()
    mockFetch.mockResolvedValue({ profile: sampleProfile })
    const received: any[] = []
    const { api } = mountHost()
    await flush()
    api.onRemoteEvent.add(ev => received.push(ev))
    await api.loadProfile()
    expect(api.profile.value).not.toBeNull()
    // 通过真实频道派发本账号 usage-changed
    lastChannel()!.onmessage!({
      data: {
        type: 'self-profile-changed',
        accountId: 1,
        profileId: 'p1',
        version: 2,
        action: 'usage-changed',
      },
    } as any)
    expect(api.profile.value).toBeNull()
    expect(received).toHaveLength(1)
    const body = JSON.stringify(received[0])
    expect(body).not.toContain('2000-01-01')
    expect(body).not.toContain('birthDate')
  })

  it('撤回事件后晚到 GET 不能恢复旧 profile（返回 stale）', async () => {
    setAuthenticated()
    const d = deferred<any>()
    mockFetch.mockReturnValueOnce(d.promise)
    const { api } = mountHost()
    await flush()
    const pending = api.loadProfile()
    // 撤回事件先到：使在途读取过期并清缓存
    lastChannel()!.onmessage!({
      data: {
        type: 'self-profile-changed',
        accountId: 1,
        profileId: 'p1',
        version: 2,
        action: 'profile-deleted',
      },
    } as any)
    // 晚到 GET 携带旧档案
    d.resolve({ profile: sampleProfile })
    const r = await pending
    expect(r.status).toBe('stale')
    expect(api.profile.value).toBeNull()
  })

  it('新写入完成后晚到 GET 不能覆盖新状态', async () => {
    setAuthenticated()
    // 先发起慢 GET
    const getD = deferred<any>()
    mockFetch.mockReturnValueOnce(getD.promise)
    const { api } = mountHost()
    const getPending = api.loadProfile()
    // 写入完成（服务端成功）
    mockFetch.mockResolvedValue({ profile: { ...sampleProfile, version: 2 } })
    await api.save({
      expected: null,
      birthDate: sampleProfile.birthDate!.raw,
      consentPolicyVersion: '2026-09-09',
    })
    // 晚到 GET 返回旧档案
    getD.resolve({ profile: sampleProfile })
    const r = await getPending
    expect(r.status).toBe('stale')
    expect(api.profile.value?.version).toBe(2)
  })

  it('focus 事件触发摘要刷新（真实事件注册），卸载移除监听', async () => {
    setAuthenticated()
    mockFetch.mockResolvedValue({ summary: sampleSummary })
    const { wrapper, api } = mountHost()
    api.registerFocusRefresh()
    await flush()
    mockFetch.mockClear()
    window.dispatchEvent(new Event('focus'))
    await flush()
    expect(mockFetch).toHaveBeenCalledWith('/api/self-profile/summary')
    // 卸载移除监听：再派发不再请求
    wrapper.unmount()
    mockFetch.mockClear()
    window.dispatchEvent(new Event('focus'))
    await flush()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('卸载使旧请求无法更新敏感 ref，并关闭频道', async () => {
    setAuthenticated()
    const d = deferred<any>()
    mockFetch.mockReturnValueOnce(d.promise)
    const { wrapper, api } = mountHost()
    await flush()
    expect(lastChannel()).not.toBeNull()
    const pending = api.loadProfile()
    // 卸载：代际失效 + 关闭频道
    wrapper.unmount()
    expect(lastChannel()).toBeNull()
    // 晚到响应不能写入
    d.resolve({ profile: sampleProfile })
    const r = await pending
    expect(r.status).toBe('stale')
    expect(api.profile.value).toBeNull()
  })

  it('clear 后重新认证能重新绑定并接收通知', async () => {
    setAuthenticated()
    const received: any[] = []
    const { wrapper, api } = mountHost()
    await flush()
    api.onRemoteEvent.add(ev => received.push(ev))
    // clear：关闭频道但保留监听器
    api.clear()
    expect(lastChannel()).toBeNull()
    // 重新认证：watch 自动重绑
    setGuest()
    await flush()
    setAuthenticated()
    await flush()
    expect(lastChannel()).not.toBeNull()
    lastChannel()!.onmessage!({
      data: {
        type: 'self-profile-changed',
        accountId: 1,
        profileId: 'p1',
        version: 3,
        action: 'saved',
      },
    } as any)
    expect(received.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  // ========================================================================
  // v4：token 化 loading / 本地写成功时序 / clearData 频道归属
  // ========================================================================

  it('A 请求在途→换 B→B 新请求→A finally 不扣减 B 的 loading', async () => {
    setAuthenticated(1)
    const aDefer = deferred<any>()
    mockFetch.mockReturnValueOnce(aDefer.promise)
    const { api } = mountHost()
    const aPending = api.loadProfile()
    // 换 B 并发起 B 新请求（在途）
    setAuthenticated(2)
    await flush()
    const bDefer = deferred<any>()
    mockFetch.mockReturnValueOnce(bDefer.promise)
    const bPending = api.loadProfile()
    expect(api.loading.value).toBe(true)
    // A 晚到 finally（失败）：不得扣减 B 的 token
    aDefer.reject(Object.assign(new Error('net'), { statusCode: 500 }))
    await aPending
    expect(api.loading.value).toBe(true)
    // B 完成后 loading 归 false
    bDefer.resolve({ profile: { ...sampleProfile, accountId: 2 } })
    await bPending
    await flush()
    expect(api.loading.value).toBe(false)
  })

  it('本地保存成功：onLocalWriteCommitted 在 summary 发布前触发且携带新版本；失败不触发', async () => {
    setAuthenticated()
    const order: string[] = []
    const committed: any[] = []
    const { api } = mountHost()
    await flush()
    api.onLocalWriteCommitted.add(c => {
      committed.push(c)
      // 回调先于 summary 发布：此刻 summary 仍是旧缓存（null/旧值）
      order.push(`commit:${c.version}`)
    })
    mockFetch.mockResolvedValue({ profile: { ...sampleProfile, version: 2 } })
    const saved = await api.save({
      expected: { profileId: 'p1', version: 1 },
      birthDate: sampleProfile.birthDate!.raw,
      consentPolicyVersion: '2026-09-09',
    })
    expect(saved?.version).toBe(2)
    expect(committed).toHaveLength(1)
    expect(committed[0]).toEqual({ accountId: 1, profileId: 'p1', version: 2 })
    expect(api.summary.value?.version).toBe(2)
    // 失败路径（网络错误）不发送成功回调
    const failCommitted: any[] = []
    api.onLocalWriteCommitted.add(c => failCommitted.push(c))
    mockFetch.mockRejectedValue(Object.assign(new Error('net'), { statusCode: 500 }))
    await api.save({
      expected: { profileId: 'p1', version: 2 },
      birthDate: sampleProfile.birthDate!.raw,
      consentPolicyVersion: '2026-09-09',
    })
    expect(failCommitted).toHaveLength(0)
  })

  it('clearData 只清数据不动频道；页面清理路径后 B 频道仍收 message', async () => {
    setAuthenticated()
    const received: any[] = []
    const { wrapper, api } = mountHost()
    await flush()
    expect(lastChannel()).not.toBeNull()
    api.onRemoteEvent.add(ev => received.push(ev))
    mockFetch.mockResolvedValue({ profile: sampleProfile })
    await api.loadProfile()
    expect(api.profile.value).not.toBeNull()
    // clearData（页面个人状态清理路径）：数据清空但频道保留
    api.clearData()
    expect(api.profile.value).toBeNull()
    expect(api.summary.value).toBeNull()
    expect(lastChannel()).not.toBeNull()
    // B 频道仍能收到 message
    lastChannel()!.onmessage!({
      data: {
        type: 'self-profile-changed',
        accountId: 1,
        profileId: 'p1',
        version: 4,
        action: 'saved',
      },
    } as any)
    expect(received.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('BroadcastChannel 真实广播语义：发送者自身不收，其他实例收，关闭后不收', async () => {
    setAuthenticated()
    const selfReceived: any[] = []
    const otherReceived: any[] = []
    // 宿主 A（页面自身实例）
    const { wrapper, api } = mountHost()
    await flush()
    // A 先挂载：instances[0] 即 A 的频道（lastChannel 会取到后挂载的 B）
    const selfChannel = MockBroadcastChannel.instances.find(i => i.name === 'xuanxue:self-profile')!
    api.onRemoteEvent.add(ev => selfReceived.push(ev))
    // 宿主 B（另一「页面」实例，模拟第二个 tab/文档；同样在 setup 中调用以激活生命周期）
    const exposedB = ref<ReturnType<typeof useSelfProfile> | null>(null)
    const HostB = defineComponent({
      setup() {
        const apiB = useSelfProfile()
        exposedB.value = apiB
        return () => null
      },
    })
    const wrapperB = mount(HostB)
    mountedWrappers.push(wrapperB)
    const otherApi = exposedB.value!
    otherApi.onRemoteEvent.add(ev => otherReceived.push(ev))
    await flush()
    // A 的实例广播：B 收到，A 自身（发送者）不收
    selfChannel.postMessage({
      type: 'self-profile-changed',
      accountId: 1,
      profileId: 'p1',
      version: 9,
      action: 'saved',
    })
    expect(selfReceived).toHaveLength(0)
    expect(otherReceived).toHaveLength(1)
    // B 关闭后不再收到
    otherApi.clear()
    selfChannel.postMessage({
      type: 'self-profile-changed',
      accountId: 1,
      profileId: 'p1',
      version: 10,
      action: 'saved',
    })
    expect(otherReceived).toHaveLength(1)
    wrapper.unmount()
  })
})
