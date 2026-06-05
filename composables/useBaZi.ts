import { getMonthPillar, getSolarTerm } from './useSolarTerms'
import { Lunar } from 'lunar-javascript'

import {
  STEMS,
  BRANCHES,
  getStemIndex,
  WUXING_STEM,
  WUXING_BRANCH,
  getNayinWuxing,
} from '~/constants/bazi'
import { getTrueSolarHour } from '~/utils/time'

// === Helper ===

function branchIndex(b: string): number {
  return BRANCHES.indexOf(b as (typeof BRANCHES)[number])
}

// === Constants ===

const STEM_YIN_YANG: Record<string, '阳' | '阴'> = {
  甲: '阳',
  乙: '阴',
  丙: '阳',
  丁: '阴',
  戊: '阳',
  己: '阴',
  庚: '阳',
  辛: '阴',
  壬: '阳',
  癸: '阴',
}

// === Typed Exports ===

export interface HiddenStem {
  stem: string
  tenGod: string
  wuxing: string
}

export interface BaZiPillar {
  stem: string
  branch: string
  stemTenGod: string
  branchTenGod: string
  hiddenStems: HiddenStem[]
  stemWuxing: string
  branchWuxing: string
  interpretation?: string
}

export interface DaYunCycle {
  startAge: number
  endAge: number
  stemBranch: string
  stemTenGod: string
  branchTenGod: string
  description: string
}

export interface BaZiResult {
  yearPillar: BaZiPillar
  monthPillar: BaZiPillar
  dayPillar: BaZiPillar
  hourPillar: BaZiPillar | null
  dayMaster: string
  dayMasterWuxing: string
  dayMasterStrength: '强' | '偏强' | '中和' | '偏弱' | '弱'
  favorableElements: string[]
  unfavorableElements: string[]
  elementCounts: Record<string, number>
  elementPercentages: Record<string, number>
  daYun: DaYunCycle[]
  birthYear: number
  birthCalendar: 'solar' | 'lunar'
  birthHour: number | null
  gender: '男' | '女' | null
}

// === Hidden Stems Table ===
// Each branch has 1-3 hidden stems (主/中/余)
const HIDDEN_STEMS: Record<string, string[]> = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
}

// === Ten Gods Matrix ===
// 10x10 matrix indexed by [dayMasterIndex][targetStemIndex]
const TEN_GOD_MATRIX: string[][] = (() => {
  const wuxingCycle = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']
  const yinYang = ['阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴']

  const matrix: string[][] = []
  for (let dm = 0; dm < 10; dm++) {
    const row: string[] = []
    for (let target = 0; target < 10; target++) {
      if (dm === target) {
        row.push('比肩')
        continue
      }

      const dmWx = wuxingCycle[dm]
      const targetWx = wuxingCycle[target]
      const dmYy = yinYang[dm]
      const targetYy = yinYang[target]
      const sameYy = dmYy === targetYy

      // 生我 (generates day master): target's wuxing generates dm's wuxing
      // Wood→Fire→Earth→Metal→Water→Wood
      const produces: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
      // 克我 (controls day master)
      const controls: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

      if (targetWx === dmWx) {
        // Same element, different stem
        row.push(sameYy ? '比肩' : '劫财')
      } else if (produces[targetWx] === dmWx) {
        // Target generates DM: 生我
        row.push(sameYy ? '偏印' : '正印')
      } else if (produces[dmWx] === targetWx) {
        // DM generates target: 我生
        row.push(sameYy ? '食神' : '伤官')
      } else if (controls[targetWx] === dmWx) {
        // Target controls DM: 克我
        row.push(sameYy ? '偏官' : '正官')
      } else if (controls[dmWx] === targetWx) {
        // DM controls target: 我克
        row.push(sameYy ? '偏财' : '正财')
      } else {
        row.push('比肩') // Fallback (shouldn't happen)
      }
    }
    matrix.push(row)
  }
  return matrix
})()

/** Get ten god relationship between day master stem and another stem */
export function getTenGod(dayMasterIndex: number, targetStem: string): string {
  const targetIndex = getStemIndex(targetStem)
  if (targetIndex < 0) return '—'
  return TEN_GOD_MATRIX[dayMasterIndex][targetIndex]
}

// === Pillar Interpretation Lookup Tables ===

/** 天干特性 */
const STEM_TRAITS: Record<string, string> = {
  甲: '甲木参天',
  乙: '乙木柔韧',
  丙: '丙火猛烈',
  丁: '丁火柔中',
  戊: '戊土厚重',
  己: '己土肥沃',
  庚: '庚金刚锐',
  辛: '辛金秀气',
  壬: '壬水汪洋',
  癸: '癸水至阴',
}

/** 十神心性 */
const TEN_GOD_TRAITS: Record<string, string> = {
  正官: '正官护身',
  七杀: '七杀攻身',
  正印: '正印护持',
  偏印: '偏印生身',
  比肩: '比肩助力',
  劫财: '劫财相扶',
  食神: '食神泄秀',
  伤官: '伤官吐秀',
  正财: '正财稳进',
  偏财: '偏财横发',
}

/** 柱位语境 */
const PILLAR_CONTEXT: Record<string, string> = {
  年柱: '祖上根基',
  月柱: '父母荫庇',
  日柱: '自身造化',
  时柱: '晚年归宿',
}

/**
 * Generate a one-line pillar interpretation using rule templates.
 * Combines stem character + ten god nature + pillar position context.
 */
export function getPillarInterpretation(
  stem: string,
  tenGod: string,
  pillarName: string,
  branchWuxing: string,
  dayMasterWuxing: string,
): string {
  // 日柱 gets special treatment
  if (pillarName === '日柱') {
    return `${STEM_TRAITS[stem] || stem + '干'}，${PILLAR_CONTEXT['日柱']}。`
  }

  const stemPart = STEM_TRAITS[stem] || `${stem}干`
  const tenGodPart = TEN_GOD_TRAITS[tenGod] || ''

  // Check for root (通根) — if branch has same wuxing as stem
  const hasRoot = branchWuxing === dayMasterWuxing || branchWuxing === WUXING_STEM[stem]

  // Build the sentence
  const parts: string[] = [stemPart]
  if (tenGodPart) parts.push(tenGodPart)
  if (hasRoot) parts.push('通根有力')
  parts.push(PILLAR_CONTEXT[pillarName])

  return parts.join('，') + '。'
}

/** Determine if a year's stem is 阳 (yang) */
function isYangYear(stemIndex: number): boolean {
  return stemIndex % 2 === 0
}

/** Get the stem index from a year (for year pillar calculation) */
function getYearStemIndex(year: number): number {
  return (((year - 4) % 10) + 10) % 10
}

/** Get the branch index from a year (for year pillar calculation) */
function getYearBranchIndex(year: number): number {
  return (((year - 4) % 12) + 12) % 12
}

/** Check if a date is before 立春 using the computed solar term date for the given year */
function isBeforeLiChun(year: number, month: number, day: number): boolean {
  const liChun = getSolarTerm(year, 0)
  return month < liChun.month || (month === liChun.month && day < liChun.day)
}

/** Build a pillar object */
function buildPillar(stemIndex: number, branchIndex: number, dayMasterIndex: number): BaZiPillar {
  const stem = STEMS[stemIndex]
  const branch = BRANCHES[branchIndex]
  const hiddenStemChars = HIDDEN_STEMS[branch] || []
  const stemTenGod = getTenGod(dayMasterIndex, stem)

  return {
    stem,
    branch,
    stemTenGod,
    branchTenGod: hiddenStemChars.length > 0 ? getTenGod(dayMasterIndex, hiddenStemChars[0]) : '—',
    hiddenStems: hiddenStemChars.map(s => ({
      stem: s,
      tenGod: getTenGod(dayMasterIndex, s),
      wuxing: WUXING_STEM[s],
    })),
    stemWuxing: WUXING_STEM[stem],
    branchWuxing: WUXING_BRANCH[branch],
  }
}

/**
 * Days from the Zeller formula epoch to 1900-01-01.
 * 1900-01-01 is a 甲子日 (stem=0, branch=0) in the sexagenary cycle.
 * Derived from: days = 365*1899 + floor(1899/4) - floor(1899/100) + floor(1899/400)
 *   + floor((153*13-457)/5) + 1 = 693902
 */
const DAYS_FROM_EPOCH_TO_1900_01_01 = 693902

/**
 * Calculate day pillar stem and branch indices.
 * Uses Zeller-like formula with reference date 1900-01-01 = 甲子日 (stem=0, branch=0).
 */
function getDayPillarIndices(year: number, month: number, day: number): [number, number] {
  const y = month <= 2 ? year - 1 : year
  const m = month <= 2 ? month + 12 : month

  const days =
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) +
    Math.floor((153 * m - 457) / 5) +
    day -
    DAYS_FROM_EPOCH_TO_1900_01_01

  const stemIndex = ((days % 10) + 10) % 10
  const branchIndex = ((days % 12) + 12) % 12
  return [stemIndex, branchIndex]
}

/** Get the hour branch index from birth hour (0-23) */
function getHourBranchIndex(hour: number): number {
  // 子=23-01, 丑=01-03, 寅=03-05, 卯=05-07, ...
  return Math.floor(((hour + 1) % 24) / 2)
}

/** Get the hour stem start index using 五鼠遁 */
function getHourStemStart(dayStemIndex: number): number {
  // 甲/己→甲(0), 乙/庚→丙(2), 丙/辛→戊(4), 丁/壬→庚(6), 戊/癸→壬(8)
  return (dayStemIndex * 2) % 10
}

/**
 * Weighted day master strength scoring all 4 pillars + hidden stems.
 *
 * Factor weights:
 *   month branch ×2.0, day branch ×1.5,
 *   year stem, day stem, hour stem ×1.0,
 *   year branch, hour branch ×1.0,
 *   each hidden stem ×0.5
 *
 * Scoring per factor:
 *   Same wuxing as day master → +1
 *   Generates day master (生我) → +0.5
 *   Controls day master (克我) → -1.5
 *
 * Wuxing cycle: 木→火→土→金→水→木 (indices 0-4).
 * Standard relationships:
 *   (fIdx + 1) % 5 === myIdx → f generates me
 *   (fIdx + 2) % 5 === myIdx → f controls me
 */
export function getWeightedDayMasterStrength(
  dayMasterWuxing: string,
  pillars: BaZiPillar[],
): '强' | '偏强' | '中和' | '偏弱' | '弱' {
  const CYCLE = ['木', '火', '土', '金', '水']
  const myIdx = CYCLE.indexOf(dayMasterWuxing)
  if (myIdx < 0) return '中和'

  function factorScore(wuxing: string): number {
    const fIdx = CYCLE.indexOf(wuxing)
    if (fIdx < 0) return 0
    if (fIdx === myIdx) return 1 // same wuxing
    if ((fIdx + 1) % 5 === myIdx) return 0.5 // generates me (生我)
    if ((fIdx + 2) % 5 === myIdx) return -1.5 // controls me (克我)
    return 0
  }

  // Pillar order: [年柱, 月柱, 日柱, 时柱]
  const weights: { idx: number; field: 'stem' | 'branch'; weight: number }[] = [
    { idx: 0, field: 'stem', weight: 1.0 }, // year stem
    { idx: 0, field: 'branch', weight: 1.0 }, // year branch
    { idx: 1, field: 'branch', weight: 2.0 }, // month branch
    { idx: 2, field: 'stem', weight: 1.0 }, // day stem
    { idx: 2, field: 'branch', weight: 1.5 }, // day branch
    { idx: 3, field: 'stem', weight: 1.0 }, // hour stem
    { idx: 3, field: 'branch', weight: 1.0 }, // hour branch
  ]

  let total = 0

  for (const { idx, field, weight } of weights) {
    const pillar = pillars[idx]
    if (!pillar) continue
    const wuxing = field === 'stem' ? pillar.stemWuxing : pillar.branchWuxing
    total += factorScore(wuxing) * weight
  }

  // Hidden stems from all pillars
  for (const pillar of pillars) {
    if (!pillar) continue
    for (const hs of pillar.hiddenStems) {
      total += factorScore(hs.wuxing) * 0.5
    }
  }

  if (total >= 3) return '强'
  if (total >= 1) return '偏强'
  if (total >= -1) return '中和'
  if (total >= -3) return '偏弱'
  return '弱'
}

/**
 * Get seasonal climate adjustment element based on month branch.
 * 调候用神 — balances seasonal extremes.
 *
 * 春(寅卯辰, idx 2-4) 木旺 → 需金制 → 调候金
 * 夏(巳午未, idx 5-7) 火炎 → 需水降 → 调候水
 * 秋(申酉戌, idx 8-10) 金锐 → 需火炼 → 调候火
 * 冬(亥子丑, idx 0,1,11) 水寒 → 需火暖 → 调候火
 */
export function getSeasonalAdjustment(monthBranchIndex: number): string {
  // 春 寅卯辰
  if (monthBranchIndex >= 2 && monthBranchIndex <= 4) return '金'
  // 夏 巳午未
  if (monthBranchIndex >= 5 && monthBranchIndex <= 7) return '水'
  // 秋 申酉戌
  if (monthBranchIndex >= 8 && monthBranchIndex <= 10) return '火'
  // 冬 亥子丑
  return '火'
}

/**
 * Determine favorable and unfavorable elements based on day master strength.
 *
 * Theory:
 * - 身强/偏强: 喜克泄耗 = 官杀(克我) + 食伤(我生) + 财(我克)
 * - 身弱/偏弱: 喜扶帮 = 印(生我) + 比劫(同我)
 * - 中和: simplified balance, could require further 调候 analysis
 *
 * When monthBranchIndex is provided, seasonal climate adjustment (调候) is
 * prepended to the favorable list. 调候 takes priority over standard strength
 * analysis — even if the seasonal element would normally be unfavorable,
 * it is still added as favorable.
 */
export function getFavorableElements(
  dayMasterWuxing: string,
  strength: string,
  monthBranchIndex?: number,
): [string[], string[]] {
  // 我生 (食伤/EXPRESSION): DM generates this element
  const generating: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
  // 我克 (财/WEALTH): DM controls this element
  const controlling: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
  // 克我 (官杀/OFFICER): this element controls DM
  const controlled: Record<string, string> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' }
  // 生我 (印/RESOURCE): this element generates DM
  const generatedBy: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }

  let favorable: string[]
  let unfavorable: string[]

  if (strength === '强' || strength === '偏强') {
    // 身强喜克泄耗: 官杀(克我) + 食伤(我生) + 财(我克) are favorable
    favorable = [
      controlled[dayMasterWuxing],
      generating[dayMasterWuxing],
      controlling[dayMasterWuxing],
    ]
    unfavorable = [dayMasterWuxing, generatedBy[dayMasterWuxing]]
  } else if (strength === '弱' || strength === '偏弱') {
    // 身弱喜扶帮: 印(生我) + 比劫(同我) are favorable
    favorable = [generatedBy[dayMasterWuxing], dayMasterWuxing]
    unfavorable = [
      controlled[dayMasterWuxing],
      generating[dayMasterWuxing],
      controlling[dayMasterWuxing],
    ]
  } else {
    // 中和 → full analysis needed; simple balance for now
    favorable = [controlled[dayMasterWuxing], generating[dayMasterWuxing]]
    unfavorable = [controlling[dayMasterWuxing], dayMasterWuxing]
  }

  // Seasonal climate adjustment (调候) — prepend if provided and not already present
  if (monthBranchIndex !== undefined) {
    const seasonal = getSeasonalAdjustment(monthBranchIndex)
    if (!favorable.includes(seasonal)) {
      favorable = [seasonal, ...favorable]
    }
  }

  return [favorable, unfavorable]
}

/** Compute element counts from all pillars */
function computeElementCounts(pillars: BaZiPillar[]): Record<string, number> {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  for (const p of pillars) {
    if (!p) continue
    if (counts[p.stemWuxing] !== undefined) counts[p.stemWuxing]++
    if (counts[p.branchWuxing] !== undefined) counts[p.branchWuxing]++
    for (const hs of p.hiddenStems) {
      if (counts[hs.wuxing] !== undefined) counts[hs.wuxing]++
    }
    // Include nayin wuxing in element count
    if (p.stem && p.branch) {
      const nayin = getNayinWuxing(p.stem, p.branch)
      if (counts[nayin] !== undefined) counts[nayin]++
    }
  }
  return counts
}

/**
 * Calculate the starting age for DaYun (大运起运年龄).
 *
 * Standard 子平法 algorithm:
 *   - 阳男阴女 → 顺排: count days from birth to NEXT 节气 (节), ÷ 3
 *   - 阴男阳女 → 逆排: count days from PREVIOUS 节气 (节) to birth, ÷ 3
 *
 * Only the 12 "节" (odd-month solar terms) are used:
 *   立春 惊蛰 清明 立夏 芒种 小暑 立秋 白露 寒露 立冬 大雪 小寒
 */
function computeDaYunStartAge(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  yearStemIndex: number,
  gender: '男' | '女' | null,
): number {
  if (!gender) {
    // Fallback for missing gender: treat as 阴女 → 阳年 逆排, 阴年 顺排
    const yangYear = isYangYear(yearStemIndex)
    // Must match computeDaYun logic where isMale=false: forward = !yangYear
    return computeStartAge(birthYear, birthMonth, birthDay, !yangYear)
  }

  const yangYear = isYangYear(yearStemIndex)
  const isMale = gender === '男'
  // 阳男阴女 → 顺排, 阴男阳女 → 逆排
  const forward = (yangYear && isMale) || (!yangYear && !isMale)

  return computeStartAge(birthYear, birthMonth, birthDay, forward)
}

function computeStartAge(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  forward: boolean,
): number {
  const isLeap = (birthYear % 4 === 0 && birthYear % 100 !== 0) || birthYear % 400 === 0
  const monthDays = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  // Birth day-of-year
  let birthDOY = 0
  for (let i = 0; i < birthMonth - 1; i++) birthDOY += monthDays[i]
  birthDOY += birthDay

  if (forward) {
    // Forward: look at terms after birth DOY in the current year
    const termDOYs: number[] = []
    for (let i = 0; i < 12; i++) {
      const term = getSolarTerm(birthYear, i)
      let doy = 0
      for (let m = 0; m < term.month - 1; m++) doy += monthDays[m]
      doy += term.day
      if (i === 11) doy += isLeap ? 366 : 365
      termDOYs.push(doy)
    }
    const next = termDOYs.filter(d => d > birthDOY)
    if (next.length > 0) {
      return (Math.min(...next) - birthDOY) / 3
    }
    // After all terms → next term is next year's 立春
    const nextLiChun = getSolarTerm(birthYear + 1, 0)
    const nextIsLeap =
      ((birthYear + 1) % 4 === 0 && (birthYear + 1) % 100 !== 0) || (birthYear + 1) % 400 === 0
    const nextMD = [31, nextIsLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    let nextDOY = 0
    for (let m = 0; m < nextLiChun.month - 1; m++) nextDOY += nextMD[m]
    nextDOY += nextLiChun.day
    return ((isLeap ? 366 : 365) - birthDOY + nextDOY) / 3
  }

  // Backward: find the closest 节 BEFORE birth date
  const termDOYs: number[] = []
  for (let i = 0; i < 12; i++) {
    const term = getSolarTerm(birthYear, i)
    let doy = 0
    for (let m = 0; m < term.month - 1; m++) doy += monthDays[m]
    doy += term.day
    termDOYs.push(doy)
  }

  // Find the closest term before birth date in the birth year
  const prevTerms = termDOYs.filter(d => d < birthDOY)
  if (prevTerms.length > 0) {
    return (birthDOY - Math.max(...prevTerms)) / 3
  }

  // Birth is before 小寒 (first term ~Jan 6) of the birth year
  // The previous term is 大雪 (~Dec 7) of the previous year
  const prevYear = birthYear - 1
  const prevIsLeap = (prevYear % 4 === 0 && prevYear % 100 !== 0) || prevYear % 400 === 0
  const prevMonthDays = [31, prevIsLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const prevDaXue = getSolarTerm(prevYear, 10)
  let prevDaXueDOY = 0
  for (let m = 0; m < prevDaXue.month - 1; m++) prevDaXueDOY += prevMonthDays[m]
  prevDaXueDOY += prevDaXue.day

  // Days from 大雪 of previous year to birth date
  const daysBetween = birthDOY + (prevIsLeap ? 366 : 365) - prevDaXueDOY
  return daysBetween / 3
}

/** Compute da yun (great fortune) cycles */
function computeDaYun(
  monthPillar: BaZiPillar,
  yearStemIndex: number,
  gender: '男' | '女' | null,
  birthYear: number,
  birthMonth: number,
  birthDay: number,
): DaYunCycle[] {
  const cycles: DaYunCycle[] = []
  const yangYear = isYangYear(yearStemIndex)
  const isMale = gender === '男'
  // 阳男阴女 → 顺排, 阴男阳女 → 逆排
  const forward = (yangYear && isMale) || (!yangYear && !isMale)

  const monthStemIndex = getStemIndex(monthPillar.stem)
  const monthBranchIndex = branchIndex(monthPillar.branch)

  const startAge = computeDaYunStartAge(birthYear, birthMonth, birthDay, yearStemIndex, gender)

  for (let i = 0; i < 8; i++) {
    const offset = forward ? i + 1 : -(i + 1)
    const stemIdx = (((monthStemIndex + offset) % 10) + 10) % 10
    const branchIdx = (((monthBranchIndex + offset) % 12) + 12) % 12
    const stem = STEMS[stemIdx]
    const branch = BRANCHES[branchIdx]
    cycles.push({
      startAge: Math.floor(startAge) + i * 10,
      endAge: Math.floor(startAge) + i * 10 + 9,
      stemBranch: stem + branch,
      stemTenGod: '',
      branchTenGod: '',
      description: '',
    })
  }
  return cycles
}

/** Patch ten gods into da yun cycles */
function patchDaYunTenGods(cycles: DaYunCycle[], dayMasterIndex: number): DaYunCycle[] {
  return cycles.map(cycle => {
    const stem = cycle.stemBranch[0]
    const branch = cycle.stemBranch[1]
    const stemTenGod = getTenGod(dayMasterIndex, stem)
    const branchTenGod = getTenGod(dayMasterIndex, branch)
    const shortDesc = [stemTenGod, branchTenGod].filter(Boolean).join('/')
    return { ...cycle, stemTenGod, branchTenGod, description: shortDesc }
  })
}

// === Main Input Type ===

export interface BaZiInput {
  birthYear: number
  birthMonth: number
  birthDay: number
  birthCalendar: 'solar' | 'lunar'
  birthHour: number | null
  gender: '男' | '女' | null
  birthLongitude?: number | null
}

/**
 * Calculate BaZi (Four Pillars) from birth information.
 */
export function calculateBaZi(input: BaZiInput): BaZiResult {
  let { birthYear, birthMonth, birthDay, birthCalendar, birthHour, gender, birthLongitude } = input

  // --- Lunar to Solar Conversion ---
  if (birthCalendar === 'lunar') {
    try {
      const lunar = Lunar.fromYmd(birthYear, birthMonth, birthDay)
      const solar = lunar.getSolar()
      birthYear = solar.getYear()
      birthMonth = solar.getMonth()
      birthDay = solar.getDay()
      birthCalendar = 'solar'
    } catch {
      // If conversion fails (e.g. invalid lunar date), fall through with original values
      console.warn(
        `[useBaZi] Failed to convert lunar date ${birthYear}-${birthMonth}-${birthDay}, treating as solar`,
      )
    }
  }

  // --- Year Pillar ---
  let yearStemIndex = getYearStemIndex(birthYear)
  let yearBranchIndex = getYearBranchIndex(birthYear)

  // 立春 boundary (now always solar after potential conversion)
  const beforeLiChun = isBeforeLiChun(birthYear, birthMonth, birthDay)

  if (beforeLiChun) {
    yearStemIndex = getYearStemIndex(birthYear - 1)
    yearBranchIndex = getYearBranchIndex(birthYear - 1)
  }

  // --- Month Pillar ---
  const monthPillarYear = beforeLiChun ? birthYear - 1 : birthYear
  const monthPillarResult = getMonthPillar(monthPillarYear, birthMonth, birthDay)
  const monthStemIndex = getStemIndex(monthPillarResult.stem)
  const monthBranchIndex = branchIndex(monthPillarResult.branch)

  // --- Day Pillar ---
  const [dayStemIndex, dayBranchIndex] = getDayPillarIndices(birthYear, birthMonth, birthDay)

  // --- Hour Pillar ---
  // Apply true solar time correction if birth longitude is available
  const solarHour =
    birthHour !== null && birthLongitude != null
      ? getTrueSolarHour(birthHour, birthLongitude)
      : birthHour
  let hourPillar: BaZiPillar | null = null
  if (solarHour !== null) {
    // Normalize to 0-23 range
    const normalizedHour = ((solarHour % 24) + 24) % 24
    const hourBranchIdx = getHourBranchIndex(normalizedHour)
    const hourStemStart = getHourStemStart(dayStemIndex)
    const hourStemIdx = (hourStemStart + hourBranchIdx) % 10
    hourPillar = buildPillar(hourStemIdx, hourBranchIdx, dayStemIndex)
  }

  // Build pillars
  const yearPillar = buildPillar(yearStemIndex, yearBranchIndex, dayStemIndex)
  const monthPillar = buildPillar(monthStemIndex, monthBranchIndex, dayStemIndex)
  const dayPillar = buildPillar(dayStemIndex, dayBranchIndex, dayStemIndex)
  dayPillar.stemTenGod = '日主'

  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar].filter(Boolean) as BaZiPillar[]

  // Element analysis
  const elementCounts = computeElementCounts(pillars)
  const total = Object.values(elementCounts).reduce((a, b) => a + b, 0)
  const elementPercentages: Record<string, number> = {}
  for (const [k, v] of Object.entries(elementCounts)) {
    elementPercentages[k] = total > 0 ? Math.round((v / total) * 1000) / 10 : 0
  }

  // Day master
  const dayMaster = STEMS[dayStemIndex]
  const dayMasterWuxing = WUXING_STEM[dayMaster]

  // Pillar interpretations
  yearPillar.interpretation = getPillarInterpretation(
    yearPillar.stem,
    yearPillar.stemTenGod,
    '年柱',
    yearPillar.branchWuxing,
    dayMasterWuxing,
  )
  monthPillar.interpretation = getPillarInterpretation(
    monthPillar.stem,
    monthPillar.stemTenGod,
    '月柱',
    monthPillar.branchWuxing,
    dayMasterWuxing,
  )
  dayPillar.interpretation = getPillarInterpretation(
    dayPillar.stem,
    dayPillar.stemTenGod,
    '日柱',
    dayPillar.branchWuxing,
    dayMasterWuxing,
  )
  if (hourPillar) {
    hourPillar.interpretation = getPillarInterpretation(
      hourPillar.stem,
      hourPillar.stemTenGod,
      '时柱',
      hourPillar.branchWuxing,
      dayMasterWuxing,
    )
  }

  const dayMasterStrength = getWeightedDayMasterStrength(dayMasterWuxing, pillars)
  const [favorableElements, unfavorableElements] = getFavorableElements(
    dayMasterWuxing,
    dayMasterStrength,
    monthBranchIndex,
  )

  // Da Yun
  const rawDaYun = computeDaYun(monthPillar, yearStemIndex, gender, birthYear, birthMonth, birthDay)
  const daYun = patchDaYunTenGods(rawDaYun, dayStemIndex)

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayMaster,
    dayMasterWuxing,
    dayMasterStrength,
    favorableElements,
    unfavorableElements,
    elementCounts,
    elementPercentages,
    daYun,
    birthYear,
    birthCalendar,
    birthHour,
    gender,
  }
}
