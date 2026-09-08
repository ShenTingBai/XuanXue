import 'h3'

declare module 'h3' {
  interface H3EventContext {
    /** R2 新认证：当前会话所属账号 ID。 */
    accountId?: number
    /** R2 新认证：当前会话 ID，只用于当前会话删除。 */
    sessionId?: number
    /** R2 新认证：原始 Cookie token，仅当前请求内用于删除本会话，不进入响应。 */
    sessionToken?: string
    /** 仅保留以维持已封存端点编译；不在新认证中赋值。 */
    profileId?: number
    token?: string
  }
}
