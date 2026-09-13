import { ref, shallowRef, watch, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue'
import type { SelfProfile, SelfProfileSummary } from '~/types/self-profile'
import type { RawBirthDate } from '~/types/self-profile'
import { useAuth } from './useAuth'

/**
 * 本人档案 API 组合式函数（R4 收敛 v3）。
 *
 * 隐私与代际边界：
 * - 出生资料只放每次调用私有 ref，不放 useState、模块变量、localStorage、
 *   sessionStorage 或 URL；
 * - 工具进入时仅获取无日期 summary；独立档案页访问时客户端明确 GET 完整档案；
 * - 认证 restoring 时不请求；guest 不报无档案错误；
 * - 每个请求捕获账号 id、请求序号与代际；账号切换/登出/卸载使代际递增，
 *   晚到成功、失败与 401 都不能作用于新账号会话；
 * - 摘要与完整档案读取返回有界结果（success/failure/unauthenticated/stale），
 *   区分「成功但无档案」与「读取失败」，调用方不得把失败当无档案；
 * - 写入开始时使在途读取过期，旧 GET 不能覆盖写入后的新状态；
 * - loading 反映真实未完成操作数，不被过期请求提前清掉；
 * - BroadcastChannel 在客户端挂载/认证生命周期真实绑定与关闭（不在 SSR 创建）；
 *   通知到来先使在途读取代际失效，再清相关缓存并派发元数据，晚到 GET 不能恢复
 *   已撤回/删除资料；不取消已获服务端成功的写结果；
 * - focus/visibility 真实注册；成功刷新摘要后由依赖方（草稿桥接）比较版本/授权。
 *
 * @author LiXinwen
 */

/** 跨 tab 广播消息（只含账号 id、档案 id/version 与动作，不含日期）。 */
export interface SelfProfileEvent {
  type: 'self-profile-changed'
  accountId: number
  profileId: string
  version: number
  action: 'saved' | 'birth-date-deleted' | 'profile-deleted' | 'usage-changed'
}

type SelfProfileAction = SelfProfileEvent['action']

/** 差异确认所需的候选（父组件在保存前冻结 expected 与 RawBirthDate）。 */
export interface ProfileSaveCandidate {
  expected: { profileId: string; version: number } | null
  birthDate: RawBirthDate
  consentPolicyVersion: string
}

/** 摘要读取有界结果：区分成功、失败、会话失效与请求过期。 */
export type SummaryReadResult =
  | { status: 'success'; summary: SelfProfileSummary | null }
  | { status: 'failure' }
  | { status: 'unauthenticated' }
  | { status: 'stale' }

/** 完整档案读取有界结果：success 且 profile=null 表示真实无档案（首次创建前提）。 */
export type ProfileReadResult =
  | { status: 'success'; profile: SelfProfile | null }
  | { status: 'failure' }
  | { status: 'unauthenticated' }
  | { status: 'stale' }

const CHANNEL_NAME = 'xuanxue:self-profile'

function createChannel(): BroadcastChannel | null {
  // SSR/无 BroadcastChannel 环境不创建 Node 频道；失败不破坏功能。
  if (typeof BroadcastChannel === 'undefined') return null
  try {
    return new BroadcastChannel(CHANNEL_NAME)
  } catch {
    return null
  }
}

interface RequestBound {
  seq: number
  generation: number
  accountId: number | null
}

export function useSelfProfile() {
  const { authStatus, currentAccount, markSessionExpired } = useAuth()

  // 无日期的最小摘要（工具进入时使用）；完整档案只由档案页显式读取。
  const summary = ref<SelfProfileSummary | null>(null)
  const profile = shallowRef<SelfProfile | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** 409 版本冲突：保留编辑值，要求用户明确重新读取并重做差异。 */
  const conflict = ref(false)

  // 代际：账号/认证切换或 clear/卸载时递增，使旧请求与旧缓存全部失效。
  let generation = 0
  // 读/写请求分离：写入开始时使在途读取过期，防止旧 GET 覆盖新状态。
  let readSeq = 0
  let writeSeq = 0
  // 写入期间不采用可能早于提交的读取；账号失效时清空，旧 finally 仅移除自身序号。
  const pendingWrites = new Set<number>()
  // 未完成操作集合：每个在途操作持有唯一 token，loading 反映集合非空。
  // 旧代际请求的 finally 只能删除自己的 token，不能扣减新账号的 loading。
  let opTokenSeq = 0
  const pendingOps = new Set<number>()

  // 缓存绑定：缓存所属账号与代际；不一致时读取返回 stale。
  let cacheAccountId: number | null = null
  let cacheGeneration = -1

  // 跨 tab 广播：只传账号 id、档案 id/version 与 action，不含日期。
  let channel: BroadcastChannel | null = null
  // 监听器在 clear 后保留：clear 只清缓存与代际，消费者重新认证后仍能收到通知。
  const onRemoteEvent = new Set<(event: SelfProfileEvent) => void>()

  // 本地写成功回调：在发布新 summary 前触发，供本地依赖（草稿桥接）先同步已确认版本，
  // 避免 summary watcher 把同页保存误判为外部变更而清空草稿。不用于普通远端 saved 放行。
  const onLocalWriteCommitted = new Set<
    (committed: { accountId: number; profileId: string; version: number }) => void
  >()

  function currentAccountId(): number | null {
    return authStatus.value === 'authenticated' ? (currentAccount.value?.id ?? null) : null
  }

  /** 使当前账号与缓存失效；clear、账号切换与卸载共用。 */
  function invalidate() {
    generation++
    readSeq++
    writeSeq++
    pendingWrites.clear()
    cacheAccountId = null
    cacheGeneration = -1
    summary.value = null
    profile.value = null
    error.value = null
    conflict.value = false
    pendingOps.clear()
    loading.value = false
  }

  /** 收到本账号通知：先使在途读取过期，再清相关缓存并派发元数据。 */
  function handleRemoteEvent(data: SelfProfileEvent) {
    // 使旧读取代际失效：晚到 GET 不能把已撤回/删除资料写回缓存。
    readSeq++
    cacheAccountId = null
    cacheGeneration = -1
    if (profile.value && profile.value.id === data.profileId) {
      profile.value = null
    }
    for (const handler of onRemoteEvent) {
      try {
        handler(data)
      } catch {
        // 单个监听器异常不影响其他监听器
      }
    }
  }

  // 客户端挂载/认证生命周期：登录绑定频道，登出/换账号关闭并在下次认证重绑。
  // 不在 SSR 创建 Node 频道（createChannel 在无 BroadcastChannel 时返回 null）。
  const instance = getCurrentInstance()
  function bindChannel() {
    if (channel) return
    if (authStatus.value !== 'authenticated') return
    channel = createChannel()
    if (!channel) return
    channel.onmessage = (ev: MessageEvent<SelfProfileEvent>) => {
      const data = ev.data
      if (!data || data.type !== 'self-profile-changed') return
      // 只处理当前代际账号的事件；旧账号广播不进入新会话。
      if (data.accountId !== currentAccountId()) return
      handleRemoteEvent(data)
    }
  }

  function unbindChannel() {
    if (channel) {
      channel.close()
      channel = null
    }
  }

  if (instance) {
    onMounted(() => {
      if (authStatus.value === 'authenticated') bindChannel()
    })
  }

  // 观察账号/认证变化：authenticated A → authenticated B 或登出都必须失效缓存；
  // 进入已认证（登录/重绑）时绑定频道。
  watch(
    [() => authStatus.value, () => currentAccount.value?.id ?? null],
    ([status, accountId], [oldStatus, oldAccountId]) => {
      const changed = status !== oldStatus || accountId !== oldAccountId
      if (!changed) return
      if (status !== 'authenticated' || accountId === null) {
        invalidate()
        unbindChannel()
        return
      }
      // 进入已认证（含 A→B）：旧账号状态全部失效并绑定频道。
      invalidate()
      bindChannel()
    },
    { immediate: false },
  )

  function isCacheCurrent(): boolean {
    return cacheAccountId === currentAccountId() && cacheGeneration === generation
  }

  function isStale(bound: RequestBound): boolean {
    return (
      bound.seq !== readSeq ||
      bound.generation !== generation ||
      bound.accountId !== currentAccountId()
    )
  }

  function isWriteStale(bound: RequestBound): boolean {
    return (
      bound.seq !== writeSeq ||
      bound.generation !== generation ||
      bound.accountId !== currentAccountId()
    )
  }

  /** 读取请求起点：捕获账号、当前代际与读序号。 */
  function beginRead(): RequestBound {
    return { seq: ++readSeq, generation, accountId: currentAccountId() }
  }

  /** 写入请求起点：捕获账号、当前代际与写序号；同时使在途读取过期。 */
  function beginWrite(): RequestBound {
    readSeq++
    const seq = ++writeSeq
    pendingWrites.add(seq)
    return { seq, generation, accountId: currentAccountId() }
  }

  /** 记录在途操作：返回唯一 token；loading 反映集合非空。 */
  function opStart(): number {
    const token = ++opTokenSeq
    pendingOps.add(token)
    loading.value = true
    return token
  }

  /** 移除自己的 token：旧代际请求只删除自身，不影响新账号的在途计数。 */
  function opEnd(token: number) {
    pendingOps.delete(token)
    if (pendingOps.size === 0) loading.value = false
  }

  /** 发布本地写成功：在更新 summary 之前让本地依赖同步已确认版本。 */
  function notifyLocalWriteCommitted(committed: {
    accountId: number
    profileId: string
    version: number
  }) {
    for (const handler of onLocalWriteCommitted) {
      try {
        handler(committed)
      } catch {
        // 单个监听器异常不影响其他监听器
      }
    }
  }

  function broadcast(event: SelfProfileEvent) {
    if (channel) {
      try {
        channel.postMessage(event)
      } catch {
        // 广播失败不影响本地状态
      }
    }
  }

  function markCache(accountId: number | null) {
    cacheAccountId = accountId
    cacheGeneration = generation
  }

  /** 摘要刷新：返回有界结果。force 用于 focus/visibility 跨设备重取。 */
  async function loadSummary(force = false): Promise<SummaryReadResult> {
    if (pendingWrites.size > 0) return { status: 'stale' }
    if (authStatus.value === 'restoring') return { status: 'stale' }
    if (authStatus.value === 'guest') {
      summary.value = null
      return { status: 'unauthenticated' }
    }
    if (!force && summary.value && isCacheCurrent()) {
      return { status: 'success', summary: summary.value }
    }
    const bound = beginRead()
    const token = opStart()
    error.value = null
    // 记录发起时的写序号：期间若有写入，摘要结果不得覆盖更新的写入状态。
    const writeSeqAtStart = writeSeq
    try {
      const res = await $fetch<{ summary: SelfProfileSummary }>('/api/self-profile/summary')
      if (isStale(bound)) return { status: 'stale' }
      // 写入先于本次摘要完成：丢弃本次摘要，避免旧数据覆盖新写入结果。
      if (writeSeq !== writeSeqAtStart) return { status: 'stale' }
      summary.value = res.summary
      markCache(bound.accountId)
      return { status: 'success', summary: res.summary }
    } catch (e: unknown) {
      if (isStale(bound)) return { status: 'stale' }
      const statusCode = (e as { statusCode?: number })?.statusCode
      if (statusCode === 401) {
        markSessionExpired()
        return { status: 'unauthenticated' }
      }
      error.value = '无法获取档案摘要，请稍后重试'
      return { status: 'failure' }
    } finally {
      opEnd(token)
    }
  }

  /** 明确动作才读取完整档案（如进入档案页或工具点击「带入」）。 */
  async function loadProfile(force = false): Promise<ProfileReadResult> {
    if (pendingWrites.size > 0) return { status: 'stale' }
    if (authStatus.value === 'restoring') return { status: 'stale' }
    if (authStatus.value === 'guest') {
      profile.value = null
      return { status: 'unauthenticated' }
    }
    if (!force && profile.value && isCacheCurrent()) {
      return { status: 'success', profile: profile.value }
    }
    const bound = beginRead()
    const token = opStart()
    error.value = null
    const writeSeqAtStart = writeSeq
    try {
      const res = await $fetch<{ profile: SelfProfile | null }>('/api/self-profile')
      if (isStale(bound)) return { status: 'stale' }
      // 期间有写入完成：本次读取已过期，不能覆盖新状态。
      if (writeSeq !== writeSeqAtStart) return { status: 'stale' }
      profile.value = res.profile
      markCache(bound.accountId)
      return { status: 'success', profile: res.profile }
    } catch (e: unknown) {
      if (isStale(bound)) return { status: 'stale' }
      const statusCode = (e as { statusCode?: number })?.statusCode
      if (statusCode === 401) {
        markSessionExpired()
        return { status: 'unauthenticated' }
      }
      error.value = '无法获取本人档案，请稍后重试'
      return { status: 'failure' }
    } finally {
      opEnd(token)
    }
  }

  /**
   * 保存（首次或更新）。只在父组件差异确认后调用。
   * 409 保留编辑值并置 conflict；禁止用新 version 自动重试旧确认。
   */
  async function save(candidate: ProfileSaveCandidate): Promise<SelfProfile | null> {
    if (authStatus.value !== 'authenticated') return null
    const bound = beginWrite()
    const token = opStart()
    error.value = null
    conflict.value = false
    try {
      const res = await $fetch<{ profile: SelfProfile }>('/api/self-profile', {
        method: 'PUT',
        body: {
          expected: candidate.expected,
          birthDate: candidate.birthDate,
          consent: { accepted: true, policyVersion: candidate.consentPolicyVersion },
        },
      })
      if (isWriteStale(bound)) return null
      // 本地写成功回调先于 summary 更新：本地依赖（草稿桥接）同步已确认版本，
      // 避免 summary watcher 把同页保存当外部变更清空草稿。
      notifyLocalWriteCommitted({
        accountId: bound.accountId as number,
        profileId: res.profile.id,
        version: res.profile.version,
      })
      profile.value = res.profile
      summary.value = {
        exists: true,
        profileId: res.profile.id,
        version: res.profile.version,
        hasBirthDate: res.profile.birthDate != null,
        canImport: res.profile.birthDate != null && res.profile.useAllowed,
      }
      markCache(bound.accountId)
      broadcast({
        type: 'self-profile-changed',
        accountId: bound.accountId as number,
        profileId: res.profile.id,
        version: res.profile.version,
        action: 'saved',
      })
      return res.profile
    } catch (e: unknown) {
      if (isWriteStale(bound)) return null
      const statusCode = (e as { statusCode?: number })?.statusCode
      if (statusCode === 401) {
        markSessionExpired()
        return null
      }
      if (statusCode === 409) {
        conflict.value = true
        return null
      }
      error.value = '保存失败，请稍后再试'
      return null
    } finally {
      pendingWrites.delete(bound.seq)
      opEnd(token)
    }
  }

  /** 删除出生日期字段组（保留档案）。 */
  async function deleteBirthDate(expected: {
    profileId: string
    version: number
  }): Promise<SelfProfile | null> {
    if (authStatus.value !== 'authenticated') return null
    const bound = beginWrite()
    const token = opStart()
    error.value = null
    conflict.value = false
    try {
      const res = await $fetch<{ profile: SelfProfile }>('/api/self-profile/birth-date', {
        method: 'DELETE',
        body: { expected },
      })
      if (isWriteStale(bound)) return null
      // 本地写成功回调先于 summary 更新（见 save）。
      notifyLocalWriteCommitted({
        accountId: bound.accountId as number,
        profileId: res.profile.id,
        version: res.profile.version,
      })
      profile.value = res.profile
      summary.value = {
        exists: true,
        profileId: res.profile.id,
        version: res.profile.version,
        hasBirthDate: false,
        canImport: false,
      }
      markCache(bound.accountId)
      broadcast({
        type: 'self-profile-changed',
        accountId: bound.accountId as number,
        profileId: res.profile.id,
        version: res.profile.version,
        action: 'birth-date-deleted',
      })
      return res.profile
    } catch (e: unknown) {
      if (isWriteStale(bound)) return null
      const statusCode = (e as { statusCode?: number })?.statusCode
      if (statusCode === 401) {
        markSessionExpired()
        return null
      }
      if (statusCode === 409) {
        conflict.value = true
        return null
      }
      error.value = '删除失败，请稍后再试'
      return null
    } finally {
      pendingWrites.delete(bound.seq)
      opEnd(token)
    }
  }

  /** 删除整份档案（保留账号/会话）。 */
  async function deleteProfile(expected: { profileId: string; version: number }): Promise<boolean> {
    if (authStatus.value !== 'authenticated') return false
    const bound = beginWrite()
    const token = opStart()
    error.value = null
    conflict.value = false
    try {
      await $fetch<{ success: true }>('/api/self-profile', {
        method: 'DELETE',
        body: { expected },
      })
      if (isWriteStale(bound)) return false
      // 本地写成功回调先于 summary 更新（见 save）。
      notifyLocalWriteCommitted({
        accountId: bound.accountId as number,
        profileId: expected.profileId,
        version: expected.version,
      })
      profile.value = null
      summary.value = {
        exists: false,
        profileId: null,
        version: null,
        hasBirthDate: false,
        canImport: false,
      }
      markCache(bound.accountId)
      broadcast({
        type: 'self-profile-changed',
        accountId: bound.accountId as number,
        profileId: expected.profileId,
        version: expected.version,
        action: 'profile-deleted',
      })
      return true
    } catch (e: unknown) {
      if (isWriteStale(bound)) return false
      const statusCode = (e as { statusCode?: number })?.statusCode
      if (statusCode === 401) {
        markSessionExpired()
        return false
      }
      if (statusCode === 409) {
        conflict.value = true
        return false
      }
      error.value = '删除失败，请稍后再试'
      return false
    } finally {
      pendingWrites.delete(bound.seq)
      opEnd(token)
    }
  }

  /** 使用授权变更：停止/恢复档案带入（删除与撤回是不同操作）。 */
  async function setUsage(
    expected: { profileId: string; version: number },
    allowed: boolean,
    consentVersion?: string,
  ): Promise<SelfProfile | null> {
    if (authStatus.value !== 'authenticated') return null
    const bound = beginWrite()
    const token = opStart()
    error.value = null
    conflict.value = false
    try {
      const res = await $fetch<{ profile: SelfProfile }>('/api/self-profile/usage', {
        method: 'PATCH',
        body: {
          expected,
          allowed,
          ...(allowed ? { consentVersion } : {}),
        },
      })
      if (isWriteStale(bound)) return null
      // 本地写成功回调先于 summary 更新（见 save）。
      notifyLocalWriteCommitted({
        accountId: bound.accountId as number,
        profileId: res.profile.id,
        version: res.profile.version,
      })
      profile.value = res.profile
      summary.value = {
        exists: true,
        profileId: res.profile.id,
        version: res.profile.version,
        hasBirthDate: res.profile.birthDate != null,
        canImport: res.profile.birthDate != null && res.profile.useAllowed,
      }
      markCache(bound.accountId)
      broadcast({
        type: 'self-profile-changed',
        accountId: bound.accountId as number,
        profileId: res.profile.id,
        version: res.profile.version,
        action: 'usage-changed',
      })
      return res.profile
    } catch (e: unknown) {
      if (isWriteStale(bound)) return null
      const statusCode = (e as { statusCode?: number })?.statusCode
      if (statusCode === 401) {
        markSessionExpired()
        return null
      }
      if (statusCode === 409) {
        conflict.value = true
        return null
      }
      error.value = '操作失败，请稍后再试'
      return null
    } finally {
      pendingWrites.delete(bound.seq)
      opEnd(token)
    }
  }

  /** 完整重置（退出/换账号/卸载时调用）：失效数据并关闭频道。 */
  function clear() {
    invalidate()
    unbindChannel()
    // 监听器集合保留：clear 后重新认证仍能接收通知。
  }

  /** 仅清数据与缓存、不动频道：供页面个人状态清理使用，避免误关新账号已绑定频道。 */
  function clearData() {
    invalidate()
  }

  // focus/visibility 兜底：真实注册与清理（不把直接 loadSummary(true) 当 focus 证据）。
  let focusRefreshHandler: (() => void) | null = null
  let visibilityHandler: (() => void) | null = null

  /** 注册 focus/visibility 刷新兜底（跨设备变更时重新取无日期 summary）。 */
  function registerFocusRefresh() {
    if (focusRefreshHandler || visibilityHandler) return
    focusRefreshHandler = () => {
      if (authStatus.value === 'authenticated') {
        void loadSummary(true)
      }
    }
    visibilityHandler = () => {
      if (document.visibilityState === 'visible' && authStatus.value === 'authenticated') {
        void loadSummary(true)
      }
    }
    if (typeof window !== 'undefined') window.addEventListener('focus', focusRefreshHandler)
    if (typeof document !== 'undefined')
      document.addEventListener('visibilitychange', visibilityHandler)
  }

  /** 移除 focus/visibility 刷新监听。 */
  function unregisterFocusRefresh() {
    if (focusRefreshHandler && typeof window !== 'undefined') {
      window.removeEventListener('focus', focusRefreshHandler)
    }
    if (visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
    focusRefreshHandler = null
    visibilityHandler = null
  }

  // 卸载清理：使所有旧请求无法更新敏感 ref，关闭频道、移除焦点监听并清空监听器。
  onBeforeUnmount(() => {
    invalidate()
    unbindChannel()
    unregisterFocusRefresh()
    onRemoteEvent.clear()
  })

  return {
    summary,
    profile,
    loading,
    error,
    conflict,
    loadSummary,
    loadProfile,
    save,
    deleteBirthDate,
    deleteProfile,
    setUsage,
    onRemoteEvent,
    onLocalWriteCommitted,
    bindChannel,
    clear,
    clearData,
    registerFocusRefresh,
    unregisterFocusRefresh,
  }
}
