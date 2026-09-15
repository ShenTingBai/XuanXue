import { computed, ref, watch } from 'vue'
import type { BaziRawDate } from '~/types/bazi'
import { useSelfProfile, type SelfProfileEvent } from './useSelfProfile'

/**
 * 八字页「从本人档案带入出生日期」（消歧记录 Q2 已确认纳入）。
 *
 * 与 R3 生肖页桥接的差别：档案模型换成 R4 的 `SelfProfile`（字段组为规范化公历日期），
 * 但边界完全相同（交付规范 §7、数据规范 §8.3/§13）：
 * - 只在明确点击后才读取完整档案；档案无日期或已撤回授权时不提供入口；
 * - 带入只是把日期**复制**到当次草稿：不自动计算、不自动保存、不复制档案其他字段；
 * - 草稿已有不同日期时，替换前必须显式确认（展示当前值与拟带入值）；
 * - 记录来源（档案/手动）：用户手动修改后来源改为手动；
 * - 支持撤销本次带入，恢复带入前的手动值与来源；
 * - 档案被删除或授权停止后，入口失效并提示，已带入的日期不得继续当作可用依据。
 *
 * @author LiXinwen
 */

export interface UseBaziProfileImportOptions {
  /** 当前草稿的日期字段（用于比对与替换）。 */
  getRaw: () => BaziRawDate | null
  /** 用档案日期替换草稿（不触发计算）。 */
  applyRaw: (raw: BaziRawDate) => void
  /** 标记来源：档案带入或手动。 */
  setOrigin: (origin: 'manual' | 'profile') => void
  /** 清空已带入的草稿与结果（来源失效时）。 */
  clearImported: () => void
}

/** 替换确认候选：绑定账号与档案 id/version，防止旧确认套用到新版本。 */
export interface PendingBaziImport {
  current: BaziRawDate | null
  incoming: BaziRawDate
  accountId: number
  profileId: string
  version: number
}

/** 撤销快照：恢复带入前的日期与来源。 */
interface UndoSnapshot {
  raw: BaziRawDate | null
  origin: 'manual' | 'profile'
}

export function useBaziProfileImport(
  options: UseBaziProfileImportOptions,
  sharedApi?: ReturnType<typeof useSelfProfile>,
) {
  const profileApi = sharedApi ?? useSelfProfile()

  const pending = ref<PendingBaziImport | null>(null)
  const undo = ref<UndoSnapshot | null>(null)
  const loading = ref(false)
  const error = ref('')
  const source = ref<'manual' | 'profile'>('manual')
  const originVersion = ref<{ profileId: string; version: number } | null>(null)

  /** 是否显示带入入口：已登录、档案存在、有日期且未撤回授权。 */
  const canImport = computed(() => {
    const summary = profileApi.summary.value
    if (!summary) return false
    return summary.exists && summary.hasBirthDate && summary.canImport
  })
  const canUndo = computed(() => undo.value !== null)

  function describeRaw(raw: BaziRawDate | null): string {
    if (!raw) return '尚未填写'
    if (raw.calendar === 'solar')
      return `公历 ${raw.year}-${String(raw.month).padStart(2, '0')}-${String(raw.day).padStart(2, '0')}`
    return `农历 ${raw.year} 年${raw.isLeapMonth ? '闰' : ''}${raw.month} 月${raw.day} 日`
  }

  /** 档案日期（规范化公历）→ 草稿公历表达。 */
  function toRaw(solarDate: string): BaziRawDate {
    return {
      calendar: 'solar',
      year: Number(solarDate.slice(0, 4)),
      month: Number(solarDate.slice(5, 7)),
      day: Number(solarDate.slice(8, 10)),
      isLeapMonth: null,
    }
  }

  function sameRaw(a: BaziRawDate | null, b: BaziRawDate | null): boolean {
    if (!a || !b) return a === b
    return (
      a.calendar === b.calendar &&
      a.year === b.year &&
      a.month === b.month &&
      a.day === b.day &&
      (a.calendar === 'lunar' && b.calendar === 'lunar' ? a.isLeapMonth === b.isLeapMonth : true)
    )
  }

  /** 明确点击才读取完整档案；成功且有可用日期才建立替换候选或直接带入。 */
  async function requestImport(): Promise<void> {
    if (loading.value) return
    if (!canImport.value) {
      // 入口不可用（无档案 / 无日期 / 已撤回授权）：不读取完整档案，也不建立候选。
      pending.value = null
      return
    }
    if (!profileApi.summary.value) {
      await profileApi.loadSummary()
    }
    const draftAtRequest = options.getRaw()
    loading.value = true
    error.value = ''
    const result = await profileApi.loadProfile(true)
    loading.value = false
    if (result.status !== 'success') {
      pending.value = null
      if (result.status === 'unauthenticated') error.value = '登录状态已失效，请重新登录后再带入。'
      else if (result.status === 'failure') error.value = '无法读取本人档案，请稍后重试。'
      return
    }
    const profile = result.profile
    if (!profile?.birthDate || !profile.useAllowed) {
      pending.value = null
      error.value = '本人档案当前没有可带入的出生日期。'
      return
    }
    const incoming = toRaw(profile.birthDate.solarDate)
    // 草稿在请求期间被编辑：取消本次带入，不用异步结果覆盖新输入。
    if (!sameRaw(options.getRaw(), draftAtRequest)) {
      pending.value = null
      return
    }
    if (sameRaw(draftAtRequest, incoming)) {
      // 与草稿相同：不建立替换候选，但仍记录来源为档案。
      pending.value = null
      undo.value = { raw: draftAtRequest, origin: source.value }
      source.value = 'profile'
      originVersion.value = { profileId: profile.id, version: profile.version }
      options.setOrigin('profile')
      return
    }
    if (draftAtRequest === null) {
      // 空草稿：直接带入，无需替换确认。
      undo.value = { raw: null, origin: source.value }
      options.applyRaw(incoming)
      source.value = 'profile'
      originVersion.value = { profileId: profile.id, version: profile.version }
      options.setOrigin('profile')
      return
    }
    pending.value = {
      current: draftAtRequest,
      incoming,
      accountId: profile.accountId,
      profileId: profile.id,
      version: profile.version,
    }
  }

  /** 确认替换：候选必须是当前账号与档案版本，且草稿未被再次编辑。 */
  function confirmImport(): boolean {
    const candidate = pending.value
    if (!candidate) return false
    if (!sameRaw(options.getRaw(), candidate.current)) {
      pending.value = null
      return false
    }
    const profile = profileApi.profile.value
    if (
      !profile ||
      profile.id !== candidate.profileId ||
      profile.version !== candidate.version ||
      profile.accountId !== candidate.accountId ||
      !profile.useAllowed ||
      !profile.birthDate
    ) {
      pending.value = null
      error.value = '本人档案已变化，请重新带入。'
      return false
    }
    undo.value = { raw: candidate.current, origin: source.value }
    options.applyRaw(candidate.incoming)
    source.value = 'profile'
    originVersion.value = { profileId: candidate.profileId, version: candidate.version }
    options.setOrigin('profile')
    pending.value = null
    return true
  }

  function cancelImport() {
    pending.value = null
  }

  /** 撤销本次带入：恢复带入前的日期与来源；若此前是空草稿则清空。 */
  function undoImport() {
    const snapshot = undo.value
    if (!snapshot) return
    if (snapshot.raw === null) {
      options.clearImported()
    } else {
      options.applyRaw(snapshot.raw)
    }
    source.value = snapshot.origin
    options.setOrigin(snapshot.origin)
    originVersion.value = null
    undo.value = null
  }

  /** 用户手改：来源标手动，但仍允许撤销该次带入（撤销值来自本地快照，不回服务器倒推）。 */
  function onManualEdit() {
    if (source.value === 'profile') {
      source.value = 'manual'
      options.setOrigin('manual')
    }
  }

  /** 来源失效（档案删除、日期删除、撤回授权、版本变化）：清掉带入的草稿与来源。 */
  function invalidateSource() {
    pending.value = null
    undo.value = null
    source.value = 'manual'
    originVersion.value = null
    options.setOrigin('manual')
    options.clearImported()
  }

  function onRemoteEvent(event: SelfProfileEvent) {
    const depends =
      originVersion.value?.profileId === event.profileId ||
      pending.value?.profileId === event.profileId
    if (!depends) return
    if (event.action === 'saved' && originVersion.value?.version === event.version) return
    invalidateSource()
    error.value = '本人档案已变更，已带入的日期不再作为依据，请重新带入。'
  }

  // 摘要变化（含跨设备/跨标签）驱动失效：档案被删除或撤回授权后入口自动失效。
  watch(
    () => profileApi.summary.value,
    (summary, previous) => {
      if (!originVersion.value) return
      if (!summary) return
      // 只在摘要确实变化时处理：四个字段任一变化都要复核，不能只看版本号
      // （撤回授权与删除日期都可能与版本变化不同步到达）。
      const unchanged =
        previous !== null &&
        previous !== undefined &&
        previous.profileId === summary.profileId &&
        previous.version === summary.version &&
        previous.exists === summary.exists &&
        previous.hasBirthDate === summary.hasBirthDate &&
        previous.canImport === summary.canImport
      if (unchanged) return
      if (!summary.exists || !summary.hasBirthDate || !summary.canImport) {
        invalidateSource()
        return
      }
      if (summary.profileId !== originVersion.value.profileId) {
        invalidateSource()
        return
      }
      if (summary.version !== originVersion.value.version) invalidateSource()
    },
  )

  /**
   * 只清来源依赖记录、不动草稿字段。
   * 用于「用当前规则重新计算」：新输入来自历史快照，不再受本人档案摘要变化约束。
   */
  function forgetSource() {
    pending.value = null
    undo.value = null
    originVersion.value = null
    source.value = 'manual'
    error.value = ''
  }

  function reset() {
    pending.value = null
    undo.value = null
    loading.value = false
    error.value = ''
    source.value = 'manual'
    originVersion.value = null
  }

  return {
    pending,
    canImport,
    canUndo,
    loading,
    error,
    source,
    describeRaw,
    requestImport,
    confirmImport,
    cancelImport,
    undoImport,
    onManualEdit,
    invalidateSource,
    onRemoteEvent,
    forgetSource,
    reset,
    profileApi,
  }
}
