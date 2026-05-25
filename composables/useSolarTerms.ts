// === Solar Terms Data ===
// 12 major solar terms used for month determination (节气)
// termIndex: 0=立春, 1=惊蛰, 2=清明, 3=立夏, 4=芒种, 5=小暑,
//            6=立秋, 7=白露, 8=寒露, 9=立冬, 10=大雪, 11=小寒

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

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

/** Get number of days in a given year */
function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365
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
  // Exact calendar days from 2000-01-01 to target-year-01-01
  let calendarDaysToYearStart = 0
  if (year > 2000) {
    for (let y = 2000; y < year; y++) {
      calendarDaysToYearStart += daysInYear(y)
    }
  } else if (year < 2000) {
    for (let y = year; y < 2000; y++) {
      calendarDaysToYearStart -= daysInYear(y)
    }
  }

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
 * Determine the month earthly branch based on solar month and day.
 * Month boundaries are defined by solar terms (节气).
 */
export function getMonthBranch(month: number, day: number): typeof BRANCHES[number] {
  // Solar term boundary (month, day) for each branch transition
  const boundaries: [number, number, number, number, typeof BRANCHES[number]][] = [
    [2, 4, 3, 5, '寅'],   // 立春 ~ 惊蛰
    [3, 6, 4, 4, '卯'],   // 惊蛰 ~ 清明
    [4, 5, 5, 5, '辰'],   // 清明 ~ 立夏
    [5, 6, 6, 5, '巳'],   // 立夏 ~ 芒种
    [6, 6, 7, 6, '午'],   // 芒种 ~ 小暑
    [7, 7, 8, 6, '未'],   // 小暑 ~ 立秋
    [8, 7, 9, 7, '申'],   // 立秋 ~ 白露
    [9, 8, 10, 7, '酉'],  // 白露 ~ 寒露
    [10, 8, 11, 6, '戌'], // 寒露 ~ 立冬
    [11, 7, 12, 6, '亥'], // 立冬 ~ 大雪
    [12, 7, 12, 31, '子'], // 大雪 ~ 冬至 (12/31 year-end catch-all)
    [1, 1, 1, 5, '子'],   // 年初 ~ 小寒 (continuation of 子月)
    [1, 6, 2, 3, '丑'],   // 小寒 ~ 立春
  ]

  for (const [sm, sd, em, ed, branch] of boundaries) {
    if (month === sm && month === em) {
      if (day >= sd && day <= ed) return branch
    } else if (month === sm) {
      if (day >= sd) return branch
    } else if (month === em) {
      if (day <= ed) return branch
    } else if (month > sm && month < em) {
      return branch
    }
  }

  // Fallback (shouldn't reach for valid dates)
  return '子'
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
): { stem: string; branch: string } {
  const yearStemIndex = ((year - 4) % 10 + 10) % 10

  let monthBranch: typeof BRANCHES[number]
  if (calendar === 'solar') {
    monthBranch = getMonthBranch(month, day)
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
