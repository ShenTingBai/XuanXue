/**
 * 本人档案出生日期规范化纯函数（前后端共用）。
 *
 * 职责：把用户原始出生日期表达（公历/农历 + 闰月状态）校验并规范化为唯一公历日期。
 * 边界约束：
 * - 不读取时钟/网络/认证/存储；asOfDate 由调用方显式传入；
 * - 不调用生肖分类或旧八字规则；只复用 utils/shengxiao/date 的纯公历校验；
 * - 所有年月日必须是有限整数；拒绝数字字符串、NaN、无穷、小数、数组、
 *   未知历法、缺字段与额外字段（防止把未确认草稿当作合法 RawBirthDate）；
 * - 农历月/日必须先经 LunarYear 真实月份表核验，不存在的闰月或越界日直接拒绝，
 *   不让依赖自动滚动到相邻月；
 * - 转换使用 lunar-javascript 真实 API 并 round-trip 核对原农历年/月/日；
 * - 规范化公历范围 1901-01-01 至 asOfDate；原历法字段必须保留。
 *
 * @author LiXinwen
 */

import { Lunar, LunarYear } from 'lunar-javascript'
import type { RawBirthDate, NormalizedBirthDate, SelfProfileErrorCode } from '~/types/self-profile'
import {
  SELF_PROFILE_CONVERSION_VERSION,
  SELF_PROFILE_MIN_AGE,
  SELF_PROFILE_MIN_SOLAR_DATE,
} from '~/constants/self-profile-policy'
import { parseDateString, toIsoDate, compareIsoDates } from '~/utils/shengxiao/date'

/** asOfDate 无效（调用方/环境错误）时抛出的错误，与输入非法区分。 */
export class InvalidAsOfDateError extends Error {
  constructor() {
    super('invalid asOfDate')
    this.name = 'InvalidAsOfDateError'
  }
}

/** 规范化结果：成功返回规范化出生日期；失败返回固定错误码与字段键。 */
export type NormalizeBirthDateResult =
  | { ok: true; birthDate: NormalizedBirthDate }
  | {
      ok: false
      error: { code: SelfProfileErrorCode; field?: string }
    }

const RAW_FIELDS = ['calendar', 'year', 'month', 'day', 'isLeapMonth'] as const

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

/**
 * 校验 asOfDate 为合法 YYYY-MM-DD；无效属于调用方错误，抛 InvalidAsOfDateError。
 * 不用系统今天生成预期，调用方必须显式传入校验当日。
 */
function requireValidAsOfDate(asOfDate: string): void {
  if (!parseDateString(asOfDate)) {
    throw new InvalidAsOfDateError()
  }
}

/**
 * 规范化出生日期。返回规范化公历日期或固定错误码。
 *
 * 公历：校验真实日期且在支持范围，isLeapMonth 必须为 null。
 * 农历：先从 LunarYear.fromYear(year).getMonthsInYear() 筛选 getYear()==year 且
 *   getMonth()==(isLeapMonth ? -month : month)，再核对 getDayCount；不存在的闰月
 *   或越界日直接拒绝。候选农历年份仅允许 1900 至 asOfDate 公历年
 *   （1901 下界对应的农历可为 1900）。转换异常以固定 UNSUPPORTED_DATE 返回，不记录 raw。
 */
export function normalizeBirthDate(raw: RawBirthDate, asOfDate: string): NormalizeBirthDateResult {
  requireValidAsOfDate(asOfDate)

  // 结构校验：必须纯对象、字段白名单、无额外键、无缺键。
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: { code: 'INVALID_INPUT' } }
  }
  const keys = Object.keys(raw)
  if (keys.length !== RAW_FIELDS.length || RAW_FIELDS.some(k => !(k in raw))) {
    return { ok: false, error: { code: 'INVALID_INPUT' } }
  }

  const calendar = raw.calendar
  if (calendar !== 'solar' && calendar !== 'lunar') {
    return { ok: false, error: { code: 'INVALID_INPUT' } }
  }

  const { year, month, day } = raw
  if (
    !isFiniteInteger(year) ||
    !isFiniteInteger(month) ||
    !isFiniteInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return { ok: false, error: { code: 'INVALID_INPUT' } }
  }

  const asOfYear = Number(asOfDate.slice(0, 4))

  if (calendar === 'solar') {
    // 公历无闰月概念：isLeapMonth 必须严格 null，不能默认 false。
    if (raw.isLeapMonth !== null) {
      return { ok: false, error: { code: 'INVALID_INPUT', field: 'isLeapMonth' } }
    }
    if (year < 1901 || year > asOfYear) {
      return { ok: false, error: { code: 'UNSUPPORTED_DATE', field: 'year' } }
    }
    const iso = toIsoDate(year, month, day)
    if (!parseDateString(iso)) {
      return { ok: false, error: { code: 'INVALID_INPUT', field: 'day' } }
    }
    if (compareIsoDates(iso, SELF_PROFILE_MIN_SOLAR_DATE) < 0) {
      return { ok: false, error: { code: 'UNSUPPORTED_DATE', field: 'year' } }
    }
    if (compareIsoDates(iso, asOfDate) > 0) {
      return { ok: false, error: { code: 'UNSUPPORTED_DATE', field: 'year' } }
    }
    return {
      ok: true,
      birthDate: {
        raw: { ...raw, isLeapMonth: null },
        solarDate: iso,
        conversionVersion: SELF_PROFILE_CONVERSION_VERSION,
        confirmedAt: '',
      },
    }
  }

  // 农历：isLeapMonth 必须显式布尔；候选农历年份仅 1900 至 asOfDate 公历年。
  if (typeof raw.isLeapMonth !== 'boolean') {
    return { ok: false, error: { code: 'INVALID_INPUT', field: 'isLeapMonth' } }
  }
  if (year < 1900 || year > asOfYear) {
    return { ok: false, error: { code: 'UNSUPPORTED_DATE', field: 'year' } }
  }

  const monthTarget = raw.isLeapMonth ? -month : month
  let monthsOfYear: Array<{ getYear(): number; getMonth(): number; getDayCount(): number }>
  try {
    monthsOfYear = LunarYear.fromYear(year).getMonthsInYear()
  } catch {
    return { ok: false, error: { code: 'UNSUPPORTED_DATE', field: 'year' } }
  }
  // LunarYear 的 months 未按农历年过滤，必须先按 getYear()==year 且 getMonth()==目标筛选。
  const match = monthsOfYear.find(m => m.getYear() === year && m.getMonth() === monthTarget)
  if (!match) {
    return { ok: false, error: { code: 'INVALID_INPUT', field: 'month' } }
  }
  if (day > match.getDayCount()) {
    // 不存在的日期直接拒绝，不让依赖自动滚动到其他月份。
    return { ok: false, error: { code: 'INVALID_INPUT', field: 'day' } }
  }

  // 真实 API 转换 + round-trip 核对原农历年/月/日；异常以固定 UNSUPPORTED_DATE 返回。
  let solar
  try {
    const lunar = Lunar.fromYmd(year, monthTarget, day)
    solar = lunar.getSolar()
    const back = solar.getLunar()
    if (back.getYear() !== year || back.getMonth() !== monthTarget || back.getDay() !== day) {
      // 转换发生了滚动：不静默接受，视为该农历日期不可用。
      return { ok: false, error: { code: 'INVALID_INPUT' } }
    }
  } catch {
    return { ok: false, error: { code: 'UNSUPPORTED_DATE' } }
  }

  const solarDate = toIsoDate(solar.getYear(), solar.getMonth(), solar.getDay())
  if (compareIsoDates(solarDate, SELF_PROFILE_MIN_SOLAR_DATE) < 0) {
    return { ok: false, error: { code: 'UNSUPPORTED_DATE', field: 'year' } }
  }
  if (compareIsoDates(solarDate, asOfDate) > 0) {
    return { ok: false, error: { code: 'UNSUPPORTED_DATE', field: 'year' } }
  }

  return {
    ok: true,
    birthDate: {
      raw: { calendar: 'lunar', year, month, day, isLeapMonth: raw.isLeapMonth },
      solarDate,
      conversionVersion: SELF_PROFILE_CONVERSION_VERSION,
      confirmedAt: '',
    },
  }
}

/**
 * 服务端按完整公历生日周年比较是否已满最小年龄。
 *
 * 规则：年龄 = asOfYear - birthYear，再按月日是否已到周年扣 1；2 月 29 日出生在
 * 非闰年时，2 月 28 日尚未到周年、3 月 1 日已到；不只比较年份。
 * asOfDate 无效抛 InvalidAsOfDateError；solarDate 假定已通过 normalizeBirthDate 校验。
 */
export function isAtLeastFourteen(solarDate: string, asOfDate: string): boolean {
  requireValidAsOfDate(asOfDate)
  const birth = parseDateString(solarDate)
  if (!birth) {
    throw new InvalidAsOfDateError()
  }
  const asOf = parseDateString(asOfDate)
  if (!asOf) {
    throw new InvalidAsOfDateError()
  }

  const age = asOf.year - birth.year
  if (age < SELF_PROFILE_MIN_AGE) return false

  // 周年是否已到：比较当前月/日与出生月/日（含闰日特殊规则）。
  let reached: boolean
  if (birth.month === 2 && birth.day === 29 && !isLeapYear(asOf.year)) {
    // 非闰年无 2/29：周年视为 3 月 1 日；2 月 28 日尚未到。
    reached = asOf.month > 3 || (asOf.month === 3 && asOf.day >= 1)
  } else if (asOf.month > birth.month) {
    reached = true
  } else if (asOf.month < birth.month) {
    reached = false
  } else {
    reached = asOf.day >= birth.day
  }
  if (!reached) {
    return age - 1 >= SELF_PROFILE_MIN_AGE
  }
  return age >= SELF_PROFILE_MIN_AGE
}

/** 展示用出生日期描述：原始表达 + 规范化公历日期。 */
export interface BirthDateDescription {
  raw: RawBirthDate
  solarDate: string
  conversionVersion: string
}

/** 描述规范化出生日期（供页面展示原历法表达与规范化公历）。 */
export function describeBirthDate(birthDate: NormalizedBirthDate): BirthDateDescription {
  return {
    raw: birthDate.raw,
    solarDate: birthDate.solarDate,
    conversionVersion: birthDate.conversionVersion,
  }
}

/** 单个日期组差异条目。 */
export interface BirthDateDiffEntry {
  status: 'added' | 'modified' | 'kept'
  /** 原表达（首次创建为 null）。 */
  fromRaw: RawBirthDate | null
  /** 新表达。 */
  toRaw: RawBirthDate
  /** 原规范化公历（首次创建为 null）。 */
  fromSolarDate: string | null
  /** 新规范化公历。 */
  toSolarDate: string
}

/**
 * 比较整个出生日期字段组（差异确认用）。
 *
 * 原历法变化即使规范化到同一天也视为「修改」；相同字段组返回 kept。
 * confirmedAt 不参与比较（由服务端保存时生成）。
 */
export function diffBirthDate(
  current: NormalizedBirthDate | null,
  candidate: NormalizedBirthDate,
): BirthDateDiffEntry {
  if (!current) {
    return {
      status: 'added',
      fromRaw: null,
      toRaw: candidate.raw,
      fromSolarDate: null,
      toSolarDate: candidate.solarDate,
    }
  }
  const sameRaw =
    current.raw.calendar === candidate.raw.calendar &&
    current.raw.year === candidate.raw.year &&
    current.raw.month === candidate.raw.month &&
    current.raw.day === candidate.raw.day &&
    current.raw.isLeapMonth === candidate.raw.isLeapMonth
  if (sameRaw && current.solarDate === candidate.solarDate) {
    return {
      status: 'kept',
      fromRaw: current.raw,
      toRaw: candidate.raw,
      fromSolarDate: current.solarDate,
      toSolarDate: candidate.solarDate,
    }
  }
  return {
    status: 'modified',
    fromRaw: current.raw,
    toRaw: candidate.raw,
    fromSolarDate: current.solarDate,
    toSolarDate: candidate.solarDate,
  }
}
