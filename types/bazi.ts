/**
 * 八字领域契约（R5 首批：日期级三柱 + 节气边界候选 + 不可变快照）。
 *
 * 设计依据：docs/design/2026-09-14-r5-bazi-page-ia.md §3–§4、
 * docs/design/2026-09-14-r5-clarify-and-scope.md 的 D1–D12 裁决。
 *
 * 边界（不得在此契约上放宽）：
 * - 只输出年柱、月柱、日柱与日期对照；不输出时柱、大运、流年、流月、神煞、
 *   日主强弱、喜用神、忌神、评分、性格判断与现实预测，也不输出胎元、命宫、身宫；
 * - 状态复用 `types/tool-result.ts` 的全局四维，不新增并列总状态；
 * - 缺出生时刻不是错误：`successQualifier` 取 partial，缺失项与完整性分母
 *   由独立字段承担（`missingFields` / `completeness`），不靠限定词暗示；
 * - 快照字段用驼峰，数据库列用蛇形，两者经 `RESULT_SNAPSHOT_COLUMN_MAP` 对应。
 *
 * @author LiXinwen
 */

import type { JieName } from '~/constants/bazi-rules'
import type { ToolResultState } from './tool-result'

/** 原始历法（用户实际填写的那一种）。 */
export type BaziCalendar = 'solar' | 'lunar'

/** 农历日期表达（月号不含闰月偏移，闰月状态独立表达）。 */
export interface BaziLunarDate {
  year: number
  month: number
  day: number
  /** 是否闰月；农历输入必须显式给出，不得默认普通月。 */
  isLeapMonth: boolean
}

/**
 * 原始出生日期字段组。
 * 公历必须把 `isLeapMonth` 置为 null（闰月概念不适用）；农历必须显式布尔。
 */
export type BaziRawDate =
  | { calendar: 'solar'; year: number; month: number; day: number; isLeapMonth: null }
  | { calendar: 'lunar'; year: number; month: number; day: number; isLeapMonth: boolean }

/** 页面草稿态：允许未填写与"闰月未选"，不得直接作为合法 `BaziRawDate` 提交。 */
export interface BaziDraftState {
  calendar: BaziCalendar
  year: string
  month: string
  day: string
  /** null 表示用户尚未选择闰月状态（农历输入时必填）。 */
  isLeapMonth: boolean | null
  /** 十四周岁声明（数据规范 §5.4）。 */
  ageConfirmed: boolean
}

/** 规范化输入（含原始表达、规范化公历日期与农历对照）。 */
export interface BaziNormalizedInput {
  raw: BaziRawDate
  /** 规范化公历日期（YYYY-MM-DD）。 */
  solarDate: string
  /** 对应农历日期。 */
  lunar: BaziLunarDate
  /** 转换规则与引擎版本标识。 */
  conversionVersion: string
}

/** 单柱：干支与基础五行（不含十神、藏干、纳音）。 */
export interface BaziPillar {
  stem: string
  branch: string
  /** 天干五行（传统分类）。 */
  stemElement: string
  /** 地支五行（传统分类）。 */
  branchElement: string
}

/** 三柱集合（R5 的完整输出面）。 */
export interface BaziPillarSet {
  year: BaziPillar
  month: BaziPillar
  day: BaziPillar
}

/**
 * 年柱与月柱（唯一情形下的组合）。
 *
 * 单独抽出该类型的原因：跨"节"时输入缺少出生时刻，年/月柱有多个可能，
 * 但**日柱仍然唯一可靠**。因此结果契约把日柱单列（`dayPillar`），
 * 年/月柱在唯一情形放入本类型，在候选情形改由 `scenarios` 整组给出，
 * 避免候选情形下丢失可靠的日柱信息。
 */
export interface BaziYearMonthPillars {
  year: BaziPillar
  month: BaziPillar
}

/** 一个完整候选情形：年柱与月柱作为整体给出，禁止跨情形拼合。 */
export interface BaziScenario {
  yearPillar: BaziPillar
  monthPillar: BaziPillar
  /** 该情形位于边界之前还是之后。 */
  branch: 'pre' | 'post'
  /** 用户可见的文字原因（如「立春前（当日 00:00 至 04:02）」）。 */
  reason: string
}

/** 边界信息：落在该日期内的"节"及其精确时刻。 */
export interface BaziBoundary {
  term: JieName
  /** 边界时刻，北京时间（YYYY-MM-DD HH:mm）。 */
  instant: string
  /** 边界所在的日历日（YYYY-MM-DD）。 */
  date: string
  /** 时刻精度声明（当前来源为分钟级）。 */
  precision: 'minute'
}

/** 不确定性说明（仅在跨边界时存在）。 */
export interface BaziUncertainty {
  reason: 'boundary_crossing'
  /** 受影响的柱：立春影响年柱与月柱，其余"节"只影响月柱。 */
  affected: Array<'year' | 'month'>
  boundary: BaziBoundary
  /** 边界距午夜是否小于 BAZI_NEAR_MIDNIGHT_MINUTES，用于提示精度敏感。 */
  nearMidnight: boolean
}

/** 日期对照：用户原始表达 → 规范化公历 → 农历。 */
export interface BaziDateComparison {
  /** 用户实际填写的表达（如「公历 2000-08-07」或「农历 庚辰年七月初八（非闰月）」）。 */
  originalExpression: string
  normalizedSolar: string
  lunar: BaziLunarDate
  conversionVersion: string
}

/** R5 领域结果（内容快照的主体）。 */
export interface BaziDomainResult {
  /** 日柱：仅凭日期即可唯一确定，候选情形下同样可靠。 */
  dayPillar: BaziPillar
  /** 唯一情形下的年柱与月柱；候选时为 null（改由 scenarios 给出）。 */
  uniquePillars: BaziYearMonthPillars | null
  /** 候选情形集合（恰好 2 个；唯一情形时为 null）。 */
  scenarios: BaziScenario[] | null
  dateComparison: BaziDateComparison
  /** 日干（日柱天干）；传统体系中亦称「日主」。 */
  dayMaster: string
  uncertainty: BaziUncertainty | null
  /** 缺失项（R5 恒为缺时柱）。 */
  missingFields: BaziMissingField[]
  /** 完整性分母：四柱中已提供三柱。 */
  completeness: { provided: 3; total: 4 }
  limitations: string[]
  /** 明确不输出的内容清单（页面 Ⅴ 段逐条展示）。 */
  notOutput: string[]
  /** 用户可见内容标签（治理规范 §5.6）。 */
  contentLabels: string[]
  ruleVersion: string
  sourceSetVersion: string
  engineName: string
  engineVersion: string
}

/** 缺失项（R5 只可能缺时柱）。 */
export type BaziMissingField = 'hour_pillar'

/** 领域计算产物：状态 + 结果（失败时 result 为 null）。 */
export interface BaziEngineOutcome {
  state: ToolResultState
  result: BaziDomainResult | null
}

/** 领域计算的输入。 */
export interface BaziEngineInput {
  raw: BaziRawDate
  /** 产品"今天"（Asia/Shanghai 的公历日期，YYYY-MM-DD），由调用方显式传入。 */
  asOfDate: string
}

/** 某一年十二个"节"的时刻信息。 */
export type BaziJieInstants = Record<JieName, { instant: string; date: string }>

/**
 * 历法适配器注入接口。
 * 只有 `utils/bazi/calendar-adapter.ts` 可以实现它；领域层通过注入使用，
 * 页面与组件不得接触任何第三方历法库（契约 §11）。
 */
export interface BaziCalendarAdapter {
  /** 取该公历年十二个"节"的北京时间时刻与日历日。 */
  jieInstants(year: number): BaziJieInstants
  /** 公历 → 农历（含闰月状态）。 */
  solarToLunar(year: number, month: number, day: number): BaziLunarDate
  /**
   * 该农历日期是否存在（月含闰月、日不越界）。
   *
   * 单独提供该查询是为了把**用户输入非法**（返回 false → invalid_input）
   * 与**依赖库异常**（抛错 → engine_error）区分开，避免把引擎故障报成用户错误。
   */
  isValidLunarDate(year: number, month: number, day: number, isLeapMonth: boolean): boolean
  /** 农历 → 公历（YYYY-MM-DD）；调用前须已通过 isValidLunarDate。 */
  lunarToSolar(year: number, month: number, day: number, isLeapMonth: boolean): string
  /** 六十甲子日（民用午夜换日），如「甲子」。 */
  dayGanZhi(solarDate: string): string
}

/** 快照输入来源（manual = 用户手填，profile = 从本人档案显式带入）。 */
export type BaziInputOrigin = 'manual' | 'profile'

/** 快照的规则状态（R5 一律 current；为将来规则撤回留出表达位）。 */
export type BaziRuleStatus = 'current' | 'superseded' | 'withdrawn'

/**
 * 客户端结果摘要（保存时提交给服务端做一致性核对）。
 * 服务端不接受客户端提交的完整结果 JSON 作为可信历史（交付规范 §7.3）。
 */
export interface BaziResultDigest {
  solarDate: string
  successQualifier: 'partial' | 'candidate'
  /** 日柱（候选中同样必须一致）。 */
  dayPillar: BaziPillar
  /** 唯一情形下的年柱与月柱。 */
  uniquePillars: BaziYearMonthPillars | null
  /** 候选情形（与 uniquePillars 二选一非空）。 */
  scenarios: BaziScenario[] | null
}

/** 保存快照请求（服务端用同一领域规则复算后再决定是否落库）。 */
export interface SaveBaziSnapshotRequest {
  toolId: 'bazi'
  /** 同一次生成的稳定幂等标识。 */
  resultId: string
  asOfDate: string
  originalInput: BaziRawDate
  inputOrigin: BaziInputOrigin
  clientDigest: BaziResultDigest
}

/** 已保存快照（读取形态）。 */
export interface ResultSnapshotRecord {
  /** 快照行标识（与 resultId 不同：后者是生成标识，可跨保存复用）。 */
  recordId: string
  toolId: string
  resultId: string
  schemaVersion: number
  ruleVersion: string
  engineName: string
  engineVersion: string
  sourceSetVersion: string
  originalInput: BaziRawDate
  normalizedInput: BaziNormalizedInput
  phase: string
  successQualifier: string | null
  failureCategory: string | null
  failureDetailCode: string | null
  /** 用户实际看到的结果与限制说明。 */
  resultSnapshot: BaziDomainResult
  limitations: string[]
  inputOrigin: BaziInputOrigin
  ruleStatus: BaziRuleStatus
  asOfDate: string
  /** 结果生成时刻。 */
  generatedAt: string
  /** 快照保存时刻（列表标题使用该时间）。 */
  savedAt: string
}

/** 历史列表项（安全摘要：不含精确出生日期与结果正文）。 */
export interface ResultSnapshotSummary {
  recordId: string
  resultId: string
  /**
   * 中性名称前缀（如「八字基础排盘」）。
   * 完整标题由展示层拼为「前缀 · 保存时间」——时间格式化属展示层职责，
   * 复用 `utils/self-profile/display.ts` 的 Asia/Shanghai 格式化，不在服务端重复实现。
   */
  displayNamePrefix: string
  /** 保存时间（ISO 8601）；列表标题使用该时间。 */
  savedAt: string
  asOfDate: string
  phase: string
  successQualifier: string | null
  ruleVersion: string
  inputOrigin: BaziInputOrigin
}

/**
 * 快照字段（驼峰）→ 数据库列（蛇形）映射。
 * 契约 §23.2 列出蛇形字段、治理规范 §10 列出驼峰字段，两者经此表对应（D7 裁决）。
 */
export const RESULT_SNAPSHOT_COLUMN_MAP = {
  recordId: 'id',
  toolId: 'tool_id',
  resultId: 'result_id',
  schemaVersion: 'schema_version',
  ruleVersion: 'rule_version',
  engineName: 'engine_name',
  engineVersion: 'engine_version',
  sourceSetVersion: 'source_set_version',
  originalInput: 'original_input_json',
  normalizedInput: 'normalized_input_json',
  phase: 'phase',
  successQualifier: 'success_qualifier',
  failureCategory: 'failure_category',
  failureDetailCode: 'failure_detail_code',
  resultSnapshot: 'result_snapshot_json',
  limitations: 'limitations_json',
  inputOrigin: 'input_origin',
  ruleStatus: 'rule_status',
  asOfDate: 'as_of_date',
  generatedAt: 'generated_at',
  savedAt: 'created_at',
} as const
