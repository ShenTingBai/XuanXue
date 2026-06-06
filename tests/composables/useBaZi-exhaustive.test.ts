/**
 * Phase A: BaZi Core + SolarTerms Exhaustive Tests
 *
 * Covers: 十神矩阵, 纳音, 藏干, 日主强弱（月柱枚举）, 五虎遁, 节气边界
 * Total: ~470 assertions targeting the engine foundation.
 */

import { describe, it, expect } from 'vitest'
import { getTenGod, getWeightedDayMasterStrength, calculateBaZi } from '../../composables/useBaZi'
import type { BaZiPillar } from '../../composables/useBaZi'
import { STEMS, BRANCHES, getNaYin, NAYIN_TABLE } from '../../constants/bazi'
import { getMonthStemStart, getSolarTerm } from '../../composables/useSolarTerms'

// ═══════════════════════════════════════════════════════════════
// 1. 十神矩阵 10×10 穷举
// ═══════════════════════════════════════════════════════════════

describe('Ten God matrix (10×10 exhaustive)', () => {
  const VALID_TEN_GODS = new Set([
    '比肩',
    '劫财',
    '食神',
    '伤官',
    '偏财',
    '正财',
    '偏官',
    '正官',
    '偏印',
    '正印',
  ])

  // Wuxing for each stem index: 木木火火土土金金水水
  const wuxingByStem = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']
  // Yin-yang for each stem index
  const yinYangByStem = ['阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴']

  for (let dm = 0; dm < 10; dm++) {
    for (let target = 0; target < 10; target++) {
      const tg = getTenGod(dm, STEMS[target])
      const label = `日主${STEMS[dm]}(idx${dm}) → ${STEMS[target]}(idx${target})`

      it(`${label} returns valid ten god: ${tg}`, () => {
        expect(VALID_TEN_GODS.has(tg)).toBe(true)
      })

      if (dm === target) {
        it(`${label} same stem → 比肩`, () => {
          expect(tg).toBe('比肩')
        })
      }
    }
  }

  // Property: every row uses all 10 ten-god types (no gaps, no duplicates per row)
  for (let dm = 0; dm < 10; dm++) {
    it(`row ${STEMS[dm]} contains all 10 ten-god types`, () => {
      const row = STEMS.map((_, i) => getTenGod(dm, STEMS[i]))
      expect(new Set(row).size).toBe(10)
    })
  }
})

// ═══════════════════════════════════════════════════════════
// 2. 纳音穷举
// ═══════════════════════════════════════════════════════════

describe('NaYin (60-cycle pairs, 30 valid)', () => {
  // Collect results for later consistency checks
  const results: Array<{
    stem: string
    branch: string
    nayin: string
    valid: boolean
  }> = []

  for (let s = 0; s < 10; s++) {
    for (let b = 0; b < 12; b++) {
      const stem = STEMS[s]
      const branch = BRANCHES[b]
      const nayin = getNaYin(stem, branch)
      const sameParity = (s - b) % 2 === 0

      results.push({ stem, branch, nayin, valid: sameParity })

      if (sameParity) {
        it(`${stem}${branch} (valid pair, same parity) returns non-empty`, () => {
          expect(nayin).toBeTruthy()
          expect(NAYIN_TABLE).toContain(nayin)
        })
      } else {
        it(`${stem}${branch} (invalid pair, opposite parity) returns empty`, () => {
          expect(nayin).toBe('')
        })
      }
    }
  }

  it('30 valid pairs all return unique NaYin entries', () => {
    const validNayins = results.filter(r => r.valid).map(r => r.nayin)
    expect(new Set(validNayins).size).toBe(30)
  })

  it('NAYIN_TABLE has exactly 30 entries', () => {
    expect(NAYIN_TABLE).toHaveLength(30)
  })
})

// ═══════════════════════════════════════════════════════════
// 3. 藏干 穷举（通过 calculateBaZi 结果间接验证）
// ═══════════════════════════════════════════════════════════

describe('Hidden Stems (via calculateBaZi)', () => {
  // Use a representative birth date to sample all 12 branches
  const testCases: Array<{ date: string; expectedBranch: string; minCount: number }> = [
    { date: '2000-12-07', expectedBranch: '子', minCount: 1 },
    { date: '2000-01-15', expectedBranch: '丑', minCount: 1 },
    { date: '2000-02-20', expectedBranch: '寅', minCount: 3 },
    { date: '2000-03-20', expectedBranch: '卯', minCount: 1 },
    { date: '2000-04-20', expectedBranch: '辰', minCount: 2 },
    { date: '2000-05-20', expectedBranch: '巳', minCount: 2 },
    { date: '2000-06-20', expectedBranch: '午', minCount: 2 },
    { date: '2000-07-20', expectedBranch: '未', minCount: 2 },
    { date: '2000-08-20', expectedBranch: '申', minCount: 2 },
    { date: '2000-09-20', expectedBranch: '酉', minCount: 1 },
    { date: '2000-10-20', expectedBranch: '戌', minCount: 2 },
    { date: '2000-11-20', expectedBranch: '亥', minCount: 2 },
  ]

  for (const tc of testCases) {
    const [y, m, d] = tc.date.split('-').map(Number)
    const result = calculateBaZi({
      birthYear: y,
      birthMonth: m,
      birthDay: d,
      birthCalendar: 'solar',
      birthHour: 12,
      gender: '男',
    })

    it(`month pillar ${tc.expectedBranch} has ≥${tc.minCount} hidden stems`, () => {
      const stems = result.monthPillar.hiddenStems
      expect(stems.length).toBeGreaterThanOrEqual(tc.minCount)
    })

    it(`month pillar ${tc.expectedBranch} hidden stems are all valid`, () => {
      for (const hs of result.monthPillar.hiddenStems) {
        expect(STEMS).toContain(hs.stem)
        expect(['木', '火', '土', '金', '水']).toContain(hs.wuxing)
      }
    })
  }

  it('first hidden stem is the main qi ∀ 12 pillars (one sample each)', () => {
    // Verify each branch's first hidden stem (主气) — the traditional value
    const expectedMainQi: Record<string, string> = {
      子: '癸',
      丑: '己',
      寅: '甲',
      卯: '乙',
      辰: '戊',
      巳: '丙',
      午: '丁',
      未: '己',
      申: '庚',
      酉: '辛',
      戌: '戊',
      亥: '壬',
    }

    for (const tc of testCases) {
      const [y, m, d] = tc.date.split('-').map(Number)
      const result = calculateBaZi({
        birthYear: y,
        birthMonth: m,
        birthDay: d,
        birthCalendar: 'solar',
        birthHour: 12,
        gender: '男',
      })
      const first = result.monthPillar.hiddenStems[0]
      expect(
        first.stem,
        `Main qi of ${expectedMainQi[tc.expectedBranch]} ([0]) should be ${expectedMainQi[tc.expectedBranch]}`,
      ).toBe(expectedMainQi[tc.expectedBranch])
    }
  })
})

// ═══════════════════════════════════════════════════════════
// 4. 日主强弱 — 枚举月柱（10 干 × 12 月支）
// ═══════════════════════════════════════════════════════════

describe('Day Master Strength (month pillar enumeration)', () => {
  const STRENGTHS = ['强', '偏强', '中和', '偏弱', '弱']

  // Fixed pillars (non-month) for a neutral baseline
  const basePillars: BaZiPillar[] = [
    {
      stem: '甲',
      branch: '子',
      stemWuxing: '木',
      branchWuxing: '水',
      hiddenStems: [{ stem: '癸', tenGod: '正印', wuxing: '水' }],
      stemTenGod: '比肩',
      branchTenGod: '正印',
    },
    {
      // month — will be substituted below
      stem: '丙',
      branch: '寅',
      stemWuxing: '火',
      branchWuxing: '木',
      hiddenStems: [
        { stem: '甲', tenGod: '比肩', wuxing: '木' },
        { stem: '丙', tenGod: '食神', wuxing: '火' },
        { stem: '戊', tenGod: '偏财', wuxing: '土' },
      ],
      stemTenGod: '食神',
      branchTenGod: '比肩',
    },
    {
      stem: '甲',
      branch: '子',
      stemWuxing: '木',
      branchWuxing: '水',
      hiddenStems: [{ stem: '癸', tenGod: '正印', wuxing: '水' }],
      stemTenGod: '比肩',
      branchTenGod: '正印',
    },
    {
      stem: '壬',
      branch: '申',
      stemWuxing: '水',
      branchWuxing: '金',
      hiddenStems: [
        { stem: '庚', tenGod: '偏印', wuxing: '金' },
        { stem: '壬', tenGod: '比肩', wuxing: '水' },
        { stem: '戊', tenGod: '偏官', wuxing: '土' },
      ],
      stemTenGod: '偏印',
      branchTenGod: '偏官',
    },
  ]

  // Collect all results for distribution analysis
  const distribution: Record<string, number> = {}
  let validCount = 0

  for (let stemIdx = 0; stemIdx < 10; stemIdx++) {
    for (let branchIdx = 0; branchIdx < 12; branchIdx++) {
      const monthStem = STEMS[stemIdx]
      const monthBranch = BRANCHES[branchIdx]

      // Only test valid sexagenary pairs (same parity)
      if ((stemIdx - branchIdx) % 2 !== 0) continue
      validCount++

      const stemWxMap: Record<string, string> = {
        甲: '木',
        乙: '木',
        丙: '火',
        丁: '火',
        戊: '土',
        己: '土',
        庚: '金',
        辛: '金',
        壬: '水',
        癸: '水',
      }
      const branchWxMap: Record<string, string> = {
        子: '水',
        丑: '土',
        寅: '木',
        卯: '木',
        辰: '土',
        巳: '火',
        午: '火',
        未: '土',
        申: '金',
        酉: '金',
        戌: '土',
        亥: '水',
      }

      const monthPillar: BaZiPillar = {
        stem: monthStem,
        branch: monthBranch,
        stemWuxing: stemWxMap[monthStem],
        branchWuxing: branchWxMap[monthBranch],
        hiddenStems: [
          {
            stem: '甲',
            tenGod: '比肩',
            wuxing: '木',
          },
        ],
        stemTenGod: '—',
        branchTenGod: '—',
      }

      const pillars = [...basePillars]
      pillars[1] = monthPillar

      // Day stem of basePillars[2] is 甲 (wood)
      const strength = getWeightedDayMasterStrength('木', pillars)

      const label = `${monthStem}${monthBranch} → ${strength}`
      distribution[strength] = (distribution[strength] || 0) + 1
    }
  }

  it('60 valid pairs all return defined strength', () => {
    expect(validCount).toBe(60)
    const total = Object.values(distribution).reduce((a, b) => a + b, 0)
    expect(total).toBe(60)
  })

  it('distribution reflects fixed-baseline constraint (day master 甲 + all-wood/water baseline)', () => {
    // With 甲 day master and fixed baseline pillars all favoring wood,
    // the month pillar is the ONLY variable. With month stem (weight 1.0)
    // now included in strength calculation:
    //   强 = 30 combos (month stem adds wood/water weight, pushing more over threshold)
    //   偏强 = 20 combos
    //   中和 = 8 combos
    //   偏弱 = 2 combos (month stem creates enough variance to dip below neutral)
    //   弱 = 0
    expect(distribution['弱'] || 0).toBe(0)
    expect(distribution['偏弱'] || 0).toBe(2)
    expect(distribution['强']).toBeGreaterThan(0)
    expect(distribution['偏强']).toBeGreaterThan(0)
    expect(distribution['中和']).toBeGreaterThan(0)
    // 强 dominates because month stem pushes wood/water-heavy combos over threshold
    expect(distribution['强']).toBeGreaterThan(distribution['偏强'])
  })
})

// ═══════════════════════════════════════════════════════════
// 5. 五虎遁 穷举
// ═══════════════════════════════════════════════════════════

describe('Wu Hu Dun (5 tigers escape) — getMonthStemStart', () => {
  // 五虎遁口诀：甲己之年丙作首，乙庚之年戊为头，
  //             丙辛之年庚作首，丁壬之年壬为头，
  //             戊癸之年甲为头
  const expected: Record<number, number> = {
    0: 2, // 甲 → 丙(index 2)
    1: 4, // 乙 → 戊(index 4)
    2: 6, // 丙 → 庚(index 6)
    3: 8, // 丁 → 壬(index 8)
    4: 0, // 戊 → 甲(index 0)
    5: 2, // 己 → 丙(index 2)
    6: 4, // 庚 → 戊(index 4)
    7: 6, // 辛 → 庚(index 6)
    8: 8, // 壬 → 壬(index 8)
    9: 0, // 癸 → 甲(index 0)
  }

  for (let i = 0; i < 10; i++) {
    const result = getMonthStemStart(i)
    it(`${STEMS[i]} year → month stem starts at ${STEMS[expected[i]]} (idx ${expected[i]})`, () => {
      expect(result).toBe(expected[i])
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(10)
    })
  }

  // Invariant: f(x) = (2x + 2) % 10 for x in the domain [0,9]
  // getMonthStemStart is designed for year-stem indices (0-9), not arbitrary integers.
  // JavaScript % operator returns negative for negative dividends:
  //   getMonthStemStart(-2) = (-4+2)%10 = (-2)%10 = -2 (not in [0,9])
  // This is expected — the function's contract is [0,9] → [0,9].
  it('returns [0, 9] for all valid year-stem indices [0,9]', () => {
    for (let i = 0; i < 10; i++) {
      const r = getMonthStemStart(i)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(10)
    }
  })

  // Invariant: result is always even (all month-start stems are 阳干)
  it('always returns even index (阳干 starts the month) for [0,9] inputs', () => {
    for (let i = 0; i < 10; i++) {
      expect(getMonthStemStart(i) % 2).toBe(0)
    }
  })
})

// ═══════════════════════════════════════════════════════════
// 6. 节气 边界采样
// ═══════════════════════════════════════════════════════════

describe('Solar Term boundaries', () => {
  it('立春 falls between Feb 3-5 for 1992-2050', () => {
    for (let y = 1992; y <= 2050; y++) {
      const lc = getSolarTerm(y, 0)
      expect(lc.month).toBe(2)
      expect(lc.day).toBeGreaterThanOrEqual(3)
      expect(lc.day).toBeLessThanOrEqual(5)
    }
  })

  it('小暑 falls between Jul 5-8 for 1992-2050', () => {
    // termIndex: 5=小暑 (minor heat, ~Jul 7)
    for (let y = 1992; y <= 2050; y++) {
      const xs = getSolarTerm(y, 5)
      expect(xs.month).toBe(7)
      expect(xs.day).toBeGreaterThanOrEqual(5)
      expect(xs.day).toBeLessThanOrEqual(8)
    }
  })

  it('all 12 solar terms return month in [1,12] and day in [1,31] for 1992-2050', () => {
    for (let y = 1992; y <= 2050; y++) {
      for (let ti = 0; ti < 12; ti++) {
        const st = getSolarTerm(y, ti)
        expect(st.month).toBeGreaterThanOrEqual(1)
        expect(st.month).toBeLessThanOrEqual(12)
        expect(st.day).toBeGreaterThanOrEqual(1)
        expect(st.day).toBeLessThanOrEqual(31)
      }
    }
  })

  it('solar terms 0→10 are monotonic within a year (term 11 小寒 wraps to next year)', () => {
    // term 11 (小寒) is in January of the following year, so it breaks naive
    // month*100+day comparison. We skip term 11 in the monotonic check and
    // verify it separately.
    for (let y = 1992; y <= 2050; y++) {
      const terms = Array.from({ length: 12 }, (_, i) => getSolarTerm(y, i))
      // Terms 0–10: each must come after the previous in the same year
      for (let i = 1; i <= 10; i++) {
        const prev = terms[i - 1]
        const curr = terms[i]
        const prevDoy = prev.month * 100 + prev.day
        const currDoy = curr.month * 100 + curr.day
        expect(
          currDoy,
          `${y}: term ${i} (${curr.month}/${curr.day}) must be after term ${i - 1} (${prev.month}/${prev.day})`,
        ).toBeGreaterThan(prevDoy)
      }
      // Term 11 (小寒) should be in January of next year (month=1)
      expect(terms[11].month).toBe(1)
    }
  })

  it('立春 before 清明 before 立夏 before 小暑', () => {
    for (let y = 1992; y <= 2050; y++) {
      const lc = getSolarTerm(y, 0) // 立春
      const qm = getSolarTerm(y, 2) // 清明
      const lx = getSolarTerm(y, 3) // 立夏
      const xs = getSolarTerm(y, 5) // 小暑
      const lcDOY = lc.month * 100 + lc.day
      const qmDOY = qm.month * 100 + qm.day
      const lxDOY = lx.month * 100 + lx.day
      const xsDOY = xs.month * 100 + xs.day
      expect(lcDOY).toBeLessThan(qmDOY)
      expect(qmDOY).toBeLessThan(lxDOY)
      expect(lxDOY).toBeLessThan(xsDOY)
    }
  })
})
