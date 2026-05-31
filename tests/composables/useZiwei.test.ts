import { describe, it, expect } from 'vitest'
import { astro } from 'iztro'
import { calculateZiWei, getPalaceDetail, getMingGongIndex, getShenGongIndex, collectTransformations, serializeAstrolabe, type ZiWeiInput } from '~/composables/useZiwei'

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
      birthYear: 2000, birthMonth: 8, birthDay: 16,
      birthHour: 2, gender: 'male',
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
      birthYear: 2000, birthMonth: 8, birthDay: 16,
      birthHour: 2, gender: 'male',
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
      birthYear: 2000, birthMonth: 8, birthDay: 16,
      birthHour: 2, gender: 'male',
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
      birthYear: 2000, birthMonth: 8, birthDay: 16,
      birthHour: 2, gender: 'male',
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
      birthYear: 2000, birthMonth: 8, birthDay: 16,
      birthHour: 2, gender: 'male',
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
