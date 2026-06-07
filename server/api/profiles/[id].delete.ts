import { dbGet, dbRun } from '../../database/db'
import { checkRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async event => {
  const idRaw = getRouterParam(event, 'id')
  if (!idRaw || !/^\d+$/.test(idRaw)) {
    throw createError({ statusCode: 400, statusMessage: '无效的档案ID' })
  }
  const id = parseInt(idRaw)

  const profileIdFromToken = event.context.profileId
  if (!profileIdFromToken) {
    throw createError({ statusCode: 401, statusMessage: '会话已失效，请重新登录' })
  }

  // Allow deletion if: owns the profile, OR is the parent of the sub-profile
  const targetProfile = dbGet('SELECT id, parent_profile_id FROM profiles WHERE id = ?', [id])
  if (!targetProfile) {
    throw createError({ statusCode: 404, statusMessage: '档案不存在' })
  }

  const isOwner = profileIdFromToken === id
  const isParent = (targetProfile.parent_profile_id as number | undefined) === profileIdFromToken
  if (!isOwner && !isParent) {
    throw createError({ statusCode: 403, statusMessage: '无权删除此档案' })
  }

  // Rate limiting: 5 delete attempts per minute per profile
  if (!checkRateLimit(`profile-delete:${id}`, 5, 60000)) {
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  // Cascade delete: remove associated records before deleting the profile
  try {
    dbRun('BEGIN')
    dbRun('DELETE FROM divination_results WHERE profile_id = ?', [id])
    dbRun('DELETE FROM sessions WHERE profile_id = ?', [id])
    dbRun('UPDATE security_log SET profile_id = NULL WHERE profile_id = ?', [id])
    dbRun('DELETE FROM profiles WHERE id = ?', [id])
    dbRun('COMMIT')
  } catch {
    dbRun('ROLLBACK')
    throw createError({ statusCode: 500, statusMessage: '删除失败' })
  }

  return new Response(null, { status: 204 })
})
