/**
 * 账号与会话共享策略常量（R2）。
 * 只承载账号边界，不包含工具、档案或历史策略。
 * @author LiXinwen
 */

/** 当前隐私政策版本：注册请求必须提交同值并由服务端精确校验。 */
export const CURRENT_PRIVACY_POLICY_VERSION = '2026-09-08'

/** 当前服务规则版本：注册请求必须提交同值并由服务端精确校验。 */
export const CURRENT_SERVICE_TERMS_VERSION = '2026-09-08'

/** 账号状态第一版只允许 active；非 active 账号统一返回与错误凭证相同的 401 文案。 */
export const ACCOUNT_STATUS_ACTIVE = 'active'
export const ACCOUNT_STATUSES = [ACCOUNT_STATUS_ACTIVE] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

/** 昵称边界：2–20 字符（NFC 规范化后）。 */
export const NICKNAME_MIN_LENGTH = 2
export const NICKNAME_MAX_LENGTH = 20

/** 密码边界：按原值 8–64，不 trim。 */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 64

/** 会话有效期：七天，服务端与 Cookie 一致。 */
export const SESSION_DURATION_DAYS = 7
export const SESSION_DURATION_SECONDS = SESSION_DURATION_DAYS * 24 * 60 * 60

/** 昵称允许字符集：中文（CJK 统一表意文字）、字母、数字、下划线、连字符。 */
export const NICKNAME_PATTERN = /^[㐀-鿿\w-]+$/

/** 认证 Cookie 名称：保持兼容，所有 set/delete Cookie 选项集中在 server/utils/auth.ts。 */
export const AUTH_COOKIE_NAME = 'xuanxue_token'

/**
 * 认证类接口请求体上限（字节）：昵称 + 密码 + 两个规则版本，1024 足够。
 * 按真实 UTF-8 字节判定，缺失 Content-Length（chunked）时仍会拦截。
 */
export const AUTH_MAX_REQUEST_BYTES = 1024
