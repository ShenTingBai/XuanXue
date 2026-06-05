// composables/useZiwei.ts
import { astro } from 'iztro'
import {
  getPalaceInterpretation,
  getStarInterpretation,
  lookupCombination,
} from '~/constants/ziwei'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import type FunctionalStar from 'iztro/lib/star/FunctionalStar'
import { getTrueSolarHour } from '~/utils/time'

// 重新导出 iztro 原生类型供组件使用
export type { IFunctionalPalace, IFunctionalAstrolabe }
export type { FunctionalStar }

export interface ZiWeiInput {
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number | null // iztro timeIndex 0-12
  gender: 'male' | 'female' | null
  birthLongitude?: number | null
}

/**
 * Calculate Ziwei Astrolabe from birth info.
 * 直接返回 iztro 的 FunctionalAstrolabe，不包装。
 */
export function calculateZiWei(input: ZiWeiInput): IFunctionalAstrolabe | null {
  const { birthYear, birthMonth, birthDay, birthHour, gender, birthLongitude } = input
  if (birthHour === null || birthHour === undefined || !gender) return null

  // Apply true solar time correction if birth longitude is available
  // birthHour is iztro timeIndex (0-12), getTrueSolarHour expects clock hour (0-23)
  // Convert timeIndex to clock-hour midpoint before correction, then convert back
  let timeIndex = birthHour
  if (birthLongitude != null) {
    // timeIndex 0 (早子, 0:00-1:00) → midpoint 0.5
    // timeIndex 12 (晚子, 23:00-24:00) → midpoint 23.5
    // timeIndex 1-11 (丑∼亥) → midpoint = timeIndex * 2 (2, 4, ..., 22)
    const clockMidpoint = birthHour === 0 ? 0.5 : birthHour === 12 ? 23.5 : birthHour * 2
    const solarHour = getTrueSolarHour(clockMidpoint, birthLongitude)
    const normalized = ((solarHour % 24) + 24) % 24
    timeIndex = Math.floor((normalized + 1) / 2)
  }

  try {
    const dateStr = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
    return astro.bySolar(dateStr, timeIndex, gender, true, 'zh-CN')
  } catch {
    return null
  }
}

/** 查找命宫在 palaces 中的索引 */
export function getMingGongIndex(palaces: IFunctionalPalace[]): number {
  return palaces.findIndex(p => p.name === '命宫')
}

/**
 * @deprecated Not used in production, kept for test compatibility
 * 查找身宫在 palaces 中的索引
 */
export function getShenGongIndex(palaces: IFunctionalPalace[]): number {
  return palaces.findIndex(p => p.isBodyPalace)
}

/**
 * 从 palaces 收集所有四化。
 * 四化以 star.mutagen 形式存在于每颗星上。
 */
export function collectTransformations(
  palaces: IFunctionalPalace[],
): { star: string; transformation: string }[] {
  const result: { star: string; transformation: string }[] = []
  for (const p of palaces) {
    for (const s of [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]) {
      if (s.mutagen) result.push({ star: s.name, transformation: s.mutagen })
    }
  }
  return result
}

/** 宫位解读（iztro 不提供，纯模板） */
export function getPalaceDetail(palace: IFunctionalPalace): {
  palaceSummary: string
  starReadings: string[]
  combinationNote: string
} {
  const palaceSummary = getPalaceInterpretation(palace.name)
  const starReadings = palace.majorStars
    .map(s => getStarInterpretation(s.name as string))
    .filter(Boolean)

  const starNames: string[] = palace.majorStars.map(s => s.name as string)

  // Look up combination (keys normalized at lookup time for deterministic matching)
  let combinationNote = lookupCombination(starNames)

  // Fallback for 杀破狼 — single star presence (any of the three triggers it)
  if (!combinationNote && ['七杀', '破军', '贪狼'].some(s => starNames.includes(s))) {
    combinationNote = '杀破狼格局，变动中求发展，一生多变动，亦多机遇。'
  }

  return { palaceSummary, starReadings, combinationNote }
}

/** 右侧栏详细宫位视图 */
export function getDetailedPalaceView(palace: IFunctionalPalace): {
  name: string
  branch: string
  stem: string
  majorStars: FunctionalStar[]
  minorStars: FunctionalStar[]
  adjectiveStars: FunctionalStar[]
  transformations: { star: string; transformation: string }[]
  interpretation: ReturnType<typeof getPalaceDetail>
  fullInterpretation: string
  decadalRange: [number, number]
  ages: number[]
} {
  const trans: { star: string; transformation: string }[] = []
  for (const s of [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars]) {
    if (s.mutagen) trans.push({ star: s.name, transformation: s.mutagen })
  }

  // Build combined full interpretation text
  const detail = getPalaceDetail(palace)

  // Start with palace summary
  let fullText = detail.palaceSummary

  // Add star readings
  if (detail.starReadings.length > 0) {
    fullText += ' ' + detail.starReadings.join(' ')
  }

  // Add minor star mentions
  const minorNames = palace.minorStars.map(s => s.name as string).filter(Boolean)
  if (minorNames.length > 0) {
    fullText += ' 辅以' + minorNames.slice(0, 3).join('、') + '。'
  }

  // Add adjective star mentions
  const adjNames = palace.adjectiveStars.map(s => s.name as string).filter(Boolean)
  if (adjNames.length > 0) {
    fullText += ' ' + adjNames.slice(0, 2).join('、') + '同度。'
  }

  // Add combination note
  if (detail.combinationNote) {
    fullText += ' ' + detail.combinationNote
  }

  // Handle empty palace
  if (palace.majorStars.length === 0) {
    fullText += ' 空宫，需结合三方四正综合判断。'
  }

  return {
    name: palace.name,
    branch: palace.earthlyBranch,
    stem: palace.heavenlyStem,
    majorStars: palace.majorStars,
    minorStars: palace.minorStars,
    adjectiveStars: palace.adjectiveStars,
    transformations: trans,
    interpretation: detail,
    fullInterpretation: fullText,
    decadalRange: palace.decadal?.range ?? [0, 0],
    ages: palace.ages,
  }
}

/**
 * 序列化 FunctionalAstrolabe 为纯对象（用于 API 存储）。
 * iztro 的类实例不可直接 structuredClone。
 */
export function serializeAstrolabe(astrolabe: IFunctionalAstrolabe): Record<string, unknown> {
  return {
    earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace,
    fiveElementsClass: astrolabe.fiveElementsClass,
    soul: astrolabe.soul,
    body: astrolabe.body,
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate,
    gender: astrolabe.gender,
    palaces: astrolabe.palaces.map(p => ({
      index: p.index,
      name: p.name,
      earthlyBranch: p.earthlyBranch,
      heavenlyStem: p.heavenlyStem,
      isBodyPalace: p.isBodyPalace,
      majorStars: p.majorStars.map(s => ({
        name: s.name,
        type: s.type,
        brightness: s.brightness,
        mutagen: s.mutagen,
        isMajor: true,
      })),
      minorStars: p.minorStars.map(s => ({
        name: s.name,
        type: s.type,
        mutagen: s.mutagen,
        isMajor: false,
      })),
      adjectiveStars: p.adjectiveStars.map(s => ({
        name: s.name,
        type: s.type,
        mutagen: s.mutagen,
      })),
      decadalRange: p.decadal?.range ?? [0, 0],
      ages: p.ages,
    })),
  }
}

// ── 纯数据接口（匹配序列化形状，用于快照恢复） ──

export interface ZiWeiStarData {
  name: string
  type: string
  brightness?: string
  mutagen?: string
  isMajor?: boolean
}

export interface ZiWeiPalaceData {
  index: number
  name: string
  earthlyBranch: string
  heavenlyStem: string
  isBodyPalace: boolean
  majorStars: ZiWeiStarData[]
  minorStars: ZiWeiStarData[]
  adjectiveStars: ZiWeiStarData[]
  decadalRange: [number, number]
  ages: number[]
  scope?: string
  isOriginalPalace?: boolean
  changsheng12?: string
  originalIndex?: number
}

export interface ZiWeiAstrolabeData {
  earthlyBranchOfSoulPalace: string
  earthlyBranchOfBodyPalace: string
  fiveElementsClass: string
  soul: string
  body: string
  solarDate: string
  lunarDate: string
  chineseDate: string
  gender: 'male' | 'female'
  palaces: ZiWeiPalaceData[]
}

/**
 * 从序列化的纯数据恢复 astrolabe（快照恢复）。
 * 利用结构类型兼容性：组件只读属性，不调方法，强制转型安全。
 * 关键：将拍平的 decadalRange 重新映射为 decadal.range。
 */
export function deserializeAstrolabe(raw: Record<string, unknown>): IFunctionalAstrolabe | null {
  if (!raw || !Array.isArray(raw.palaces)) return null
  const data = raw as unknown as ZiWeiAstrolabeData
  const palaces = data.palaces.map(p => ({
    ...p,
    decadal: { range: p.decadalRange },
  }))
  // Explicit validation: type assertions never throw, so we must check manually.
  for (const p of palaces) {
    const dr = p.decadal?.range
    if (
      !Array.isArray(dr) ||
      dr.length !== 2 ||
      typeof dr[0] !== 'number' ||
      typeof dr[1] !== 'number'
    ) {
      return null
    }
    if (!Array.isArray(p.ages) || !p.ages.every(a => typeof a === 'number')) {
      return null
    }
  }
  return {
    ...data,
    palaces,
  } as unknown as IFunctionalAstrolabe
}
