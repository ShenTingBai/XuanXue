import { deleteAllSessions, clearAuthCookie } from '../../utils/auth'
import { getClientIp } from '../../utils/rateLimit'
import { logSecurityEvent } from '../../utils/securityLog'
import { assertSameOriginMutation } from '../../utils/request-origin'

export default defineEventHandler(async event => {
  // 同源校验先于任何会话删除
  assertSameOriginMutation(event)

  const accountId = event.context.accountId
  if (!accountId) {
    throw createError({ statusCode: 401, statusMessage: '无效的会话' })
  }

  try {
    deleteAllSessions(accountId)
  } catch {
    throw createError({ statusCode: 500, statusMessage: '退出所有设备失败，请稍后再试' })
  }

  logSecurityEvent('logout_all', accountId, getClientIp(event), 'All sessions deleted')
  clearAuthCookie(event)
  return { success: true }
})
