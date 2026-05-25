export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
export const WUXING_COLORS: Record<string, string> = {
  '木': '#4A7C59', '火': '#C62828', '土': '#8B6914',
  '金': '#6E6E6E', '水': '#2C5F7C',
}
export const WUXING_FALLBACK_COLOR = '#6B5B4F'

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
