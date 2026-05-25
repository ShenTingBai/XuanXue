import { describe, it, expect } from 'vitest'
import { getSolarTerm, getMonthBranch, getMonthStemStart, getMonthPillar } from '../../composables/useSolarTerms'

describe('getSolarTerm', () => {
  it('returns correct 立春 date for 2024', () => {
    const term = getSolarTerm(2024, 0) // 0 = 立春
    expect(term.month).toBe(2)
    expect(term.day).toBe(4)
  })

  it('returns correct 立春 date for 2025', () => {
    const term = getSolarTerm(2025, 0)
    expect(term.month).toBe(2)
    expect(term.day).toBe(3)
  })

  it('returns correct 立春 date for 1998', () => {
    const term = getSolarTerm(1998, 0)
    expect(term.month).toBe(2)
    expect(term.day).toBe(4)
  })

  it('returns correct 惊蛰 date for 2026', () => {
    const term = getSolarTerm(2026, 1) // 1 = 惊蛰
    expect(term.month).toBe(3)
    expect(term.day).toBe(5)
  })
})

describe('getMonthBranch', () => {
  it('returns 寅 for solar date Feb 4 (立春)', () => {
    expect(getMonthBranch(2000, 2, 4)).toBe('寅')
  })

  it('returns 卯 for solar date Mar 6 (惊蛰)', () => {
    expect(getMonthBranch(2000, 3, 6)).toBe('卯')
  })

  it('returns 辰 for solar date Apr 5 (清明)', () => {
    expect(getMonthBranch(2000, 4, 5)).toBe('辰')
  })

  it('returns 丑 for solar date Feb 3 (before 立春)', () => {
    expect(getMonthBranch(2000, 2, 3)).toBe('丑')
  })

  it('returns 子 for solar date Dec 7', () => {
    expect(getMonthBranch(2000, 12, 7)).toBe('子')
  })
})

describe('getMonthStemStart', () => {
  it('returns 丙(2) for 甲年 stem index 0', () => {
    expect(getMonthStemStart(0)).toBe(2)
  })

  it('returns 丙(2) for 己年 stem index 5', () => {
    expect(getMonthStemStart(5)).toBe(2)
  })

  it('returns 庚(6) for 丙年 stem index 2', () => {
    expect(getMonthStemStart(2)).toBe(6)
  })
})

describe('all 12 major solar terms for 2024', () => {
  const expected2024 = [
    { name: '立春', termIndex: 0, month: 2, day: 4 },
    { name: '惊蛰', termIndex: 1, month: 3, day: 5 },
    { name: '清明', termIndex: 2, month: 4, day: 4 },
    { name: '立夏', termIndex: 3, month: 5, day: 5 },
    { name: '芒种', termIndex: 4, month: 6, day: 5 },
    { name: '小暑', termIndex: 5, month: 7, day: 6 },
    { name: '立秋', termIndex: 6, month: 8, day: 7 },
    { name: '白露', termIndex: 7, month: 9, day: 7 },
    { name: '寒露', termIndex: 8, month: 10, day: 8 },
    { name: '立冬', termIndex: 9, month: 11, day: 7 },
    { name: '大雪', termIndex: 10, month: 12, day: 6 },
    { name: '小寒', termIndex: 11, month: 1, day: 5 },
  ]

  it.each(expected2024)('$name should be in correct month (termIndex=$termIndex)', ({ termIndex, month }) => {
    const result = getSolarTerm(2024, termIndex)
    expect(result.month).toBe(month)
  })

  it.each(expected2024)('$name day should be within ±1 of expected', ({ termIndex, day }) => {
    const result = getSolarTerm(2024, termIndex)
    expect(Math.abs(result.day - day)).toBeLessThanOrEqual(1)
  })
})

describe('getMonthPillar', () => {
  it('returns 甲寅 for 1998-02-04 solar (戊寅年 立春=寅月, 戊癸年起甲寅)', () => {
    // 1998 is 戊寅年 (stem index 4), 戊癸年起甲寅
    // month 2 day 4 = 立春 so 寅月, monthIndex = 0
    // monthStem = 甲(0) + 0 = 甲(0) → 甲寅
    const pillar = getMonthPillar(1998, 2, 4, 'solar')
    expect(pillar.stem).toBe('甲')
    expect(pillar.branch).toBe('寅')
  })
})
