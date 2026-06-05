/**
 * Phase D-2: LiuNian Scoring Sampling Tests
 *
 * Strategy: fixed birth chart, verify score distribution across 11 years,
 * current-year detail completeness, and scoring edge cases.
 * Total: ~80 assertions
 */

import { describe, it, expect } from 'vitest'
import { calculateBaZi, getTenGod } from '../../composables/useBaZi'
import { getStemIndex } from '../../constants/bazi'
import { calculateLiuNian, type LiuNianYear } from '../../composables/useLiuNian'

// Use a fixed birth chart with known properties for deterministic testing
function getFixedBaZi() {
  return calculateBaZi({
    birthYear: 1990,
    birthMonth: 6,
    birthDay: 15,
    birthCalendar: 'solar',
    birthHour: 12,
    gender: '男',
  })
}

// ═══════════════════════════════════════════════════════════════
// 1. Full 11-year distribution
// ═══════════════════════════════════════════════════════════════

describe('LiuNian 11-year distribution', () => {
  const baZi = getFixedBaZi()
  const years = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })

  it('returns 11 years (range=5)', () => {
    expect(years).toHaveLength(11)
  })

  it('years span 2021-2031', () => {
    expect(years[0].year).toBe(2021)
    expect(years[10].year).toBe(2031)
    expect(years[5].year).toBe(2026)
  })

  it('every year has a score in [0, 100]', () => {
    for (const y of years) {
      expect(y.score).toBeGreaterThanOrEqual(0)
      expect(y.score).toBeLessThanOrEqual(100)
    }
  })

  it('score distribution has variety (not all same)', () => {
    const scores = years.map(y => y.score)
    const unique = new Set(scores)
    // With 11 years, we should get at least 2 different scores
    expect(unique.size).toBeGreaterThanOrEqual(2)
  })

  it('every year has valid LiuNianYear fields', () => {
    for (const y of years) {
      expect(y.stem).toHaveLength(1)
      expect(y.branch).toHaveLength(1)
      expect(y.stemWuxing.length).toBeGreaterThan(0)
      expect(y.branchWuxing.length).toBeGreaterThan(0)
      expect(y.tenGod.length).toBeGreaterThan(0)
      expect(typeof y.isFavorable).toBe('boolean')
      expect(typeof y.isUnfavorable).toBe('boolean')
      expect(y.summary.length).toBeGreaterThan(0)
      expect(y.daYunStem.length).toBe(1)
      expect(y.daYunBranch.length).toBe(1)
    }
  })

  it('every year stem is a valid heavenly stem', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    for (const y of years) {
      expect(stems).toContain(y.stem)
    }
  })

  it('every year branch is a valid earthly branch', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    for (const y of years) {
      expect(branches).toContain(y.branch)
    }
  })

  it('year stems follow the 10-year cycle correctly', () => {
    // 2021=辛, 2022=壬, 2023=癸, 2024=甲, 2025=乙, 2026=丙, 2027=丁, ...
    const expectedStems = ['辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛']
    for (let i = 0; i < years.length; i++) {
      expect(years[i].stem).toBe(expectedStems[i])
    }
  })

  it('year branches follow the 12-year cycle correctly', () => {
    const expectedBranches = ['丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    for (let i = 0; i < years.length; i++) {
      expect(years[i].branch).toBe(expectedBranches[i])
    }
  })

  it('score does not exceed 100 even with all favorable signals', () => {
    // The most favorable year should still be ≤ 100
    const maxScore = Math.max(...years.map(y => y.score))
    expect(maxScore).toBeLessThanOrEqual(100)
  })

  it('score does not go below 0 even with all unfavorable signals', () => {
    const minScore = Math.min(...years.map(y => y.score))
    expect(minScore).toBeGreaterThanOrEqual(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Current year detail completeness
// ═══════════════════════════════════════════════════════════════

describe('LiuNian current-year detail', () => {
  const baZi = getFixedBaZi()
  const years = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })
  const current = years[5] // 2026 = middle

  it('current year has detail', () => {
    expect(current.detail).toBeDefined()
  })

  it('detail.daYunInteraction is non-empty', () => {
    expect(current.detail!.daYunInteraction.length).toBeGreaterThan(5)
  })

  it('detail.pillarsInteraction is non-empty array', () => {
    expect(current.detail!.pillarsInteraction.length).toBeGreaterThan(0)
  })

  it('detail.monthlyStems has 12 entries', () => {
    expect(current.detail!.monthlyStems).toHaveLength(12)
  })

  it('each monthly stem has month 1-12', () => {
    for (let i = 0; i < 12; i++) {
      expect(current.detail!.monthlyStems[i].month).toBe(i + 1)
    }
  })

  it('each monthly stem has valid stem and branch', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
    for (const ms of current.detail!.monthlyStems) {
      expect(stems).toContain(ms.stem)
      expect(branches).toContain(ms.branch)
      expect(ms.startMonth).toBeGreaterThanOrEqual(1)
      expect(ms.startMonth).toBeLessThanOrEqual(12)
      expect(ms.startDay).toBeGreaterThanOrEqual(1)
      expect(ms.startDay).toBeLessThanOrEqual(31)
    }
  })

  it('monthly stems follow 五虎遁: first month stem determined by year stem', () => {
    // 2026 is 丙午年 → year stem 丙 (index 2)
    // 五虎遁: 甲己→丙寅, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅
    // 丙年 → 庚寅月
    const monthly = current.detail!.monthlyStems
    expect(monthly[0].stem).toBe('庚')
    expect(monthly[0].branch).toBe('寅')
  })

  it('monthly stems are consecutive (寅卯辰巳午未申酉戌亥子丑)', () => {
    const branches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']
    for (let i = 0; i < 12; i++) {
      expect(current.detail!.monthlyStems[i].branch).toBe(branches[i])
    }
  })

  it('monthly stems start dates form strictly sequential solar term boundaries', () => {
    const ms = current.detail!.monthlyStems
    // Each month's start should generally be in a month ≥ previous
    // (寅=Feb, 卯=Mar, ..., 丑=Jan of next year → month decreases in Jan)
    let prevMonth = ms[0].startMonth
    for (let i = 1; i < 11; i++) {
      expect(ms[i].startMonth).toBeGreaterThanOrEqual(prevMonth)
      prevMonth = ms[i].startMonth
    }
    // 丑月 (month 12) starts in 小寒 ~Jan → month should be 1 (wrap-around)
  })

  it('non-current years do NOT have detail', () => {
    for (let i = 0; i < years.length; i++) {
      if (i !== 5) {
        expect(years[i].detail).toBeUndefined()
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Scoring breakdown verification
// ═══════════════════════════════════════════════════════════════

describe('LiuNian scoring components', () => {
  const baZi = getFixedBaZi()

  it('favorable year scores higher than neutral year for same chart', () => {
    const years = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })
    const favorable = years.filter(y => y.isFavorable)
    const neutral = years.filter(y => !y.isFavorable && !y.isUnfavorable)
    if (favorable.length > 0 && neutral.length > 0) {
      const favAvg = favorable.reduce((s, y) => s + y.score, 0) / favorable.length
      const neutAvg = neutral.reduce((s, y) => s + y.score, 0) / neutral.length
      expect(favAvg).toBeGreaterThan(neutAvg)
    }
  })

  it('unfavorable year scores lower than favorable year', () => {
    const years = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })
    const favorable = years.filter(y => y.isFavorable)
    const unfavorable = years.filter(y => y.isUnfavorable)
    if (favorable.length > 0 && unfavorable.length > 0) {
      const favAvg = favorable.reduce((s, y) => s + y.score, 0) / favorable.length
      const unfavAvg = unfavorable.reduce((s, y) => s + y.score, 0) / unfavorable.length
      expect(favAvg).toBeGreaterThan(unfavAvg)
    }
  })

  it('every summary ends with Chinese period', () => {
    const years = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })
    for (const y of years) {
      expect(y.summary.endsWith('。')).toBe(true)
    }
  })

  it('every summary is at least 10 characters', () => {
    const years = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })
    for (const y of years) {
      expect(y.summary.length).toBeGreaterThanOrEqual(10)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. ShenSha in LiuNian years
// ═══════════════════════════════════════════════════════════════

describe('LiuNian shenSha', () => {
  const baZi = getFixedBaZi()
  const years = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })

  it('every year has shenSha array (may be empty)', () => {
    for (const y of years) {
      expect(Array.isArray(y.shenSha)).toBe(true)
    }
  })

  it('all shensha in all years have pillar = "流年"', () => {
    for (const y of years) {
      for (const ss of y.shenSha) {
        expect(ss.pillar).toBe('流年')
      }
    }
  })

  it('all shensha have valid category (吉|凶|中性)', () => {
    for (const y of years) {
      for (const ss of y.shenSha) {
        expect(['吉', '凶', '中性']).toContain(ss.category)
      }
    }
  })

  it('at least some years have shenshas', () => {
    const hasShenSha = years.some(y => y.shenSha.length > 0)
    expect(hasShenSha).toBe(true)
  })

  it('shensha count is consistent across years (not all zero, not insanely high)', () => {
    for (const y of years) {
      expect(y.shenSha.length).toBeLessThanOrEqual(20) // reasonable cap
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Earth relations completeness
// ═══════════════════════════════════════════════════════════════

describe('LiuNian earth relations', () => {
  const baZi = getFixedBaZi()
  const years = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })

  it('every year has earthRelations array', () => {
    for (const y of years) {
      expect(Array.isArray(y.earthRelations)).toBe(true)
    }
  })

  it('earth relation types are valid', () => {
    for (const y of years) {
      for (const rel of y.earthRelations) {
        expect(['合', '冲', '刑', '害', '破']).toContain(rel.type)
        expect(rel.target.length).toBe(1)
        expect(['年柱', '月柱', '日柱', '时柱']).toContain(rel.targetPillar)
        expect(rel.description.length).toBeGreaterThan(0)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. Edge cases
// ═══════════════════════════════════════════════════════════════

describe('LiuNian edge cases', () => {
  it('range=0 returns only current year', () => {
    const baZi = getFixedBaZi()
    const years = calculateLiuNian({ baZi, currentYear: 2026, range: 0 })
    expect(years).toHaveLength(1)
    expect(years[0].year).toBe(2026)
  })

  it('range=1 returns 3 years', () => {
    const baZi = getFixedBaZi()
    const years = calculateLiuNian({ baZi, currentYear: 2026, range: 1 })
    expect(years).toHaveLength(3)
    expect(years[0].year).toBe(2025)
    expect(years[1].year).toBe(2026)
    expect(years[2].year).toBe(2027)
  })

  it('handles year 1900 correctly (edge of 60-year cycle)', () => {
    const baZi = getFixedBaZi()
    const years = calculateLiuNian({ baZi, currentYear: 1900, range: 2 })
    expect(years).toHaveLength(5)
    // 1900 is 庚子年
    expect(years[2].stem).toBe('庚')
    expect(years[2].branch).toBe('子')
  })

  it('handles year 2099 correctly', () => {
    const baZi = getFixedBaZi()
    const years = calculateLiuNian({ baZi, currentYear: 2099, range: 2 })
    expect(years).toHaveLength(5)
    // 2099 mod 60: 2099-1984=115, 115%60=55. 1984=甲子, so 1984+55=2039? Let's compute differently.
    // Actually: (2099-4)%60 = 2095%60 = 55. 55%10=5→己, 55%12=7→未. So 己未年.
    expect(years[2].stem).toBe('己')
    expect(years[2].branch).toBe('未')
  })

  it('daYun stem and branch are non-empty for all years', () => {
    const baZi = getFixedBaZi()
    const years = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })
    for (const y of years) {
      expect(y.daYunStem).toBeTruthy()
      expect(y.daYunBranch).toBeTruthy()
    }
  })

  it('tenGod is consistent with year stem and day master', () => {
    const baZi = getFixedBaZi()
    const dayMasterIdx = getStemIndex(baZi.dayMaster)
    const years = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })
    for (const y of years) {
      const expected = getTenGod(dayMasterIdx, y.stem)
      expect(y.tenGod).toBe(expected)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Deterministism and reproducibility
// ═══════════════════════════════════════════════════════════════

describe('LiuNian determinism', () => {
  it('same input produces identical output twice', () => {
    const baZi = getFixedBaZi()
    const a = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })
    const b = calculateLiuNian({ baZi, currentYear: 2026, range: 5 })
    for (let i = 0; i < a.length; i++) {
      expect(a[i].year).toBe(b[i].year)
      expect(a[i].score).toBe(b[i].score)
      expect(a[i].summary).toBe(b[i].summary)
      expect(a[i].tenGod).toBe(b[i].tenGod)
    }
  })
})
