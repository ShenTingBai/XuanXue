import { BRANCHES } from '~/constants/bazi'
import type { BaZiPillar } from './useBaZi'

import {
  SHENSHA_DESC,
  GU_CHEN_MAP,
  GUA_SU_MAP,
  LU_SHEN_MAP,
  YANG_REN_MAP,
  FEI_REN_MAP,
  TIAN_YI_MAP,
  TAI_JI_MAP,
  WEN_CHANG_MAP,
  XUE_TANG_MAP,
  JIN_YU_MAP,
  FU_XING_MAP,
  TIAN_DE_MAP,
  YUE_DE_MAP,
  XUE_REN_MAP,
  TIAN_SHE_MAP,
  SHI_E_DA_BAI_SET,
  KUI_GANG_SET,
  HONG_LUAN_MAP,
  DIAO_KE_MAP,
} from '~/constants/shensha-rules'

// 以下为历史公共接口的再导出：tests/composables/useShenSha-exhaustive.test.ts 仍从这里导入。
// 待该测试改为独立期望值后，可一并迁到 constants/shensha-rules.ts 直接导入。
export {
  LU_SHEN_MAP,
  YANG_REN_MAP,
  TIAN_YI_MAP,
  TAI_JI_MAP,
  WEN_CHANG_MAP,
  XUE_TANG_MAP,
  JIN_YU_MAP,
  FU_XING_MAP,
  TIAN_DE_MAP,
  YUE_DE_MAP,
  XUE_REN_MAP,
} from '~/constants/shensha-rules'

// === Typed Exports ===

export interface ShenShaInput {
  yearPillar: BaZiPillar
  monthPillar: BaZiPillar
  dayPillar: BaZiPillar
  hourPillar: BaZiPillar | null
  dayMaster: string
  dayMasterIndex: number
  yearStemIndex?: number // 年干索引 0-9 (甲=0), for year-stem-based shensha lookups; falls back to yearPillar.stem
  gender: '男' | '女' | null // reserved for future use (e.g., gender-specific shensha priorities)
}

export interface ShenSha {
  name: string
  category: '吉' | '凶' | '中性'
  source: string
  pillar: '年柱' | '月柱' | '日柱' | '时柱' | '命宫' | '大运' | '流年'
  position: '天干' | '地支' | '本柱'
  description: string
}

// === Helper: stem/branch index helpers ===

function branchIdx(branch: string): number {
  return BRANCHES.indexOf(branch)
}

/** Get the branch at a given offset from the source branch. Offset +2 is used historically for both 血刃 and 丧门. */
function offsetBranch(srcBranch: string, offset: number): string {
  return BRANCHES[(branchIdx(srcBranch) + offset + 12) % 12]
}

/** Get 三合 group index: 0=申子辰, 1=巳酉丑, 2=寅午戌, 3=亥卯未 */
export function sanHeGroup(branch: string): number {
  const groups: Record<string, number> = {
    申: 0,
    子: 0,
    辰: 0,
    巳: 1,
    酉: 1,
    丑: 1,
    寅: 2,
    午: 2,
    戌: 2,
    亥: 3,
    卯: 3,
    未: 3,
  }
  return groups[branch] ?? -1
}

/**
 * Check if a given branch matches the expected branch pattern for a 三合 lookup.
 * Used for: 将星, 华盖, 驿马, 桃花, 劫煞, 灾煞
 */
export function checkSanHeBranch(
  yearBranch: string,
  targetBranch: string,
  patternIdx: number,
): boolean {
  const group = sanHeGroup(yearBranch)
  if (group < 0) return false
  // patternIdx: 0=将星(中), 1=华盖(末), 2=驿马, 3=桃花, 4=劫煞, 5=灾煞
  const targets: string[][] = [
    ['子', '酉', '午', '卯'], // 将星
    ['辰', '丑', '戌', '未'], // 华盖
    ['寅', '亥', '申', '巳'], // 驿马
    ['酉', '午', '卯', '子'], // 桃花
    ['巳', '寅', '亥', '申'], // 劫煞
    ['午', '卯', '子', '酉'], // 灾煞
  ]
  return targetBranch === targets[patternIdx][group]
}

// === ShenSha descriptions ===

function addIfMatch(
  results: ShenSha[],
  condition: (srcBranch: string, tgtBranch: string) => boolean,
  shensha: Omit<ShenSha, 'category'> & { category: '吉' | '凶' | '中性' },
  srcBranch: string,
  targetBranch: string,
): void {
  if (condition(srcBranch, targetBranch)) {
    results.push({ ...shensha })
  }
}

// === Main calculation function ===

export function calculateShenSha(input: ShenShaInput): ShenSha[] {
  const results: ShenSha[] = []
  const { yearPillar, monthPillar, dayPillar, hourPillar, dayMasterIndex } = input

  const yearBranch = yearPillar.branch
  const monthBranch = monthPillar.branch
  const dayBranch = dayPillar.branch
  const dayStem = dayPillar.stem
  const monthPillarBranchIdx = branchIdx(monthBranch)

  const allPillars: Array<{ pillar: BaZiPillar; pillarLabel: '年柱' | '月柱' | '日柱' | '时柱' }> =
    [
      { pillar: yearPillar, pillarLabel: '年柱' },
      { pillar: monthPillar, pillarLabel: '月柱' },
      { pillar: dayPillar, pillarLabel: '日柱' },
    ]
  if (hourPillar) {
    allPillars.push({ pillar: hourPillar, pillarLabel: '时柱' })
  }

  // === 年支查神煞 (check each pillar's branch against year branch) ===

  for (const { pillar, pillarLabel } of allPillars) {
    const b = pillar.branch

    addIfMatch(
      results,
      (y, t) => checkSanHeBranch(y, t, 0),
      {
        name: '将星',
        category: '吉',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['将星'],
      },
      yearBranch,
      b,
    )

    addIfMatch(
      results,
      (y, t) => checkSanHeBranch(y, t, 1),
      {
        name: '华盖',
        category: '中性',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['华盖'],
      },
      yearBranch,
      b,
    )

    addIfMatch(
      results,
      (y, t) => checkSanHeBranch(y, t, 2),
      {
        name: '驿马',
        category: '中性',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['驿马'],
      },
      yearBranch,
      b,
    )

    addIfMatch(
      results,
      (y, t) => checkSanHeBranch(y, t, 3),
      {
        name: '桃花',
        category: '中性',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['桃花'],
      },
      yearBranch,
      b,
    )

    addIfMatch(
      results,
      (y, t) => checkSanHeBranch(y, t, 4),
      {
        name: '劫煞',
        category: '凶',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['劫煞'],
      },
      yearBranch,
      b,
    )

    addIfMatch(
      results,
      (y, t) => checkSanHeBranch(y, t, 5),
      {
        name: '灾煞',
        category: '凶',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['灾煞'],
      },
      yearBranch,
      b,
    )

    // 孤辰 (odd-numbered branches in each season)
    if (GU_CHEN_MAP[yearBranch] === b) {
      results.push({
        name: '孤辰',
        category: '凶',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['孤辰'],
      })
    }
    if (GUA_SU_MAP[yearBranch] === b) {
      results.push({
        name: '寡宿',
        category: '凶',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['寡宿'],
      })
    }
  }

  // === 日干查神煞 (check each pillar's branch against day stem) ===

  for (const { pillar, pillarLabel } of allPillars) {
    const b = pillar.branch

    // 禄神
    if (LU_SHEN_MAP[dayStem] === b) {
      results.push({
        name: '禄神',
        category: '吉',
        source: '日干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['禄神'],
      })
    }
    // 羊刃
    if (YANG_REN_MAP[dayStem] === b) {
      results.push({
        name: '羊刃',
        category: '凶',
        source: '日干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['羊刃'],
      })
    }
    // 飞刃
    if (FEI_REN_MAP[dayStem] === b) {
      results.push({
        name: '飞刃',
        category: '凶',
        source: '日干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['飞刃'],
      })
    }
    // 天乙贵人
    if (TIAN_YI_MAP[dayStem]?.includes(b)) {
      results.push({
        name: '天乙贵人',
        category: '吉',
        source: '日干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['天乙贵人'],
      })
    }
    // 太极贵人
    if (TAI_JI_MAP[dayStem]?.includes(b)) {
      results.push({
        name: '太极贵人',
        category: '吉',
        source: '日干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['太极贵人'],
      })
    }
    // 文昌贵人
    if (WEN_CHANG_MAP[dayStem] === b) {
      results.push({
        name: '文昌贵人',
        category: '吉',
        source: '日干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['文昌贵人'],
      })
    }
    // 学堂
    if (XUE_TANG_MAP[dayStem] === b) {
      results.push({
        name: '学堂',
        category: '吉',
        source: '日干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['学堂'],
      })
    }
    // 词馆 = 临官位 (same as 禄神)
    const ciGuanBranch = LU_SHEN_MAP[dayStem]
    if (b === ciGuanBranch) {
      results.push({
        name: '词馆',
        category: '吉',
        source: '日干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['词馆'],
      })
    }
    // 金舆
    if (JIN_YU_MAP[dayStem] === b) {
      results.push({
        name: '金舆',
        category: '吉',
        source: '日干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['金舆'],
      })
    }
    // 福星贵人
    if (FU_XING_MAP[dayStem] === b) {
      results.push({
        name: '福星贵人',
        category: '吉',
        source: '日干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['福星贵人'],
      })
    }
  }

  // === 年干查神煞 (year stem as source, coexists with 日干 versions) ===
  // Use year pillar stem for lookup; the same maps work because the formulas
  // for 天乙贵人/太极贵人/文昌贵人 are identical for day stem and year stem.
  const yearStem = yearPillar.stem

  for (const { pillar, pillarLabel } of allPillars) {
    const b = pillar.branch

    // 天乙贵人 (年干版)
    if (TIAN_YI_MAP[yearStem]?.includes(b)) {
      results.push({
        name: '天乙贵人',
        category: '吉',
        source: '年干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['天乙贵人'],
      })
    }
    // 太极贵人 (年干版)
    if (TAI_JI_MAP[yearStem]?.includes(b)) {
      results.push({
        name: '太极贵人',
        category: '吉',
        source: '年干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['太极贵人'],
      })
    }
    // 文昌贵人 (年干版)
    if (WEN_CHANG_MAP[yearStem] === b) {
      results.push({
        name: '文昌贵人',
        category: '吉',
        source: '年干',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['文昌贵人'],
      })
    }
  }

  // === 月支查神煞 ===

  // 天德贵人
  for (const { pillar, pillarLabel } of allPillars) {
    if (pillar.stem === TIAN_DE_MAP[monthBranch] || pillar.branch === TIAN_DE_MAP[monthBranch]) {
      results.push({
        name: '天德贵人',
        category: '吉',
        source: '月支',
        pillar: pillarLabel,
        position: pillar.stem === TIAN_DE_MAP[monthBranch] ? '天干' : '地支',
        description: SHENSHA_DESC['天德贵人'],
      })
    }
  }

  // 月德贵人
  const yueDeStems = YUE_DE_MAP[monthBranch] || []
  for (const { pillar, pillarLabel } of allPillars) {
    if (yueDeStems.includes(pillar.stem)) {
      results.push({
        name: '月德贵人',
        category: '吉',
        source: '月支',
        pillar: pillarLabel,
        position: '天干',
        description: SHENSHA_DESC['月德贵人'],
      })
    }
  }

  // === 日支查神煞 ===

  // 天赦
  const dayStemBranch = dayStem + dayBranch
  if (TIAN_SHE_MAP[monthBranch] === dayStemBranch) {
    results.push({
      name: '天赦',
      category: '吉',
      source: '日支',
      pillar: '日柱',
      position: '本柱',
      description: SHENSHA_DESC['天赦'],
    })
  }

  // 十恶大败
  if (SHI_E_DA_BAI_SET.has(dayStemBranch)) {
    results.push({
      name: '十恶大败',
      category: '凶',
      source: '日支',
      pillar: '日柱',
      position: '本柱',
      description: SHENSHA_DESC['十恶大败'],
    })
  }

  // 魁罡
  if (KUI_GANG_SET.has(dayStemBranch)) {
    results.push({
      name: '魁罡',
      category: '凶',
      source: '日支',
      pillar: '日柱',
      position: '本柱',
      description: SHENSHA_DESC['魁罡'],
    })
  }

  // === 通用/其他 (年支+日干多维度) ===

  // 空亡: 根据日柱干支确定旬空
  // Each 旬 (10-day cycle) leaves 2 branches empty
  const dmIdx = dayMasterIndex
  // The xun leader stem index: find the 甲 that leads this day's xun
  // The xun is determined by (branchIndex - stemIndex + 12) % 12
  const dayBranchIdx = branchIdx(dayBranch)
  const offset = (((dayBranchIdx - dmIdx) % 12) + 12) % 12
  // xun空 two branches preceding 甲子's branch
  // 甲子旬(start=子idx=0): 戌(10),亥(11)
  // 甲戌旬(start=戌idx=10): 申(8),酉(9)
  // The empty branches are (startIdx - 2) and (startIdx - 1) mod 12
  const xunStartBranchIdx = offset // 甲x的位置 = dayBranchIdx - (dayStemIdx - 甲idx)
  const kong1 = BRANCHES[(((xunStartBranchIdx - 2) % 12) + 12) % 12]
  const kong2 = BRANCHES[(((xunStartBranchIdx - 1) % 12) + 12) % 12]

  for (const { pillar, pillarLabel } of allPillars) {
    if (pillar.branch === kong1 || pillar.branch === kong2) {
      results.push({
        name: '空亡',
        category: '凶',
        source: '日柱旬空',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['空亡'],
      })
    }
  }

  // 红鸾 (by year branch)
  // 天喜 (opposite of 红鸾, +6 branches)
  for (const { pillar, pillarLabel } of allPillars) {
    if (HONG_LUAN_MAP[yearBranch] === pillar.branch) {
      results.push({
        name: '红鸾',
        category: '吉',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['红鸾'],
      })
    }
    const tianXiBranch = BRANCHES[(branchIdx(HONG_LUAN_MAP[yearBranch]) + 6) % 12]
    if (tianXiBranch === pillar.branch) {
      results.push({
        name: '天喜',
        category: '吉',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['天喜'],
      })
    }
  }

  // 血刃 (traditional lookup table based on month branch)
  for (const { pillar, pillarLabel } of allPillars) {
    if (XUE_REN_MAP[monthBranch] === pillar.branch) {
      results.push({
        name: '血刃',
        category: '凶',
        source: '月支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['血刃'],
      })
    }
  }

  // 丧门 (by year branch, branch + 2; same offset formula as 血刃 historically)
  for (const { pillar, pillarLabel } of allPillars) {
    if (offsetBranch(yearBranch, 2) === pillar.branch) {
      results.push({
        name: '丧门',
        category: '凶',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['丧门'],
      })
    }
  }

  // 吊客 (by year branch, sequential -2 from year branch)
  for (const { pillar, pillarLabel } of allPillars) {
    if (DIAO_KE_MAP[yearBranch] === pillar.branch) {
      results.push({
        name: '吊客',
        category: '凶',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['吊客'],
      })
    }
  }

  // 勾绞 (by month branch: 勾神=月支+3, 绞神=月支+9)
  for (const { pillar, pillarLabel } of allPillars) {
    const gouJiao1 = BRANCHES[(monthPillarBranchIdx + 3) % 12] // 勾神
    const gouJiao2 = BRANCHES[(monthPillarBranchIdx + 9) % 12] // 绞神
    if (pillar.branch === gouJiao1 || pillar.branch === gouJiao2) {
      results.push({
        name: '勾绞',
        category: '凶',
        source: '月支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['勾绞'],
      })
    }
  }

  // 元辰/大耗: year + 6 = 对冲 (岁破)
  for (const { pillar, pillarLabel } of allPillars) {
    const yuanChenBranch = BRANCHES[(branchIdx(yearBranch) + 6) % 12]
    if (pillar.branch === yuanChenBranch) {
      results.push({
        name: '元辰',
        category: '凶',
        source: '年支',
        pillar: pillarLabel,
        position: '地支',
        description: SHENSHA_DESC['元辰'],
      })
    }
  }

  return results
}
