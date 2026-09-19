import { dbGet, dbRun, withTransaction } from '../../database/db'
import { verifyPassword, clearAuthCookie } from '../../utils/auth'
import { normalizeNickname } from '../../utils/account'
import { getClientIp, checkRateLimit } from '../../utils/rateLimit'
import { logSecurityEvent } from '../../utils/securityLog'
import { assertSameOriginMutation } from '../../utils/request-origin'
import { readBoundedJsonBody } from '../../utils/bounded-json-body'
import { ACCOUNT_STATUS_ACTIVE, AUTH_MAX_REQUEST_BYTES } from '../../../constants/account-policy'

export default defineEventHandler(async event => {
  // 同源校验先于任何数据库写入
  assertSameOriginMutation(event)

  // 限流先于读体：注销含密码复核（scrypt 同步开销），避免被当作 CPU 放大的免费入口。
  const clientIp = getClientIp(event)
  if (!checkRateLimit(`account-delete:${clientIp}`, 5, 60000)) {
    logSecurityEvent('rate_limit_triggered', null, clientIp, 'Account deletion rate limit exceeded')
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  const accountId = event.context.accountId
  if (!accountId) {
    throw createError({ statusCode: 401, statusMessage: '无效的会话' })
  }

  const body = await readBoundedJsonBody(event, AUTH_MAX_REQUEST_BYTES)
  const { nickname: rawNickname, password } = body
  if (typeof rawNickname !== 'string' || typeof password !== 'string' || password.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '昵称和密码不能为空' })
  }
  const nickname = normalizeNickname(rawNickname)

  // 重新验证当前账号与凭证；不把密码或完整请求体写入日志
  const account = dbGet('SELECT * FROM accounts WHERE id = ?', [accountId])
  if (!account || account.status !== ACCOUNT_STATUS_ACTIVE) {
    throw createError({ statusCode: 401, statusMessage: '昵称或密码错误' })
  }
  if ((account.nickname as string) !== nickname) {
    throw createError({ statusCode: 400, statusMessage: '昵称与当前账号不一致' })
  }
  if (!verifyPassword(password, account.credential_hash as string)) {
    logSecurityEvent('login_failed', accountId, clientIp, 'Account deletion wrong password')
    throw createError({ statusCode: 401, statusMessage: '昵称或密码错误' })
  }

  // 事务内：删除该账号可识别安全日志并删除 Account，依赖外键使全部 Session 失效。
  // 不得读取或触碰旧 xuanxue.db，也不得假设 R4/R5 表已存在。
  try {
    withTransaction(() => {
      dbRun('DELETE FROM security_log WHERE account_id = ?', [accountId])
      dbRun('DELETE FROM accounts WHERE id = ?', [accountId])
    })
  } catch {
    throw createError({ statusCode: 500, statusMessage: '注销失败，请稍后再试' })
  }

  // 成功后才清 Cookie
  clearAuthCookie(event)
  return { success: true }
})
