// ═══════════════════════════════════════════════════════════════
// 八字合婚（婚姻匹配）计算引擎
// ═══════════════════════════════════════════════════════════════
//
// 算法溯源详见 constants/hehun.ts 头部注释块。
//
// 核心算法逻辑：
//   1. 年柱关系（天干合克 + 地支合冲刑害）→ 权重 15
//   2. 日柱关系（日干合克 + 日支关系）→ 权重 25（核心）
//   3. 五行互补（用神/忌神是否互补）→ 权重 20
//   4. 纳音相生克                  → 权重 10
//   5. 十神配偶星状态              → 权重 15
//   6. 婚煞检查（孤辰寡宿/阴差阳错/孤鸾等）→ 权重 10
//   7. 生肖配对                    → 权重 5
//
// 总分 100，按维度加权叠加 + 婚煞扣分。

import { calculateBaZi, type BaZiResult } from './useBaZi'
import { parseDate } from '~/utils/date'
import {
  HEHUN_WEIGHTS, STEM_FIVE_COMBINE, STEM_CONFLICT, STEM_GENERATE,
  BRANCH_SIX_COMBINE, BRANCH_TRIPLE_COMBINE,
  BRANCH_SIX_CONFLICT, BRANCH_SIX_HARM, BRANCH_PUNISHMENT,
  WUXING_GENERATE, WUXING_CONFLICT, getNayinWuxing,
  GUCHEN_GUASU, YINCHA_YANGCUO_DAYS, SHIE_DAIBAI_DAYS,
  GULUAN_DAYS, BAZHUAN_DAYS, JIUCHOU_DAYS,
  getHeHunGrade, type HeHunGrade,
} from '~/constants/hehun'
import { getNayinPersonality } from '~/constants/stem-animal'

// ── Types ─────────────────────────────────────────────

export interface PersonInfo {
  /** 出生年 */
  year: number
  /** 出生月（1-12） */
  month: number
  /** 出生日 */
  day: number
  /** 出生时辰（0-23，null=未知） */
  hour: number | null
  /** 性别 */
  gender: '男' | '女'
  /** 历法 */
  calendar: 'solar' | 'lunar'
  /** 昵称（可选） */
  nickname?: string
}

export interface PillarRelation {
  /** 维度名 */
  name: string
  /** 关系描述 */
  relation: string
  /** 评分（-15 ~ +15） */
  score: number
  /** 吉凶 */
  level: '吉' | '凶' | '中'
  /** 详细说明 */
  detail: string
}

export interface HeHunDimension {
  name: string
  score: number
  maxScore: number
  level: '吉' | '凶' | '中'
  details: string[]
  /** 子项分析 */
  items?: PillarRelation[]
}

export interface HeHunResult {
  /** 综合总分 (0-100) */
  totalScore: number
  /** 等级 */
  grade: HeHunGrade
  /** 各维度评分 */
  dimensions: HeHunDimension[]
  /** 八字结果（A） */
  baziA: BaZiResult
  /** 八字结果（B） */
  baziB: BaZiResult
  /** 总结 */
  summary: string
  /** 建议 */
  suggestions: string[]
  /** 注意事项 */
  warnings: string[]
}

// ════════════════════════════════════════
// 内部评分工具
// ════════════════════════════════════════

function getLevel(score: number, maxScore: number): '吉' | '凶' | '中' {
  const ratio = maxScore > 0 ? score / maxScore : 0
  if (ratio >= 0.6) return '吉'
  if (ratio <= 0.3) return '凶'
  return '中'
}

// ════════════════════════════════════════
// 年柱分析
// ════════════════════════════════════════

function analyzeYearPillar(
  stemA: string, branchA: string,
  stemB: string, branchB: string,
): HeHunDimension & { items: PillarRelation[] } {
  const maxScore = HEHUN_WEIGHTS.YEAR_PILLAR
  const items: PillarRelation[] = []
  let total = 0

  // 1. 天干合
  if (STEM_FIVE_COMBINE[stemA] === stemB) {
    items.push({ name: '天干五合', relation: `${stemA}${stemB}合`, score: 6, level: '吉', detail: '天干五合，气运相通。' })
    total += 6
  } else if (STEM_GENERATE[stemA]?.includes(stemB)) {
    items.push({ name: '天干相生', relation: `${stemA}生${stemB}`, score: 3, level: '吉', detail: '天干相生，彼此助益。' })
    total += 3
  } else if (STEM_CONFLICT[stemA]?.includes(stemB)) {
    items.push({ name: '天干相克', relation: `${stemA}克${stemB}`, score: -4, level: '凶', detail: '天干相克，气场相悖，易生口角。' })
    total -= 4
  } else {
    items.push({ name: '天干比和', relation: `${stemA}${stemB}平`, score: 0, level: '中', detail: '天干比和，无大碍。' })
  }

  // 2. 地支六合
  if (BRANCH_SIX_COMBINE[branchA] === branchB) {
    items.push({ name: '地支六合', relation: `${branchA}${branchB}六合`, score: 6, level: '吉', detail: '地支六合，根基稳固。' })
    total += 6
  } else if (BRANCH_TRIPLE_COMBINE[branchA]?.includes(branchB)) {
    items.push({ name: '地支三合', relation: `${branchA}${branchB}三合`, score: 4, level: '吉', detail: '地支三合，气场相投。' })
    total += 4
  } else if (BRANCH_SIX_CONFLICT[branchA] === branchB) {
    items.push({ name: '地支六冲', relation: `${branchA}${branchB}冲`, score: -6, level: '凶', detail: '地支相冲，根基动摇，家宅难安。' })
    total -= 6
  } else if (BRANCH_SIX_HARM[branchA] === branchB) {
    items.push({ name: '地支六害', relation: `${branchA}${branchB}害`, score: -4, level: '凶', detail: '地支相害，暗生嫌隙。' })
    total -= 4
  } else if (BRANCH_PUNISHMENT[branchA]?.includes(branchB)) {
    items.push({ name: '地支相刑', relation: `${branchA}${branchB}刑`, score: -3, level: '凶', detail: '地支相刑，易生矛盾。' })
    total -= 3
  } else {
    items.push({ name: '地支平和', relation: `${branchA}${branchB}平`, score: 1, level: '中', detail: '地支平和，无冲无克。' })
    total += 1
  }

  // 3. 生肖三合六合冲害（额外检查）
  const branchIndexA = '子丑寅卯辰巳午未申酉戌亥'.indexOf(branchA)
  const branchIndexB = '子丑寅卯辰巳午未申酉戌亥'.indexOf(branchB)
  const animalSixCombine = (['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'] as const)
  const animalPair = `${branchA}${branchB}`
  const animalPairRev = `${branchB}${branchA}`
  const isAnimalSixCombine = animalSixCombine.some(p => p === animalPair || p === animalPairRev)

  // 生肖已在年支中涵盖，不重复计分

  const score = Math.max(-maxScore, Math.min(maxScore, total))

  return {
    name: '年柱相合',
    score,
    maxScore,
    level: getLevel(score, maxScore),
    details: items.map(i => i.detail),
    items,
  }
}

// ════════════════════════════════════════
// 日柱分析（核心，双倍权重）
// ════════════════════════════════════════

function analyzeDayPillar(
  stemA: string, branchA: string,
  stemB: string, branchB: string,
  stemBranchA: string, stemBranchB: string,
): HeHunDimension & { items: PillarRelation[] } {
  const maxScore = HEHUN_WEIGHTS.DAY_PILLAR
  const items: PillarRelation[] = []
  let total = 0

  // 1. 日干五合（最重要）
  if (STEM_FIVE_COMBINE[stemA] === stemB) {
    items.push({ name: '日干五合', relation: `${stemA}${stemB}合`, score: 10, level: '吉', detail: '日干五合，夫妻情深意笃，情感默契。' })
    total += 10
  } else if (STEM_GENERATE[stemA]?.includes(stemB)) {
    items.push({ name: '日干相生', relation: `${stemA}生${stemB}`, score: 6, level: '吉', detail: '日干相生，互敬互爱，扶持成长。' })
    total += 6
  } else if (STEM_CONFLICT[stemA]?.includes(stemB)) {
    items.push({ name: '日干相克', relation: `${stemA}克${stemB}`, score: -6, level: '凶', detail: '日干相克，夫妻观念分歧大，易生冲突。' })
    total -= 6
  } else {
    items.push({ name: '日干比和', relation: `${stemA}${stemB}平`, score: 1, level: '中', detail: '日干比和，个性相近，但需注意互不相让。' })
    total += 1
  }

  // 2. 日支关系（夫妻宫）
  if (BRANCH_SIX_COMBINE[branchA] === branchB) {
    items.push({ name: '日支六合', relation: `${branchA}${branchB}合`, score: 8, level: '吉', detail: '夫妻宫六合，家庭根基牢固，婚姻稳定。' })
    total += 8
  } else if (BRANCH_TRIPLE_COMBINE[branchA]?.includes(branchB)) {
    items.push({ name: '日支三合', relation: `${branchA}${branchB}三合`, score: 6, level: '吉', detail: '夫妻宫三合，气场相投，志趣相合。' })
    total += 6
  } else if (BRANCH_SIX_CONFLICT[branchA] === branchB) {
    items.push({ name: '日支六冲', relation: `${branchA}${branchB}冲`, score: -10, level: '凶', detail: '夫妻宫相冲，婚姻多波折，宜慎之。' })
    total -= 10
  } else if (BRANCH_SIX_HARM[branchA] === branchB) {
    items.push({ name: '日支六害', relation: `${branchA}${branchB}害`, score: -6, level: '凶', detail: '夫妻宫相害，易生嫌隙，需多沟通。' })
    total -= 6
  } else if (BRANCH_PUNISHMENT[branchA]?.includes(branchB)) {
    items.push({ name: '日支相刑', relation: `${branchA}${branchB}刑`, score: -4, level: '凶', detail: '夫妻宫相刑，因小事生摩擦。' })
    total -= 4
  } else {
    items.push({ name: '日支平和', relation: `平和`, score: 2, level: '吉', detail: '夫妻宫平和，无冲无克。' })
    total += 2
  }

  // 3. 阴差阳错日检查
  if (YINCHA_YANGCUO_DAYS.has(stemBranchA)) {
    items.push({ name: '日柱神煞', relation: '阴差阳错', score: -3, level: '凶', detail: 'A方阴差阳错日，婚姻易有波折。' })
    total -= 3
  }
  if (YINCHA_YANGCUO_DAYS.has(stemBranchB)) {
    items.push({ name: '日柱神煞', relation: '阴差阳错', score: -3, level: '凶', detail: 'B方阴差阳错日，婚姻易有波折。' })
    total -= 3
  }

  // 4. 孤鸾日
  if (GULUAN_DAYS.has(stemBranchA) || GULUAN_DAYS.has(stemBranchB)) {
    items.push({ name: '日柱神煞', relation: '孤鸾', score: -2, level: '凶', detail: '一方犯孤鸾，情路较为坎坷。' })
    total -= 2
  }

  const score = Math.max(-maxScore, Math.min(maxScore, total))

  return {
    name: '日柱（夫妻宫）',
    score,
    maxScore,
    level: getLevel(score, maxScore),
    details: items.map(i => i.detail),
    items,
  }
}

// ════════════════════════════════════════
// 五行互补分析
// ════════════════════════════════════════

function analyzeElementComplement(
  favorableA: string[], unfavorableA: string[],
  favorableB: string[], unfavorableB: string[],
  elementCountsA: Record<string, number>,
  elementCountsB: Record<string, number>,
): HeHunDimension {
  const maxScore = HEHUN_WEIGHTS.ELEMENT_COMPLEMENT
  const details: string[] = []
  let score = 0

  // 1. 用神互补：A的用神是否为B的忌神
  const favorableSetA = new Set(favorableA)
  const favorableSetB = new Set(favorableB)
  const unfavorableSetA = new Set(unfavorableA)
  const unfavorableSetB = new Set(unfavorableB)

  // A用神为B所克（即B能补A）
  const complementAB = favorableA.filter(el => unfavorableSetB.has(el))
  const complementBA = favorableB.filter(el => unfavorableSetA.has(el))

  if (complementAB.length > 0 && complementBA.length > 0) {
    score += 10
    details.push(`喜用神双向互补：A需${complementAB.join('、')}，B需${complementBA.join('、')}，彼此互济。`)
  } else if (complementAB.length > 0) {
    score += 5
    details.push(`A之喜用神（${complementAB.join('、')}）恰为B所克，B可补A之不足。`)
  } else if (complementBA.length > 0) {
    score += 5
    details.push(`B之喜用神（${complementBA.join('、')}）恰为A所克，A可补B之不足。`)
  } else {
    score -= 3
    details.push('暂无明显的五行互补关系。')
  }

  // 2. 五行流通检查：是否形成相生链
  const allElements = ['金', '木', '水', '火', '土']
  const dominantA = allElements.reduce((a, b) => (elementCountsA[a] || 0) >= (elementCountsB[b] || 0) ? a : b)
  const dominantB = allElements.reduce((a, b) => (elementCountsB[a] || 0) >= (elementCountsB[b] || 0) ? a : b)

  // 检查一方强元素是否生另一方弱元素
  if (WUXING_GENERATE[dominantA] && favorableSetB.has(WUXING_GENERATE[dominantA])) {
    score += 5
    details.push(`A之强${dominantA}生B之${WUXING_GENERATE[dominantA]}，五行流通有情。`)
  }
  if (WUXING_GENERATE[dominantB] && favorableSetA.has(WUXING_GENERATE[dominantB])) {
    score += 5
    details.push(`B之强${dominantB}生A之${WUXING_GENERATE[dominantB]}，五行流通有情。`)
  }

  // 3. 五行偏枯检查
  const weakCountA = allElements.filter(el => (elementCountsA[el] || 0) === 0).length
  const weakCountB = allElements.filter(el => (elementCountsB[el] || 0) === 0).length
  if (weakCountA >= 3 && weakCountB >= 3) {
    const missingA = allElements.filter(el => (elementCountsA[el] || 0) === 0)
    const missingB = allElements.filter(el => (elementCountsB[el] || 0) === 0)
    const commonMissing = missingA.filter(el => missingB.includes(el))
    if (commonMissing.length > 0) {
      score -= 3
      details.push(`双方同缺${commonMissing.join('、')}，五行偏枯相似，需注意调和。`)
    }
  }

  return {
    name: '五行互补',
    score: Math.max(-maxScore, Math.min(maxScore, score)),
    maxScore,
    level: getLevel(score, maxScore),
    details: details.length > 0 ? details : ['五行无明显互补关系。'],
  }
}

// ════════════════════════════════════════
// 纳音相生克分析
// ════════════════════════════════════════

function analyzeNayin(
  stemBranchA: string,
  stemBranchB: string,
): HeHunDimension {
  const maxScore = HEHUN_WEIGHTS.NAYIN
  const details: string[] = []
  let score = 0

  const nayinA = getNayinPersonality(stemBranchA)
  const nayinB = getNayinPersonality(stemBranchB)

  if (nayinA && nayinB) {
    const wxA = getNayinWuxing(nayinA.nayin)
    const wxB = getNayinWuxing(nayinB.nayin)

    if (WUXING_GENERATE[wxA] === wxB) {
      score += 8
      details.push(`A纳音${nayinA.nayin}（${wxA}）生B纳音${nayinB.nayin}（${wxB}），上吉。`)
    } else if (WUXING_GENERATE[wxB] === wxA) {
      score += 6
      details.push(`B纳音${nayinB.nayin}（${wxB}）生A纳音${nayinA.nayin}（${wxA}），为吉。`)
    } else if (WUXING_CONFLICT[wxA] === wxB) {
      score -= 5
      details.push(`A纳音${nayinA.nayin}（${wxA}）克B纳音${nayinB.nayin}（${wxB}），相克不利。`)
    } else if (WUXING_CONFLICT[wxB] === wxA) {
      score -= 3
      details.push(`B纳音${nayinB.nayin}（${wxB}）克A纳音${nayinA.nayin}（${wxA}），相克不利。`)
    } else {
      score += 2
      details.push(`A之${nayinA.nayin}（${wxA}）与B之${nayinB.nayin}（${wxB}）平和无克。`)
    }
  } else {
    details.push('纳音信息不足，无法分析。')
  }

  return {
    name: '纳音相生克',
    score: Math.max(-maxScore, Math.min(maxScore, score)),
    maxScore,
    level: getLevel(score, maxScore),
    details,
  }
}

// ════════════════════════════════════════
// 十神配偶星分析
// ════════════════════════════════════════

function analyzeTenGod(
  genderA: '男' | '女',
  genderB: '男' | '女',
  baziA: BaZiResult,
  baziB: BaZiResult,
): HeHunDimension {
  const maxScore = HEHUN_WEIGHTS.TEN_GOD
  const details: string[] = []
  let score = 0

  // 配偶星规则：
  //   男命：我克者为财，日主阳→偏财（同阴阳），日主阴→正财（异阴阳）
  //   女命：克我者为官杀，日主阳→七杀（同阴阳），日主阴→正官（异阴阳）
  const getSpouseStar = (gender: '男' | '女', bazi: BaZiResult): string[] => {
    const dayStem = bazi.dayPillar.stem
    const dayStemIdx = '甲乙丙丁戊己庚辛壬癸'.indexOf(dayStem)
    if (dayStemIdx === -1) return []
    const stemYinYang = ['阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴']
    const yy = stemYinYang[dayStemIdx]

    if (gender === '男') {
      // 偏财（同阴阳）、正财（异阴阳）
      return yy === '阳' ? ['偏财'] : ['正财']
    } else {
      // 七杀（同阴阳）、正官（异阴阳）
      return yy === '阳' ? ['七杀'] : ['正官']
    }
  }

  // 简化版：检查四柱中配偶星状况
  const pillarsA = [baziA.yearPillar, baziA.monthPillar, baziA.dayPillar]
  const pillarsB = [baziB.yearPillar, baziB.monthPillar, baziB.dayPillar]
  if (baziA.hourPillar) pillarsA.push(baziA.hourPillar)
  if (baziB.hourPillar) pillarsB.push(baziB.hourPillar)

  // A的配偶星状况
  const spouseStemA = genderA === '男' ? '正财' : '正官'
  const spouseStemB = genderB === '男' ? '正财' : '正官'

  const spouseCountA = pillarsA.filter(p =>
    p.stemTenGod === spouseStemA || p.branchTenGod === spouseStemA
  ).length
  const spouseCountB = pillarsB.filter(p =>
    p.stemTenGod === spouseStemB || p.branchTenGod === spouseStemB
  ).length

  if (spouseCountA > 0 && spouseCountB > 0) {
    score += 5
    details.push(`A（${genderA}）有${spouseStemA}出现，B（${genderB}）有${spouseStemB}出现，配偶星明朗。`)
  } else if (spouseCountA > 0) {
    score += 2
    details.push(`A（${genderA}）有${spouseStemA}出现，配偶缘分清晰。`)
  } else if (spouseCountB > 0) {
    score += 2
    details.push(`B（${genderB}）有${spouseStemB}出现，配偶缘分清晰。`)
  } else {
    score -= 3
    details.push('双方配偶星不显，姻缘较为被动。')
  }

  // 女命伤官见官检查
  if (genderA === '女') {
    const hasShangGuan = pillarsA.some(p => p.stemTenGod === '伤官')
    const hasZhengGuan = pillarsA.some(p => p.stemTenGod === '正官')
    if (hasShangGuan && hasZhengGuan) {
      score -= 5
      details.push('A方女命伤官见官，感情易生波折，宜包容克制。')
    }
  }
  if (genderB === '女') {
    const hasShangGuan = pillarsB.some(p => p.stemTenGod === '伤官')
    const hasZhengGuan = pillarsB.some(p => p.stemTenGod === '正官')
    if (hasShangGuan && hasZhengGuan) {
      score -= 5
      details.push('B方女命伤官见官，感情易生波折，宜包容克制。')
    }
  }

  // 男命比劫夺财检查
  if (genderA === '男') {
    const hasBiJian = pillarsA.some(p => p.stemTenGod === '比肩')
    const hasJieCai = pillarsA.some(p => p.stemTenGod === '劫财')
    const hasZhengCai = pillarsA.some(p => p.stemTenGod === '正财')
    if ((hasBiJian || hasJieCai) && hasZhengCai) {
      score -= 4
      details.push('A方男命比劫见财，感情中易有竞争压力。')
    }
  }
  if (genderB === '男') {
    const hasBiJian = pillarsB.some(p => p.stemTenGod === '比肩')
    const hasJieCai = pillarsB.some(p => p.stemTenGod === '劫财')
    const hasZhengCai = pillarsB.some(p => p.stemTenGod === '正财')
    if ((hasBiJian || hasJieCai) && hasZhengCai) {
      score -= 4
      details.push('B方男命比劫见财，感情中易有竞争压力。')
    }
  }

  return {
    name: '十神配偶星',
    score: Math.max(-maxScore, Math.min(maxScore, score)),
    maxScore,
    level: getLevel(score, maxScore),
    details: details.length > 0 ? details : ['十神配置无明显问题。'],
  }
}

// ════════════════════════════════════════
// 神煞分析（婚煞检查）
// ════════════════════════════════════════

function analyzeShenSha(
  yearBranchA: string, yearBranchB: string,
  stemBranchA: string, stemBranchB: string,
): HeHunDimension {
  const maxScore = HEHUN_WEIGHTS.SHENSHA
  const details: string[] = []
  let score = maxScore // 基准满分扣分制

  const branchIdxA = '子丑寅卯辰巳午未申酉戌亥'.indexOf(yearBranchA)
  const branchIdxB = '子丑寅卯辰巳午未申酉戌亥'.indexOf(yearBranchB)

  // 1. 孤辰寡宿（年支查）
  const guChenA = GUCHEN_GUASU[branchIdxA]?.[0]
  const guaSuA = GUCHEN_GUASU[branchIdxA]?.[1]
  const guChenB = GUCHEN_GUASU[branchIdxB]?.[0]
  const guaSuB = GUCHEN_GUASU[branchIdxB]?.[1]

  if (guChenA === yearBranchB || guaSuA === yearBranchB) {
    score -= 3
    details.push('A犯孤辰寡宿与B相冲，婚恋易有孤独之感。')
  }
  if (guChenB === yearBranchA || guaSuB === yearBranchA) {
    score -= 3
    details.push('B犯孤辰寡宿与A相冲，婚恋易有孤独之感。')
  }

  // 2. 十恶大败
  if (SHIE_DAIBAI_DAYS.has(stemBranchA)) {
    score -= 2
    details.push('A方日柱犯十恶大败，注意责任心问题。')
  }
  if (SHIE_DAIBAI_DAYS.has(stemBranchB)) {
    score -= 2
    details.push('B方日柱犯十恶大败，注意责任心问题。')
  }

  // 3. 八专日
  if (BAZHUAN_DAYS.has(stemBranchA) || BAZHUAN_DAYS.has(stemBranchB)) {
    score -= 2
    details.push('一方犯八专，感情关系中需注意专一。')
  }

  // 4. 九丑日
  if (JIUCHOU_DAYS.has(stemBranchA) || JIUCHOU_DAYS.has(stemBranchB)) {
    score -= 1
    details.push('一方犯九丑，注意隐私与面子问题。')
  }

  return {
    name: '神煞合婚',
    score: Math.max(-maxScore, score),
    maxScore,
    level: getLevel(score, maxScore),
    details: details.length > 0 ? details : ['无显著婚煞，运气平和。'],
  }
}

// ════════════════════════════════════════
// 生肖关系（单独检查）
// ════════════════════════════════════════

function analyzeAnimal(
  branchA: string, branchB: string,
): HeHunDimension {
  const maxScore = HEHUN_WEIGHTS.ANIMAL
  const details: string[] = []
  let score = 0

  // 六合
  if (BRANCH_SIX_COMBINE[branchA] === branchB) {
    score += 5
    details.push('生肖六合，天生的好搭档。')
  } else if (BRANCH_TRIPLE_COMBINE[branchA]?.includes(branchB)) {
    score += 3
    details.push('生肖三合，气场相投。')
  } else if (BRANCH_SIX_CONFLICT[branchA] === branchB) {
    score -= 5
    details.push('生肖相冲，性格差异大，需多方磨合。')
  } else if (BRANCH_SIX_HARM[branchA] === branchB) {
    score -= 3
    details.push('生肖相害，需注意包容与理解。')
  } else if (BRANCH_PUNISHMENT[branchA]?.includes(branchB)) {
    score -= 2
    details.push('生肖相刑，偶有小摩擦。')
  } else {
    score += 1
    details.push('生肖平和，无相冲相克。')
  }

  return {
    name: '生肖配对',
    score: Math.max(-maxScore, Math.min(maxScore, score)),
    maxScore,
    level: getLevel(score, maxScore),
    details,
  }
}

// ════════════════════════════════════════
// 生成总结与建议
// ════════════════════════════════════════

function generateSummary(
  totalScore: number,
  dimensions: HeHunDimension[],
  grade: HeHunGrade,
  branchA: string,
  branchB: string,
): { summary: string; suggestions: string[]; warnings: string[] } {
  const suggestions: string[] = []
  const warnings: string[] = []

  // 总结
  const summary = `双方命局合评${totalScore}分，为「${grade.label}」。${grade.description}`

  // 根据各维度生成建议
  for (const dim of dimensions) {
    if (dim.level === '凶' && dim.score < 0) {
      if (dim.name === '日柱（夫妻宫）') {
        warnings.push('日柱关系存在冲克，婚姻中需格外注意沟通方式。')
      } else if (dim.name === '年柱相合') {
        warnings.push('年柱地基有冲，双方原生家庭观念差异较大，需互相理解和迁就。')
      } else if (dim.name === '五行互补') {
        warnings.push('五行互补性不足，需要双方在生活中主动调和、优势互补。')
      } else if (dim.name === '十神配偶星') {
        warnings.push('十神配偶星配置存在挑战，感情经营需要更多耐心。')
      }
    }
  }

  // 根据总分给通用建议
  if (totalScore >= 70) {
    suggestions.push('双方命局匹配度良好，建议珍惜缘分、共同规划未来。')
    suggestions.push('百年好合的基础在于互相尊重与包容，命理吉兆需后天努力成就。')
  } else if (totalScore >= 45) {
    suggestions.push('各自保留自己的兴趣爱好空间，互不干涉。')
    suggestions.push('遇到分歧时以「五行相生」为鉴——给对方所需，而非自己所想。')
    suggestions.push('建议婚前充分相处，了解双方的处事方式和生活习惯。')
  } else {
    suggestions.push('若已决定结合，建议在重大决定上求同存异。')
    suggestions.push('婚姻需要双方的包容与体谅，命理之说不必过度焦虑。')
    suggestions.push('建议咨询专业人士做更详细的分析，本文仅供参考。')
  }

  suggestions.push('命理揭示的是能量底色，婚姻最终质量取决于双方用心经营。')

  return { summary, suggestions, warnings }
}

// ════════════════════════════════════════
// 主入口函数
// ════════════════════════════════════════

export interface HeHunInput {
  /** 第一人信息（通常为当前用户） */
  personA: PersonInfo
  /** 第二人信息 */
  personB: PersonInfo
}

/**
 * 计算八字合婚结果
 *
 * 流程：
 *   1. 分别计算两方的八字排盘
 *   2. 逐维度对比分析
 *   3. 加权汇总总分
 *   4. 生成总结与建议
 */
export function calculateHeHun(input: HeHunInput): HeHunResult {
  const { personA, personB } = input

  // 1. 分别排盘
  const baziA = calculateBaZi({
    birthYear: personA.year,
    birthMonth: personA.month,
    birthDay: personA.day,
    birthHour: personA.hour,
    birthCalendar: personA.calendar,
    gender: personA.gender,
  })

  const baziB = calculateBaZi({
    birthYear: personB.year,
    birthMonth: personB.month,
    birthDay: personB.day,
    birthHour: personB.hour,
    birthCalendar: personB.calendar,
    gender: personB.gender,
  })

  const { yearPillar, dayPillar } = baziA
  const { yearPillar: yearPillarB, dayPillar: dayPillarB } = baziB

  const stemBranchA = `${dayPillar.stem}${dayPillar.branch}`
  const stemBranchB = `${dayPillarB.stem}${dayPillarB.branch}`

  // 2. 各维度分析
  const yearResult = analyzeYearPillar(
    yearPillar.stem, yearPillar.branch,
    yearPillarB.stem, yearPillarB.branch,
  )
  const dayResult = analyzeDayPillar(
    dayPillar.stem, dayPillar.branch,
    dayPillarB.stem, dayPillarB.branch,
    stemBranchA, stemBranchB,
  )
  const elementResult = analyzeElementComplement(
    baziA.favorableElements, baziA.unfavorableElements,
    baziB.favorableElements, baziB.unfavorableElements,
    baziA.elementCounts, baziB.elementCounts,
  )
  const nayinResult = analyzeNayin(stemBranchA, stemBranchB)
  const tenGodResult = analyzeTenGod(personA.gender, personB.gender, baziA, baziB)
  const shenshaResult = analyzeShenSha(yearPillar.branch, yearPillarB.branch, stemBranchA, stemBranchB)
  const animalResult = analyzeAnimal(yearPillar.branch, yearPillarB.branch)

  const dimensions = [
    yearResult,
    dayResult,
    elementResult,
    nayinResult,
    tenGodResult,
    shenshaResult,
    animalResult,
  ]

  // 3. 汇总总分（限制 0-100）
  let totalScore = dimensions.reduce((sum, d) => sum + d.score, 0)
  totalScore = Math.max(0, Math.min(100, totalScore))

  // 4. 等级
  const grade = getHeHunGrade(totalScore)

  // 5. 总结
  const { summary, suggestions, warnings } = generateSummary(
    totalScore, dimensions, grade,
    yearPillar.branch, yearPillarB.branch,
  )

  return {
    totalScore,
    grade,
    dimensions,
    baziA,
    baziB,
    summary,
    suggestions,
    warnings,
  }
}

/**
 * 从PersonInfo创建默认输入
 */
export function createPersonInfoFromProfile(profile: {
  birth_date: string
  birth_calendar?: 'solar' | 'lunar'
  birth_hour?: number | null
  gender?: string | null
  nickname?: string
}): PersonInfo | null {
  const parsed = parseDate(profile.birth_date)
  if (!parsed) return null

  return {
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
    hour: profile.birth_hour ?? null,
    gender: (profile.gender === '男' || profile.gender === '女') ? profile.gender : '男',
    calendar: profile.birth_calendar || 'solar',
    nickname: profile.nickname || '本人',
  }
}
