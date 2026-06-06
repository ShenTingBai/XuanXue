import { setCookie } from 'h3'
import { dbGet, dbRun } from '../../database/db'
import { cleanupExpiredSessions, createSessionToken, hashPin } from '../../utils/auth'
import { toSafeProfile } from '../../utils/profile'
import { getClientIp, checkRateLimit } from '../../utils/rateLimit'
import { logSecurityEvent } from '../../utils/securityLog'

export default defineEventHandler(async event => {
  // Body size limit: prevent oversized payloads
  const contentLength = parseInt(getHeader(event, 'content-length') || '0', 10)
  if (contentLength > 1024) {
    throw createError({ statusCode: 413, statusMessage: '请求体过大' })
  }

  const body = await readBody(event)
  let { nickname } = body || {}
  const { pin } = body || {}
  nickname = nickname?.trim() ?? ''

  if (!nickname || !pin) {
    throw createError({ statusCode: 400, statusMessage: '昵称和PIN码不能为空' })
  }

  if (!/^\d{4}$/.test(pin)) {
    throw createError({ statusCode: 400, statusMessage: 'PIN码必须为4位数字' })
  }

  // Rate limiting: 3 attempts per minute per IP
  const clientIp = getClientIp(event)
  if (!checkRateLimit(`register:${clientIp}`, 3, 60000)) {
    logSecurityEvent('rate_limit_triggered', null, clientIp, 'Register rate limit exceeded')
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  // !nickname already guards empty string; only need to check max length
  if (nickname.length > 20) {
    throw createError({ statusCode: 400, statusMessage: '昵称长度不能超过20个字符' })
  }

  // Apply NFC Unicode normalization and restrict character set
  nickname = nickname.normalize('NFC')
  if (!/^[㐀-鿿\w-]{2,20}$/.test(nickname)) {
    throw createError({
      statusCode: 400,
      statusMessage: '昵称仅支持中文、字母、数字、下划线和连字符（2-20字）',
    })
  }

  const existing = dbGet('SELECT id FROM profiles WHERE nickname = ?', [nickname])
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: '该昵称已被使用' })
  }

  // Hash PIN before storing
  const hashedPin = hashPin(pin)

  let result: ReturnType<typeof dbRun>
  try {
    result = dbRun('INSERT INTO profiles (nickname, pin) VALUES (?, ?)', [nickname, hashedPin])
  } catch (err: unknown) {
    if ((err as Error)?.message?.includes('UNIQUE constraint failed: profiles.nickname')) {
      throw createError({ statusCode: 409, statusMessage: '该昵称已被使用' })
    }
    throw createError({ statusCode: 500, statusMessage: '注册失败，请稍后再试' })
  }
  const profile = dbGet('SELECT * FROM profiles WHERE id = ?', [result.lastInsertRowid])

  // Clean up expired sessions before creating a new one
  cleanupExpiredSessions()

  const token = createSessionToken(result.lastInsertRowid)

  // Set httpOnly cookie alongside JSON response (gradual migration from localStorage)
  if (event.node?.res) {
    setCookie(event, 'xuanxue_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })
  }

  logSecurityEvent('register', result.lastInsertRowid as number, clientIp, 'New user registered')

  return { token, profile: toSafeProfile(profile!) }
})
