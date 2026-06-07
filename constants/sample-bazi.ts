// ═══════════════════════════════════════════════════════════════
// 示例八字数据（预计算）
// ═══════════════════════════════════════════════════════════════
//
// 1990年5月15日 午时 · 男命 · 阳历
// 四柱：庚午 辛巳 庚午 壬午 · 日主庚金 · 身弱
//
// 此文件为首页"命盘预览"提供静态数据，避免在客户端急切导入
// calculateBaZi / calculateShenSha（约 500KB 计算库）。
// ═══════════════════════════════════════════════════════════════

import type { BaZiResult, BaZiPillar } from '~/composables/useBaZi'
import type { ShenSha } from '~/composables/useShenSha'

const yearPillar: BaZiPillar = {
  stem: '庚',
  branch: '午',
  stemTenGod: '比肩',
  branchTenGod: '正官',
  hiddenStems: [
    { stem: '丁', tenGod: '正官', wuxing: '火' },
    { stem: '己', tenGod: '正印', wuxing: '土' },
  ],
  stemWuxing: '金',
  branchWuxing: '火',
}

const monthPillar: BaZiPillar = {
  stem: '辛',
  branch: '巳',
  stemTenGod: '劫财',
  branchTenGod: '偏官',
  hiddenStems: [
    { stem: '丙', tenGod: '偏官', wuxing: '火' },
    { stem: '庚', tenGod: '比肩', wuxing: '金' },
    { stem: '戊', tenGod: '偏印', wuxing: '土' },
  ],
  stemWuxing: '金',
  branchWuxing: '火',
}

const dayPillar: BaZiPillar = {
  stem: '庚',
  branch: '午',
  stemTenGod: '日主',
  branchTenGod: '正官',
  hiddenStems: [
    { stem: '丁', tenGod: '正官', wuxing: '火' },
    { stem: '己', tenGod: '正印', wuxing: '土' },
  ],
  stemWuxing: '金',
  branchWuxing: '火',
}

const hourPillar: BaZiPillar = {
  stem: '壬',
  branch: '午',
  stemTenGod: '食神',
  branchTenGod: '正官',
  hiddenStems: [
    { stem: '丁', tenGod: '正官', wuxing: '火' },
    { stem: '己', tenGod: '正印', wuxing: '土' },
  ],
  stemWuxing: '水',
  branchWuxing: '火',
}

export const SAMPLE_BAZI: BaZiResult = {
  yearPillar,
  monthPillar,
  dayPillar,
  hourPillar,
  dayMaster: '庚',
  dayMasterWuxing: '金',
  dayMasterStrength: '弱',
  favorableElements: ['水', '土', '金'],
  unfavorableElements: ['火', '木'],
  elementCounts: { 木: 1, 火: 8, 土: 6, 金: 5, 水: 1 },
  elementPercentages: { 木: 4.8, 火: 38.1, 土: 28.6, 金: 23.8, 水: 4.8 },
  daYun: [],
  birthYear: 1990,
  birthCalendar: 'solar',
  birthHour: 11,
  gender: '男',
}

export const SAMPLE_SHENSHA: ShenSha[] = [
  {
    name: '福星贵人',
    category: '吉',
    source: '日干',
    pillar: '年柱',
    position: '地支',
    description: '天生福气，一生少灾少难，衣食无忧',
  },
]

/** 预计算的显著神煞（去重后，仅保留常见吉神） */
export const SAMPLE_PROMINENT_SHENSHA: ShenSha[] = SAMPLE_SHENSHA
