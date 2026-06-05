// ── Lookup Tables ──────────────────────────────────────────────

import { ANIMALS, STEMS, BRANCHES, NAYIN_TABLE } from '~/constants/bazi'
import { getShengXiaoExplanation } from '~/constants/shengxiao'

// EMOJIS is not exported from constants/bazi — kept locally
const EMOJIS = ['🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐷'] as const

const ANIMAL_WUXING: Record<string, string> = {
  鼠: '水',
  牛: '土',
  虎: '木',
  兔: '木',
  龙: '土',
  蛇: '火',
  马: '火',
  羊: '土',
  猴: '金',
  鸡: '金',
  狗: '土',
  猪: '水',
}

const ANIMAL_DIRECTION: Record<string, string> = {
  鼠: '北',
  牛: '东北',
  虎: '东北',
  兔: '东',
  龙: '东南',
  蛇: '东南',
  马: '南',
  羊: '西南',
  猴: '西南',
  鸡: '西',
  狗: '西北',
  猪: '西北',
}

// ── Compatibility Pair Tables ─────────────────────────────────

/** 三合 groups: each group of 3 animals that harmonize */
export const SANHE_GROUPS: number[][] = [
  [0, 4, 8],
  [1, 5, 9],
  [2, 6, 10],
  [3, 7, 11],
]

/** 六合 pairs: each pair of 2 animals that harmonize */
export const LIUHE_PAIRS: number[][] = [
  [0, 1],
  [2, 11],
  [3, 10],
  [4, 9],
  [5, 8],
  [6, 7],
]

/** 相冲 pairs: clashing animals */
export const CHONG_PAIRS: number[][] = [
  [0, 6],
  [1, 7],
  [2, 8],
  [3, 9],
  [4, 10],
  [5, 11],
]

/** 相害 pairs: harming animals */
export const HAI_PAIRS: number[][] = [
  [0, 7],
  [1, 6],
  [2, 5],
  [3, 4],
  [8, 11],
  [9, 10],
]

// ── TaiSui Relationship Tables ─────────────────────────────────
// These define all standard Earthly Branch relationships used to
// compute fortune by comparing the user's birth animal branch with
// the current year's TaiSui (Grand Duke Jupiter) branch.

/** 值太岁: same branch as TaiSui (本命年) */
function isZhiTaiSui(myIdx: number, taiSuiIdx: number): boolean {
  return myIdx === taiSuiIdx
}

/** 刑太岁: punishment branches (三刑 + 自刑) */
export const XING_PAIRS: number[][] = [
  [0, 3],
  [2, 5],
  [5, 8],
  [2, 8],
  [1, 10],
  [10, 7],
  [1, 7],
]
export const SELF_XING: number[] = [4, 6, 9, 11] // 辰/午/酉/亥 self-punishment

/** 破太岁: break/destruction branches (六破) */
export const PO_PAIRS: number[][] = [
  [0, 9],
  [2, 11],
  [4, 1],
  [6, 3],
  [8, 5],
  [10, 7],
]

// ── Relationship scoring weights ──────────────────────────────

/**
 * Check if myIdx is paired with taiSuiIdx in the given pair list.
 */
function inPairList(myIdx: number, taiSuiIdx: number, pairs: number[][]): boolean {
  for (const [a, b] of pairs) {
    if ((myIdx === a && taiSuiIdx === b) || (myIdx === b && taiSuiIdx === a)) {
      return true
    }
  }
  return false
}

/**
 * Check if myIdx and taiSuiIdx are in the same three-harmony group.
 */
function inSameSanHeGroup(myIdx: number, taiSuiIdx: number): boolean {
  for (const group of SANHE_GROUPS) {
    if (group.includes(myIdx) && group.includes(taiSuiIdx)) {
      return true
    }
  }
  return false
}

/**
 * Score weight for each TaiSui relationship type.
 * Positive = auspicious, negative = inauspicious.
 * Values informed by traditional Chinese zodiac theory.
 */
const RELATIONSHIP_WEIGHTS: Record<string, number> = {
  值太岁: -20,
  冲太岁: -15,
  刑太岁: -12,
  害太岁: -10,
  破太岁: -8,
  三合: +15,
  六合: +10,
  平: 0,
}

/**
 * Determine all TaiSui relationships between a birth animal and the current year animal.
 * Returns both the primary positive and negative relationships if both exist.
 */
function getTaiSuiRelationships(
  birthIdx: number,
  taiSuiIdx: number,
): { positive: string; positiveWeight: number; negative: string; negativeWeight: number } {
  let positive = '平'
  let positiveWeight = 0
  let negative = '平'
  let negativeWeight = 0

  // Check negative relationships (most severe first)
  if (isZhiTaiSui(birthIdx, taiSuiIdx)) {
    negative = '值太岁'
    negativeWeight = RELATIONSHIP_WEIGHTS['值太岁']
  }
  if (inPairList(birthIdx, taiSuiIdx, CHONG_PAIRS)) {
    if (negativeWeight === 0) {
      negative = '冲太岁'
      negativeWeight = RELATIONSHIP_WEIGHTS['冲太岁']
    } else {
      negative += '、冲太岁'
      negativeWeight += RELATIONSHIP_WEIGHTS['冲太岁'] * 0.5
    }
  }
  if (
    inPairList(birthIdx, taiSuiIdx, XING_PAIRS) ||
    (SELF_XING.includes(birthIdx) && birthIdx === taiSuiIdx)
  ) {
    if (negativeWeight === 0) {
      negative = '刑太岁'
      negativeWeight = RELATIONSHIP_WEIGHTS['刑太岁']
    } else {
      negative += '、刑太岁'
      negativeWeight += RELATIONSHIP_WEIGHTS['刑太岁'] * 0.5
    }
  }
  if (inPairList(birthIdx, taiSuiIdx, HAI_PAIRS)) {
    if (negativeWeight === 0) {
      negative = '害太岁'
      negativeWeight = RELATIONSHIP_WEIGHTS['害太岁']
    } else {
      negative += '、害太岁'
      negativeWeight += RELATIONSHIP_WEIGHTS['害太岁'] * 0.5
    }
  }
  if (inPairList(birthIdx, taiSuiIdx, PO_PAIRS)) {
    if (negativeWeight === 0) {
      negative = '破太岁'
      negativeWeight = RELATIONSHIP_WEIGHTS['破太岁']
    } else {
      negative += '、破太岁'
      negativeWeight += RELATIONSHIP_WEIGHTS['破太岁'] * 0.5
    }
  }

  // Check positive relationships
  if (inSameSanHeGroup(birthIdx, taiSuiIdx) && birthIdx !== taiSuiIdx) {
    positive = '三合'
    positiveWeight = RELATIONSHIP_WEIGHTS['三合']
  } else if (inPairList(birthIdx, taiSuiIdx, LIUHE_PAIRS)) {
    positive = '六合'
    positiveWeight = RELATIONSHIP_WEIGHTS['六合']
  }

  return { positive, positiveWeight, negative, negativeWeight }
}

/**
 * Compute a single fortune dimension score using the TaiSui relationship system.
 * Base = 65. Adjusts with TaiSui relationship weights and a per-dimension
 * deterministic modifier derived from the birth year stem and current year.
 */
function computeFortuneScore(
  baseScore: number,
  posWeight: number,
  negWeight: number,
  dimensionSeed: number,
): number {
  // Combine positive and negative: if both exist, the dominant one
  // applies at full weight and the other at 40%
  let adjustment: number
  if (posWeight > 0 && negWeight < 0) {
    adjustment = posWeight * 0.6 + negWeight * 0.4
  } else if (posWeight > 0) {
    adjustment = posWeight
  } else if (negWeight < 0) {
    adjustment = negWeight
  } else {
    adjustment = 0
  }

  // Per-dimension deterministic variation (±8 range)
  const dimVar = ((dimensionSeed * 7 + 13) % 17) - 8

  return Math.round(Math.max(30, Math.min(90, baseScore + adjustment + dimVar)))
}

// ── Personality Data ──────────────────────────────────────────

const PERSONALITY_PRO: Record<string, string[]> = {
  鼠: ['聪明机智', '适应力强', '社交活跃', '观察敏锐'],
  牛: ['勤劳踏实', '意志坚定', '忠诚可靠', '耐心细致'],
  虎: ['勇敢自信', '领导力强', '热情慷慨', '正义感强'],
  兔: ['温柔善良', '心思细腻', '品味优雅', '谨慎稳重'],
  龙: ['自信热情', '富有创意', '气度不凡', '领导才能'],
  蛇: ['智慧深邃', '神秘优雅', '直觉敏锐', '沉静内敛'],
  马: ['奔放自由', '热情开朗', '行动力强', '善于交际'],
  羊: ['温和善良', '艺术天赋', '体贴温柔', '坚韧耐心'],
  猴: ['聪明灵活', '幽默风趣', '创新能力强', '社交达人'],
  鸡: ['勤奋认真', '自信果断', '观察力强', '守时守信'],
  狗: ['忠诚正直', '责任心强', '善良可靠', '守护意识'],
  猪: ['诚实宽容', '乐观豁达', '温和敦厚', '知足常乐'],
}

const PERSONALITY_CON: Record<string, string[]> = {
  鼠: ['多疑谨慎', '目光短浅', '善变不定', '爱占小利'],
  牛: ['固执刻板', '不善变通', '缺乏浪漫', '严肃寡言'],
  虎: ['冲动急躁', '好胜心强', '容易冒险', '霸道专断'],
  兔: ['优柔寡断', '保守怯懦', '逃避现实', '敏感多虑'],
  龙: ['傲慢自负', '急躁冲动', '好高骛远', '不够务实'],
  蛇: ['多疑猜忌', '冷漠孤僻', '占有欲强', '过于谨慎'],
  马: ['急躁冲动', '缺乏耐心', '半途而废', '情绪起伏'],
  羊: ['优柔寡断', '依赖性强', '悲观消极', '缺乏主见'],
  猴: ['浮躁善变', '好胜心强', '缺乏恒心', '爱耍小聪明'],
  鸡: ['挑剔苛刻', '爱炫耀', '固执己见', '过于现实'],
  狗: ['固执保守', '多虑焦虑', '批评性强', '过于忠诚'],
  猪: ['懒惰贪图', '容易轻信', '固执己见', '缺乏紧迫感'],
}

// ── Lucky Data ────────────────────────────────────────────────

const LUCKY_DATA: Record<string, { numbers: number[]; colors: string[]; direction: string }> = {
  鼠: { numbers: [2, 3], colors: ['蓝色', '金色'], direction: '东南' },
  牛: { numbers: [1, 9], colors: ['绿色', '金色'], direction: '西南' },
  虎: { numbers: [1, 3, 5], colors: ['绿色', '蓝色'], direction: '东北' },
  兔: { numbers: [3, 6, 9], colors: ['绿色', '蓝色'], direction: '东' },
  龙: { numbers: [1, 6, 7], colors: ['金色', '银色'], direction: '东南' },
  蛇: { numbers: [2, 8, 9], colors: ['红色', '黄色'], direction: '南' },
  马: { numbers: [2, 3, 7], colors: ['红色', '绿色'], direction: '南' },
  羊: { numbers: [2, 7], colors: ['绿色', '红色'], direction: '西南' },
  猴: { numbers: [1, 4, 7], colors: ['金色', '蓝色'], direction: '西' },
  鸡: { numbers: [5, 7, 8], colors: ['金色', '黄色'], direction: '西' },
  狗: { numbers: [3, 4, 9], colors: ['绿色', '红色'], direction: '西北' },
  猪: { numbers: [1, 2, 9], colors: ['金色', '蓝色'], direction: '北' },
}

// ── Types ─────────────────────────────────────────────────────

export interface FortuneDimension {
  level: string
  score: number
}

export interface Fortune {
  career: FortuneDimension
  wealth: FortuneDimension
  love: FortuneDimension
  health: FortuneDimension
}

export interface Compatibility {
  animal: string
  emoji: string
  relation: '三合' | '六合' | '中吉' | '相冲' | '相害'
  level: 'great' | 'good' | 'bad'
  explanation: string
}

export interface Lucky {
  numbers: number[]
  colors: string[]
  direction: string
}

export interface TaiSuiRelationships {
  currentYear: number
  positive: string
  negative: string
}

export interface ShengXiaoResult {
  year: number
  animal: string
  animalEmoji: string
  heavenlyStem: string
  earthlyBranch: string
  stemBranch: string
  wuXing: string
  naYin: string
  direction: string
  yangOrYin: string
  fortune: Fortune
  compatibility: Compatibility[]
  personalityPro: string[]
  personalityCon: string[]
  lucky: Lucky
  taiSuiRelationships: TaiSuiRelationships
}

// ── Helper Functions ──────────────────────────────────────────

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function getAnimalIndex(year: number): number {
  return mod(year - 4, 12)
}

function getStemIndex(year: number): number {
  return mod(year - 4, 10)
}

/**
 * Calculate the sexagenary cycle position (0-59) from stem and branch indices.
 * Solves P % 10 = stemIndex, P % 12 = branchIndex using CRT.
 */
function getSexagenaryPosition(stemIndex: number, branchIndex: number): number {
  // P ≡ stemIndex (mod 10), P ≡ branchIndex (mod 12)
  // Since gcd(10, 12) = 2, a solution exists only when indices have the same parity
  if ((stemIndex - branchIndex) % 2 !== 0) return 0 // invalid sexagenary pair
  const diff = stemIndex - branchIndex
  const k = mod(diff / 2, 6)
  return mod(stemIndex + 10 * k, 60)
}

function getFortuneLevel(score: number): string {
  if (score >= 75) return '大吉'
  if (score >= 60) return '中吉'
  if (score >= 45) return '小吉'
  return '平'
}

function getCompatibility(animalIndex: number): Compatibility[] {
  const result: Compatibility[] = []
  const addedIndices = new Set<number>()

  // 1. 三合 (great harmony) — add the other two in the group
  for (const group of SANHE_GROUPS) {
    if (group.includes(animalIndex)) {
      for (const idx of group) {
        if (idx !== animalIndex && !addedIndices.has(idx)) {
          addedIndices.add(idx)
          result.push({
            animal: ANIMALS[idx],
            emoji: EMOJIS[idx],
            relation: '三合',
            level: 'great',
            explanation: getShengXiaoExplanation('三合'),
          })
        }
      }
      break
    }
  }

  // 2. 六合 (personal harmony) — add the paired animal
  for (const pair of LIUHE_PAIRS) {
    if (pair.includes(animalIndex)) {
      const partner = pair[0] === animalIndex ? pair[1] : pair[0]
      if (!addedIndices.has(partner)) {
        addedIndices.add(partner)
        result.push({
          animal: ANIMALS[partner],
          emoji: EMOJIS[partner],
          relation: '六合',
          level: 'great',
          explanation: getShengXiaoExplanation('六合'),
        })
      }
      break
    }
  }

  // 3. 相冲 (clash) — bad relation
  for (const pair of CHONG_PAIRS) {
    if (pair.includes(animalIndex)) {
      const partner = pair[0] === animalIndex ? pair[1] : pair[0]
      if (!addedIndices.has(partner)) {
        addedIndices.add(partner)
        result.push({
          animal: ANIMALS[partner],
          emoji: EMOJIS[partner],
          relation: '相冲',
          level: 'bad',
          explanation: getShengXiaoExplanation('相冲'),
        })
      }
      break
    }
  }

  // 4. 相害 (harm) — bad relation
  for (const pair of HAI_PAIRS) {
    if (pair.includes(animalIndex)) {
      const partner = pair[0] === animalIndex ? pair[1] : pair[0]
      if (!addedIndices.has(partner)) {
        addedIndices.add(partner)
        result.push({
          animal: ANIMALS[partner],
          emoji: EMOJIS[partner],
          relation: '相害',
          level: 'bad',
          explanation: getShengXiaoExplanation('相害'),
        })
      }
      break
    }
  }

  // 5. Fill remaining slots with 中吉 (good) using remaining animals
  if (result.length < 6) {
    for (let i = 0; i < 12; i++) {
      if (i !== animalIndex && !addedIndices.has(i)) {
        addedIndices.add(i)
        result.push({
          animal: ANIMALS[i],
          emoji: EMOJIS[i],
          relation: '中吉',
          level: 'good',
          explanation: getShengXiaoExplanation('中吉'),
        })
        if (result.length >= 6) break
      }
    }
  }

  return result
}

// ── Main Function ─────────────────────────────────────────────

export function calculateShengXiao(birthYear: number, currentDate?: Date): ShengXiaoResult {
  // ── Determine animal index ──
  const animalIndex = getAnimalIndex(birthYear)

  // ── Basic fields ──
  const animal = ANIMALS[animalIndex]
  const animalEmoji = EMOJIS[animalIndex]
  const earthlyBranch = BRANCHES[animalIndex]

  // ── Heavenly stem from birth year ──
  const stemIndex = getStemIndex(birthYear)
  const heavenlyStem = STEMS[stemIndex]
  const stemBranch = heavenlyStem + earthlyBranch

  // ── Sexagenary cycle & NaYin ──
  const sexagenaryPosition = getSexagenaryPosition(stemIndex, animalIndex)
  const nayinIndex = Math.floor(sexagenaryPosition / 2)
  const naYin = NAYIN_TABLE[nayinIndex] || ''

  // ── WuXing & Direction ──
  const wuXing = ANIMAL_WUXING[animal]
  const direction = ANIMAL_DIRECTION[animal]

  // ── Yin/Yang ──
  const yangOrYin = stemIndex % 2 === 0 ? '阳' : '阴'

  // ── Fortune (TaiSui-based) ──
  const currentYear = currentDate ? currentDate.getFullYear() : birthYear
  const taiSuiIdx = getAnimalIndex(currentYear)
  const taiSuiRelationships = getTaiSuiRelationships(animalIndex, taiSuiIdx)
  const { positiveWeight, negativeWeight } = taiSuiRelationships

  const careerScore = computeFortuneScore(
    65,
    positiveWeight,
    negativeWeight,
    birthYear * 19 + animalIndex * 7 + 1,
  )
  const wealthScore = computeFortuneScore(
    65,
    positiveWeight,
    negativeWeight,
    birthYear * 23 + animalIndex * 11 + 2,
  )
  const loveScore = computeFortuneScore(
    65,
    positiveWeight,
    negativeWeight,
    birthYear * 29 + animalIndex * 13 + 3,
  )
  const healthScore = computeFortuneScore(
    65,
    positiveWeight,
    negativeWeight,
    birthYear * 31 + animalIndex * 17 + 4,
  )

  // ── Compatibility ──
  const compatibility = getCompatibility(animalIndex)

  // ── Personality ──
  const personalityPro = PERSONALITY_PRO[animal]
  const personalityCon = PERSONALITY_CON[animal]

  // ── Lucky ──
  const lucky = { ...LUCKY_DATA[animal] }

  return {
    year: birthYear,
    animal,
    animalEmoji,
    heavenlyStem,
    earthlyBranch,
    stemBranch,
    wuXing,
    naYin,
    direction,
    yangOrYin,
    fortune: {
      career: { score: careerScore, level: getFortuneLevel(careerScore) },
      wealth: { score: wealthScore, level: getFortuneLevel(wealthScore) },
      love: { score: loveScore, level: getFortuneLevel(loveScore) },
      health: { score: healthScore, level: getFortuneLevel(healthScore) },
    },
    compatibility,
    personalityPro,
    personalityCon,
    lucky,
    taiSuiRelationships: {
      currentYear,
      positive: taiSuiRelationships.positive,
      negative: taiSuiRelationships.negative,
    },
  }
}
