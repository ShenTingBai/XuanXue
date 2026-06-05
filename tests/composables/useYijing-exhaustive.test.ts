/**
 * Phase C-3: YiJing Exhaustive Tests
 *
 * Covers: 64 hexagram names, palace system, changing lines, scoring, castByNumbers
 * Total: ~160 assertions
 */

import { describe, it, expect } from 'vitest'
import {
  castByNumbers,
  getHexagramInfo,
  getZhuangGuaLines,
  getDerivedValues,
  getHuGuaValues,
  calculateYijingScore,
  computeYijingResult,
  convertToYaoResults,
} from '../../composables/useYijing'

// ═══════════════════════════════════════════════════════════════
// 1. castByNumbers — 8×8 trigrams reachable
// ═══════════════════════════════════════════════════════════════

describe('castByNumbers', () => {
  it('returns 6 yao values in [6,7,8,9]', () => {
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        const { values } = castByNumbers(u, l, 1)
        expect(values).toHaveLength(6)
        for (const v of values) {
          expect([6, 7, 8, 9]).toContain(v)
        }
      }
    }
  })

  it('changing line produces 6 (old yin) or 9 (old yang)', () => {
    for (let m = 1; m <= 6; m++) {
      const { values, changingLine } = castByNumbers(1, 1, m)
      expect(changingLine).toBe(m)
      const changingYao = values[m - 1]
      expect([6, 9]).toContain(changingYao)
    }
  })

  it('non-changing lines are 7 or 8', () => {
    const { values, changingLine } = castByNumbers(1, 1, 3)
    for (let i = 0; i < 6; i++) {
      if (i + 1 !== changingLine) {
        expect([7, 8]).toContain(values[i])
      }
    }
  })

  it('negative input uses absolute value', () => {
    const { values: v1 } = castByNumbers(-1, -2, -3)
    const { values: v2 } = castByNumbers(1, 2, 3)
    expect(v1).toEqual(v2)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. 64 hexagram names — all reachable
// ═══════════════════════════════════════════════════════════════

describe('All 64 hexagrams reachable via castByNumbers', () => {
  const seen = new Set<string>()

  for (let u = 1; u <= 8; u++) {
    for (let l = 1; l <= 8; l++) {
      const { values } = castByNumbers(u, l, 1)
      const hex = getHexagramInfo(values)
      seen.add(hex.name)
    }
  }

  it('64 unique hexagram names found', () => {
    expect(seen.size).toBe(64)
  })

  it('every hexagram has a judgment', () => {
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        const { values } = castByNumbers(u, l, 1)
        const hex = getHexagramInfo(values)
        expect(hex.judgment.length).toBeGreaterThan(0)
        expect(hex.name).not.toBe('未知卦')
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Hexagram structure invariants
// ═══════════════════════════════════════════════════════════════

describe('Hexagram structure invariants', () => {
  it('shi and ying positions differ by 3 for first 60 hexagrams', () => {
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        const { values } = castByNumbers(u, l, 1)
        const hex = getHexagramInfo(values)
        expect(Math.abs(hex.shiPosition - hex.yingPosition)).toBe(3)
        expect(hex.shiPosition).toBeGreaterThanOrEqual(1)
        expect(hex.shiPosition).toBeLessThanOrEqual(6)
        expect(hex.yingPosition).toBeGreaterThanOrEqual(1)
        expect(hex.yingPosition).toBeLessThanOrEqual(6)
      }
    }
  })

  it('palaceIndex is 0-7, palacePosition is 1-8', () => {
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        const { values } = castByNumbers(u, l, 1)
        const hex = getHexagramInfo(values)
        expect(hex.palaceIndex).toBeGreaterThanOrEqual(0)
        expect(hex.palaceIndex).toBeLessThan(8)
        expect(hex.palacePosition).toBeGreaterThanOrEqual(1)
        expect(hex.palacePosition).toBeLessThanOrEqual(8)
        expect(hex.palaceWuxing).toBeTruthy()
      }
    }
  })

  it('binary string is 6 chars of 0/1', () => {
    for (let u = 1; u <= 8; u++) {
      for (let l = 1; l <= 8; l++) {
        const { values } = castByNumbers(u, l, 1)
        const hex = getHexagramInfo(values)
        expect(hex.binary).toHaveLength(6)
        expect(hex.binary).toMatch(/^[01]{6}$/)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Yao values and conversion
// ═══════════════════════════════════════════════════════════════

describe('convertToYaoResults', () => {
  it('6→老阴, 7→少阳, 8→少阴, 9→老阳', () => {
    const results = convertToYaoResults([6, 7, 8, 9])
    expect(results[0].display).toBe('老阴')
    expect(results[0].isChanging).toBe(true)
    expect(results[1].display).toBe('少阳')
    expect(results[1].isChanging).toBe(false)
    expect(results[2].display).toBe('少阴')
    expect(results[2].isChanging).toBe(false)
    expect(results[3].display).toBe('老阳')
    expect(results[3].isChanging).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Derivation (之卦)
// ═══════════════════════════════════════════════════════════════

describe('getDerivedValues', () => {
  it('no changing lines → null', () => {
    expect(getDerivedValues([7, 8, 7, 8, 7, 8])).toBeNull()
  })

  it('old yin (6) → young yang (7)', () => {
    const derived = getDerivedValues([6, 8, 7, 7, 7, 7])
    expect(derived).not.toBeNull()
    expect(derived![0]).toBe(7)
  })

  it('old yang (9) → young yin (8)', () => {
    const derived = getDerivedValues([9, 8, 7, 7, 7, 7])
    expect(derived).not.toBeNull()
    expect(derived![0]).toBe(8)
  })

  it('unchanged lines stay the same', () => {
    const derived = getDerivedValues([6, 9, 7, 8, 7, 8])
    expect(derived).not.toBeNull()
    expect(derived![2]).toBe(7)
    expect(derived![3]).toBe(8)
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. Hu Gua (互卦)
// ═══════════════════════════════════════════════════════════════

describe('getHuGuaValues', () => {
  it('returns 6 values from valid input', () => {
    const { values } = castByNumbers(1, 2, 3)
    const hu = getHuGuaValues(values)
    expect(hu).toHaveLength(6)
    for (const v of hu) {
      expect([7, 8]).toContain(v) // hu gua has no changing lines
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Scoring ranges
// ═══════════════════════════════════════════════════════════════

describe('calculateYijingScore range', () => {
  for (let u = 1; u <= 8; u++) {
    for (let l = 1; l <= 8; l++) {
      for (const changeLine of [1, 4]) {
        // spot-check 2 changing positions per hex
        const { values } = castByNumbers(u, l, changeLine)
        const hex = getHexagramInfo(values)
        const lines = getZhuangGuaLines(values, hex, 4) // stable day stem
        const score = calculateYijingScore(values, hex, lines)
        it(`${hex.name} (u=${u}, l=${l}, ch=${changeLine}) score=${score} in [0,100]`, () => {
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(100)
        })
      }
    }
  }
})

// ═══════════════════════════════════════════════════════════════
// 8. Line data completeness
// ═══════════════════════════════════════════════════════════════

describe('ZhuangGuaLines completeness', () => {
  const { values } = castByNumbers(1, 1, 1)
  const hex = getHexagramInfo(values)
  const lines = getZhuangGuaLines(values, hex, 4)

  it('returns 6 lines', () => {
    expect(lines).toHaveLength(6)
  })

  it('each line has all required fields', () => {
    for (const line of lines) {
      expect(line.position).toBeGreaterThanOrEqual(1)
      expect(line.position).toBeLessThanOrEqual(6)
      expect(line.positionName.length).toBeGreaterThan(0)
      expect(line.naJiaStem.length).toBe(1)
      expect(line.naJiaBranch.length).toBe(1)
      expect(line.naJiaDisplay.length).toBe(2)
      expect(['木', '火', '土', '金', '水']).toContain(line.branchWuxing)
      expect(line.sixRelation.length).toBeGreaterThan(0)
      expect(line.sixSpirit.length).toBeGreaterThan(0)
      expect(line.judgment.length).toBeGreaterThan(0)
    }
  })

  it('exactly 1 shi line and 1 ying line', () => {
    const shiCount = lines.filter(l => l.isShi).length
    const yingCount = lines.filter(l => l.isYing).length
    expect(shiCount).toBe(1)
    expect(yingCount).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. computeYijingResult integration
// ═══════════════════════════════════════════════════════════════

describe('computeYijingResult integration', () => {
  const { values } = castByNumbers(3, 5, 2) // 火风鼎
  const result = computeYijingResult(values, 4)

  it('returns complete result with all fields', () => {
    expect(result.hexagram.name).toBeTruthy()
    expect(result.lines).toHaveLength(6)
    expect(result.huGua).toBeDefined()
    expect(result.huGua!.name).toBeTruthy()
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.interpretation.length).toBeGreaterThan(200)
  })

  it('derived hexagram exists when changing lines present', () => {
    expect(result.derivedHexagram).toBeDefined()
    expect(result.derivedLines).toHaveLength(6)
  })
})
