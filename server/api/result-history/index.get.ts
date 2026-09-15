import { getQuery } from 'h3'
import {
  assertInternalAccessIfNotPublic,
  mapHistoryError,
  parseHistoryQuery,
  requireHistoryAccountId,
} from '../../utils/result-history-request'
import { resultHistoryService } from '../../services/result-history'
import { canReadHistory } from '../../../constants/tool-catalog'

// GET /api/result-history?tool=bazi&limit=20：历史列表（只返回安全摘要）。
// 不返回 result_snapshot_json，也不返回精确出生日期；归属由 accountId 限定。
export default defineEventHandler(event => {
  const accountId = requireHistoryAccountId(event)
  const { toolId, limit } = parseHistoryQuery(getQuery(event) as Record<string, unknown>)

  assertInternalAccessIfNotPublic(toolId, accountId)
  if (!canReadHistory(toolId)) {
    throw createError({ statusCode: 403, statusMessage: '当前不支持查看历史' })
  }

  try {
    const items = resultHistoryService.listByTool(accountId, toolId, limit)
    return { items }
  } catch (err) {
    return mapHistoryError(err)
  }
})
