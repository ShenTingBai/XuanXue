import { dbGet } from '../../database/db'
import {
  createSessionToken,
  setAuthCookie,
  cleanupExpiredSessions,
  verifyPassword,
} from '../../utils/auth'
import { toSafeAccount, normalizeNickname } from '../../utils/account'
import { getClientIp, checkRateLimit } from '../../utils/rateLimit'
import { logSecurityEvent } from '../../utils/securityLog'
import { assertSameOriginMutation } from '../../utils/request-origin'
import { readBoundedJsonBody } from '../../utils/bounded-json-body'
import { ACCOUNT_STATUS_ACTIVE, AUTH_MAX_REQUEST_BYTES } from '../../../constants/account-policy'

export default defineEventHandler(async event => {
  // 同源校验先于任何数据库写入
  assertSameOriginMutation(event)

  // 限流先于读体：登录是暴破的唯一防线，必须最先判定，
  // 体积上限由 readBoundedJsonBody 按真实字节兜底。
  const clientIp = getClientIp(event)
  if (!checkRateLimit(`login:${clientIp}`, 5, 60000)) {
    logSecurityEvent('rate_limit_triggered', null, clientIp, 'Login rate limit exceeded')
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  const body = await readBoundedJsonBody(event, AUTH_MAX_REQUEST_BYTES)
  const { nickname: rawNickname, password } = body

  // 密码不 trim，按原值参与校验
  if (typeof rawNickname !== 'string' || typeof password !== 'string' || password.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '昵称和密码不能为空' })
  }
  if (password.length > 64) {
    throw createError({ statusCode: 400, statusMessage: '密码长度不能超过64个字符' })
  }
  const nickname = normalizeNickname(rawNickname)

  cleanupExpiredSessions()

  // 不存在、非 active、哈希异常与密码错误统一返回同一文案，避免昵称枚举
  const account = dbGet('SELECT * FROM accounts WHERE nickname = ?', [nickname])
  if (!account || account.status !== ACCOUNT_STATUS_ACTIVE) {
    logSecurityEvent('login_failed', null, clientIp, 'Failed login attempt')
    throw createError({ statusCode: 401, statusMessage: '昵称或密码错误' })
  }

  const credentialHash = account.credential_hash as string
  const passwordValid = verifyPassword(password, credentialHash)
  if (!passwordValid) {
    logSecurityEvent('login_failed', account.id as number, clientIp, 'Wrong password')
    throw createError({ statusCode: 401, statusMessage: '昵称或密码错误' })
  }

  // 新增独立 Session，不删除其他设备会话
  const token = createSessionToken(account.id as number)
  setAuthCookie(event, token)

  logSecurityEvent('login_success', account.id as number, clientIp, 'Login successful')

  return { account: toSafeAccount(account) }
})
