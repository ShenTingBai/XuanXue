import { describe, it, expect } from 'vitest'
import { calculateConstellation } from '../../composables/useConstellation'

describe('calculateConstellation', () => {
  it('returns 白羊座 for April 1', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.name).toBe('白羊座')
    expect(result.symbol).toBe('♈')
    expect(result.element).toBe('火')
  })

  it('returns 金牛座 for May 1', () => {
    const result = calculateConstellation(5, 1, new Date('2026-05-25'))
    expect(result.name).toBe('金牛座')
  })

  it('returns 双子座 for June 1', () => {
    const result = calculateConstellation(6, 1, new Date('2026-05-25'))
    expect(result.name).toBe('双子座')
    expect(result.symbol).toBe('♊')
  })

  it('returns 巨蟹座 for July 1', () => {
    const result = calculateConstellation(7, 1, new Date('2026-05-25'))
    expect(result.name).toBe('巨蟹座')
  })

  it('returns 狮子座 for August 1', () => {
    const result = calculateConstellation(8, 1, new Date('2026-05-25'))
    expect(result.name).toBe('狮子座')
  })

  it('returns 处女座 for September 1', () => {
    const result = calculateConstellation(9, 1, new Date('2026-05-25'))
    expect(result.name).toBe('处女座')
  })

  it('returns 天秤座 for October 1', () => {
    const result = calculateConstellation(10, 1, new Date('2026-05-25'))
    expect(result.name).toBe('天秤座')
  })

  it('returns 天蝎座 for November 1', () => {
    const result = calculateConstellation(11, 1, new Date('2026-05-25'))
    expect(result.name).toBe('天蝎座')
  })

  it('returns 射手座 for December 1', () => {
    const result = calculateConstellation(12, 1, new Date('2026-05-25'))
    expect(result.name).toBe('射手座')
  })

  it('returns 摩羯座 for January 1', () => {
    const result = calculateConstellation(1, 1, new Date('2026-05-25'))
    expect(result.name).toBe('摩羯座')
  })

  it('returns 水瓶座 for February 1', () => {
    const result = calculateConstellation(2, 1, new Date('2026-05-25'))
    expect(result.name).toBe('水瓶座')
  })

  it('returns 双鱼座 for March 1', () => {
    const result = calculateConstellation(3, 1, new Date('2026-05-25'))
    expect(result.name).toBe('双鱼座')
  })

  it('handles boundary: March 20 is 双鱼座, March 21 is 白羊座', () => {
    const pisces = calculateConstellation(3, 20, new Date('2026-05-25'))
    expect(pisces.name).toBe('双鱼座')
    const aries = calculateConstellation(3, 21, new Date('2026-05-25'))
    expect(aries.name).toBe('白羊座')
  })

  it('returns 5-dimensional horoscope with scores 0-100', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    const h = result.todayHoroscope
    expect(h.overall).toBeGreaterThanOrEqual(0)
    expect(h.overall).toBeLessThanOrEqual(100)
    expect(h.love).toBeGreaterThanOrEqual(0)
    expect(h.love).toBeLessThanOrEqual(100)
    expect(h.career).toBeGreaterThanOrEqual(0)
    expect(h.career).toBeLessThanOrEqual(100)
    expect(h.wealth).toBeGreaterThanOrEqual(0)
    expect(h.wealth).toBeLessThanOrEqual(100)
    expect(h.health).toBeGreaterThanOrEqual(0)
    expect(h.health).toBeLessThanOrEqual(100)
  })

  it('returns deterministic horoscope (same date + same constellation = same scores)', () => {
    const a = calculateConstellation(4, 1, new Date('2026-05-25'))
    const b = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(a.todayHoroscope.overall).toBe(b.todayHoroscope.overall)
  })

  it('returns different scores for different constellations on same day', () => {
    const aries = calculateConstellation(4, 1, new Date('2026-05-25'))
    const taurus = calculateConstellation(5, 1, new Date('2026-05-25'))
    expect(aries.todayHoroscope.overall).not.toBe(taurus.todayHoroscope.overall)
  })

  it('returns todayYi and todayJi arrays with content', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.todayYi.length).toBeGreaterThan(0)
    expect(result.todayJi.length).toBeGreaterThan(0)
  })

  it('returns 4 compatibility entries', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.compatibility).toHaveLength(4)
  })

  it('returns dateRange for the constellation', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.dateRange).toBeTruthy()
    expect(result.dateRange).toContain('3月21日')
  })

  it('returns rulingPlanet', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.rulingPlanet).toBeTruthy()
  })

  it('returns luckyColor and luckyNumber', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.luckyColor).toBeTruthy()
    expect(result.luckyNumber).toBeGreaterThan(0)
  })

  it('returns personality description', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.personality.length).toBeGreaterThan(10)
  })

  it('handles Capricorn boundary: Dec 22 is 摩羯座', () => {
    const result = calculateConstellation(12, 22, new Date('2026-05-25'))
    expect(result.name).toBe('摩羯座')
  })

  it('handles Capricorn boundary: Jan 19 is 摩羯座', () => {
    const result = calculateConstellation(1, 19, new Date('2026-05-25'))
    expect(result.name).toBe('摩羯座')
  })

  it('works without currentDate parameter', () => {
    const result = calculateConstellation(4, 1)
    expect(result.name).toBe('白羊座')
    expect(result.todayHoroscope.overall).toBeGreaterThanOrEqual(0)
  })

  it('throws RangeError for invalid month', () => {
    expect(() => calculateConstellation(13, 1, new Date('2026-05-25'))).toThrow(RangeError)
  })

  it('throws RangeError for invalid day', () => {
    expect(() => calculateConstellation(4, 32, new Date('2026-05-25'))).toThrow(RangeError)
  })

  it('returns compatibility entries with correct structure', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    expect(result.compatibility).toHaveLength(4)
    for (const entry of result.compatibility) {
      expect(entry).toHaveProperty('name')
      expect(entry).toHaveProperty('symbol')
      expect(entry).toHaveProperty('level')
      expect(entry).toHaveProperty('label')
      expect(['great', 'good', 'bad']).toContain(entry.level)
    }
  })

  it('compatibility sorts great before good', () => {
    const result = calculateConstellation(4, 1, new Date('2026-05-25'))
    const levels = result.compatibility.map(e => e.level)
    const firstGood = levels.indexOf('good')
    const lastGreat = levels.lastIndexOf('great')
    // All 'great' entries should come before any 'good' entries
    if (lastGreat >= 0 && firstGood >= 0) {
      expect(lastGreat).toBeLessThan(firstGood)
    }
  })
})
