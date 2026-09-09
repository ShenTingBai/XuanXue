/**
 * 生肖领域纯日期工具（不含时区转换、不读时钟）。
 *
 * 公历输入一律以 `YYYY-MM-DD` 纯日期字符串表达，不做 UTC Date 中间转换，
 * 避免系统时区改变日历日期（治理规范 §8.1）。本模块不做 `new Date()` 解析
 * 用户日期，也不调用当前时间。
 *
 * @author LiXinwen
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number): number {
  const days = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month === 2 && isLeapYear(year)) return 29
  return days[month] ?? 0
}

export interface ParsedDate {
  year: number
  month: number
  day: number
  /** 规范化后的纯日期字符串（YYYY-MM-DD）。 */
  iso: string
}

/**
 * 严格解析 YYYY-MM-DD：结构、整数年月日与公历闰年校验。
 * 非法输入返回 null（不抛异常），调用方据此判定 invalid_input。
 */
export function parseDateString(value: string): ParsedDate | null {
  if (typeof value !== 'string') return null
  const match = DATE_RE.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return null
  if (day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day, iso: value }
}

/** 纯字符串按 YYYY-MM-DD 字典序比较（两位年/月/日保证与日历序一致）。 */
export function compareIsoDates(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/** 把年月日格式化为 YYYY-MM-DD（字段必须已通过校验）。 */
export function toIsoDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/** 给纯日期增加天数偏移（纯整数日历算术，不涉及时区或 Date 构造）。 */
export function addDays(iso: string, days: number): string {
  const parsed = parseDateString(iso)
  if (!parsed) throw new Error(`invalid date: ${iso}`)
  let { year, month, day } = parsed
  day += days
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  while (day < 1) {
    month -= 1
    if (month < 1) {
      month = 12
      year -= 1
    }
    day += daysInMonth(year, month)
  }
  return toIsoDate(year, month, day)
}

/** 产品支持范围下界（契约 §6.2/§8.3）。 */
export const SUPPORT_START_DATE = '1901-01-01'
