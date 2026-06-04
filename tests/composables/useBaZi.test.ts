import { describe, it, expect } from 'vitest'
import { calculateBaZi, getTenGod, getDayMasterStrength, getFavorableElements, getWeightedDayMasterStrength } from '../../composables/useBaZi'
import type { BaZiPillar } from '../../composables/useBaZi'
import { STEMS } from '../../constants/bazi'

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

  it('handles 子时 boundary: birthHour=23 produces branch 子', () => {
    const result = calculateBaZi({
      ...baseProfile, birthHour: 23,
    })
    expect(result.hourPillar).not.toBeNull()
    expect(result.hourPillar!.branch).toBe('子')
  })

  it('handles 子时 boundary: birthHour=0 also produces branch 子', () => {
    const result = calculateBaZi({
      ...baseProfile, birthHour: 0,
    })
    expect(result.hourPillar).not.toBeNull()
    expect(result.hourPillar!.branch).toBe('子')
  })

  it('birth at 23:30 (子时 before midnight) uses current day pillar, not next day (known limitation)', () => {
    // Traditional Chinese timekeeping: 子时 (23:00-00:59) belongs to the next day.
    // The current implementation calculates the day pillar from birth date directly,
    // so 23:30 on Date D uses Date D's stem-branch, not Date D+1's.
    // This test documents the current behavior.
    const lateNight = calculateBaZi({
      birthYear: 2000, birthMonth: 1, birthDay: 15,
      birthCalendar: 'solar' as const, birthHour: 23, gender: '男' as const,
    })
    const nextDay = calculateBaZi({
      birthYear: 2000, birthMonth: 1, birthDay: 16,
      birthCalendar: 'solar' as const, birthHour: 0, gender: '男' as const,
    })
    // Late night uses 15th's day pillar, while next day 00:30 uses 16th's
    // Since adjacent days have different stem-branch pairs, these must differ
    expect(lateNight.dayPillar.stem + lateNight.dayPillar.branch).not.toBe(
      nextDay.dayPillar.stem + nextDay.dayPillar.branch,
    )
  })

  it('falls back to treating input as solar when lunar conversion fails', () => {
    // Invalid lunar date (month 13 doesn't exist)
    const result = calculateBaZi({
      birthYear: 2024,
      birthMonth: 13,
      birthDay: 1,
      birthCalendar: 'lunar',
      birthHour: 8,
      gender: '男',
    })
    // Should still produce a result (fallback), not throw
    expect(result.dayMaster).toBeTruthy()
    expect(result.yearPillar).toHaveProperty('stem')
    expect(result.monthPillar).toHaveProperty('stem')
    expect(result.dayPillar).toHaveProperty('stem')
    expect(result.hourPillar).not.toBeNull()
  })

  it('handles null birthHour without crashing', () => {
    const result = calculateBaZi({
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      birthCalendar: 'solar',
      birthHour: null,
      gender: '男',
    })
    expect(result.hourPillar).toBeNull()
    expect(result.dayMaster).toBeTruthy()
    expect(result.yearPillar).toHaveProperty('stem')
    expect(result.monthPillar).toHaveProperty('stem')
    expect(result.dayPillar).toHaveProperty('stem')
  })

  it('农历输入转换为公历后再计算八字', () => {
    const lunar = calculateBaZi({
      ...baseProfile, birthCalendar: 'lunar' as const,
    })
    const solar = calculateBaZi({
      ...baseProfile, birthCalendar: 'solar' as const,
    })
    // 农历 1998-05-25 转换为公历后 ≠ 公历 1998-05-25，日柱应不同
    expect(lunar.dayPillar.stem + lunar.dayPillar.branch).not.toBe(
      solar.dayPillar.stem + solar.dayPillar.branch,
    )
    // 结果结构仍然完整
    expect(lunar.dayMaster).toBeTruthy()
    expect(lunar.daYun.length).toBeGreaterThan(0)
    expect(lunar.yearPillar.stem).toBeTruthy()
    expect(lunar.monthPillar.stem).toBeTruthy()
  })

  it('handles invalid date (2024-02-30) without crashing', () => {
    // Feb 30 does not exist, but the calculation engine should handle it
    // without throwing — it calculates based on raw date values
    expect(() => calculateBaZi({
      birthYear: 2024, birthMonth: 2, birthDay: 30,
      birthCalendar: 'solar' as const, birthHour: 12, gender: '男' as const,
    })).not.toThrow()
    const result = calculateBaZi({
      birthYear: 2024, birthMonth: 2, birthDay: 30,
      birthCalendar: 'solar' as const, birthHour: 12, gender: '男' as const,
    })
    // Result should still have all expected structure
    expect(result.yearPillar).toHaveProperty('stem')
    expect(result.dayPillar).toHaveProperty('stem')
    expect(result.monthPillar).toHaveProperty('stem')
    expect(result.hourPillar).not.toBeNull()
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

  it('day pillar stemTenGod is 日主, no other pillar has it', () => {
    const result = calculateBaZi(baseProfile)
    expect(result.dayPillar.stemTenGod).toBe('日主')
    expect(result.yearPillar.stemTenGod).not.toBe('日主')
    expect(result.monthPillar.stemTenGod).not.toBe('日主')
    expect(result.hourPillar!.stemTenGod).not.toBe('日主')
  })

  it('same-stem non-day pillar gets 比肩 not 日主 (甲年甲日)', () => {
    // 1964-07-14: 甲辰年 甲寅日 — year stem = day stem = 甲
    const result = calculateBaZi({
      birthYear: 1964, birthMonth: 7, birthDay: 14,
      birthCalendar: 'solar' as const, birthHour: 8, gender: '男' as const,
    })
    expect(result.dayMaster).toBe('甲')
    expect(result.yearPillar.stem).toBe('甲')
    expect(result.yearPillar.stemTenGod).not.toBe('日主')
    expect(result.yearPillar.stemTenGod).toBe('比肩')
  })

  it('hidden stems never show 日主, matching stem gets 比肩', () => {
    // 1964-07-14: 甲寅日, day branch 寅 hidden stems [甲, 丙, 戊]
    // The hidden 甲 matches day master — must be 比肩, not 日主
    const result = calculateBaZi({
      birthYear: 1964, birthMonth: 7, birthDay: 14,
      birthCalendar: 'solar' as const, birthHour: 8, gender: '男' as const,
    })
    const allPillars = [result.yearPillar, result.monthPillar, result.dayPillar]
    if (result.hourPillar) allPillars.push(result.hourPillar)
    for (const pillar of allPillars) {
      for (const hs of pillar.hiddenStems) {
        expect(hs.tenGod).not.toBe('日主')
      }
    }
    // Day pillar branch 寅: first hidden stem is 甲, should be 比肩
    const jiaHidden = result.dayPillar.hiddenStems.find(hs => hs.stem === '甲')
    expect(jiaHidden).toBeDefined()
    expect(jiaHidden!.tenGod).toBe('比肩')
  })

  it('daYun first cycle ten god is a valid non-日主 value', () => {
    const result = calculateBaZi(baseProfile)
    const firstCycle = result.daYun[0]
    expect(firstCycle.stemTenGod).toBeTruthy()
    expect(firstCycle.stemTenGod).not.toBe('日主')
    const validTenGods = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '偏官', '正官', '偏印', '正印']
    expect(validTenGods).toContain(firstCycle.stemTenGod)
  })
})

// ============================================================================
// T1: Full Ten God Matrix Verification
// ============================================================================

describe('getTenGod — full 10×10 matrix', () => {
  // Reference rules (identical semantics to source, independently constructed)
  const WUXING = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']
  const YIN_YANG = ['阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴']

  const PRODUCES: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
  const CONTROLS: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }

  function expectedTenGod(dmIdx: number, targetIdx: number): string {
    if (dmIdx === targetIdx) return '比肩'

    const dmWx = WUXING[dmIdx]
    const targetWx = WUXING[targetIdx]
    const sameYy = YIN_YANG[dmIdx] === YIN_YANG[targetIdx]

    if (targetWx === dmWx) return sameYy ? '比肩' : '劫财'
    if (PRODUCES[targetWx] === dmWx) return sameYy ? '偏印' : '正印'
    if (PRODUCES[dmWx] === targetWx) return sameYy ? '食神' : '伤官'
    if (CONTROLS[targetWx] === dmWx) return sameYy ? '偏官' : '正官'
    if (CONTROLS[dmWx] === targetWx) return sameYy ? '偏财' : '正财'

    return '比肩' // fallback
  }

  it('all 100 cells match reference rules', () => {
    for (let dm = 0; dm < 10; dm++) {
      for (let target = 0; target < 10; target++) {
        const expected = expectedTenGod(dm, target)
        const actual = getTenGod(dm, STEMS[target])
        expect(actual, `${STEMS[dm]}(DM) → ${STEMS[target]}: expected ${expected}, got ${actual}`).toBe(expected)
      }
    }
  })

  it('returns 比肩 when day master and target are the same stem character', () => {
    expect(getTenGod(0, '甲')).toBe('比肩')
    expect(getTenGod(3, '丁')).toBe('比肩')
    expect(getTenGod(6, '庚')).toBe('比肩')
    expect(getTenGod(9, '癸')).toBe('比肩')
  })

  it('returns — for invalid stem input', () => {
    expect(getTenGod(0, 'X')).toBe('—')
    expect(getTenGod(0, '')).toBe('—')
    expect(getTenGod(0, '子')).toBe('—')
  })
})

// ============================================================================
// T2: Day Master Strength Correctness
// ============================================================================

describe('getDayMasterStrength — textbook cases', () => {
  // Branch indices: 子=0, 丑=1, 寅=2, 卯=3, 辰=4, 巳=5, 午=6, 未=7, 申=8, 酉=9, 戌=10, 亥=11

  it('甲木 in 寅月(2) → 强 (wood peaks in spring)', () => {
    expect(getDayMasterStrength('木', 2)).toBe('强')
  })

  it('甲木 in 申月(8) → 弱 (wood is trapped in autumn metal)', () => {
    expect(getDayMasterStrength('木', 8)).toBe('弱')
  })

  it('丙火 in 午月(6) → 强 (fire peaks in summer)', () => {
    expect(getDayMasterStrength('火', 6)).toBe('强')
  })

  it('丙火 in 子月(0) → 偏弱 (fire weakens in winter water)', () => {
    expect(getDayMasterStrength('火', 0)).toBe('偏弱')
  })

  it('庚金 in 申月(8) → 强 (metal peaks in autumn)', () => {
    expect(getDayMasterStrength('金', 8)).toBe('强')
  })

  it('庚金 in 午月(6) → 偏弱 (metal weakens in summer fire)', () => {
    expect(getDayMasterStrength('金', 6)).toBe('偏弱')
  })

  it('壬水 in 子月(0) → 强 (water peaks in winter)', () => {
    expect(getDayMasterStrength('水', 0)).toBe('强')
  })

  it('壬水 in 未月(7) → 偏弱 (water weakens in summer earth)', () => {
    expect(getDayMasterStrength('水', 7)).toBe('偏弱')
  })

  it('戊土 in 辰月(4) → 强 (earth prospers in late spring)', () => {
    expect(getDayMasterStrength('土', 4)).toBe('强')
  })

  it('戊土 in 寅月(2) → 偏弱 (earth weakens in spring wood)', () => {
    expect(getDayMasterStrength('土', 2)).toBe('偏弱')
  })

  it('returns a valid strength value for all (element, month) combinations', () => {
    const validStrengths = ['强', '偏强', '中和', '偏弱', '弱']
    const elements = ['木', '火', '土', '金', '水']
    for (const el of elements) {
      for (let branchIdx = 0; branchIdx < 12; branchIdx++) {
        const strength = getDayMasterStrength(el, branchIdx)
        expect(validStrengths).toContain(strength)
      }
    }
  })
})

// ============================================================================
// T3: Favorable Elements Correctness
// ============================================================================

describe('getFavorableElements — correctness', () => {
  it('庚金 身强 → 喜用=火/水/木, 忌神=金/土', () => {
    const [fav, unfav] = getFavorableElements('金', '强')
    // 官杀=火, 食伤=水, 财=木 → sorted: 木/水/火 (CJK sort)
    expect([...fav].sort()).toEqual(['木', '水', '火'])
    expect([...unfav].sort()).toEqual(['土', '金'])
  })

  it('癸水 身弱 → 喜用=金/水, 忌神=土/火/木', () => {
    const [fav, unfav] = getFavorableElements('水', '弱')
    expect([...fav].sort()).toEqual(['水', '金'])
    expect([...unfav].sort()).toEqual(['土', '木', '火'])
  })

  it('甲木 身强 → 喜用=金/火/土, 忌神=木/水', () => {
    const [fav, unfav] = getFavorableElements('木', '强')
    // 官杀=金, 食伤=火, 财=土 → sorted: 土/火/金 (Unicode sort)
    expect([...fav].sort()).toEqual(['土', '火', '金'])
    expect([...unfav].sort()).toEqual(['木', '水'])
  })

  it('丙火 身弱 → 喜用=木/火, 忌神=水/金/土', () => {
    const [fav, unfav] = getFavorableElements('火', '弱')
    expect([...fav].sort()).toEqual(['木', '火'])
    expect([...unfav].sort()).toEqual(['土', '水', '金'])
  })

  it('戊土 中和 → both arrays non-empty with valid wuxing values', () => {
    const [fav, unfav] = getFavorableElements('土', '中和')
    const validElements = ['木', '火', '土', '金', '水']
    expect(fav.length).toBeGreaterThan(0)
    expect(unfav.length).toBeGreaterThan(0)
    for (const el of fav) expect(validElements).toContain(el)
    for (const el of unfav) expect(validElements).toContain(el)
  })

  it('偏强 follows same rule as 强', () => {
    const strong = getFavorableElements('金', '强')
    const slightlyStrong = getFavorableElements('金', '偏强')
    expect(strong).toEqual(slightlyStrong)
  })

  it('偏弱 follows same rule as 弱', () => {
    const weak = getFavorableElements('水', '弱')
    const slightlyWeak = getFavorableElements('水', '偏弱')
    expect(weak).toEqual(slightlyWeak)
  })
})

// ============================================================================
// T4: Weighted Day Master Strength (Task A2)
// ============================================================================

describe('getWeightedDayMasterStrength', () => {
  it('甲木日主 寅月 年时皆木 → 强', () => {
    const pillars = [
      { stem: '甲', branch: '寅', stemWuxing: '木', branchWuxing: '木', stemTenGod: '比肩', hiddenStems: [{ stem: '甲', wuxing: '木' }, { stem: '丙', wuxing: '火' }, { stem: '戊', wuxing: '土' }] },
      { stem: '丙', branch: '寅', stemWuxing: '火', branchWuxing: '木', stemTenGod: '食神', hiddenStems: [{ stem: '甲', wuxing: '木' }, { stem: '丙', wuxing: '火' }, { stem: '戊', wuxing: '土' }] },
      { stem: '甲', branch: '午', stemWuxing: '木', branchWuxing: '火', stemTenGod: '比肩', hiddenStems: [{ stem: '丁', wuxing: '火' }, { stem: '己', wuxing: '土' }] },
      { stem: '甲', branch: '子', stemWuxing: '木', branchWuxing: '水', stemTenGod: '比肩', hiddenStems: [{ stem: '癸', wuxing: '水' }] },
    ] as unknown as BaZiPillar[]
    expect(getWeightedDayMasterStrength('木', pillars)).toBe('强')
  })

  it('庚金日主 午月 火旺克金 → 弱', () => {
    const pillars = [
      { stem: '丙', branch: '午', stemWuxing: '火', branchWuxing: '火', stemTenGod: '七杀', hiddenStems: [{ stem: '丁', wuxing: '火' }, { stem: '己', wuxing: '土' }] },
      { stem: '甲', branch: '午', stemWuxing: '木', branchWuxing: '火', stemTenGod: '偏财', hiddenStems: [{ stem: '丁', wuxing: '火' }, { stem: '己', wuxing: '土' }] },
      { stem: '庚', branch: '申', stemWuxing: '金', branchWuxing: '金', stemTenGod: '日主', hiddenStems: [{ stem: '庚', wuxing: '金' }, { stem: '壬', wuxing: '水' }, { stem: '戊', wuxing: '土' }] },
      { stem: '丙', branch: '戌', stemWuxing: '火', branchWuxing: '土', stemTenGod: '七杀', hiddenStems: [{ stem: '戊', wuxing: '土' }, { stem: '辛', wuxing: '金' }, { stem: '丁', wuxing: '火' }] },
    ] as unknown as BaZiPillar[]
    expect(getWeightedDayMasterStrength('金', pillars)).toBe('弱')
  })

  it('丙火日主 寅月 木火相助 → 偏强', () => {
    const pillars = [
      { stem: '甲', branch: '辰', stemWuxing: '木', branchWuxing: '土', stemTenGod: '偏印', hiddenStems: [{ stem: '戊', wuxing: '土' }, { stem: '乙', wuxing: '木' }, { stem: '癸', wuxing: '水' }] },
      { stem: '丙', branch: '寅', stemWuxing: '火', branchWuxing: '木', stemTenGod: '日主', hiddenStems: [{ stem: '甲', wuxing: '木' }, { stem: '丙', wuxing: '火' }, { stem: '戊', wuxing: '土' }] },
      { stem: '丙', branch: '戌', stemWuxing: '火', branchWuxing: '土', stemTenGod: '比肩', hiddenStems: [{ stem: '戊', wuxing: '土' }, { stem: '辛', wuxing: '金' }, { stem: '丁', wuxing: '火' }] },
      { stem: '戊', branch: '申', stemWuxing: '土', branchWuxing: '金', stemTenGod: '食神', hiddenStems: [{ stem: '庚', wuxing: '金' }, { stem: '壬', wuxing: '水' }, { stem: '戊', wuxing: '土' }] },
    ] as unknown as BaZiPillar[]
    expect(getWeightedDayMasterStrength('火', pillars)).toBe('偏强')
  })
})
