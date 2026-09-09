/**
 * 生肖领域独立规则数据（与 `constants/bazi.ts` 的旧 NAYIN_TABLE 等完全隔离）。
 *
 * 依据来源台账（docs/product/evidence/shengxiao/shengxiao-source-ledger.md）与
 * 规则台账（docs/product/evidence/shengxiao/shengxiao-rule-ledger.md）独立写入：
 * - 十天干阴阳五行：SRC-006（《三命通会》卷二·论天干阴阳生死）；
 * - 十二地支生肖：SRC-003 / SRC-003a / SRC-004；
 * - 十二地支五行：SRC-007（《五行大义》卷二·第五论配支干电子转录）；
 * - 六十甲子纳音 30 组（每相邻两柱共用一组）：SRC-005（《三命通会》卷一·论纳音取象）。
 *
 * 名称采用来源台账选定的电子转录正文写法（含「金泊金、路傍土、井泉水、
 * 覆灯火」），不静默改为其他版本名称；不引用旧常量、黄金测试 JSON 或历史评分。
 *
 * 规则版本：2026-09-09（规则台账固定）。
 *
 * @author LiXinwen
 */

/** 规则版本（规则台账 R-SX-*，2026-09-09）。 */
export const SHENGXIAO_RULE_VERSION = '2026-09-09'

/** 候选引擎标识（lunar-javascript 1.7.7，SRC-LUNAR，implementation_only）。 */
export const SHENGXIAO_ENGINE_VERSION = 'lunar-javascript 1.7.7'

/** 生肖时间口径（契约 §8.1，纯日期）。 */
export const SHENGXIAO_TIMEZONE = 'Asia/Shanghai' as const

/** 十天干（SRC-006）。 */
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const

/** 十二地支（SRC-003 / SRC-007）。 */
export const BRANCHES = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const

/** 十二生肖次序，与十二地支按序对应（SRC-003 / SRC-004）。 */
export const ANIMALS: readonly string[] = [
  '鼠',
  '牛',
  '虎',
  '兔',
  '龙',
  '蛇',
  '马',
  '羊',
  '猴',
  '鸡',
  '狗',
  '猪',
]

/** 地支→生肖（SRC-003 / SRC-004）。 */
export const BRANCH_TO_ANIMAL: Readonly<Record<string, string>> = {
  子: '鼠',
  丑: '牛',
  寅: '虎',
  卯: '兔',
  辰: '龙',
  巳: '蛇',
  午: '马',
  未: '羊',
  申: '猴',
  酉: '鸡',
  戌: '狗',
  亥: '猪',
}

/** 天干→五行（SRC-006：甲乙木、丙丁火、戊己土、庚辛金、壬癸水）。 */
export const STEM_TO_ELEMENT: Readonly<Record<string, string>> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
}

/** 天干→阴阳（SRC-006：甲丙戊庚壬阳干、乙丁己辛癸阴干）。 */
export const STEM_TO_YIN_YANG: Readonly<Record<string, string>> = {
  甲: '阳',
  乙: '阴',
  丙: '阳',
  丁: '阴',
  戊: '阳',
  己: '阴',
  庚: '阳',
  辛: '阴',
  壬: '阳',
  癸: '阴',
}

/** 地支→五行（SRC-007：子亥水、寅卯木、巳午火、申酉金、辰戌丑未土）。 */
export const BRANCH_TO_ELEMENT: Readonly<Record<string, string>> = {
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

/**
 * 六十甲子纳音 30 组（按六十甲子顺序，每相邻两柱共用一组纳音取象）。
 * 数组下标 = 干支在六十甲子中的序（0–59）整除 2，即第 0、1 柱取 NA_YIN[0]，
 * 第 2、3 柱取 NA_YIN[1]，依此类推。
 * 名称按来源台账选定转录正文（SRC-005）。
 */
export const NA_YIN_30: readonly string[] = [
  '海中金', // 甲子/乙丑
  '炉中火', // 丙寅/丁卯
  '大林木', // 戊辰/己巳
  '路傍土', // 庚午/辛未
  '剑锋金', // 壬申/癸酉
  '山头火', // 甲戌/乙亥
  '涧下水', // 丙子/丁丑
  '城头土', // 戊寅/己卯
  '白蜡金', // 庚辰/辛巳
  '杨柳木', // 壬午/癸未
  '井泉水', // 甲申/乙酉
  '屋上土', // 丙戌/丁亥
  '霹雳火', // 戊子/己丑
  '松柏木', // 庚寅/辛卯
  '长流水', // 壬辰/癸巳
  '沙中金', // 甲午/乙未
  '山下火', // 丙申/丁酉
  '平地木', // 戊戌/己亥
  '壁上土', // 庚子/辛丑
  '金泊金', // 壬寅/癸卯
  '覆灯火', // 甲辰/乙巳
  '天河水', // 丙午/丁未
  '大驿土', // 戊申/己酉
  '钗钏金', // 庚戌/辛亥
  '桑柘木', // 壬子/癸丑
  '大溪水', // 甲寅/乙卯
  '沙中土', // 丙辰/丁巳
  '天上火', // 戊午/己未
  '石榴木', // 庚申/辛酉
  '大海水', // 壬戌/癸亥
]

/** 干支→纳音取象的完整 60 组映射（由 NA_YIN_30 展开，与黄金分类样例一致）。 */
export const GANZHI_TO_NAYIN: Readonly<Record<string, string>> = (() => {
  const map: Record<string, string> = {}
  for (let i = 0; i < 60; i += 1) {
    const gan = STEMS[i % 10]
    const zhi = BRANCHES[i % 12]
    map[gan + zhi] = NA_YIN_30[Math.floor(i / 2)]
  }
  return map
})()
