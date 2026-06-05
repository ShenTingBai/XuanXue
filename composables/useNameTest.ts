// ── 姓名测试 · 五格剖象法计算引擎 ──────────────────────────

import { getStrokeCount } from '~/constants/stroke-dict'
import {
  getNumberMeaning,
  getNumberWuxing,
  getSanCaiFortune,
  getNumberCategories,
  calculateNameScore,
} from '~/constants/name-test'

// ── Types ─────────────────────────────────────────────

export interface GridResult {
  /** 名称 */
  name: string
  /** 笔画数 */
  strokes: number
  /** 五行 */
  wuxing: string
  /** 吉凶 */
  fortune: '吉' | '凶' | '半吉'
  /** 含义 */
  meaning: string
}

export interface NameTestResult {
  /** 全名 */
  fullName: string
  /** 姓氏 */
  surname: string
  /** 名字 */
  givenName: string
  /** 五格 */
  grids: {
    tian: GridResult // 天格
    ren: GridResult // 人格（主运）
    di: GridResult // 地格（前运）
    total: GridResult // 总格（后运）
    wai: GridResult // 外格（副运）
  }
  /** 三才配置 */
  sanCai: {
    tian: string
    ren: string
    di: string
    fortune: '吉' | '凶' | '半吉'
  }
  /** 分类标签 */
  categories: string[]
  /** 总分 (0-100) */
  totalScore: number
  /** 总结 */
  summary: string
  /** 细分项 */
  details: {
    label: string
    text: string
  }[]
}

// ════════════════════════════════════════
// 五格计算
// ════════════════════════════════════════

function toValidNumber(n: number): number {
  if (n <= 0 || n > 81) return ((((n - 1) % 81) + 81) % 81) + 1
  return n
}

function analyzeGrid(num: number): GridResult {
  const validNum = toValidNumber(num)
  const meaning = getNumberMeaning(validNum)
  return {
    name: meaning.name,
    strokes: num,
    wuxing: getNumberWuxing(num),
    fortune: meaning.fortune,
    meaning: meaning.meaning,
  }
}

/**
 * 计算姓名五格剖象
 *
 * @param surname 姓氏
 * @param givenName 名字（可含多字）
 */
export function calculateNameTest(surname: string, givenName: string): NameTestResult | null {
  if (!surname || !givenName) return null

  const fullName = surname + givenName

  // 1. 计算每个字的笔画
  const allChars = (surname + givenName).split('')
  const strokes = allChars.map(ch => getStrokeCount(ch))

  // 如果有未知笔画，返回 null
  if (strokes.some(s => s === null || s === undefined)) return null

  const strokeVals = strokes as number[]
  const sLen = surname.length
  const gLen = givenName.length

  // 2. 天格：单姓+1，复姓相加
  let tianStrokes: number
  if (sLen === 1) {
    tianStrokes = strokeVals[0] + 1
  } else {
    tianStrokes = strokeVals.slice(0, sLen).reduce((a, b) => a + b, 0)
  }

  // 3. 人格：姓的最末+名的第一
  const lastNameChar = strokeVals[sLen - 1]
  const firstNameChar = gLen > 0 ? strokeVals[sLen] : 0 // 无名=0不应出现
  const renStrokes = lastNameChar + firstNameChar

  // 4. 地格：名笔画相加，单名+1
  let diStrokes: number
  if (gLen === 1) {
    diStrokes = strokeVals[sLen] + 1
  } else {
    diStrokes = strokeVals.slice(sLen).reduce((a, b) => a + b, 0)
  }

  // 5. 总格：全部笔画和
  const totalStrokes = strokeVals.reduce((a, b) => a + b, 0)

  // 6. 外格 = 总格 - 人格 + 1（单姓/复姓规则统一简化）
  const waiStrokes = totalStrokes - renStrokes + 1

  // 7. 分析各格
  const tian = analyzeGrid(tianStrokes)
  const ren = analyzeGrid(renStrokes)
  const di = analyzeGrid(diStrokes)
  const total = analyzeGrid(totalStrokes)
  const wai = analyzeGrid(waiStrokes)

  // 8. 三才配置
  const sanCaiFortune = getSanCaiFortune(tian.wuxing, ren.wuxing, di.wuxing)

  // 9. 分类
  const renCat = getNumberCategories(toValidNumber(renStrokes))
  const totalCat = getNumberCategories(toValidNumber(totalStrokes))
  const categories = [...new Set([...renCat, ...totalCat])]

  // 10. 总分
  const totalScore = calculateNameScore(
    tian.fortune,
    ren.fortune,
    di.fortune,
    total.fortune,
    wai.fortune,
    sanCaiFortune,
  )

  // 11. 总结
  const summary = genSummary(totalScore, sanCaiFortune, ren.fortune, categories)

  // 12. 详情
  const details = genDetails(
    tian,
    ren,
    di,
    total,
    wai,
    sanCaiFortune,
    { tian: tian.wuxing, ren: ren.wuxing, di: di.wuxing },
    categories,
  )

  return {
    fullName,
    surname,
    givenName,
    grids: { tian, ren, di, total, wai },
    sanCai: { tian: tian.wuxing, ren: ren.wuxing, di: di.wuxing, fortune: sanCaiFortune },
    categories,
    totalScore,
    summary,
    details,
  }
}

function genSummary(
  score: number,
  sanCai: '吉' | '凶' | '半吉',
  ren: '吉' | '凶' | '半吉',
  categories: string[],
): string {
  const lines: string[] = []

  if (score >= 80) {
    lines.push('姓名格局相当不错，五格配置良好，三才相生，乃大吉之数。')
  } else if (score >= 60) {
    lines.push('姓名格局尚可，整体配置无明显破格，但仍有个别数理需留意。')
  } else if (score >= 40) {
    lines.push('姓名格局一般，部分数理略显不足，可通过改名或使用字号来调和。')
  } else {
    lines.push('姓名格局偏弱，建议多加权衡，可考虑改名以改善运势。')
  }

  if (sanCai === '吉') {
    lines.push('三才配置相生，天人地和谐，一生运势较为平顺。')
  } else if (sanCai === '凶') {
    lines.push('三才配置相克，需注意天人地之间的冲突，宜以修身养性来应对。')
  }

  if (ren === '吉') {
    lines.push('主运人格为吉数，一生运势根基良好。')
  } else if (ren === '凶') {
    lines.push('主运人格为凶数，需更加努力方能成就事业。')
  }

  if (categories.length > 0) {
    lines.push(`数理分类包含：${categories.join('、')}。`)
  }

  lines.push('此分析以五格剖象法为依据，仅供参考。真正的命运掌握在自己手中。')

  return lines.join('')
}

function genDetails(
  tian: GridResult,
  ren: GridResult,
  di: GridResult,
  total: GridResult,
  wai: GridResult,
  sanCaiFortune: '吉' | '凶' | '半吉',
  sanCaiWuxing: { tian: string; ren: string; di: string },
  categories: string[],
): { label: string; text: string }[] {
  return [
    {
      label: '天格',
      text: `${tian.strokes} 数 · ${tian.name} · 五行${tian.wuxing} · ${tian.fortune === '吉' ? '吉' : tian.fortune === '半吉' ? '平' : '凶'} · ${tian.meaning}`,
    },
    {
      label: '人格（主运）',
      text: `${ren.strokes} 数 · ${ren.name} · 五行${ren.wuxing} · ${ren.fortune === '吉' ? '吉' : ren.fortune === '半吉' ? '平' : '凶'} · ${ren.meaning}`,
    },
    {
      label: '地格（前运）',
      text: `${di.strokes} 数 · ${di.name} · 五行${di.wuxing} · ${di.fortune === '吉' ? '吉' : di.fortune === '半吉' ? '平' : '凶'} · ${di.meaning}`,
    },
    {
      label: '总格（后运）',
      text: `${total.strokes} 数 · ${total.name} · 五行${total.wuxing} · ${total.fortune === '吉' ? '吉' : total.fortune === '半吉' ? '平' : '凶'} · ${total.meaning}`,
    },
    {
      label: '外格（副运）',
      text: `${wai.strokes} 数 · ${wai.name} · 五行${wai.wuxing} · ${wai.fortune === '吉' ? '吉' : wai.fortune === '半吉' ? '平' : '凶'} · ${wai.meaning}`,
    },
    {
      label: '三才配置',
      text: `天格${sanCaiWuxing.tian} → 人格${sanCaiWuxing.ren} → 地格${sanCaiWuxing.di} · ${sanCaiFortune === '吉' ? '相生大吉' : sanCaiFortune === '半吉' ? '半吉' : '相克大凶'}`,
    },
    {
      label: '数理分类',
      text: categories.length > 0 ? categories.join('、') : '无特殊数理',
    },
  ]
}
