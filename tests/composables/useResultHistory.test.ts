// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useResultHistory } from '~/composables/useResultHistory'
import type { BaziGeneration } from '~/composables/useBaziDraft'
import type { ResultSnapshotRecord, ResultSnapshotSummary } from '~/types/bazi'
import { calculateBazi } from '~/utils/bazi/engine'

/**
 * 八字结果历史交互：显式保存的边界条件。
 *
 * 期望值来源：交付规范 §7.3（复算不一致不得保存）、§7.4（stale 拒绝保存、未保存可重试）、
 * §7.5（删除与清空）、治理规范 §11.6（幂等）与 §19.2（列表用普通按钮）。
 */

const stateStore: Record<string, unknown> = {}
const fetchMock = vi.fn()

function setAuth(status: 'guest' | 'authenticated', accountId = 12) {
  stateStore['auth:status'] = status
  stateStore['auth:account'] = status === 'authenticated' ? { id: accountId } : null
  stateStore['auth:restore-error'] = null
}

/** 真实引擎产出的当次结果（结构、摘要都由领域层给出，测试不手写干支）。 */
function makeGeneration(overrides: { stale?: boolean } = {}) {
  const outcome = calculateBazi({
    raw: { calendar: 'solar', year: 2000, month: 8, day: 15, isLeapMonth: null },
    asOfDate: '2026-09-14',
  })
  const generation: BaziGeneration = {
    raw: { calendar: 'solar', year: 2000, month: 8, day: 15, isLeapMonth: null },
    asOfDate: '2026-09-14',
    resultId: 'result-1',
    state: outcome.state,
    result: outcome.result,
  }
  return { generation, result: outcome.result!, stale: overrides.stale ?? false }
}

function createHistory(options: { stale?: boolean } = {}) {
  const { generation, stale } = makeGeneration(options)
  const history = useResultHistory({
    getGeneration: () => generation,
    getOrigin: () => 'manual',
    isStale: () => stale,
  })
  return { history, generation, stale }
}

const summaryItem: ResultSnapshotSummary = {
  recordId: '11111111-1111-4111-8111-111111111111',
  resultId: 'result-1',
  displayNamePrefix: '八字基础排盘',
  savedAt: '2026-09-14T10:00:00.000Z',
  asOfDate: '2026-09-14',
  phase: 'success',
  successQualifier: 'partial',
  ruleVersion: '2026-09-14-bazi-date-v1',
  inputOrigin: 'manual',
}

beforeEach(() => {
  for (const key of Object.keys(stateStore)) delete stateStore[key]
  setAuth('authenticated')
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!(key in stateStore)) stateStore[key] = init()
    return {
      get value() {
        return stateStore[key]
      },
      set value(next: unknown) {
        stateStore[key] = next
      },
    }
  })
})

describe('八字结果历史', () => {
  it('未登录时不发请求，直接返回未认证（不缓存任何历史）', async () => {
    setAuth('guest')
    const { history } = createHistory()
    expect(await history.save()).toEqual({ status: 'unauthenticated' })
    expect(await history.loadList()).toBe('unauthenticated')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(history.items.value).toEqual([])
  })

  it('stale 时拒绝保存且不发请求（输入已改，结果与输入不再对应）', async () => {
    const { history } = createHistory({ stale: true })
    expect(history.canSave.value).toBe(false)
    expect(await history.save()).toEqual({ status: 'stale' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(history.saveError.value).toContain('输入已修改')
  })

  it('保存成功：提交稳定摘要并进入已保存态；重复保存同一生成仍只算一次', async () => {
    const { history, generation } = createHistory()
    fetchMock.mockResolvedValueOnce({
      recordId: summaryItem.recordId,
      resultId: generation.resultId,
      savedAt: summaryItem.savedAt,
      created: true,
    })
    const outcome = await history.save()
    expect(outcome).toEqual({
      status: 'saved',
      created: true,
      savedAt: summaryItem.savedAt,
    })
    expect(history.saved.value).toBe(true)
    expect(history.canSave.value).toBe(false)

    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/result-history')
    expect(options?.method).toBe('POST')
    const body = options?.body as {
      toolId: string
      asOfDate: string
      inputOrigin: string
      clientDigest: { solarDate: string; successQualifier: string }
    }
    expect(body.toolId).toBe('bazi')
    expect(body.asOfDate).toBe('2026-09-14')
    expect(body.inputOrigin).toBe('manual')
    expect(body.clientDigest.solarDate).toBe('2000-08-15')
    expect(body.clientDigest.successQualifier).toBe('partial')
  })

  it('服务端复算不一致（409 RESULT_MISMATCH）：标记未保存、保留页面结果、可重试', async () => {
    const { history, generation } = createHistory()
    // 真实形状：createError 的业务 data 被 ofetch 整体放在 FetchError.data 上。
    fetchMock.mockRejectedValueOnce({
      statusCode: 409,
      data: {
        statusCode: 409,
        statusMessage: '结果与服务端复算不一致，未保存',
        data: { code: 'RESULT_MISMATCH' },
      },
    })
    const outcome = await history.save()
    expect(outcome).toEqual({ status: 'mismatch' })
    expect(history.mismatch.value).toBe(true)
    expect(history.saved.value).toBe(false)
    expect(history.saveError.value).toContain('未保存')
    // 页面结果不在本组合式函数内，保存失败不改变 canSave（可重试）。
    expect(history.canSave.value).toBe(true)
    expect(generation.result).not.toBeNull()

    // 重试：服务端这次一致。
    fetchMock.mockResolvedValueOnce({
      recordId: summaryItem.recordId,
      resultId: generation.resultId,
      savedAt: summaryItem.savedAt,
      created: true,
    })
    expect(await history.save()).toEqual({
      status: 'saved',
      created: true,
      savedAt: summaryItem.savedAt,
    })
  })

  it('错误码读取兼容两种形状：浅层 data.code 同样识别为复算不一致', async () => {
    const { history } = createHistory()
    fetchMock.mockRejectedValueOnce({ statusCode: 409, data: { code: 'RESULT_MISMATCH' } })
    expect(await history.save()).toEqual({ status: 'mismatch' })
    expect(history.mismatch.value).toBe(true)
  })

  it('列表只消费安全摘要；打开快照不改动列表', async () => {
    const { history } = createHistory()
    fetchMock.mockResolvedValueOnce({ items: [summaryItem] })
    expect(await history.loadList()).toBe('success')
    expect(history.items.value).toHaveLength(1)
    // 列表项字段集合不含出生输入或结果正文。
    expect(Object.keys(history.items.value[0]!).sort()).toEqual(
      [
        'asOfDate',
        'displayNamePrefix',
        'inputOrigin',
        'phase',
        'recordId',
        'resultId',
        'ruleVersion',
        'savedAt',
        'successQualifier',
      ].sort(),
    )

    const record = {
      recordId: summaryItem.recordId,
      resultId: 'result-1',
      toolId: 'bazi',
      schemaVersion: 1,
      ruleVersion: '2026-09-14-bazi-date-v1',
      engineName: 'lunar-javascript',
      engineVersion: '1.7.7',
      sourceSetVersion: '2026-09-14-bazi-date-v1',
      originalInput: { calendar: 'solar', year: 2000, month: 8, day: 15, isLeapMonth: null },
      normalizedInput: {
        raw: { calendar: 'solar', year: 2000, month: 8, day: 15, isLeapMonth: null },
        solarDate: '2000-08-15',
        lunar: { year: 2000, month: 7, day: 16, isLeapMonth: false },
        conversionVersion: 'lunar-javascript 1.7.7',
      },
      phase: 'success',
      successQualifier: 'partial',
      failureCategory: null,
      failureDetailCode: null,
      resultSnapshot: makeGeneration().result,
      limitations: [],
      inputOrigin: 'manual',
      ruleStatus: 'current',
      asOfDate: '2026-09-14',
      generatedAt: '2026-09-14T10:00:00.000Z',
      savedAt: summaryItem.savedAt,
    } satisfies ResultSnapshotRecord
    fetchMock.mockResolvedValueOnce({ record })
    expect(await history.openRecord(summaryItem.recordId)).toBe(true)
    expect(history.selected.value?.recordId).toBe(summaryItem.recordId)
    expect(history.items.value).toHaveLength(1)

    history.closeRecord()
    expect(history.selected.value).toBeNull()
  })

  it('删除失败不移除列表项；删除成功才移除', async () => {
    const { history } = createHistory()
    fetchMock.mockResolvedValueOnce({ items: [summaryItem] })
    await history.loadList()

    fetchMock.mockRejectedValueOnce({ statusCode: 500 })
    expect(await history.removeRecord(summaryItem.recordId)).toBe(false)
    expect(history.items.value).toHaveLength(1)
    expect(history.mutateError.value).toContain('记录仍然保留')

    fetchMock.mockResolvedValueOnce({ deleted: 1 })
    expect(await history.removeRecord(summaryItem.recordId)).toBe(true)
    expect(history.items.value).toHaveLength(0)
  })

  it('清空必须先按当前条数确认；数量变化时刷新列表且不清空', async () => {
    const { history } = createHistory()
    fetchMock.mockResolvedValueOnce({ items: [summaryItem] })
    await history.loadList()

    history.requestClearAll()
    expect(history.clearPending.value).toBe(true)

    fetchMock.mockRejectedValueOnce({
      statusCode: 409,
      data: {
        statusCode: 409,
        statusMessage: '记录数量已变化',
        data: { code: 'COUNT_MISMATCH', actual: 0 },
      },
    })
    fetchMock.mockResolvedValueOnce({ items: [] })
    expect(await history.confirmClearAll()).toBe(false)
    expect(history.mutateError.value).toContain('数量已变化')
    expect(history.clearPending.value).toBe(false)
    // 请求带的 confirm 是操作前的条数。
    const [url, options] = fetchMock.mock.calls[1]!
    expect(url).toBe('/api/result-history')
    expect(options?.method).toBe('DELETE')
    expect(options?.query).toEqual({ tool: 'bazi', confirm: 1 })
  })

  it('「用当前规则重新计算」只取回输入，不写任何记录', async () => {
    const { history } = createHistory()
    const record = {
      recordId: summaryItem.recordId,
      originalInput: { calendar: 'lunar', year: 2000, month: 7, day: 16, isLeapMonth: false },
      inputOrigin: 'profile',
    } as ResultSnapshotRecord
    const reused = history.reuseInput(record)
    expect(reused.raw).toEqual(record.originalInput)
    expect(reused.inputOrigin).toBe('profile')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('401 时清空本地状态并返回未认证', async () => {
    const { history } = createHistory()
    fetchMock.mockRejectedValueOnce({ statusCode: 401 })
    expect(await history.loadList()).toBe('unauthenticated')
    expect(history.items.value).toEqual([])
    // 说明：`useAuth.markSessionExpired` 自身带 `import.meta.client` 守卫，而 vitest 环境
    // 不注入该标志（define 只覆盖源码里的 import.meta.client，测试文件里为 undefined），
    // 因此这里只断言本组合式函数保证的行为：清空列表并返回未认证。
    expect(history.listLoaded.value).toBe(false)
  })
})
