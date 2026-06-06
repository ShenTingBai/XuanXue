// ═══════════════════════════════════════════════════════════════
// 梅花易数 · 计算引擎
// ═══════════════════════════════════════════════════════════════

import {
  TRIGRAMS,
  HEXAGRAMS,
  HEXAGRAM_NAMES_BY_KEY,
  getLineStatement,
  SHENG_KE_INTERPRETATIONS,
  MEIHUA_TRIGRAM_BINARY,
  BINARY_TO_MEIHUA,
  getWuxingGenerated,
  getWuxingControlled,
} from '~/constants/meihua'

export type InputMethod = "time" | "manual" | "random"

export interface MeiHuaInput {
  upperNumber: number    // 1-999
  lowerNumber: number
  movingNumber: number
  method: InputMethod
  question?: string      // user question (optional)
}

export interface HexagramInfo {
  upperTrigram: number    // 1-8
  lowerTrigram: number
  upperName: string
  lowerName: string
  hexagramName: string    // e.g., "火风鼎"
  hexagramKey: string     // e.g., "3:5" (upper:lower)
  judgment: string
  interpretation: string
}

export interface HuGuaInfo {
  upperTrigram: number
  lowerTrigram: number
  upperName: string
  lowerName: string
  hexagramName: string
}

export interface BianGuaInfo {
  upperTrigram: number
  lowerTrigram: number
  upperName: string
  lowerName: string
  hexagramName: string
  hexagramKey: string
  movingLine: number      // 1-6
  lineStatement: string
}

export interface TiYongInfo {
  tiGua: number           // 体卦 (the gua WITHOUT the moving line)
  yongGua: number         // 用卦 (the gua WITH the moving line)
  relation: string        // "体生用" | "用生体" | "体克用" | "用克体" | "比和"
  description: string
  result: "吉" | "凶" | "平"
}

export interface MeiHuaResult {
  benGua: HexagramInfo & { allLines: number[] }
  huGua: HuGuaInfo
  bianGua: BianGuaInfo
  tiYong: TiYongInfo
  input: MeiHuaInput
}

// ============================
// Helper: decode trigram number (1-8) to 3 lines (bottom to top)
// ============================

function trigramToLines(num: number): [number, number, number] {
  const bin = MEIHUA_TRIGRAM_BINARY[num]
  return [bin & 1, (bin >> 1) & 1, (bin >> 2) & 1]
}

function linesToTrigram(line1: number, line2: number, line3: number): number {
  const bin = line1 | (line2 << 1) | (line3 << 2)
  return BINARY_TO_MEIHUA[bin]
}

function getTrigramName(num: number): string {
  const t = TRIGRAMS[num]
  return t ? t.name : ""
}

// ============================
// 1. Get 本卦 (Ben Gua) / Original Hexagram
// ============================

function getBenGua(upperNum: number, lowerNum: number): HexagramInfo & { allLines: number[] } {
  const key = upperNum + ":" + lowerNum
  const h = HEXAGRAMS[key]
  const upperLines = trigramToLines(upperNum)
  const lowerLines = trigramToLines(lowerNum)
  return {
    upperTrigram: upperNum,
    lowerTrigram: lowerNum,
    upperName: getTrigramName(upperNum),
    lowerName: getTrigramName(lowerNum),
    hexagramName: h ? h.name : "",
    hexagramKey: key,
    judgment: h ? h.judgment : "",
    interpretation: h ? h.interpretation : "",
    allLines: lowerLines.concat(upperLines),
  }
}

// ============================
// 2. Get 互卦 (Hu Gua) / Nuclear Hexagram
// From lines 2,3,4 (lower) and 3,4,5 (upper) of benGua
// ============================

function getHuGua(allLines: number[]): HuGuaInfo {
  // allLines = [line1, line2, line3, line4, line5, line6] (bottom to top)
  // Hu lower trigram = lines 2,3,4 (indices 1,2,3)
  // Hu upper trigram = lines 3,4,5 (indices 2,3,4)
  const huLowerNum = linesToTrigram(allLines[1], allLines[2], allLines[3])
  const huUpperNum = linesToTrigram(allLines[2], allLines[3], allLines[4])
  const key = huUpperNum + ":" + huLowerNum
  const h = HEXAGRAMS[key]
  return {
    upperTrigram: huUpperNum,
    lowerTrigram: huLowerNum,
    upperName: getTrigramName(huUpperNum),
    lowerName: getTrigramName(huLowerNum),
    hexagramName: h ? h.name : "",
  }
}

// ============================
// 3. Get 变卦 (Bian Gua) / Changed Hexagram
// Flip the moving line in the original hexagram
// ============================

function getBianGua(upperNum: number, lowerNum: number, movingLine: number): BianGuaInfo {
  const upperLines = trigramToLines(upperNum)
  const lowerLines = trigramToLines(lowerNum)
  const allLines = lowerLines.concat(upperLines)

  // Flip the moving line (1-6, where 1 = bottom)
  const idx = movingLine - 1
  allLines[idx] = allLines[idx] === 1 ? 0 : 1

  // Reconstruct trigrams
  const newLower = linesToTrigram(allLines[0], allLines[1], allLines[2])
  const newUpper = linesToTrigram(allLines[3], allLines[4], allLines[5])
  const key = newUpper + ":" + newLower
  const h = HEXAGRAMS[key]

  return {
    upperTrigram: newUpper,
    lowerTrigram: newLower,
    upperName: getTrigramName(newUpper),
    lowerName: getTrigramName(newLower),
    hexagramName: h ? h.name : "",
    hexagramKey: key,
    movingLine,
    lineStatement: getLineStatement(key, idx),
  }
}

// ============================
// 4. Get 体用 (Ti-Yong) / Body-Use Analysis
// Moving line 1-3: yong = lower, ti = upper
// Moving line 4-6: yong = upper, ti = lower
// ============================

function getTiYong(upperNum: number, lowerNum: number, movingLine: number): TiYongInfo {
  let tiGua: number
  let yongGua: number
  if (movingLine >= 1 && movingLine <= 3) {
    yongGua = lowerNum  // 用卦 = 有动爻的卦 (下卦)
    tiGua = upperNum    // 体卦 = 无动爻的卦 (上卦)
  } else {
    yongGua = upperNum  // 用卦 = 有动爻的卦 (上卦)
    tiGua = lowerNum    // 体卦 = 无动爻的卦 (下卦)
  }

  const tiWx = TRIGRAMS[tiGua] ? TRIGRAMS[tiGua].wuxing : ""
  const yongWx = TRIGRAMS[yongGua] ? TRIGRAMS[yongGua].wuxing : ""
  const skKey = tiWx + ":" + yongWx
  const sk = SHENG_KE_INTERPRETATIONS[skKey]

  const relation = sk ? sk.result : ""
  const description = sk ? sk.description : ""

  let result: "吉" | "凶" | "平"
  if (relation === "比和" || relation === "用生体" || relation === "体克用") {
    result = "吉"
  } else if (relation === "用克体") {
    result = "凶"
  } else {
    result = "平"
  }

  return { tiGua, yongGua, relation, description, result }
}

// ============================
// Main calculation function
// ============================

export function calculateMeiHua(input: MeiHuaInput): MeiHuaResult {
  // Normalize numbers to valid ranges
  const upperNum = ((Math.abs(input.upperNumber) - 1) % 8 + 8) % 8 + 1
  const lowerNum = ((Math.abs(input.lowerNumber) - 1) % 8 + 8) % 8 + 1
  const movingLine = ((Math.abs(input.movingNumber) - 1) % 6 + 6) % 6 + 1

  const benGua = getBenGua(upperNum, lowerNum)
  const huGua = getHuGua(benGua.allLines)
  const bianGua = getBianGua(upperNum, lowerNum, movingLine)
  const tiYong = getTiYong(upperNum, lowerNum, movingLine)

  return { benGua, huGua, bianGua, tiYong, input }
}

// ============================
// Calculate from date/time (年月日时起卦法)
// ============================

/**
 * Calculate from date components.
 * upper = (year + month + day) % 8, with 0 mapped to 8
 * lower = (year + month + day + hour) % 8, with 0 mapped to 8
 * moving = (year + month + day + hour) % 6, with 0 mapped to 6
 */
export function calculateMeiHuaFromDate(
  year: number,
  month: number,
  day: number,
  hourBranchIndex?: number
): MeiHuaResult {
  const hour = hourBranchIndex !== undefined ? hourBranchIndex : 0
  const sum = year + month + day
  const upperRaw = sum % 8
  const upperNumber = upperRaw === 0 ? 8 : upperRaw
  const lowerRaw = (sum + hour) % 8
  const lowerNumber = lowerRaw === 0 ? 8 : lowerRaw
  const movingRaw = (sum + hour) % 6
  const movingNumber = movingRaw === 0 ? 6 : movingRaw

  return calculateMeiHua({
    upperNumber,
    lowerNumber,
    movingNumber,
    method: "time",
  })
}
