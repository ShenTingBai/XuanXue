import { dbRun } from '../../database/db'

export default defineEventHandler(async (event) => {
  const idRaw = event.context.params!.id
  if (!/^\d+$/.test(idRaw)) {
    throw createError({ statusCode: 400, statusMessage: '无效的档案ID' })
  }
  const id = parseInt(idRaw)
  if (isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的档案ID' })
  }

  const profileIdFromToken = (event.context as any).profileId as number | undefined
  if (!profileIdFromToken) {
    throw createError({ statusCode: 401, statusMessage: '会话已失效，请重新登录' })
  }
  if (profileIdFromToken !== id) {
    throw createError({ statusCode: 403, statusMessage: '无权删除此档案' })
  }

  // Cascade delete: remove associated records before deleting the profile
  dbRun('DELETE FROM divination_results WHERE profile_id = ?', [id])
  dbRun('DELETE FROM sessions WHERE profile_id = ?', [id])
  dbRun('DELETE FROM security_log WHERE profile_id = ?', [id])
  dbRun('DELETE FROM profiles WHERE id = ?', [id])

  return new Response(null, { status: 204 })
})
