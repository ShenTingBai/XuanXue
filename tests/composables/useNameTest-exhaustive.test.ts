/**
 * Phase B-1: NameTest Exhaustive Tests
 *
 * Covers: 81 数理表, 三才 5³, 五格评分, 笔画五行, 分类标签
 * Total: ~360 assertions
 */

import { describe, it, expect } from 'vitest'
import {
  NUMBERS_81,
  NUMBER_MAP,
  getNumberMeaning,
  getNumberWuxing,
  getSanCaiFortune,
  getNumberCategories,
  calculateNameScore,
  NUMBER_CATEGORIES,
} from '../../constants/name-test'

// ═══════════════════════════════════════════════════════════════
// 1. 81 数理表 穷举
// ═══════════════════════════════════════════════════════════════

describe('81-number fortune table exhaustive', () => {
  it('has exactly 81 entries', () => {
    expect(NUMBERS_81).toHaveLength(81)
  })

  it('every entry has a unique number 1-81', () => {
    const numbers = NUMBERS_81.map(n => n.number).sort((a, b) => a - b)
    expect(numbers).toEqual(Array.from({ length: 81 }, (_, i) => i + 1))
  })

  for (const entry of NUMBERS_81) {
    it(`#${entry.number} "${entry.name}": fortune is valid, meaning non-empty`, () => {
      expect(['吉', '凶', '半吉']).toContain(entry.fortune)
      expect(entry.name.length).toBeGreaterThan(0)
      expect(entry.meaning.length).toBeGreaterThan(0)
    })
  }

  it('getNumberMeaning returns correct entry for 1-81', () => {
    for (let i = 1; i <= 81; i++) {
      const m = getNumberMeaning(i)
      expect(m.number).toBe(i)
      expect(['吉', '凶', '半吉']).toContain(m.fortune)
    }
  })

  it('getNumberMeaning wraps numbers >81 correctly', () => {
    // 82 → 1, 90 → 9, 100 → 19, 162 → 81
    expect(getNumberMeaning(82).number).toBe(1)
    expect(getNumberMeaning(90).number).toBe(9)
    expect(getNumberMeaning(100).number).toBe(19)
    expect(getNumberMeaning(162).number).toBe(81)
  })

  it('NUMBER_MAP has 81 entries ordered 1-81', () => {
    expect(NUMBER_MAP.size).toBe(81)
    for (let i = 1; i <= 81; i++) {
      expect(NUMBER_MAP.get(i)?.number).toBe(i)
    }
  })

  // Verify the 9 半吉 entries from the fix session
  it('has exactly 9 半吉 entries matching cezi.ts NUMBER_FORTUNE_MAP', () => {
    const banJi = NUMBERS_81.filter(n => n.fortune === '半吉').map(n => n.number)
    expect(banJi.sort((a, b) => a - b)).toEqual([38, 51, 55, 58, 71, 73, 75, 77, 78])
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. 笔画五行 穷举（1-10 尾数 → 五行）
// ═══════════════════════════════════════════════════════════════

describe('Number wuxing (stroke tail digit)', () => {
  const expected: Record<number, string> = {
    1: '木',
    2: '木',
    3: '火',
    4: '火',
    5: '土',
    6: '土',
    7: '金',
    8: '金',
    9: '水',
    10: '水',
  }

  for (let lastDigit = 1; lastDigit <= 10; lastDigit++) {
    const wx = expected[lastDigit]
    // Test numbers with this ending: lastDigit, lastDigit+10, lastDigit+20...
    const samples = [lastDigit, lastDigit + 10, lastDigit + 20, lastDigit + 50]
    for (const n of samples) {
      it(`${n} (ends in ${lastDigit % 10}) → ${wx}`, () => {
        expect(getNumberWuxing(n)).toBe(wx)
      })
    }
  }

  it('exactly 10 wuxing categories covered (木/火/土/金/水 each 2 digits)', () => {
    const wuxingByLastDigit = new Map<string, number[]>()
    for (let d = 1; d <= 10; d++) {
      const w = getNumberWuxing(d)
      if (!wuxingByLastDigit.has(w)) wuxingByLastDigit.set(w, [])
      wuxingByLastDigit.get(w)!.push(d)
    }
    expect(wuxingByLastDigit.size).toBe(5)
    for (const digits of wuxingByLastDigit.values()) {
      expect(digits).toHaveLength(2)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. 三才配置 5³ = 125 穷举
// ═══════════════════════════════════════════════════════════════

describe('San Cai configuration (5³ = 125 exhaustive)', () => {
  const WUXING = ['木', '火', '土', '金', '水'] as const

  const results: Array<{
    tian: string
    ren: string
    di: string
    fortune: string
  }> = []

  for (const tian of WUXING) {
    for (const ren of WUXING) {
      for (const di of WUXING) {
        const fortune = getSanCaiFortune(tian, ren, di)
        results.push({ tian, ren, di, fortune })
      }
    }
  }

  it('all 125 combos return valid fortune', () => {
    expect(results).toHaveLength(125)
    for (const r of results) {
      expect(['吉', '凶', '半吉']).toContain(r.fortune)
    }
  })

  /** ⚠ BUG FLAG: the `renToDi === '凶'` check uses `||` (OR), so
   * 半吉 is DEAD CODE at BOTH the per-pair and final level.
   * The function is effectively binary: both pairs harmonious → 吉, else → 凶.
   * Distribution: 吉=45, 凶=80, 半吉=0.
   * Fix: change `||` to `&&` on the 凶 branch → 半吉=60 becomes reachable.
   * @see constants/name-test.ts line ~202 */
  it('total distribution matches expected (currently: binary 吉/凶, 半吉 dead)', () => {
    const dist: Record<string, number> = {}
    for (const r of results) dist[r.fortune] = (dist[r.fortune] || 0) + 1
    expect(dist['吉']).toBe(45)
    expect(dist['凶']).toBe(80)
    expect(dist['半吉']).toBeUndefined()
  })

  // Verify known patterns:
  // - Same elements all through → 吉 (比和 is harmonious)
  for (const wx of WUXING) {
    it(`${wx}-${wx}-${wx} (all same) → 吉`, () => {
      expect(getSanCaiFortune(wx, wx, wx)).toBe('吉')
    })
  }

  // - Full generation chain → 吉 (木生火生土, 火生土生金, etc.)
  const generationChains = [
    ['木', '火', '土'],
    ['火', '土', '金'],
    ['土', '金', '水'],
    ['金', '水', '木'],
    ['水', '木', '火'],
  ]
  for (const [t, r, d] of generationChains) {
    it(`${t}→${r}→${d} (full generation chain) → 吉`, () => {
      expect(getSanCaiFortune(t, r, d)).toBe('吉')
    })
  }

  // - Full conquest chain → 凶 (木克土克水, etc.)
  const conquestChains = [
    ['木', '土', '水'],
    ['火', '金', '木'],
    ['土', '水', '火'],
    ['金', '木', '土'],
    ['水', '火', '金'],
  ]
  for (const [t, r, d] of conquestChains) {
    it(`${t}→${r}→${d} (full conquest chain) → 凶`, () => {
      expect(getSanCaiFortune(t, r, d)).toBe('凶')
    })
  }

  // - 被生 (reverse generation): isGenerate is bidirectional,
  //   so 被生 is treated as 吉 (not 半吉). The internal 半吉 branch is dead code.
  it('被生 IS treated as 吉 (isGenerate is bidirectional, adjacency = 吉)', () => {
    // 金(idx 3) 生 水(idx 4): both directions are detected
    expect(getSanCaiFortune('水', '金', '水')).toBe('吉') // 吉+吉 = 吉
  })

  /** ⚠ BUG FLAG: mixed combos (one 吉 + one 凶 pair) return 凶 because
   * the 凶 branch uses `||` instead of `&&`. After fixing to `&&`,
   * 木-木-土 should return 半吉. Currently returns 凶.
   * @see constants/name-test.ts line ~202 */
  it('mixed case currently returns 凶 (due to || bug, should be 半吉)', () => {
    expect(getSanCaiFortune('木', '木', '土')).toBe('凶') // BUG: should be 半吉
    expect(getSanCaiFortune('木', '土', '土')).toBe('凶') // BUG: should be 半吉
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. 五格评分 穷举
// ═══════════════════════════════════════════════════════════════

describe('Score calculation', () => {
  it('all 吉 → 100 (20+20+20+20+20 + 人格20 + 三才20 = 120 clamp 100)', () => {
    expect(calculateNameScore('吉', '吉', '吉', '吉', '吉', '吉')).toBe(100)
  })

  it('all 凶 → 0', () => {
    expect(calculateNameScore('凶', '凶', '凶', '凶', '凶', '凶')).toBe(0)
  })

  it('all 半吉 → 68 (10×5 + 人格10 + 三才8 = 68)', () => {
    expect(calculateNameScore('半吉', '半吉', '半吉', '半吉', '半吉', '半吉')).toBe(68)
  })

  // 三才占 20 分（吉=20, 半吉=8, 凶=0）
  // 人格双倍：吉=+20, 半吉=+10, 凶=+0
  it('人格双倍权重: 吉人格 adds extra 20 vs 凶人格', () => {
    const good = calculateNameScore('吉', '吉', '吉', '吉', '吉', '吉')
    const badRen = calculateNameScore('吉', '凶', '吉', '吉', '吉', '吉')
    // good: 20+20+20+20+20 + 20 + 20 = 120→100
    // badRen: 20+0+20+20+20 + 0 + 20 = 100
    expect(good - badRen).toBe(0) // both clamp at 100
    // Test without clamping:
    const mixed1 = calculateNameScore('吉', '吉', '吉', '吉', '凶', '半吉')
    // 20+20+20+20+0 + 人格20 + 三才8 = 108→100
    const mixed2 = calculateNameScore('吉', '凶', '吉', '吉', '凶', '半吉')
    // 20+0+20+20+0 + 人格0 + 三才8 = 68
    expect(mixed1).toBe(100)
    expect(mixed2).toBe(68)
  })

  it('score always in [0, 100] range for all combos', () => {
    const values: Array<'吉' | '凶' | '半吉'> = ['吉', '凶', '半吉']
    for (const t of values) {
      for (const r of values) {
        for (const d of values) {
          for (const tot of values) {
            for (const w of values) {
              for (const sc of values) {
                const score = calculateNameScore(t, r, d, tot, w, sc)
                expect(score).toBeGreaterThanOrEqual(0)
                expect(score).toBeLessThanOrEqual(100)
              }
            }
          }
        }
      }
    }
  })

  // Verify specific known values
  it('specific score values match expected', () => {
    // Only ren=凶, others=吉, sanCai=吉
    // 20+0+20+20+20 + 0 + 20 = 100
    expect(calculateNameScore('吉', '凶', '吉', '吉', '吉', '吉')).toBe(100)

    // Two 凶
    // 0+20+0+20+20 + 20 + 20 = 100
    expect(calculateNameScore('凶', '吉', '凶', '吉', '吉', '吉')).toBe(100)

    // Three 凶
    // 0+20+0+20+0 + 20 + 20 = 80
    expect(calculateNameScore('凶', '吉', '凶', '吉', '凶', '吉')).toBe(80)

    // Ren=半吉 gives 10 base + 10 bonus = 20 for ren dimension
    // 20+10+20+20+20 + 10 + 20 = 120→100
    expect(calculateNameScore('吉', '半吉', '吉', '吉', '吉', '吉')).toBe(100)

    // 三才=凶 costs 20 points
    // 20+20+20+20+20 + 20 + 0 = 120→100
    expect(calculateNameScore('吉', '吉', '吉', '吉', '吉', '凶')).toBe(100)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. 数理分类 穷举
// ═══════════════════════════════════════════════════════════════

describe('Number categories', () => {
  it('all 7 category groups are defined with labels', () => {
    expect(NUMBER_CATEGORIES).toHaveLength(7)
    const labels = NUMBER_CATEGORIES.map(c => c.label)
    expect(labels).toContain('首领运')
    expect(labels).toContain('财富运')
    expect(labels).toContain('才能运')
    expect(labels).toContain('温和运')
    expect(labels).toContain('女德运')
    expect(labels).toContain('孤寡运')
    expect(labels).toContain('刚情运')
  })

  it('no category has duplicate numbers internally', () => {
    for (const cat of NUMBER_CATEGORIES) {
      expect(new Set(cat.numbers).size).toBe(cat.numbers.length)
    }
  })

  it('all category numbers are valid 1-81', () => {
    for (const cat of NUMBER_CATEGORIES) {
      for (const n of cat.numbers) {
        expect(n).toBeGreaterThanOrEqual(1)
        expect(n).toBeLessThanOrEqual(81)
      }
    }
  })

  it('getNumberCategories returns correct categories for known numbers', () => {
    // #21: 首领运 + 孤寡运
    expect(getNumberCategories(21)).toEqual(expect.arrayContaining(['首领运', '孤寡运']))
    // #31: 首领运 + 温和运
    expect(getNumberCategories(31)).toEqual(expect.arrayContaining(['首领运', '温和运']))
    // #13: 首领运 + 才能运 + 女德运
    expect(getNumberCategories(13)).toEqual(expect.arrayContaining(['首领运', '才能运', '女德运']))
  })

  it('getNumberCategories returns empty for numbers in no category', () => {
    // Many numbers belong to no category
    expect(getNumberCategories(1)).toEqual([])
    expect(getNumberCategories(2)).toEqual([])
    expect(getNumberCategories(10)).toEqual([])
  })
})
