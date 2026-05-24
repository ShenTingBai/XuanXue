import { dbGet } from '../../database/db'
import { createSessionToken } from '../../utils/auth'
import { toSafeProfile } from '../../utils/profile'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { nickname, pin } = body || {}

  if (!nickname || !pin) {
    throw createError({ statusCode: 400, statusMessage: '昵称和PIN码不能为空' })
  }

  if (!/^\d{4}$/.test(pin)) {
    throw createError({ statusCode: 400, statusMessage: 'PIN码必须为4位数字' })
  }

  const profile = dbGet('SELECT * FROM profiles WHERE nickname = ? AND pin = ?', [nickname, pin])

  if (!profile) {
    throw createError({ statusCode: 401, statusMessage: '昵称或PIN码错误' })
  }

  const token = createSessionToken(profile.id as number)

  return { token, profile: toSafeProfile(profile) }
})
