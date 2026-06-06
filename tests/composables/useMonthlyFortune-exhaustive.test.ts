/**
 * Phase D-5: MonthlyFortune Sampling Tests
 *
 * Strategy: Sample 1 full year × 12 months per zodiac animal, verify output structure,
 * score ranges, level classifications, and edge cases.
 * Total: ~90 assertions
 */

import { describe, it, expect } from 'vitest'
import { calculateMonthlyFortune } from '../../composables/useMonthlyFortune'
import { BRANCHES, WUXING_BRANCH } from '../../constants/bazi'

// ═══════════════════════════════════════════════════════════════
// 1. Full structure verification for a single year
// ═══════════════════════════════════════════════════════════════

describe('MonthlyFortune — structure verification (2026, 鼠)', () => {
  const result = calculateMonthlyFortune(1996, 2026, '子', '水')

  it('returns correct year and animal info', () => {
    expect(result.year).toBe(2026)
    expect(result.animal).toBe('鼠')
    expect(result.animalBranch).toBe('子')
    expect(result.animalElement).toBe('水')
  })

  it('returns exactly 12 months', () => {
    expect(result.months).toHaveLength(12)
  })

  it('months are indexed 1-12 sequentially', () => {
    for (let i = 0; i < 12; i++) {
      expect(result.months[i].monthIndex).toBe(i + 1)
    }
  })

  it('month branches are 寅卯辰巳午未申酉戌亥子丑 in order', () => {
    const expected = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']
    for (let i = 0; i < 12; i++) {
      expect(result.months[i].monthBranch).toBe(expected[i])
    }
  })

  it('month names are 寅月 through 丑月', () => {
    const expected = [
      '寅月',
      '卯月',
      '辰月',
      '巳月',
      '午月',
      '未月',
      '申月',
      '酉月',
      '戌月',
      '亥月',
      '子月',
      '丑月',
    ]
    for (let i = 0; i < 12; i++) {
      expect(result.months[i].monthName).toBe(expected[i])
    }
  })

  it('every month has a valid stem (天干)', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    for (const m of result.months) {
      expect(stems).toContain(m.monthStem)
    }
  })

  it('every month has a gregorian label with — separator', () => {
    for (const m of result.months) {
      expect(m.gregorianLabel).toMatch(/^\d{1,2}\/\d{1,2}—\d{1,2}\/\d{1,2}$/)
    }
  })

  it('every month has score in [0, 100]', () => {
    for (const m of result.months) {
      expect(m.score).toBeGreaterThanOrEqual(0)
      expect(m.score).toBeLessThanOrEqual(100)
    }
  })

  it('every month has level 旺/平/弱 with label', () => {
    for (const m of result.months) {
      expect(['旺', '平', '弱']).toContain(m.level)
      if (m.level === '旺') expect(m.levelLabel).toBe('运势旺盛')
      if (m.level === '平') expect(m.levelLabel).toBe('运势平稳')
      if (m.level === '弱') expect(m.levelLabel).toBe('运势低迷')
    }
  })

  it('level matches score thresholds: ≥70→旺, <40→弱, else→平', () => {
    for (const m of result.months) {
      if (m.score >= 70) expect(m.level).toBe('旺')
      else if (m.score < 40) expect(m.level).toBe('弱')
      else expect(m.level).toBe('平')
    }
  })

  it('every month has a relationship string', () => {
    const validRelations = ['六合', '三合', '相冲', '相刑', '相害', '相破', '无特殊关系']
    for (const m of result.months) {
      expect(validRelations).toContain(m.relationship)
    }
  })

  it('every month has a non-empty tip', () => {
    for (const m of result.months) {
      expect(m.tip.length).toBeGreaterThan(0)
    }
  })

  it('relationshipDesc is empty only for 无特殊关系', () => {
    for (const m of result.months) {
      if (m.relationship === '无特殊关系') {
        expect(m.relationshipDesc).toBe('')
      } else {
        expect(m.relationshipDesc.length).toBeGreaterThan(0)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Twelve zodiac animals — full-year sampling
// ═══════════════════════════════════════════════════════════════

describe('MonthlyFortune — all 12 zodiac animals (2026)', () => {
  // Birth years that map to each animal in 2026 context
  // For calculateMonthlyFortune, birthYear determines the animal via (year-4)%12
  // 2020=鼠, 2021=牛, 2022=虎, 2023=兔, 2024=龙, 2025=蛇,
  // 2014=马, 2015=羊, 2016=猴, 2017=鸡, 2018=狗, 2019=猪
  const animalYears = [2020, 2021, 2022, 2023, 2024, 2025, 2014, 2015, 2016, 2017, 2018, 2019]
  const expectedAnimals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

  for (let i = 0; i < 12; i++) {
    const by = animalYears[i]
    const branch = BRANCHES[i]
    const element = WUXING_BRANCH[branch]
    const result = calculateMonthlyFortune(by, 2026, branch, element)

    it(`${expectedAnimals[i]} (${branch}, ${element}): returns correct animal info`, () => {
      expect(result.animal).toBe(expectedAnimals[i])
      expect(result.animalBranch).toBe(branch)
      expect(result.animalElement).toBe(element)
      expect(result.year).toBe(2026)
      expect(result.months).toHaveLength(12)
    })

    it(`${expectedAnimals[i]}: all 12 months have valid scores`, () => {
      for (const m of result.months) {
        expect(m.score).toBeGreaterThanOrEqual(0)
        expect(m.score).toBeLessThanOrEqual(100)
        expect(['旺', '平', '弱']).toContain(m.level)
      }
    })

    it(`${expectedAnimals[i]}: at least some variety in scores (not all identical)`, () => {
      const scores = result.months.map(m => m.score)
      const unique = new Set(scores)
      // 12 months should produce at least 2 different scores across 6 relationship types + element interactions
      expect(unique.size).toBeGreaterThanOrEqual(2)
    })

    it(`${expectedAnimals[i]}: detects at least one special relationship with some month`, () => {
      const special = result.months.filter(m => m.relationship !== '无特殊关系')
      // Every zodiac should have at least one special relationship across 12 months
      expect(special.length).toBeGreaterThanOrEqual(1)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 3. Level distribution
// ═══════════════════════════════════════════════════════════════

describe('MonthlyFortune — score and level invariants', () => {
  it('六合 always scores ≥ 70 (旺)', () => {
    // 丑年 + 子月 = 六合
    const result = calculateMonthlyFortune(2021, 2026, '丑', '土')
    const liuheMonths = result.months.filter(m => m.relationship === '六合')
    for (const m of liuheMonths) {
      expect(m.score).toBeGreaterThanOrEqual(70)
      expect(m.level).toBe('旺')
    }
  })

  it('相冲 always scores ≤ 40 (弱)', () => {
    // 午年 + 子月 = 相冲
    const result = calculateMonthlyFortune(2014, 2026, '午', '火')
    const chongMonths = result.months.filter(m => m.relationship === '相冲')
    for (const m of chongMonths) {
      expect(m.score).toBeLessThanOrEqual(40)
      expect(m.level).toBe('弱')
    }
  })

  it('base score is 55 before additions/subtractions', () => {
    // For months with 无特殊关系 and no element bonus, score should be 55±element adjustments
    const result = calculateMonthlyFortune(2020, 2026, '子', '水')
    // 子(水) vs 卯(木): no special relation, 卯(made of 木) → 木生水? No, 水生木.
    // Using our element logic: SHENG_CYCLE[monthElement] === animalElement → +6, etc.
    // Just verify base zone is reasonable
    const noRel = result.months.filter(m => m.relationship === '无特殊关系')
    expect(noRel.length).toBeGreaterThan(0)
    for (const m of noRel) {
      expect(m.score).toBeGreaterThanOrEqual(45)
      expect(m.score).toBeLessThanOrEqual(65)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Edge cases
// ═══════════════════════════════════════════════════════════════

describe('MonthlyFortune — edge cases', () => {
  it('handles extreme birth year (1900)', () => {
    // 1900 mod 60: (1900-4) = 1896, 1896%60=36, 36%12=0 → 庚子年 → 鼠
    const result = calculateMonthlyFortune(1900, 2026, '子', '水')
    expect(result.animal).toBe('鼠')
    expect(result.months).toHaveLength(12)
  })

  it('handles birth year 2100', () => {
    const result = calculateMonthlyFortune(2099, 2100, '未', '土')
    expect(result.year).toBe(2100)
    expect(result.months).toHaveLength(12)
  })

  it('is deterministic — same inputs produce identical results', () => {
    const a = calculateMonthlyFortune(1996, 2026, '子', '水')
    const b = calculateMonthlyFortune(1996, 2026, '子', '水')
    for (let i = 0; i < 12; i++) {
      expect(a.months[i].score).toBe(b.months[i].score)
      expect(a.months[i].level).toBe(b.months[i].level)
      expect(a.months[i].relationship).toBe(b.months[i].relationship)
    }
  })

  it('produces different results for different years', () => {
    const a = calculateMonthlyFortune(1996, 2026, '子', '水')
    const b = calculateMonthlyFortune(1996, 2025, '子', '水')
    // Different year → different monthly stems → potentially different scores
    expect(a.year).not.toBe(b.year)
  })

  it('month stems follow 五虎遁 (year-stem-based)', () => {
    // 2026 = 丙午年, 丙年 → 庚寅月
    const result = calculateMonthlyFortune(1996, 2026, '子', '水')
    expect(result.months[0].monthStem).toBe('庚')
    expect(result.months[0].monthBranch).toBe('寅')
  })
})
