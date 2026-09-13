// @vitest-environment happy-dom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref, shallowRef, nextTick, type Ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useSelfProfile } from '../../composables/useSelfProfile'
import { useSelfProfileDraft } from '../../composables/useSelfProfileDraft'
import type { SelfProfile, SelfProfileSummary } from '../../types/self-profile'

/**
 * 本人档案 API × 草稿桥接真实集成测试（只编写，不运行）。
 *
 * 与单元测试的差异：本文件导入并真实运行 useSelfProfile 与 useSelfProfileDraft，
 * 在同一 Vue 宿主 setup 中共享 API 实例与真实草稿/结果回调；只 mock 认证模块、
 * fetch 与浏览器外部边界（BroadcastChannel），不 mock 两者实现、verifyBeforeCompute
 * 或摘要 watch。
 *
 * 覆盖 v4 review 指出的证据缺口：
 * - requestImport/confirmImport 真实建立来源后，延迟 fetch 使 summary 返回新版本：
 *   summary watcher 先清 origin，verify 安全返回有界失败且无异常，旧草稿/结果清除；
 * - 带入 → 手改 → api.save 成功新版本：本地写成功回调在 summary watcher 前更新 origin，
 *   草稿/结果保持（同页保存不被误清）；
 * - 保存失败 / CAS 冲突不假同步来源；
 * - 外部 saved/delete/usage 事件仍真实失效；
 * - A→B 按实际页面清理顺序 clearData 后，B 频道可接收其他实例消息并清 B 来源；
 * - 网络失败保持草稿并阻止使用。
 *
 * 每例 afterEach 强制卸载全部 wrapper，即使断言失败也清理。
 */

// ============================================================================
// 认证模块 mock：真实 useSelfProfile 显式 import '../../composables/useAuth'
// ============================================================================
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

const authStatus = ref('guest')
const currentAccount = ref<any>(null)
const markSessionExpired = vi.fn()
authRefs.authStatus = authStatus
authRefs.currentAccount = currentAccount
authRefs.markSessionExpired = markSessionExpired

// ============================================================================
// fetch 与 BroadcastChannel 替身
// ============================================================================
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)
vi.stubGlobal('importMetaClient', true)

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

// ============================================================================
// 测试数据
// ============================================================================
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

const sampleSummary = (
  version: number,
  over: Partial<SelfProfileSummary> = {},
): SelfProfileSummary => ({
  exists: true,
  profileId: 'p1',
  version,
  hasBirthDate: true,
  canImport: true,
  ...over,
})

function setAuthenticated(accountId = 1) {
  authStatus.value = 'authenticated'
  currentAccount.value = { id: accountId }
}

function setGuest() {
  authStatus.value = 'guest'
  currentAccount.value = null
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

async function flush(times = 2) {
  for (let i = 0; i < times; i++) await nextTick()
}

// ============================================================================
// 真实宿主：useSelfProfile + useSelfProfileDraft 共享同一 API 实例
// ============================================================================
interface HostBundle {
  wrapper: VueWrapper
  api: ReturnType<typeof useSelfProfile>
  bridge: ReturnType<typeof useSelfProfileDraft>
  draft: { year: string; month: string; day: string }
  result: Ref<unknown>
}

const mountedWrappers: VueWrapper[] = []

function mountDraftHost(): HostBundle {
  // 不深层代理 API/bridge，保留它们的 ref 契约供断言读取。
  const exposed = shallowRef<Omit<HostBundle, 'wrapper'> | null>(null)
  const draft = { year: '', month: '', day: '' }
  const result = ref<unknown>(null)
  const Host = defineComponent({
    setup() {
      const api = useSelfProfile()
      const bridge = useSelfProfileDraft(
        {
          getDraft: () => ({ ...draft }),
          applyDraft: values => {
            draft.year = values.year
            draft.month = values.month
            draft.day = values.day
          },
          markResultStale: () => {},
          clearResult: () => {
            result.value = null
          },
          clearImportedDraft: () => {
            draft.year = ''
            draft.month = ''
            draft.day = ''
          },
        },
        api,
      )
      exposed.value = { api, bridge, draft, result }
      // 真实页面接线：shengxiao.vue 在 setup 中执行
      // profileApi.onRemoteEvent.add(draftBridge.onRemoteEvent)；此处等价接线，
      // 使外部实例广播能到达真实桥接处理器（不属于 mock）。
      api.onRemoteEvent.add(bridge.onRemoteEvent)
      return () => null
    },
  })
  const wrapper = mount(Host)
  mountedWrappers.push(wrapper)
  return { ...exposed.value!, wrapper }
}

function lastChannel(): MockBroadcastChannel | null {
  const list = MockBroadcastChannel.instances.filter(i => i.name === 'xuanxue:self-profile')
  return list.length ? list[list.length - 1] : null
}

describe('useSelfProfileDraft 真实桥接集成（useSelfProfile 真实实例）', () => {
  beforeEach(() => {
    // 每例清理全局替身后，重新注册本例的 fetch 入口。
    vi.stubGlobal('$fetch', mockFetch)
    stateMap.clear()
    mockFetch.mockReset()
    markSessionExpired.mockReset()
    MockBroadcastChannel.instances = []
    globalThis.BroadcastChannel = MockBroadcastChannel as any
    setGuest()
  })

  afterEach(() => {
    // 即使断言失败也卸载全部宿主（触发 composable onBeforeUnmount），再恢复环境。
    for (const w of mountedWrappers.splice(0)) w.unmount()
    globalThis.BroadcastChannel = realBroadcastChannel
    authStatus.value = 'guest'
    currentAccount.value = null
    vi.unstubAllGlobals()
  })

  it('带入真实建立来源；summary 新版本先清 origin，verify 有界失败且草稿/结果清除', async () => {
    setAuthenticated()
    // 首次 loadProfile（requestImport）返回档案 v1
    mockFetch.mockResolvedValue({ profile: sampleProfile })
    const host = mountDraftHost()
    await flush()
    // 点击带入：读取档案并建立候选
    await host.bridge.requestImport()
    await flush()
    // 确认带入 → 来源建立
    host.bridge.confirmImport()
    expect(host.bridge.origin.value).toEqual({ accountId: 1, profileId: 'p1', version: 1 })
    expect(host.draft).toEqual({ year: '2000', month: '1', day: '1' })

    // 手改草稿（保留 origin 元数据）
    host.draft.year = '1995'
    host.bridge.onManualEdit()
    host.result.value = { marker: 'old-result' }

    // 计算前校验：fetch summary 返回新版本 v2（延迟控制顺序）
    const summaryDefer = deferred<any>()
    mockFetch.mockReturnValueOnce(summaryDefer.promise)
    const verifyPromise = host.bridge.verifyBeforeCompute()
    // summary watcher 先观察到 v2 → 版本变化 → invalidateSource 清 origin 与草稿
    summaryDefer.resolve({ summary: sampleSummary(2) })
    const verify = await verifyPromise
    await flush(4)
    // origin 已被 watcher 清空；verify 返回有界失败而非异常
    expect(host.bridge.origin.value).toBeNull()
    expect(verify.ok).toBe(false)
    if (!verify.ok) expect(['stale_version', 'no_source']).toContain(verify.reason)
    // 旧草稿与结果被原子失效清除
    expect(host.draft).toEqual({ year: '', month: '', day: '' })
    expect(host.result.value).toBeNull()
  })

  it('同页保存：本地回调在 summary watcher 前更新 origin，草稿/结果不被误清', async () => {
    setAuthenticated()
    mockFetch.mockResolvedValue({ profile: sampleProfile })
    const host = mountDraftHost()
    await flush()
    await host.bridge.requestImport()
    await flush()
    host.bridge.confirmImport()
    expect(host.draft).toEqual({ year: '2000', month: '1', day: '1' })

    // 手改草稿为 1995-05-20（来源仍为档案 v1）
    host.draft.year = '1995'
    host.draft.month = '5'
    host.draft.day = '20'
    host.bridge.onManualEdit()

    // api.save 成功返回 v2（服务端确认同页写入）
    // 保存成功必须返回已保存的完整日期，不能用删除日期的响应冒充成功保存。
    const savedProfile: SelfProfile = {
      ...sampleProfile,
      version: 2,
      birthDate: {
        ...sampleProfile.birthDate!,
        raw: { calendar: 'solar', year: 1995, month: 5, day: 20, isLeapMonth: null },
        solarDate: '1995-05-20',
      },
    }
    const currentResult = { marker: 'current-result' }
    host.result.value = currentResult
    mockFetch.mockResolvedValue({ profile: savedProfile })
    const saved = await host.api.save({
      expected: { profileId: 'p1', version: 1 },
      birthDate: { calendar: 'solar', year: 1995, month: 5, day: 20, isLeapMonth: null },
      consentPolicyVersion: '2026-09-09',
    })
    expect(saved?.version).toBe(2)
    await flush(4)
    // onLocalWriteCommitted 在 summary 发布前更新了 origin → summary watcher 不误清
    expect(host.bridge.origin.value).toEqual({ accountId: 1, profileId: 'p1', version: 2 })
    expect(host.draft).toEqual({ year: '1995', month: '5', day: '20' })
    expect(host.result.value).toEqual(currentResult)
  })

  it.each([500, 409])('保存失败（HTTP %s）不假同步来源，草稿保留但禁止使用', async statusCode => {
    setAuthenticated()
    mockFetch.mockResolvedValue({ profile: sampleProfile })
    const host = mountDraftHost()
    await flush()
    await host.bridge.requestImport()
    await flush()
    host.bridge.confirmImport()

    // 保存失败
    mockFetch.mockRejectedValue(Object.assign(new Error('save failed'), { statusCode }))
    const saved = await host.api.save({
      expected: { profileId: 'p1', version: 1 },
      birthDate: { calendar: 'solar', year: 2000, month: 1, day: 1, isLeapMonth: null },
      consentPolicyVersion: '2026-09-09',
    })
    expect(saved).toBeNull()
    expect(host.api.conflict.value).toBe(statusCode === 409)
    await flush(4)
    // 来源保持 v1（不假同步）；草稿保留（网络失败不清草稿）
    expect(host.bridge.origin.value).toEqual({ accountId: 1, profileId: 'p1', version: 1 })
    expect(host.draft).toEqual({ year: '2000', month: '1', day: '1' })
    // 网络失败时 verify 阻止使用（有界 network 失败）
    mockFetch.mockRejectedValue(Object.assign(new Error('net'), { statusCode: 500 }))
    const verify = await host.bridge.verifyBeforeCompute()
    expect(verify.ok).toBe(false)
  })

  it('外部 saved/delete/usage 事件仍真实失效来源并清草稿', async () => {
    setAuthenticated()
    mockFetch.mockResolvedValue({ profile: sampleProfile })
    const host = mountDraftHost()
    await flush()
    await host.bridge.requestImport()
    await flush()
    host.bridge.confirmImport()
    expect(host.bridge.origin.value).not.toBeNull()

    // 外部另一实例广播 usage-changed（撤回使用）
    const sender = new MockBroadcastChannel('xuanxue:self-profile')
    sender.postMessage({
      type: 'self-profile-changed',
      accountId: 1,
      profileId: 'p1',
      version: 2,
      action: 'usage-changed',
    })
    await flush(4)
    // 来源失效 + 草稿清除
    expect(host.bridge.origin.value).toBeNull()
    expect(host.draft).toEqual({ year: '', month: '', day: '' })
    // 外部 saved 版本变化同样失效
    mockFetch.mockResolvedValue({ profile: sampleProfile })
    await host.bridge.requestImport()
    await flush()
    host.bridge.confirmImport()
    sender.postMessage({
      type: 'self-profile-changed',
      accountId: 1,
      profileId: 'p1',
      version: 3,
      action: 'saved',
    })
    await flush(4)
    expect(host.bridge.origin.value).toBeNull()
    expect(host.draft).toEqual({ year: '', month: '', day: '' })
    sender.close()
  })

  it('A→B 页面清理顺序（clearData）后 B 频道可收其他实例消息并清 B 来源', async () => {
    setAuthenticated(1)
    mockFetch.mockResolvedValue({ profile: sampleProfile })
    const host = mountDraftHost()
    await flush()
    await host.bridge.requestImport()
    await flush()
    host.bridge.confirmImport()
    expect(host.bridge.origin.value).not.toBeNull()

    // 先让 API 观察到 A→B，再走页面草稿清理；不能误关 B 已绑定的频道。
    setAuthenticated(2)
    await flush(4)
    host.bridge.clear()
    host.draft.year = ''
    host.draft.month = ''
    host.draft.day = ''
    expect(host.bridge.origin.value).toBeNull()
    // 频道仍在（clearData 不动频道）
    expect(lastChannel()).not.toBeNull()

    // 页面清理后继续读取 B 的档案，频道应仍然可用。
    mockFetch.mockResolvedValue({ profile: { ...sampleProfile, id: 'p2', accountId: 2 } })
    await host.bridge.requestImport()
    await flush()
    host.bridge.confirmImport()
    expect(host.bridge.origin.value).toEqual({ accountId: 2, profileId: 'p2', version: 1 })

    // 另一实例对 B 账号广播 profile-deleted → B 来源清除
    const sender = new MockBroadcastChannel('xuanxue:self-profile')
    sender.postMessage({
      type: 'self-profile-changed',
      accountId: 2,
      profileId: 'p2',
      version: 2,
      action: 'profile-deleted',
    })
    await flush(4)
    expect(host.bridge.origin.value).toBeNull()
    expect(host.draft).toEqual({ year: '', month: '', day: '' })
    sender.close()
  })
})
