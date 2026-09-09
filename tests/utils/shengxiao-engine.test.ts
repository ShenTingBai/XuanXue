// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { calculateShengXiao, classifyGanZhi } from '~/utils/shengxiao/engine'
import { lunarCalendarAdapter } from '~/utils/shengxiao/calendar'
import { SHENGXIAO_ENGINE_VERSION } from '~/constants/shengxiao-rules'
import type { CalendarAdapter, LunarDateInfo, YearBoundary } from '~/types/shengxiao'

/**
 * 生肖领域黄金样例测试（规则台账 §3.1、实施映射第 8 节）。
 *
 * 预期值来自独立黄金 JSON（由已批准 YAML 离线转换），不导入生产规则表或
 * 候选引擎反向生成。本文件只编写、不执行（计划 must_not）。
 */

interface GoldenCase {
  caseId: string
  inputDate: string
  asOfDate: string
  lunarDate?: string
  lunarYear?: number
  ganZhiYear?: string
  animal?: string
  earthlyBranch?: string
  stemElement?: string
  yinYang?: string
  branchElement?: string
  naYin?: string
  ruleVersion?: string
  yearBoundary?: {
    timezone: string
    startDate: string
    endDate: string
  }
  expectedPhase: 'success' | 'failure'
  successQualifier?: 'unique'
  failureCategory?: 'invalid_input' | 'unsupported_input'
  failureDetailCode?: string
}

const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/fixtures/shengxiao-golden.json'), 'utf-8'),
) as {
  _meta: { source_sha256: string }
  rule_version: string
  golden_cases: GoldenCase[]
  classification_cases: Array<{
    inputGanZhi: string
    cycleIndex: number
    stemElement: string
    yinYang: string
    branchElement: string
    naYin: string
  }>
}

describe('shengxiao 领域引擎 · 黄金日期样例', () => {
  it('黄金 JSON 携带格式有效的源哈希元数据（不证明内容一致）', () => {
    // 源 YAML SHA256 在转换时写入 _meta；此处仅验证 fixture 携带该元数据
    expect(fixture._meta.source_sha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('逐例断言 26 个日期预期', () => {
    const cases = fixture.golden_cases
    expect(cases.length).toBe(26)

    for (const tc of cases) {
      const outcome = calculateShengXiao(tc.inputDate, tc.asOfDate)

      if (tc.expectedPhase === 'failure') {
        expect(outcome.phase, `${tc.caseId} 应为失败`).toBe('failure')
        if (outcome.phase === 'failure') {
          expect(outcome.failureCategory, `${tc.caseId} 失败类别`).toBe(tc.failureCategory)
          if (tc.failureDetailCode) {
            expect(outcome.failureDetailCode, `${tc.caseId} 失败详情`).toBe(tc.failureDetailCode)
          }
        }
        continue
      }

      // success 预期：断言唯一结果与完整契约字段
      expect(outcome.phase, `${tc.caseId} 应为成功`).toBe('success')
      if (outcome.phase !== 'success') continue
      expect(outcome.successQualifier, `${tc.caseId} 唯一结果`).toBe('unique')
      expect(outcome.inputDate, `${tc.caseId} 输入日期`).toBe(tc.inputDate)
      // 黄金中的除夕括注是年末说明：日期主体逐字比对，括注另以年界末日验证。
      // 不修改黄金原件，也不把其他括注或日期差异宽泛忽略。
      const isNewYearsEve = tc.lunarDate?.endsWith('（除夕）') === true
      const expectedDate = isNewYearsEve ? tc.lunarDate?.slice(0, -4) : tc.lunarDate
      expect(outcome.lunarDate, `${tc.caseId} 农历日期`).toBe(expectedDate)
      if (isNewYearsEve) {
        expect(outcome.inputDate, `${tc.caseId} 除夕为农历年末日`).toBe(
          outcome.yearBoundary.endDate,
        )
      }
      expect(outcome.lunarYear, `${tc.caseId} 农历年`).toBe(tc.lunarYear)
      expect(outcome.ganZhiYear, `${tc.caseId} 干支年`).toBe(tc.ganZhiYear)
      expect(outcome.animal, `${tc.caseId} 生肖`).toBe(tc.animal)
      expect(outcome.earthlyBranch, `${tc.caseId} 地支`).toBe(tc.earthlyBranch)
      expect(outcome.stemElement, `${tc.caseId} 年干五行`).toBe(tc.stemElement)
      expect(outcome.yinYang, `${tc.caseId} 年干阴阳`).toBe(tc.yinYang)
      expect(outcome.branchElement, `${tc.caseId} 年支五行`).toBe(tc.branchElement)
      expect(outcome.naYin, `${tc.caseId} 纳音`).toBe(tc.naYin)
      expect(outcome.ruleVersion, `${tc.caseId} 规则版本`).toBe(fixture.rule_version)
      expect(outcome.engineVersion, `${tc.caseId} 引擎版本`).toBe(SHENGXIAO_ENGINE_VERSION)
      expect(outcome.yearBoundary.timezone, `${tc.caseId} 时区`).toBe('Asia/Shanghai')
      expect(outcome.yearBoundary.startDate, `${tc.caseId} 年界起`).toBe(tc.yearBoundary?.startDate)
      expect(outcome.yearBoundary.endDate, `${tc.caseId} 年界止`).toBe(tc.yearBoundary?.endDate)
    }
  })

  it('非法与范围外输入不得调用适配器（spy 断言调用次数 0）', () => {
    // vi.fn spy：断言 toLunar 与 yearBoundary 调用次数均为 0，
    // 不能仅靠抛错后 engine_error 证明（catch 会吞掉任何异常）。
    const spy: CalendarAdapter = {
      toLunar: vi.fn((): LunarDateInfo => {
        throw new Error('adapter should not be called')
      }),
      yearBoundary: vi.fn((): YearBoundary => {
        throw new Error('adapter should not be called')
      }),
    }

    const invalid = calculateShengXiao('2023-02-29', '2026-09-09', spy)
    expect(invalid.phase).toBe('failure')
    if (invalid.phase === 'failure') expect(invalid.failureCategory).toBe('invalid_input')
    expect(spy.toLunar).not.toHaveBeenCalled()
    expect(spy.yearBoundary).not.toHaveBeenCalled()

    const outOfRange = calculateShengXiao('1900-12-31', '2026-09-09', spy)
    expect(outOfRange.phase).toBe('failure')
    if (outOfRange.phase === 'failure') {
      expect(outOfRange.failureCategory).toBe('unsupported_input')
      expect(outOfRange.failureDetailCode).toBe('UNSUPPORTED_DATE')
    }
    expect(spy.toLunar).not.toHaveBeenCalled()
    expect(spy.yearBoundary).not.toHaveBeenCalled()
  })

  it('注入抛错适配器时返回 engine_error 且无默认结果', () => {
    const failingAdapter: CalendarAdapter = {
      toLunar(): LunarDateInfo {
        throw new Error('engine failure')
      },
      yearBoundary(): YearBoundary {
        throw new Error('engine failure')
      },
    }
    const outcome = calculateShengXiao('2024-02-10', '2026-09-09', failingAdapter)
    expect(outcome.phase).toBe('failure')
    if (outcome.phase === 'failure') {
      expect(outcome.failureCategory).toBe('engine_error')
    }
  })

  it('显式 asOfDate 的当天/次日边界及 1901 下界', () => {
    // 2026-02-17 春节当日，asOfDate=同日 → success
    const dayOf = calculateShengXiao('2026-02-17', '2026-02-17')
    expect(dayOf.phase).toBe('success')

    // 2026-02-18 晚于 asOfDate=2026-02-17 → unsupported
    const future = calculateShengXiao('2026-02-18', '2026-02-17')
    expect(future.phase).toBe('failure')
    if (future.phase === 'failure') {
      expect(future.failureCategory).toBe('unsupported_input')
    }

    // 1901-01-01 下界（SX-001）→ success
    const lower = calculateShengXiao('1901-01-01', '2026-09-09')
    expect(lower.phase).toBe('success')
  })

  it('60 条分类预期经 classifyGanZhi 逐条匹配', () => {
    // 独立于日期样例：60 条输入仅含已确定干支
    for (const cc of fixture.classification_cases) {
      const got = classifyGanZhi(cc.inputGanZhi)
      expect(got.stemElement, cc.inputGanZhi).toBe(cc.stemElement)
      expect(got.yinYang, cc.inputGanZhi).toBe(cc.yinYang)
      expect(got.branchElement, cc.inputGanZhi).toBe(cc.branchElement)
      expect(got.naYin, cc.inputGanZhi).toBe(cc.naYin)
    }
  })

  it('默认适配器与黄金日期样例的年界一致（2026 样例）', () => {
    const boundary = lunarCalendarAdapter.yearBoundary(2026)
    expect(boundary.startDate).toBe('2026-02-17')
    expect(boundary.endDate).toBe('2027-02-05')
    expect(boundary.timezone).toBe('Asia/Shanghai')
  })

  // ── v2 回归：真实历法接口（不 mock 掉待修 calendar）──
  it('真实适配器 2024 年首与黄金 SX-105 一致', () => {
    // 甲辰年正月初一 2024-02-10（黄金 SX-105）；结束日 2025-01-28
    const b2024 = lunarCalendarAdapter.yearBoundary(2024)
    expect(b2024.startDate).toBe('2024-02-10')
    expect(b2024.endDate).toBe('2025-01-28')
  })

  it('真实适配器 2026 年首与黄金 SX-501 一致', () => {
    const b2026 = lunarCalendarAdapter.yearBoundary(2026)
    expect(b2026.startDate).toBe('2026-02-17')
    expect(b2026.endDate).toBe('2027-02-05')
  })

  it('真实适配器 1900 年首覆盖 1901-01-01 下界（黄金 SX-001）', () => {
    // 农历 1900（庚子）起 1900-01-31、止 1901-02-18；1901-01-01 落入其中
    const b1900 = lunarCalendarAdapter.yearBoundary(1900)
    expect(b1900.startDate).toBe('1900-01-31')
    expect(b1900.endDate).toBe('1901-02-18')
  })

  it('完整成功结果断言 2026-02-17（黄金 SX-501 全部字段）', () => {
    const outcome = calculateShengXiao('2026-02-17', '2026-02-17')
    // 必须先强断言 phase=success 再收窄字段，禁止 failure 直接 return 造成空过
    expect(outcome.phase).toBe('success')
    if (outcome.phase !== 'success') return
    expect(outcome.successQualifier).toBe('unique')
    expect(outcome.lunarDate).toBe('丙午年正月初一')
    expect(outcome.lunarYear).toBe(2026)
    expect(outcome.ganZhiYear).toBe('丙午')
    expect(outcome.animal).toBe('马')
    expect(outcome.earthlyBranch).toBe('午')
    expect(outcome.stemElement).toBe('火')
    expect(outcome.yinYang).toBe('阳')
    expect(outcome.branchElement).toBe('火')
    expect(outcome.naYin).toBe('天河水')
    expect(outcome.yearBoundary.startDate).toBe('2026-02-17')
    expect(outcome.yearBoundary.endDate).toBe('2027-02-05')
    // 预期版本从独立黄金 fixture 读取，不用生产常量生成期待值
    expect(outcome.ruleVersion).toBe(fixture.rule_version)
  })

  // ── v2/v3 回归：无效 asOfDate 不得误报为 unsupported，也不调用 adapter ──
  it('asOfDate 空串返回 engine_error 且不调用 adapter（spy 断言 0）', () => {
    const spy: CalendarAdapter = {
      toLunar: vi.fn((): LunarDateInfo => {
        throw new Error('adapter should not be called for invalid asOfDate')
      }),
      yearBoundary: vi.fn((): YearBoundary => {
        throw new Error('adapter should not be called for invalid asOfDate')
      }),
    }
    const outcome = calculateShengXiao('2024-02-10', '', spy)
    expect(outcome.phase).toBe('failure')
    if (outcome.phase === 'failure') {
      expect(outcome.failureCategory).toBe('engine_error')
    }
    expect(spy.toLunar).not.toHaveBeenCalled()
    expect(spy.yearBoundary).not.toHaveBeenCalled()
  })

  it('asOfDate 不可能日期返回 engine_error 且不调用 adapter（spy 断言 0）', () => {
    const spy: CalendarAdapter = {
      toLunar: vi.fn((): LunarDateInfo => {
        throw new Error('adapter should not be called for invalid asOfDate')
      }),
      yearBoundary: vi.fn((): YearBoundary => {
        throw new Error('adapter should not be called for invalid asOfDate')
      }),
    }
    const outcome = calculateShengXiao('2024-02-10', '2026-02-30', spy)
    expect(outcome.phase).toBe('failure')
    if (outcome.phase === 'failure') {
      expect(outcome.failureCategory).toBe('engine_error')
    }
    expect(spy.toLunar).not.toHaveBeenCalled()
    expect(spy.yearBoundary).not.toHaveBeenCalled()
  })

  it('asOfDate 未按 YYYY-MM-DD 格式返回 engine_error（spy 断言 0）', () => {
    const spy: CalendarAdapter = {
      toLunar: vi.fn((): LunarDateInfo => {
        throw new Error('adapter should not be called for malformed asOfDate')
      }),
      yearBoundary: vi.fn((): YearBoundary => {
        throw new Error('adapter should not be called for malformed asOfDate')
      }),
    }
    const outcome = calculateShengXiao('2024-02-10', 'today', spy)
    expect(outcome.phase).toBe('failure')
    if (outcome.phase === 'failure') {
      expect(outcome.failureCategory).toBe('engine_error')
    }
    expect(spy.toLunar).not.toHaveBeenCalled()
    expect(spy.yearBoundary).not.toHaveBeenCalled()
  })
})
