import { getCookie, deleteCookie } from 'h3'
import { resolveSession } from '../utils/auth'

/**
 * 认证中间件：只从 xuanxue_token HttpOnly Cookie 恢复会话，不再接受凭证头方式。
 * 有效时注入 accountId、sessionId 与仅供当前请求删除会话使用的 sessionToken；
 * 无效或过期 Cookie 清除响应 Cookie。token 不得进入日志或响应。
 */
export default defineEventHandler(async event => {
  const token = getCookie(event, 'xuanxue_token') || null

  const session = token ? resolveSession(token) : null

  if (session && token) {
    event.context.accountId = session.accountId
    event.context.sessionId = session.sessionId
    event.context.sessionToken = token
    return
  }

  // 无效或过期 Cookie：清除响应 Cookie，不注入上下文
  if (token) {
    deleteCookie(event, 'xuanxue_token', { path: '/' })
  }
})
