import { describe, it, expect } from 'vitest'
import { calculateBaZi } from '../../composables/useBaZi'

describe('calculateBaZi', () => {
  const baseProfile = {
    birthYear: 1998,
    birthMonth: 5,
    birthDay: 25,
    birthCalendar: 'solar' as const,
    birthHour: 14,
    gender: '男' as const,
  }

  it('returns correct year pillar for 1998 (戊寅)', () => {
    const result = calculateBaZi(baseProfile)
    expect(result.yearPillar.stem).toBe('戊')
    expect(result.yearPillar.branch).toBe('寅')
  })

  it('returns correct day master', () => {
    const result = calculateBaZi(baseProfile)
    expect(result.dayMaster).toBe('壬')
    expect(result.dayMasterWuxing).toBe('水')
  })

  it('adjusts month pillar year stem for pre-立春 dates (2001-02-02 → 己丑 month, 庚辰 year)', () => {
    // 2001 is 辛巳, but before 立春 so year=2000 (庚辰)
    // Month pillar must use 2000's stem (庚) for 五虎遁 → 己丑, not 辛丑
    const result = calculateBaZi({
      ...baseProfile, birthYear: 2001, birthMonth: 2, birthDay: 2, birthHour: null,
    })
    expect(result.yearPillar.stem).toBe('庚')
    expect(result.yearPillar.branch).toBe('辰')
    expect(result.monthPillar.stem).toBe('己')
    expect(result.monthPillar.branch).toBe('丑')
  })

  it('handles 立春 boundary: Feb 3 1998 is still 丁丑 (previous year)', () => {
    const result = calculateBaZi({
      ...baseProfile, birthYear: 1998, birthMonth: 2, birthDay: 3,
    })
    expect(result.yearPillar.stem).toBe('丁')
    expect(result.yearPillar.branch).toBe('丑')
  })

  it('handles 立春 boundary: Feb 4 1998 is 戊寅', () => {
    const result = calculateBaZi({
      ...baseProfile, birthYear: 1998, birthMonth: 2, birthDay: 4,
    })
    expect(result.yearPillar.stem).toBe('戊')
    expect(result.yearPillar.branch).toBe('寅')
  })

  it('returns 4 pillars with correct structure', () => {
    const result = calculateBaZi(baseProfile)
    expect(result.yearPillar).toHaveProperty('stem')
    expect(result.yearPillar).toHaveProperty('branch')
    expect(result.yearPillar).toHaveProperty('stemTenGod')
    expect(result.yearPillar).toHaveProperty('branchTenGod')
    expect(result.yearPillar).toHaveProperty('hiddenStems')
    expect(result.yearPillar).toHaveProperty('stemWuxing')
    expect(result.yearPillar).toHaveProperty('branchWuxing')
    expect(result.monthPillar).toHaveProperty('stem')
    expect(result.dayPillar).toHaveProperty('stem')
    expect(result.hourPillar).toHaveProperty('stem')
  })

  it('returns null hourPillar when birthHour is missing', () => {
    const result = calculateBaZi({ ...baseProfile, birthHour: null })
    expect(result.hourPillar).toBeNull()
  })

  it('returns ten gods for each pillar stem', () => {
    const result = calculateBaZi(baseProfile)
    expect(result.yearPillar.stemTenGod).toBeTruthy()
    expect(result.monthPillar.stemTenGod).toBeTruthy()
    expect(result.dayPillar.stemTenGod).toBe('日主')
    expect(result.hourPillar!.stemTenGod).toBeTruthy()
  })

  it('returns hidden stems with ten gods', () => {
    const result = calculateBaZi(baseProfile)
    expect(result.yearPillar.hiddenStems.length).toBeGreaterThan(0)
    for (const hs of result.yearPillar.hiddenStems) {
      expect(hs).toHaveProperty('stem')
      expect(hs).toHaveProperty('tenGod')
      expect(hs).toHaveProperty('wuxing')
    }
  })

  it('returns element counts as 5-key record', () => {
    const result = calculateBaZi(baseProfile)
    expect(result.elementCounts).toHaveProperty('木')
    expect(result.elementCounts).toHaveProperty('火')
    expect(result.elementCounts).toHaveProperty('土')
    expect(result.elementCounts).toHaveProperty('金')
    expect(result.elementCounts).toHaveProperty('水')
    const total = Object.values(result.elementCounts).reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('returns dayMasterStrength', () => {
    const result = calculateBaZi(baseProfile)
    expect(['强', '偏强', '中和', '偏弱', '弱']).toContain(result.dayMasterStrength)
  })

  it('returns favorable and unfavorable elements', () => {
    const result = calculateBaZi(baseProfile)
    expect(result.favorableElements.length).toBeGreaterThan(0)
    expect(result.unfavorableElements.length).toBeGreaterThan(0)
  })

  it('returns daYun array with age ranges', () => {
    const result = calculateBaZi(baseProfile)
    expect(result.daYun.length).toBeGreaterThan(0)
    for (const cycle of result.daYun) {
      expect(cycle.startAge).toBeGreaterThanOrEqual(0)
      expect(cycle.endAge).toBeGreaterThan(cycle.startAge)
      expect(cycle.stemBranch).toBeTruthy()
      expect(cycle.stemTenGod).toBeTruthy()
    }
  })

  it('returns deterministic results (same input = same output)', () => {
    const a = calculateBaZi(baseProfile)
    const b = calculateBaZi(baseProfile)
    expect(a.yearPillar.stem).toBe(b.yearPillar.stem)
    expect(a.dayPillar.stem).toBe(b.dayPillar.stem)
  })

  it('handles gender-specific daYun direction (阳男顺排)', () => {
    // 1998 is 戊寅年, 戊=阳, so 阳男=顺排
    const result = calculateBaZi(baseProfile)
    expect(result.daYun.length).toBeGreaterThan(0)
  })

  it('handles reverse daYun direction for 阴男逆排 (1965 乙巳年)', () => {
    // 1965 is 乙巳年, 乙=阴, 阴男 → reverse direction
    // Month pillar 壬午, reverse first cycle = 辛巳
    const result = calculateBaZi({
      birthYear: 1965, birthMonth: 6, birthDay: 15, birthCalendar: 'solar' as const,
      birthHour: 8, gender: '男' as const,
    })
    expect(result.daYun.length).toBeGreaterThan(0)
    expect(result.daYun[0].stemBranch).toBe('辛巳')
    // Last cycle after reversing should be predictable
    expect(result.daYun[result.daYun.length - 1].stemBranch).toBeTruthy()
  })

  it('handles reverse daYun direction for 阳女逆排 (1964 甲辰年)', () => {
    // 1964 is 甲辰年, 甲=阳, 阳女 → reverse direction
    // Month pillar 庚午, reverse first cycle = 己巳
    const result = calculateBaZi({
      birthYear: 1964, birthMonth: 6, birthDay: 15, birthCalendar: 'solar' as const,
      birthHour: 8, gender: '女' as const,
    })
    expect(result.daYun.length).toBeGreaterThan(0)
    expect(result.daYun[0].stemBranch).toBe('己巳')
    expect(result.daYun[result.daYun.length - 1].stemBranch).toBeTruthy()
  })

  it('returns element percentages summing to ~100', () => {
    const result = calculateBaZi(baseProfile)
    const pctSum = Object.values(result.elementPercentages).reduce((a, b) => a + b, 0)
    expect(Math.round(pctSum)).toBeGreaterThanOrEqual(95)
    expect(Math.round(pctSum)).toBeLessThanOrEqual(105)
  })
})
