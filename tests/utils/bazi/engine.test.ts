import { describe, expect, it } from 'vitest'
import type { BaziCalendarAdapter, BaziEngineOutcome } from '~/types/bazi'
import {
  InvalidAsOfDateError,
  calculateBazi,
  digestsMatch,
  resultDigest,
} from '~/utils/bazi/engine'

/**
 * 引擎编排与状态：partial / candidate、三类失败映射、农历两类输入错误、
 * 适配器故障不回退、结果稳定性，以及保存用的摘要比对。
 *
 * 期望值来源：契约 §12（状态复用四维）、§26（不得回退默认）、D6（跨界取 candidate、
 * 完整性由 completeness 承担）、D9（早于下界 unsupported、未来日期 invalid）、
 * 证据包 BZ-102/BZ-103/BZ-105 与交付规范 §7.4（复算比对不部分接受）。
 */

const AS_OF = '2026-09-14'

const baseInput = {
  raw: { calendar: 'solar', year: 2000, month: 8, day: 15, isLeapMonth: null } as const,
  asOfDate: AS_OF,
}

/** 抛错的适配器：模拟依赖库故障，必须映射为 engine_error 且不回退。 */
const brokenAdapter: BaziCalendarAdapter = {
  jieInstants() {
    throw new Error('library failure')
  },
  solarToLunar() {
    throw new Error('library failure')
  },
  isValidLunarDate() {
    throw new Error('library failure')
  },
  lunarToSolar() {
    throw new Error('library failure')
  },
  dayGanZhi() {
    throw new Error('library failure')
  },
}

describe('八字引擎', () => {
  it('只有出生日期时永远为 partial，且完整性写明 3/4、缺失项为时柱', () => {
    const outcome = calculateBazi(baseInput)
    expect(outcome.state).toEqual({
      phase: 'success',
      successQualifier: 'partial',
      freshness: 'current',
    })
    expect(outcome.result?.completeness).toEqual({ provided: 3, total: 4 })
    expect(outcome.result?.missingFields).toEqual(['hour_pillar'])
    expect(outcome.result?.uniquePillars).not.toBeNull()
    expect(outcome.result?.scenarios).toBeNull()
    expect(outcome.result?.uncertainty).toBeNull()
    expect(outcome.result?.dayMaster).toBe(outcome.result?.dayPillar.stem)
    // 结果自带版本与限制说明（页面 Ⅴ 段直接消费，不允许页面自行改写）。
    expect(outcome.result?.ruleVersion).toBe('2026-09-14-bazi-date-v1')
    expect(outcome.result?.sourceSetVersion).toBe(outcome.result?.ruleVersion)
    expect(outcome.result?.limitations.length).toBeGreaterThan(0)
    expect(outcome.result?.notOutput).toContain('时柱')
    expect(outcome.result?.contentLabels).toEqual(['计算结果', '项目整理'])
  })

  it('跨「节」当日：candidate 且恰好两个完整情形，日柱仍然唯一', () => {
    const outcome = calculateBazi({
      raw: { calendar: 'solar', year: 2000, month: 8, day: 7, isLeapMonth: null },
      asOfDate: AS_OF,
    })
    expect(outcome.state).toMatchObject({ phase: 'success', successQualifier: 'candidate' })
    expect(outcome.result?.uniquePillars).toBeNull()
    expect(outcome.result?.scenarios).toHaveLength(2)
    expect(outcome.result?.uncertainty?.reason).toBe('boundary_crossing')
    // 日柱不因缺时刻而丢失。
    expect(outcome.result?.dayPillar.stem.length).toBe(1)
  })

  it('非法日期与未来日期都归 invalid_input，并给出可区分的详细码', () => {
    const notExist = calculateBazi({
      raw: { calendar: 'solar', year: 2001, month: 2, day: 30, isLeapMonth: null },
      asOfDate: AS_OF,
    })
    expect(notExist.state).toMatchObject({
      phase: 'failure',
      failureCategory: 'invalid_input',
      failureDetailCode: 'INVALID_DATE',
    })
    expect(notExist.result).toBeNull()

    const future = calculateBazi({
      raw: { calendar: 'solar', year: 2027, month: 1, day: 1, isLeapMonth: null },
      asOfDate: AS_OF,
    })
    expect(future.state).toMatchObject({
      phase: 'failure',
      failureCategory: 'invalid_input',
      failureDetailCode: 'FUTURE_DATE',
    })
  })

  it('早于支持下界归 unsupported_input（合法日期但超出已核验能力）', () => {
    const outcome = calculateBazi({
      raw: { calendar: 'solar', year: 1900, month: 12, day: 31, isLeapMonth: null },
      asOfDate: AS_OF,
    })
    expect(outcome.state).toMatchObject({
      phase: 'failure',
      failureCategory: 'unsupported_input',
      failureDetailCode: 'UNSUPPORTED_DATE',
    })
    expect(outcome.result).toBeNull()
  })

  it('结构非法：缺字段、非整数、闰月状态与历法不匹配都归 INVALID_DATE', () => {
    const missing = calculateBazi({
      raw: { calendar: 'solar', year: 2000, month: 8 } as never,
      asOfDate: AS_OF,
    })
    expect(missing.state).toMatchObject({ failureDetailCode: 'INVALID_DATE' })

    const solarWithLeap = calculateBazi({
      raw: { calendar: 'solar', year: 2000, month: 8, day: 15, isLeapMonth: false } as never,
      asOfDate: AS_OF,
    })
    expect(solarWithLeap.state).toMatchObject({ failureDetailCode: 'INVALID_DATE' })

    const lunarWithoutLeap = calculateBazi({
      raw: { calendar: 'lunar', year: 2000, month: 7, day: 16, isLeapMonth: null } as never,
      asOfDate: AS_OF,
    })
    expect(lunarWithoutLeap.state).toMatchObject({ failureDetailCode: 'INVALID_DATE' })
  })

  it('农历输入：合法日期给出公历对照，不存在的闰月归 INVALID_LUNAR_DATE', () => {
    const ok = calculateBazi({
      raw: { calendar: 'lunar', year: 2000, month: 7, day: 16, isLeapMonth: false },
      asOfDate: AS_OF,
    })
    expect(ok.state.phase).toBe('success')
    expect(ok.result?.dateComparison.normalizedSolar).toBe('2000-08-15')
    expect(ok.result?.dateComparison.originalExpression).toContain('农历')
    expect(ok.result?.dateComparison.lunar.isLeapMonth).toBe(false)

    // 2023 年闰二月存在，但不存在的闰月（如闰七月）必须判为无效输入。
    const invalid = calculateBazi({
      raw: { calendar: 'lunar', year: 2023, month: 7, day: 1, isLeapMonth: true },
      asOfDate: AS_OF,
    })
    expect(invalid.state).toMatchObject({
      phase: 'failure',
      failureCategory: 'invalid_input',
      failureDetailCode: 'INVALID_LUNAR_DATE',
    })
  })

  it('适配器故障归 engine_error：不回退默认日期、默认时辰或默认甲子', () => {
    const outcome = calculateBazi(baseInput, brokenAdapter)
    expect(outcome.state).toMatchObject({
      phase: 'failure',
      failureCategory: 'engine_error',
      failureDetailCode: 'ENGINE_ERROR',
    })
    expect(outcome.result).toBeNull()
  })

  it('同一输入与查询当日的结果稳定（可复算、可保存）', () => {
    const first = calculateBazi(baseInput)
    const second = calculateBazi(baseInput)
    expect(second).toEqual(first)
    const lunar = calculateBazi({
      raw: { calendar: 'lunar', year: 2000, month: 7, day: 16, isLeapMonth: false },
      asOfDate: AS_OF,
    })
    expect(lunar.result?.dayPillar).toEqual(first.result?.dayPillar)
    expect(lunar.result?.dateComparison.normalizedSolar).toBe(
      first.result?.dateComparison.normalizedSolar,
    )
  })

  it('asOfDate 非法属调用方错误：直接抛错，不返回失败状态', () => {
    expect(() => calculateBazi({ ...baseInput, asOfDate: '2026-13-01' })).toThrow(
      InvalidAsOfDateError,
    )
  })

  it('结果摘要覆盖日期、成功限定、日柱与年月柱（唯一或候选整组）', () => {
    const unique = calculateBazi(baseInput) as BaziEngineOutcome & {
      result: NonNullable<BaziEngineOutcome['result']>
    }
    const digest = resultDigest(unique.result)
    expect(digest.solarDate).toBe('2000-08-15')
    expect(digest.successQualifier).toBe('partial')
    expect(digest.uniquePillars).toEqual(unique.result.uniquePillars)
    expect(digest.scenarios).toBeNull()
    expect(digestsMatch(digest, resultDigest(unique.result))).toBe(true)

    // 任何一项被改动都不再匹配：不做部分接受。
    expect(digestsMatch(digest, { ...digest, solarDate: '2000-08-16' })).toBe(false)
    expect(
      digestsMatch(digest, {
        ...digest,
        dayPillar: { ...digest.dayPillar, stem: digest.dayPillar.stem === '甲' ? '乙' : '甲' },
      }),
    ).toBe(false)
    expect(
      digestsMatch(digest, {
        ...digest,
        uniquePillars: null,
        scenarios: [{ ...unique.result.scenarios?.[0] } as never],
      }),
    ).toBe(false)

    const candidate = calculateBazi({
      raw: { calendar: 'solar', year: 2000, month: 8, day: 7, isLeapMonth: null },
      asOfDate: AS_OF,
    })
    const candidateDigest = resultDigest(candidate.result!)
    expect(candidateDigest.successQualifier).toBe('candidate')
    expect(candidateDigest.uniquePillars).toBeNull()
    expect(digestsMatch(candidateDigest, resultDigest(candidate.result!))).toBe(true)
    // 唯一情形与候选情形不可互相匹配。
    expect(digestsMatch(digest, candidateDigest)).toBe(false)
  })
})
