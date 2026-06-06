import { getCookie } from 'h3'
import { getProfileIdFromToken } from '../../utils/auth'
import { dbGet } from '../../database/db'
import { toSafeProfile } from '../../utils/profile'

export default defineEventHandler(async event => {
  const token = getCookie(event, 'xuanxue_token')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }

  const profileId = getProfileIdFromToken(token)
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: '会话无效' })
  }

  const profile = dbGet('SELECT * FROM profiles WHERE id = ? ', [profileId])

  if (!profile) {
    throw createError({ statusCode: 401, statusMessage: '用户不存在' })
  }

  return { profile: toSafeProfile(profile) }
})
