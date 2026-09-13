/**
 * 本人档案 HTTP 边界（R4）。
 *
 * 统一 self-profile 接口的身份、同源、体积与结构校验：
 * - 所有接口从 event.context.accountId 获取身份，未认证 401；
 * - 写接口 assertSameOriginMutation 先于任何写入，跨源 403；
 * - 响应体按真实 UTF-8 字节 4096 上限（不信任 Content-Length）；
 * - 只返回固定中文说明、code 与字段键，冲突 409 不带他人或服务端完整日期。
 *
 * @author LiXinwen
 */

import { getHeader, readRawBody } from 'h3'
import type { H3Event } from 'h3'
import type {
  SaveSelfProfileRequest,
  DeleteSelfProfileRequest,
  SetUsageRequest,
  ExpectedProfile,
  RawBirthDate,
  SelfProfileErrorCode,
} from '~/types/self-profile'
import { SELF_PROFILE_MAX_REQUEST_BYTES } from '~/constants/self-profile-policy'
import { SelfProfileServiceError } from '../services/self-profile'

/** 统一身份获取：未认证 401。 */
export function requireAccountId(event: H3Event): number {
  const accountId = event.context.accountId
  if (typeof accountId !== 'number' || !Number.isInteger(accountId)) {
    throw createError({ statusCode: 401, statusMessage: '无效的会话' })
  }
  return accountId
}

/** 校验请求体真实 UTF-8 字节不超过上限：不能只相信 Content-Length。 */
export async function readBoundedJsonBody(event: H3Event): Promise<unknown> {
  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > SELF_PROFILE_MAX_REQUEST_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '请求体过大' })
  }
  // 真实字节兜底：即使缺失或伪造 Content-Length 仍按实际 UTF-8 长度拦截。
  const raw = await readRawBody(event, 'utf-8')
  if (raw == null) {
    return {}
  }
  if (Buffer.byteLength(raw, 'utf-8') > SELF_PROFILE_MAX_REQUEST_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '请求体过大' })
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: '请求体格式错误' })
  }
  return parsed
}

/** 严格整数（拒绝数字字符串、小数、NaN、无穷）。 */
function isStrictInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
}

/** 纯对象且字段白名单完全一致（不允许额外键）。 */
function isPlainObjectWithKeys(
  value: unknown,
  allowedKeys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const keys = Object.keys(value)
  if (keys.length !== allowedKeys.length) return false
  return allowedKeys.every(k => k in value)
}

/** 校验 expected 结构：null 或 {profileId:string, version:number}。 */
function parseExpected(value: unknown): ExpectedProfile | undefined {
  if (value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) return undefined
  const obj = value as Record<string, unknown>
  if (Object.keys(obj).length !== 2) return undefined
  if (typeof obj.profileId !== 'string' || obj.profileId.length === 0) return undefined
  if (!isStrictInteger(obj.version) || (obj.version as number) < 1) return undefined
  return { profileId: obj.profileId, version: obj.version as number }
}

/** 解析并校验 SaveSelfProfileRequest；非法返回 400 固定文案。 */
export function parseSaveRequest(body: unknown): SaveSelfProfileRequest {
  if (!isPlainObjectWithKeys(body, ['expected', 'birthDate', 'consent'])) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  const expected = parseExpected(body.expected)
  if (expected === undefined) throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  const parsedBirth = parseRawBirthDate(body.birthDate)
  if (!parsedBirth) throw createError({ statusCode: 400, statusMessage: '出生日期无效' })
  const consent = parseConsent(body.consent)
  return {
    expected,
    birthDate: parsedBirth,
    consent,
  }
}

/** 校验 consent 白名单：仅 {accepted, policyVersion}。 */
function parseConsent(value: unknown): { accepted: true; policyVersion: string } {
  if (!isPlainObjectWithKeys(value, ['accepted', 'policyVersion'])) {
    throw createError({ statusCode: 400, statusMessage: '请先确认长期保存告知' })
  }
  if (
    value.accepted !== true ||
    typeof value.policyVersion !== 'string' ||
    value.policyVersion.length === 0
  ) {
    throw createError({ statusCode: 400, statusMessage: '请先确认长期保存告知' })
  }
  return { accepted: true, policyVersion: value.policyVersion }
}

/** 解析 RawBirthDate：严格字段白名单，拒绝额外字段/数字字符串/小数。 */
function parseRawBirthDate(value: unknown): RawBirthDate | undefined {
  if (!isPlainObjectWithKeys(value, ['calendar', 'year', 'month', 'day', 'isLeapMonth'])) {
    return undefined
  }
  const { calendar, year, month, day, isLeapMonth } = value
  if (calendar !== 'solar' && calendar !== 'lunar') return undefined
  if (!isStrictInteger(year) || !isStrictInteger(month) || !isStrictInteger(day)) return undefined
  if (month < 1 || month > 12 || day < 1) return undefined
  if (calendar === 'solar') {
    if (isLeapMonth !== null) return undefined
    return { calendar, year, month, day, isLeapMonth: null }
  }
  if (typeof isLeapMonth !== 'boolean') return undefined
  return { calendar, year, month, day, isLeapMonth }
}

/** 解析删除请求（expected 必须存在，顶层白名单）。 */
export function parseDeleteRequest(body: unknown): DeleteSelfProfileRequest {
  if (!isPlainObjectWithKeys(body, ['expected'])) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  const expected = parseExpected(body.expected)
  if (!expected) throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  return { expected }
}

/** 解析使用授权请求：allowed 严格布尔；重新允许时需 consentVersion。 */
export function parseUsageRequest(body: unknown): SetUsageRequest {
  // 顶层白名单：allowed=false 也拒绝未知字段（如 accountId、birthDate），不允许静默忽略。
  if (
    !isPlainObjectWithKeys(body, ['expected', 'allowed']) &&
    !isPlainObjectWithKeys(body, ['expected', 'allowed', 'consentVersion'])
  ) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  const expected = parseExpected(body.expected)
  if (!expected) throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  if (typeof body.allowed !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  // 明确收窄：consentVersion 为 string | undefined；非 string 一律拒绝。
  const consentVersion: string | undefined =
    typeof body.consentVersion === 'string' && body.consentVersion.length > 0
      ? body.consentVersion
      : undefined
  if (body.allowed && consentVersion === undefined) {
    throw createError({ statusCode: 400, statusMessage: '请确认档案告知后允许带入' })
  }
  return { expected, allowed: body.allowed, consentVersion }
}

/** 固定错误 DTO：只带有限 message、code 与可选 field，禁止回显出生值。 */
export interface SelfProfileErrorDto {
  message: string
  data: {
    code: SelfProfileErrorCode
    field?: string
  }
}

/** 领域固定错误 → 固定 DTO + HTTP 状态；其余统一 500（不泄漏服务端完整日期）。 */
export function mapServiceError(err: unknown): never {
  if (err instanceof SelfProfileServiceError) {
    const statusByCode: Record<SelfProfileErrorCode, number> = {
      INVALID_INPUT: 400,
      UNDERAGE: 403,
      UNSUPPORTED_DATE: 400,
      VERSION_CONFLICT: 409,
      CONSENT_REQUIRED: 400,
      UNAUTHENTICATED: 401,
      SAVE_FAILED: 500,
    }
    const fixedMessageByCode: Record<SelfProfileErrorCode, string> = {
      INVALID_INPUT: '出生日期无效',
      UNDERAGE: '未满十四周岁不能保存本人档案',
      UNSUPPORTED_DATE: '出生日期超出支持范围',
      VERSION_CONFLICT: '档案已变更，请重新读取后重试',
      CONSENT_REQUIRED: '请先确认长期保存告知',
      UNAUTHENTICATED: '无效的会话',
      SAVE_FAILED: '保存失败，请稍后再试',
    }
    const code = err.code
    const dto: SelfProfileErrorDto = {
      message: fixedMessageByCode[code] ?? '请求处理失败',
      data: {
        code,
        ...(err.field ? { field: err.field } : {}),
      },
    }
    throw createError({
      statusCode: statusByCode[code] ?? 500,
      statusMessage: dto.message,
      data: dto.data,
    })
  }
  throw createError({ statusCode: 500, statusMessage: '请求处理失败，请稍后再试' })
}
