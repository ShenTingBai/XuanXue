/**
 * Phase C-4: ZeJi Exhaustive Tests
 *
 * Covers: EVENT_TYPES, TWELVE_STAR_LEVEL table, evaluateDates structure
 * Total: ~60 assertions
 */

import { describe, it, expect } from 'vitest'
import { EVENT_TYPES, TWELVE_STAR_LEVEL } from '../../constants/zeji'
import { evaluateDates } from '../../composables/useZeJi'

// ═══════════════════════════════════════════════════════════════
// 1. EVENT_TYPES data completeness
// ═══════════════════════════════════════════════════════════════

describe('EVENT_TYPES', () => {
  it('has at least 9 event types', () => {
    const keys = Object.keys(EVENT_TYPES)
    expect(keys.length).toBeGreaterThanOrEqual(9)
  })

  it('each event type has name, icon, keywords', () => {
    for (const [, info] of Object.entries(EVENT_TYPES)) {
      expect(info.name.length).toBeGreaterThan(0)
      expect(info.icon.length).toBeGreaterThan(0)
      expect(info.keywords.length).toBeGreaterThan(0)
    }
  })

  it('keywords are all strings', () => {
    for (const info of Object.values(EVENT_TYPES)) {
      for (const kw of info.keywords) {
        expect(typeof kw).toBe('string')
        expect(kw.length).toBeGreaterThan(0)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. TWELVE_STAR_LEVEL table
// ═══════════════════════════════════════════════════════════════

describe('TWELVE_STAR_LEVEL', () => {
  it('has entries for all 12 stars', () => {
    const stars = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭']
    for (const star of stars) {
      expect(TWELVE_STAR_LEVEL[star]).toBeDefined()
    }
  })

  it('each star has level (吉|凶|平) and desc', () => {
    for (const info of Object.values(TWELVE_STAR_LEVEL)) {
      expect(['吉', '凶', '平']).toContain(info.level)
      expect(info.desc.length).toBeGreaterThan(0)
    }
  })

  it('has both 吉 and 凶 entries (not all one type)', () => {
    const levels = new Set(Object.values(TWELVE_STAR_LEVEL).map(v => v.level))
    expect(levels.has('吉')).toBe(true)
    expect(levels.has('凶')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. evaluateDates integration
// ═══════════════════════════════════════════════════════════════

describe('evaluateDates', () => {
  const start = new Date(2026, 5, 1) // June 2026

  it('returns structured result for wedding event', () => {
    const result = evaluateDates('wedding', start, 1)
    expect(result.eventType).toBe('wedding')
    expect(result.eventName.length).toBeGreaterThan(0)
    expect(result.months.length).toBeGreaterThanOrEqual(1)
  })

  it('each month has correct fields', () => {
    const result = evaluateDates('wedding', start, 1)
    for (const month of result.months) {
      expect(month.year).toBeGreaterThan(2025)
      expect(month.month).toBeGreaterThanOrEqual(1)
      expect(month.month).toBeLessThanOrEqual(12)
      expect(month.label.length).toBeGreaterThan(0)
      expect(month.days.length).toBeGreaterThan(0) // full month
    }
  })

  it('each day has complete result structure', () => {
    const result = evaluateDates('wedding', start, 1)
    const firstDay = result.months[0].days[0]
    expect(firstDay.solarDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(firstDay.lunarDate.length).toBeGreaterThan(0)
    expect(firstDay.twelveStar.length).toBeGreaterThan(0)
    expect(firstDay.twelveStarLevel.length).toBeGreaterThan(0)
    expect(firstDay.score).toBeGreaterThanOrEqual(0)
    expect(firstDay.score).toBeLessThanOrEqual(100)
    expect(typeof firstDay.isRecommended).toBe('boolean')
  })

  it('recommendedDates are sorted by score descending', () => {
    const result = evaluateDates('wedding', start, 1)
    for (let i = 1; i < result.recommendedDates.length; i++) {
      expect(result.recommendedDates[i - 1].score).toBeGreaterThanOrEqual(
        result.recommendedDates[i].score,
      )
    }
  })

  it('recommendedDates has at most 15 entries', () => {
    const result = evaluateDates('wedding', start, 3) // 3 months
    expect(result.recommendedDates.length).toBeLessThanOrEqual(15)
  })

  it('returns empty for unknown event type', () => {
    const result = evaluateDates('nonexistent_event', start, 1)
    expect(result.months).toHaveLength(0)
    expect(result.recommendedDates).toHaveLength(0)
  })
})
