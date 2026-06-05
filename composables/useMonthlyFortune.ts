// ============================================================================
// useMonthlyFortune.ts — Monthly fortune for the ShengXiao (生肖) tool
//
// Calculates a 12-month fortune breakdown by evaluating the user's birth animal
// earthly branch against each month's earthly branch (six relationships) and
// five-element interactions.
// ============================================================================

import { ANIMALS, BRANCHES, WUXING_BRANCH, STEMS } from '~/constants/bazi'
import { getMonthStemStart, getSolarTerm } from './useSolarTerms'
import {
  LIUHE_PAIRS,
  SANHE_GROUPS,
  CHONG_PAIRS,
  XING_PAIRS,
  HAI_PAIRS,
  PO_PAIRS,
} from './useShengXiao'

// === Five-element cycle maps ================================================

/** 相生 cycle: A generates B */
const SHENG_CYCLE: Record<string, string> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
}

/** 相克 cycle: A restrains B */
const KE_CYCLE: Record<string, string> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
}

// === Types ==================================================================

export interface MonthlyFortuneItem {
  monthIndex: number // 1-12 (1=寅月, 2=卯月...12=丑月)
  monthName: string // '寅月', '卯月', etc.
  monthBranch: string // '寅', '卯', etc.
  monthStem: string // heavenly stem for this month (from 五虎遁)
  gregorianLabel: string // '2/4—3/5' (approximate Gregorian range)
  score: number // 0-100
  level: '旺' | '平' | '弱'
  levelLabel: string // '运势旺盛' | '运势平稳' | '运势低迷'
  relationship: string // '六合' | '三合' | '相冲' | '相刑' | '相害' | '相破' | '无特殊关系'
  relationshipDesc: string // Human-readable description
  tip: string // One-line fortune tip
}

export interface MonthlyFortuneResult {
  year: number
  animal: string // user's zodiac animal
  animalBranch: string // user's earthly branch
  animalElement: string // user's wuxing element
  months: MonthlyFortuneItem[]
}

// === Monthly stems helper (duplicates logic from useLiuNian.ts since its ===
// === getMonthlyStems is private; keeping self-contained avoids coupling)  ===

interface MonthStemEntry {
  month: number
  stem: string
  branch: string
  startMonth: number
  startDay: number
}

function computeMonthStems(year: number): MonthStemEntry[] {
  const yearStemIndex = (((year - 4) % 10) + 10) % 10
  const monthStemStart = getMonthStemStart(yearStemIndex)
  const monthBranches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']

  // Compute precise solar-term boundaries for each month.
  // Terms 0-10 (立春 through 大雪) use the given calendar year.
  // Term 11 (小寒) falls in the NEXT calendar year.
  const termDates: Array<{ month: number; day: number }> = []
  for (let ti = 0; ti < 11; ti++) {
    termDates.push(getSolarTerm(year, ti))
  }
  termDates.push(getSolarTerm(year + 1, 11))

  return monthBranches.map((branch, i) => {
    const term = termDates[i]
    return {
      month: i + 1,
      stem: STEMS[(monthStemStart + i) % 10],
      branch,
      startMonth: term.month,
      startDay: term.day,
    }
  })
}

// === Branch relationship check helpers =====================================

function inPairList(animalIdx: number, monthIdx: number, pairs: number[][]): boolean {
  for (const [a, b] of pairs) {
    if ((animalIdx === a && monthIdx === b) || (animalIdx === b && monthIdx === a)) {
      return true
    }
  }
  return false
}

function inSameSanHeGroup(animalIdx: number, monthIdx: number): boolean {
  for (const group of SANHE_GROUPS) {
    if (group.includes(animalIdx) && group.includes(monthIdx) && animalIdx !== monthIdx) {
      return true
    }
  }
  return false
}

// === Tip generation ========================================================

function getFortuneTip(relationship: string, userElement: string, monthElement: string): string {
  // Relationship-based tips take priority
  const relationshipTips: Record<string, string> = {
    六合: '贵人相助，运势顺畅，宜积极进取',
    三合: '人缘颇佳，合作有利，宜拓展社交',
    相冲: '变动较多，宜静不宜动，谨慎应对',
    相刑: '口舌是非易生，注意人际关系',
    相害: '暗中阻碍，防小人，守成为上',
    相破: '计划易生变故，细节不可疏忽',
  }

  if (relationshipTips[relationship]) {
    return relationshipTips[relationship]
  }

  // Element-based tips for months without special branch relationship
  if (SHENG_CYCLE[monthElement] === userElement) {
    return '月令生扶，精力充沛，顺势而为'
  }
  if (SHENG_CYCLE[userElement] === monthElement) {
    return '付出较多，注意休养，量力而行'
  }
  if (KE_CYCLE[monthElement] === userElement) {
    return '压力较大，保持耐心，稳扎稳打'
  }
  if (KE_CYCLE[userElement] === monthElement) {
    return '主导局面，主动出击，把握机会'
  }
  // Same element
  return '得令当旺，运势平稳，保持节奏'
}

/** Human-readable relationship description for display */
function getRelationshipDescription(relationship: string): string {
  const descriptions: Record<string, string> = {
    六合: '与月令六合，贵人相助，运势顺畅',
    三合: '与月令三合，人缘颇佳，合作有利',
    相冲: '与月令相冲，变动较多，宜静不宜动',
    相刑: '与月令相刑，口舌是非易生',
    相害: '与月令相害，暗中阻碍，防小人',
    相破: '与月令相破，计划易生变故',
  }
  return descriptions[relationship] || ''
}

// === Main calculation function =============================================

export function calculateMonthlyFortune(
  birthYear: number,
  currentYear: number,
  animalBranch: string,
  animalElement: string,
): MonthlyFortuneResult {
  // Convert birth year to animal index (consistent with getAnimalIndex)
  const animalIdx = (((birthYear - 4) % 12) + 12) % 12
  const animalBranchIdx = BRANCHES.indexOf(animalBranch)
  const monthStems = computeMonthStems(currentYear)
  const monthNames = [
    '寅月',
    '卯月',
    '辰月',
    '巳月',
    '午月',
    '未月',
    '申月',
    '酉月',
    '戌月',
    '亥月',
    '子月',
    '丑月',
  ]

  const months: MonthlyFortuneItem[] = monthStems.map((ms, i) => {
    const monthBranchIdx = BRANCHES.indexOf(ms.branch)

    // ── Score calculation ──
    let score = 55

    // Check earth branch relationships in priority order
    let relationship = '无特殊关系'

    if (inPairList(animalBranchIdx, monthBranchIdx, LIUHE_PAIRS)) {
      relationship = '六合'
      score += 18
    } else if (inSameSanHeGroup(animalBranchIdx, monthBranchIdx)) {
      relationship = '三合'
      score += 12
    } else if (inPairList(animalBranchIdx, monthBranchIdx, CHONG_PAIRS)) {
      relationship = '相冲'
      score -= 18
    } else if (inPairList(animalBranchIdx, monthBranchIdx, XING_PAIRS)) {
      relationship = '相刑'
      score -= 14
    } else if (inPairList(animalBranchIdx, monthBranchIdx, HAI_PAIRS)) {
      relationship = '相害'
      score -= 12
    } else if (inPairList(animalBranchIdx, monthBranchIdx, PO_PAIRS)) {
      relationship = '相破'
      score -= 8
    }

    // Five-element check (only when no special branch relationship)
    if (relationship === '无特殊关系') {
      const monthElement = WUXING_BRANCH[ms.branch]
      if (SHENG_CYCLE[monthElement] === animalElement) {
        score += 6 // month generates user
      } else if (SHENG_CYCLE[animalElement] === monthElement) {
        score -= 3 // user generates month
      } else if (KE_CYCLE[monthElement] === animalElement) {
        score -= 6 // month restrains user
      } else if (KE_CYCLE[animalElement] === monthElement) {
        score += 3 // user restrains month
      } else {
        // Same element
        score += 4
      }
    }

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, Math.round(score)))

    // ── Level classification ──
    let level: '旺' | '平' | '弱'
    let levelLabel: string
    if (score >= 70) {
      level = '旺'
      levelLabel = '运势旺盛'
    } else if (score < 40) {
      level = '弱'
      levelLabel = '运势低迷'
    } else {
      level = '平'
      levelLabel = '运势平稳'
    }

    // ── Tip ──
    const tip = getFortuneTip(relationship, animalElement, WUXING_BRANCH[ms.branch])

    // ── Gregorian label ──
    // End of this month = start of next month. The last month (丑月) ends
    // at the start of the next year's 寅月 (立春).
    const nextEntry = monthStems[(i + 1) % 12]
    const gregorianLabel = `${ms.startMonth}/${ms.startDay}—${nextEntry.startMonth}/${nextEntry.startDay}`

    return {
      monthIndex: ms.month,
      monthName: monthNames[ms.month - 1],
      monthBranch: ms.branch,
      monthStem: ms.stem,
      gregorianLabel,
      score,
      level,
      levelLabel,
      relationship,
      relationshipDesc: getRelationshipDescription(relationship),
      tip,
    }
  })

  return {
    year: currentYear,
    animal: ANIMALS[animalIdx],
    animalBranch,
    animalElement,
    months,
  }
}
