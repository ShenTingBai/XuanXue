/**
 * 本人档案领域契约（基础重建交付规范 §6、数据生命周期规范 §6）。
 *
 * 出生日期是一个完整字段组：原始历法表达 + 规范化公历日期 + 转换版本 + 确认时间。
 * 页面输入草稿（允许字符串与未选闰月 null）与服务端合法 RawBirthDate 严格分离，
 * 防止把未确认的页面状态直接当作可保存档案值。
 *
 * @author LiXinwen
 */

/** 原始出生日期：公历或农历两种互斥表达。 */
export type RawBirthDate =
  | {
      calendar: 'solar'
      year: number
      month: number
      day: number
      /** 公历无闰月概念，必须是 null。 */
      isLeapMonth: null
    }
  | {
      calendar: 'lunar'
      year: number
      month: number
      day: number
      /** 农历必须显式布尔（true=闰月），不能默认 false。 */
      isLeapMonth: boolean
    }

/** 规范化出生日期：原始表达 + 转换后的公历日期与版本。 */
export interface NormalizedBirthDate {
  /** 用户原始表达（原历法与字段值，必须保留用于展示与追溯）。 */
  raw: RawBirthDate
  /** 规范化公历日期（YYYY-MM-DD）。 */
  solarDate: string
  /** 公历→农历换算规则/依赖版本（自 profile 策略常量读取）。 */
  conversionVersion: string
  /** 用户确认该日期归属本人的时间（服务端生成）。 */
  confirmedAt: string
}

/** 本人档案（Account 1 — 0..1 SelfProfile）。 */
export interface SelfProfile {
  /** 服务端 randomUUID 生成的唯一档案 id；删除重建必须新 id。 */
  id: string
  /** 所属账号 id（服务端从会话取得，客户端不可覆盖）。 */
  accountId: number
  /** 乐观并发版本：每次写操作递增；防删除重建后旧请求覆盖。 */
  version: number
  /** 出生日期字段组；全空（null）表示未保存日期。 */
  birthDate: NormalizedBirthDate | null
  /** 是否允许后续工具从档案带入日期；false 表示已撤回使用。 */
  useAllowed: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 并发期望：更新/删除/授权变更均携带 id+version。
 * null 只用于首次创建，不能表示「忽略并发」。
 */
export type ExpectedProfile = { profileId: string; version: number } | null

/** 无出生值的最小档案摘要：供已登录生肖页判断是否显示「带入」入口。 */
export interface SelfProfileSummary {
  exists: boolean
  profileId: string | null
  version: number | null
  /** 是否有完整出生日期字段组。 */
  hasBirthDate: boolean
  /** 是否允许带入（档案存在、有日期且未撤回使用）。 */
  canImport: boolean
}

/** 有限错误代码集合：只返回固定中文说明、code 与字段键，禁止回显输入正文。 */
export type SelfProfileErrorCode =
  | 'INVALID_INPUT'
  | 'UNDERAGE'
  | 'UNSUPPORTED_DATE'
  | 'VERSION_CONFLICT'
  | 'CONSENT_REQUIRED'
  | 'UNAUTHENTICATED'
  | 'SAVE_FAILED'

/** 保存本人档案请求。 */
export interface SaveSelfProfileRequest {
  expected: ExpectedProfile
  birthDate: RawBirthDate
  consent: {
    accepted: true
    policyVersion: string
  }
}

/** 删除出生日期/删除整份档案的请求（必须携带 id+version）。 */
export interface DeleteSelfProfileRequest {
  expected: { profileId: string; version: number }
}

/** 使用授权变更请求：停止/恢复档案带入。 */
export interface SetUsageRequest {
  expected: { profileId: string; version: number }
  allowed: boolean
  /** 仅重新允许（allowed=true）时校验当前告知版本。 */
  consentVersion?: string
}

/**
 * 页面输入草稿（允许字符串与未选闰月 null）。
 * 它不是合法服务端 RawBirthDate：草稿必须完整且闰月明确后才能提交保存。
 */
export type BirthDateDraft = {
  calendar: 'solar' | 'lunar'
  year: string
  month: string
  day: string
  /** 农历时：null=尚未明确；true/false=闰/平。公历必须为 null。 */
  isLeapMonth: boolean | null
}
