import { getRouterParam } from 'h3'
import { assertSameOriginMutation } from '../../utils/request-origin'
import {
  assertInternalAccessIfNotPublic,
  mapHistoryError,
  requireHistoryAccountId,
} from '../../utils/result-history-request'
import { ResultHistoryServiceError, resultHistoryService } from '../../services/result-history'
import { BAZI_TOOL_ID } from '~/constants/bazi-rules'

// DELETE /api/result-history/[id]：删除单条历史。
// 归属由 accountId 限定：未命中（不存在或非本人）返回 404，不区分两者。
export default defineEventHandler(event => {
  assertSameOriginMutation(event)
  const accountId = requireHistoryAccountId(event)
  const recordId = getRouterParam(event, 'id')
  if (!recordId || !/^[0-9a-fA-F-]{36}$/.test(recordId)) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  assertInternalAccessIfNotPublic(BAZI_TOOL_ID, accountId)

  try {
    const deleted = resultHistoryService.deleteOne(accountId, recordId)
    if (deleted === 0) {
      throw new ResultHistoryServiceError('NOT_FOUND', '记录不存在或不可用')
    }
    return { deleted }
  } catch (err) {
    return mapHistoryError(err)
  }
})
