/**
 * 年份天干地支计算工具
 *
 * 基于标准公式：yearStemIndex = ((year - 4) % 10 + 10) % 10
 *               yearBranchIndex = ((year - 4) % 12 + 12) % 12
 */

/** 获取年份天干索引 (0=甲, 9=癸) */
export function getYearStemIndex(year: number): number {
  return ((year - 4) % 10 + 10) % 10
}

/** 获取年份地支索引 (0=子, 11=亥) */
export function getYearBranchIndex(year: number): number {
  return ((year - 4) % 12 + 12) % 12
}
