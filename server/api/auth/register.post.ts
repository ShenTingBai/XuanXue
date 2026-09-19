import { dbGet, dbRun, withTransaction } from '../../database/db'
import {
  generateSessionToken,
  setAuthCookie,
  cleanupExpiredSessions,
  hashPassword,
} from '../../utils/auth'
import { toSafeAccount, normalizeNickname, isValidNickname } from '../../utils/account'
import { getClientIp, checkRateLimit } from '../../utils/rateLimit'
import { logSecurityEvent } from '../../utils/securityLog'
import { assertSameOriginMutation } from '../../utils/request-origin'
import { readBoundedJsonBody } from '../../utils/bounded-json-body'
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_SERVICE_TERMS_VERSION,
  NICKNAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  ACCOUNT_STATUS_ACTIVE,
  AUTH_MAX_REQUEST_BYTES,
} from '../../../constants/account-policy'

export default defineEventHandler(async event => {
  // 同源校验先于任何数据库写入
  assertSameOriginMutation(event)

  // 限流先于读体：体积上限由 readBoundedJsonBody 按真实字节判定，
  // 但不能让未认证请求先消耗一次完整读体的资源。
  const clientIp = getClientIp(event)
  if (!checkRateLimit(`register:${clientIp}`, 3, 60000)) {
    logSecurityEvent('rate_limit_triggered', null, clientIp, 'Register rate limit exceeded')
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  const body = await readBoundedJsonBody(event, AUTH_MAX_REQUEST_BYTES)
  const {
    nickname: rawNickname,
    password,
    ageConfirmed,
    privacyPolicyVersion,
    serviceTermsVersion,
  } = body

  // 密码按原值校验，不 trim
  if (
    typeof password !== 'string' ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw createError({ statusCode: 400, statusMessage: '密码长度需为 8-64 个字符' })
  }

  if (typeof rawNickname !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '请提供昵称' })
  }
  const nickname = normalizeNickname(rawNickname)
  if (!isValidNickname(nickname)) {
    throw createError({
      statusCode: 400,
      statusMessage: '昵称仅支持中文、字母、数字、下划线和连字符（2-20字）',
    })
  }
  if (nickname.length > NICKNAME_MAX_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: '昵称长度不能超过20个字符' })
  }

  // 年龄确认必须严格为 true
  if (ageConfirmed !== true) {
    throw createError({ statusCode: 400, statusMessage: '必须确认已满十四周岁' })
  }

  // 两个规则版本必须等于共享常量
  if (privacyPolicyVersion !== CURRENT_PRIVACY_POLICY_VERSION) {
    throw createError({ statusCode: 400, statusMessage: '隐私政策版本不符，请刷新后重试' })
  }
  if (serviceTermsVersion !== CURRENT_SERVICE_TERMS_VERSION) {
    throw createError({ statusCode: 400, statusMessage: '服务规则版本不符，请刷新后重试' })
  }

  // 昵称唯一性预检（事务内仍有 UNIQUE 约束兜底）
  const existing = dbGet('SELECT id FROM accounts WHERE nickname = ?', [nickname])
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: '该昵称已被使用' })
  }

  cleanupExpiredSessions()

  // 单一事务：创建 active Account 与当前 Session，不隐式建档。
  // 回调直接返回 { accountId, token }，事务成功后从返回值解构，避免回调外未初始化变量。
  let registered: { accountId: number; token: string }
  try {
    registered = withTransaction(() => {
      const hashed = hashPassword(password)
      const result = dbRun(
        'INSERT INTO accounts (nickname, credential_hash, status, age_confirmed_at, privacy_policy_version, service_terms_version) VALUES (?, ?, ?, ?, ?, ?)',
        [
          nickname,
          hashed,
          ACCOUNT_STATUS_ACTIVE,
          new Date().toISOString(),
          CURRENT_PRIVACY_POLICY_VERSION,
          CURRENT_SERVICE_TERMS_VERSION,
        ],
      )
      const accountId = result.lastInsertRowid

      const session = generateSessionToken()
      dbRun('INSERT INTO sessions (account_id, token_hash, expires_at) VALUES (?, ?, ?)', [
        accountId,
        session.tokenHash,
        session.expiresAt,
      ])
      return { accountId, token: session.token }
    })
  } catch (err: unknown) {
    if ((err as Error)?.message?.includes('UNIQUE constraint failed: accounts.nickname')) {
      throw createError({ statusCode: 409, statusMessage: '该昵称已被使用' })
    }
    throw createError({ statusCode: 500, statusMessage: '注册失败，请稍后再试' })
  }

  const { accountId, token } = registered

  // 事务提交后设置 Cookie；响应只返回 account，不返回 token 或 profile
  setAuthCookie(event, token)
  logSecurityEvent('register', accountId, clientIp, 'New account registered')

  const account = dbGet('SELECT * FROM accounts WHERE id = ?', [accountId])
  return { account: toSafeAccount(account) }
})
