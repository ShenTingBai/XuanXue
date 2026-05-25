import { getProfileIdFromToken, deleteSession } from '../../utils/auth'
import { getClientIp } from '../../utils/rateLimit'
import { logSecurityEvent } from '../../utils/securityLog'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: '缺少认证信息' })
  }

  const profileId = getProfileIdFromToken(token)
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: '无效的会话' })
  }

  logSecurityEvent('logout', profileId, getClientIp(event))
  deleteSession(token)
  return { success: true }
})
