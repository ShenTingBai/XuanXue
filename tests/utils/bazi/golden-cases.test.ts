/**
 * 八字黄金样例测试（R5 首批：日期级三柱 + 节气边界候选 + 范围与失败）。
 *
 * 期望值来源：`docs/product/evidence/bazi/bazi-golden-cases.yaml`（经 A 级来源核验的独立资料），
 * 由 `tests/fixtures/bazi-golden.json` 消费——与 R3 的 `shengxiao-golden.json` 同一做法，
 * 避免在测试期依赖未声明的 YAML 解析包（`yaml` 仅为传递依赖）。
 *
 * 防漂移：fixture 记录了证据 YAML 的 SHA256。若证据文件被改动而未重新生成 fixture，
 * 第一条用例会失败并给出重新生成提示，不会静默使用过时期望值。
 *
 * 覆盖性：参照样例（无 expectedPhase）逐条显式断言；管道样例按 `expectedPhase` 统一驱动，
 * 并有一条用例断言两类合计恰好覆盖 fixture 全部 caseId，防止漏测被静默放过。
 *
 * @author LiXinwen
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BAZI_JIE, BAZI_WUHU } from '~/constants/bazi-rules'
import type { BaziLunarDate, BaziPillar, BaziRawDate } from '~/types/bazi'
import { baziCalendarAdapter } from '~/utils/bazi/calendar-adapter'
import { calculateBazi } from '~/utils/bazi/engine'
import { lunarDayName } from '~/utils/self-profile/display'

const FIXTURE_REL = 'tests/fixtures/bazi-golden.json'
const SOURCE_REL = 'docs/product/evidence/bazi/bazi-golden-cases.yaml'

interface PillarExpectation {
  stem: string
  branch: string
}

interface ScenarioExpectation {
  yearPillar?: PillarExpectation
  monthPillar?: PillarExpectation
  reason?: string
}

/** 管道样例的 expected 形状（BZ-401 的 expected 是数组、BZ-402 是映射，单独在参照样例中处理）。 */
interface CaseExpected {
  successQualifier?: string
  dayPillar?: PillarExpectation
  yearPillar?: PillarExpectation
  monthPillar?: PillarExpectation
  isLeapMonth?: boolean
  lunarDate?: string
  solarDate?: string
  roundTrip?: string
  boundaryTerm?: string
  boundaryInstant?: string
  scenarioCount?: number
  scenarios?: ScenarioExpectation[]
}

interface TermInstantExpectation {
  term: string
  jstAtSource?: string
  beijingInstant: string
  beijingDate: string
}

interface GoldenCase {
  caseId: string
  kind: string
  asOfDate?: string
  originalInput?: {
    calendar: 'solar' | 'lunar'
    year?: number
    month?: number
    day?: number
    isLeapMonth?: boolean
  }
  expected?: unknown
  expectedPhase?: 'success' | 'failure'
  failureCategory?: string
  failureDetailCode?: string
  members?: Record<string, number>
  quote?: { verse?: string }
}

const fixture = JSON.parse(readFileSync(resolve(process.cwd(), FIXTURE_REL), 'utf-8')) as {
  source: { path: string; sha256: string; ruleVersion: string; sourceSetVersion: string }
  cases: GoldenCase[]
}
const cases = fixture.cases
const byId = new Map(cases.map(item => [item.caseId, item]))
const pipelineCases = cases.filter(item => item.expectedPhase !== undefined)
const referenceCases = cases.filter(item => item.expectedPhase === undefined)

const EVIDENCE_MONTHS = [
  '',
  '正月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '腊月',
]

/** 证据文件中的农历展示写法（月 11 记作「十一月」，不是展示层的「冬月」）。 */
function formatLunarForEvidence(lunar: BaziLunarDate): string {
  return `${lunar.isLeapMonth ? '闰' : ''}${EVIDENCE_MONTHS[lunar.month]}${lunarDayName(lunar.day)}`
}

function rawFromCase(item: GoldenCase): BaziRawDate {
  const input = item.originalInput!
  if (input.calendar === 'lunar') {
    return {
      calendar: 'lunar',
      year: input.year as number,
      month: input.month as number,
      day: input.day as number,
      isLeapMonth: input.isLeapMonth === true,
    }
  }
  return {
    calendar: 'solar',
    year: input.year as number,
    month: input.month as number,
    day: input.day as number,
    isLeapMonth: null,
  }
}

function expectPillar(actual: BaziPillar, expected: PillarExpectation): void {
  expect({ stem: actual.stem, branch: actual.branch }).toEqual({
    stem: expected.stem,
    branch: expected.branch,
  })
}

describe('bazi 黄金样例 fixture', () => {
  it('fixture 与证据文件同步（SHA256 防漂移）', () => {
    const sourceBytes = readFileSync(resolve(process.cwd(), SOURCE_REL))
    const digest = createHash('sha256').update(sourceBytes).digest('hex')
    expect(
      digest,
      '证据 YAML 已变更：请重新生成 tests/fixtures/bazi-golden.json（生成脚本见 docs/validation 记录）',
    ).toBe(fixture.source.sha256)
    expect(fixture.source.path).toBe(SOURCE_REL)
  })

  it('样例分类总数一致（29 例 = 5 参照 + 24 管道）', () => {
    expect(cases.length).toBe(29)
    expect(referenceCases.length).toBe(5)
    expect(pipelineCases.length).toBe(24)
  })
})

describe('bazi 参照样例（定义表、时刻与规则表）', () => {
  it('BZ-301 十二个"节"的黄经与国标附录 A 一致', () => {
    const members = byId.get('BZ-301')!.members!
    expect(BAZI_JIE.length).toBe(12)
    for (const definition of BAZI_JIE) {
      expect(definition.longitude).toBe(members[definition.name])
    }
  })

  it('BZ-401 2026 年十二个"节"的北京时间时刻与日历日', () => {
    const expected = byId.get('BZ-401')!.expected as TermInstantExpectation[]
    expect(expected.length).toBe(12)
    const instants = baziCalendarAdapter.jieInstants(2026)
    for (const item of expected) {
      const actual = instants[item.term as keyof typeof instants]
      expect(actual.instant).toBe(item.beijingInstant)
      expect(actual.date).toBe(item.beijingDate)
    }
  })

  it('BZ-402 2000 年十二个"节"的日历日与香港天文台对照表一致', () => {
    const expected = byId.get('BZ-402')!.expected as Record<string, string>
    expect(Object.keys(expected).length).toBe(12)
    const instants = baziCalendarAdapter.jieInstants(2000)
    for (const [term, date] of Object.entries(expected)) {
      expect(instants[term as keyof typeof instants].date).toBe(date)
    }
  })

  it('BZ-403 芒种跨 JST/CST 日界（北京时间 2026-06-05 23:48）', () => {
    const expected = byId.get('BZ-403')!.expected as { beijingDate: string }
    const instants = baziCalendarAdapter.jieInstants(2026)
    expect(instants['芒种'].instant).toBe('2026-06-05 23:48')
    expect(instants['芒种'].date).toBe(expected.beijingDate)
  })

  it('BZ-605 五虎遁月干表与《三命通会》古歌逐项一致', () => {
    const quote = byId.get('BZ-605')!.quote!
    expect(quote.verse).toContain('甲已之年丙作首')
    expect(BAZI_WUHU).toEqual({
      甲: '丙',
      己: '丙',
      乙: '戊',
      庚: '戊',
      丙: '庚',
      辛: '庚',
      丁: '壬',
      壬: '壬',
      戊: '甲',
      癸: '甲',
    })
  })
})

describe('bazi 管道样例（按 expectedPhase 驱动）', () => {
  for (const item of pipelineCases) {
    it(`${item.caseId} ${item.kind}`, () => {
      const outcome = calculateBazi({ raw: rawFromCase(item), asOfDate: item.asOfDate! })

      if (item.expectedPhase === 'failure') {
        expect(outcome.state.phase).toBe('failure')
        expect(outcome.result).toBeNull()
        if (outcome.state.phase === 'failure') {
          expect(outcome.state.failureCategory).toBe(item.failureCategory)
          expect(outcome.state.failureDetailCode).toBe(item.failureDetailCode)
        }
        return
      }

      expect(outcome.state.phase).toBe('success')
      const result = outcome.result
      expect(result).not.toBeNull()
      if (!result) return

      // R5 不变量：缺时柱不是失败，完整性分母恒为 3/4。
      expect(result.missingFields).toEqual(['hour_pillar'])
      expect(result.completeness).toEqual({ provided: 3, total: 4 })
      expect(result.notOutput).toContain('时柱')
      expect(result.ruleVersion).toBe(fixture.source.ruleVersion)
      expect(result.sourceSetVersion).toBe(fixture.source.sourceSetVersion)

      const expected = (item.expected ?? {}) as CaseExpected

      if (expected.successQualifier) {
        expect(outcome.state.phase === 'success' && outcome.state.successQualifier).toBe(
          expected.successQualifier,
        )
      }
      if (expected.dayPillar) expectPillar(result.dayPillar, expected.dayPillar)

      if (expected.yearPillar || expected.monthPillar) {
        expect(result.uniquePillars).not.toBeNull()
        if (result.uniquePillars) {
          if (expected.yearPillar) expectPillar(result.uniquePillars.year, expected.yearPillar)
          if (expected.monthPillar) expectPillar(result.uniquePillars.month, expected.monthPillar)
        }
      }

      if (expected.scenarioCount !== undefined) {
        expect(result.scenarios).not.toBeNull()
        expect(result.scenarios?.length).toBe(expected.scenarioCount)
      }

      if (expected.scenarios) {
        // 候选情形必须整组比对年柱+月柱：不存在跨情形拼合出来的可能组合。
        expected.scenarios.forEach((scenarioExpected, index) => {
          const actual = result.scenarios?.[index]
          expect(actual).toBeDefined()
          if (!actual) return
          if (scenarioExpected.yearPillar) {
            expectPillar(actual.yearPillar, scenarioExpected.yearPillar)
          }
          if (scenarioExpected.monthPillar) {
            expectPillar(actual.monthPillar, scenarioExpected.monthPillar)
          }
          if (scenarioExpected.reason) expect(actual.reason).toContain(scenarioExpected.reason)
        })
      }

      if (expected.boundaryTerm) {
        expect(result.uncertainty?.boundary.term).toBe(expected.boundaryTerm)
        expect(result.uncertainty?.affected.length).toBeGreaterThan(0)
      }
      if (expected.boundaryInstant) {
        expect(result.uncertainty?.boundary.instant).toBe(expected.boundaryInstant)
      }

      if (expected.solarDate) {
        expect(result.dateComparison.normalizedSolar).toBe(expected.solarDate)
      }

      if (expected.isLeapMonth !== undefined) {
        expect(result.dateComparison.lunar.isLeapMonth).toBe(expected.isLeapMonth)
      }

      if (expected.lunarDate) {
        // 结构 → 证据写法交叉核对（月 11 在证据中记作「十一月」）。
        expect(formatLunarForEvidence(result.dateComparison.lunar)).toBe(expected.lunarDate)
      }

      if (expected.roundTrip) {
        expect(expected.roundTrip).toContain(formatLunarForEvidence(result.dateComparison.lunar))
      }
    })
  }
})

describe('bazi 样例覆盖性', () => {
  it('参照样例与管道样例合计覆盖 fixture 全部 caseId', () => {
    const covered = [...referenceCases, ...pipelineCases].map(item => item.caseId).sort()
    const all = cases.map(item => item.caseId).sort()
    expect(covered).toEqual(all)
  })
})
