import { computed, ref, shallowRef } from 'vue'
import { BAZI_TOOL_ID } from '~/constants/bazi-rules'
import type {
  BaziInputOrigin,
  BaziRawDate,
  ResultSnapshotRecord,
  ResultSnapshotSummary,
  SaveBaziSnapshotRequest,
} from '~/types/bazi'
import { resultDigest } from '~/utils/bazi/engine'
import type { BaziGeneration } from './useBaziDraft'
import { useAuth } from './useAuth'

/**
 * 八字结果历史交互（页面 Ⅵ 段）。
 *
 * 边界（交付规范 §7.3–§7.5、治理规范 §11.6、数据规范 §15.2）：
 * - 保存是显式动作：只有「保存摘要展示 + 用户再次确认」之后才提交；认证成功本身不触发保存；
 * - stale 时拒绝保存（输入已改，结果与输入不再对应）；
 * - 服务端用同一领域规则复算并核对；不一致（409 RESULT_MISMATCH）时**保留页面结果**，
 *   只标记「未保存」并可重试，绝不写入；
 * - 幂等：同一次生成持有稳定 `resultId`，重复保存只产生一条记录（`created=false` 表示已存在）；
 * - 历史列表只含安全摘要（不含精确出生日期与结果正文）；打开历史只读快照、不静默重算；
 * - 「用当前规则重新计算」只把旧快照输入复制成当次草稿并生成**未保存**结果，原记录不变；
 * - 删除单条失败不提前从界面移除；清空必须带当前条数确认（数量变化由服务端 409 拒绝）；
 * - 不缓存响应（响应本身 `no-store`），401 时清空本地状态并引导页内认证。
 *
 * @author LiXinwen
 */

/** 保存结果（有界联合：调用方不需要解析异常）。 */
export type SaveOutcome =
  | { status: 'saved'; created: boolean; savedAt: string }
  | { status: 'unauthenticated' }
  | { status: 'stale' }
  | { status: 'mismatch' }
  | { status: 'failed' }

export interface UseResultHistoryOptions {
  /** 取当次生成产物（无生成结果时返回 null）。 */
  getGeneration: () => BaziGeneration | null
  /** 当前输入来源（手填或档案带入）。 */
  getOrigin: () => BaziInputOrigin
  /** 结果是否已 stale（stale 拒绝保存）。 */
  isStale: () => boolean
}

export function useResultHistory(options: UseResultHistoryOptions) {
  const { authStatus, markSessionExpired } = useAuth()

  const items = ref<ResultSnapshotSummary[]>([])
  const listLoaded = ref(false)
  const listLoading = ref(false)
  const listError = ref('')

  const saving = ref(false)
  const saveError = ref('')
  const mismatch = ref(false)
  /** 已成功保存的生成标识：同一次生成保存后不再重复提交（界面显示「已保存」）。 */
  const savedResultId = ref('')
  const savedAt = ref('')

  const selected = shallowRef<ResultSnapshotRecord | null>(null)
  const selectedLoading = ref(false)
  const selectedError = ref('')

  const clearPending = ref(false)
  const mutating = ref(false)
  const mutateError = ref('')

  const isAuthenticated = computed(() => authStatus.value === 'authenticated')
  const saved = computed(() => {
    const generation = options.getGeneration()
    return generation !== null && savedResultId.value === generation.resultId
  })
  /** 当前生成是否可以保存：有成功结果、未 stale、未被保存过。 */
  const canSave = computed(() => {
    const generation = options.getGeneration()
    if (!generation || generation.state.phase !== 'success' || !generation.result) return false
    // 年/月柱必须至少有一种表达（唯一情形或候选情形），否则不是完整结果。
    if (!generation.result.uniquePillars && !generation.result.scenarios) return false
    if (options.isStale()) return false
    return savedResultId.value !== generation.resultId
  })

  /** 组装保存请求：客户端摘要与服务端复算共用同一 `resultDigest`（交付规范 §7.4）。 */
  function buildSaveRequest(): SaveBaziSnapshotRequest | null {
    const generation = options.getGeneration()
    if (!generation || generation.state.phase !== 'success' || !generation.result) return null
    if (!generation.asOfDate) return null
    return {
      toolId: BAZI_TOOL_ID,
      resultId: generation.resultId,
      asOfDate: generation.asOfDate,
      originalInput: generation.raw,
      inputOrigin: options.getOrigin(),
      clientDigest: resultDigest(generation.result),
    }
  }

  function statusCodeOf(error: unknown): number | undefined {
    return (error as { statusCode?: number })?.statusCode
  }

  /**
   * 取服务端业务错误码（RESULT_MISMATCH / COUNT_MISMATCH）。
   *
   * Nuxt 的 `createError({ data })` 把业务数据放在响应体 `data` 字段，而 ofetch 的
   * `FetchError.data` 是整个响应体，实际路径为 `error.data.data.code`；
   * 只读浅层会把复算不一致误报成普通保存失败。两种形状都接受。
   */
  function errorCodeOf(error: unknown): string {
    const data = (error as { data?: { code?: unknown; data?: { code?: unknown } } })?.data
    const nested = data?.data?.code
    if (typeof nested === 'string') return nested
    return typeof data?.code === 'string' ? data.code : ''
  }

  /**
   * 保存本次结果（必须在用户看完摘要并再次确认后调用）。
   * 返回有界结果，调用方据此更新界面；本函数不抛异常。
   */
  async function save(): Promise<SaveOutcome> {
    if (saving.value) return { status: 'failed' }
    if (!isAuthenticated.value) return { status: 'unauthenticated' }
    if (options.isStale()) {
      saveError.value = '输入已修改，结果尚未更新；请先生成最新结果再保存。'
      return { status: 'stale' }
    }
    const request = buildSaveRequest()
    if (!request) {
      saveError.value = '当前没有可保存的结果。'
      return { status: 'failed' }
    }
    saving.value = true
    saveError.value = ''
    mismatch.value = false
    try {
      const res = await $fetch<{
        recordId: string
        resultId: string
        savedAt: string
        created: boolean
      }>('/api/result-history', { method: 'POST', body: request })
      savedResultId.value = res.resultId
      savedAt.value = res.savedAt
      // 保存后列表可能变化：标记为未加载，避免展示过期列表。
      listLoaded.value = false
      return { status: 'saved', created: res.created, savedAt: res.savedAt }
    } catch (error: unknown) {
      const statusCode = statusCodeOf(error)
      if (statusCode === 401) {
        markSessionExpired()
        return { status: 'unauthenticated' }
      }
      if (statusCode === 409 && errorCodeOf(error) === 'RESULT_MISMATCH') {
        // 保留页面结果，只标记未保存（交付规范 §7.4）。
        mismatch.value = true
        saveError.value = '服务端复算结果与页面不一致，本次结果未保存。可重新生成后再试。'
        return { status: 'mismatch' }
      }
      if (statusCode === 403) {
        saveError.value = '当前账号不支持保存结果历史。'
        return { status: 'failed' }
      }
      if (statusCode === 429) {
        saveError.value = '操作过于频繁，请稍后再试。'
        return { status: 'failed' }
      }
      saveError.value = '保存失败，本次结果仍未保存，可稍后重试。'
      return { status: 'failed' }
    } finally {
      saving.value = false
    }
  }

  /** 读取历史列表（安全摘要）。只返回有界结果。 */
  async function loadList(force = false): Promise<'success' | 'unauthenticated' | 'failed'> {
    if (listLoading.value) return 'failed'
    if (!isAuthenticated.value) {
      items.value = []
      listLoaded.value = false
      return 'unauthenticated'
    }
    if (!force && listLoaded.value) return 'success'
    listLoading.value = true
    listError.value = ''
    try {
      const res = await $fetch<{ items: ResultSnapshotSummary[] }>('/api/result-history', {
        query: { tool: BAZI_TOOL_ID },
      })
      items.value = res.items
      listLoaded.value = true
      return 'success'
    } catch (error: unknown) {
      if (statusCodeOf(error) === 401) {
        markSessionExpired()
        items.value = []
        listLoaded.value = false
        return 'unauthenticated'
      }
      listError.value = '无法读取历史记录，请稍后重试。'
      return 'failed'
    } finally {
      listLoading.value = false
    }
  }

  /** 打开一条历史：只读快照，不按当前规则重算。 */
  async function openRecord(recordId: string): Promise<boolean> {
    if (selectedLoading.value) return false
    if (!isAuthenticated.value) return false
    selectedLoading.value = true
    selectedError.value = ''
    try {
      const res = await $fetch<{ record: ResultSnapshotRecord }>(`/api/result-history/${recordId}`)
      selected.value = res.record
      return true
    } catch (error: unknown) {
      if (statusCodeOf(error) === 401) markSessionExpired()
      selected.value = null
      selectedError.value = '无法打开这条历史记录，请稍后重试。'
      return false
    } finally {
      selectedLoading.value = false
    }
  }

  function closeRecord() {
    selected.value = null
    selectedError.value = ''
  }

  /** 删除单条：失败时**不**从界面移除，保留列表与提示。 */
  async function removeRecord(recordId: string): Promise<boolean> {
    if (mutating.value) return false
    if (!isAuthenticated.value) return false
    mutating.value = true
    mutateError.value = ''
    try {
      await $fetch(`/api/result-history/${recordId}`, { method: 'DELETE' })
      items.value = items.value.filter(item => item.recordId !== recordId)
      if (selected.value?.recordId === recordId) selected.value = null
      return true
    } catch (error: unknown) {
      if (statusCodeOf(error) === 401) markSessionExpired()
      mutateError.value = '删除失败，记录仍然保留。请稍后重试。'
      return false
    } finally {
      mutating.value = false
    }
  }

  /** 请求清空：先展示条数再确认（交付规范 §7.5）。 */
  function requestClearAll() {
    clearPending.value = true
    mutateError.value = ''
  }

  function cancelClearAll() {
    clearPending.value = false
  }

  /** 确认清空：confirm 必须等于当前条数，服务端数量不符时 409 拒绝。 */
  async function confirmClearAll(): Promise<boolean> {
    if (mutating.value) return false
    if (!isAuthenticated.value) return false
    const count = items.value.length
    mutating.value = true
    mutateError.value = ''
    try {
      await $fetch('/api/result-history', {
        method: 'DELETE',
        query: { tool: BAZI_TOOL_ID, confirm: count },
      })
      items.value = []
      selected.value = null
      clearPending.value = false
      return true
    } catch (error: unknown) {
      const statusCode = statusCodeOf(error)
      if (statusCode === 401) markSessionExpired()
      if (statusCode === 409 && errorCodeOf(error) === 'COUNT_MISMATCH') {
        mutateError.value = '记录数量已变化，已为你刷新列表，请重新确认。'
        clearPending.value = false
        await loadList(true)
        return false
      }
      mutateError.value = '清空失败，记录仍然保留。请稍后重试。'
      return false
    } finally {
      mutating.value = false
    }
  }

  /**
   * 「用当前规则重新计算」：把旧快照的输入复制出来供页面生成本次未保存结果。
   * 本函数不改动服务端记录，也不自动保存。
   */
  function reuseInput(record: ResultSnapshotRecord): {
    raw: BaziRawDate
    inputOrigin: BaziInputOrigin
  } {
    return { raw: record.originalInput, inputOrigin: record.inputOrigin }
  }

  /** 退出/换账号/卸载：清空全部本地状态（不缓存任何快照或摘要）。 */
  function reset() {
    items.value = []
    listLoaded.value = false
    listError.value = ''
    selected.value = null
    selectedError.value = ''
    saveError.value = ''
    mismatch.value = false
    savedResultId.value = ''
    savedAt.value = ''
    clearPending.value = false
    mutateError.value = ''
  }

  return {
    items,
    listLoaded,
    listLoading,
    listError,
    saving,
    saveError,
    mismatch,
    savedResultId,
    savedAt,
    selected,
    selectedLoading,
    selectedError,
    clearPending,
    mutating,
    mutateError,
    isAuthenticated,
    saved,
    canSave,
    buildSaveRequest,
    save,
    loadList,
    openRecord,
    closeRecord,
    removeRecord,
    requestClearAll,
    cancelClearAll,
    confirmClearAll,
    reuseInput,
    reset,
  }
}
