// ═══════════════════════════════════════════════════════════════
// 易经六爻 · 纳甲装卦数据层
// ═══════════════════════════════════════════════════════════════
//
// 方法论：京房纳甲法 + 六爻装卦体系
//   八宫卦序 & 世应定位 → 京房《京氏易传》（西汉），八宫卦变法
//   纳甲（干支配卦）→ 京房纳甲法，《卜筮正宗》《增删卜易》校订
//   六亲（父母/兄弟/官鬼/妻财/子孙）→ 京房六亲配法，以宫卦五行为我
//   六神（青龙/朱雀/勾陈/螣蛇/白虎/玄武）→ 以日干定六神，《卜筮正宗》
//   五行生克循环 → 《易经》五行原理
// ⚠ 开发者合成：六亲配法为工程实现（nextInCycle/prevInCycle/controlOver），
//   六神日干分组映射（甲乙→0/丙丁→1/...），12 地支五行表

// ============================
// Types
// ============================

export type Gong = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤'
export type LiuQin = '父母' | '兄弟' | '官鬼' | '妻财' | '子孙'
export type LiuShen = '青龙' | '朱雀' | '勾陈' | '螣蛇' | '白虎' | '玄武'

// ============================
// Trigram & Palace data
// ============================

export const TRIGRAM_NAMES = ['坤', '震', '坎', '兑', '艮', '离', '巽', '乾']
export const TRIGRAM_WUXING = ['土', '木', '水', '金', '土', '火', '木', '金']
export const PALACE_NAMES = ['乾宫', '兑宫', '离宫', '震宫', '巽宫', '坎宫', '艮宫', '坤宫']
export const PALACE_WUXING = ['金', '金', '火', '木', '木', '水', '土', '土']

// trigram -> palace index: 乾(7)->0,兑(3)->1,离(5)->2,震(1)->3,巽(6)->4,坎(2)->5,艮(4)->6,坤(0)->7
export const TRIGRAM_TO_PALACE = [7, 3, 5, 1, 6, 2, 4, 0]

// 世 positions for palace positions 1-8
export const SHI_POSITIONS = [6, 1, 2, 3, 4, 5, 4, 3]

// Branch 五行 lookup
export const BRANCH_WUXING: Record<string, string> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}

// ============================
// Na Jia (stem-branch assignments per palace)
// inner = lines 1-3, outer = lines 4-6
// ============================

export interface NaJiaEntry {
  stem: string
  branch: string
}

export const NA_JIA_INNER: NaJiaEntry[][] = [
  [
    { stem: '甲', branch: '子' },
    { stem: '甲', branch: '寅' },
    { stem: '甲', branch: '辰' },
  ], // 乾
  [
    { stem: '丁', branch: '巳' },
    { stem: '丁', branch: '卯' },
    { stem: '丁', branch: '丑' },
  ], // 兑
  [
    { stem: '己', branch: '卯' },
    { stem: '己', branch: '丑' },
    { stem: '己', branch: '亥' },
  ], // 离
  [
    { stem: '庚', branch: '子' },
    { stem: '庚', branch: '寅' },
    { stem: '庚', branch: '辰' },
  ], // 震
  [
    { stem: '辛', branch: '丑' },
    { stem: '辛', branch: '亥' },
    { stem: '辛', branch: '酉' },
  ], // 巽
  [
    { stem: '戊', branch: '寅' },
    { stem: '戊', branch: '辰' },
    { stem: '戊', branch: '午' },
  ], // 坎
  [
    { stem: '丙', branch: '辰' },
    { stem: '丙', branch: '午' },
    { stem: '丙', branch: '申' },
  ], // 艮
  [
    { stem: '乙', branch: '未' },
    { stem: '乙', branch: '巳' },
    { stem: '乙', branch: '卯' },
  ], // 坤
]

export const NA_JIA_OUTER: NaJiaEntry[][] = [
  [
    { stem: '壬', branch: '午' },
    { stem: '壬', branch: '申' },
    { stem: '壬', branch: '戌' },
  ], // 乾
  [
    { stem: '丁', branch: '亥' },
    { stem: '丁', branch: '酉' },
    { stem: '丁', branch: '未' },
  ], // 兑
  [
    { stem: '己', branch: '酉' },
    { stem: '己', branch: '未' },
    { stem: '己', branch: '巳' },
  ], // 离
  [
    { stem: '庚', branch: '午' },
    { stem: '庚', branch: '申' },
    { stem: '庚', branch: '戌' },
  ], // 震
  [
    { stem: '辛', branch: '未' },
    { stem: '辛', branch: '巳' },
    { stem: '辛', branch: '卯' },
  ], // 巽
  [
    { stem: '戊', branch: '申' },
    { stem: '戊', branch: '戌' },
    { stem: '戊', branch: '子' },
  ], // 坎
  [
    { stem: '丙', branch: '戌' },
    { stem: '丙', branch: '子' },
    { stem: '丙', branch: '寅' },
  ], // 艮
  [
    { stem: '癸', branch: '丑' },
    { stem: '癸', branch: '亥' },
    { stem: '癸', branch: '酉' },
  ], // 坤
]

// ============================
// Wuxing Cycle helpers
// ============================

export const WUXING_CYCLE = ['木', '火', '土', '金', '水']

export function nextInCycle(el: string): string {
  const i = WUXING_CYCLE.indexOf(el)
  return WUXING_CYCLE[(i + 1) % 5]
}

export function prevInCycle(el: string): string {
  const i = WUXING_CYCLE.indexOf(el)
  return WUXING_CYCLE[(i + 4) % 5]
}

/** What element `el` controls (我克): element 2 steps forward in cycle */
export function controlOver(el: string): string {
  const i = WUXING_CYCLE.indexOf(el)
  return WUXING_CYCLE[(i + 2) % 5]
}

/** Six Relations (六亲) based on palace wuxing vs. line branch wuxing */
export function getSixRelation(palaceWx: string, lineWx: string): string {
  if (palaceWx === lineWx) return '兄弟'
  if (nextInCycle(palaceWx) === lineWx) return '子孙' // 我生: palace generates line
  if (prevInCycle(palaceWx) === lineWx) return '父母' // 生我: line generates palace
  if (controlOver(palaceWx) === lineWx) return '妻财' // 我克: palace controls line
  return '官鬼' // 克我: line controls palace
}

// ============================
// Six Spirits (六神) based on day stem
// ============================

export const SIX_SPIRITS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']

// 甲乙→0, 丙丁→1, 戊→2, 己→3, 庚辛→4, 壬癸→5
export const STEM_GROUPS: Record<string, number> = {
  甲: 0,
  乙: 0,
  丙: 1,
  丁: 1,
  戊: 2,
  己: 3,
  庚: 4,
  辛: 4,
  壬: 5,
  癸: 5,
}
