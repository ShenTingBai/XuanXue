import { deleteCookie } from 'h3'
import { deleteSession } from '../../utils/auth'
import { getClientIp } from '../../utils/rateLimit'
import { logSecurityEvent } from '../../utils/securityLog'

export default defineEventHandler(async event => {
  const token = event.context.token
  const profileId = event.context.profileId

  if (!token || !profileId) {
    throw createError({ statusCode: 401, statusMessage: '无效的会话' })
  }

  logSecurityEvent('logout', profileId, getClientIp(event))
  deleteSession(token)
  deleteCookie(event, 'xuanxue_token', { path: '/' })
  return { success: true }
})
