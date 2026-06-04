import { dbAll, dbGet } from '../../database/db'
import { toSafeProfile } from '../../utils/profile'

export default defineEventHandler(async (event) => {
  const profileId = (event.context as any).profileId as number | undefined
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: '会话已失效，请重新登录' })
  }

  // Get the current (main) profile
  const mainProfile = dbGet('SELECT * FROM profiles WHERE id = ?', [profileId])
  if (!mainProfile) {
    throw createError({ statusCode: 404, statusMessage: '档案不存在' })
  }

  // Get sub-profiles where parent_profile_id matches
  const subProfiles = dbAll(
    'SELECT * FROM profiles WHERE parent_profile_id = ? ORDER BY created_at ASC',
    [profileId]
  )

  const main = toSafeProfile(mainProfile)
  const subs = subProfiles.map(p => toSafeProfile(p))

  return {
    main: { ...main, isMain: true },
    subs: subs.map((p) => ({ ...p, isMain: false })),
  }
})
