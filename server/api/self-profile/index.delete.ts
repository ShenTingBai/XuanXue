import { assertSameOriginMutation } from '../../utils/request-origin'
import {
  requireAccountId,
  readSelfProfileJsonBody,
  mapServiceError,
} from '../../utils/self-profile-request'
import { HistoryModeRequiredError, selfProfileService } from '../../services/self-profile'

// DELETE /api/self-profile：请求体 {expected} 或 {expected, historyMode}。
//
// R5（D5）新增 historyMode，用于落实交付规范 §7.5 与数据规范 §13：
// 删除本人档案前必须已展示"仍含出生输入的历史条数"，并由用户明确选择保留还是同时删除。
// 有条数而缺少选择时返回 409 + HISTORY_MODE_REQUIRED（不设默认值、不静默删历史）。
export default defineEventHandler(async event => {
  assertSameOriginMutation(event)
  const accountId = requireAccountId(event)
  const body = await readSelfProfileJsonBody(event)
  const { expected, historyMode } = parseDeleteProfileRequest(body)

  const historyCount = selfProfileService.countHistoryWithBirthInput(accountId)

  try {
    // 有选择时才传第三个参数：保持"无历史"路径与既有调用形态完全一致。
    if (historyMode) {
      selfProfileService.deleteProfile(accountId, expected, historyMode)
    } else {
      selfProfileService.deleteProfile(accountId, expected)
    }
    if (historyCount === 0) return { success: true }
    return historyMode === 'delete'
      ? { success: true, historyDeleted: historyCount }
      : { success: true, historyKept: historyCount }
  } catch (err) {
    if (err instanceof HistoryModeRequiredError) {
      throw createError({
        statusCode: 409,
        statusMessage: '请先选择历史记录的处置方式',
        data: { code: err.code, historyCount: err.historyCount },
      })
    }
    return mapServiceError(err)
  }
})

/**
 * 解析删除档案请求（含可选的 historyMode）。
 *
 * 不复用 `self-profile-request` 的 `parseDeleteRequest`：该解析器要求顶层恰好只有
 * `expected`，会拒绝带 `historyMode` 的请求，而它所在文件不在本次授权范围内。
 * 这里保持同样的严格性：只接受 `{expected}` 或 `{expected, historyMode}`，
 * 逐项校验类型，拒绝额外字段与数字字符串。
 */
function parseDeleteProfileRequest(body: unknown): {
  expected: { profileId: string; version: number }
  historyMode?: 'keep' | 'delete'
} {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  const record = body as Record<string, unknown>
  const keys = Object.keys(record)
  const hasMode = keys.includes('historyMode')
  const expectedKeys = hasMode ? ['expected', 'historyMode'] : ['expected']
  if (keys.length !== expectedKeys.length || !expectedKeys.every(key => key in record)) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }

  const expectedValue = record.expected
  if (typeof expectedValue !== 'object' || expectedValue === null || Array.isArray(expectedValue)) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  const expectedRecord = expectedValue as Record<string, unknown>
  if (Object.keys(expectedRecord).length !== 2) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  const profileId = expectedRecord.profileId
  const version = expectedRecord.version
  if (typeof profileId !== 'string' || profileId.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }

  if (!hasMode) return { expected: { profileId, version } }
  const historyMode = record.historyMode
  if (historyMode !== 'keep' && historyMode !== 'delete') {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  return { expected: { profileId, version }, historyMode }
}
