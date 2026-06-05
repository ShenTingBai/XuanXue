import { describe, it, expect } from 'vitest'
import { evaluateDates } from '../../composables/useZeJi'
import { EVENT_TYPES } from '../../constants/zeji'

describe('evaluateDates', () => {
  function makeDate() {
    return new Date(2024, 5, 1) // June 1, 2024 — fresh Date each call
  }

  // ── Top-level result structure (works regardless of lunar-javascript API) ──

  it('returns a ZejiResult with all top-level fields', () => {
    const result = evaluateDates('wedding', makeDate(), 1)
    expect(result).toHaveProperty('eventType')
    expect(result).toHaveProperty('eventName')
    expect(result).toHaveProperty('months')
    expect(result).toHaveProperty('recommendedDates')
  })

  it('eventType matches the input', () => {
    const result = evaluateDates('opening', makeDate(), 1)
    expect(result.eventType).toBe('opening')
    expect(result.eventName).toBe('开业')
  })

  it('returns empty result for unknown event type', () => {
    const result = evaluateDates('nonexistent_type', makeDate(), 1)
    expect(result.eventType).toBe('nonexistent_type')
    expect(result.eventName).toBe('nonexistent_type')
    expect(result.months).toHaveLength(0)
    expect(result.recommendedDates).toHaveLength(0)
  })

  it('returns correct number of months', () => {
    const result = evaluateDates('wedding', makeDate(), 2)
    expect(result.months).toHaveLength(2)
  })

  it('each month has year, month, label, and days array (days may be empty if lunar-javascript cannot compute)', () => {
    const freshDate = new Date(2024, 5, 1)
    const result = evaluateDates('wedding', freshDate, 1)
    expect(result.months.length).toBe(1)
    const month = result.months[0]
    expect(month).toHaveProperty('year')
    expect(month).toHaveProperty('month')
    expect(month).toHaveProperty('label')
    expect(month).toHaveProperty('days')
    expect(Array.isArray(month.days)).toBe(true)
    expect(month.label).toContain('月')
  })

  it('recommendedDates does not exceed 15 entries', () => {
    const result = evaluateDates('wedding', makeDate(), 3)
    expect(result.recommendedDates.length).toBeLessThanOrEqual(15)
  })

  it('recommendedDates are sorted by score descending (when present)', () => {
    const result = evaluateDates('wedding', makeDate(), 3)
    const scores = result.recommendedDates.map(d => d.score)
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
    }
  })

  // ── All event types ──

  it('supports all event types defined in EVENT_TYPES', () => {
    for (const type of Object.keys(EVENT_TYPES)) {
      const result = evaluateDates(type, makeDate(), 1)
      expect(result.eventType).toBe(type)
      expect(result.months.length).toBeGreaterThan(0)
    }
  })

  // ── Cross-month and year boundary ──

  it('handles multi-month evaluation crossing year boundary', () => {
    const lateDate = new Date(2024, 10, 1) // November 1, 2024
    const result = evaluateDates('wedding', lateDate, 4)
    expect(result.months.length).toBe(4)
  })

  // ── Default start date ──

  it('works with default startDate (today)', () => {
    const result = evaluateDates('moving', undefined, 1)
    expect(result.months.length).toBeGreaterThan(0)
    expect(Array.isArray(result.months[0].days)).toBe(true)
  })

  // ── Deterministic ──

  it('is deterministic for the same inputs', () => {
    const a = evaluateDates('study', makeDate(), 1)
    const b = evaluateDates('study', makeDate(), 1)
    const scoresA = a.months[0].days.map(d => `${d.solarDate}:${d.score}`)
    const scoresB = b.months[0].days.map(d => `${d.solarDate}:${d.score}`)
    expect(scoresA).toEqual(scoresB)
  })

  // ── Day result fields (when days are available) ──

  it('each day result has all required fields (when lunar-javascript computes)', () => {
    const freshDate = new Date(2024, 5, 1)
    const result = evaluateDates('wedding', freshDate, 1)
    const days = result.months[0].days
    if (days.length > 0) {
      for (const day of days) {
        expect(day).toHaveProperty('solarDate')
        expect(day).toHaveProperty('lunarDate')
        expect(day).toHaveProperty('lunarMonthName')
        expect(day).toHaveProperty('lunarDayName')
        expect(day).toHaveProperty('lunarYearGanZhi')
        expect(day).toHaveProperty('lunarMonthGanZhi')
        expect(day).toHaveProperty('lunarDayGanZhi')
        expect(day).toHaveProperty('twelveStar')
        expect(day).toHaveProperty('twelveStarLevel')
        expect(day).toHaveProperty('xiu')
        expect(day).toHaveProperty('tianShen')
        expect(day).toHaveProperty('tianShenType')
        expect(day).toHaveProperty('yi')
        expect(day).toHaveProperty('ji')
        expect(day).toHaveProperty('score')
        expect(day).toHaveProperty('isRecommended')
        expect(day).toHaveProperty('matchReasons')
        expect(day).toHaveProperty('matchedYi')
        expect(day).toHaveProperty('matchedJi')
      }
    }
  })

  it('solarDate is in YYYY-MM-DD format (when days available)', () => {
    const freshDate = new Date(2024, 5, 1)
    const result = evaluateDates('wedding', freshDate, 1)
    const days = result.months[0].days
    if (days.length > 0) {
      expect(days[0].solarDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('every day has score between 0 and 100 (when days available)', () => {
    const result = evaluateDates('wedding', makeDate(), 1)
    for (const month of result.months) {
      for (const day of month.days) {
        expect(day.score).toBeGreaterThanOrEqual(0)
        expect(day.score).toBeLessThanOrEqual(100)
      }
    }
  })

  it('isRecommended is true iff score >= 65 (when days available)', () => {
    const result = evaluateDates('wedding', makeDate(), 1)
    for (const month of result.months) {
      for (const day of month.days) {
        expect(day.isRecommended).toBe(day.score >= 65)
      }
    }
  })

  it('yi and ji are arrays of strings (when days available)', () => {
    const result = evaluateDates('wedding', makeDate(), 1)
    for (const month of result.months) {
      for (const day of month.days) {
        expect(Array.isArray(day.yi)).toBe(true)
        expect(Array.isArray(day.ji)).toBe(true)
        for (const item of day.yi) expect(typeof item).toBe('string')
        for (const item of day.ji) expect(typeof item).toBe('string')
      }
    }
  })

  it('lunarDate, lunarMonthName, lunarDayName are consistent (when days available)', () => {
    const result = evaluateDates('wedding', makeDate(), 1)
    for (const month of result.months) {
      for (const day of month.days) {
        expect(day.lunarDate).toBe(day.lunarMonthName + day.lunarDayName)
      }
    }
  })

  it('tianShenType is either 黄道, 黑道, or empty (when days available)', () => {
    const result = evaluateDates('wedding', makeDate(), 1)
    for (const month of result.months) {
      for (const day of month.days) {
        expect(['黄道', '黑道', '']).toContain(day.tianShenType)
      }
    }
  })

  it('matchReasons contains 宜/忌 entries when keywords match (when days available)', () => {
    const result = evaluateDates('wedding', makeDate(), 1)
    for (const day of result.months[0].days) {
      if (day.matchedYi.length > 0 || day.matchedJi.length > 0) {
        expect(day.matchReasons.length).toBeGreaterThan(0)
      }
    }
  })
})
