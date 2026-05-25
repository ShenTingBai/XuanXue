import { getMonthPillar, getSolarTerm } from './useSolarTerms'

import { STEMS, BRANCHES } from '~/constants/bazi'

// === Constants ===

export const WUXING_STEM: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
}

export const WUXING_BRANCH: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
}

const STEM_YIN_YANG: Record<string, '阳' | '阴'> = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴', '戊': '阳',
  '己': '阴', '庚': '阳', '辛': '阴', '壬': '阳', '癸': '阴',
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
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
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
      const produces: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
      // 克我 (controls day master)
      const controls: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }

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
  const targetIndex = (STEMS as readonly string[]).indexOf(targetStem)
  if (targetIndex < 0) return '—'
  return TEN_GOD_MATRIX[dayMasterIndex][targetIndex]
}

/** Determine if a year's stem is 阳 (yang) */
function isYangYear(stemIndex: number): boolean {
  return stemIndex % 2 === 0
}

/** Get the stem index from a year (for year pillar calculation) */
function getYearStemIndex(year: number): number {
  return ((year - 4) % 10 + 10) % 10
}

/** Get the branch index from a year (for year pillar calculation) */
function getYearBranchIndex(year: number): number {
  return ((year - 4) % 12 + 12) % 12
}

/** Check if a date is before 立春 using the computed solar term date for the given year */
function isBeforeLiChun(year: number, month: number, day: number): boolean {
  const liChun = getSolarTerm(year, 0)
  return month < liChun.month || (month === liChun.month && day < liChun.day)
}

/** Build a pillar object */
function buildPillar(
  stemIndex: number,
  branchIndex: number,
  dayMasterIndex: number,
): BaZiPillar {
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
 * Calculate day pillar stem and branch indices.
 * Uses Zeller-like formula with reference date 1900-01-01 = 甲子日 (stem=0, branch=0).
 * Constant 693902 = days(1900,1,1) in the Zeller system.
 */
function getDayPillarIndices(year: number, month: number, day: number): [number, number] {
  let y = month <= 2 ? year - 1 : year
  let m = month <= 2 ? month + 12 : month

  const days = 365 * y
    + Math.floor(y / 4)
    - Math.floor(y / 100)
    + Math.floor(y / 400)
    + Math.floor((153 * m - 457) / 5)
    + day
    - 693902

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

/** Determine day master strength based on month order */
export function getDayMasterStrength(dayMasterWuxing: string, monthBranchIndex: number): '强' | '偏强' | '中和' | '偏弱' | '弱' {
  const monthStrength: Record<string, number[]> = {
    //   子 丑 寅 卯 辰 巳 午 未 申 酉 戌 亥
    '木': [0, -1, 2, 2, -1, -1, -1, 0, -2, -2, 0, 1],
    '火': [-1, 0, 1, 1, 0, 2, 2, 1, -1, -1, 0, -1],
    '土': [0, 1, -1, -1, 2, 1, 1, 2, 0, 0, 2, -1],
    '金': [0, 1, -2, -2, 1, -1, -1, 1, 2, 2, 1, 0],
    '水': [2, 0, -1, -1, 0, -1, -2, -1, 1, 1, 0, 2],
  }

  const strength = monthStrength[dayMasterWuxing]?.[monthBranchIndex] ?? 0
  if (strength >= 2) return '强'
  if (strength === 1) return '偏强'
  if (strength === 0) return '中和'
  if (strength === -1) return '偏弱'
  return '弱'
}

/**
 * Determine favorable and unfavorable elements based on day master strength.
 *
 * Theory:
 * - 身强/偏强: 喜克泄耗 = 官杀(克我) + 食伤(我生) + 财(我克)
 * - 身弱/偏弱: 喜扶帮 = 印(生我) + 比劫(同我)
 * - 中和: simplified balance, could require further 调候 analysis
 */
export function getFavorableElements(dayMasterWuxing: string, strength: string): [string[], string[]] {
  // 我生 (食伤/EXPRESSION): DM generates this element
  const generating: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
  // 我克 (财/WEALTH): DM controls this element
  const controlling: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }
  // 克我 (官杀/OFFICER): this element controls DM
  const controlled: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' }
  // 生我 (印/RESOURCE): this element generates DM
  const generatedBy: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' }

  if (strength === '强' || strength === '偏强') {
    // 身强喜克泄耗: 官杀(克我) + 食伤(我生) + 财(我克) are favorable
    return [
      [controlled[dayMasterWuxing], generating[dayMasterWuxing], controlling[dayMasterWuxing]],
      [dayMasterWuxing, generatedBy[dayMasterWuxing]],
    ]
  } else if (strength === '弱' || strength === '偏弱') {
    // 身弱喜扶帮: 印(生我) + 比劫(同我) are favorable
    return [
      [generatedBy[dayMasterWuxing], dayMasterWuxing],
      [controlled[dayMasterWuxing], generating[dayMasterWuxing], controlling[dayMasterWuxing]],
    ]
  } else {
    // 中和 → full analysis needed; simple balance for now
    return [[controlled[dayMasterWuxing], generating[dayMasterWuxing]], [controlling[dayMasterWuxing], dayMasterWuxing]]
  }
}

/** Compute element counts from all pillars */
function computeElementCounts(pillars: BaZiPillar[]): Record<string, number> {
  const counts: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 }
  for (const p of pillars) {
    if (!p) continue
    if (counts[p.stemWuxing] !== undefined) counts[p.stemWuxing]++
    if (counts[p.branchWuxing] !== undefined) counts[p.branchWuxing]++
    for (const hs of p.hiddenStems) {
      if (counts[hs.wuxing] !== undefined) counts[hs.wuxing]++
    }
  }
  return counts
}

/** Compute da yun (great fortune) cycles */
function computeDaYun(
  monthPillar: BaZiPillar,
  yearStemIndex: number,
  gender: '男' | '女' | null,
  birthYear: number,
): DaYunCycle[] {
  const cycles: DaYunCycle[] = []
  const yangYear = isYangYear(yearStemIndex)
  const isMale = gender === '男'
  // 阳男阴女 → 顺排, 阴男阳女 → 逆排
  const forward = (yangYear && isMale) || (!yangYear && !isMale)

  const monthStemIndex = (STEMS as readonly string[]).indexOf(monthPillar.stem)
  const monthBranchIndex = (BRANCHES as readonly string[]).indexOf(monthPillar.branch)

  // Simplified start age
  const startAge = ((birthYear * 7 + 13) % 6) + 3

  for (let i = 0; i < 8; i++) {
    const offset = forward ? i + 1 : -(i + 1)
    const stemIdx = ((monthStemIndex + offset) % 10 + 10) % 10
    const branchIdx = ((monthBranchIndex + offset) % 12 + 12) % 12
    const stem = STEMS[stemIdx]
    const branch = BRANCHES[branchIdx]
    cycles.push({
      startAge: startAge + i * 10,
      endAge: startAge + i * 10 + 9,
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
    const shortDesc = stemTenGod === '日主' ? branchTenGod : [stemTenGod, branchTenGod].filter(Boolean).join('/')
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
}

/**
 * Calculate BaZi (Four Pillars) from birth information.
 */
export function calculateBaZi(input: BaZiInput): BaZiResult {
  const { birthYear, birthMonth, birthDay, birthCalendar, birthHour, gender } = input

  // --- Year Pillar ---
  let yearStemIndex = getYearStemIndex(birthYear)
  let yearBranchIndex = getYearBranchIndex(birthYear)

  // 立春 boundary for solar calendar (compute once, reuse for month pillar)
  const beforeLiChun = birthCalendar === 'solar' && isBeforeLiChun(birthYear, birthMonth, birthDay)

  if (beforeLiChun) {
    yearStemIndex = getYearStemIndex(birthYear - 1)
    yearBranchIndex = getYearBranchIndex(birthYear - 1)
  }

  // --- Month Pillar ---
  const monthPillarYear = beforeLiChun ? birthYear - 1 : birthYear
  const monthPillarResult = getMonthPillar(monthPillarYear, birthMonth, birthDay, birthCalendar)
  const monthStemIndex = (STEMS as readonly string[]).indexOf(monthPillarResult.stem)
  const monthBranchIndex = (BRANCHES as readonly string[]).indexOf(monthPillarResult.branch)

  // --- Day Pillar ---
  const [dayStemIndex, dayBranchIndex] = getDayPillarIndices(birthYear, birthMonth, birthDay)

  // --- Hour Pillar ---
  let hourPillar: BaZiPillar | null = null
  if (birthHour !== null) {
    const hourBranchIdx = getHourBranchIndex(birthHour)
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
  const dayMasterStrength = getDayMasterStrength(dayMasterWuxing, monthBranchIndex)
  const [favorableElements, unfavorableElements] = getFavorableElements(dayMasterWuxing, dayMasterStrength)

  // Da Yun
  const rawDaYun = computeDaYun(monthPillar, yearStemIndex, gender, birthYear)
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
