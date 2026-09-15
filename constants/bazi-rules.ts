/**
 * 八字领域独立规则数据（R5 首批：日期级三柱）。
 *
 * 来源与证据等级见 docs/product/evidence/bazi/bazi-source-ledger.md 与 bazi-rule-ledger.md：
 * - 十二"节"与太阳地心视黄经：SRC-BZ-001（GB/T 33661—2017 规范性附录 A 表 A.1）；
 * - 五虎遁（月干由年干推得）：SRC-BZ-008（《三命通会》卷二·论遁月时古歌）；
 * - 干支纪年锚点（1984 = 甲子年）：SRC-BZ-001 §6.1.1；
 * - 干支纪日锚点（1949-10-01 = 甲子日）：SRC-BZ-001 §6.3.2；
 * - 干支五行：复用 `constants/bazi.ts` 的 WUXING_STEM / WUXING_BRANCH（唯一数据源），
 *   其证据等级与生肖阶段 SRC-006（天干阴阳五行）/ SRC-007（地支五行）相同；
 * - 天干阴阳：SRC-006。
 *
 * 措辞红线（来源台账 §5）：不得把年柱以立春为界表述为"国家标准规定"或"古籍明文规定"；
 * 本文件只登记数据与版本，不表示任何规则已获准公开。
 *
 * 规则版本：2026-09-14-bazi-date-v1（规则台账固定）。
 *
 * @author LiXinwen
 */

import { WUXING_STEM, WUXING_BRANCH } from '~/constants/bazi'

/** 规则版本（规则台账 R-BZ-*，2026-09-14-bazi-date-v1）。 */
export const BAZI_RULE_VERSION = '2026-09-14-bazi-date-v1'

/** 来源集合版本（R5 与规则版本同值，随规则台账变更同步递增）。 */
export const BAZI_SOURCE_SET_VERSION = BAZI_RULE_VERSION

/** 候选引擎标识（implementation_only，不得作为规则权威）。 */
export const BAZI_ENGINE_NAME = 'lunar-javascript'

/** 候选引擎版本（精确锁定，见包声明）。 */
export const BAZI_ENGINE_VERSION = '1.7.7'

/** 工具标识（工具目录中的 id）。 */
export const BAZI_TOOL_ID = 'bazi'

/** 结果结构版本（写入快照，用于识别旧结构）。 */
export const BAZI_RESULT_SCHEMA_VERSION = 1

/** 历史列表中性名称前缀（数据规范 §11.5，不使用姓名或结论式标题）。 */
export const BAZI_HISTORY_NAME_PREFIX = '八字基础排盘'

/** 公历支持下界（沿用 R3 生肖口径；界前返回 unsupported_input）。 */
export const BAZI_SUPPORT_START = '1901-01-01'

/** 产品时间口径（治理规范 §8.2：第一版"今天"按北京时间）。 */
export const BAZI_TIMEZONE = 'Asia/Shanghai' as const

/** 十四周岁门槛（数据规范 §5.4）。 */
export const BAZI_MIN_AGE = 14

/** 保存请求体真实 UTF-8 字节上限。 */
export const BAZI_MAX_REQUEST_BYTES = 8192

/** 边界时刻距午夜小于该分钟数时，页面必须提示判定对精度敏感。 */
export const BAZI_NEAR_MIDNIGHT_MINUTES = 5

/** 干支纪日锚点：北京时间公历该日的农历日为甲子日（SRC-BZ-001 §6.3.2）。 */
export const BAZI_DAY_PILLAR_ANCHOR = '1949-10-01'

/** 干支纪年锚点：该公历年对应甲子年（SRC-BZ-001 §6.1.1）。 */
export const BAZI_YEAR_CYCLE_ANCHOR = 1984

/** 十二"节"名称（契约 §10.2；不得使用中气作为月柱边界）。 */
export const JIE_NAMES = [
  '立春',
  '惊蛰',
  '清明',
  '立夏',
  '芒种',
  '小暑',
  '立秋',
  '白露',
  '寒露',
  '立冬',
  '大雪',
  '小寒',
] as const

/** 十二"节"名称联合类型。 */
export type JieName = (typeof JIE_NAMES)[number]

export interface JieDefinition {
  /** 节气名（契约 §10.2 用字：惊蛰为简体）。 */
  name: JieName
  /** 太阳地心视黄经（度），GB/T 33661—2017 规范性附录 A 表 A.1。 */
  longitude: number
  /** 该"节"起始的月支。 */
  branch: string
}

/**
 * 十二"节"定义表，按月序（立春→寅月 起）排列。
 * 黄经取自国家标准规范性附录 A；三方 A 级来源（国标附录 A、香港天文台表一、
 * 日本国立天文台暦要項）在该表上完全一致，无 A 级证据冲突。
 */
export const BAZI_JIE: readonly JieDefinition[] = [
  { name: '立春', longitude: 315, branch: '寅' },
  { name: '惊蛰', longitude: 345, branch: '卯' },
  { name: '清明', longitude: 15, branch: '辰' },
  { name: '立夏', longitude: 45, branch: '巳' },
  { name: '芒种', longitude: 75, branch: '午' },
  { name: '小暑', longitude: 105, branch: '未' },
  { name: '立秋', longitude: 135, branch: '申' },
  { name: '白露', longitude: 165, branch: '酉' },
  { name: '寒露', longitude: 195, branch: '戌' },
  { name: '立冬', longitude: 225, branch: '亥' },
  { name: '大雪', longitude: 255, branch: '子' },
  { name: '小寒', longitude: 285, branch: '丑' },
]

/**
 * 五虎遁：年干 → 正月（寅月）月干。
 * 古歌（SRC-BZ-008）：甲已之年丙作首，乙庚之岁戊为头，丙辛之岁寻庚上，
 * 丁壬壬位顺行流，更有戊癸何处起？甲寅之上好追求。
 */
export const BAZI_WUHU: Readonly<Record<string, string>> = {
  甲: '丙',
  己: '丙',
  乙: '戊',
  庚: '戊',
  丙: '庚',
  辛: '庚',
  丁: '壬',
  壬: '壬',
  戊: '甲',
  癸: '甲',
}

/** 天干→五行（复用唯一数据源 constants/bazi.ts；证据等级同 SRC-006）。 */
export const BAZI_GAN_ELEMENT: Readonly<Record<string, string>> = WUXING_STEM

/** 地支→五行（复用唯一数据源 constants/bazi.ts；证据等级同 SRC-007）。 */
export const BAZI_ZHI_ELEMENT: Readonly<Record<string, string>> = WUXING_BRANCH

/** 天干→阴阳（SRC-006：甲丙戊庚壬阳干、乙丁己辛癸阴干）。 */
export const BAZI_GAN_YINYANG: Readonly<Record<string, string>> = {
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

/**
 * R5 明确不输出的内容清单（交付规范 §7.1 闭集 + 契约 §21）。
 * 页面 Ⅴ 段必须逐条展示，不得以"敬请期待"式措辞暗示即将推出。
 */
export const BAZI_NOT_OUTPUT: readonly string[] = [
  '时柱',
  '大运',
  '流年',
  '流月',
  '神煞',
  '日主强弱',
  '喜用神',
  '忌神',
  '评分',
  '性格判断',
  '现实预测',
  '胎元',
  '命宫',
  '身宫',
]

/**
 * 限制说明基础条目（页面 Ⅴ 段展示；证据包结论的忠实转述）。
 * 不得删改其中的精度与证据等级声明，否则等于放宽准入主张。
 */
export const BAZI_LIMITATIONS: readonly string[] = [
  '本次仅使用出生日期，不生成时柱；因此不涉及出生时刻、子时换日与出生地点。',
  '不支持 23:00—23:59 的午夜换日与子初换日双候选。',
  '节气时刻已对抽样年份做分钟级核验；国家标准要求的 1 秒级精度尚未核验。',
  '年柱与月柱的传统规则引自古籍在线整理本，原刻影印核对尚未完成。',
  '支持范围为公历 1901-01-01 至查询当日，未来日期无效。',
]

/** 用户可见内容标签（治理规范 §5.6；R5 实际只用到这两类）。 */
export const BAZI_CONTENT_LABELS: readonly string[] = ['计算结果', '项目整理']

/** 领域与接口错误码（页面与 API 共用；不使用自然语言错误串做判定）。 */
export const BAZI_ERROR_CODES = {
  INVALID_DATE: 'INVALID_DATE',
  FUTURE_DATE: 'FUTURE_DATE',
  UNSUPPORTED_DATE: 'UNSUPPORTED_DATE',
  INVALID_LUNAR_DATE: 'INVALID_LUNAR_DATE',
  MISSING_FIELD: 'MISSING_FIELD',
  ENGINE_ERROR: 'ENGINE_ERROR',
  RESULT_MISMATCH: 'RESULT_MISMATCH',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  SAVE_FAILED: 'SAVE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  HISTORY_MODE_REQUIRED: 'HISTORY_MODE_REQUIRED',
} as const

/** 错误码联合类型。 */
export type BaziErrorCode = (typeof BAZI_ERROR_CODES)[keyof typeof BAZI_ERROR_CODES]

/**
 * 失败原因的用户可见文案（按错误码）。
 *
 * Ⅲ 段状态横幅与 Ⅱ 段输入区就近错误共用同一张表：两处若各写一份中文串，
 * 一次措辞修正就会漏掉另一处（R5-B 起草时即按此收敛）。
 * 文案只说明「哪里不对、能否修正、输入是否保留」，不含任何预测、评价或评分。
 */
export const BAZI_FAILURE_REASONS: Readonly<Record<string, string>> = {
  [BAZI_ERROR_CODES.INVALID_DATE]: '请填写真实存在的日期（注意闰年二月二十九日）',
  [BAZI_ERROR_CODES.FUTURE_DATE]: '不接受未来的出生日期，请核对年份',
  [BAZI_ERROR_CODES.UNSUPPORTED_DATE]: '仅支持公历 1901-01-01 及以后的日期',
  [BAZI_ERROR_CODES.INVALID_LUNAR_DATE]: '该农历日期不存在，请核对闰月与月份天数',
  [BAZI_ERROR_CODES.ENGINE_ERROR]: '历法计算未完成，未生成任何默认结果',
}
