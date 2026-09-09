/**
 * 公历→农历换算适配器（仅此文件引用第三方历法库 lunar-javascript 1.7.7）。
 *
 * 规则约束：
 * - 按正月初一取干支年（`getYearInGanZhi()`），禁用 Exact/ByLiChun 立春年界
 *   （契约 §8.1/§8.2、规则台账 R-SX-003）。
 * - `LunarYear.fromYear()` 的 months 数组未按农历年过滤，必须先按农历年号
 *   `getYear()` 筛选再取首月（规则台账 §5），结束日为下一年首减一天。
 * - 覆盖农历 1900 年下界：`yearBoundary(1900)` 由 LunarYear 提供，不额外特判。
 *
 * 候选引擎输出不得作为黄金样例期望来源（SRC-LUNAR 为 implementation_only）。
 *
 * @author LiXinwen
 */

import { Solar, LunarYear } from 'lunar-javascript'
import { toIsoDate, addDays } from './date'
import type { CalendarAdapter, LunarDateInfo, YearBoundary } from '~/types/shengxiao'
import { SHENGXIAO_TIMEZONE } from '~/constants/shengxiao-rules'

function solarToIso(solar: Solar): string {
  return toIsoDate(solar.getYear(), solar.getMonth(), solar.getDay())
}

function makeAdapter(): CalendarAdapter {
  return {
    toLunar(year: number, month: number, day: number): LunarDateInfo {
      const solar = Solar.fromYmd(year, month, day)
      const lunar = solar.getLunar()
      return {
        lunarYear: lunar.getYear(),
        lunarMonth: lunar.getMonth(),
        lunarDay: lunar.getDay(),
        ganZhiYear: lunar.getYearInGanZhi(),
        yearGan: lunar.getYearGan(),
        yearZhi: lunar.getYearZhi(),
        solarDate: solarToIso(solar),
      }
    },

    yearBoundary(lunarYear: number): YearBoundary {
      // LunarYear.getMonthsInYear() 已按农历年号过滤；首月必须是该农历年
      // 的正月（月号 1 且非闰月），否则视为数据异常。
      const firstMonth = LunarYear.fromYear(lunarYear).getMonthsInYear()[0]
      if (!firstMonth || firstMonth.getMonth() !== 1 || firstMonth.isLeap()) {
        throw new Error(`lunar year has no regular first month: ${lunarYear}`)
      }
      // 安装包 LunarMonth 无 getSolar()，以真实儒略日接口转公历（v2 修正）。
      const startSolar = Solar.fromJulianDay(firstMonth.getFirstJulianDay())
      const startDate = solarToIso(startSolar)

      const nextFirstMonth = LunarYear.fromYear(lunarYear + 1).getMonthsInYear()[0]
      if (!nextFirstMonth || nextFirstMonth.getMonth() !== 1 || nextFirstMonth.isLeap()) {
        throw new Error(`next lunar year has no regular first month: ${lunarYear + 1}`)
      }
      const nextStartSolar = Solar.fromJulianDay(nextFirstMonth.getFirstJulianDay())
      const endDate = addDays(solarToIso(nextStartSolar), -1)
      return { startDate, endDate, timezone: SHENGXIAO_TIMEZONE }
    },
  }
}

/** 默认适配器（领域引擎的默认注入）。 */
export const lunarCalendarAdapter: CalendarAdapter = makeAdapter()
