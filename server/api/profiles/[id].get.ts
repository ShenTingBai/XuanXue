import { dbGet } from '../../database/db'
import { getProfileIdFromToken } from '../../utils/auth'
import { toSafeProfile } from '../../utils/profile'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params!.id)
  if (isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的档案ID' })
  }

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const profileIdFromToken = token ? getProfileIdFromToken(token) : null
  if (!profileIdFromToken || profileIdFromToken !== id) {
    throw createError({ statusCode: 403, statusMessage: '会话已失效，请重新登录' })
  }

  const profile = dbGet('SELECT * FROM profiles WHERE id = ?', [id])
  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: '档案不存在' })
  }

  return toSafeProfile(profile)
})
