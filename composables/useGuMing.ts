// ── 称骨算命 · 袁天罡骨重计算引擎 ──────────────────────
//
// 基于出生农历年/月/日/时查骨重表，计算总骨重并匹配称骨歌断语。
// 纯计算函数，无 Vue 响应式依赖。

import {
  YEAR_WEIGHTS,
  MONTH_WEIGHTS,
  DAY_WEIGHTS,
  HOUR_WEIGHTS,
  HOUR_NAMES,
  SIXTY_JIAZI,
  FORTUNE_TEXTS,
  LEVEL_CONFIG,
  MIN_WEIGHT,
} from '~/constants/gu-ming'

// ── Types ─────────────────────────────────────────────

export interface GuMingInput {
  /** 农历年 */
  birthYear: number
  /** 农历月 1-12 */
  birthMonth: number
  /** 农历日 1-30 */
  birthDay: number
  /** 时辰 index 0-11 (0=子时) */
  birthHour: number
  /** 性别 */
  gender: 'male' | 'female'
}

export type GuMingLevel = '下下' | '中下' | '中' | '中上' | '上上'

export interface GuMingResult {
  /** 年柱骨重（两） */
  yearWeight: number
  /** 月柱骨重（两） */
  monthWeight: number
  /** 日柱骨重（两） */
  dayWeight: number
  /** 时柱骨重（两） */
  hourWeight: number
  /** 总骨重 */
  totalWeight: number
  /** 总骨重中文表示，如"四两二钱" */
  totalWeightText: string
  /** 称骨歌断语（古文） */
  fortune: string
  /** 白话解读 */
  interpretation: string
  /** 骨重等级 */
  level: GuMingLevel
  /** 年柱干支名 */
  yearGanzhi: string
  /** 时辰名 */
  hourName: string
}

// ── 中文数字映射 ───────────────────────────────────

const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/** 将数字转为中文骨重表示，如 4.2 → "四两二钱" */
function toChineseWeight(weight: number): string {
  const integer = Math.floor(weight)
  const decimal = Math.round((weight - integer) * 10)
  let result = CN_NUM[integer] + '两'
  if (decimal > 0) {
    result += CN_NUM[decimal] + '钱'
  }
  return result
}

// ── 等级判定 ───────────────────────────────────────

function getLevel(totalWeight: number): GuMingLevel {
  if (totalWeight <= 2.9) return '下下'
  if (totalWeight <= 3.9) return '中下'
  if (totalWeight <= 4.9) return '中'
  if (totalWeight <= 5.9) return '中上'
  return '上上'
}

// ── 白话解读生成 ──────────────────────────────────

function generateInterpretation(
  level: GuMingLevel,
  totalWeight: number,
  totalWeightText: string,
): string {
  const levelInfo = LEVEL_CONFIG[level]
  const levelDesc = levelInfo ? levelInfo.desc : ''

  let lines: string[] = []
  lines.push(`尊驾骨重 ${totalWeightText}，属「${level}」之命。`)
  lines.push(levelDesc)
  lines.push(`此命总骨重 ${totalWeight.toFixed(1)} 两，对应称骨歌断语如上。`)
  lines.push(
    '称骨算命乃袁天罡先师所传，以出生年月日时四柱各赋骨重，累积而定命格轻重。骨重愈高，命格愈贵。然命运终由己造，此说仅供参详。',
  )

  return lines.join('\n')
}

// ── 主计算函数 ─────────────────────────────────────

/**
 * 计算称骨算命结果。
 * 输入为农历年/月/日/时，返回完整骨重及断语。
 */
export function calculateGuMing(input: GuMingInput): GuMingResult {
  // 年柱骨重：六十甲子索引
  const ganzhiIndex = (((input.birthYear - 4) % 60) + 60) % 60
  const yearWeight = YEAR_WEIGHTS[ganzhiIndex]
  const yearGanzhi = SIXTY_JIAZI[ganzhiIndex]

  const monthWeight = MONTH_WEIGHTS[input.birthMonth - 1] ?? 0
  const dayWeight = DAY_WEIGHTS[input.birthDay - 1] ?? 0
  const hourWeight = HOUR_WEIGHTS[input.birthHour] ?? 0

  const totalWeight = Math.round((yearWeight + monthWeight + dayWeight + hourWeight) * 10) / 10

  // 找断语
  const fortuneIndex = Math.round((totalWeight - MIN_WEIGHT) * 10)
  const fortune =
    fortuneIndex >= 0 && fortuneIndex < FORTUNE_TEXTS.length ? FORTUNE_TEXTS[fortuneIndex] : ''

  const level = getLevel(totalWeight)
  const totalWeightText = toChineseWeight(totalWeight)
  const interpretation = generateInterpretation(level, totalWeight, totalWeightText)

  return {
    yearWeight,
    monthWeight,
    dayWeight,
    hourWeight,
    totalWeight,
    totalWeightText,
    fortune,
    interpretation,
    level,
    yearGanzhi,
    hourName: HOUR_NAMES[input.birthHour] ?? '',
  }
}
