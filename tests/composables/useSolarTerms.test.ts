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
    expect(getMonthBranch(2, 4)).toBe('寅')
  })

  it('returns 卯 for solar date Mar 6 (惊蛰)', () => {
    expect(getMonthBranch(3, 6)).toBe('卯')
  })

  it('returns 辰 for solar date Apr 5 (清明)', () => {
    expect(getMonthBranch(4, 5)).toBe('辰')
  })

  it('returns 丑 for solar date Feb 3 (before 立春)', () => {
    expect(getMonthBranch(2, 3)).toBe('丑')
  })

  it('returns 子 for solar date Dec 7', () => {
    expect(getMonthBranch(12, 7)).toBe('子')
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
