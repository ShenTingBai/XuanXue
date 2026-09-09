/**
 * 生肖领域引擎（纯函数，不读时钟/网络/存储/认证）。
 *
 * 职责：先校验日期合法与在支持范围，再调用注入的日历适配器换算，最后用独立
 * 规则表（constants/shengxiao-rules.ts）查表分类。不返回默认生肖或公历取模后备。
 *
 * 成功结果完整契约字段来自 `types/shengxiao.ts`；失败分类按规则台账 §3：
 * - 非法输入 → invalid_input（不调用适配器）；
 * - 真实但超出支持范围（< 1901-01-01 或 > asOfDate）→ unsupported_input + UNSUPPORTED_DATE；
 * - 适配器异常 → engine_error（不返回替代结果）。
 *
 * @author LiXinwen
 */

import type { CalendarAdapter, ShengXiaoFailure, ShengXiaoResult } from '~/types/shengxiao'
import { parseDateString, compareIsoDates, SUPPORT_START_DATE } from './date'
import { lunarCalendarAdapter } from './calendar'
import {
  SHENGXIAO_RULE_VERSION,
  SHENGXIAO_ENGINE_VERSION,
  SHENGXIAO_TIMEZONE,
  BRANCH_TO_ANIMAL,
  STEM_TO_ELEMENT,
  STEM_TO_YIN_YANG,
  BRANCH_TO_ELEMENT,
  GANZHI_TO_NAYIN,
} from '~/constants/shengxiao-rules'

/** 失败结果（领域失败类别，不含 freshness——freshness 只由页面持有结果时管理）。 */
export type ShengXiaoOutcome = ShengXiaoResult | ShengXiaoFailure

/** 由干支年（如「丙午」）查传统分类（规则台账 R-SX-003/004/005）。 */
export function classifyGanZhi(ganZhi: string): {
  stemElement: string
  yinYang: string
  branchElement: string
  naYin: string
} {
  const stem = ganZhi.slice(0, 1)
  const branch = ganZhi.slice(1, 2)
  return {
    stemElement: STEM_TO_ELEMENT[stem] ?? '',
    yinYang: STEM_TO_YIN_YANG[stem] ?? '',
    branchElement: BRANCH_TO_ELEMENT[branch] ?? '',
    naYin: GANZHI_TO_NAYIN[ganZhi] ?? '',
  }
}

/** 农历月份数字 → 中文月名（正/二/…/十一/腊月），负数表示闰月。 */
export function lunarMonthName(month: number): string {
  const leap = month < 0 ? '闰' : ''
  const abs = Math.abs(month)
  const names = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '腊']
  return leap + (names[abs - 1] ?? String(abs))
}

/** 农历日数字 → 中文日名（初一…三十）。 */
export function lunarDayName(day: number): string {
  if (day === 10) return '初十'
  if (day === 20) return '二十'
  if (day === 30) return '三十'
  if (day > 10 && day < 20) return `十${'一二三四五六七八九'[day - 11]}`
  if (day > 20 && day < 30) return `廿${'一二三四五六七八九'[day - 21]}`
  return `初${'一二三四五六七八九'[day - 1]}`
}

/** 构造农历日期展示串（如「庚子年十一月十一」）。 */
export function formatLunarDate(
  lunarYear: number,
  month: number,
  day: number,
  ganZhiYear: string,
): string {
  return `${ganZhiYear}年${lunarMonthName(month)}月${lunarDayName(day)}`
}

/**
 * 计算生肖（支持范围 1901-01-01 至显式传入的 asOfDate）。
 *
 * @param inputDate 用户输入公历日期（YYYY-MM-DD）
 * @param asOfDate 查询当日（YYYY-MM-DD），由页面显式传入；领域内部不读时钟
 * @param adapter 可注入日历适配器（默认 lunarCalendarAdapter）
 */
export function calculateShengXiao(
  inputDate: string,
  asOfDate: string,
  adapter: CalendarAdapter = lunarCalendarAdapter,
): ShengXiaoOutcome {
  // 1) 非法输入：不调用适配器
  const parsed = parseDateString(inputDate)
  if (!parsed) {
    return { phase: 'failure', failureCategory: 'invalid_input' }
  }

  // 1b) 严格验证 asOfDate：查询当日无效属于环境/调用方错误，不是出生日期非法。
  //     不把无效 asOfDate 误报为 unsupported_input；也不静默跳过范围比较。
  const parsedAsOf = parseDateString(asOfDate)
  if (!parsedAsOf) {
    return { phase: 'failure', failureCategory: 'engine_error' }
  }

  // 2) 范围校验：< 1901-01-01 或 > asOfDate → unsupported_input
  if (compareIsoDates(inputDate, SUPPORT_START_DATE) < 0) {
    return {
      phase: 'failure',
      failureCategory: 'unsupported_input',
      failureDetailCode: 'UNSUPPORTED_DATE',
    }
  }
  if (compareIsoDates(inputDate, asOfDate) > 0) {
    return {
      phase: 'failure',
      failureCategory: 'unsupported_input',
      failureDetailCode: 'UNSUPPORTED_DATE',
    }
  }

  // 3) 适配器换算（异常 → engine_error，不返回替代结果）
  let lunarInfo
  let boundary
  try {
    lunarInfo = adapter.toLunar(parsed.year, parsed.month, parsed.day)
    boundary = adapter.yearBoundary(lunarInfo.lunarYear)
  } catch {
    return { phase: 'failure', failureCategory: 'engine_error' }
  }

  const ganZhiYear = lunarInfo.ganZhiYear
  const branch = ganZhiYear.slice(1, 2)
  const animal = BRANCH_TO_ANIMAL[branch] ?? ''
  const classification = classifyGanZhi(ganZhiYear)

  const sourceRefs: string[] = [
    'SRC-001',
    'SRC-002',
    'SRC-002a',
    'SRC-003',
    'SRC-003a',
    'SRC-005',
    'SRC-006',
    'SRC-007',
    'SRC-008',
  ]

  return {
    phase: 'success',
    successQualifier: 'unique',
    freshness: 'current',
    inputDate,
    lunarDate: formatLunarDate(
      lunarInfo.lunarYear,
      lunarInfo.lunarMonth,
      lunarInfo.lunarDay,
      ganZhiYear,
    ),
    lunarYear: lunarInfo.lunarYear,
    ganZhiYear,
    animal,
    earthlyBranch: branch,
    stemElement: classification.stemElement,
    branchElement: classification.branchElement,
    yinYang: classification.yinYang,
    naYin: classification.naYin,
    yearBoundary: {
      startDate: boundary.startDate,
      endDate: boundary.endDate,
      timezone: SHENGXIAO_TIMEZONE,
    },
    ruleVersion: SHENGXIAO_RULE_VERSION,
    engineVersion: SHENGXIAO_ENGINE_VERSION,
    sourceRefs,
  }
}
