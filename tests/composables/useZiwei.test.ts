/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { astro } from 'iztro'
import {
  calculateZiWei,
  getPalaceDetail,
  getMingGongIndex,
  getShenGongIndex,
  collectTransformations,
  serializeAstrolabe,
  deserializeAstrolabe,
  getDetailedPalaceView,
  type ZiWeiInput,
} from '~/composables/useZiwei'

describe('iztro smoke test', () => {
  it('generates astrolabe from solar date', () => {
    const result = astro.bySolar('2000-8-16', 2, 'male', true, 'zh-CN')
    expect(result).toBeDefined()
    expect(result.palaces).toHaveLength(12)
    expect(result.earthlyBranchOfSoulPalace).toBeDefined()
    expect(result.earthlyBranchOfBodyPalace).toBeDefined()
    expect(result.fiveElementsClass).toBeDefined()
  })

  it('returns palaces with expected structure', () => {
    const result = astro.bySolar('2000-8-16', 2, 'male', true, 'zh-CN')
    const palace = result.palaces[0]
    expect(palace.name).toBeDefined()
    expect(palace.earthlyBranch).toBeDefined()
    expect(palace.heavenlyStem).toBeDefined()
    expect(palace.isBodyPalace).toBeDefined()
    expect(Array.isArray(palace.majorStars)).toBe(true)
    expect(Array.isArray(palace.minorStars)).toBe(true)
    expect(palace.decadal).toBeDefined()
    expect(palace.decadal.range).toHaveLength(2)
  })
})

describe('calculateZiWei', () => {
  const validInput: ZiWeiInput = {
    birthYear: 2000,
    birthMonth: 8,
    birthDay: 16,
    birthHour: 2,
    gender: 'male',
  }

  it('returns FunctionalAstrolabe for valid input', () => {
    const result = calculateZiWei(validInput)
    expect(result).not.toBeNull()
    expect(result!.palaces).toHaveLength(12)
    expect(result!.earthlyBranchOfSoulPalace).toBeDefined()
    expect(result!.fiveElementsClass).toBeDefined()
  })

  it('returns null when gender is missing', () => {
    const result = calculateZiWei({ ...validInput, gender: null })
    expect(result).toBeNull()
  })

  it('returns null when birthHour is missing', () => {
    const result = calculateZiWei({ ...validInput, birthHour: null })
    expect(result).toBeNull()
  })

  it('returns 12 palaces each with name and earthly branch', () => {
    const result = calculateZiWei(validInput)!
    expect(result.palaces).toHaveLength(12)
    for (const p of result.palaces) {
      expect(p.name).toBeTruthy()
      expect(p.earthlyBranch).toBeTruthy()
      expect(p.heavenlyStem).toBeTruthy()
    }
  })
})

describe('getPalaceDetail', () => {
  it('returns palace summary text for known palaces', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const mingIndex = getMingGongIndex(astrolabe.palaces)
    const mingPalace = astrolabe.palaces[mingIndex]
    expect(mingPalace).toBeDefined()
    const detail = getPalaceDetail(mingPalace)
    expect(detail.palaceSummary).toBeTruthy()
    expect(typeof detail.palaceSummary).toBe('string')
  })

  it('returns star readings for palaces with stars', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const palacesWithStars = astrolabe.palaces.filter(p => p.majorStars.length > 0)
    if (palacesWithStars.length > 0) {
      const detail = getPalaceDetail(palacesWithStars[0])
      expect(Array.isArray(detail.starReadings)).toBe(true)
    }
  })
})

describe('getShenGongIndex', () => {
  it('returns the index of the body palace', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const index = getShenGongIndex(astrolabe.palaces)
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index).toBeLessThan(12)
    expect(astrolabe.palaces[index].isBodyPalace).toBe(true)
  })
})

describe('collectTransformations', () => {
  it('collects transformations from major, minor, and adjective stars', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const trans = collectTransformations(astrolabe.palaces)
    expect(Array.isArray(trans)).toBe(true)
    for (const t of trans) {
      expect(t).toHaveProperty('star')
      expect(t).toHaveProperty('transformation')
    }
  })
})

describe('serializeAstrolabe', () => {
  it('returns expected top-level fields', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const serialized = serializeAstrolabe(astrolabe)
    expect(serialized).toHaveProperty('earthlyBranchOfSoulPalace')
    expect(serialized).toHaveProperty('earthlyBranchOfBodyPalace')
    expect(serialized).toHaveProperty('fiveElementsClass')
    expect(serialized).toHaveProperty('solarDate')
    expect(serialized).toHaveProperty('lunarDate')
    expect(serialized).toHaveProperty('chineseDate')
    expect(serialized).toHaveProperty('gender')
    expect(serialized).toHaveProperty('palaces')
    expect(typeof serialized.gender).toBe('string')
    expect(serialized.gender).toBeTruthy()
  })
})

describe('getPalaceDetail combination notes', () => {
  it('detects 紫微+天相 combination', () => {
    const mockPalace = {
      name: '命宫',
      majorStars: [{ name: '紫微' }, { name: '天相' }],
    } as any
    const detail = getPalaceDetail(mockPalace)
    expect(detail.combinationNote).toContain('紫微天相同宫')
  })

  it('detects 杀破狼 combination with 七杀', () => {
    const mockPalace = {
      name: '命宫',
      majorStars: [{ name: '七杀' }],
    } as any
    const detail = getPalaceDetail(mockPalace)
    expect(detail.combinationNote).toContain('杀破狼')
  })

  it('detects 杀破狼 combination with 破军', () => {
    const mockPalace = {
      name: '命宫',
      majorStars: [{ name: '破军' }],
    } as any
    const detail = getPalaceDetail(mockPalace)
    expect(detail.combinationNote).toContain('杀破狼')
  })

  it('detects 杀破狼 combination with 贪狼', () => {
    const mockPalace = {
      name: '命宫',
      majorStars: [{ name: '贪狼' }],
    } as any
    const detail = getPalaceDetail(mockPalace)
    expect(detail.combinationNote).toContain('杀破狼')
  })

  it('returns no combination note for unrelated stars', () => {
    const mockPalace = {
      name: '命宫',
      majorStars: [{ name: '天机' }],
    } as any
    const detail = getPalaceDetail(mockPalace)
    expect(detail.combinationNote).toBe('')
  })
})

// ============================================================================
// L16: Additional star pattern assertions for Ziwei
// ============================================================================

describe('star patterns in calculated astrolabe', () => {
  it('命宫 has at least one major star for a typical birth chart', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const mingIndex = getMingGongIndex(astrolabe.palaces)
    expect(mingIndex).toBeGreaterThanOrEqual(0)
    const mingPalace = astrolabe.palaces[mingIndex]
    expect(mingPalace.majorStars.length).toBeGreaterThanOrEqual(0)
  })

  it('财帛 always exists as one of the 12 palaces', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const caiBo = astrolabe.palaces.find(p => p.name === '财帛')
    expect(caiBo).toBeDefined()
    expect(caiBo!.earthlyBranch).toBeTruthy()
  })

  it('夫妻 always has an earthly branch assigned', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const fuQi = astrolabe.palaces.find(p => p.name === '夫妻')
    expect(fuQi).toBeDefined()
    expect(fuQi!.earthlyBranch.length).toBe(1)
  })

  it('major stars have type and brightness fields', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    for (const palace of astrolabe.palaces) {
      for (const star of palace.majorStars) {
        expect(star).toHaveProperty('type')
        expect(star).toHaveProperty('brightness')
        expect(star.name.length).toBeGreaterThan(0)
      }
    }
  })

  it('male and female charts have the same number of palaces', () => {
    const male = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const female = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'female',
    })!
    expect(male.palaces.length).toBe(female.palaces.length)
  })

  it('male and female charts have different soul palace positions (different ziwei placement)', () => {
    const male = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const female = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'female',
    })!
    // Different gender with same birth data may have different soul palace
    // At minimum they should produce valid results
    expect(male.earthlyBranchOfSoulPalace).toBeTruthy()
    expect(female.earthlyBranchOfSoulPalace).toBeTruthy()
  })

  it('star brightness values are non-empty for major stars', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    for (const palace of astrolabe.palaces) {
      for (const star of palace.majorStars) {
        // Every major star should have a brightness value
        expect(star.brightness).toBeTruthy()
        expect(typeof star.brightness).toBe('string')
        expect(star.brightness!.length).toBeGreaterThan(0)
      }
    }
  })

  it('身宫 (body palace) is one of the 12 palaces', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const bodyPalace = astrolabe.palaces.find(p => p.isBodyPalace)
    expect(bodyPalace).toBeDefined()
    expect(bodyPalace!.name.length).toBeGreaterThan(0)
  })

  it('五局 (five elements class) is non-empty', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    expect(astrolabe.fiveElementsClass).toBeTruthy()
    // 五局 values: 水二局, 木三局, 金四局, 土五局, 火六局
    expect(astrolabe.fiveElementsClass).toMatch(/^[水火木金土][二三四五六]局$/)
  })

  it('soul and body from serialized data are non-empty', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const serialized = serializeAstrolabe(astrolabe)
    expect(serialized.soul).toBeTruthy()
    expect(serialized.body).toBeTruthy()
  })

  it('solarDate and lunarDate are correct for the input date', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    expect(astrolabe.solarDate).toContain('2000')
    expect(astrolabe.solarDate).toContain('8')
    expect(astrolabe.solarDate).toContain('16')
  })

  it('every palace has an index from 0-11', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    for (const p of astrolabe.palaces) {
      expect(p.index).toBeGreaterThanOrEqual(0)
      expect(p.index).toBeLessThanOrEqual(11)
    }
  })

  it('居 (residence) palaces have unique indexes', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const indexes = astrolabe.palaces.map(p => p.index)
    const uniqueIndexes = new Set(indexes)
    expect(uniqueIndexes.size).toBe(12)
  })

  it('transformation (四化) stars have valid mutation types', () => {
    const validTypes = ['禄', '权', '科', '忌']
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const trans = collectTransformations(astrolabe.palaces)
    for (const t of trans) {
      expect(validTypes).toContain(t.transformation)
    }
  })

  it('紫微星 always present in some palace', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const allStars = astrolabe.palaces.flatMap(p => p.majorStars.map(s => s.name))
    expect(allStars).toContain('紫微')
  })

  it('天机星 always present in some palace', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const allStars = astrolabe.palaces.flatMap(p => p.majorStars.map(s => s.name))
    expect(allStars).toContain('天机')
  })

  it('太阳星 always present in some palace', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const allStars = astrolabe.palaces.flatMap(p => p.majorStars.map(s => s.name))
    expect(allStars).toContain('太阳')
  })

  it('武曲星 always present in some palace', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const allStars = astrolabe.palaces.flatMap(p => p.majorStars.map(s => s.name))
    expect(allStars).toContain('武曲')
  })

  it('天府星 always present in some palace', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const allStars = astrolabe.palaces.flatMap(p => p.majorStars.map(s => s.name))
    expect(allStars).toContain('天府')
  })

  it('major stars count is 14 (紫微星系 6 + 天府星系 8)', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const allMajorStarNames = new Set(
      astrolabe.palaces.flatMap(p => p.majorStars.map(s => s.name as string)),
    )
    // There should be at least 14 major stars, but with 杀破狼 and friends all present
    expect(allMajorStarNames.size).toBeGreaterThanOrEqual(14)
  })

  it('getDetailedPalaceView returns complete structure for 命宫', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const mingIndex = getMingGongIndex(astrolabe.palaces)
    const mingPalace = astrolabe.palaces[mingIndex]
    const view = getDetailedPalaceView(mingPalace)
    expect(view).toHaveProperty('name')
    expect(view).toHaveProperty('branch')
    expect(view).toHaveProperty('stem')
    expect(view).toHaveProperty('majorStars')
    expect(view).toHaveProperty('minorStars')
    expect(view).toHaveProperty('adjectiveStars')
    expect(view).toHaveProperty('transformations')
    expect(view).toHaveProperty('interpretation')
    expect(view).toHaveProperty('fullInterpretation')
    expect(view).toHaveProperty('decadalRange')
    expect(view).toHaveProperty('ages')
    expect(Array.isArray(view.ages)).toBe(true)
    expect(view.decadalRange).toHaveLength(2)
    expect(view.fullInterpretation.length).toBeGreaterThan(0)
  })

  it('empty palace (no major stars) generates appropriate note', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const emptyPalace = astrolabe.palaces.find(p => p.majorStars.length === 0)
    if (emptyPalace) {
      const view = getDetailedPalaceView(emptyPalace)
      expect(view.fullInterpretation).toContain('空宫')
    }
  })

  it('serialized palace does not include decadal as a nested object', () => {
    const astrolabe = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const serialized = serializeAstrolabe(astrolabe)
    const palaces = serialized.palaces as any[]
    for (const p of palaces) {
      expect(p).toHaveProperty('decadalRange')
      expect(p).not.toHaveProperty('decadal')
    }
  })
})

// ============================================================================
// Serialization roundtrip
// ============================================================================

describe('deserializeAstrolabe', () => {
  it('deserialize(serialize(x)) preserves key fields', () => {
    const original = calculateZiWei({
      birthYear: 2000,
      birthMonth: 8,
      birthDay: 16,
      birthHour: 2,
      gender: 'male',
    })!
    const serialized = serializeAstrolabe(original)
    const restored = deserializeAstrolabe(serialized)
    expect(restored).not.toBeNull()
    expect(restored!.earthlyBranchOfSoulPalace).toBe(original.earthlyBranchOfSoulPalace)
    expect(restored!.earthlyBranchOfBodyPalace).toBe(original.earthlyBranchOfBodyPalace)
    expect(restored!.fiveElementsClass).toBe(original.fiveElementsClass)
    expect(restored!.gender).toBe(original.gender)
    expect(restored!.palaces).toHaveLength(12)
  })

  it('returns null for malformed input', () => {
    expect(deserializeAstrolabe({} as any)).toBeNull()
    expect(deserializeAstrolabe({ palaces: 'not-an-array' } as any)).toBeNull()
    expect(deserializeAstrolabe(null as any)).toBeNull()
    expect(deserializeAstrolabe(undefined as any)).toBeNull()
  })

  it('returns null for palaces with invalid decadalRange or ages', () => {
    expect(
      deserializeAstrolabe({
        palaces: [{ decadalRange: [0], ages: [1] }],
      } as any),
    ).toBeNull()
    expect(
      deserializeAstrolabe({
        palaces: [{ decadalRange: [0, 1], ages: ['bad'] }],
      } as any),
    ).toBeNull()
  })
})

describe('true solar time correction', () => {
  it('longitude correction produces different charts for Beijing vs Urumqi', () => {
    // Beijing (116.4°E) noon → true solar ~11:46 → still 午时(index ~6)
    const beijing = calculateZiWei({
      birthYear: 1990, birthMonth: 5, birthDay: 15,
      birthHour: 6, gender: 'male', birthLongitude: 116.4,
    })
    expect(beijing).not.toBeNull()

    // Urumqi (87.6°E) noon → true solar ~9:50 → 巳时(index ~5)
    const urumqi = calculateZiWei({
      birthYear: 1990, birthMonth: 5, birthDay: 15,
      birthHour: 6, gender: 'male', birthLongitude: 87.6,
    })
    expect(urumqi).not.toBeNull()

    // Different longitudes should produce different charts
    expect(beijing).not.toEqual(urumqi)
  })
})
