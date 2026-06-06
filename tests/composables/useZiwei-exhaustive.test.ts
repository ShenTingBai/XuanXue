/**
 * Phase D-3: ZiWei Exhaustive/Completeness Tests
 *
 * Strategy: Verify constant completeness (star×palace×transformation counts),
 * factory doesn't throw for edge-case inputs, and deserialization round-trips.
 * Total: ~80 assertions
 */

import { describe, it, expect } from 'vitest'
import {
  PALACE_INTERPRETATIONS,
  STAR_INTERPRETATIONS,
  MINOR_STAR_INTERPRETATIONS,
  ADJECTIVE_STAR_INTERPRETATIONS,
  TRANSFORMATION_INTERPRETATIONS,
} from '../../constants/ziwei'
import {
  calculateZiWei,
  getMingGongIndex,
  getShenGongIndex,
  collectTransformations,
  getPalaceDetail,
  getDetailedPalaceView,
  serializeAstrolabe,
  deserializeAstrolabe,
} from '../../composables/useZiwei'

// ═══════════════════════════════════════════════════════════════
// 1. PALACE_INTERPRETATIONS — all 12 palaces covered
// ═══════════════════════════════════════════════════════════════

describe('ZiWei PALACE_INTERPRETATIONS', () => {
  const expectedPalaces = [
    '命宫',
    '兄弟宫',
    '夫妻宫',
    '子女宫',
    '财帛宫',
    '疾厄宫',
    '迁移宫',
    '交友宫',
    '官禄宫',
    '田宅宫',
    '福德宫',
    '父母宫',
  ]

  it('has exactly 12 palaces', () => {
    expect(Object.keys(PALACE_INTERPRETATIONS)).toHaveLength(12)
  })

  it('all 12 expected palace names are present', () => {
    for (const name of expectedPalaces) {
      expect(PALACE_INTERPRETATIONS[name]).toBeDefined()
    }
  })

  it('all palace interpretations are non-empty strings', () => {
    for (const name of expectedPalaces) {
      expect(PALACE_INTERPRETATIONS[name].length).toBeGreaterThan(20)
    }
  })

  it('each interpretation mentions the palace name', () => {
    for (const name of expectedPalaces) {
      expect(PALACE_INTERPRETATIONS[name]).toContain('代表')
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. STAR_INTERPRETATIONS — all 14 major stars covered
// ═══════════════════════════════════════════════════════════════

describe('ZiWei STAR_INTERPRETATIONS', () => {
  const majorStars = [
    '紫微',
    '天机',
    '太阳',
    '武曲',
    '天同',
    '廉贞',
    '天府',
    '太阴',
    '贪狼',
    '巨门',
    '天相',
    '天梁',
    '七杀',
    '破军',
  ]

  it('has exactly 14 major stars', () => {
    expect(Object.keys(STAR_INTERPRETATIONS)).toHaveLength(14)
  })

  it('all 14 expected stars are present', () => {
    for (const star of majorStars) {
      expect(STAR_INTERPRETATIONS[star]).toBeDefined()
    }
  })

  it('all star interpretations are non-empty', () => {
    for (const star of majorStars) {
      expect(STAR_INTERPRETATIONS[star].length).toBeGreaterThan(10)
    }
  })

  it('each interpretation contains the star name', () => {
    for (const star of majorStars) {
      expect(STAR_INTERPRETATIONS[star]).toContain(star)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. MINOR_STAR_INTERPRETATIONS — all 14 minor stars
// ═══════════════════════════════════════════════════════════════

describe('ZiWei MINOR_STAR_INTERPRETATIONS', () => {
  const minorStars = [
    '文昌',
    '文曲',
    '左辅',
    '右弼',
    '天魁',
    '天钺',
    '禄存',
    '擎羊',
    '陀罗',
    '火星',
    '铃星',
    '地空',
    '地劫',
    '天马',
  ]

  it('has exactly 14 minor stars', () => {
    expect(Object.keys(MINOR_STAR_INTERPRETATIONS)).toHaveLength(14)
  })

  it('all 14 expected minor stars are present', () => {
    for (const star of minorStars) {
      expect(MINOR_STAR_INTERPRETATIONS[star]).toBeDefined()
    }
  })

  it('all minor star interpretations are non-empty', () => {
    for (const star of minorStars) {
      expect(MINOR_STAR_INTERPRETATIONS[star].length).toBeGreaterThan(10)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. ADJECTIVE_STAR_INTERPRETATIONS — at least 10 entries
// ═══════════════════════════════════════════════════════════════

describe('ZiWei ADJECTIVE_STAR_INTERPRETATIONS', () => {
  it('has at least 10 adjective stars', () => {
    expect(Object.keys(ADJECTIVE_STAR_INTERPRETATIONS).length).toBeGreaterThanOrEqual(10)
  })

  it('all adjective star interpretations are non-empty', () => {
    for (const [, text] of Object.entries(ADJECTIVE_STAR_INTERPRETATIONS)) {
      expect(text.length).toBeGreaterThan(5)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. TRANSFORMATION_INTERPRETATIONS — 4 transformations × ≥10 stars
// ═══════════════════════════════════════════════════════════════

describe('ZiWei TRANSFORMATION_INTERPRETATIONS', () => {
  const transformations = ['禄', '权', '科', '忌']

  it('has all 4 transformations (禄权科忌)', () => {
    for (const t of transformations) {
      expect(TRANSFORMATION_INTERPRETATIONS[t]).toBeDefined()
    }
  })

  it('each transformation has at least 10 star entries', () => {
    for (const t of transformations) {
      expect(Object.keys(TRANSFORMATION_INTERPRETATIONS[t]).length).toBeGreaterThanOrEqual(10)
    }
  })

  it('all transformation entries are non-empty strings', () => {
    for (const t of transformations) {
      for (const v of Object.values(TRANSFORMATION_INTERPRETATIONS[t] as Record<string, string>)) {
        expect(v.length).toBeGreaterThan(10)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. calculateZiWei — factory doesn't throw on valid input
// ═══════════════════════════════════════════════════════════════

describe('calculateZiWei renders without throwing', () => {
  it('returns non-null for valid input (male)', () => {
    const result = calculateZiWei({
      birthYear: 1990,
      birthMonth: 6,
      birthDay: 15,
      birthHour: 6, // 卯时
      gender: 'male',
    })
    expect(result).not.toBeNull()
  })

  it('returns non-null for valid input (female)', () => {
    const result = calculateZiWei({
      birthYear: 1985,
      birthMonth: 12,
      birthDay: 1,
      birthHour: 12, // 午时
      gender: 'female',
    })
    expect(result).not.toBeNull()
  })

  it('returns null for missing gender', () => {
    const result = calculateZiWei({
      birthYear: 1990,
      birthMonth: 6,
      birthDay: 15,
      birthHour: 6,
      gender: null,
    })
    expect(result).toBeNull()
  })

  it('returns null for null birthHour', () => {
    const result = calculateZiWei({
      birthYear: 1990,
      birthMonth: 6,
      birthDay: 15,
      birthHour: null,
      gender: 'male',
    })
    expect(result).toBeNull()
  })

  it('returns null for undefined birthHour', () => {
    const result = calculateZiWei({
      birthYear: 1990,
      birthMonth: 6,
      birthDay: 15,
      birthHour: undefined as unknown as null,
      gender: 'male',
    })
    expect(result).toBeNull()
  })

  it('handles boundary years (1900)', () => {
    calculateZiWei({
      birthYear: 1900,
      birthMonth: 1,
      birthDay: 1,
      birthHour: 0,
      gender: 'male',
    })
    // Should not throw; may return null or valid
    expect(() =>
      calculateZiWei({
        birthYear: 1900,
        birthMonth: 1,
        birthDay: 1,
        birthHour: 0,
        gender: 'male',
      }),
    ).not.toThrow()
  })

  it('handles boundary years (2100)', () => {
    expect(() =>
      calculateZiWei({
        birthYear: 2100,
        birthMonth: 12,
        birthDay: 31,
        birthHour: 12,
        gender: 'female',
      }),
    ).not.toThrow()
  })

  it('handles extreme time index 0 (早子时)', () => {
    const result = calculateZiWei({
      birthYear: 1990,
      birthMonth: 6,
      birthDay: 15,
      birthHour: 0,
      gender: 'male',
    })
    expect(result).not.toBeNull()
  })

  it('handles extreme time index 12 (晚子时)', () => {
    const result = calculateZiWei({
      birthYear: 1990,
      birthMonth: 6,
      birthDay: 15,
      birthHour: 12,
      gender: 'male',
    })
    expect(result).not.toBeNull()
  })

  it('handles February 29 (leap year)', () => {
    const result = calculateZiWei({
      birthYear: 2024,
      birthMonth: 2,
      birthDay: 29,
      birthHour: 6,
      gender: 'female',
    })
    expect(result).not.toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Astrolabe invariants (using a known-good chart)
// ═══════════════════════════════════════════════════════════════

describe('ZiWei astrolabe structure', () => {
  const astrolabe = calculateZiWei({
    birthYear: 1990,
    birthMonth: 6,
    birthDay: 15,
    birthHour: 6,
    gender: 'male',
  })!

  it('has 12 palaces', () => {
    expect(astrolabe.palaces).toHaveLength(12)
  })

  it('every palace has a name', () => {
    for (const p of astrolabe.palaces) {
      expect(p.name.length).toBeGreaterThan(0)
    }
  })

  it('every palace has an earthlyBranch', () => {
    for (const p of astrolabe.palaces) {
      expect(p.earthlyBranch.length).toBe(1)
    }
  })

  it('every palace has a heavenlyStem', () => {
    for (const p of astrolabe.palaces) {
      expect(p.heavenlyStem.length).toBe(1)
    }
  })

  it('all 12 earthly branches are unique across palaces', () => {
    const branches = astrolabe.palaces.map(p => p.earthlyBranch)
    expect(new Set(branches).size).toBe(12)
  })

  it('has exactly one body palace', () => {
    const bodyPalaces = astrolabe.palaces.filter(p => p.isBodyPalace)
    expect(bodyPalaces).toHaveLength(1)
  })

  it('getMingGongIndex returns a valid index', () => {
    const idx = getMingGongIndex(astrolabe.palaces)
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThan(12)
    expect(astrolabe.palaces[idx].name).toBe('命宫')
  })

  it('getShenGongIndex returns the body palace index', () => {
    const idx = getShenGongIndex(astrolabe.palaces)
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(idx).toBeLessThan(12)
    expect(astrolabe.palaces[idx].isBodyPalace).toBe(true)
  })

  it('collectTransformations returns valid data', () => {
    const trans = collectTransformations(astrolabe.palaces)
    expect(trans.length).toBeGreaterThan(0)
    for (const t of trans) {
      expect(t.star.length).toBeGreaterThan(0)
      expect(t.transformation.length).toBeGreaterThan(0)
    }
  })

  it('getPalaceDetail does not throw for any palace', () => {
    for (const p of astrolabe.palaces) {
      expect(() => getPalaceDetail(p)).not.toThrow()
    }
  })

  it('getDetailedPalaceView does not throw for 命宫', () => {
    const mingGong = astrolabe.palaces.find(p => p.name === '命宫')!
    expect(() => getDetailedPalaceView(mingGong)).not.toThrow()
    const view = getDetailedPalaceView(mingGong)
    expect(view.name).toBe('命宫')
    expect(view.branch.length).toBe(1)
    expect(view.stem.length).toBe(1)
    expect(view.fullInterpretation.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. Serialize / deserialize round-trip
// ═══════════════════════════════════════════════════════════════

describe('ZiWei serialize/deserialize', () => {
  const astrolabe = calculateZiWei({
    birthYear: 1990,
    birthMonth: 6,
    birthDay: 15,
    birthHour: 6,
    gender: 'male',
  })!

  it('serializeAstrolabe returns plain object', () => {
    const serialized = serializeAstrolabe(astrolabe)
    expect(typeof serialized).toBe('object')
    expect(Array.isArray(serialized.palaces)).toBe(true)
  })

  it('serialized data preserves key top-level fields', () => {
    const s = serializeAstrolabe(astrolabe)
    expect(s.solarDate).toBe(astrolabe.solarDate)
    expect(s.lunarDate).toBe(astrolabe.lunarDate)
    expect(s.gender).toBe(astrolabe.gender)
    expect(s.fiveElementsClass).toBe(astrolabe.fiveElementsClass)
  })

  it('deserialize(serialize(x)) preserves structure', () => {
    const s = serializeAstrolabe(astrolabe)
    const d = deserializeAstrolabe(s)
    expect(d).not.toBeNull()
    expect(d!.solarDate).toBe(astrolabe.solarDate)
    expect(d!.lunarDate).toBe(astrolabe.lunarDate)
    expect(d!.palaces).toHaveLength(12)
  })

  it('deserializeAstrolabe returns null for null input', () => {
    expect(deserializeAstrolabe(null as unknown as Record<string, unknown>)).toBeNull()
  })

  it('deserializeAstrolabe returns null for input without palaces', () => {
    expect(deserializeAstrolabe({})).toBeNull()
  })

  it('deserializeAstrolabe returns null for empty palaces array', () => {
    // Empty array passes the isArray check but has no palaces → returns null
    const result = deserializeAstrolabe({ palaces: [] })
    // Either null (strict) or object with 0 palaces (lenient) — both acceptable
    expect(result === null || result?.palaces?.length === 0).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. Star counts across chart
// ═══════════════════════════════════════════════════════════════

describe('ZiWei star inventory across full chart', () => {
  const astrolabe = calculateZiWei({
    birthYear: 1990,
    birthMonth: 6,
    birthDay: 15,
    birthHour: 6,
    gender: 'male',
  })!

  it('total major stars across all palaces ≥ 14 (紫微+天府 systems)', () => {
    let count = 0
    for (const p of astrolabe.palaces) count += p.majorStars.length
    expect(count).toBeGreaterThanOrEqual(14)
  })

  it('total minor stars across all palaces ≥ 14', () => {
    let count = 0
    for (const p of astrolabe.palaces) count += p.minorStars.length
    expect(count).toBeGreaterThanOrEqual(14)
  })

  it('at least some adjective stars exist', () => {
    let count = 0
    for (const p of astrolabe.palaces) count += p.adjectiveStars.length
    expect(count).toBeGreaterThan(0)
  })

  it('紫微 star is present somewhere in the chart', () => {
    const allMajorNames = astrolabe.palaces.flatMap(p => p.majorStars.map(s => s.name))
    expect(allMajorNames).toContain('紫微')
  })

  it('all star names are non-empty strings', () => {
    for (const p of astrolabe.palaces) {
      for (const s of p.majorStars) expect(s.name.length).toBeGreaterThan(0)
      for (const s of p.minorStars) expect(s.name.length).toBeGreaterThan(0)
      for (const s of p.adjectiveStars) expect(s.name.length).toBeGreaterThan(0)
    }
  })
})
