// === Solar Terms Data ===
// 12 major solar terms used for month determination (节气)
// termIndex: 0=立春, 1=惊蛰, 2=清明, 3=立夏, 4=芒种, 5=小暑,
//            6=立秋, 7=白露, 8=寒露, 9=立冬, 10=大雪, 11=小寒

import { STEMS, BRANCHES } from '~/constants/bazi'

const solarTermCache = new Map<string, { month: number; day: number }>()

/** Check if a year is a Gregorian leap year */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** Get number of days in a given year */
function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365
}

/**
 * Convert Julian Day to Gregorian date in Beijing time (UTC+8).
 * Uses the standard Gregorian calendar reform (Oct 15, 1582).
 */
function jdToGregorian(jd: number): { month: number; day: number } {
  jd += 8 / 24

  const Z = Math.floor(jd + 0.5)
  const F = jd + 0.5 - Z
  let A = Z
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25)
    A = Z + 1 + alpha - Math.floor(alpha / 4)
  }
  const B = A + 1524
  const C = Math.floor((B - 122.1) / 365.25)
  const D = Math.floor(365.25 * C)
  const E = Math.floor((B - D) / 30.6001)
  const day = Math.floor(B - D - Math.floor(30.6001 * E) + F)
  const month = E < 14 ? E - 1 : E - 13

  return { month, day }
}

/**
 * Calculate the date of a major solar term (节气).
 * Uses Equation of Center algorithm (Meeus) with Newton-Raphson iteration.
 * Accurate to within a few minutes for years 1900-2100.
 *
 * @param year - Gregorian year (1900-2100)
 * @param termIndex - 0=立春 through 11=小寒
 * @returns { month, day }
 */
export function getSolarTerm(year: number, termIndex: number): { month: number; day: number } {
  const cacheKey = `${year}-${termIndex}`
  const cached = solarTermCache.get(cacheKey)
  if (cached) return cached

  const LONGITUDES = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285]
  const longitude = LONGITUDES[termIndex]

  const J2000 = 2451545.0
  const L0 = 280.4665

  // Initial estimate: mean days from J2000.0 to target ecliptic longitude
  const lonOffset = (longitude - L0 + 360) % 360
  let jd = J2000 + (year - 2000) * 365.2422 + (lonOffset * 365.2422) / 360

  // Newton-Raphson with Equation of Center correction
  for (let iter = 0; iter < 5; iter++) {
    const T = (jd - J2000) / 36525
    const M = (((357.5291 + 35999.0503 * T) % 360) + 360) % 360
    const Mrad = (M * Math.PI) / 180
    const C = 1.9148 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad)
    const trueLon = (((280.4665 + 36000.7698 * T + C) % 360) + 360) % 360
    let delta = (longitude - trueLon + 360) % 360
    if (delta > 180) delta -= 360
    const corr = (delta * 365.2422) / 360
    jd += corr
    if (Math.abs(corr) < 0.00001) break
  }

  const result = jdToGregorian(jd)
  solarTermCache.set(cacheKey, result)
  return result
}

/** Calculate day-of-year from month and day */
function dayOfYear(month: number, day: number, leap: boolean): number {
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let doy = 0
  for (let i = 0; i < month - 1; i++) doy += monthDays[i]
  return doy + day
}

/**
 * Determine the month earthly branch based on year, solar month, and day.
 * Month boundaries are defined by computed solar terms (节气) for the given year.
 */
export function getMonthBranch(
  year: number,
  month: number,
  day: number,
): (typeof BRANCHES)[number] {
  const liChun = getSolarTerm(year, 0)

  // If before 立春, use the previous cycle (子月 or 丑月)
  if (month < liChun.month || (month === liChun.month && day < liChun.day)) {
    const currXiaoHan = getSolarTerm(year, 11)
    if (month < currXiaoHan.month || (month === currXiaoHan.month && day < currXiaoHan.day)) {
      return '子'
    } else {
      return '丑'
    }
  }

  // On or after 立春: use current cycle terms from 立春 through 小寒 (next year)
  const termDates = [
    getSolarTerm(year, 0), // 立春
    getSolarTerm(year, 1), // 惊蛰
    getSolarTerm(year, 2), // 清明
    getSolarTerm(year, 3), // 立夏
    getSolarTerm(year, 4), // 芒种
    getSolarTerm(year, 5), // 小暑
    getSolarTerm(year, 6), // 立秋
    getSolarTerm(year, 7), // 白露
    getSolarTerm(year, 8), // 寒露
    getSolarTerm(year, 9), // 立冬
    getSolarTerm(year, 10), // 大雪
    getSolarTerm(year, 11), // 小寒 (in next year)
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
 */
export function getMonthPillar(
  year: number,
  month: number,
  day: number,
): { stem: (typeof STEMS)[number]; branch: (typeof BRANCHES)[number] } {
  const yearStemIndex = (((year - 4) % 10) + 10) % 10
  const monthBranch = getMonthBranch(year, month, day)

  const branchIndex = BRANCHES.indexOf(monthBranch)
  const monthIndex = (((branchIndex - 2) % 12) + 12) % 12 // 寅=0, 卯=1, ..., 丑=11

  const stemStart = getMonthStemStart(yearStemIndex)
  const stemIndex = (stemStart + monthIndex) % 10

  return { stem: STEMS[stemIndex], branch: monthBranch }
}
