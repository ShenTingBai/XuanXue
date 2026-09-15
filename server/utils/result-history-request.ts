/**
 * 结果历史 HTTP 边界（R5）。
 *
 * 统一 `/api/result-history` 的身份、同源、体积与结构校验，与 R4 的
 * `self-profile-request.ts` 保持同一套语义：
 * - 身份只取 `event.context.accountId`，未认证 401；
 * - 写操作先做同源校验（`assertSameOriginMutation`），跨源 403；
 * - 请求体按**真实 UTF-8 字节**上限拦截（不信任 Content-Length）；
 * - 结构校验使用字段白名单，拒绝额外字段、数字字符串与小数；
 * - 错误响应只带固定中文说明、code 与字段键，**不回显出生日期或结果正文**。
 *
 * @author LiXinwen
 */

import { getHeader, readRawBody } from 'h3'
import type { H3Event } from 'h3'
import { BAZI_MAX_REQUEST_BYTES, BAZI_TOOL_ID, type BaziErrorCode } from '~/constants/bazi-rules'
import { isToolPubliclyAvailable } from '~/constants/tool-catalog'
import { isInternalVerificationAllowed } from './internal-verification'
import type {
  BaziInputOrigin,
  BaziPillar,
  BaziRawDate,
  BaziResultDigest,
  BaziScenario,
  SaveBaziSnapshotRequest,
} from '~/types/bazi'
import { ResultHistoryServiceError } from '../services/result-history'

/** 统一身份获取：未认证 401。 */
export function requireHistoryAccountId(event: H3Event): number {
  const accountId = event.context.accountId
  if (typeof accountId !== 'number' || !Number.isInteger(accountId)) {
    throw createError({ statusCode: 401, statusMessage: '无效的会话' })
  }
  return accountId
}

/**
 * 目录级放行之外的**授权内部验证**校验（服务端独立执行）。
 *
 * 中间件里的客户端判定不是安全边界：未公开的工具必须由服务端按白名单再校验一次，
 * 否则已登录但未授权的账号可以直接调接口。白名单未配置时此处恒为拒绝。
 */
export function assertInternalAccessIfNotPublic(toolId: string, accountId: number): void {
  if (isToolPubliclyAvailable(toolId)) return
  if (isInternalVerificationAllowed(toolId, accountId)) return
  throw createError({ statusCode: 403, statusMessage: '当前不可用' })
}

/** 读取并限制请求体：Content-Length 预检 + 真实 UTF-8 字节兜底。 */
export async function readBoundedHistoryBody(event: H3Event): Promise<unknown> {
  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > BAZI_MAX_REQUEST_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '请求体过大' })
  }
  const raw = await readRawBody(event, 'utf-8')
  if (raw == null) return {}
  if (Buffer.byteLength(raw, 'utf-8') > BAZI_MAX_REQUEST_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '请求体过大' })
  }
  try {
    return JSON.parse(raw) as unknown
  } catch {
    throw createError({ statusCode: 400, statusMessage: '请求体格式错误' })
  }
}

function isStrictInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
}

/** 纯对象且字段集合与白名单完全一致（不允许额外键、不允许缺键）。 */
function isPlainObjectWithKeys(
  value: unknown,
  allowedKeys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const keys = Object.keys(value)
  if (keys.length !== allowedKeys.length) return false
  return allowedKeys.every(key => key in value)
}

/** 解析原始出生日期：公历闰月必须 null、农历必须显式布尔。 */
function parseRawDate(value: unknown): BaziRawDate | undefined {
  if (!isPlainObjectWithKeys(value, ['calendar', 'year', 'month', 'day', 'isLeapMonth'])) {
    return undefined
  }
  const { calendar, year, month, day, isLeapMonth } = value
  if (calendar !== 'solar' && calendar !== 'lunar') return undefined
  if (!isStrictInteger(year) || !isStrictInteger(month) || !isStrictInteger(day)) return undefined
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  if (calendar === 'solar') {
    if (isLeapMonth !== null) return undefined
    return { calendar, year, month, day, isLeapMonth: null }
  }
  if (typeof isLeapMonth !== 'boolean') return undefined
  return { calendar, year, month, day, isLeapMonth }
}

/**
 * 解析单柱。
 *
 * 客户端摘要里的柱来自领域结果，因此**同时接受两字段（干支）与四字段（干支＋五行）**
 * 两种形状——但只允许这两种，未知字段一律拒绝。比较时只用干支。
 */
function parsePillar(value: unknown): BaziPillar | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const keys = Object.keys(record)
  const allowed = ['stem', 'branch', 'stemElement', 'branchElement']
  if (keys.length !== 2 && keys.length !== 4) return undefined
  if (!keys.every(key => allowed.includes(key))) return undefined

  const { stem, branch } = record
  if (typeof stem !== 'string' || stem.length !== 1) return undefined
  if (typeof branch !== 'string' || branch.length !== 1) return undefined
  return {
    stem,
    branch,
    stemElement: typeof record.stemElement === 'string' ? record.stemElement : '',
    branchElement: typeof record.branchElement === 'string' ? record.branchElement : '',
  }
}

function parseScenarios(value: unknown): BaziScenario[] | undefined {
  if (!Array.isArray(value) || value.length !== 2) return undefined
  const parsed: BaziScenario[] = []
  for (const item of value) {
    if (!isPlainObjectWithKeys(item, ['branch', 'yearPillar', 'monthPillar', 'reason'])) {
      return undefined
    }
    const yearPillar = parsePillar(item.yearPillar)
    const monthPillar = parsePillar(item.monthPillar)
    if (!yearPillar || !monthPillar) return undefined
    if (item.branch !== 'pre' && item.branch !== 'post') return undefined
    if (typeof item.reason !== 'string') return undefined
    parsed.push({ yearPillar, monthPillar, branch: item.branch, reason: item.reason })
  }
  return parsed
}

/**
 * 解析客户端结果摘要。
 *
 * 摘要只用于与服务端复算比对，**不作为可信历史内容**；结构非法一律 400，
 * 交由服务端复算与 `digestsMatch` 决定是否保存。
 */
function parseDigest(value: unknown): BaziResultDigest | undefined {
  if (
    !isPlainObjectWithKeys(value, [
      'solarDate',
      'successQualifier',
      'dayPillar',
      'uniquePillars',
      'scenarios',
    ])
  ) {
    return undefined
  }
  if (typeof value.solarDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.solarDate)) {
    return undefined
  }
  if (value.successQualifier !== 'partial' && value.successQualifier !== 'candidate') {
    return undefined
  }
  const dayPillar = parsePillar(value.dayPillar)
  if (!dayPillar) return undefined

  let uniquePillars: { year: BaziPillar; month: BaziPillar } | null = null
  if (value.uniquePillars !== null) {
    if (!isPlainObjectWithKeys(value.uniquePillars, ['year', 'month'])) return undefined
    const year = parsePillar(value.uniquePillars.year)
    const month = parsePillar(value.uniquePillars.month)
    if (!year || !month) return undefined
    uniquePillars = { year, month }
  }

  let scenarios: BaziScenario[] | null = null
  if (value.scenarios !== null) {
    const parsed = parseScenarios(value.scenarios)
    if (!parsed) return undefined
    scenarios = parsed
  }

  // 唯一情形与候选情形必须二选一非空，且与成功限定一致。
  const isCandidate = scenarios !== null
  if (isCandidate !== (value.successQualifier === 'candidate')) return undefined
  if (!isCandidate && uniquePillars === null) return undefined

  return {
    solarDate: value.solarDate,
    successQualifier: value.successQualifier,
    dayPillar,
    uniquePillars,
    scenarios,
  }
}

/** 解析并校验保存请求；非法返回 400 固定文案。 */
export function parseSaveSnapshotRequest(body: unknown): SaveBaziSnapshotRequest {
  if (
    !isPlainObjectWithKeys(body, [
      'toolId',
      'resultId',
      'asOfDate',
      'originalInput',
      'inputOrigin',
      'clientDigest',
    ])
  ) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  // 工具白名单：R5 只接受 bazi，不接受任意 toolId 写入通用快照表。
  if (body.toolId !== BAZI_TOOL_ID) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  const resultId = body.resultId
  if (typeof resultId !== 'string' || resultId.length === 0 || resultId.length > 128) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  if (typeof body.asOfDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.asOfDate)) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  const originalInput = parseRawDate(body.originalInput)
  if (!originalInput) {
    throw createError({ statusCode: 400, statusMessage: '出生日期无效' })
  }
  if (body.inputOrigin !== 'manual' && body.inputOrigin !== 'profile') {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  const clientDigest = parseDigest(body.clientDigest)
  if (!clientDigest) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  return {
    toolId: BAZI_TOOL_ID,
    resultId,
    asOfDate: body.asOfDate,
    originalInput,
    inputOrigin: body.inputOrigin as BaziInputOrigin,
    clientDigest,
  }
}

/** 解析列表/清空查询参数：tool 必须为 bazi，limit 有上限。 */
export function parseHistoryQuery(query: Record<string, unknown>): {
  toolId: string
  limit: number
  confirm?: number
} {
  if (query.tool !== BAZI_TOOL_ID) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  let limit = 20
  if (query.limit !== undefined) {
    const parsed = Number(query.limit)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
      throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
    }
    limit = parsed
  }
  if (query.confirm === undefined) return { toolId: BAZI_TOOL_ID, limit }
  const confirm = Number(query.confirm)
  if (!Number.isInteger(confirm) || confirm < 0) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  return { toolId: BAZI_TOOL_ID, limit, confirm }
}

/** 固定错误映射：code → HTTP 状态与固定文案；其余统一 500。 */
const STATUS_BY_CODE: Record<string, number> = {
  NOT_FOUND: 404,
  SAVE_FAILED: 500,
  DELETE_FAILED: 500,
}

const MESSAGE_BY_CODE: Record<string, string> = {
  NOT_FOUND: '记录不存在或不可用',
  SAVE_FAILED: '保存失败，请稍后再试',
  DELETE_FAILED: '删除失败，请稍后再试',
}

/** 领域固定错误 → 固定 DTO + HTTP 状态；不泄漏快照或出生日期。 */
export function mapHistoryError(err: unknown): never {
  if (err instanceof ResultHistoryServiceError) {
    const code: BaziErrorCode | string = err.code
    throw createError({
      statusCode: STATUS_BY_CODE[code] ?? 500,
      statusMessage: MESSAGE_BY_CODE[code] ?? '请求处理失败',
      data: { code },
    })
  }
  throw createError({ statusCode: 500, statusMessage: '请求处理失败，请稍后再试' })
}
