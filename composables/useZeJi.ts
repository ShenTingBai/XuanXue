// 择吉日 — Date evaluation engine powered by lunar-javascript almanac data

import { Solar, Lunar } from 'lunar-javascript'
import { EVENT_TYPES, TWELVE_STAR_LEVEL } from '~/constants/zeji'

// === Typed Exports ===

export interface ZejiDayResult {
  solarDate: string         // '2026-06-15'
  lunarDate: string         // '五月初一'
  lunarMonthName: string    // '五月'
  lunarDayName: string      // '初一'
  lunarYearGanZhi: string   // '丙午'
  lunarMonthGanZhi: string  // '甲午'
  lunarDayGanZhi: string    // '甲子'
  twelveStar: string        // 十二值星
  twelveStarLevel: string   // '吉'|'凶'|'平'
  xiu: string               // 二十八宿
  tianShen: string          // 天神
  tianShenType: string      // 黄道/黑道
  yi: string[]              // 宜
  ji: string[]              // 忌
  score: number             // 0-100 overall score
  isRecommended: boolean    // score >= 70
  matchReasons: string[]    // Why this date matches the event
  matchedYi: string[]       // Which 宜 items matched the event keywords
  matchedJi: string[]       // Which 忌 items matched the event keywords
}

export interface ZejiResult {
  eventType: string
  eventName: string
  months: {
    year: number
    month: number           // solar month (1-12)
    label: string           // display label e.g. '2026年 六月'
    days: ZejiDayResult[]
  }[]
  recommendedDates: ZejiDayResult[]  // top dates across all months, sorted by score desc
}

// === Scoring Helpers ===

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function matchesKeywords(value: string, keywords: string[]): boolean {
  return keywords.some(kw => value === kw || value.includes(kw))
}

/** Check if a specific 宜/忌 item matches any of the event keywords */
function itemMatchesKeywords(item: string, keywords: string[]): boolean {
  return keywords.some(kw => item === kw || item.includes(kw))
}

/**
 * Evaluate a single day for the given event type.
 * Returns a ZejiDayResult with full almanac data and score.
 */
function evaluateDay(
  year: number,
  month: number,
  day: number,
  eventType: string,
): ZejiDayResult {
  const keywords = EVENT_TYPES[eventType]?.keywords || []
  const solar = Solar.fromYmd(year, month, day)
  const lunar = solar.getLunar()

  // Lunar date components
  const lunarYear = lunar.getYear()
  const lunarMonth = lunar.getMonth()
  const lunarDay = lunar.getDay()

  const lunarMonthName = lunar.getMonthInChinese()
  const lunarDayName = lunar.getDayInChinese()

  // 干支
  const yearGanZhi = lunar.getYearInGanZhi()
  const monthGanZhi = lunar.getMonthInGanZhi()
  const dayGanZhi = lunar.getDayInGanZhi()

  // 十二值星
  const twelveStar = lunar.getDayTwelveStar()
  const starInfo = TWELVE_STAR_LEVEL[twelveStar]
  const twelveStarLevel = starInfo?.level || '平'

  // 二十八宿
  const xiu = lunar.getXiu() || ''

  // 天神 / 黄道黑道
  const tianShen = lunar.getDayTianShen() || ''
  const tianShenType = lunar.getDayTianShenType() || ''

  // 宜忌
  const yi: string[] = lunar.getDayYi() || []
  const ji: string[] = lunar.getDayJi() || []

  // === Scoring ===

  // 1. Base score: 50
  let score = 50

  // 2. 十二值星 (±20)
  if (twelveStarLevel === '吉') {
    score += 15
  } else if (twelveStarLevel === '凶') {
    score -= 15
  }
  // 平: 0

  // 3. 黄道/黑道 (±15)
  if (tianShenType === '黄道') {
    score += 12
  } else if (tianShenType === '黑道') {
    score -= 12
  }

  // 4. 宜忌匹配 (±25 per major)
  const matchReasons: string[] = []
  const matchedYi: string[] = []
  const matchedJi: string[] = []

  for (const item of yi) {
    if (itemMatchesKeywords(item, keywords)) {
      matchedYi.push(item)
      score += 20
      matchReasons.push(`宜「${item}」`)
    }
  }

  for (const item of ji) {
    if (itemMatchesKeywords(item, keywords)) {
      matchedJi.push(item)
      score -= 25
      matchReasons.push(`忌「${item}」`)
    }
  }

  // 5. Add twelve star / tian shen reasons
  if (twelveStarLevel === '吉') {
    matchReasons.push(`${twelveStar}日${starInfo?.desc || ''}`)
  } else if (twelveStarLevel === '凶') {
    matchReasons.push(`${twelveStar}日${starInfo?.desc || ''}`)
  }

  if (tianShenType === '黄道') {
    matchReasons.push(`黄道日·${tianShen}`)
  } else if (tianShenType === '黑道') {
    matchReasons.push(`黑道日·${tianShen}`)
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score))

  const isRecommended = score >= 70

  return {
    solarDate: `${year}-${pad(month)}-${pad(day)}`,
    lunarDate: `${lunarMonthName}${lunarDayName}`,
    lunarMonthName,
    lunarDayName,
    lunarYearGanZhi: yearGanZhi,
    lunarMonthGanZhi: monthGanZhi,
    lunarDayGanZhi: dayGanZhi,
    twelveStar,
    twelveStarLevel,
    xiu,
    tianShen,
    tianShenType,
    yi,
    ji,
    score,
    isRecommended,
    matchReasons,
    matchedYi,
    matchedJi,
  }
}

/**
 * Main entry point: evaluate dates for a given event type over multiple months.
 *
 * @param eventType - key from EVENT_TYPES
 * @param startSolarDate - starting date, defaults to today
 * @param monthsToEvaluate - how many months to evaluate, defaults to 3
 */
export function evaluateDates(
  eventType: string,
  startSolarDate?: Date,
  monthsToEvaluate: number = 3,
): ZejiResult {
  const eventInfo = EVENT_TYPES[eventType]
  if (!eventInfo) {
    return {
      eventType,
      eventName: eventType,
      months: [],
      recommendedDates: [],
    }
  }

  const start = startSolarDate || new Date()
  const startYear = start.getFullYear()
  const startMonth = start.getMonth() + 1

  const monthData: ZejiResult['months'] = []
  const allRecommended: ZejiDayResult[] = []

  for (let offset = 0; offset < monthsToEvaluate; offset++) {
    const targetMonth = startMonth + offset
    let year = startYear
    let month = targetMonth
    if (targetMonth > 12) {
      year = startYear + Math.floor((targetMonth - 1) / 12)
      month = ((targetMonth - 1) % 12) + 1
    }

    // Get number of days in this solar month
    const lastDay = new Date(year, month, 0).getDate() // month is 0-indexed for this API

    const monthLabel = `${year}年 ${month}月`

    const days: ZejiDayResult[] = []
    for (let d = 1; d <= lastDay; d++) {
      try {
        const result = evaluateDay(year, month, d, eventType)
        days.push(result)
        if (result.isRecommended) {
          allRecommended.push(result)
        }
      } catch {
        // Skip days that lunar-javascript cannot compute
      }
    }

    monthData.push({
      year,
      month,
      label: monthLabel,
      days,
    })
  }

  // Sort recommended dates by score descending
  allRecommended.sort((a, b) => b.score - a.score)

  // Only keep top 15 for the summary
  const topRecommended = allRecommended.slice(0, 15)

  return {
    eventType,
    eventName: eventInfo.name,
    months: monthData,
    recommendedDates: topRecommended,
  }
}
