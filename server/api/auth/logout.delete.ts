import { deleteSession } from '../../utils/auth'
import { getClientIp } from '../../utils/rateLimit'
import { logSecurityEvent } from '../../utils/securityLog'

export default defineEventHandler(async (event) => {
  const token = (event.context as any).token as string | undefined
  const profileId = (event.context as any).profileId as number | undefined

  if (!token || !profileId) {
    throw createError({ statusCode: 401, statusMessage: '无效的会话' })
  }

  logSecurityEvent('logout', profileId, getClientIp(event))
  deleteSession(token)
  return { success: true }
})
