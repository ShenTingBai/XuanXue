// ============================================================
// useYijing.ts — 六爻 (Yijing / Zhouyi) Calculation Engine
// ============================================================
// Handles coin/number casting, hexagram lookup, palace system,
// Na Jia line attributes (六亲, 六神, 世应), scoring, and
// interpretation template generation.
//
// Known limitations (documented per CLAUDE.md conventions):
// - Day stem for 六神 (Six Spirits) uses current date via a
//   simplified formula, not the canonical astronomical calendar.
// - Line judgments (爻辞) are provided for all 64 hexagrams.
// ============================================================

import {
  TRIGRAM_NAMES, TRIGRAM_WUXING, PALACE_NAMES, PALACE_WUXING,
  TRIGRAM_TO_PALACE, SHI_POSITIONS, BRANCH_WUXING,
  HEXAGRAM_NAMES, HEXAGRAM_JUDGMENTS,
  NA_JIA_INNER, NA_JIA_OUTER,
  getSixRelation, SIX_SPIRITS, STEM_GROUPS,
  LINE_JUDGMENTS,
} from '~/constants/yijing'

// ============================
// Types
// ============================

export interface YaoResult {
  value: number      // 6 (老阴), 7 (少阳), 8 (少阴), 9 (老阳)
  isYang: boolean
  isChanging: boolean
  display: '老阴' | '少阳' | '少阴' | '老阳'
}

export interface ZhuangGuaLine {
  position: number       // 1 (bottom) … 6 (top)
  positionName: string   // 初/二/三/四/五/上 ＋ 九/六
  yao: YaoResult
  naJiaStem: string
  naJiaBranch: string
  naJiaDisplay: string
  branchWuxing: string
  sixRelation: string
  sixSpirit: string
  isShi: boolean
  isYing: boolean
  judgment: string
}

export interface HexagramInfo {
  name: string
  judgment: string
  palaceName: string
  palaceIndex: number      // 0-7  乾兑离震巽坎艮坤
  palacePosition: number   // 1-8  within palace
  palaceWuxing: string
  shiPosition: number
  yingPosition: number
  yaoValues: number[]      // 6 numbers [6|7|8|9]
  binary: string           // 6-char '0'/'1', bit 0 = line 1
}

export interface YijingResult {
  hexagram: HexagramInfo
  lines: ZhuangGuaLine[]
  derivedHexagram: HexagramInfo | null
  derivedLines: ZhuangGuaLine[] | null
  huGua: HexagramInfo | null
  huGuaLines: ZhuangGuaLine[] | null
  score: number
  interpretation: string
}

// ============================
// Day stem & Six Spirits helpers
// ============================

/** Compute a pseudo day stem index for 六神 assignment. */
function getDayStemIndex(): number {
  if (!import.meta.client) return 0  // SSR: return default
  const d = new Date()
  // Simplified: fixed offset from a known reference (2000-01-01 was a Saturday,
  // approximate stem index). For yi-jing divination this is decorative — exact
  // astronomical day-stem requires a full sexagenary calendar lookup.
  const ref = new Date(2000, 0, 1) // 2000-01-01 approximate stem=0
  const diff = Math.floor((d.getTime() - ref.getTime()) / 86400000)
  return ((diff % 10) + 10) % 10
}

const STEM_NAMES = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

function getSixSpirits(startStemIndex: number): string[] {
  const startIdx = STEM_GROUPS[STEM_NAMES[startStemIndex]] ?? 0
  return Array.from({ length: 6 }, (_, i) => SIX_SPIRITS[(startIdx + i) % 6])
}


// ============================
// Utility
// ============================

function flipBit(v: number, bit: number): number {
  return v ^ (1 << bit)
}

function trigramFromLines(lines: number[]): number {
  // lines = [line1, line2, line3] where 1=yang, 0=yin
  return (lines[2] << 2) | (lines[1] << 1) | lines[0]
}

function linesFromValue(v: number): number[] {
  return [(v >> 2) & 1, (v >> 1) & 1, v & 1]
}

function binaryFromYaoValues(values: number[]): string {
  return values.map(v => (v === 7 || v === 9) ? '1' : '0').join('')
}

// ============================
// Palace generation
// ============================

interface PalaceHexagram {
  upper: number   // trigram index 0-7
  lower: number
}

function getPalaceHexagrams(paletteTrigram: number): PalaceHexagram[] {
  const P = paletteTrigram
  const l1 = P
  const l2 = flipBit(P, 0)
  const l3 = flipBit(l2, 1)
  const l4 = flipBit(l3, 2) // COMP(P)
  const u2 = flipBit(P, 0)
  const u3 = flipBit(u2, 1)
  const u4 = flipBit(u3, 0) // flip_bit1(P)

  return [
    { upper: P, lower: l1 },
    { upper: P, lower: l2 },
    { upper: P, lower: l3 },
    { upper: P, lower: l4 },
    { upper: u2, lower: l4 },
    { upper: u3, lower: l4 },
    { upper: u4, lower: l4 },
    { upper: u4, lower: l1 },
  ]
}

/** Build a reverse lookup map: (upperIdx_lowerIdx) -> { palaceIndex, palacePosition } */
function buildPalaceLookup(): Record<string, { palaceIndex: number; palacePosition: number }> {
  const map: Record<string, { palaceIndex: number; palacePosition: number }> = {}
  for (let pi = 0; pi < 8; pi++) {
    const trigramIdx = [7, 3, 5, 1, 6, 2, 4, 0][pi] // palace index -> trigram
    const hexagrams = getPalaceHexagrams(trigramIdx)
    hexagrams.forEach((h, pos) => {
      const key = `${h.upper}_${h.lower}`
      map[key] = { palaceIndex: pi, palacePosition: pos + 1 }
    })
  }
  return map
}

const PALACE_LOOKUP = buildPalaceLookup()

// ============================
// Public Functions
// ============================

/** Cast by tossing 3 coins 6 times. Returns [line1_value, ..., line6_value]. */
export function castByCoin(): number[] {
  const values: number[] = []
  for (let i = 0; i < 6; i++) {
    let total = 0
    for (let j = 0; j < 3; j++) {
      total += Math.random() < 0.5 ? 2 : 3
    }
    values.push(total)
  }
  // Line 1 = first toss (bottom)
  return values
}

/**
 * Cast by numbers.
 * @param upperNum  1-8  -> upper trigram (1=乾, 2=兑, 3=离, 4=震, 5=巽, 6=坎, 7=艮, 8=坤)
 * @param lowerNum  1-8  -> lower trigram
 * @param movingNum 1-6  -> changing line position
 */
export function castByNumbers(upperNum: number, lowerNum: number, movingNum: number): { values: number[]; changingLine: number } {
  // Map 1-8 to trigram indices (8=坤=0, 7=艮=4, 6=坎=2, 5=巽=6, 4=震=1, 3=离=5, 2=兑=3, 1=乾=7)
  // Apply Math.abs() before modulo per spec: negative numbers use absolute value
  const numToTrigram = [7, 3, 5, 1, 6, 2, 4, 0]
  const upperIdx = numToTrigram[((Math.abs(upperNum) - 1) % 8 + 8) % 8]
  const lowerIdx = numToTrigram[((Math.abs(lowerNum) - 1) % 8 + 8) % 8]
  const changeLine = Math.round(Math.abs(movingNum)) % 6 || 6

  // Convert trigrams to 3-bit values (bit0=bottom of trigram)
  const uLines = linesFromValue(upperIdx)
  const lLines = linesFromValue(lowerIdx)

  // Combine into 6 lines [line1..line6]
  const yinYang: number[] = [lLines[2], lLines[1], lLines[0], uLines[2], uLines[1], uLines[0]]

  // Convert to yao values: yang(1)=7, yin(0)=8
  const values = yinYang.map((v, i) => {
    if (i + 1 === changeLine) {
      return v === 1 ? 9 : 6 // changing
    }
    return v === 1 ? 7 : 8
  })

  return { values, changingLine: changeLine }
}

/** Convert raw values (6|7|8|9) to YaoResult objects. */
export function convertToYaoResults(values: number[]): YaoResult[] {
  return values.map(v => ({
    value: v,
    isYang: v === 7 || v === 9,
    isChanging: v === 6 || v === 9,
    display: v === 6 ? '老阴' : v === 7 ? '少阳' : v === 8 ? '少阴' : '老阳',
  }))
}

/** Look up hexagram info from 6 yao values. */
export function getHexagramInfo(values: number[]): HexagramInfo {
  const binary = binaryFromYaoValues(values)
  const yinYang = values.map(v => (v === 7 || v === 9) ? 1 : 0)
  const lowerLines = [yinYang[0], yinYang[1], yinYang[2]]
  const upperLines = [yinYang[3], yinYang[4], yinYang[5]]
  const lowerTg = trigramFromLines(lowerLines)
  const upperTg = trigramFromLines(upperLines)
  const key = `${upperTg}_${lowerTg}`
  const name = HEXAGRAM_NAMES[key] || '未知卦'
  const judgment = HEXAGRAM_JUDGMENTS[key] || ''

  const palaceInfo = PALACE_LOOKUP[key] || { palaceIndex: 0, palacePosition: 1 }
  const pi = palaceInfo.palaceIndex
  const pp = palaceInfo.palacePosition
  const shiPos = SHI_POSITIONS[pp - 1]
  const yingPos = shiPos <= 3 ? shiPos + 3 : shiPos - 3

  return {
    name,
    judgment,
    palaceName: PALACE_NAMES[pi],
    palaceIndex: pi,
    palacePosition: pp,
    palaceWuxing: PALACE_WUXING[pi],
    shiPosition: shiPos,
    yingPosition: yingPos,
    yaoValues: [...values],
    binary,
  }
}

/** Compute full Zhuang Gua line data. */
export function getZhuangGuaLines(values: number[], hex: HexagramInfo): ZhuangGuaLine[] {
  const yaoResults = convertToYaoResults(values)
  const sixSpirits = getSixSpirits(getDayStemIndex())
  const pw = hex.palaceWuxing

  // Compute actual trigram indices from values (not hex.palaceIndex)
  // Na Jia is assigned per-trigram, not per-palace.
  const yinYang = values.map(v => (v === 7 || v === 9) ? 1 : 0)
  const lowerLines_ = [yinYang[0], yinYang[1], yinYang[2]]
  const upperLines_ = [yinYang[3], yinYang[4], yinYang[5]]
  const lowerTg = trigramFromLines(lowerLines_)
  const upperTg = trigramFromLines(upperLines_)

  return yaoResults.map((yao, i) => {
    const pos = i + 1 // 1-6
    const isUpper = pos >= 4
    const naJiaIdx = pos - 1 - (isUpper ? 3 : 0)
    const palaceForNaJia = isUpper ? TRIGRAM_TO_PALACE[upperTg] : TRIGRAM_TO_PALACE[lowerTg]
    const naJia = isUpper ? NA_JIA_OUTER[palaceForNaJia][naJiaIdx] : NA_JIA_INNER[palaceForNaJia][naJiaIdx]
    const branchWx = BRANCH_WUXING[naJia.branch] || '土'

    // Position name: standard Zhouyi format
    // 初九/初六, 九二/六二, 九三/六三, 九四/六四, 九五/六五, 上九/上六
    const posLabels = ['初', '二', '三', '四', '五', '上']
    const yinYangLabel = yao.isYang ? '九' : '六'
    let positionName: string
    if (i === 0) {
      positionName = `初${yinYangLabel}`
    } else if (i === 5) {
      positionName = `上${yinYangLabel}`
    } else {
      positionName = `${yinYangLabel}${posLabels[i]}`
    }

    // Line judgment
    const judgment = getLineJudgment(hex, pos)

    return {
      position: pos,
      positionName,
      yao,
      naJiaStem: naJia.stem,
      naJiaBranch: naJia.branch,
      naJiaDisplay: naJia.stem + naJia.branch,
      branchWuxing: branchWx,
      sixRelation: getSixRelation(pw, branchWx),
      sixSpirit: sixSpirits[i],
      isShi: pos === hex.shiPosition,
      isYing: pos === hex.yingPosition,
      judgment,
    }
  })
}

/** Generate derived hexagram values (changing lines flipped). */
export function getDerivedValues(values: number[]): number[] | null {
  const hasChanging = values.some(v => v === 6 || v === 9)
  if (!hasChanging) return null
  return values.map(v => {
    if (v === 6) return 7  // old yin -> young yang
    if (v === 9) return 8  // old yang -> young yin
    return v               // unchanged
  })
}

/** Generate 互卦 (hu gua / nuclear hexagram): lines 2,3,4 as lower, 3,4,5 as upper. */
export function getHuGuaValues(values: number[]): number[] {
  // Take middle 4 lines: [line2, line3, line4, line5]
  const middle = values.slice(1, 5) // [v2, v3, v4, v5]
  // Lower trigram: [v2, v3, v4], Upper trigram: [v3, v4, v5]
  const huLower = [middle[0], middle[1], middle[2]]
  const huUpper = [middle[1], middle[2], middle[3]]
  // Convert yang(7|9)=1, yin(6|8)=0
  const isYang = (v: number) => v === 7 || v === 9
  const toValue = (v: number) => isYang(v) ? 7 : 8
  return [...huLower.map(toValue), ...huUpper.map(toValue)]
}

/** Calculate score (0-100) for the hexagram. */
export function calculateYijingScore(values: number[], hex: HexagramInfo, lines: ZhuangGuaLine[]): number {
  const numChanging = values.filter(v => v === 6 || v === 9).length
  const numYang = values.filter(v => v === 7 || v === 9).length

  // Base: balance-based
  let base = 50

  // Adjust for changing lines
  if (numChanging === 0) base = 45    // 静卦 — 稳定但有停滞倾向
  else if (numChanging === 1) base = 65  // 独动 — 变化聚焦
  else if (numChanging === 2) base = 60
  else if (numChanging === 3) base = 50
  else if (numChanging === 4) base = 45
  else if (numChanging === 5) base = 40
  else base = 35  // 6 changing — 完全改变

  // Balance bonus: near 3:3 is ideal
  const balance = 3 - Math.abs(numYang - 3)
  base += balance * 5

  // Six relations dynamic adjustment (六亲动向)
  const changingLines = lines.filter(l => l.yao.isChanging)
  for (const line of changingLines) {
    switch (line.sixRelation) {
      case '官鬼': base -= 8; break
      case '妻财': base += 5; break
      case '父母': base -= 3; break
      case '子孙': base += 6; break
      case '兄弟': base -= 5; break
    }
    // 世爻/应爻 adjustment
    if (line.isShi) base -= 10
    if (line.isYing) base += 8
  }

  // Shen-sha style adjustment from hexagram nature (rough: 乾=strong, 坤=stable, 屯=hard start, etc.)
  const name = hex.name
  if (name.includes('泰') || name.includes('益') || name.includes('大有') || name.includes('谦')) base += 10
  else if (name.includes('否') || name.includes('困') || name.includes('坎') || name.includes('剥') || name.includes('蹇')) base -= 8
  else if (name.includes('讼') || name.includes('未济') || name.includes('蛊')) base -= 3

  // Clamp
  return Math.max(0, Math.min(100, Math.round(base)))
}

/** Generate rule-based interpretation text (not AI-generated). */
export function generateInterpretation(hex: HexagramInfo, score: number, numChanging: number, lines: ZhuangGuaLine[]): string {
  const texts: string[] = []

  // 1. Hexagram nature
  texts.push(`本次占得「${hex.name}」，属${hex.palaceName}，五行属${hex.palaceWuxing}。`)

  // 2. Judgment
  if (hex.judgment) {
    texts.push(`卦辞曰：${hex.judgment}`)
  }

  // 3. Changing line analysis
  if (numChanging === 0) {
    texts.push('此卦静而不动，六爻无变，宜静守待时。')
  } else if (numChanging === 1) {
    texts.push('一爻发动，事有专主之象，变化在于关键之处。')
  } else if (numChanging <= 3) {
    texts.push('数爻有变，事态正在演化之中，多层面需兼顾。')
  } else {
    texts.push('多爻皆变，局势变动较大，宜沉着应对，不宜轻举妄动。')
  }

  // 4. 世应
  texts.push(`世在${['初', '二', '三', '四', '五', '上'][hex.shiPosition - 1]}爻，应在${['初', '二', '三', '四', '五', '上'][hex.yingPosition - 1]}爻。`)

  // 5. Six relations dynamics (六亲动向)
  const changingLines = lines.filter(l => l.yao.isChanging)
  if (changingLines.length > 0) {
    const sixRelations = [...new Set(changingLines.map(l => l.sixRelation))]
    const relationTexts: string[] = []

    if (sixRelations.includes('官鬼')) {
      relationTexts.push('官鬼发动，主事业有变，需防小人')
    }
    if (sixRelations.includes('妻财')) {
      relationTexts.push('妻财发动，求财有利，可把握机会')
    }
    if (sixRelations.includes('父母')) {
      relationTexts.push('父母发动，主文书、长辈相关事务')
    }
    if (sixRelations.includes('子孙')) {
      relationTexts.push('子孙发动，主去灾解厄，谋事顺遂')
    }
    if (sixRelations.includes('兄弟')) {
      relationTexts.push('兄弟发动，主竞争、损耗，宜谨慎')
    }

    if (relationTexts.length > 0) {
      texts.push(`六亲动向：${relationTexts.join('；')}。`)
    }
  }

  // 6. Six spirits hints (神煞提示)
  if (changingLines.length > 0) {
    const changingSpirits = [...new Set(changingLines.map(l => l.sixSpirit))]
    const spiritTexts: string[] = []

    if (changingSpirits.includes('青龙')) {
      spiritTexts.push('青龙发动，主喜事临门')
    }
    if (changingSpirits.includes('朱雀')) {
      spiritTexts.push('朱雀发动，主口舌之争')
    }
    if (changingSpirits.includes('勾陈')) {
      spiritTexts.push('勾陈发动，主田土、房产之事')
    }
    if (changingSpirits.includes('螣蛇')) {
      spiritTexts.push('螣蛇发动，主虚惊怪异')
    }
    if (changingSpirits.includes('白虎')) {
      spiritTexts.push('白虎发动，主刑伤、丧服')
    }
    if (changingSpirits.includes('玄武')) {
      spiritTexts.push('玄武发动，主暗昧、盗贼')
    }

    if (spiritTexts.length > 0) {
      texts.push(`神煞提示：${spiritTexts.join('；')}。`)
    }
  }

  // 7. Score-based summary
  if (score >= 70) {
    texts.push('卦象吉顺，所求之事多有可为，可积极进取。')
  } else if (score >= 45) {
    texts.push('卦势平缓，吉凶参半，宜审时度势，循序渐进。')
  } else {
    texts.push('卦势未顺，诸事宜谨慎，暂缓而行，待机而动。')
  }

  return texts.join('\n')
}

// ============================
// Line judgment helpers
// ============================

function getLineJudgment(hex: HexagramInfo, position: number): string {
  const lines = LINE_JUDGMENTS[hex.name]
  if (lines && lines[position - 1]) {
    return lines[position - 1]
  }
  const posLabels = ['初', '二', '三', '四', '五', '上']
  const yangYin = (hex.yaoValues[position - 1] === 7 || hex.yaoValues[position - 1] === 9) ? '刚' : '柔'
  return `${posLabels[position - 1]}爻以${yangYin}居位，与时偕行。`
}

// ============================
// Main entry: compute full YijingResult from yao values
// ============================

export function computeYijingResult(values: number[]): YijingResult {
  const hexagram = getHexagramInfo(values)
  const lines = getZhuangGuaLines(values, hexagram)
  const derivedValues = getDerivedValues(values)
  const huGuaValues = getHuGuaValues(values)

  let derivedHexagram: HexagramInfo | null = null
  let derivedLines: ZhuangGuaLine[] | null = null
  if (derivedValues) {
    derivedHexagram = getHexagramInfo(derivedValues)
    derivedLines = getZhuangGuaLines(derivedValues, derivedHexagram)
  }

  const huGua = getHexagramInfo(huGuaValues)
  const huGuaLines = getZhuangGuaLines(huGuaValues, huGua)

  const numChanging = values.filter(v => v === 6 || v === 9).length
  const score = calculateYijingScore(values, hexagram, lines)
  const interpretation = generateInterpretation(hexagram, score, numChanging, lines)

  return {
    hexagram,
    lines,
    derivedHexagram,
    derivedLines,
    huGua,
    huGuaLines,
    score,
    interpretation,
  }
}
