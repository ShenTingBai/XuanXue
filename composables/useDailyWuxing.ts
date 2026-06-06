// ═══════════════════════════════════════════════════════════════
// 五行穿衣指南 · Daily Wuxing Clothing Guide
// ═══════════════════════════════════════════════════════════════
//
// 基于当日天干五行，推荐穿衣颜色：
//   - 宜：生我（滋养我）+ 同我（与我相同）
//   - 避：克我（制约我）+ 我克（我制约，消耗能量）
//
// 依赖 lunar-javascript 精确计算日干支。
// 纯计算——无响应式状态。
// ═══════════════════════════════════════════════════════════════

import { Lunar } from 'lunar-javascript'
import { WUXING_STEM } from '~/constants/bazi'

export interface DailyWuxingResult {
  dayStem: string
  dayWuxing: string
  luckyColors: string[]
  luckyColorNames: string[]
  avoidColors: string[]
  avoidColorNames: string[]
}

// 五行相生顺序：木→火→土→金→水→木
const GENERATING_CYCLE = ['木', '火', '土', '金', '水']

// 五行相克顺序：木→土→水→火→金→木
const CONTROLLING_CYCLE = ['木', '土', '水', '火', '金']

// 五行对应推荐颜色（hex + 中文名）
const WUXING_COLOR_MAP: Record<string, { colors: string[]; names: string[] }> = {
  木: { colors: ['#3D6B4B', '#4CAF50'], names: ['绿', '青'] },
  火: { colors: ['#C62828', '#E65100'], names: ['红', '朱'] },
  土: { colors: ['#7A5E12', '#A1887F'], names: ['黄', '棕'] },
  金: { colors: ['#F5F5F5', '#FFD700'], names: ['白', '金'] },
  水: { colors: ['#1A237E', '#37474F'], names: ['蓝', '黑'] },
}

/**
 * 获取当日五行穿衣推荐。
 * 根据日干五行，推荐宜穿（生我 + 同我）和忌穿（克我 + 我克）的颜色。
 *
 * @param date - 可选日期，默认为今天
 * @returns DailyWuxingResult 包含日干、五行、推荐/避忌颜色
 */
export function getDailyWuxing(date?: Date): DailyWuxingResult {
  const now = date ?? new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()

  // 通过 lunar-javascript 获取日干支
  const lunar = Lunar.fromYmd(y, m, d)
  const dayGanZhi = lunar.getDayInGanZhi() // 如 "甲子"
  const dayStem = dayGanZhi[0]

  // 天干 → 五行
  const dayWuxing = WUXING_STEM[dayStem] || '土'

  const genIdx = GENERATING_CYCLE.indexOf(dayWuxing)
  const ctrlIdx = CONTROLLING_CYCLE.indexOf(dayWuxing)

  // 宜：生我（滋养日主五行） + 同我（与日主相同）
  const generatesMe = GENERATING_CYCLE[(genIdx + 4) % 5]
  const luckyElements = [generatesMe, dayWuxing]

  // 避：克我（制约日主五行） + 我克（日主所克，消耗能量）
  const controlsMe = CONTROLLING_CYCLE[(ctrlIdx + 4) % 5]
  const iControl = CONTROLLING_CYCLE[(ctrlIdx + 1) % 5]
  const avoidElements = [controlsMe, iControl]

  const luckyColors: string[] = []
  const luckyColorNames: string[] = []
  const avoidColors: string[] = []
  const avoidColorNames: string[] = []

  for (const wx of luckyElements) {
    const info = WUXING_COLOR_MAP[wx]
    if (info) {
      luckyColors.push(...info.colors)
      luckyColorNames.push(...info.names)
    }
  }

  for (const wx of avoidElements) {
    const info = WUXING_COLOR_MAP[wx]
    if (info) {
      avoidColors.push(...info.colors)
      avoidColorNames.push(...info.names)
    }
  }

  return {
    dayStem,
    dayWuxing,
    luckyColors,
    luckyColorNames,
    avoidColors,
    avoidColorNames,
  }
}
