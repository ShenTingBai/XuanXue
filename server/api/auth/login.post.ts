import { dbGet, dbRun } from '../../database/db'
import { createSessionToken, hashPin, verifyPin, isLegacyPin, cleanupExpiredSessions } from '../../utils/auth'
import { toSafeProfile } from '../../utils/profile'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  let { nickname, pin } = body || {}
  nickname = nickname?.trim() ?? ''

  if (!nickname || !pin) {
    throw createError({ statusCode: 400, statusMessage: '昵称和PIN码不能为空' })
  }

  if (!/^\d{4}$/.test(pin)) {
    throw createError({ statusCode: 400, statusMessage: 'PIN码必须为4位数字' })
  }

  // Cleanup expired sessions before processing
  cleanupExpiredSessions()

  // Look up profile by nickname only (without PIN comparison)
  const profile = dbGet('SELECT * FROM profiles WHERE nickname = ?', [nickname])

  if (!profile) {
    throw createError({ statusCode: 401, statusMessage: '昵称或PIN码错误' })
  }

  const storedPin = profile.pin as string

  // Verify PIN using hashed comparison
  const pinValid = verifyPin(pin, storedPin)
  if (!pinValid) {
    throw createError({ statusCode: 401, statusMessage: '昵称或PIN码错误' })
  }

  // Legacy migration: if PIN stored in plain text, upgrade to hash
  if (isLegacyPin(storedPin)) {
    const hashed = hashPin(pin)
    dbRun('UPDATE profiles SET pin = ? WHERE id = ?', [hashed, profile.id])
  }

  const token = createSessionToken(profile.id as number)

  return { token, profile: toSafeProfile(profile) }
})
