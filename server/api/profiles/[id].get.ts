import { dbGet } from '../../database/db'
import { getProfileIdFromToken } from '../../utils/auth'
import { toSafeProfile } from '../../utils/profile'

export default defineEventHandler(async (event) => {
  const idRaw = event.context.params!.id
  if (!/^\d+$/.test(idRaw)) {
    throw createError({ statusCode: 400, statusMessage: '无效的档案ID' })
  }
  const id = parseInt(idRaw)
  if (isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的档案ID' })
  }

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const profileIdFromToken = token ? getProfileIdFromToken(token) : null
  if (!profileIdFromToken) throw createError({ statusCode: 401, statusMessage: '会话已失效，请重新登录' })
  if (profileIdFromToken !== id) throw createError({ statusCode: 403, statusMessage: '无权访问此档案' })

  const profile = dbGet('SELECT * FROM profiles WHERE id = ?', [id])
  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: '档案不存在' })
  }

  return toSafeProfile(profile)
})
