import { ref, computed, watch } from 'vue'
import type { SelfProfileEvent } from './useSelfProfile'
import { useSelfProfile } from './useSelfProfile'

/**
 * 生肖页「从本人档案带入」草稿管理（R4 收敛 v3）。
 *
 * 只管理当前工具实例的字段复制/来源/撤销，不执行生肖计算或数据库写入。
 * 职责边界：
 * - 无档案或 hasBirthDate=false 或 canImport=false 不显示带入；明确点击时才 GET
 *   最新完整 profile（读取有界结果，success 且无档案才允许首次带入），并检查
 *   useAllowed 与 birthDate；
 * - 候选绑定账号、profile id/version；确认前重核草稿、账号与授权，编辑候选后取消
 *   旧候选而不是覆盖新编辑；过期响应（stale）不改变新候选；
 * - 每次带入保留紧邻带入前的完整年月日快照；快照记录原来源账号/id/version 与依赖
 *   关系，撤销恢复快照与原来源，不从服务器倒推；
 * - 手改（onManualEdit）把当前来源标 manual，但仍保留真实来源依赖元数据（origin），
 *   不能用单一 manual 标记掩盖撤回约束；纯手动且从未依赖档案的草稿不强制联网；
 * - 原子失效（invalidateSource）：来源被撤回/删除/版本变化时，清受影响页面日期、
 *   结果、候选、撤销缓存与来源元数据，不能仅 source=manual 保留旧日期；
 *   通知（profile-deleted/usage/birth-date-deleted/saved）与成功 summary 差异共用它；
 * - verifyBeforeCompute 使用本次成功 summary（而非共享旧缓存）核对来源版本与授权；
 *   网络失败保留草稿但禁止依赖资料计算。
 *
 * @author LiXinwen
 */

export type DraftSource = 'manual' | 'self_profile'

/** 当前草稿的真实来源元数据：即使手改标 manual 仍保留，撤回约束据此生效。 */
export interface DraftOrigin {
  accountId: number
  profileId: string
  version: number
}

/** 需要页面提供的草稿读写回调（不直接持有页面表单 DOM）。 */
export interface DraftCallbacks {
  getDraft: () => { year: string; month: string; day: string }
  /** 用给定值替换当前草稿字段（不触发计算）。 */
  applyDraft: (values: { year: string; month: string; day: string }) => void
  /** 标记结果 stale（输入变化时）。 */
  markResultStale: () => void
  /** 清除结果（带入/替换/撤销/失效时）。 */
  clearResult: () => void
  /** 原子失效：清空来自档案的草稿字段（避免残留已撤回数据）。 */
  clearImportedDraft: () => void
}

/** 带入替换候选：绑定账号与来源档案 id/version，防止旧确认适用新版本。 */
export interface ImportReplacement {
  current: { year: string; month: string; day: string }
  incoming: { year: string; month: string; day: string }
  accountId: number
  profileId: string
  version: number
}

/** 撤销快照：保留原来源账号/id/version 与依赖关系（不只 manual 标记）。 */
export interface UndoSnapshot {
  values: { year: string; month: string; day: string }
  sourceBefore: DraftSource
  originBefore: DraftOrigin | null
}

export type VerifyBeforeComputeResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'no_profile'
        | 'revoked'
        | 'stale_version'
        | 'network'
        | 'no_source'
        | 'unauthenticated'
    }

export function useSelfProfileDraft(
  callbacks: DraftCallbacks,
  sharedApi?: ReturnType<typeof useSelfProfile>,
) {
  const profileApi = sharedApi ?? useSelfProfile()

  const source = ref<DraftSource>('manual')
  /** 当前草稿的档案来源（手改后保留，用于撤回约束与计算前校验）。 */
  const origin = ref<DraftOrigin | null>(null)
  /** 来源代际：origin 每次写入/清空递增；await 后凭此识别来源是否已变化。 */
  let originRevision = 0
  const pendingReplacement = ref<ImportReplacement | null>(null)
  const undoSnapshot = ref<UndoSnapshot | null>(null)
  const canUndo = computed(() => undoSnapshot.value !== null)
  const loadingProfile = ref(false)

  function sameDraft(
    a: { year: string; month: string; day: string },
    b: { year: string; month: string; day: string },
  ): boolean {
    return a.year === b.year && a.month === b.month && a.day === b.day
  }

  /** 是否依赖指定档案（当前来源、撤销快照或候选任一命中）。 */
  function dependsOn(profileId: string): boolean {
    return (
      origin.value?.profileId === profileId ||
      undoSnapshot.value?.originBefore?.profileId === profileId ||
      pendingReplacement.value?.profileId === profileId
    )
  }

  /** 写入 origin 并递增来源代际（每次变化都使旧异步校验失效）。 */
  function setOrigin(next: DraftOrigin | null): void {
    origin.value = next
    originRevision++
  }

  /**
   * 原子失效：来源被撤回/删除/版本变化时清受影响页面日期、结果、候选、撤销缓存与来源。
   * 不能仅把 source 标 manual 保留旧日期；第二次点击不得按 manual 计算已失效旧日期。
   */
  function invalidateSource(): void {
    pendingReplacement.value = null
    undoSnapshot.value = null
    source.value = 'manual'
    setOrigin(null)
    callbacks.clearImportedDraft()
    callbacks.clearResult()
  }

  /** 请求带入：明确点击才 GET 最新完整 profile；成功且有档案、useAllowed 才建候选。 */
  async function requestImport(): Promise<void> {
    if (loadingProfile.value) return
    const draftAtRequest = callbacks.getDraft()
    loadingProfile.value = true
    // force=true：强制读取最新完整档案，不使用可能过期的缓存。
    const result = await profileApi.loadProfile(true)
    loadingProfile.value = false
    if (result.status !== 'success') {
      // 失败/过期/未认证：不建立候选；不把失败当无档案。
      pendingReplacement.value = null
      return
    }
    const profile = result.profile
    if (!profile?.birthDate || !profile.useAllowed) {
      pendingReplacement.value = null
      return
    }
    const incoming = {
      year:
        String(profile.birthDate.solarDate.slice(0, 4)).replace(/^0+/, '') ||
        profile.birthDate.solarDate.slice(0, 4),
      month: String(Number(profile.birthDate.solarDate.slice(5, 7))),
      day: String(Number(profile.birthDate.solarDate.slice(8, 10))),
    }
    // 草稿被编辑（与请求开始不同）→ 取消旧替换候选，防止异步覆盖。
    const current = callbacks.getDraft()
    if (!sameDraft(current, draftAtRequest)) {
      pendingReplacement.value = null
      return
    }
    if (sameDraft(current, incoming)) {
      pendingReplacement.value = null
      return
    }
    pendingReplacement.value = {
      current,
      incoming,
      accountId: profile.accountId,
      profileId: profile.id,
      version: profile.version,
    }
  }

  /** 确认替换：候选必须仍是当前账号与档案版本；确认时重核草稿。 */
  function confirmImport(): void {
    const pending = pendingReplacement.value
    if (!pending) return
    const current = callbacks.getDraft()
    // 候选打开后草稿被编辑 → 取消旧候选，不覆盖新编辑。
    if (!sameDraft(current, pending.current)) {
      pendingReplacement.value = null
      return
    }
    // 账号/来源档案版本变化 → 旧候选失效。
    const profile = profileApi.profile.value
    if (!profile || profile.id !== pending.profileId || profile.version !== pending.version) {
      pendingReplacement.value = null
      return
    }
    if (profile.accountId !== pending.accountId || !profile.useAllowed || !profile.birthDate) {
      pendingReplacement.value = null
      return
    }
    // 快照记录原来源账号/id/version 与依赖关系。
    undoSnapshot.value = {
      values: { ...current },
      sourceBefore: source.value,
      originBefore: origin.value,
    }
    callbacks.applyDraft(pending.incoming)
    source.value = 'self_profile'
    setOrigin({
      accountId: pending.accountId,
      profileId: pending.profileId,
      version: pending.version,
    })
    pendingReplacement.value = null
    callbacks.clearResult()
  }

  function cancelImport(): void {
    pendingReplacement.value = null
  }

  /** 撤销该次带入：恢复紧邻带入前的快照与原来源元数据；不从服务器倒推。 */
  function undoImport(): void {
    const snapshot = undoSnapshot.value
    if (!snapshot) return
    callbacks.applyDraft(snapshot.values)
    source.value = snapshot.sourceBefore
    setOrigin(snapshot.originBefore)
    undoSnapshot.value = null
    callbacks.clearResult()
  }

  /** 用户手改：来源标 manual，但仍保留真实来源依赖元数据；允许明确撤销该次带入。 */
  function onManualEdit(): void {
    source.value = 'manual'
    callbacks.markResultStale()
  }

  /**
   * 本地写成功来源同步：注册到 profileApi.onLocalWriteCommitted。
   * 该回调在 API 发布新 summary 之前触发——同一微任务内先同步 origin 版本，
   * 使 summary watcher 观察到的已是「已确认版本」，不会把同页保存当外部变更清空草稿。
   * 不再依赖父页面 await 后的补救式 resyncOrigin（那发生在 summary 更新之后）。
   */
  function handleLocalWriteCommitted(committed: {
    accountId: number
    profileId: string
    version: number
  }): void {
    if (origin.value && origin.value.profileId === committed.profileId) {
      setOrigin({
        accountId: committed.accountId,
        profileId: committed.profileId,
        version: committed.version,
      })
    }
  }

  /** 旧接口兼容：仍可被页面调用，但同页保存的主要路径走 handleLocalWriteCommitted。 */
  function resyncOrigin(profileId: string, version: number, accountId: number): void {
    if (origin.value && origin.value.profileId === profileId) {
      setOrigin({ accountId, profileId, version })
    }
  }

  /** 通知处理：saved/delete_birth_date/profile_deleted/usage 及版本变化共用原子失效。 */
  function onRemoteEvent(event: SelfProfileEvent): void {
    if (pendingReplacement.value && pendingReplacement.value.profileId === event.profileId) {
      // 候选绑定旧版本：档案任何变化都使候选失效。
      pendingReplacement.value = null
    }
    const deletingOrRevoking =
      event.action === 'profile-deleted' ||
      event.action === 'usage-changed' ||
      event.action === 'birth-date-deleted'
    const savedVersionChanged =
      event.action === 'saved' &&
      origin.value?.profileId === event.profileId &&
      origin.value.version !== event.version
    if (!deletingOrRevoking && !savedVersionChanged) {
      // 无关档案或同版本 saved：不影响依赖该档案的候选/撤销。
      return
    }
    if (origin.value?.profileId === event.profileId) {
      // 来源被撤回/删除/版本变化：原子失效（含页面日期/结果/候选/撤销/来源）。
      invalidateSource()
      return
    }
    // 撤销快照或候选依赖该档案但当前草稿不再依赖：只清快照/候选，防止撤销复活。
    undoSnapshot.value = null
    pendingReplacement.value = null
  }

  // 本地写成功来源同步：在 summary 发布前完成版本关联（见 handleLocalWriteCommitted）。
  profileApi.onLocalWriteCommitted.add(handleLocalWriteCommitted)

  /**
   * 计算前校验：来源依赖档案时使用「本次成功 summary」核对来源版本与授权。
   * 开头捕获不可变 origin 快照与来源代际；await 期间来源可能被 summary watcher/通知/
   * 退出清空，续体先核对来源仍存在且代际未变，再比较本次 summary——避免解引用空 origin。
   * 失败/过期/撤回/版本变化时阻止计算；网络失败保留草稿但禁止依赖资料计算。
   */
  async function verifyBeforeCompute(): Promise<VerifyBeforeComputeResult> {
    const originSnapshot = origin.value
    if (!originSnapshot) {
      // 纯手动且从未依赖档案的草稿：不强制联网，允许本地计算。
      return { ok: true }
    }
    const revisionAtStart = originRevision
    const result = await profileApi.loadSummary(true)
    // await 期间来源被清空或替换：不得用旧来源继续比较。
    if (!origin.value || originRevision !== revisionAtStart) {
      return { ok: false, reason: 'no_source' }
    }
    if (result.status === 'failure') {
      return { ok: false, reason: 'network' }
    }
    if (result.status === 'stale') {
      // 本次读取已被更新取代：不能作为授权依据。
      return { ok: false, reason: 'network' }
    }
    if (result.status === 'unauthenticated') {
      return { ok: false, reason: 'unauthenticated' }
    }
    const s = result.summary
    if (!s || !s.exists || !s.hasBirthDate || !s.canImport) {
      return { ok: false, reason: 'revoked' }
    }
    if (s.profileId !== originSnapshot.profileId) {
      return { ok: false, reason: 'no_profile' }
    }
    if (s.version !== originSnapshot.version) {
      return { ok: false, reason: 'stale_version' }
    }
    return { ok: true }
  }

  // 成功 summary 差异（如 focus/visibility 刷新）驱动原子失效：
  // 本账号档案被删除/撤回/版本变化时，草稿不得继续按旧来源使用。
  watch(
    () => profileApi.summary.value,
    (s, previous) => {
      if (!origin.value) return
      if (!s) return
      if (previous && previous.profileId === s.profileId && previous.version === s.version) {
        // 摘要未变化：不重复失效。
        return
      }
      if (!s.exists || !s.hasBirthDate || !s.canImport) {
        invalidateSource()
        return
      }
      if (s.profileId !== origin.value.profileId) {
        invalidateSource()
        return
      }
      if (s.version !== origin.value.version) {
        invalidateSource()
      }
    },
  )

  /** 清理全部（退出/换账号/卸载时由页面调用）。只清数据不动频道：
   *  频道归属由 useSelfProfile 账号生命周期独占管理，避免 A→B 后页面清理误关 B 频道。 */
  function clear(): void {
    pendingReplacement.value = null
    undoSnapshot.value = null
    source.value = 'manual'
    setOrigin(null)
    loadingProfile.value = false
    profileApi.clearData()
  }

  return {
    source,
    origin,
    pendingReplacement,
    canUndo,
    loadingProfile,
    requestImport,
    confirmImport,
    cancelImport,
    undoImport,
    onManualEdit,
    resyncOrigin,
    onRemoteEvent,
    verifyBeforeCompute,
    invalidateSource,
    clear,
    profileApi,
  }
}
