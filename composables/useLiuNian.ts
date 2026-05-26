import { STEMS, BRANCHES, getStemIndex } from '~/constants/bazi'
import { getTenGod, WUXING_STEM, WUXING_BRANCH, type BaZiResult } from './useBaZi'
import { checkSanHeBranch, type ShenSha } from './useShenSha'
import { getMonthStemStart, getSolarTerm } from './useSolarTerms'

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
  startMonth: number  // Gregorian month of the solar term that starts this month (e.g., 2 for 立春)
  startDay: number     // Gregorian day of the solar term that starts this month
}

export interface LiuNianYear {
  year: number
  stem: string
  branch: string
  stemWuxing: string
  branchWuxing: string
  tenGod: string
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

// === Earth branch relations — single consolidated map ===

// Key: sorted branch pair (by Unicode value). Value: relation type(s).
// 合 takes precedence over 破 for the same pair.
// 自刑 entries (辰辰, 午午, 酉酉, 亥亥) are stored as '自刑' for correct description template.
const EARTH_RELATIONS: Record<string, string[]> = {
  // 六合
  '丑子': ['合'],
  '亥寅': ['合'],         // 破 excluded — 合 takes precedence
  '卯戌': ['合'],
  '辰酉': ['合'],
  '巳申': ['合', '刑'],    // 破 excluded — 合 takes precedence; +刑 from 三刑
  '午未': ['合'],
  // 六冲
  '午子': ['冲'],
  '丑未': ['冲', '刑'],
  '寅申': ['冲', '刑'],
  '卯酉': ['冲'],
  '戌辰': ['冲'],
  '亥巳': ['冲'],
  // 六害
  '子未': ['害'],
  '丑午': ['害'],
  '寅巳': ['害', '刑'],
  '卯辰': ['害'],
  '亥申': ['害'],
  '戌酉': ['害'],
  // 六破
  '子酉': ['破'],
  '丑辰': ['破'],
  '午卯': ['破'],
  '戌未': ['破', '刑'],
  // 三刑 and 自刑
  '丑戌': ['刑'],
  '卯子': ['刑'],
  '辰辰': ['自刑'],
  '午午': ['自刑'],
  '酉酉': ['自刑'],
  '亥亥': ['自刑'],
}

const RELATION_DESC_TEMPLATES: Record<string, string> = {
  '合': '与{year}流年地支六合，主合作、姻缘、贵人相助',
  '冲': '与{year}流年地支相冲，主变动、奔波、冲击',
  '刑': '与{year}流年地支相刑，主是非、官非、伤害',
  '自刑': '与{year}流年地支自刑，主自寻烦恼、内心矛盾',
  '害': '与{year}流年地支相害，主小人、暗算、不睦',
  '破': '与{year}流年地支相破，主破坏、损耗、暗中损毁',
}

// === Year stem/branch helper ===

// NOTE: Duplicates getYearStemIndex/getYearBranchIndex from useBaZi.ts.
// Both are private functions; this is a known dedup opportunity.
function getYearStemBranch(year: number): { stem: string; stemIdx: number; branch: string; branchIdx: number } {
  const stemIdx = ((year - 4) % 10 + 10) % 10
  const branchIdx = ((year - 4) % 12 + 12) % 12
  return { stem: STEMS[stemIdx], stemIdx, branch: BRANCHES[branchIdx], branchIdx }
}

// === Monthly stems (年上起月法, with precise solar-term boundaries) ===

function getMonthlyStems(year: number): LiuNianMonthlyStem[] {
  const { stemIdx: yearStemIdx } = getYearStemBranch(year)
  const monthStemStart = getMonthStemStart(yearStemIdx)
  const monthBranches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']

  // Compute precise solar-term boundaries for each month.
  // Terms 0-10 (立春 through 大雪) use the given calendar year.
  // Term 11 (小寒) falls in the NEXT calendar year (typically early January).
  const termDates: Array<{ month: number; day: number }> = []
  for (let ti = 0; ti < 11; ti++) {
    termDates.push(getSolarTerm(year, ti))
  }
  termDates.push(getSolarTerm(year + 1, 11)) // 小寒 is in January of year+1

  return monthBranches.map((branch, i) => {
    const term = termDates[i]
    return {
      month: i + 1, // 1=寅月, 2=卯月, ... 12=丑月
      stem: STEMS[(monthStemStart + i) % 10],
      branch,
      startMonth: term.month,
      startDay: term.day,
    }
  })
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
  isUnfavorable: boolean,
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
  } else if (isUnfavorable) {
    parts.push(WUXING_MATCH_TEMPLATES['unfavorable'])
  } else {
    parts.push(WUXING_MATCH_TEMPLATES['neutral'])
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

  if (parts.length === 0) return '流年运势平稳，宜按部就班。'
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
  if (baZi.daYun.length === 0) return { stem: '甲', branch: '子' }

  // Direct index: each da yun cycle spans exactly 10 years
  const cycleIdx = Math.floor((currentAge - baZi.daYun[0].startAge) / 10)
  const clamped = Math.max(0, Math.min(cycleIdx, baZi.daYun.length - 1))
  const cycle = baZi.daYun[clamped]
  return { stem: cycle.stemBranch[0], branch: cycle.stemBranch[1] }
}

// === Year-specific shensha helpers ===

/**
 * Compute year-specific shenshas by checking if the year's branch triggers
 * any of the 年支-based shensha patterns against the birth year branch.
 */
function computeYearShensha(
  yearBranch: string,
  birthYearBranch: string,
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
  const { baZi, currentYear, range = 5 } = input

  const dayMasterIdx = getStemIndex(baZi.dayMaster)
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

    // Is the year stem's wuxing favorable? Neutral elements score 0.
    const isFavorable = favorableElements.includes(stemWuxing)
    const isUnfavorable = unfavorableElements.includes(stemWuxing)

    // Earth relations: check year branch against each pillar branch (single pass)
    const earthRelations: EarthRelation[] = []
    for (const pillar of allPillars) {
      const key = branch < pillar.branch ? branch + pillar.branch : pillar.branch + branch
      const types = EARTH_RELATIONS[key]
      if (!types) continue
      for (const type of types) {
        // type is '合' | '冲' | '害' | '破' | '刑' | '自刑'
        const templateKey = type
        const relationType = type === '自刑' ? '刑' : type as EarthRelation['type']
        earthRelations.push({
          type: relationType,
          target: pillar.branch,
          targetPillar: pillar.pillarName,
          description: RELATION_DESC_TEMPLATES[templateKey].replace('{year}', String(year)),
        })
      }
    }

    // Year-specific shensha: check year's branch against birth year branch triggers
    const yearShenSha = computeYearShensha(branch, baZi.yearPillar.branch)

    // DaYun for this year
    const daYun = getDaYunForYear(baZi, year)

    const yearInfo: Omit<LiuNianYear, 'score' | 'summary'> = {
      year,
      stem,
      branch,
      stemWuxing,
      branchWuxing,
      tenGod,
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
      summary: buildSummary(yearInfo, tenGod, isFavorable, isUnfavorable),
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
