import { getRouterParam } from 'h3'
import {
  assertInternalAccessIfNotPublic,
  mapHistoryError,
  requireHistoryAccountId,
} from '../../utils/result-history-request'
import { resultHistoryService } from '../../services/result-history'
import { canReadHistory } from '../../../constants/tool-catalog'
import { BAZI_TOOL_ID } from '~/constants/bazi-rules'

// GET /api/result-history/[id]：读取完整快照（打开历史只读快照，不按当前规则重算）。
// 归属校验失败返回 403 且不泄露内容；不区分"不存在"与"不属于本人"，避免枚举他人记录 id。
export default defineEventHandler(event => {
  const accountId = requireHistoryAccountId(event)
  const recordId = getRouterParam(event, 'id')
  if (!recordId || !/^[0-9a-fA-F-]{36}$/.test(recordId)) {
    throw createError({ statusCode: 400, statusMessage: '请求参数无效' })
  }
  assertInternalAccessIfNotPublic(BAZI_TOOL_ID, accountId)
  if (!canReadHistory(BAZI_TOOL_ID)) {
    throw createError({ statusCode: 403, statusMessage: '当前不支持查看历史' })
  }

  try {
    const record = resultHistoryService.getById(accountId, recordId)
    if (!record) {
      throw createError({ statusCode: 403, statusMessage: '记录不存在或不可用' })
    }
    return { record }
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    return mapHistoryError(err)
  }
})
