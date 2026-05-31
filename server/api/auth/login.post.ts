import { dbGet, dbRun } from '../../database/db'
import { createSessionToken, hashPin, verifyPin, isLegacyPin, cleanupExpiredSessions } from '../../utils/auth'
import { toSafeProfile } from '../../utils/profile'
import { getClientIp, checkRateLimit } from '../../utils/rateLimit'
import { logSecurityEvent } from '../../utils/securityLog'

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

  // Rate limiting: 5 attempts per minute per IP
  const clientIp = getClientIp(event)
  if (!checkRateLimit(`login:${clientIp}`, 5, 60000)) {
    logSecurityEvent('rate_limit_triggered', null, clientIp, 'Login rate limit exceeded')
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  // Cleanup expired sessions before processing
  cleanupExpiredSessions()

  // Look up profile by nickname only (without PIN comparison)
  // If account doesn't exist or is locked, return the same generic error to prevent nickname enumeration
  const profile = dbGet('SELECT * FROM profiles WHERE nickname = ?', [nickname])

  if (!profile) {
    logSecurityEvent('login_failed', null, clientIp, 'Failed login attempt')
    throw createError({ statusCode: 401, statusMessage: '昵称或PIN码错误' })
  }

  // Account lockout: count failed logins in the last 15 minutes
  const recentFailures = dbGet(
    "SELECT COUNT(*) as count FROM security_log WHERE profile_id = ? AND event_type = 'login_failed' AND created_at > datetime('now', '-15 minutes')",
    [profile.id]
  )

  if (recentFailures && (recentFailures.count as number) >= 10) {
    logSecurityEvent('login_failed', profile.id as number, clientIp, 'Account locked')
    throw createError({ statusCode: 401, statusMessage: '昵称或PIN码错误' })
  }

  const storedPin = profile.pin as string

  // Verify PIN using hashed comparison
  const pinValid = verifyPin(pin, storedPin)
  if (!pinValid) {
    logSecurityEvent('login_failed', profile.id as number, clientIp, 'Wrong PIN')
    throw createError({ statusCode: 401, statusMessage: '昵称或PIN码错误' })
  }

  // Legacy migration: if PIN stored in plain text, upgrade to hash
  if (isLegacyPin(storedPin)) {
    const hashed = hashPin(pin)
    dbRun('UPDATE profiles SET pin = ? WHERE id = ?', [hashed, profile.id])
  }

  const token = createSessionToken(profile.id as number)

  logSecurityEvent('login_success', profile.id as number, clientIp, 'Login successful')

  return { token, profile: toSafeProfile(profile) }
})
