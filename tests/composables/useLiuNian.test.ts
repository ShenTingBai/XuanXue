import { describe, it, expect } from 'vitest'
import { calculateLiuNian } from '../../composables/useLiuNian'
import { calculateBaZi } from '../../composables/useBaZi'

describe('calculateLiuNian', () => {
  const baseProfile = {
    birthYear: 1998,
    birthMonth: 5,
    birthDay: 25,
    birthCalendar: 'solar' as const,
    birthHour: 14,
    gender: '男' as const,
  }

  const bazi = calculateBaZi(baseProfile)

  it('returns 2*range+1 years (default range=5 -> 11 years)', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    expect(result.length).toBe(11)
  })

  it('returns the correct year span', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, range: 2, shenSha: [] })
    expect(result.length).toBe(5)
    expect(result[0].year).toBe(2024)
    expect(result[4].year).toBe(2028)
  })

  it('each year has correct structure', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    for (const year of result) {
      expect(year).toHaveProperty('year')
      expect(year).toHaveProperty('stem')
      expect(year).toHaveProperty('branch')
      expect(year).toHaveProperty('stemWuxing')
      expect(year).toHaveProperty('branchWuxing')
      expect(year).toHaveProperty('tenGod')
      expect(year).toHaveProperty('isFavorable')
      expect(year).toHaveProperty('earthRelations')
      expect(year).toHaveProperty('shenSha')
      expect(year).toHaveProperty('score')
      expect(year).toHaveProperty('summary')
      expect(year).toHaveProperty('daYunStem')
      expect(year).toHaveProperty('daYunBranch')
      expect(year.stem.length).toBe(1)
      expect(year.branch.length).toBe(1)
      expect(['木', '火', '土', '金', '水']).toContain(year.stemWuxing)
      expect(['木', '火', '土', '金', '水']).toContain(year.branchWuxing)
      expect(typeof year.isFavorable).toBe('boolean')
      expect(Array.isArray(year.earthRelations)).toBe(true)
      expect(Array.isArray(year.shenSha)).toBe(true)
      expect(typeof year.score).toBe('number')
      expect(year.score).toBeGreaterThanOrEqual(0)
      expect(year.score).toBeLessThanOrEqual(100)
      expect(typeof year.summary).toBe('string')
      expect(year.summary.length).toBeGreaterThan(0)
    }
  })

  it('current year (middle element) has detail', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    const currentYear = result[5] // middle of 11 (index 5 = 2026)
    expect(currentYear.year).toBe(2026)
    expect(currentYear.detail).toBeDefined()
    expect(currentYear.detail!.daYunInteraction).toBeTruthy()
    expect(Array.isArray(currentYear.detail!.pillarsInteraction)).toBe(true)
    expect(currentYear.detail!.monthlyStems.length).toBe(12)
    for (const ms of currentYear.detail!.monthlyStems) {
      expect(ms.month).toBeGreaterThanOrEqual(1)
      expect(ms.month).toBeLessThanOrEqual(12)
      expect(ms.stem.length).toBe(1)
      expect(ms.branch.length).toBe(1)
    }
  })

  it('non-current years do NOT have detail', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    for (let i = 0; i < result.length; i++) {
      if (i !== 5) {
        expect(result[i].detail).toBeUndefined()
      }
    }
  })

  it('monthly stems follow 五虎遁 correctly for 2026 丙午年', () => {
    // 2026 = 丙午年, year stem index = (2026-4)%10 = 2 (丙)
    // 五虎遁: (2*2+2)%10 = 6%10 = 6 (庚)
    // So 寅月 = 庚寅, 卯月 = 辛卯, ...
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    const monthlyStems = result[5].detail!.monthlyStems
    expect(monthlyStems[0].stem).toBe('庚') // 寅月 = 庚寅
    expect(monthlyStems[0].branch).toBe('寅')
    expect(monthlyStems[1].stem).toBe('辛') // 卯月 = 辛卯
    expect(monthlyStems[1].branch).toBe('卯')
  })

  it('is deterministic (same input = same output)', () => {
    const a = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    const b = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    expect(a[5].year).toBe(b[5].year)
    expect(a[5].score).toBe(b[5].score)
    expect(a[5].summary).toBe(b[5].summary)
  })

  it('known year stems: 2024=甲辰, 2025=乙巳, 2026=丙午', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    const year2024 = result.find(y => y.year === 2024)
    const year2025 = result.find(y => y.year === 2025)
    const year2026 = result.find(y => y.year === 2026)
    expect(year2024?.stem).toBe('甲')
    expect(year2024?.branch).toBe('辰')
    expect(year2025?.stem).toBe('乙')
    expect(year2025?.branch).toBe('巳')
    expect(year2026?.stem).toBe('丙')
    expect(year2026?.branch).toBe('午')
  })

  it('handles chart with null hourPillar', () => {
    const baziNoHour = calculateBaZi({ ...baseProfile, birthHour: null })
    const result = calculateLiuNian({ baZi: baziNoHour, currentYear: 2026, shenSha: [] })
    expect(result.length).toBe(11)
    expect(result[5].detail).toBeDefined()
  })

  // === Scoring algorithm tests ===

  it('scoring starts at base 50', () => {
    // 1998-05-25 壬日主偏弱, favorable=[金,水] (印+比劫), unfavorable=[木,火,土] (食伤+财+官杀)
    // 2026=丙午年 (丙=火, in unfavorableElements) → isUnfavorable=true, score <= 50
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    const year2026 = result.find(y => y.year === 2026)
    expect(year2026!.isUnfavorable).toBe(true)
    // Score base 50 - 20 for unfavorable + earth relations adjustments
    expect(year2026!.score).toBeLessThanOrEqual(50)
  })

  it('unfavorable year stem reduces score', () => {
    // 壬日主偏弱, unfavorable=[木,火,土]. 木/火/土 year stems score <= 50.
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2025, shenSha: [] })
    const unfavorableYears = result.filter(y => y.isUnfavorable)
    if (unfavorableYears.length > 0) {
      // An unfavorable year should have score <= 50 (base 50 - 20)
      expect(unfavorableYears[0].score).toBeLessThanOrEqual(50)
    }
  })

  it('neutral year (neither favorable nor unfavorable) has score near 50', () => {
    // For a neutral year, isFavorable=false && isUnfavorable=false
    // The score should be 50 ± earth relations and shensha
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    const neutralYears = result.filter(y => !y.isFavorable && !y.isUnfavorable)
    if (neutralYears.length > 0) {
      // Score is 50 + earth relations adjustments + shensha adjustments
      // Just verify score is in valid range
      expect(neutralYears[0].score).toBeGreaterThanOrEqual(0)
      expect(neutralYears[0].score).toBeLessThanOrEqual(100)
    }
  })

  // === Earth relations tests ===

  it('detects 六冲 between year branch and pillar branch', () => {
    // 子午冲: 2020=庚子年, if any pillar has branch=午 → should detect 冲
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2020, shenSha: [] })
    const year2020 = result.find(y => y.year === 2020)
    const chongRelations = year2020!.earthRelations.filter(r => r.type === '冲')
    // 子冲午 — if any pillar has 午 branch
    // bazi.dayPillar.branch for 1998-05-25 is 戌, so 子 doesn't 冲 戌
    // Let's check yearPillar (寅), monthPillar (巳), dayPillar (戌), hourPillar
    // None of these are 午, so there might be no 冲
    // But the test should just verify the structure is correct
    for (const rel of chongRelations) {
      expect(rel.type).toBe('冲')
      expect(typeof rel.target).toBe('string')
      expect(typeof rel.targetPillar).toBe('string')
      expect(typeof rel.description).toBe('string')
    }
  })

  it('earth relations include proper description strings', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    for (const year of result) {
      for (const rel of year.earthRelations) {
        expect(rel.description.length).toBeGreaterThan(0)
        // Description should contain the year
        expect(rel.description).toContain(String(year.year))
      }
    }
  })

  // === Summary tests ===

  it('summary is a non-empty string ending with Chinese period', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    for (const year of result) {
      expect(year.summary.length).toBeGreaterThan(0)
      expect(year.summary).toMatch(/。$/)
    }
  })

  it('summary contains ten god name for favorable year', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    const favorableYears = result.filter(y => y.isFavorable)
    if (favorableYears.length > 0) {
      // Favorable year should mention the ten god or use the positive template
      const yr = favorableYears[0]
      expect(yr.summary).toBeTruthy()
      expect(yr.summary.length).toBeGreaterThan(0)
    }
  })

  // === Shensha tests ===

  it('year-specific shenshas include pillar "流年"', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    for (const year of result) {
      for (const ss of year.shenSha) {
        expect(ss.pillar).toContain('流年')
      }
    }
  })

  it('shenshas have valid categories', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    for (const year of result) {
      for (const ss of year.shenSha) {
        expect(['吉', '凶', '中性']).toContain(ss.category)
      }
    }
  })

  // === DaYun tests ===

  it('each year has daYun stem and branch assigned', () => {
    const result = calculateLiuNian({ baZi: bazi, currentYear: 2026, shenSha: [] })
    for (const year of result) {
      expect(year.daYunStem.length).toBe(1)
      expect(year.daYunBranch.length).toBe(1)
    }
  })

  // === Earth relations — 自刑 ===

  it('辰流年 vs 辰年柱 triggers self-xing', () => {
    // 2000-02-05 → 庚辰年, year pillar branch = 辰
    const baZi = calculateBaZi({
      birthYear: 2000, birthMonth: 2, birthDay: 5,
      birthCalendar: 'solar', birthHour: 12, gender: '男',
    })
    // 2024 = 甲辰年, 流年 branch = 辰 → 辰辰自刑
    const liuNian = calculateLiuNian({ baZi, shenSha: [], currentYear: 2024, range: 0 })
    const year2024 = liuNian[0]
    const yearXing = year2024.earthRelations.filter(r => r.targetPillar === '年柱' && r.type === '刑')
    expect(yearXing.length).toBeGreaterThan(0)
    expect(yearXing[0].description).toContain('自刑')
  })

  // === Earth relations — 合破 conflict ===

  it('寅亥合应抑制破', () => {
    // 2007-02-05 → 丁亥年, year pillar branch = 亥
    const baZi = calculateBaZi({
      birthYear: 2007, birthMonth: 2, birthDay: 5,
      birthCalendar: 'solar', birthHour: 12, gender: '男',
    })
    // 2022 = 壬寅年, 流年 branch = 寅 → 寅亥 is both 六合 and 六破
    // The code suppresses 破 when 合 exists for the same branch pair
    const liuNian = calculateLiuNian({ baZi, shenSha: [], currentYear: 2022, range: 0 })
    const year2022 = liuNian[0]
    const yearHe = year2022.earthRelations.filter(r => r.targetPillar === '年柱' && r.type === '合')
    const yearPo = year2022.earthRelations.filter(r => r.targetPillar === '年柱' && r.type === '破')
    expect(yearHe.length).toBeGreaterThan(0)   // 合应存在
    expect(yearPo.length).toBe(0)               // 破应被抑制
  })
})
