// @vitest-environment happy-dom
import { nextTick, ref, shallowRef } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBaziDraft } from '~/composables/useBaziDraft'
import { useBaziProfileImport } from '~/composables/useBaziProfileImport'
import type { useSelfProfile } from '~/composables/useSelfProfile'
import type { SelfProfile, SelfProfileSummary } from '~/types/self-profile'
import type { BaziRawDate } from '~/types/bazi'

/**
 * 八字页草稿：无默认值、闰月显式选择、stale 保留旧结果不自动重算、不写任何存储；
 * 以及「从本人档案带入」的来源/替换/撤销/失效边界（消歧记录 Q2）。
 *
 * 期望值来源：契约 §7.2（闰月必须显式）、治理规范 §7.4（stale 保留旧结果）、
 * 数据规范 §5.4（十四周岁）、§8.3/§13（带入与来源失效）与 §15.2（出生日期不得进入存储/URL/日志）。
 * 具体干支值不在此断言：那属于黄金样例（tests/utils/bazi/golden-cases.test.ts）。
 */

const setItem = vi.fn()
const getItem = vi.fn()
const removeItem = vi.fn()

function createDraft() {
  return useBaziDraft({ asOfDate: () => '2026-09-14' })
}

function fillSolar(draft: ReturnType<typeof createDraft>, y = '2000', m = '8', d = '15') {
  draft.setCalendar('solar')
  draft.setYear(y)
  draft.setMonth(m)
  draft.setDay(d)
  draft.setAgeConfirmed(true)
}

beforeEach(() => {
  setItem.mockClear()
  getItem.mockClear()
  removeItem.mockClear()
  vi.stubGlobal('localStorage', { setItem, getItem, removeItem })
  vi.stubGlobal('sessionStorage', { setItem, getItem, removeItem })
})

describe('八字草稿', () => {
  it('初始无任何默认值：不预填今天、不预填示例日期、闰月未选、年龄未确认', () => {
    const draft = createDraft()
    expect(draft.draft.value).toEqual({
      calendar: 'solar',
      year: '',
      month: '',
      day: '',
      isLeapMonth: null,
      ageConfirmed: false,
    })
    expect(draft.state.value).toEqual({ phase: 'idle' })
    expect(draft.canGenerate.value).toBe(false)
  })

  it('未确认十四周岁时不产生任何个人日期计算，只给就近提示', () => {
    const draft = createDraft()
    draft.setYear('2000')
    draft.setMonth('8')
    draft.setDay('7')
    expect(draft.generate()).toBeNull()
    expect(draft.generation.value).toBeNull()
    expect(draft.state.value).toEqual({ phase: 'idle' })
    expect(draft.inputError.value).toContain('十四周岁')
  })

  it('农历闰月未选时不得提交，并给出「普通月/闰月」的就近提示', () => {
    const draft = createDraft()
    draft.setCalendar('lunar')
    draft.setYear('2000')
    draft.setMonth('7')
    draft.setDay('8')
    draft.setAgeConfirmed(true)
    expect(draft.canGenerate.value).toBe(false)
    expect(draft.missingLeapChoice.value).toBe(true)
    expect(draft.generate()).toBeNull()
    expect(draft.inputError.value).toContain('闰月')
  })

  it('切换历法清空年月日并重置闰月为未选（不把数字静默解释为另一历法）', () => {
    const draft = createDraft()
    fillSolar(draft)
    draft.setCalendar('lunar')
    expect(draft.draft.value.year).toBe('')
    expect(draft.draft.value.month).toBe('')
    expect(draft.draft.value.day).toBe('')
    expect(draft.draft.value.isLeapMonth).toBeNull()
  })

  it('成功生成后：partial + 非空结果 + 缺时柱；日期真实存在才可生成', () => {
    const draft = createDraft()
    fillSolar(draft)
    const generated = draft.generate()
    expect(generated).not.toBeNull()
    expect(draft.state.value).toEqual({
      phase: 'success',
      successQualifier: 'partial',
      freshness: 'current',
    })
    const result = draft.result.value
    expect(result).not.toBeNull()
    expect(result?.missingFields).toEqual(['hour_pillar'])
    expect(result?.completeness).toEqual({ provided: 3, total: 4 })
    expect(result?.dayPillar.stem.length).toBe(1)
    expect(result?.dayPillar.branch.length).toBe(1)
    expect(result?.dayMaster).toBe(result?.dayPillar.stem)
    expect(draft.inputError.value).toBe('')
  })

  it('跨「节」当日：candidate + 恰好 2 个情形 + 标明涉及的节名', () => {
    const draft = createDraft()
    // 2000-08-07 是立秋当日：缺出生时刻时年柱/月柱各两种可能。
    fillSolar(draft, '2000', '8', '7')
    draft.generate()
    expect(draft.state.value).toMatchObject({ phase: 'success', successQualifier: 'candidate' })
    expect(draft.result.value?.scenarios).toHaveLength(2)
    expect(draft.result.value?.uniquePillars).toBeNull()
    expect(draft.boundaryTerm.value).toBe('立秋')
    expect(draft.result.value?.scenarios?.every(item => item.reason.length > 0)).toBe(true)
  })

  it('非法公历日期（二月三十日）不出结果，只给可就地修正的提示', () => {
    const draft = createDraft()
    fillSolar(draft, '2001', '2', '30')
    expect(draft.generate()).toBeNull()
    expect(draft.generation.value).toBeNull()
    expect(draft.inputError.value).toContain('真实存在的公历日期')
  })

  it('超出支持范围与未来日期由引擎判定失败，并同时写就近错误', () => {
    const before = createDraft()
    fillSolar(before, '1900', '12', '31')
    before.generate()
    expect(before.state.value).toMatchObject({
      phase: 'failure',
      failureCategory: 'unsupported_input',
    })
    expect(before.inputError.value).toContain('1901-01-01')

    const future = createDraft()
    fillSolar(future, '2027', '1', '1')
    future.generate()
    expect(future.state.value).toMatchObject({ phase: 'failure', failureCategory: 'invalid_input' })
    expect(future.inputError.value).toContain('未来')
  })

  it('修改输入后保留旧结果并标记 stale，不自动重算，且给出旧输入摘要', () => {
    const draft = createDraft()
    fillSolar(draft)
    draft.generate()
    const before = draft.result.value
    const revisionBefore = draft.revision.value

    draft.setMonth('9')
    expect(draft.revision.value).toBeGreaterThan(revisionBefore)
    expect(draft.state.value).toEqual({
      phase: 'success',
      successQualifier: 'partial',
      freshness: 'stale',
    })
    // 旧结果对象与内容保持不变，stale 只影响状态展示。
    expect(draft.result.value).toBe(before)
    expect(draft.staleInputSummary.value).toContain('2000-08-15')
  })

  it('旧失败结果不保留：输入一改即清除，避免把旧错误挂在新输入上', () => {
    const draft = createDraft()
    fillSolar(draft, '1900', '12', '31')
    draft.generate()
    expect(draft.state.value).toMatchObject({ phase: 'failure' })
    draft.setDay('30')
    expect(draft.state.value).toEqual({ phase: 'idle' })
    expect(draft.generation.value).toBeNull()
    expect(draft.inputError.value).toBe('')
  })

  it('生成只使用传入的 asOfDate，且不写入任何浏览器存储', () => {
    const draft = createDraft()
    fillSolar(draft)
    draft.generate()
    expect(draft.generation.value?.asOfDate).toBe('2026-09-14')
    expect(setItem).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
  })

  it('无法确定查询当日时按 engine_error 失败，不回退默认日期', () => {
    const draft = useBaziDraft({ asOfDate: () => '' })
    fillSolar(draft)
    draft.generate()
    expect(draft.state.value).toMatchObject({ phase: 'failure', failureCategory: 'engine_error' })
    expect(draft.result.value).toBeNull()
    expect(draft.inputError.value).toContain('未生成任何默认结果')
  })

  it('reset 清空草稿、结果与来源（页面卸载时使用）', () => {
    const draft = createDraft()
    fillSolar(draft)
    draft.generate()
    draft.setOrigin('profile')
    draft.reset()
    expect(draft.draft.value.year).toBe('')
    expect(draft.generation.value).toBeNull()
    expect(draft.origin.value).toBe('manual')
    expect(draft.state.value).toEqual({ phase: 'idle' })
  })
})

describe('从本人档案带入（Q2）', () => {
  function makeProfile(solarDate: string, useAllowed = true): SelfProfile {
    return {
      id: 'profile-1',
      accountId: 12,
      version: 3,
      birthDate: {
        raw: { calendar: 'solar', year: 1990, month: 6, day: 15, isLeapMonth: null },
        solarDate,
        conversionVersion: 'profile-birth-date-v1',
        confirmedAt: '2026-09-14T02:00:00.000Z',
      },
      useAllowed,
      createdAt: '2026-09-14T02:00:00.000Z',
      updatedAt: '2026-09-14T02:00:00.000Z',
    }
  }

  function fakeApi(profile: SelfProfile | null, summary: SelfProfileSummary | null) {
    return {
      summary: ref(summary),
      profile: shallowRef(profile),
      loadSummary: vi.fn(async () => ({ status: 'success', summary })),
      loadProfile: vi.fn(async () => ({ status: 'success', profile })),
    } as unknown as ReturnType<typeof useSelfProfile>
  }

  function createBridge(profile: SelfProfile | null, summary: SelfProfileSummary | null) {
    const state = {
      raw: null as BaziRawDate | null,
      origin: 'manual' as 'manual' | 'profile',
      cleared: 0,
    }
    const api = fakeApi(profile, summary)
    const bridge = useBaziProfileImport(
      {
        getRaw: () => state.raw,
        applyRaw: raw => {
          state.raw = raw
        },
        setOrigin: origin => {
          state.origin = origin
        },
        clearImported: () => {
          state.raw = null
          state.cleared += 1
        },
      },
      api,
    )
    return { bridge, state, api }
  }

  const available: SelfProfileSummary = {
    exists: true,
    profileId: 'profile-1',
    version: 3,
    hasBirthDate: true,
    canImport: true,
  }

  it('档案无可用日期时入口关闭，且不发读取请求', async () => {
    const { bridge, api } = createBridge(null, {
      ...available,
      hasBirthDate: false,
      canImport: false,
    })
    expect(bridge.canImport.value).toBe(false)
    await bridge.requestImport()
    expect(api.loadProfile).not.toHaveBeenCalled()
  })

  it('空草稿：直接带入，来源记为档案，且不自动计算或保存', async () => {
    const { bridge, state } = createBridge(makeProfile('1990-06-15'), available)
    expect(bridge.canImport.value).toBe(true)
    await bridge.requestImport()
    expect(state.raw).toEqual({
      calendar: 'solar',
      year: 1990,
      month: 6,
      day: 15,
      isLeapMonth: null,
    })
    expect(state.origin).toBe('profile')
    expect(bridge.pending.value).toBeNull()
    expect(bridge.canUndo.value).toBe(true)
  })

  it('草稿已有不同日期：先建替换候选，确认后才替换，并可撤销回原值', async () => {
    const { bridge, state } = createBridge(makeProfile('1990-06-15'), available)
    state.raw = { calendar: 'lunar', year: 1991, month: 1, day: 1, isLeapMonth: false }

    await bridge.requestImport()
    expect(bridge.pending.value).not.toBeNull()
    expect(state.raw).toEqual({
      calendar: 'lunar',
      year: 1991,
      month: 1,
      day: 1,
      isLeapMonth: false,
    })

    expect(bridge.confirmImport()).toBe(true)
    expect(state.raw).toMatchObject({ calendar: 'solar', year: 1990 })
    expect(state.origin).toBe('profile')

    bridge.undoImport()
    expect(state.raw).toEqual({
      calendar: 'lunar',
      year: 1991,
      month: 1,
      day: 1,
      isLeapMonth: false,
    })
    expect(state.origin).toBe('manual')
  })

  it('草稿与档案相同时不出现替换候选，只登记来源', async () => {
    const { bridge, state } = createBridge(makeProfile('1990-06-15'), available)
    state.raw = { calendar: 'solar', year: 1990, month: 6, day: 15, isLeapMonth: null }
    await bridge.requestImport()
    expect(bridge.pending.value).toBeNull()
    expect(state.origin).toBe('profile')
  })

  it('手动修改后来源改回手动，但撤销快照仍可用（撤销取本地值，不问服务器）', async () => {
    const { bridge, state } = createBridge(makeProfile('1990-06-15'), available)
    const before: BaziRawDate = {
      calendar: 'solar',
      year: 1991,
      month: 1,
      day: 1,
      isLeapMonth: null,
    }
    state.raw = { ...before }
    await bridge.requestImport()
    expect(bridge.pending.value).not.toBeNull()
    bridge.confirmImport()
    expect(state.origin).toBe('profile')

    bridge.onManualEdit()
    expect(state.origin).toBe('manual')
    // 撤销仍能恢复带入前的值，且来源一并恢复。
    bridge.undoImport()
    expect(state.raw).toEqual(before)
    expect(state.origin).toBe('manual')
  })

  it('撤销空草稿带入：清掉带入的日期而不是留下半份输入', async () => {
    const { bridge, state } = createBridge(makeProfile('1990-06-15'), available)
    await bridge.requestImport()
    bridge.undoImport()
    expect(state.raw).toBeNull()
    expect(state.cleared).toBe(1)
    expect(bridge.canUndo.value).toBe(false)
  })

  it('来源档案被删除或撤回授权：原子失效并提示，入口关闭', async () => {
    const { bridge, state, api } = createBridge(makeProfile('1990-06-15'), available)
    await bridge.requestImport()
    expect(state.origin).toBe('profile')

    api.summary.value = { ...available, hasBirthDate: false, canImport: false }
    await nextTick()
    expect(state.raw).toBeNull()
    expect(state.origin).toBe('manual')
    expect(bridge.canImport.value).toBe(false)
  })

  it('来源档案版本变化（同页保存/跨标签）同样失效，避免按旧版本继续使用', async () => {
    const { bridge, state, api } = createBridge(makeProfile('1990-06-15'), available)
    await bridge.requestImport()
    api.summary.value = { ...available, version: 4 }
    await nextTick()
    expect(state.raw).toBeNull()
    expect(state.origin).toBe('manual')
  })
})
