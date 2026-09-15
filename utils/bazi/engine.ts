/**
 * 八字领域引擎：把当次草稿编排为带版本的领域结果。
 *
 * 流程：结构校验 → 日期规范化 → 支持范围校验 → 取目标年与上一年节令 → 三柱与候选 → 结果信封。
 *
 * 状态与边界（契约 §12、治理规范 §7）：
 * - 状态复用 `types/tool-result.ts` 的全局四维，不新增并列总状态；
 * - 缺少出生时刻**不是失败**：成功限定取 `partial`（跨"节"时取 `candidate`），
 *   缺失项与完整性分母由 `missingFields` / `completeness` 承担；
 * - 早于支持下界返回 `unsupported_input`，未来日期返回 `invalid_input`（D9 裁决）；
 * - 依赖库异常一律返回 `engine_error`，**不回退**到默认日期、默认时辰或默认甲子（契约 §26）；
 * - 不读取系统时钟：`asOfDate` 必须由调用方显式传入；`asOfDate` 本身非法属调用方错误，抛异常。
 *
 * 结果摘要（`resultDigest`）与比对（`digestsMatch`）集中在本模块，供页面提交与服务端复算
 * 双方复用同一实现，避免两边逻辑漂移（交付规范 §7.3/§7.4）。
 *
 * @author LiXinwen
 */

import {
  BAZI_CONTENT_LABELS,
  BAZI_ENGINE_NAME,
  BAZI_ENGINE_VERSION,
  BAZI_ERROR_CODES,
  BAZI_LIMITATIONS,
  BAZI_NOT_OUTPUT,
  BAZI_RULE_VERSION,
  BAZI_SOURCE_SET_VERSION,
  BAZI_SUPPORT_START,
  type BaziErrorCode,
} from '~/constants/bazi-rules'
import type {
  BaziCalendarAdapter,
  BaziDomainResult,
  BaziEngineInput,
  BaziEngineOutcome,
  BaziLunarDate,
  BaziNormalizedInput,
  BaziRawDate,
  BaziResultDigest,
} from '~/types/bazi'
import type { ToolResultFailureCategory } from '~/types/tool-result'
import { compareIsoDates, parseDateString, toIsoDate } from '~/utils/shengxiao/date'
import { baziCalendarAdapter } from './calendar-adapter'
import { buildPillars, jieOccurrences } from './pillars'

/** 转换版本标识（规范化与对照结果随引擎与规则版本变化）。 */
export const BAZI_CONVERSION_VERSION = `${BAZI_ENGINE_NAME} ${BAZI_ENGINE_VERSION}`

/** asOfDate 非法（调用方/环境错误）时抛出，与用户输入非法区分。 */
export class InvalidAsOfDateError extends Error {
  constructor() {
    super('invalid asOfDate')
    this.name = 'InvalidAsOfDateError'
  }
}

const RAW_KEYS = ['calendar', 'year', 'month', 'day', 'isLeapMonth'] as const

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
}

function failure(
  category: ToolResultFailureCategory,
  detailCode: BaziErrorCode,
): BaziEngineOutcome {
  return {
    state: { phase: 'failure', failureCategory: category, failureDetailCode: detailCode },
    result: null,
  }
}

/** 结构校验：字段白名单、整数年月日、历法与闰月状态严格匹配。 */
function validateRaw(raw: BaziRawDate): { ok: true } | { ok: false; code: BaziErrorCode } {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, code: BAZI_ERROR_CODES.INVALID_DATE }
  }
  const keys = Object.keys(raw)
  // 缺字段属于"输入本身无效"（证据包 BZ-105）：R5 没有"用户要求的完整能力缺必要字段"
  // 的场景，故不使用 MISSING_FIELD；该码保留给后续阶段（如缺出生时刻的完整四柱能力）。
  if (RAW_KEYS.some(key => !(key in raw)) || keys.length !== RAW_KEYS.length) {
    return { ok: false, code: BAZI_ERROR_CODES.INVALID_DATE }
  }
  const calendar = (raw as { calendar?: unknown }).calendar
  if (calendar !== 'solar' && calendar !== 'lunar') {
    return { ok: false, code: BAZI_ERROR_CODES.INVALID_DATE }
  }
  const { year, month, day } = raw
  if (!isFiniteInteger(year) || !isFiniteInteger(month) || !isFiniteInteger(day)) {
    return { ok: false, code: BAZI_ERROR_CODES.INVALID_DATE }
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, code: BAZI_ERROR_CODES.INVALID_DATE }
  }
  if (calendar === 'solar') {
    // 公历无闰月概念：必须严格 null，不得默认 false。
    if (raw.isLeapMonth !== null) return { ok: false, code: BAZI_ERROR_CODES.INVALID_DATE }
  } else if (typeof raw.isLeapMonth !== 'boolean') {
    // 农历必须显式给出闰月状态，不得默认普通月。
    return { ok: false, code: BAZI_ERROR_CODES.INVALID_DATE }
  }
  return { ok: true }
}

/** 用户原始表达（用于日期对照的"原始表达"一栏，不参与计算）。 */
function describeRaw(raw: BaziRawDate): string {
  if (raw.calendar === 'solar') {
    return `公历 ${toIsoDate(raw.year, raw.month, raw.day)}`
  }
  const leap = raw.isLeapMonth ? '闰' : ''
  return `农历 ${raw.year}年${leap}${raw.month}月${raw.day}日`
}

/** 规范化：得到唯一公历日期与对应农历（含闰月状态）。 */
function normalize(
  raw: BaziRawDate,
  adapter: BaziCalendarAdapter,
): { ok: true; normalized: BaziNormalizedInput } | { ok: false; code: BaziErrorCode } {
  if (raw.calendar === 'solar') {
    const iso = toIsoDate(raw.year, raw.month, raw.day)
    if (!parseDateString(iso)) {
      return { ok: false, code: BAZI_ERROR_CODES.INVALID_DATE }
    }
    const lunar = adapter.solarToLunar(raw.year, raw.month, raw.day)
    return {
      ok: true,
      normalized: { raw, solarDate: iso, lunar, conversionVersion: BAZI_CONVERSION_VERSION },
    }
  }

  if (!adapter.isValidLunarDate(raw.year, raw.month, raw.day, raw.isLeapMonth)) {
    return { ok: false, code: BAZI_ERROR_CODES.INVALID_LUNAR_DATE }
  }
  const solarDate = adapter.lunarToSolar(raw.year, raw.month, raw.day, raw.isLeapMonth)
  const lunar: BaziLunarDate = {
    year: raw.year,
    month: raw.month,
    day: raw.day,
    isLeapMonth: raw.isLeapMonth,
  }
  return {
    ok: true,
    normalized: { raw, solarDate, lunar, conversionVersion: BAZI_CONVERSION_VERSION },
  }
}

/**
 * 计算八字领域结果。
 *
 * @param input 原始出生日期与显式的产品"今天"（asOfDate，Asia/Shanghai 公历日期）
 * @param adapter 历法适配器（默认生产适配器；测试可注入假实现）
 */
export function calculateBazi(
  input: BaziEngineInput,
  adapter: BaziCalendarAdapter = baziCalendarAdapter,
): BaziEngineOutcome {
  if (!parseDateString(input.asOfDate)) throw new InvalidAsOfDateError()

  const validated = validateRaw(input.raw)
  if (!validated.ok) return failure('invalid_input', validated.code)

  let normalized: BaziNormalizedInput
  try {
    const outcome = normalize(input.raw, adapter)
    if (!outcome.ok) return failure('invalid_input', outcome.code)
    normalized = outcome.normalized
  } catch {
    // 适配器异常（依赖库故障）与用户输入非法严格区分。
    return failure('engine_error', BAZI_ERROR_CODES.ENGINE_ERROR)
  }

  if (compareIsoDates(normalized.solarDate, BAZI_SUPPORT_START) < 0) {
    // 合法但超出已核验能力范围。
    return failure('unsupported_input', BAZI_ERROR_CODES.UNSUPPORTED_DATE)
  }
  if (compareIsoDates(normalized.solarDate, input.asOfDate) > 0) {
    // 未来出生日期无效。
    return failure('invalid_input', BAZI_ERROR_CODES.FUTURE_DATE)
  }

  const parsed = parseDateString(normalized.solarDate)
  if (!parsed) return failure('invalid_input', BAZI_ERROR_CODES.INVALID_DATE)
  const year = parsed.year

  let occurrences
  try {
    // 跨年时需要上一年的"节"（例如 1 月上旬的月支由上一年大雪决定）。
    occurrences = [
      ...jieOccurrences(year - 1, adapter.jieInstants(year - 1)),
      ...jieOccurrences(year, adapter.jieInstants(year)),
    ]
  } catch {
    return failure('engine_error', BAZI_ERROR_CODES.ENGINE_ERROR)
  }

  try {
    const built = buildPillars(normalized.solarDate, occurrences)
    const result: BaziDomainResult = {
      dayPillar: built.dayPillar,
      uniquePillars: built.uniquePillars,
      scenarios: built.scenarios,
      dateComparison: {
        originalExpression: describeRaw(normalized.raw),
        normalizedSolar: normalized.solarDate,
        lunar: normalized.lunar,
        conversionVersion: normalized.conversionVersion,
      },
      dayMaster: built.dayPillar.stem,
      uncertainty: built.uncertainty,
      missingFields: ['hour_pillar'],
      completeness: { provided: 3, total: 4 },
      limitations: [...BAZI_LIMITATIONS],
      notOutput: [...BAZI_NOT_OUTPUT],
      contentLabels: [...BAZI_CONTENT_LABELS],
      ruleVersion: BAZI_RULE_VERSION,
      sourceSetVersion: BAZI_SOURCE_SET_VERSION,
      engineName: BAZI_ENGINE_NAME,
      engineVersion: BAZI_ENGINE_VERSION,
    }
    return {
      state: {
        phase: 'success',
        // D6 裁决：跨边界取 candidate（完整性由 completeness 承担），否则 partial。
        successQualifier: built.uncertainty ? 'candidate' : 'partial',
        freshness: 'current',
      },
      result,
    }
  } catch {
    return failure('engine_error', BAZI_ERROR_CODES.ENGINE_ERROR)
  }
}

/** 取结果摘要（保存请求与服务端复算共用）。 */
export function resultDigest(result: BaziDomainResult): BaziResultDigest {
  if (!result.uniquePillars && !result.scenarios) {
    throw new Error('incomplete bazi result')
  }
  return {
    solarDate: result.dateComparison.normalizedSolar,
    successQualifier: result.scenarios ? 'candidate' : 'partial',
    dayPillar: result.dayPillar,
    uniquePillars: result.uniquePillars,
    scenarios: result.scenarios,
  }
}

function samePillar(
  a: { stem: string; branch: string },
  b: { stem: string; branch: string },
): boolean {
  return a.stem === b.stem && a.branch === b.branch
}

function sameScenario(a: BaziResultDigest['scenarios'], b: BaziResultDigest['scenarios']): boolean {
  if (a === null || b === null) return a === b
  if (a.length !== b.length) return false
  return a.every((item, index) => {
    const other = b[index]
    return (
      item.branch === other.branch &&
      samePillar(item.yearPillar, other.yearPillar) &&
      samePillar(item.monthPillar, other.monthPillar)
    )
  })
}

/**
 * 比对客户端摘要与服务端复算摘要。
 * 比对范围：规范化公历日期、成功限定、日柱、以及年/月柱（唯一情形或候选情形整组）。
 * 不一致即拒绝保存（交付规范 §7.4），不做部分接受。
 */
export function digestsMatch(a: BaziResultDigest, b: BaziResultDigest): boolean {
  if (a.solarDate !== b.solarDate) return false
  if (a.successQualifier !== b.successQualifier) return false
  if (!samePillar(a.dayPillar, b.dayPillar)) return false
  if (a.uniquePillars && b.uniquePillars) {
    return (
      samePillar(a.uniquePillars.year, b.uniquePillars.year) &&
      samePillar(a.uniquePillars.month, b.uniquePillars.month)
    )
  }
  if (a.uniquePillars || b.uniquePillars) return false
  return sameScenario(a.scenarios, b.scenarios)
}
