import { describe, it, expect } from 'vitest'
import { astro } from 'iztro'

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
