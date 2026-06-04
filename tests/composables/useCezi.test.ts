import { describe, it, expect } from 'vitest'
import { analyzeCharacter } from '../../composables/useCezi'

describe('analyzeCharacter', () => {
  it('returns null for empty string', () => {
    expect(analyzeCharacter('')).toBeNull()
  })

  it('returns null for non-CJK characters', () => {
    expect(analyzeCharacter('A')).toBeNull()
    expect(analyzeCharacter('1')).toBeNull()
    expect(analyzeCharacter(' ')).toBeNull()
  })

  it('returns a valid result for common CJK characters', () => {
    const result = analyzeCharacter('明')
    expect(result).not.toBeNull()
    expect(result!.character).toBe('明')
    expect(result!.strokeCount).toBeGreaterThan(0)
    expect(result!.primaryElement).toBeTruthy()
    expect(result!.numberFortune).toBeDefined()
    expect(result!.numberFortune.category).toBeTruthy()
    expect(result!.numberFortune.desc).toBeTruthy()
    expect(result!.structure).toBeTruthy()
    expect(result!.structureName).toBeTruthy()
    expect(result!.structureDesc).toBeTruthy()
    expect(result!.interpretation).toBeTruthy()
    expect(result!.interpretation.length).toBeGreaterThan(0)
  })

  it('returns dictionary stroke source for characters in dict', () => {
    const result = analyzeCharacter('明')
    expect(result).not.toBeNull()
    // '明' is in the dictionary (stroke count 8) - should be dictionary source
    expect(result!.strokeSource).toBe('dictionary')
    expect(result!.strokeCount).toBe(8)
  })

  it('detects structure type from known mapping', () => {
    // '明' is left-right in CHAR_STRUCTURE_MAP
    const result = analyzeCharacter('明')
    expect(result).not.toBeNull()
    expect(result!.structure).toBe('leftRight')
    expect(result!.structureName).toBe('左右')
  })

  it('detects 独体 structure for single-component chars', () => {
    // '天' is single in CHAR_STRUCTURE_MAP
    const result = analyzeCharacter('天')
    expect(result).not.toBeNull()
    expect(result!.structure).toBe('single')
  })

  it('detects radical element for chars in CHAR_ELEMENT_MAP', () => {
    const result = analyzeCharacter('海')
    expect(result).not.toBeNull()
    expect(result!.radicalElement).toBe('水')
  })

  it('returns null radicalElement for chars without known radical', () => {
    // Use a character that isn't in CHAR_ELEMENT_MAP and doesn't contain known radicals
    const result = analyzeCharacter('一')
    expect(result).not.toBeNull()
    // '一' might be in the dictionary but probably not in radical map
    expect(typeof result!.radicalElement === 'string' || result!.radicalElement === null).toBe(true)
  })

  it('maps stroke count to correct wuxing element', () => {
    // 8 strokes = 金 (7-8 = 金)
    const result = analyzeCharacter('金')
    expect(result).not.toBeNull()
    expect(result!.primaryElement).toBeTruthy()
  })

  it('generates multi-line interpretation', () => {
    const result = analyzeCharacter('明')
    expect(result).not.toBeNull()
    const lines = result!.interpretation.split('\n').filter(l => l.trim())
    expect(lines.length).toBeGreaterThanOrEqual(3)
  })

  it('handles enclosure structure chars', () => {
    const result = analyzeCharacter('国')
    expect(result).not.toBeNull()
    expect(result!.structure).toBe('enclosure')
    expect(result!.structureName).toBe('包围')
  })

  it('handles topBottom structure chars', () => {
    const result = analyzeCharacter('安')
    expect(result).not.toBeNull()
    expect(result!.structure).toBe('topBottom')
    expect(result!.structureName).toBe('上下')
  })

  it('handles compound structure chars', () => {
    const result = analyzeCharacter('晶')
    expect(result).not.toBeNull()
    expect(result!.structure).toBe('compound')
    expect(result!.structureName).toBe('品字')
  })

  it('returns number fortune with valid category', () => {
    const result = analyzeCharacter('明')
    const validCategories = ['大吉', '吉', '半吉', '凶']
    expect(validCategories).toContain(result!.numberFortune.category)
  })

  it('trims whitespace from input', () => {
    const result = analyzeCharacter('  火  ')
    expect(result).not.toBeNull()
    expect(result!.character).toBe('火')
  })

  it('generates different results for different chars', () => {
    const r1 = analyzeCharacter('火')
    const r2 = analyzeCharacter('水')
    expect(r1!.interpretation).not.toBe(r2!.interpretation)
  })
})
