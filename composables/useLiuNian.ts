import { STEMS, BRANCHES } from '~/constants/bazi'
import type { BaZiResult } from './useBaZi'
import type { ShenSha } from './useShenSha'
import { getMonthStemStart } from './useSolarTerms'

// === Typed Exports ===

export interface EarthRelation {
  type: '合' | '冲' | '刑' | '害' | '破'
  target: string
  targetPillar: string
  description: string
}

export interface LiuNianMonthlyStem {
  month: number  // 1-12 (寅月=1, 卯月=2, ... 丑月=12)
  stem: string
  branch: string
}

export interface LiuNianYear {
  year: number
  stem: string
  branch: string
  stemWuxing: string
  branchWuxing: string
  tenGod: string
  tenGodWuxing: string
  isFavorable: boolean
  isUnfavorable: boolean
  earthRelations: EarthRelation[]
  shenSha: ShenSha[]
  score: number
  summary: string
  daYunStem: string
  daYunBranch: string
  detail?: {
    daYunInteraction: string
    pillarsInteraction: string[]
    monthlyStems: LiuNianMonthlyStem[]
  }
}

export interface LiuNianInput {
  baZi: BaZiResult
  shenSha: ShenSha[]        // pre-computed birth chart shensha for year-specific lookups
  currentYear: number
  range?: number  // default 5
}

// === Constants ===

const WUXING_STEM: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
}

const WUXING_BRANCH: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
}

// Ten gods matrix helpers
const STEMS_ARR = STEMS as readonly string[]
function getWuxingCycle(idx: number): string {
  return ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'][idx]
}

function getStemYinYang(idx: number): '阳' | '阴' {
  return ['阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴'][idx] as '阳' | '阴'
}

function getTenGod(dayMasterIndex: number, targetStem: string): string {
  const targetIndex = STEMS_ARR.indexOf(targetStem)
  if (targetIndex < 0) return '—'
  if (dayMasterIndex === targetIndex) return '比肩'

  const dmWx = getWuxingCycle(dayMasterIndex)
  const targetWx = getWuxingCycle(targetIndex)
  const dmYy = getStemYinYang(dayMasterIndex)
  const targetYy = getStemYinYang(targetIndex)
  const sameYy = dmYy === targetYy

  const produces: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }
  const controls: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }

  if (targetWx === dmWx) return sameYy ? '比肩' : '劫财'
  if (produces[targetWx] === dmWx) return sameYy ? '偏印' : '正印'
  if (produces[dmWx] === targetWx) return sameYy ? '食神' : '伤官'
  if (controls[targetWx] === dmWx) return sameYy ? '偏官' : '正官'
  if (controls[dmWx] === targetWx) return sameYy ? '偏财' : '正财'
  return '比肩'
}

// === Earth branch relations ===

const LIU_HE: [string, string][] = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
]

const LIU_CHONG: [string, string][] = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]

const SAN_XING: string[][] = [
  ['寅', '巳', '申'], ['丑', '戌', '未'], ['子', '卯'],
]

const LIU_HAI: [string, string][] = [
  ['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌'],
]

const LIU_PO: [string, string][] = [
  ['子', '酉'], ['寅', '亥'], ['辰', '丑'], ['午', '卯'], ['申', '巳'], ['戌', '未'],
]

function checkHe(b1: string, b2: string): boolean {
  return LIU_HE.some(([a, b]) => (a === b1 && b === b2) || (a === b2 && b === b1))
}

function checkChong(b1: string, b2: string): boolean {
  return LIU_CHONG.some(([a, b]) => (a === b1 && b === b2) || (a === b2 && b === b1))
}

function checkXing(b1: string, b2: string): boolean {
  for (const group of SAN_XING) {
    if (group.includes(b1) && group.includes(b2) && b1 !== b2) return true
  }
  return false
}

function checkHai(b1: string, b2: string): boolean {
  return LIU_HAI.some(([a, b]) => (a === b1 && b === b2) || (a === b2 && b === b1))
}

function checkPo(b1: string, b2: string): boolean {
  return LIU_PO.some(([a, b]) => (a === b1 && b === b2) || (a === b2 && b === b1))
}

const RELATION_DESC_TEMPLATES: Record<string, string> = {
  '合': '与{year}流年地支六合，主合作、姻缘、贵人相助',
  '冲': '与{year}流年地支相冲，主变动、奔波、冲击',
  '刑': '与{year}流年地支相刑，主是非、官非、伤害',
  '害': '与{year}流年地支相害，主小人、暗算、不睦',
  '破': '与{year}流年地支相破，主破坏、损耗、暗中损毁',
}

// === Year stem/branch helper ===

function getYearStemBranch(year: number): { stem: string; stemIdx: number; branch: string; branchIdx: number } {
  const stemIdx = ((year - 4) % 10 + 10) % 10
  const branchIdx = ((year - 4) % 12 + 12) % 12
  return { stem: STEMS[stemIdx], stemIdx, branch: BRANCHES[branchIdx], branchIdx }
}

// === Monthly stems (年上起月法) ===

function getMonthlyStems(year: number): LiuNianMonthlyStem[] {
  const { stemIdx: yearStemIdx } = getYearStemBranch(year)
  const monthStemStart = getMonthStemStart(yearStemIdx)
  const monthBranches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']

  // NOTE: Month boundaries are sequential (寅月=1, etc.). Precise solar-term-based
  // boundaries would require integrating getSolarTerm for each month within the year.

  return monthBranches.map((branch, i) => ({
    month: i + 1, // 1=寅月, 2=卯月, ... 12=丑月
    stem: STEMS[(monthStemStart + i) % 10],
    branch,
  }))
}

// === Summary sentence generation ===

const TEN_GOD_YEAR_POSITIVE: Record<string, string> = {
  '正官': '正官年，事业运旺，利于求职升迁',
  '偏官': '七杀年，压力与机遇并存，需果断应对',
  '正财': '正财年，财运稳定，利于储蓄和正职收入',
  '偏财': '偏财年，意外之财可期，但需防投机风险',
  '正印': '正印年，学习运佳，有贵人长辈相助',
  '偏印': '偏印年，思维活跃，适合钻研与独处',
  '食神': '食神年，心情愉悦，创造力强，享受生活',
  '伤官': '伤官年，才华发挥，但需注意言行分寸',
  '比肩': '比肩年，竞争与合作并存，宜团结同伴',
  '劫财': '劫财年，需防破财损耗，避免冲动投资',
}

const TEN_GOD_YEAR_CAUTIOUS: Record<string, string> = {
  '正官': '正官年，注意工作压力，保持心态平和',
  '偏官': '七杀年，挑战较多，注意健康和人身安全',
  '正财': '正财年，财运平缓，稳扎稳打',
  '偏财': '偏财年，投资需谨慎，防财务波动',
  '正印': '正印年，宜学习充电，减少冒险',
  '偏印': '偏印年，思虑过多，需注意心理健康',
  '食神': '食神年，宜放松心态，享受当下',
  '伤官': '伤官年，少说多做，避免口舌是非',
  '比肩': '比肩年，宜独立前行，减少依赖',
  '劫财': '劫财年，守成为上，避免大额支出',
}

const WUXING_MATCH_TEMPLATES: Record<string, string> = {
  'favorable': '五行对你有利，运势向好',
  'unfavorable': '五行不太配合，需稳中求进',
  'neutral': '五行中性，运势平稳',
}

function buildSummary(
  year: Omit<LiuNianYear, 'score' | 'summary'>,
  tenGod: string,
  isFavorable: boolean,
  tenGodWuxing: string,
  dayMasterWuxing: string,
): string {
  const parts: string[] = []

  // Part 1: ten god year phrase
  const tenGodPhrase = isFavorable
    ? (TEN_GOD_YEAR_POSITIVE[tenGod] || `${tenGod}年`)
    : (TEN_GOD_YEAR_CAUTIOUS[tenGod] || `${tenGod}年`)
  parts.push(tenGodPhrase)

  // Part 2: wuxing match
  if (isFavorable) {
    parts.push(WUXING_MATCH_TEMPLATES['favorable'])
  } else if (tenGodWuxing === dayMasterWuxing) {
    parts.push(WUXING_MATCH_TEMPLATES['neutral'])
  } else {
    parts.push(WUXING_MATCH_TEMPLATES['unfavorable'])
  }

  // Part 3: earth relation
  const dayRelations = year.earthRelations.filter(r => r.targetPillar === '日柱')
  if (dayRelations.length > 0) {
    const relTypes = [...new Set(dayRelations.map(r => r.type))]
    if (relTypes.includes('冲')) {
      parts.push('流年冲日支，注意变动')
    } else if (relTypes.includes('合')) {
      parts.push('流年合日支，有合作良机')
    } else if (relTypes.includes('刑')) {
      parts.push('需防口舌是非')
    } else if (relTypes.includes('害')) {
      parts.push('注意人际关系')
    } else if (relTypes.includes('破')) {
      parts.push('需防暗中损耗')
    }
  }

  // Part 4: shensha
  const yearShenSha = year.shenSha || []
  const jiSha = yearShenSha.filter(s => s.category === '吉')
  const xiongSha = yearShenSha.filter(s => s.category === '凶')
  if (jiSha.length > 0) {
    parts.push(`有${jiSha[0].name}照临`)
  }
  if (xiongSha.length > 0) {
    parts.push(`防范${xiongSha[0].name}`)
  }

  return parts.join('，') + '。'
}

// === Scoring algorithm ===

function calculateScore(yearInfo: Omit<LiuNianYear, 'score' | 'summary'>): number {
  let score = 50

  // Favorable element — neutral elements score 0
  if (yearInfo.isFavorable) {
    score += 30
  } else if (yearInfo.isUnfavorable) {
    score -= 20
  }

  // Earth relations
  for (const rel of yearInfo.earthRelations) {
    const weight = rel.targetPillar === '日柱' ? 1.5 : 1.0
    switch (rel.type) {
      case '合': score += Math.round(10 * weight); break
      case '冲': score -= Math.round(15 * weight); break
      case '刑': score -= Math.round(12 * weight); break
      case '害': score -= Math.round(8 * weight); break
      case '破': score -= Math.round(6 * weight); break
    }
  }

  // Shensha
  const yearShenSha = yearInfo.shenSha || []
  for (const ss of yearShenSha) {
    if (ss.category === '吉') score += 5
    if (ss.category === '凶') score -= 5
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

// === DaYun lookup ===

function getDaYunForYear(baZi: BaZiResult, year: number): { stem: string; branch: string } {
  const currentAge = year - baZi.birthYear
  for (const cycle of baZi.daYun) {
    if (currentAge >= cycle.startAge && currentAge <= cycle.endAge) {
      return { stem: cycle.stemBranch[0], branch: cycle.stemBranch[1] }
    }
  }
  // Fallback: first cycle
  if (baZi.daYun.length > 0) {
    return { stem: baZi.daYun[0].stemBranch[0], branch: baZi.daYun[0].stemBranch[1] }
  }
  return { stem: '甲', branch: '子' }
}

// === Year-specific shensha helpers ===

/** Get 三合 group index: 0=申子辰, 1=巳酉丑, 2=寅午戌, 3=亥卯未 */
function sanHeGroup(branch: string): number {
  const groups: Record<string, number> = {
    '申': 0, '子': 0, '辰': 0,
    '巳': 1, '酉': 1, '丑': 1,
    '寅': 2, '午': 2, '戌': 2,
    '亥': 3, '卯': 3, '未': 3,
  }
  return groups[branch] ?? -1
}

/** Check if targetBranch matches a 三合-based pattern relative to sourceBranch. */
function checkSanHeBranch(sourceBranch: string, targetBranch: string, patternIdx: number): boolean {
  const group = sanHeGroup(sourceBranch)
  if (group < 0) return false
  const targets: string[][] = [
    ['子', '酉', '午', '卯'], // 0: 将星
    ['辰', '丑', '戌', '未'], // 1: 华盖
    ['寅', '亥', '申', '巳'], // 2: 驿马
    ['酉', '午', '卯', '子'], // 3: 桃花
    ['巳', '寅', '亥', '申'], // 4: 劫煞
    ['午', '卯', '子', '酉'], // 5: 灾煞
  ]
  return targetBranch === targets[patternIdx][group]
}

/**
 * Compute year-specific shenshas by checking if the year's branch triggers
 * any of the 年支-based shensha patterns against the birth year branch.
 */
function computeYearShensha(
  yearBranch: string,
  birthYearBranch: string,
  _year: number,
  _birthShenSha: ShenSha[],
): ShenSha[] {
  const results: ShenSha[] = []

  if (checkSanHeBranch(birthYearBranch, yearBranch, 3)) {
    results.push({ name: '桃花', category: '中性', source: '年支', pillar: '流年', position: '地支', description: '流年逢桃花，人缘佳，异性缘旺' })
  }
  if (checkSanHeBranch(birthYearBranch, yearBranch, 2)) {
    results.push({ name: '驿马', category: '中性', source: '年支', pillar: '流年', position: '地支', description: '流年逢驿马，主奔波走动，利于外出发展' })
  }
  if (checkSanHeBranch(birthYearBranch, yearBranch, 0)) {
    results.push({ name: '将星', category: '吉', source: '年支', pillar: '流年', position: '地支', description: '流年逢将星，有领导才能发挥之机' })
  }
  if (checkSanHeBranch(birthYearBranch, yearBranch, 1)) {
    results.push({ name: '华盖', category: '中性', source: '年支', pillar: '流年', position: '地支', description: '流年逢华盖，利于艺术创作与玄学研究' })
  }
  if (checkSanHeBranch(birthYearBranch, yearBranch, 4)) {
    results.push({ name: '劫煞', category: '凶', source: '年支', pillar: '流年', position: '地支', description: '流年逢劫煞，需防破财、小人劫夺' })
  }
  if (checkSanHeBranch(birthYearBranch, yearBranch, 5)) {
    results.push({ name: '灾煞', category: '凶', source: '年支', pillar: '流年', position: '地支', description: '流年逢灾煞，需行事谨慎防意外' })
  }

  return results
}

// === Main calculation function ===

export function calculateLiuNian(input: LiuNianInput): LiuNianYear[] {
  const { baZi, shenSha: birthShenSha = [], currentYear, range = 5 } = input

  const dayMasterIdx = (STEMS as readonly string[]).indexOf(baZi.dayMaster)
  const favorableElements = baZi.favorableElements
  const unfavorableElements = baZi.unfavorableElements

  const allPillars: Array<{ pillarName: string; branch: string; stem: string }> = [
    { pillarName: '年柱', branch: baZi.yearPillar.branch, stem: baZi.yearPillar.stem },
    { pillarName: '月柱', branch: baZi.monthPillar.branch, stem: baZi.monthPillar.stem },
    { pillarName: '日柱', branch: baZi.dayPillar.branch, stem: baZi.dayPillar.stem },
  ]
  if (baZi.hourPillar) {
    allPillars.push({ pillarName: '时柱', branch: baZi.hourPillar.branch, stem: baZi.hourPillar.stem })
  }

  const results: LiuNianYear[] = []

  for (let offset = -range; offset <= range; offset++) {
    const year = currentYear + offset
    const { stem, branch, stemIdx, branchIdx } = getYearStemBranch(year)
    const stemWuxing = WUXING_STEM[stem]
    const branchWuxing = WUXING_BRANCH[branch]
    const tenGod = getTenGod(dayMasterIdx, stem)
    const tenGodWuxing = WUXING_STEM[stem]

    // Is the year stem's wuxing favorable? Neutral elements score 0.
    const isFavorable = favorableElements.includes(stemWuxing)
    const isUnfavorable = unfavorableElements.includes(stemWuxing)

    // Earth relations: check year branch against each pillar branch
    const earthRelations: EarthRelation[] = []
    for (const pillar of allPillars) {
      const yearBranch = branch
      const pillarBranch = pillar.branch
      if (checkHe(yearBranch, pillarBranch)) {
        earthRelations.push({
          type: '合',
          target: pillarBranch,
          targetPillar: pillar.pillarName,
          description: RELATION_DESC_TEMPLATES['合'].replace('{year}', String(year)),
        })
      }
      if (checkChong(yearBranch, pillarBranch)) {
        earthRelations.push({
          type: '冲',
          target: pillarBranch,
          targetPillar: pillar.pillarName,
          description: RELATION_DESC_TEMPLATES['冲'].replace('{year}', String(year)),
        })
      }
      if (checkXing(yearBranch, pillarBranch)) {
        earthRelations.push({
          type: '刑',
          target: pillarBranch,
          targetPillar: pillar.pillarName,
          description: RELATION_DESC_TEMPLATES['刑'].replace('{year}', String(year)),
        })
      }
      if (checkHai(yearBranch, pillarBranch)) {
        earthRelations.push({
          type: '害',
          target: pillarBranch,
          targetPillar: pillar.pillarName,
          description: RELATION_DESC_TEMPLATES['害'].replace('{year}', String(year)),
        })
      }
      if (checkPo(yearBranch, pillarBranch)) {
        earthRelations.push({
          type: '破',
          target: pillarBranch,
          targetPillar: pillar.pillarName,
          description: RELATION_DESC_TEMPLATES['破'].replace('{year}', String(year)),
        })
      }
    }

    // Year-specific shensha: check year's branch against birth year branch triggers
    const yearShenSha = computeYearShensha(branch, baZi.yearPillar.branch, year, birthShenSha)

    // DaYun for this year
    const daYun = getDaYunForYear(baZi, year)

    const yearInfo: Omit<LiuNianYear, 'score' | 'summary'> = {
      year,
      stem,
      branch,
      stemWuxing,
      branchWuxing,
      tenGod,
      tenGodWuxing,
      isFavorable,
      isUnfavorable,
      earthRelations,
      shenSha: yearShenSha,
      daYunStem: daYun.stem,
      daYunBranch: daYun.branch,
    }

    const score = calculateScore(yearInfo)

    const fullYearInfo: LiuNianYear = {
      ...yearInfo,
      score,
      summary: buildSummary(yearInfo, tenGod, isFavorable, tenGodWuxing, WUXING_STEM[baZi.dayMaster]),
    }

    // Add detail for current year
    if (offset === 0) {
      const daYunInteraction = `大运${daYun.stem}${daYun.branch}配流年${stem}${branch}，` +
        (isFavorable ? '天地配合有利' : '需注意天地配合')

      const pillarsInteraction = earthRelations.map(r => r.description)
      if (pillarsInteraction.length === 0) {
        pillarsInteraction.push('流年与命局各柱关系平和')
      }

      const monthlyStems = getMonthlyStems(year)

      fullYearInfo.detail = {
        daYunInteraction,
        pillarsInteraction,
        monthlyStems,
      }
    }

    results.push(fullYearInfo)
  }

  return results
}
