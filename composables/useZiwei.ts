// composables/useZiwei.ts
import { astro } from 'iztro'
import { getPalaceInterpretation, getStarInterpretation } from '~/constants/ziwei'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import type FunctionalStar from 'iztro/lib/star/FunctionalStar'

// 重新导出 iztro 原生类型供组件使用
export type { IFunctionalPalace, IFunctionalAstrolabe }
export type { FunctionalStar }

export interface ZiWeiInput {
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number | null   // iztro timeIndex 0-12
  gender: 'male' | 'female' | null
}

/**
 * Calculate Ziwei Astrolabe from birth info.
 * 直接返回 iztro 的 FunctionalAstrolabe，不包装。
 */
export function calculateZiWei(input: ZiWeiInput): IFunctionalAstrolabe | null {
  const { birthYear, birthMonth, birthDay, birthHour, gender } = input
  if (birthHour === null || birthHour === undefined || !gender) return null

  try {
    const dateStr = `${birthYear}-${birthMonth}-${birthDay}`
    return astro.bySolar(dateStr, birthHour, gender, true, 'zh-CN')
  } catch {
    return null
  }
}

/** 查找命宫在 palaces 中的索引 */
export function getMingGongIndex(palaces: IFunctionalPalace[]): number {
  return palaces.findIndex(p => p.name === '命宫')
}

/** 查找身宫在 palaces 中的索引 */
export function getShenGongIndex(palaces: IFunctionalPalace[]): number {
  return palaces.findIndex(p => p.isBodyPalace)
}

/**
 * 从 palaces 收集所有四化。
 * 四化以 star.mutagen 形式存在于每颗星上。
 */
export function collectTransformations(palaces: IFunctionalPalace[]): { star: string; transformation: string }[] {
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
  const starReadings = palace.majorStars.map(s => getStarInterpretation(s.name as string)).filter(Boolean)

  const starNames: string[] = palace.majorStars.map(s => s.name as string)
  let combinationNote = ''
  if (starNames.includes('紫微') && starNames.includes('天相')) {
    combinationNote = '紫微天相同宫，辅弼之星入命，格局高贵。'
  } else if (['七杀', '破军', '贪狼'].some(s => starNames.includes(s))) {
    combinationNote = '杀破狼格局，变动中求发展，一生多变动，亦多机遇。'
  } else if (starNames.includes('廉贞') && starNames.includes('贪狼')) {
    combinationNote = '廉贞贪狼同宫，桃花泛水，才艺出众。'
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
  decadalRange: [number, number]
  ages: number[]
} {
  const trans: { star: string; transformation: string }[] = []
  for (const s of [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars]) {
    if (s.mutagen) trans.push({ star: s.name, transformation: s.mutagen })
  }

  return {
    name: palace.name,
    branch: palace.earthlyBranch,
    stem: palace.heavenlyStem,
    majorStars: palace.majorStars,
    minorStars: palace.minorStars,
    adjectiveStars: palace.adjectiveStars,
    transformations: trans,
    interpretation: getPalaceDetail(palace),
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
        name: s.name, type: s.type, brightness: s.brightness, mutagen: s.mutagen,
      })),
      minorStars: p.minorStars.map(s => ({
        name: s.name, type: s.type, mutagen: s.mutagen,
      })),
      adjectiveStars: p.adjectiveStars.map(s => ({
        name: s.name, type: s.type, mutagen: s.mutagen,
      })),
      decadalRange: p.decadal?.range ?? [0, 0],
      ages: p.ages,
    })),
  }
}
