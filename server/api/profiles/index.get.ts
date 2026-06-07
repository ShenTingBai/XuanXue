import { dbGet } from '../../database/db'
import { toSafeProfile } from '../../utils/profile'

export default defineEventHandler(async event => {
  const profileId = event.context.profileId
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }
  const profile = dbGet('SELECT * FROM profiles WHERE id = ?', [profileId])
  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: '档案不存在' })
  }
  return { profile: toSafeProfile(profile) }
})
