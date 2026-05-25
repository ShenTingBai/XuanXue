// === Solar Terms Data ===
// 12 major solar terms used for month determination (节气)
// termIndex: 0=立春, 1=惊蛰, 2=清明, 3=立夏, 4=芒种, 5=小暑,
//            6=立秋, 7=白露, 8=寒露, 9=立冬, 10=大雪, 11=小寒

import { STEMS, BRANCHES } from '~/constants/bazi'

// Base day-of-year for each term in year 2000 (a leap year).
// These are actual calendar DOY values for Gregorian year 2000:
// 立春=Feb4=35, 惊蛰=Mar5=65, 清明=Apr4=95, 立夏=May5=126,
// 芒种=Jun5=157, 小暑=Jul7=189, 立秋=Aug7=220, 白露=Sep7=251,
// 寒露=Oct8=282, 立冬=Nov7=312, 大雪=Dec7=342, 小寒=2001-01-05=371
const BASE_TERM_DOY = [35, 65, 95, 126, 157, 189, 220, 251, 282, 312, 342, 371]

/** Check if a year is a Gregorian leap year */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Count calendar days from year 1-01-01 to year Y-01-01 (exclusive).
 * Uses the Gregorian year-length formula: 365 days + leap days.
 * Days since epoch = Y*365 + floor(Y/4) - floor(Y/100) + floor(Y/400)
 */
function daysFromYearOne(year: number): number {
  const Y = year
  return Y * 365 + Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400)
}

/** Get number of days in a given year */
function daysInYear(year: number): number {
  return daysFromYearOne(year + 1) - daysFromYearOne(year)
}

/**
 * Calculate the approximate date of a solar term.
 * Uses a mean-tropical-year approximation with calendar-drift correction.
 *
 * The Gregorian calendar has an average year length of 365.2425 days (400-year
 * cycle with 97 leap days), very close to the tropical year of ~365.2422 days.
 * We compute the mismatch between actual calendar days elapsed and tropical
 * days elapsed since Jan 1, 2000. When the calendar is ahead (positive drift),
 * solar terms appear to shift backward to earlier DOY values.
 *
 * @param year - Gregorian year (1900-2100)
 * @param termIndex - 0=立春 through 11=小寒
 * @returns { month, day }
 */
export function getSolarTerm(year: number, termIndex: number): { month: number, day: number } {
  // Exact calendar days from 2000-01-01 to target-year-01-01 (O(1) formula)
  const calendarDaysToYearStart = daysFromYearOne(year) - daysFromYearOne(2000)

  // Tropical days elapsed from 2000-01-01 to target-year-01-01
  const yearsFrom2000 = year - 2000
  const tropicalDaysToYearStart = yearsFrom2000 * 365.2422

  // Drift: positive = calendar is ahead of tropical year → term shifts backward in DOY
  const drift = calendarDaysToYearStart - tropicalDaysToYearStart

  // Adjust base DOY by the calendar-tropical drift
  const meanDoy = BASE_TERM_DOY[termIndex] - drift

  // Round to nearest integer day
  let doy = Math.round(meanDoy)

  return doyToDate(year, doy)
}

/** Calculate day-of-year from month and day */
function dayOfYear(month: number, day: number, leap: boolean): number {
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let doy = 0
  for (let i = 0; i < month - 1; i++) doy += monthDays[i]
  return doy + day
}

/** Convert day-of-year to { month, day } */
function doyToDate(year: number, doy: number): { month: number, day: number } {
  let y = year
  let d = doy
  const diy = daysInYear(y)
  if (d > diy) {
    d -= diy
    y++
  } else if (d < 1) {
    y--
    d += daysInYear(y)
  }

  const monthDays = [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let remaining = d
  for (let i = 0; i < 12; i++) {
    if (remaining <= monthDays[i]) {
      return { month: i + 1, day: remaining }
    }
    remaining -= monthDays[i]
  }
  return { month: 12, day: 31 }
}

/**
 * Determine the month earthly branch based on year, solar month, and day.
 * Month boundaries are defined by computed solar terms (节气) for the given year.
 */
export function getMonthBranch(year: number, month: number, day: number): typeof BRANCHES[number] {
  const liChun = getSolarTerm(year, 0)

  // If before 立春, use the previous cycle (子月 or 丑月)
  if (month < liChun.month || (month === liChun.month && day < liChun.day)) {
    const prevXiaoHan = getSolarTerm(year - 1, 11)
    if (month < prevXiaoHan.month || (month === prevXiaoHan.month && day < prevXiaoHan.day)) {
      return '子'
    } else {
      return '丑'
    }
  }

  // On or after 立春: use current cycle terms from 立春 through 小寒 (next year)
  const termDates = [
    getSolarTerm(year, 0),   // 立春
    getSolarTerm(year, 1),   // 惊蛰
    getSolarTerm(year, 2),   // 清明
    getSolarTerm(year, 3),   // 立夏
    getSolarTerm(year, 4),   // 芒种
    getSolarTerm(year, 5),   // 小暑
    getSolarTerm(year, 6),   // 立秋
    getSolarTerm(year, 7),   // 白露
    getSolarTerm(year, 8),   // 寒露
    getSolarTerm(year, 9),   // 立冬
    getSolarTerm(year, 10),  // 大雪
    getSolarTerm(year, 11),  // 小寒 (in next year)
  ]

  const branches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']

  const doy = dayOfYear(month, day, isLeapYear(year))
  const termDOYs = termDates.map((t, i) => {
    const d = dayOfYear(t.month, t.day, isLeapYear(year))
    // Term 11 (小寒) is always in the next year, adjust its DOY for comparison
    return i === 11 ? d + daysInYear(year) : d
  })

  // Find which term boundary we're past (check from last to first)
  for (let i = termDOYs.length - 1; i >= 0; i--) {
    if (doy >= termDOYs[i]) {
      return branches[i]
    }
  }

  // Fallback (shouldn't reach for post-立春 dates)
  return branches[branches.length - 1]
}

/**
 * Get the starting heavenly stem index for month calculation (五虎遁).
 *
 * 甲/己年 → 丙(2)  乙/庚年 → 戊(4)  丙/辛年 → 庚(6)
 * 丁/壬年 → 壬(8)  戊/癸年 → 甲(0)
 */
export function getMonthStemStart(yearStemIndex: number): number {
  return (yearStemIndex * 2 + 2) % 10
}

/**
 * Get month pillar stem-branch.
 *
 * @param year - Birth year
 * @param month - Birth month (1-12)
 * @param day - Birth day (1-31)
 * @param calendar - 'solar' or 'lunar'
 */
export function getMonthPillar(
  year: number,
  month: number,
  day: number,
  calendar: 'solar' | 'lunar'
): { stem: typeof STEMS[number]; branch: typeof BRANCHES[number] } {
  const yearStemIndex = ((year - 4) % 10 + 10) % 10

  let monthBranch: typeof BRANCHES[number]
  if (calendar === 'solar') {
    monthBranch = getMonthBranch(year, month, day)
  } else {
    // For lunar, approximate month branch by month number (shifted by ~1)
    // 农历正月≈寅月, 二月≈卯月, etc.
    const lunarBranchIndex = ((month + 1) % 12 + 12) % 12
    monthBranch = BRANCHES[lunarBranchIndex]
  }

  const branchIndex = BRANCHES.indexOf(monthBranch)
  const monthIndex = ((branchIndex - 2) % 12 + 12) % 12 // 寅=0, 卯=1, ..., 丑=11

  const stemStart = getMonthStemStart(yearStemIndex)
  const stemIndex = (stemStart + monthIndex) % 10

  return { stem: STEMS[stemIndex], branch: monthBranch }
}
