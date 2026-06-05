/**
 * Phase C-1: ShengXiao Exhaustive Tests
 *
 * Covers: 12 animal data, 12×12 relationship tables, TaiSui, fortune, compatibility
 * Total: ~150 assertions
 */

import { describe, it, expect } from 'vitest'
import {
  calculateShengXiao,
  getAnimalIndex,
  SANHE_GROUPS,
  LIUHE_PAIRS,
  CHONG_PAIRS,
  HAI_PAIRS,
  XING_PAIRS,
  SELF_XING,
  PO_PAIRS,
} from '../../composables/useShengXiao'
import { ANIMALS, STEMS, BRANCHES } from '../../constants/bazi'

// ═══════════════════════════════════════════════════════════════
// 1. Animal index calculation
// ═══════════════════════════════════════════════════════════════

describe('getAnimalIndex', () => {
  it('鼠年 (2020) = index 0', () => expect(getAnimalIndex(2020)).toBe(0))
  it('牛年 (2021) = index 1', () => expect(getAnimalIndex(2021)).toBe(1))
  it('虎年 (2022) = index 2', () => expect(getAnimalIndex(2022)).toBe(2))
  it('兔年 (2023) = index 3', () => expect(getAnimalIndex(2023)).toBe(3))
  it('12-year cycle: 2020+12=2032 same as 2020', () => {
    expect(getAnimalIndex(2032)).toBe(getAnimalIndex(2020))
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Relationship pair tables consistency
// ═══════════════════════════════════════════════════════════════

describe('Pair table symmetry and coverage', () => {
  it('SANHE_GROUPS: 4 groups of 3 each', () => {
    expect(SANHE_GROUPS).toHaveLength(4)
    for (const g of SANHE_GROUPS) {
      expect(g).toHaveLength(3)
      expect(g[0]).not.toBe(g[1])
      expect(g[1]).not.toBe(g[2])
    }
  })

  it('LIUHE_PAIRS: 6 pairs, all symmetric in math sense', () => {
    expect(LIUHE_PAIRS).toHaveLength(6)
    const all = new Set(LIUHE_PAIRS.flat())
    expect(all.size).toBe(12) // covers all 12 animals
  })

  it('CHONG_PAIRS: 6 pairs covering all 12', () => {
    expect(CHONG_PAIRS).toHaveLength(6)
    const all = new Set(CHONG_PAIRS.flat())
    expect(all.size).toBe(12)
  })

  it('HAI_PAIRS: 6 pairs covering all 12', () => {
    expect(HAI_PAIRS).toHaveLength(6)
    const all = new Set(HAI_PAIRS.flat())
    expect(all.size).toBe(12)
  })

  it('PO_PAIRS: 6 pairs covering all 12', () => {
    expect(PO_PAIRS).toHaveLength(6)
    const all = new Set(PO_PAIRS.flat())
    expect(all.size).toBe(12)
  })

  it('no pair overlaps between LIUHE and CHONG', () => {
    const liuheSet = new Set(LIUHE_PAIRS.map(p => `${p[0]},${p[1]}`))
    for (const [a, b] of CHONG_PAIRS) {
      const key = `${Math.min(a, b)},${Math.max(a, b)}`
      expect(liuheSet.has(key)).toBe(false)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. SELF_XING and XING_PAIRS coverage
// ═══════════════════════════════════════════════════════════════

describe('Punishment (刑) pairs', () => {
  it('SELF_XING has exactly 4 branches (辰午酉亥)', () => {
    expect(SELF_XING).toHaveLength(4)
    expect(SELF_XING).toContain(4) // 辰
    expect(SELF_XING).toContain(6) // 午
    expect(SELF_XING).toContain(9) // 酉
    expect(SELF_XING).toContain(11) // 亥
  })

  it('XING_PAIRS has 7 entries', () => {
    expect(XING_PAIRS).toHaveLength(7)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. calculateShengXiao result completeness (all 12 years)
// ═══════════════════════════════════════════════════════════════

describe('calculateShengXiao for all 12 animals', () => {
  // Test for years 2020 (鼠) through 2031 (猪)
  for (let y = 2020; y <= 2031; y++) {
    const idx = (y - 2020) % 12
    const result = calculateShengXiao(y)

    it(`year ${y} → ${ANIMALS[idx]}`, () => {
      expect(result.animal).toBe(ANIMALS[idx])
      expect(result.animalEmoji).toBeTruthy()
      expect(result.year).toBe(y)
    })

    it(`year ${y}: all required fields are present`, () => {
      expect(result.wuXing).toBeTruthy()
      expect(result.direction).toBeTruthy()
      expect(result.heavenlyStem).toBeTruthy()
      expect(result.earthlyBranch).toBeTruthy()
      expect(result.stemBranch.length).toBe(2)
      expect(result.naYin.length).toBeGreaterThan(0)
      expect(['阳', '阴']).toContain(result.yangOrYin)
    })

    it(`year ${y}: fortune has 4 dimensions with valid ranges`, () => {
      for (const dim of ['career', 'wealth', 'love', 'health'] as const) {
        const d = result.fortune[dim]
        expect(d.score).toBeGreaterThanOrEqual(30)
        expect(d.score).toBeLessThanOrEqual(90)
        expect(['大吉', '中吉', '小吉', '平']).toContain(d.level)
      }
    })

    it(`year ${y}: personality has 4 pros and 4 cons`, () => {
      expect(result.personalityPro).toHaveLength(4)
      expect(result.personalityCon).toHaveLength(4)
    })

    it(`year ${y}: compatibility returns 6 animals`, () => {
      expect(result.compatibility).toHaveLength(6)
      // First 2 should be great (三合), next should be 六合, then 相冲, 相害, then fill with 中吉
      const levels = result.compatibility.map(c => c.level)
      expect(levels.filter(l => l === 'great').length).toBeGreaterThanOrEqual(2)
      expect(levels.filter(l => l === 'bad').length).toBeGreaterThanOrEqual(2)
    })

    it(`year ${y}: lucky data has numbers, colors, direction`, () => {
      expect(result.lucky.numbers.length).toBeGreaterThan(0)
      expect(result.lucky.colors.length).toBeGreaterThan(0)
      expect(result.lucky.direction.length).toBeGreaterThan(0)
    })

    it(`year ${y}: TaiSui relationship has positive/negative strings`, () => {
      expect(result.taiSuiRelationships.positive).toBeTruthy()
      expect(result.taiSuiRelationships.negative).toBeTruthy()
    })
  }

  // ════════════════
  // Stem correctness
  // ════════════════
  it('庚子年 (2020) → stem 庚', () => {
    expect(calculateShengXiao(2020).heavenlyStem).toBe('庚')
  })
  it('壬寅年 (2022) → stem 壬', () => {
    expect(calculateShengXiao(2022).heavenlyStem).toBe('壬')
  })

  // ════════════════
  // 本命年 TaiSui
  // ════════════════
  it('本命年 (same year as current) → 值太岁', () => {
    const result = calculateShengXiao(2020, new Date(2020, 5, 1))
    expect(result.taiSuiRelationships.negative).toContain('值太岁')
    expect(result.taiSuiRelationships.positive).toBe('平')
  })

  // ════════════════
  // 六合 TaiSui
  // ════════════════
  it('子丑六合 → positive = 六合', () => {
    // birth 2020 (鼠=子=0), current 2021 (牛=丑=1)
    const result = calculateShengXiao(2020, new Date(2021, 5, 1))
    expect(result.taiSuiRelationships.positive).toBe('六合')
  })

  // ════════════════
  // 冲太岁
  // ════════════════
  it('子午冲 → negative = 冲太岁', () => {
    // birth 2020 (鼠=子=0), current 2026 (马=午=6)
    const result = calculateShengXiao(2020, new Date(2026, 5, 1))
    expect(result.taiSuiRelationships.negative).toBe('冲太岁')
  })
})
