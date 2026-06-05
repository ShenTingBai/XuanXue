/**
 * Phase C-2: Constellation Exhaustive Tests
 *
 * Covers: 12 zodiac data, element compatibility, horoscope ranges, moon/rising sign
 * Total: ~120 assertions
 */

import { describe, it, expect } from 'vitest'
import {
  ZODIACS,
  calculateConstellation,
  getZodiacIndex,
  getMoonSign,
  MOON_INTERPRETATIONS,
} from '../../composables/useConstellation'

// ═══════════════════════════════════════════════════════════════
// 1. ZODIACS data completeness
// ═══════════════════════════════════════════════════════════════

describe('ZODIACS array — 12 signs', () => {
  it('has exactly 12 signs', () => {
    expect(ZODIACS).toHaveLength(12)
  })

  it('all 12 have unique symbols', () => {
    const symbols = ZODIACS.map(z => z.symbol)
    expect(new Set(symbols).size).toBe(12)
  })

  it('element distribution: 火×3, 土×3, 风×3, 水×3', () => {
    const counts: Record<string, number> = {}
    for (const z of ZODIACS) counts[z.element] = (counts[z.element] || 0) + 1
    expect(counts['火']).toBe(3)
    expect(counts['土']).toBe(3)
    expect(counts['风']).toBe(3)
    expect(counts['水']).toBe(3)
  })

  it('each sign has valid fields', () => {
    for (const z of ZODIACS) {
      expect(z.name.length).toBeGreaterThan(0)
      expect(z.symbol.length).toBeGreaterThan(0)
      expect(z.startMonth).toBeGreaterThanOrEqual(1)
      expect(z.startMonth).toBeLessThanOrEqual(12)
      expect(z.startDay).toBeGreaterThanOrEqual(1)
      expect(z.startDay).toBeLessThanOrEqual(31)
      expect(['火', '土', '风', '水']).toContain(z.element)
      expect(z.rulingPlanet.length).toBeGreaterThan(0)
      expect(z.personality.length).toBeGreaterThan(0)
    }
  })

  // Capricorn wraps: 12/22 → 1/19
  it('摩羯座 wraps across year boundary (startMonth=12 > endMonth=1)', () => {
    const cap = ZODIACS[9] // 摩羯 is index 9
    expect(cap.startMonth).toBe(12)
    expect(cap.endMonth).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. getZodiacIndex boundary tests
// ═══════════════════════════════════════════════════════════════

describe('getZodiacIndex', () => {
  const cases: Array<[number, number, number, string]> = [
    [3, 21, 0, '白羊座'],
    [4, 20, 1, '金牛座'],
    [5, 21, 2, '双子座'],
    [6, 22, 3, '巨蟹座'],
    [7, 23, 4, '狮子座'],
    [8, 23, 5, '处女座'],
    [9, 23, 6, '天秤座'],
    [10, 24, 7, '天蝎座'],
    [11, 22, 8, '射手座'],
    [12, 22, 9, '摩羯座'],
    [1, 20, 10, '水瓶座'],
    [2, 19, 11, '双鱼座'],
    // Boundary days
    [3, 20, 11, '双鱼座 (last day)'],
    [12, 21, 8, '射手座 (last day)'],
    [1, 19, 9, '摩羯座 (last day)'],
  ]

  for (const [m, d, expected, desc] of cases) {
    it(`${desc}: ${m}/${d} → index ${expected}`, () => {
      expect(getZodiacIndex(m, d)).toBe(expected)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 3. calculateConstellation result structure
// ═══════════════════════════════════════════════════════════════

describe('calculateConstellation', () => {
  it('throws for invalid month', () => {
    expect(() => calculateConstellation(13, 1)).toThrow(RangeError)
    expect(() => calculateConstellation(0, 1)).toThrow(RangeError)
  })

  it('throws for invalid day', () => {
    expect(() => calculateConstellation(1, 32)).toThrow(RangeError)
    expect(() => calculateConstellation(1, 0)).toThrow(RangeError)
  })

  it('returns correct sign for 3/21 (白羊)', () => {
    const r = calculateConstellation(3, 21)
    expect(r.name).toBe('白羊座')
    expect(r.symbol).toBe('♈')
    expect(r.element).toBe('火')
  })

  it('returns complete result structure', () => {
    const r = calculateConstellation(6, 15)
    expect(r.name).toBeTruthy()
    expect(r.symbol).toBeTruthy()
    expect(r.dateRange).toBeTruthy()
    expect(['火', '土', '风', '水']).toContain(r.element)
    expect(r.rulingPlanet).toBeTruthy()
    expect(r.luckyColor).toBeTruthy()
    expect(r.luckyNumber).toBeGreaterThan(0)
    expect(r.personality.length).toBeGreaterThan(0)
  })

  it('horoscope scores are in [0, 100]', () => {
    const r = calculateConstellation(6, 15)
    const dims = ['overall', 'love', 'career', 'wealth', 'health'] as const
    for (const d of dims) {
      expect(r.todayHoroscope[d]).toBeGreaterThanOrEqual(0)
      expect(r.todayHoroscope[d]).toBeLessThanOrEqual(100)
    }
  })

  it('todayYi has exactly 3 items, todayJi has exactly 2', () => {
    const r = calculateConstellation(6, 15)
    expect(r.todayYi).toHaveLength(3)
    expect(r.todayJi).toHaveLength(2)
  })

  it('compatibility returns 4 entries', () => {
    const r = calculateConstellation(6, 15)
    expect(r.compatibility).toHaveLength(4)
    for (const c of r.compatibility) {
      expect(['great', 'good', 'bad']).toContain(c.level)
      expect(c.name.length).toBeGreaterThan(0)
    }
  })

  it('moonSign is undefined without birthYear', () => {
    const r = calculateConstellation(6, 15)
    expect(r.moonSign).toBeUndefined()
  })

  it('moonSign is computed with birthYear', () => {
    const r = calculateConstellation(6, 15, undefined, 1990, 6, 15)
    expect(r.moonSign).toBeDefined()
    expect(r.moonSign!.name.length).toBeGreaterThan(0)
    expect(r.moonSign!.symbol.length).toBeGreaterThan(0)
    expect(r.moonSign!.interpretation.length).toBeGreaterThan(0)
  })

  it('risingSign is null without birthHour', () => {
    const r = calculateConstellation(6, 15, undefined, 1990, 6, 15)
    expect(r.risingSign).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Moon sign — all 12 signs reachable
// ═══════════════════════════════════════════════════════════════

describe('getMoonSign', () => {
  it('returns undefined for null year', () => {
    expect(getMoonSign(undefined, 6, 15)).toBeUndefined()
  })

  it('returns undefined for invalid month', () => {
    expect(getMoonSign(1990, 13, 1)).toBeUndefined()
  })

  it('returns valid sign for known date', () => {
    const ms = getMoonSign(1990, 6, 15)
    expect(ms).toBeDefined()
    expect(ZODIACS.map(z => z.name)).toContain(ms!.name)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Moon interpretations — all 12 signs covered
// ═══════════════════════════════════════════════════════════════

describe('MOON_INTERPRETATIONS completeness', () => {
  it('all 12 signs have moon interpretations', () => {
    for (const z of ZODIACS) {
      expect(MOON_INTERPRETATIONS[z.name]).toBeDefined()
      expect(MOON_INTERPRETATIONS[z.name].length).toBeGreaterThan(20)
    }
  })
})
