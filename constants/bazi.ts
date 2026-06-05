// ═══════════════════════════════════════════════════════════════
// 八字命理 · 基础常量
// ═══════════════════════════════════════════════════════════════
//
// 方法论：传统子平八字（四柱推命）
//
//   天干地支、五行属性、纳音 → 《渊海子平》卷一（宋代徐大升）
//   六十甲子 → 干支纪年体系（商周起源，汉代定型）
//   五行生克 → 《黄帝内经》五行体系 / 《三命通会》卷一
//   纳音五行 → 《六十甲子纳音表》（京房纳甲体系）
//
// ⚠ 开发者合成：
//   - WUXING_COLORS 色值 → 设计系统指定（朱砂=火、玉=木等）
//   - WUXING_FALLBACK_COLOR → 墨色阶 ink-medium
//
// 本文件为项目唯一数据源。禁止在其他组件或 composable 中重新定义
// STEMS、BRANCHES、WUXING_COLORS。
// ═══════════════════════════════════════════════════════════════

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
export const WUXING_COLORS: Record<string, string> = {
  '木': '#3D6B4B', '火': '#C62828', '土': '#7A5E12',
  '金': '#5E5E5E', '水': '#2C5F7C',
}
export const WUXING_FALLBACK_COLOR = '#6B5B4F'

export const WUXING_STEM: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
}

export const WUXING_BRANCH: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
}

/** Get the index of a heavenly stem in the STEMS array. Returns -1 if not found. */
export function getStemIndex(stem: string): number {
  return STEMS.indexOf(stem)
}

/** NaYin table for 60-cycle sexagenary pairs (one entry per pair of stem+branch). */
export const NAYIN_TABLE: string[] = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火',
  '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土',
  '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木',
  '壁上土', '金箔金', '佛灯火', '天河水', '大驿土', '钗钏金',
  '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
]

/** Get the NaYin element for a given stem-branch pair. Returns empty string if invalid. */
export function getNaYin(stem: string, branch: string): string {
  const stemIdx = STEMS.indexOf(stem)
  const branchIdx = BRANCHES.indexOf(branch)
  if (stemIdx < 0 || branchIdx < 0) return ''
  // Valid sexagenary pairs: stem and branch indices must have same parity
  if ((stemIdx - branchIdx) % 2 !== 0) return ''
  // Sexagenary cycle position formula
  const k = (((stemIdx - branchIdx) / 2) + 6) % 6
  const sexagenaryPos = ((stemIdx + 10 * k) % 60 + 60) % 60
  return NAYIN_TABLE[Math.floor(sexagenaryPos / 2)] || ''
}

/** Convert hex color (e.g. '#4A7C59') to rgba with custom alpha */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`
}

/** Return Tailwind CSS classes for day master strength display */
export function strengthColorClass(strength: string): string {
  if (strength === '强' || strength === '偏强') return 'text-cinnabar font-medium'
  if (strength === '偏弱' || strength === '弱') return 'text-wuxing-water font-medium'
  return 'text-gold font-medium'
}

/** Get the display color for a wuxing element with fallback */
export function wuxingColor(wx: string): string {
  return WUXING_COLORS[wx] || WUXING_FALLBACK_COLOR
}

// === Shared static data (migrated from pages/tools/bazi.vue) ===

/** Element-to-life-area mapping from standard five element theory */
export const ELEMENT_LIFE_AREA: Record<string, string> = {
  '木': '成长、学习、创造',
  '火': '行动、社交、热情',
  '土': '稳定、储蓄、规划',
  '金': '纪律、决策、果断',
  '水': '沟通、智慧、灵活',
}

/** Section name to DOM id mapping for anchor navigation */
export const sectionMap: Record<string, string> = {
  '排盘': 'bazi-grid',
  '神煞': 'shensha',
  '日主': 'day-master',
  '五行': 'elements',
  '大运': 'dayun',
  '流年': 'liunian',
  '解读': 'reading-guide',
}

/** Rule-based da yun meaning from the stem's ten god type */
export function getDaYunMeaning(tenGod: string): string {
  const map: Record<string, string> = {
    '正官': '正官大运，事业运旺，利于建立规范与秩序',
    '偏官': '七杀大运，挑战与机遇并存，宜果断突破',
    '正财': '正财大运，财运稳定，利于积累与储蓄',
    '偏财': '偏财大运，偏财运佳，但需注意风险把控',
    '正印': '正印大运，学习运强，有贵人长辈提携',
    '偏印': '偏印大运，思维敏锐，适合钻研与内省',
    '食神': '食神大运，创造力旺盛，生活轻松愉悦',
    '伤官': '伤官大运，才华得以施展，但需注意言行分寸',
    '比肩': '比肩大运，竞争与协作并存，宜借助团队力量',
    '劫财': '劫财大运，需防范破财损耗，宜守不宜攻',
  }
  return map[tenGod] || `${tenGod}大运，宜顺势而为`
}

/** Chinese zodiac animal names in order (starting from Rat/鼠) */
export const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

/** Get the zodiac animal name for a given year */
export function getAnimal(year: number): string {
  return ANIMALS[((year - 4) % 12 + 12) % 12]
}

/** Get badge style for a shensha category (shared between ShenShaPanel and LiuNianTimeline) */
export function shenShaBadgeStyle(category: '吉' | '中性' | '凶'): { bg: string; text: string; border: string } {
  if (category === '吉') return { bg: `color-mix(in srgb, ${WUXING_COLORS['木']} 8%, transparent)`, text: WUXING_COLORS['木'], border: `color-mix(in srgb, ${WUXING_COLORS['木']} 25%, transparent)` }
  if (category === '凶') return { bg: `color-mix(in srgb, ${WUXING_COLORS['火']} 8%, transparent)`, text: WUXING_COLORS['火'], border: `color-mix(in srgb, ${WUXING_COLORS['火']} 25%, transparent)` }
  return { bg: `color-mix(in srgb, ${WUXING_FALLBACK_COLOR} 8%, transparent)`, text: WUXING_FALLBACK_COLOR, border: `color-mix(in srgb, ${WUXING_FALLBACK_COLOR} 25%, transparent)` }
}

// === Nayin Wuxing (纳音五行) — 60 甲子 mapping from 三命通会 ===

/** Mapping of 60 甲子 stem+branch pair to its nayin wuxing (木/火/土/金/水). */
export const NAYIN_WUXING_MAP: Record<string, string> = {
  // 甲子旬
  '甲子': '金', '乙丑': '金', '丙寅': '火', '丁卯': '火', '戊辰': '木', '己巳': '木',
  '庚午': '土', '辛未': '土', '壬申': '金', '癸酉': '金', '甲戌': '火', '乙亥': '火',
  // 丙子旬
  '丙子': '水', '丁丑': '水', '戊寅': '土', '己卯': '土', '庚辰': '金', '辛巳': '金',
  '壬午': '木', '癸未': '木', '甲申': '水', '乙酉': '水', '丙戌': '土', '丁亥': '土',
  // 戊子旬
  '戊子': '火', '己丑': '火', '庚寅': '木', '辛卯': '木', '壬辰': '水', '癸巳': '水',
  '甲午': '金', '乙未': '金', '丙申': '火', '丁酉': '火', '戊戌': '木', '己亥': '木',
  // 庚子旬
  '庚子': '土', '辛丑': '土', '壬寅': '金', '癸卯': '金', '甲辰': '火', '乙巳': '火',
  '丙午': '水', '丁未': '水', '戊申': '土', '己酉': '土', '庚戌': '金', '辛亥': '金',
  // 壬子旬
  '壬子': '木', '癸丑': '木', '甲寅': '水', '乙卯': '水', '丙辰': '土', '丁巳': '土',
  '戊午': '火', '己未': '火', '庚申': '木', '辛酉': '木', '壬戌': '水', '癸亥': '水',
}

/** Get the nayin wuxing for a given heavenly stem + earthly branch pair.
 *  Returns empty string if the pair is not a valid sexagenary combination. */
export function getNayinWuxing(stem: string, branch: string): string {
  return NAYIN_WUXING_MAP[stem + branch] || ''
}
