import { describe, it, expect } from 'vitest'
import { getTrueSolarHour, getTrueSolarHourIndex } from '~/utils/time'

describe('getTrueSolarHour', () => {
  it('returns same hour when longitude is exactly 120 (Beijing meridian)', () => {
    expect(getTrueSolarHour(12, 120)).toBeCloseTo(12, 2)
    expect(getTrueSolarHour(0, 120)).toBeCloseTo(0, 2)
    expect(getTrueSolarHour(23, 120)).toBeCloseTo(23, 2)
  })

  it('adjusts correctly for locations west of 120°E', () => {
    // 15° west of Beijing → -60 minutes → -1 hour
    expect(getTrueSolarHour(12, 105)).toBeCloseTo(11, 2)
    // 90°E (Urumqi area) → (90-120)*4 = -120 min → -2 hours
    expect(getTrueSolarHour(12, 90)).toBeCloseTo(10, 2)
    // 75°E → (75-120)*4 = -180 min → -3 hours
    expect(getTrueSolarHour(12, 75)).toBeCloseTo(9, 2)
  })

  it('adjusts correctly for locations east of 120°E', () => {
    // 130°E → (130-120)*4 = 40 min → +0.667 hours
    expect(getTrueSolarHour(12, 130)).toBeCloseTo(12.667, 1)
    // 135°E → (135-120)*4 = 60 min → +1 hour
    expect(getTrueSolarHour(12, 135)).toBeCloseTo(13, 2)
  })

  it('can produce negative hours (should be normalized by caller)', () => {
    // midnight at 60°E: (60-120)*4 = -240 min = -4 hours
    expect(getTrueSolarHour(0, 60)).toBeCloseTo(-4, 2)
  })

  it('can produce hours over 24 (should be normalized by caller)', () => {
    // midnight at 150°E: (150-120)*4 = 120 min = +2 hours
    expect(getTrueSolarHour(23, 150)).toBeCloseTo(25, 2)
  })

  it('returns float values for partial-hour adjustments', () => {
    // 121.5°E → (121.5-120)*4 = 6 min → +0.1 hours
    expect(getTrueSolarHour(12, 121.5)).toBeCloseTo(12.1, 2)
  })
})

describe('getTrueSolarHourIndex', () => {
  it('returns correct 时辰 index at Beijing meridian (no adjustment)', () => {
    // 午时 (11:00-12:59) → index 6
    expect(getTrueSolarHourIndex(12, 120)).toBe(6)
    // 子时 (23:00-00:59) → index 0
    expect(getTrueSolarHourIndex(23, 120)).toBe(0)
    expect(getTrueSolarHourIndex(0, 120)).toBe(0)
    // 辰时 (07:00-08:59) → index 4
    expect(getTrueSolarHourIndex(7, 120)).toBe(4)
  })

  it('returns correct 时辰 index with longitude adjustment', () => {
    // 12:00 at 90°E → true solar ≈ 10:00 → 巳时 index 5
    expect(getTrueSolarHourIndex(12, 90)).toBe(5)
    // 12:00 at 130°E → true solar ≈ 12:40 → 午时 index 6
    expect(getTrueSolarHourIndex(12, 130)).toBe(6)
  })

  it('handles boundary cases correctly', () => {
    // 13:00 at 120°E → 未时 → index 7
    expect(getTrueSolarHourIndex(13, 120)).toBe(7)
    // 12:55 at 120°E → still 午时 → index 6
    expect(getTrueSolarHourIndex(12, 120)).toBe(6)
    // 23:00 at 135°E → true solar = 24:00 → normalized 0 → 子时 → index 0
    expect(getTrueSolarHourIndex(23, 135)).toBe(0)
  })

  it('defaults to 120°E when longitude not provided', () => {
    expect(getTrueSolarHourIndex(12)).toBe(6)
    expect(getTrueSolarHourIndex(0)).toBe(0)
  })
})
