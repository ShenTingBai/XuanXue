import { describe, it, expect } from 'vitest'
import { astro } from 'iztro'
import { calculateZiWei, getPalaceDetail, getMingGongIndex, type ZiWeiInput } from '~/composables/useZiwei'

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
