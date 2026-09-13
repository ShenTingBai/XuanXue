/**
 * 本人档案页展示格式化纯函数。
 *
 * 设计口径（2026-09-13 出版版视觉对齐）：
 * - 记录卡大字是规范化公历（工具计算口径），副行是原历法表达（本人填写口径）；
 * - 公历填写时副行改为农历对照，并标注「依公历换算」，不冒充本人填写；
 * - 农历换算失败不编造日期，返回空串，由调用方决定是否渲染该行；
 * - 不读取时钟以外的环境；时间统一按 Asia/Shanghai 民用时间展示。
 *
 * @author LiXinwen
 */

import { Solar } from 'lunar-javascript'
import type { NormalizedBirthDate, RawBirthDate } from '~/types/self-profile'
import { parseDateString } from '~/utils/shengxiao/date'

/** 档案状态：有出生日期 / 档案存在但日期已删除 / 尚未建档。 */
export type ProfileStatusKind = 'saved' | 'deleted' | 'empty'

/** 农历月名：正月…腊月（与展示口径一致，不随历表库版本变化）。 */
const LUNAR_MONTHS = [
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
  '冬月',
  '腊月',
]

/** 农历日名：初一…初十、十一…十九、二十、廿一…廿九、三十。 */
export function lunarDayName(day: number): string {
  if (day === 10) return '初十'
  if (day === 20) return '二十'
  if (day === 30) return '三十'
  const tens = ['初', '十', '廿'][Math.floor(day / 10)] ?? ''
  const unit = day % 10
  if (unit === 0) return tens
  return tens + '一二三四五六七八九'[unit - 1]
}

/** 农历月名；非法月份回退为 `N月`，不抛出。 */
export function lunarMonthName(month: number): string {
  return LUNAR_MONTHS[month] ?? `${month}月`
}

/** 规范化公历 → 「1990年5月5日」。非法输入原样返回，避免展示层抛错。 */
export function formatSolarDisplay(solarDate: string): string {
  const parsed = parseDateString(solarDate)
  if (!parsed) return solarDate
  return `${parsed.year}年${parsed.month}月${parsed.day}日`
}

/** 农历原始表达 → 「农历 2000年 正月初一（闰月）」。 */
export function formatLunarExpression(raw: RawBirthDate): string {
  if (raw.calendar !== 'lunar') return ''
  const leap = raw.isLeapMonth ? '（闰月）' : ''
  return `农历 ${raw.year}年 ${lunarMonthName(raw.month)}${lunarDayName(raw.day)}${leap}`
}

/** 时间戳 → 「YYYY-MM-DD HH:mm」（Asia/Shanghai）；无法解析时原样返回。 */
export function formatUpdatedAt(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date)
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
  } catch {
    return value
  }
}

const STATUS_LABELS: Record<ProfileStatusKind, string> = {
  saved: '出生日期已保存',
  deleted: '出生日期已删除',
  empty: '尚未建档',
}

/** 状态胶囊文案。 */
export function statusLabel(kind: ProfileStatusKind): string {
  return STATUS_LABELS[kind]
}

/** 状态胶囊类型：从档案数据推导，不由页面各自判断。 */
export function resolveStatusKind(hasProfile: boolean, hasBirthDate: boolean): ProfileStatusKind {
  if (!hasProfile) return 'empty'
  return hasBirthDate ? 'saved' : 'deleted'
}

/**
 * 记录卡副行：原历法表达优先，公历填写时给出农历对照。
 *
 * - 农历填写：「农历 2000年 正月初一 · 本人填写」
 * - 公历填写：「农历 1990年 四月初十 · 依公历换算」
 * - 换算失败：空串（不编造日期）
 */
export function formatRecordNote(birthDate: NormalizedBirthDate): string {
  const raw = birthDate.raw
  if (raw.calendar === 'lunar') {
    const expression = formatLunarExpression(raw)
    return expression ? `${expression} · 本人填写` : ''
  }
  const counterpart = lunarCounterpart(birthDate.solarDate)
  if (!counterpart) return ''
  return `${counterpart} · 依公历换算`
}

/** 公历 → 农历对照表达；越界或历表异常时返回空串。 */
export function lunarCounterpart(solarDate: string): string {
  const parsed = parseDateString(solarDate)
  if (!parsed) return ''
  try {
    const lunar = Solar.fromYmd(parsed.year, parsed.month, parsed.day).getLunar()
    // lunar-javascript 用负数月表示闰月，展示时还原为「正/闰」语义。
    const month = lunar.getMonth()
    const leap = month < 0
    const expression = `农历 ${lunar.getYear()}年 ${lunarMonthName(Math.abs(month))}${lunarDayName(lunar.getDay())}`
    return leap ? `${expression}（闰月）` : expression
  } catch {
    return ''
  }
}

/** 原始口径标签，用于「转换与确认详情」。 */
export function rawCalendarLabel(raw: RawBirthDate): string {
  return raw.calendar === 'lunar' ? '农历（本人主动填写）' : '公历（本人主动填写）'
}
