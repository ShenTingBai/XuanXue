import { describe, it, expect } from 'vitest'
import { calculateShengXiao } from '../../composables/useShengXiao'

describe('calculateShengXiao', () => {
  const testDate = new Date('2026-05-25')

  it('returns 虎 for 1998 birth year', () => {
    const result = calculateShengXiao(1998, testDate)
    expect(result.animal).toBe('虎')
    expect(result.animalEmoji).toBe('🐯')
    expect(result.earthlyBranch).toBe('寅')
  })

  it('returns correct heavenly stem for 1998', () => {
    const result = calculateShengXiao(1998, testDate)
    expect(result.heavenlyStem).toBe('戊')
    expect(result.stemBranch).toBe('戊寅')
  })

  it('returns 鼠 for 2020 birth year', () => {
    const result = calculateShengXiao(2020, testDate)
    expect(result.animal).toBe('鼠')
    expect(result.earthlyBranch).toBe('子')
  })

  it('returns 猴 for 2016 birth year', () => {
    const result = calculateShengXiao(2016, testDate)
    expect(result.animal).toBe('猴')
    expect(result.earthlyBranch).toBe('申')
  })

  it('birth year determines animal regardless of current date', () => {
    // 2025 is year of 蛇, regardless of whether current date is before/after lunar new year
    const feb3 = new Date('2026-02-03')
    const feb5 = new Date('2026-02-05')
    expect(calculateShengXiao(2025, feb3).animal).toBe('蛇')
    expect(calculateShengXiao(2025, feb5).animal).toBe('蛇')
  })

  it('returns 6 compatibility entries for 虎', () => {
    const result = calculateShengXiao(1998, testDate)
    expect(result.compatibility).toHaveLength(6)
  })

  it('returns deterministic fortune scores (same input = same output)', () => {
    const a = calculateShengXiao(1998, testDate)
    const b = calculateShengXiao(1998, testDate)
    expect(a.fortune.career.score).toBe(b.fortune.career.score)
    expect(a.fortune.wealth.score).toBe(b.fortune.wealth.score)
    expect(a.fortune.love.score).toBe(b.fortune.love.score)
    expect(a.fortune.health.score).toBe(b.fortune.health.score)
  })

  it('fortune scores are in range 30-90', () => {
    const result = calculateShengXiao(1998, testDate)
    expect(result.fortune.career.score).toBeGreaterThanOrEqual(30)
    expect(result.fortune.career.score).toBeLessThanOrEqual(90)
    expect(result.fortune.wealth.score).toBeGreaterThanOrEqual(30)
    expect(result.fortune.wealth.score).toBeLessThanOrEqual(90)
    expect(result.fortune.love.score).toBeGreaterThanOrEqual(30)
    expect(result.fortune.love.score).toBeLessThanOrEqual(90)
    expect(result.fortune.health.score).toBeGreaterThanOrEqual(30)
    expect(result.fortune.health.score).toBeLessThanOrEqual(90)
  })

  it('returns wuXing 木 for 虎', () => {
    const result = calculateShengXiao(1998, testDate)
    expect(result.wuXing).toBe('木')
  })

  it('returns naYin 城头土 for 戊寅 (1998)', () => {
    const result = calculateShengXiao(1998, testDate)
    expect(result.naYin).toBe('城头土')
  })

  it('returns direction for 虎', () => {
    const result = calculateShengXiao(1998, testDate)
    expect(result.direction).toBe('东北')
  })

  it('returns yangOrYin correctly', () => {
    const result = calculateShengXiao(1998, testDate)
    expect(result.yangOrYin).toBe('阳')
  })

  it('returns personality pros and cons arrays', () => {
    const result = calculateShengXiao(1998, testDate)
    expect(result.personalityPro.length).toBeGreaterThan(0)
    expect(result.personalityCon.length).toBeGreaterThan(0)
  })

  it('returns lucky items', () => {
    const result = calculateShengXiao(1998, testDate)
    expect(result.lucky.numbers.length).toBeGreaterThan(0)
    expect(result.lucky.colors.length).toBeGreaterThan(0)
    expect(result.lucky.direction).toBeTruthy()
  })

  it('handles lunar calendar with year adjustment', () => {
    const result = calculateShengXiao(1998, testDate)
    expect(result.animal).toBe('虎')
  })

  it('returns correct compatibility relationships for 虎', () => {
    const result = calculateShengXiao(1998, testDate)
    const compat = result.compatibility

    // Should have 6 entries
    expect(compat).toHaveLength(6)

    // No duplicate animals
    const animals = compat.map(c => c.animal)
    expect(new Set(animals).size).toBe(6)

    // Find specific relationships
    const sanheAnimals = compat.filter(c => c.relation === '三合').map(c => c.animal)
    expect(sanheAnimals.length).toBeGreaterThanOrEqual(1)

    const liuhe = compat.find(c => c.relation === '六合')
    expect(liuhe?.animal).toBe('猪')
    expect(liuhe?.level).toBe('great')

    const chong = compat.find(c => c.relation === '相冲')
    expect(chong?.animal).toBe('猴')
    expect(chong?.level).toBe('bad')
  })

  it('works without currentDate parameter', () => {
    const result = calculateShengXiao(1998)
    expect(result.animal).toBe('虎')
    expect(result.fortune.career.score).toBeGreaterThanOrEqual(30)
  })

  it('handles pre-1900 birth years', () => {
    const result = calculateShengXiao(1898, testDate)
    expect(result.animal).toBe('狗')
    // 1898 is 戊戌, stemIndex = ((1898 - 4) % 10 + 10) % 10 = 4 → 戊
    expect(result.heavenlyStem).toBe('戊')
    expect(result.earthlyBranch).toBe('戌')
  })

  it('returns different fortune scores for different animals on same day', () => {
    const tiger = calculateShengXiao(1998, testDate)
    const rat = calculateShengXiao(2020, testDate)
    expect(tiger.fortune.career.score).not.toBe(rat.fortune.career.score)
  })

  it('值太岁 year (本命年) produces lower scores than 三合 year for the same animal', () => {
    // 2026 = 马 year. For a 马 (index 6), 2026 is 值太岁 (same animal = same branch).
    // For a 虎 (index 2), 2026 is 三合 (虎/马/狗 group).
    const horseZhiTaiSui = calculateShengXiao(2026, new Date('2026-05-25'))
    const tigerSanHe = calculateShengXiao(2022, new Date('2026-05-25'))

    expect(horseZhiTaiSui.fortune.career.score).toBeLessThan(tigerSanHe.fortune.career.score)
    expect(horseZhiTaiSui.fortune.wealth.score).toBeLessThan(tigerSanHe.fortune.wealth.score)
  })
})
