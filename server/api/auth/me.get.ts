import { dbGet } from '../../database/db'
import { toSafeAccount } from '../../utils/account'
import { clearAuthCookie } from '../../utils/auth'
import { ACCOUNT_STATUS_ACTIVE } from '../../../constants/account-policy'

export default defineEventHandler(async event => {
  // 只使用中间件已验证的 accountId；无会话或账号不存在统一 401 并清理失效 Cookie
  const accountId = event.context.accountId
  if (!accountId) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }

  const account = dbGet('SELECT * FROM accounts WHERE id = ?', [accountId])
  if (!account || account.status !== ACCOUNT_STATUS_ACTIVE) {
    clearAuthCookie(event)
    throw createError({ statusCode: 401, statusMessage: '会话无效' })
  }

  return { account: toSafeAccount(account) }
})
