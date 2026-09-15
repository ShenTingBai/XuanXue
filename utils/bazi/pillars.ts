/**
 * 八字三柱纯函数（年柱、月柱、日柱与候选情形）。
 *
 * 全部输入输出为纯数据：不读时钟、不访问存储或网络、不调用第三方历法库
 * （节气时刻由适配器以参数传入）。日期一律以 `YYYY-MM-DD` 字符串承载。
 *
 * 锚点（均为 A 级来源，见 bazi-rule-ledger.md）：
 * - 干支纪年：1984 年为甲子年（GB/T 33661—2017 §6.1.1）；
 * - 干支纪日：1949-10-01 为甲子日（同标准 §6.3.2）；
 * - 年柱以立春为界、月柱以十二"节"为界（产品契约 §10.1/§10.2；传统口径来源见证据台账）。
 *
 * 候选建模硬约束（R-BZ-008）：立春当日年柱与月柱**同刻切换**，属同一情形的联合变化，
 * 必须返回恰好两个完整情形；**禁止**对年柱与月柱候选做叉乘（否则会产生物理上不可能的组合）。
 *
 * @author LiXinwen
 */

import { BRANCHES, STEMS } from '~/constants/bazi'
import {
  BAZI_DAY_PILLAR_ANCHOR,
  BAZI_GAN_ELEMENT,
  BAZI_JIE,
  BAZI_NEAR_MIDNIGHT_MINUTES,
  BAZI_WUHU,
  BAZI_YEAR_CYCLE_ANCHOR,
  BAZI_ZHI_ELEMENT,
  type JieName,
} from '~/constants/bazi-rules'
import type {
  BaziBoundary,
  BaziJieInstants,
  BaziPillar,
  BaziScenario,
  BaziUncertainty,
  BaziYearMonthPillars,
} from '~/types/bazi'
import { compareIsoDates, parseDateString } from '~/utils/shengxiao/date'

const GAN = STEMS
const ZHI = BRANCHES

/** 儒略日式纯整数日序：同一历法内两值之差即天数，不涉及时区或 Date 构造。 */
function dayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

/** 六十甲子序（0 = 甲子），按下标取干支名。 */
export function ganZhiAt(index: number): string {
  const normalized = ((index % 60) + 60) % 60
  return GAN[normalized % 10] + ZHI[normalized % 12]
}

/** 由干支字符串构造单柱（含基础五行）。 */
export function pillarFromGanZhi(ganZhi: string): BaziPillar {
  const stem = ganZhi.slice(0, 1)
  const branch = ganZhi.slice(1)
  const stemElement = BAZI_GAN_ELEMENT[stem]
  const branchElement = BAZI_ZHI_ELEMENT[branch]
  if (!stemElement || !branchElement) throw new Error('invalid ganZhi')
  return { stem, branch, stemElement, branchElement }
}

/** 干支年标签：以 1984 = 甲子年外推（GB/T §6.1.1）。 */
export function yearGanZhi(gregorianYear: number): string {
  return ganZhiAt(gregorianYear - BAZI_YEAR_CYCLE_ANCHOR)
}

/** 干支日：以 1949-10-01 = 甲子日为锚点按天数差取模（GB/T §6.3.2）。 */
export function dayGanZhi(solarDate: string): string {
  const target = parseDateString(solarDate)
  const anchor = parseDateString(BAZI_DAY_PILLAR_ANCHOR)
  if (!target || !anchor) throw new Error('invalid date')
  const diff =
    dayNumber(target.year, target.month, target.day) -
    dayNumber(anchor.year, anchor.month, anchor.day)
  return ganZhiAt(diff)
}

/**
 * 月柱：月支由"节"给出，月干由年干经五虎遁（SRC-BZ-008 古歌）推得。
 * 不变量：年干与月干的组合必须落在六十甲子的合法奇偶配对内。
 */
export function monthPillar(yearGan: string, monthBranch: string): BaziPillar {
  const startGan = BAZI_WUHU[yearGan]
  if (!startGan) throw new Error('invalid year stem')
  const offset = (ZHI.indexOf(monthBranch) - ZHI.indexOf('寅') + 12) % 12
  const stem = GAN[(GAN.indexOf(startGan) + offset) % 10]
  return pillarFromGanZhi(stem + monthBranch)
}

/** 一次"节"的发生（合并相邻年份后按日期比较使用）。 */
export interface JieOccurrence {
  name: JieName
  branch: string
  instant: string
  date: string
}

/** 把某公历年的十二个"节"展开为带月支的发生列表。 */
export function jieOccurrences(year: number, instants: BaziJieInstants): JieOccurrence[] {
  return BAZI_JIE.map(definition => {
    const info = instants[definition.name]
    if (!info) throw new Error('missing jie instant')
    return {
      name: definition.name,
      branch: definition.branch,
      instant: info.instant,
      date: info.date,
    }
  })
}

/** 边界时刻是否距午夜小于阈值（用于提示判定对精度敏感）。 */
export function isNearMidnight(
  instant: string,
  thresholdMinutes: number = BAZI_NEAR_MIDNIGHT_MINUTES,
): boolean {
  const time = instant.slice(11)
  const [hour, minute] = time.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) throw new Error('invalid instant')
  const minutes = hour * 60 + minute
  return minutes < thresholdMinutes || minutes > 1440 - thresholdMinutes
}

/** 三柱构建结果。 */
export interface PillarBuildResult {
  dayPillar: BaziPillar
  uniquePillars: BaziYearMonthPillars | null
  scenarios: BaziScenario[] | null
  uncertainty: BaziUncertainty | null
}

/**
 * 构建三柱与候选情形。
 *
 * `occurrences` 必须同时包含目标年份与上一年的十二个"节"（跨年时月支依赖上一年大雪/小寒）。
 * 返回的唯一情形与候选情形**互斥**：候选时 `uniquePillars` 为 null，`scenarios` 恰好两个。
 */
export function buildPillars(
  solarDate: string,
  occurrences: readonly JieOccurrence[],
): PillarBuildResult {
  const parsed = parseDateString(solarDate)
  if (!parsed) throw new Error('invalid date')
  const year = parsed.year

  const sameDay = occurrences.filter(item => item.date === solarDate)
  if (sameDay.length > 1) throw new Error('multiple jie on one date')

  const preceding = occurrences
    .filter(item => compareIsoDates(item.date, solarDate) < 0)
    .sort((a, b) => compareIsoDates(a.date, b.date) || (a.instant < b.instant ? -1 : 1))
    .at(-1)
  if (!preceding) throw new Error('no preceding jie')

  const lichun = occurrences.find(item => item.name === '立春' && item.date.startsWith(`${year}-`))
  if (!lichun) throw new Error('missing lichun')

  const dayPillar = pillarFromGanZhi(dayGanZhi(solarDate))
  const afterLichun = compareIsoDates(solarDate, lichun.date) > 0
  const current = sameDay[0]

  if (!current) {
    const label = afterLichun ? yearGanZhi(year) : yearGanZhi(year - 1)
    return {
      dayPillar,
      uniquePillars: {
        year: pillarFromGanZhi(label),
        month: monthPillar(label.slice(0, 1), preceding.branch),
      },
      scenarios: null,
      uncertainty: null,
    }
  }

  const boundary: BaziBoundary = {
    term: current.name,
    instant: current.instant,
    date: current.date,
    precision: 'minute',
  }
  const isLichun = current.name === '立春'
  const timePart = current.instant.slice(11)

  // 立春当日：年柱与月柱同刻切换，两个情形各自整组给出，不做叉乘。
  const scenarios: BaziScenario[] = isLichun
    ? [
        {
          yearPillar: pillarFromGanZhi(yearGanZhi(year - 1)),
          monthPillar: monthPillar(yearGanZhi(year - 1).slice(0, 1), preceding.branch),
          branch: 'pre',
          reason: `立春前（当日 00:00 至 ${timePart}）`,
        },
        {
          yearPillar: pillarFromGanZhi(yearGanZhi(year)),
          monthPillar: monthPillar(yearGanZhi(year).slice(0, 1), current.branch),
          branch: 'post',
          reason: `立春后（${timePart} 至当日 24:00）`,
        },
      ]
    : (() => {
        const label = afterLichun ? yearGanZhi(year) : yearGanZhi(year - 1)
        return [
          {
            yearPillar: pillarFromGanZhi(label),
            monthPillar: monthPillar(label.slice(0, 1), preceding.branch),
            branch: 'pre' as const,
            reason: `${current.name}前`,
          },
          {
            yearPillar: pillarFromGanZhi(label),
            monthPillar: monthPillar(label.slice(0, 1), current.branch),
            branch: 'post' as const,
            reason: `${current.name}后`,
          },
        ]
      })()

  return {
    dayPillar,
    uniquePillars: null,
    scenarios,
    uncertainty: {
      reason: 'boundary_crossing',
      affected: isLichun ? ['year', 'month'] : ['month'],
      boundary,
      nearMidnight: isNearMidnight(current.instant),
    },
  }
}
