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
import { HEXAGRAM_NAMES, HEXAGRAM_JUDGMENTS, LINE_JUDGMENTS } from '../../constants/yijing'

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
    // Standard Zhouyi format: 九五 (yin/yang label before position label)
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hexQian)
    expect(lines[4].positionName).toBe('九五')
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

describe('non-palace hexagram Na Jia correctness', () => {
  // 天地否 (upper=乾=7, lower=坤=0) belongs to 乾宫 position 4
  // Lines 1-3 (lower/Kun): should use 坤 Na Jia inner = [乙未, 乙巳, 乙卯]
  // Lines 4-6 (upper/Qian): should use 乾 Na Jia outer = [壬午, 壬申, 壬戌]
  const values = [8, 8, 8, 7, 7, 7] // 天地否: 坤下乾上
  const hex = getHexagramInfo(values)

  it('天地否 lower trigram (坤) uses 坤 Na Jia inner', () => {
    const lines = getZhuangGuaLines(values, hex)
    // 坤 inner: 乙未, 乙巳, 乙卯
    expect(lines[0].naJiaDisplay).toBe('乙未')
    expect(lines[1].naJiaDisplay).toBe('乙巳')
    expect(lines[2].naJiaDisplay).toBe('乙卯')
  })

  it('天地否 upper trigram (乾) uses 乾 Na Jia outer', () => {
    const lines = getZhuangGuaLines(values, hex)
    // 乾 outer: 壬午, 壬申, 壬戌
    expect(lines[3].naJiaDisplay).toBe('壬午')
    expect(lines[4].naJiaDisplay).toBe('壬申')
    expect(lines[5].naJiaDisplay).toBe('壬戌')
  })

  it('天地否 six relations are correct for 乾宫金', () => {
    const lines = getZhuangGuaLines(values, hex)
    // 乙未(土) -> 土生金 -> 父母
    expect(lines[0].sixRelation).toBe('父母')
    // 乙巳(火) -> 火克金 -> 官鬼
    expect(lines[1].sixRelation).toBe('官鬼')
    // 乙卯(木) -> 金克木 -> 妻财
    expect(lines[2].sixRelation).toBe('妻财')
    // 壬午(火) -> 火克金 -> 官鬼
    expect(lines[3].sixRelation).toBe('官鬼')
    // 壬申(金) -> 同金 -> 兄弟
    expect(lines[4].sixRelation).toBe('兄弟')
    // 壬戌(土) -> 土生金 -> 父母
    expect(lines[5].sixRelation).toBe('父母')
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
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hex)
    const score = calculateYijingScore([7, 7, 7, 7, 7, 7], hex, lines)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('all-yang 乾为天 (no changing, 6 yang) has score 45', () => {
    // numChanging=0 => base=45
    // numYang=6 => balance = 3 - |6-3| = 0 => +0
    // name "乾为天" matches none of the adjustment patterns => +0
    // six-relations loop iterates only changing lines (none here)
    // shi/ying: no changing lines, so no adjustment
    // clamped => 45
    const hex = getHexagramInfo([7, 7, 7, 7, 7, 7])
    const lines = getZhuangGuaLines([7, 7, 7, 7, 7, 7], hex)
    const score = calculateYijingScore([7, 7, 7, 7, 7, 7], hex, lines)
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

describe('64-hexagram data integrity', () => {
  const testCases = Object.entries(HEXAGRAM_NAMES)

  it('all 64 hexagrams have non-empty names and judgments', () => {
    expect(testCases.length).toBe(64)
    for (const [key, name] of testCases) {
      expect(name.length).toBeGreaterThan(0)
      const judgment = HEXAGRAM_JUDGMENTS[key]
      expect(judgment?.length).toBeGreaterThan(0)
    }
  })

  it('all 384 line judgments (64x6) are non-empty', () => {
    let totalLines = 0
    for (const [, name] of testCases) {
      const lines = LINE_JUDGMENTS[name]
      expect(lines).toBeDefined()
      expect(lines).toHaveLength(6)
      for (const line of lines) {
        expect(line.length).toBeGreaterThan(0)
      }
      totalLines += lines.length
    }
    expect(totalLines).toBe(384)
  })
})

// ============================
// 11. castByNumbers edge inputs
// ============================

describe('castByNumbers with edge inputs', () => {
  it('handles negative numbers via Math.abs before modulo', () => {
    // Math.abs(-3)=3 (-> 离), Math.abs(-5)=5 (-> 巽), moving=4
    const result = castByNumbers(-3, -5, 4)
    expect(result.values).toHaveLength(6)
    expect(result.changingLine).toBe(4)
    // 离上巽下 with line 4 changing -> 火风鼎
    const hex = getHexagramInfo(result.values)
    expect(hex.name).toBe('火风鼎')
  })

  it('maps zero moving number to position 6 via mod-6 logic', () => {
    // Math.round(Math.abs(0)) % 6 || 6 => 0 || 6 => 6 (上爻)
    const result = castByNumbers(1, 8, 0)
    expect(result.changingLine).toBe(6)
    // 乾上坤下 (天地否), line 6 (上爻) changing => top yang becomes 老阳(9)
    expect(result.values).toEqual([8, 8, 8, 7, 7, 9])
    const hex = getHexagramInfo(result.values)
    expect(hex.name).toBe('天地否')
  })
})

// ============================
// 12. calculateYijingScore via computeYijingResult
// ============================

describe('calculateYijingScore ranges and edge cases', () => {
  it('returns known score 45 for 乾为天 (no changing, all yang)', () => {
    // numChanging=0 => base=45, numYang=6 => balance=0, no name pattern => 45
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    expect(result.score).toBe(45)
  })

  it('returns scores in valid 0-100 range for diverse changing patterns', () => {
    const testCases = [
      [9, 8, 8, 8, 8, 8], // 1 changing
      [6, 7, 8, 9, 7, 8], // 2 changing
      [6, 9, 6, 8, 8, 8], // 3 changing
      [6, 9, 6, 8, 9, 8], // 4 changing
      [6, 9, 6, 8, 9, 6], // 5 changing
      [6, 9, 6, 9, 9, 6], // 6 changing
    ]
    testCases.forEach(values => {
      const result = computeYijingResult(values)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  it('applies hexagram name bonus for 泰', () => {
    // 地天泰: 乾下坤上 => yinYang [1,1,1,0,0,0] => values [7,7,7,8,8,8]
    const result = computeYijingResult([7, 7, 7, 8, 8, 8])
    expect(result.hexagram.name).toBe('地天泰')
    // numChanging=0 => base=45, numYang=3 => balance=3 => +15, '泰' => +10 => 70
    expect(result.score).toBe(70)
  })
})

// ============================
// 13. generateInterpretation content
// ============================

describe('generateInterpretation structure', () => {
  it('contains hexagram nature description with name', () => {
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    expect(result.interpretation).toContain('乾')
  })

  it('mentions changing lines when present', () => {
    const result = computeYijingResult([6, 8, 8, 8, 8, 8])
    expect(result.interpretation).toContain('动')
  })

  it('includes palace and wuxing info', () => {
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    expect(result.interpretation).toContain('乾宫')
    expect(result.interpretation).toContain('金')
  })

  // ============================================================================
  // L18b: Inline snapshot tests for Yijing interpretation text
  // ============================================================================

  it('乾为天 interpretation matches snapshot', () => {
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    expect(result.interpretation).toMatchInlineSnapshot(`
      "本次占得「乾为天」。
      上卦为天（乾），刚健不息，自强自立；下卦为天（乾），刚健不息，自强自立。
      此卦属乾宫（五行金），为本宫卦，此为本宫的核心卦象，代表该宫最本质的特质。

      ▎卦辞
      乾，元亨利贞。

      ▎爻动分析
      此卦静而不动，六爻无变。宜静守待时，以不变应万变。所问之事尚无明确变数，宜保持现状，观察事态发展。

      ▎世应关系
      「世」为自己（在上爻，上爻代表过往和远因），「应」为对方或外部环境（在三爻）。
      世应相对，表里相应，有参照或合作关系。

      ▎综合建议
      卦象评分 45 分，势态平缓。
      吉凶参半，宜审时度势，不可冒进亦不宜退缩。此卦多需耐心与等待，静观其变，待机而动。
      行动建议：保持现状，稳健推进。对重要决策可多征询意见，不宜独断专行。待时机明朗后再做定夺。"
    `)
  })

  it('坤为地 interpretation matches snapshot', () => {
    const result = computeYijingResult([8, 8, 8, 8, 8, 8])
    expect(result.interpretation).toMatchInlineSnapshot(`
      "本次占得「坤为地」。
      上卦为地（坤），柔顺包容，厚德载物；下卦为地（坤），柔顺包容，厚德载物。
      此卦属坤宫（五行土），为本宫卦，此为本宫的核心卦象，代表该宫最本质的特质。

      ▎卦辞
      坤，元亨，利牝马之贞。君子有攸往，先迷后得主，利西南得朋，东北丧朋。安贞吉。

      ▎爻动分析
      此卦静而不动，六爻无变。宜静守待时，以不变应万变。所问之事尚无明确变数，宜保持现状，观察事态发展。

      ▎世应关系
      「世」为自己（在上爻，上爻代表过往和远因），「应」为对方或外部环境（在三爻）。
      世应相对，表里相应，有参照或合作关系。

      ▎综合建议
      卦象评分 45 分，势态平缓。
      吉凶参半，宜审时度势，不可冒进亦不宜退缩。此卦多需耐心与等待，静观其变，待机而动。
      行动建议：保持现状，稳健推进。对重要决策可多征询意见，不宜独断专行。待时机明朗后再做定夺。"
    `)
  })

  it('地天泰 interpretation matches snapshot', () => {
    const result = computeYijingResult([7, 7, 7, 8, 8, 8])
    expect(result.interpretation).toMatchInlineSnapshot(`
      "本次占得「地天泰」。
      上卦为地（坤），柔顺包容，厚德载物；下卦为天（乾），刚健不息，自强自立。
      此卦属坤宫（五行土），为三世卦，三爻皆变，格局初步成型，已到关键转折。

      ▎卦辞
      泰，小往大来，吉亨。

      ▎爻动分析
      此卦静而不动，六爻无变。宜静守待时，以不变应万变。所问之事尚无明确变数，宜保持现状，观察事态发展。

      ▎世应关系
      「世」为自己（在三爻，三爻代表家庭和内部事务），「应」为对方或外部环境（在上爻）。
      世应相对，表里相应，有参照或合作关系。

      ▎综合建议
      卦象评分 70 分，整体吉顺。
      所求之事多有可为，天地人三才相合，宜顺势而为，积极进取。
      行动建议：把握时机，果断行动。可主动推进计划，机遇多于挑战。注意善待身边贵人，他日或有助益。"
    `)
  })

  it('天地否 interpretation matches snapshot', () => {
    const result = computeYijingResult([8, 8, 8, 7, 7, 7])
    expect(result.interpretation).toMatchInlineSnapshot(`
      "本次占得「天地否」。
      上卦为天（乾），刚健不息，自强自立；下卦为地（坤），柔顺包容，厚德载物。
      此卦属乾宫（五行金），为三世卦，三爻皆变，格局初步成型，已到关键转折。

      ▎卦辞
      否之匪人，不利君子贞，大往小来。

      ▎爻动分析
      此卦静而不动，六爻无变。宜静守待时，以不变应万变。所问之事尚无明确变数，宜保持现状，观察事态发展。

      ▎世应关系
      「世」为自己（在三爻，三爻代表家庭和内部事务），「应」为对方或外部环境（在上爻）。
      世应相对，表里相应，有参照或合作关系。

      ▎综合建议
      卦象评分 52 分，势态平缓。
      吉凶参半，宜审时度势，不可冒进亦不宜退缩。此卦多需耐心与等待，静观其变，待机而动。
      行动建议：保持现状，稳健推进。对重要决策可多征询意见，不宜独断专行。待时机明朗后再做定夺。"
    `)
  })

  it('interpretation with changing line matches snapshot', () => {
    const result = computeYijingResult([6, 7, 7, 7, 7, 7], 0 /* dayStemIndex=甲→青龙 */)
    expect(result.interpretation).toMatchInlineSnapshot(`
      "本次占得「天风姤」。
      上卦为天（乾），刚健不息，自强自立；下卦为风（巽），顺入谦逊，灵活变通。
      此卦属乾宫（五行金），为一世卦，初爻已变，事情尚在萌芽阶段，变数初现。

      ▎卦辞
      姤，女壮，勿用取女。

      ▎爻动分析
      一爻独发，事有专主之象。此爻为核心变机，需重点关注其爻辞提示。

      发动之爻：
      初六（父母·青龙）：系于金柅，贞吉。有攸往，见凶。羸豕孚蹢躅

      ▎世应关系
      「世」为自己（在初爻，初爻为事情的开端，代表此事尚在初始阶段），「应」为对方或外部环境（在四爻）。
      世应相对，表里相应，有参照或合作关系。

      ▎六亲动向
      父母发动：主文书、契约、长辈之事。若为考试、签约之事，得父母爻动为吉

      ▎神煞提示
      青龙为东方青木，主喜庆之事。青龙临动，预示喜事将至、贵人相助

      ▎综合建议
      卦象评分 57 分，势态平缓。
      吉凶参半，宜审时度势，不可冒进亦不宜退缩。此卦多需耐心与等待，静观其变，待机而动。
      行动建议：保持现状，稳健推进。对重要决策可多征询意见，不宜独断专行。待时机明朗后再做定夺。"
    `)
  })
})

// ============================
// 14. Six spirits assignment
// ============================

describe('six spirits assignment', () => {
  it('returns valid spirit names for all lines', () => {
    const VALID_SPIRITS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    result.lines.forEach(line => {
      expect(VALID_SPIRITS).toContain(line.sixSpirit)
    })
  })

  it('assigns six distinct spirits in cyclic order', () => {
    const result = computeYijingResult([7, 7, 7, 7, 7, 7])
    expect(result.lines).toHaveLength(6)
    const spirits = result.lines.map(l => l.sixSpirit)
    expect(new Set(spirits).size).toBe(6)
  })
})

// ============================
// 15. Derived hexagram zhuang gua
// ============================

describe('derived hexagram zhuang gua', () => {
  it('produces valid derived lines with all fields', () => {
    const result = computeYijingResult([6, 8, 8, 8, 8, 9])
    expect(result.derivedLines).not.toBeNull()
    expect(result.derivedLines).toHaveLength(6)
    result.derivedLines!.forEach(line => {
      expect(line.position).toBeGreaterThanOrEqual(1)
      expect(line.position).toBeLessThanOrEqual(6)
      expect(line.sixRelation.length).toBeGreaterThan(0)
      expect(line.sixSpirit.length).toBeGreaterThan(0)
      expect(line.naJiaDisplay.length).toBeGreaterThan(0)
      expect(line.positionName).toBeTruthy()
    })
  })

  it('derived hexagram is non-null when changing lines exist', () => {
    const result = computeYijingResult([7, 7, 7, 7, 7, 9])
    expect(result.derivedHexagram).not.toBeNull()
    expect(result.derivedHexagram!.name.length).toBeGreaterThan(0)
  })
})

// ============================
// 16. Diverse hexagram combinations
// ============================

describe('diverse hexagram combinations', () => {
  it('supports diverse inputs without throwing', () => {
    const testCases = [
      [7, 7, 7, 7, 7, 7], // 乾为天
      [8, 8, 8, 8, 8, 8], // 坤为地
      [9, 8, 7, 8, 7, 8], // mixed changing
      [6, 7, 8, 9, 7, 8], // multiple changing
      [6, 6, 6, 6, 6, 6], // all old yin
      [9, 9, 9, 9, 9, 9], // all old yang
    ]
    testCases.forEach(values => {
      const result = computeYijingResult(values)
      expect(result.hexagram.name).toBeTruthy()
      expect(result.hexagram.judgment).toBeTruthy()
      expect(result.lines).toHaveLength(6)
      expect(typeof result.interpretation).toBe('string')
      expect(result.interpretation.length).toBeGreaterThan(0)
    })
  })
})

// ============================
// 17. 归魂卦 (Returning Soul Hexagram)
// ============================

describe('归魂卦 (Returning Soul Hexagram)', () => {
  it('火天大有 (离上乾下) is 乾宫归魂卦 with palacePosition = 8', () => {
    // 归魂卦: position 8 in a palace. For 乾宫:
    // upper=离(1,0,1), lower=乾(1,1,1) → yinYang [1,1,1, 1,0,1] → values [7,7,7,7,8,7]
    const hex = getHexagramInfo([7, 7, 7, 7, 8, 7])
    expect(hex.name).toBe('火天大有')
    expect(hex.palaceName).toBe('乾宫')
    expect(hex.palacePosition).toBe(8)
    // Position 8 (归魂): 世在三爻, 应在六爻
    expect(hex.shiPosition).toBe(3)
    expect(hex.yingPosition).toBe(6)
  })

  it('雷泽归妹 (震上兑下) is 兑宫归魂卦 with palacePosition = 8', () => {
    // 兑宫(P=3), position 8: upper=u4, lower=l1
    // P=3(011), l1=3, u4=flipBit(flipBit(flipBit(3,0),1),0)
    // l2=flipBit(3,0)=2, l3=flipBit(2,1)=0, l4=flipBit(0,2)=4
    // u2=2, u3=0, u4=flipBit(0,0)=1
    // Upper=1(震=001), Lower=3(兑=011)
    // yinYang upper: [1,0,0], lower: [1,1,0] → [1,1,0, 1,0,0] → [7,7,8,7,8,8]
    const hex = getHexagramInfo([7, 7, 8, 7, 8, 8])
    expect(hex.name).toBe('雷泽归妹')
    expect(hex.palaceName).toBe('兑宫')
    expect(hex.palacePosition).toBe(8)
    expect(hex.shiPosition).toBe(3)
    expect(hex.yingPosition).toBe(6)
  })

  it('归魂卦 with changing lines produces valid derived hexagram', () => {
    // 火天大有 with line 3 changing (7→9): values [7,7,9,7,8,7]
    const result = computeYijingResult([7, 7, 9, 7, 8, 7])
    expect(result.hexagram.name).toBe('火天大有')
    expect(result.hexagram.palacePosition).toBe(8)
    // Derived hexagram should be valid
    expect(result.derivedHexagram).not.toBeNull()
    expect(result.derivedLines).toHaveLength(6)
    if (result.derivedHexagram) {
      expect(result.derivedHexagram.name).toBeTruthy()
      expect(result.derivedHexagram.judgment).toBeTruthy()
    }
  })
})

// ============================
// 18. Six spirits SSR guard
// ============================

describe('six spirits consistency', () => {
  it('all six spirits are assigned in cyclic order regardless of current day stem', () => {
    const VALID_SPIRITS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']
    // Test across multiple runs to verify stability
    for (let i = 0; i < 10; i++) {
      const values: number[] = []
      for (let j = 0; j < 6; j++) {
        values.push(Math.random() < 0.5 ? 7 : 8)
      }
      const result = computeYijingResult(values)
      expect(result.lines).toHaveLength(6)
      for (const line of result.lines) {
        expect(VALID_SPIRITS).toContain(line.sixSpirit)
      }
      // All 6 spirits are distinct in cyclic order
      const spirits = result.lines.map(l => l.sixSpirit)
      expect(new Set(spirits).size).toBe(6)
    }
  })
})
