import { getQuery } from 'h3'
import { assertSameOriginMutation } from '../../utils/request-origin'
import {
  assertInternalAccessIfNotPublic,
  mapHistoryError,
  parseHistoryQuery,
  requireHistoryAccountId,
} from '../../utils/result-history-request'
import { resultHistoryService } from '../../services/result-history'
import { canReadHistory } from '../../../constants/tool-catalog'

// DELETE /api/result-history?tool=bazi&confirm=<当前条数>：清空该工具的八字历史。
// confirm 必须与实际条数一致，避免数量变化后误删（交付规范 §7.5：显示数量后确认）。
// 删除在事务内完成；失败不制造半删除状态。
export default defineEventHandler(event => {
  assertSameOriginMutation(event)
  const accountId = requireHistoryAccountId(event)
  const { toolId, confirm } = parseHistoryQuery(getQuery(event) as Record<string, unknown>)

  assertInternalAccessIfNotPublic(toolId, accountId)
  if (!canReadHistory(toolId)) {
    throw createError({ statusCode: 403, statusMessage: '当前不支持查看历史' })
  }
  if (confirm === undefined) {
    throw createError({ statusCode: 400, statusMessage: '请先确认要清空的记录数量' })
  }

  try {
    const actual = resultHistoryService.countByTool(accountId, toolId)
    if (actual !== confirm) {
      throw createError({
        statusCode: 409,
        statusMessage: '记录数量已变化，请刷新后重试',
        data: { code: 'COUNT_MISMATCH', actual },
      })
    }
    const deleted = resultHistoryService.deleteByTool(accountId, toolId)
    return { deleted }
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    return mapHistoryError(err)
  }
})
