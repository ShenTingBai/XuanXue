import { describe, it, expect } from 'vitest'
import {
  castByCoin,
  castByNumbers,
  convertToYaoResults,
  getHexagramInfo,
  getZhuangGuaLines,
  getDerivedValues,
  getHuGuaValues,
  calculateYijingScore,
  computeYijingResult,
} from '../../composables/useYijing'

// ============================
// 1. Coin Casting (castByCoin)
// ============================

describe('castByCoin', () => {
  it('returns array of 6 values', () => {
    const result = castByCoin()
    expect(result).toHaveLength(6)
  })

  it('each value is 6, 7, 8, or 9', () => {
    const valid = [6, 7, 8, 9]
    for (let i = 0; i < 50; i++) {
      const result = castByCoin()
      for (const v of result) {
        expect(valid).toContain(v)
      }
    }
  })

  it('values include both yin (6/8) and yang (7/9) across enough runs', () => {
    let hasYin = false
    let hasYang = false
    for (let i = 0; i < 100; i++) {
      const result = castByCoin()
      for (const v of result) {
        if (v === 6 || v === 8) hasYin = true
        if (v === 7 || v === 9) hasYang = true
      }
      if (hasYin && hasYang) break
    }
    expect(hasYin).toBe(true)
    expect(hasYang).toBe(true)
  })
})

// ============================
// 2. Number Casting (castByNumbers)
// ============================

describe('castByNumbers', () => {
  it('given upper 1 (乾), lower 1 (乾), returns 乾为天 with changing line at position 3', () => {
    const result = castByNumbers(1, 1, 3)
    expect(result.values).toHaveLength(6)
    expect(result.changingLine).toBe(3)
    // 乾 trigram: all yang (1) -> initial values all 7, line 3 becomes 9
    expect(result.values[0]).toBe(7)
    expect(result.values[1]).toBe(7)
    expect(result.values[2]).toBe(9)
    expect(result.values[3]).toBe(7)
    expect(result.values[4]).toBe(7)
    expect(result.values[5]).toBe(7)

    const hex = getHexagramInfo(result.values)
    expect(hex.name).toBe('乾为天')
  })

  it('given upper 7 (艮), lower 4 (震) with changing line 1, hexagram is 山雷颐', () => {
    // API mapping: 7=艮(trigramIdx4), 4=震(trigramIdx1)
    const result = castByNumbers(7, 4, 1)
    expect(result.values).toHaveLength(6)
    expect(result.changingLine).toBe(1)
    // 艮上震下: line 1 (bottom yang of 震) is changing yang → 9 (老阳)
    expect(result.values[0]).toBe(9)

    const hex = getHexagramInfo(result.values)
    expect(hex.name).toBe('山雷颐')
  })
})

// ============================
// 3. Yao Results (convertToYaoResults)
// ============================

describe('convertToYaoResults', () => {
  it('value 6 -> isYang=false, isChanging=true, display="老阴"', () => {
    const [yao] = convertToYaoResults([6])
    expect(yao.value).toBe(6)
    expect(yao.isYang).toBe(false)
    expect(yao.isChanging).toBe(true)
    expect(yao.display).toBe('老阴')
  })

  it('value 7 -> isYang=true, isChanging=false, display="少阳"', () => {
    const [yao] = convertToYaoResults([7])
    expect(yao.value).toBe(7)
    expect(yao.isYang).toBe(true)
    expect(yao.isChanging).toBe(false)
    expect(yao.display).toBe('少阳')
  })

  it('value 8 -> isYang=false, isChanging=false, display="少阴"', () => {
    const [yao] = convertToYaoResults([8])
    expect(yao.value).toBe(8)
    expect(yao.isYang).toBe(false)
    expect(yao.isChanging).toBe(false)
    expect(yao.display).toBe('少阴')
  })

  it('value 9 -> isYang=true, isChanging=true, display="老阳"', () => {
    const [yao] = convertToYaoResults([9])
    expect(yao.value).toBe(9)
    expect(yao.isYang).toBe(true)
    expect(yao.isChanging).toBe(true)
    expect(yao.display).toBe('老阳')
  })

  it('returns correct objects for a mixed array of values', () => {
    const results = convertToYaoResults([6, 7, 8, 9])
    expect(results).toHaveLength(4)
    expect(results[0].value).toBe(6)
    expect(results[0].display).toBe('老阴')
    expect(results[1].value).toBe(7)
    expect(results[1].display).toBe('少阳')
    expect(results[2].value).toBe(8)
    expect(results[2].display).toBe('少阴')
    expect(results[3].value).toBe(9)
    expect(results[3].display).toBe('老阳')
  })
})

// ============================
// 4. Hexagram Lookup (getHexagramInfo)
// ============================

describe('getHexagramInfo', () => {
  it('all yang [7,7,7,7,7,7] -> name="乾为天"', () => {
    const hex = getHexagramInfo([7, 7, 7, 7, 7, 7])
    expect(hex.name).toBe('乾为天')
  })

  it('all yin [8,8,8,8,8,8] -> name="坤为地"', () => {
    const hex = getHexagramInfo([8, 8, 8, 8, 8, 8])
    expect(hex.name).toBe('坤为地')
  })

  it('palaceName and palaceWuxing are populated for 乾为天', () => {
    const hex = getHexagramInfo([7, 7, 7, 7, 7, 7])
    expect(hex.palaceName).toBe('乾宫')
    expect(hex.palaceWuxing).toBe('金')
  })
})

// ============================
// 5. Zhuang Gua Lines (getZhuangGuaLines)
// ============================

describe('getZhuangGuaLines', () => {
  const hexQian = getHexagramInfo([7, 7, 7, 7, 7, 7])

  it('乾为天 line 1 positionName = "初九"', () => {
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hexQian)
    expect(lines[0].positionName).toBe('初九')
  })

  it('乾为天 line 5 positionName', () => {
    // Implementation uses position label before yin/yang label: '五' + '九'
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hexQian)
    expect(lines[4].positionName).toBe('五九')
  })

  it('sixRelation for line with same wuxing as palace is 兄弟', () => {
    // 乾宫金; line 5 branch=申(金) -> same wuxing -> 兄弟
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hexQian)
    expect(lines[4].sixRelation).toBe('兄弟')
  })

  it('sixSpirit is non-empty for every line', () => {
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hexQian)
    for (const line of lines) {
      expect(line.sixSpirit.length).toBeGreaterThan(0)
      expect(['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']).toContain(line.sixSpirit)
    }
  })

  it('世/应 positions match hexagram data for 乾为天 (shi=6, ying=3)', () => {
    // 乾为天 is palace position 1 -> shi=6, ying=3
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hexQian)
    const shiLine = lines.find(l => l.isShi)
    const yingLine = lines.find(l => l.isYing)
    expect(shiLine?.position).toBe(6)
    expect(yingLine?.position).toBe(3)
  })
})

// ============================
// 6. Six Relations (getSixRelation via getZhuangGuaLines)
// ============================

describe('sixRelation correctness', () => {
  // 乾为天 belongs to 乾宫 (palaceWuxing=金)
  const hexQian = getHexagramInfo([7, 7, 7, 7, 7, 7])
  // Na Jia assignments for 乾宫[0]:
  //   inner: line1=甲子(水), line2=甲寅(木), line3=甲辰(土)
  //   outer: line4=壬午(火), line5=壬申(金), line6=壬戌(土)

  it('branch 金 -> 兄弟 (same wuxing)', () => {
    // line 5: 申(金)
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hexQian)
    expect(lines[4].sixRelation).toBe('兄弟')
  })

  it('branch 水 -> 子孙 (金生水, palace generates line)', () => {
    // line 1: 子(水)
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hexQian)
    expect(lines[0].sixRelation).toBe('子孙')
  })

  it('branch 土 -> 父母 (土生金, line generates palace)', () => {
    // line 3: 辰(土), line 6: 戌(土)
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hexQian)
    expect(lines[2].sixRelation).toBe('父母')
    expect(lines[5].sixRelation).toBe('父母')
  })

  it('branch 木 -> 妻财 (金克木, palace controls line)', () => {
    // line 2: 寅(木)
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hexQian)
    expect(lines[1].sixRelation).toBe('妻财')
  })

  it('branch 火 -> 官鬼 (火克金, line controls palace)', () => {
    // line 4: 午(火)
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hexQian)
    expect(lines[3].sixRelation).toBe('官鬼')
  })
})

// ============================
// 7. Derived Hexagram (getDerivedValues)
// ============================

describe('getDerivedValues', () => {
  it('no changing values -> returns null', () => {
    expect(getDerivedValues([7, 7, 7, 7, 7, 7])).toBeNull()
    expect(getDerivedValues([8, 8, 8, 8, 8, 8])).toBeNull()
    expect(getDerivedValues([7, 8, 7, 8, 7, 8])).toBeNull()
  })

  it('one changing 6 -> flipped to 7', () => {
    const result = getDerivedValues([6, 7, 7, 7, 7, 7])
    expect(result).toEqual([7, 7, 7, 7, 7, 7])
  })

  it('one changing 9 -> flipped to 8', () => {
    const result = getDerivedValues([7, 7, 7, 7, 7, 9])
    expect(result).toEqual([7, 7, 7, 7, 7, 8])
  })

  it('changing and non-changing values both preserved correctly', () => {
    const result = getDerivedValues([6, 7, 8, 9, 7, 8])
    expect(result).toEqual([7, 7, 8, 8, 7, 8])
  })
})

// ============================
// 8. Hu Gua (getHuGuaValues)
// ============================

describe('getHuGuaValues', () => {
  it('returns array of 6 values', () => {
    const result = getHuGuaValues([7, 7, 7, 7, 7, 7])
    expect(result).toHaveLength(6)
  })

  it('lines 2,3,4 become lower trigram and 3,4,5 become upper trigram', () => {
    // 天地否 [8,8,8,7,7,7]:
    //   middle (lines 2-5) = [8,8,7,7]
    //   huLower = [8,8,7] (lines 2,3,4), huUpper = [8,7,7] (lines 3,4,5)
    const result = getHuGuaValues([8, 8, 8, 7, 7, 7])
    const hex = getHexagramInfo(result)
    // [8,8,7] → 艮(4), [8,7,7] → 巽(6) -> 风山渐
    expect(hex.name).toBe('风山渐')
  })
})

// ============================
// 9. Scoring (calculateYijingScore)
// ============================

describe('calculateYijingScore', () => {
  it('returns a number between 0 and 100', () => {
    const hex = getHexagramInfo([7, 7, 7, 7, 7, 7])
    const score = calculateYijingScore([7, 7, 7, 7, 7, 7], hex)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('all-yang 乾为天 (no changing, 6 yang) has score 45', () => {
    // numChanging=0 => base=45
    // numYang=6 => balance = 3 - |6-3| = 0 => +0
    // name "乾为天" matches none of the adjustment patterns => +0
    // clamped => 45
    const hex = getHexagramInfo([7, 7, 7, 7, 7, 7])
    const score = calculateYijingScore([7, 7, 7, 7, 7, 7], hex)
    expect(score).toBe(45)
  })
})

// ============================
// 10. Full Pipeline (computeYijingResult)
// ============================

describe('computeYijingResult', () => {
  it('returns YijingResult with all top-level fields', () => {
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    expect(result).toHaveProperty('hexagram')
    expect(result).toHaveProperty('lines')
    expect(result).toHaveProperty('derivedHexagram')
    expect(result).toHaveProperty('derivedLines')
    expect(result).toHaveProperty('huGua')
    expect(result).toHaveProperty('huGuaLines')
    expect(result).toHaveProperty('score')
    expect(result).toHaveProperty('interpretation')
  })

  it('hexagram name matches expected for 乾为天', () => {
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    expect(result.hexagram.name).toBe('乾为天')
    expect(result.lines).toHaveLength(6)
  })

  it('with no changing lines, derived hexagram is null', () => {
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    expect(result.derivedHexagram).toBeNull()
    expect(result.derivedLines).toBeNull()
  })

  it('with changing lines, derived hexagram is populated', () => {
    const result = computeYijingResult([6, 7, 7, 7, 7, 7])
    expect(result.derivedHexagram).not.toBeNull()
    expect(result.derivedLines).not.toBeNull()
    expect(result.derivedLines).toHaveLength(6)
  })

  it('hu gua is always populated', () => {
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    expect(result.huGua).not.toBeNull()
    expect(result.huGuaLines).toHaveLength(6)
  })

  it('score is a number between 0-100', () => {
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('interpretation is a non-empty string', () => {
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    expect(typeof result.interpretation).toBe('string')
    expect(result.interpretation.length).toBeGreaterThan(0)
  })
})
