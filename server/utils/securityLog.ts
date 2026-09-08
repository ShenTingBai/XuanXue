import { dbRun } from '../database/db'
import { makeSecretHmacHint } from './auth'

export type SecurityEventType =
  | 'register'
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'logout_all'
  | 'account_deleted'
  | 'rate_limit_triggered'
  | 'session_expired'

/**
 * ip_hint 只保存不可逆摘要提示，不保存完整 IP。
 * 使用服务端密钥派生的 HMAC-SHA256 并带固定域分隔，低熵 IPv4 也无法通过无密钥枚举还原。
 */
function makeIpHint(ip: string): string {
  if (!ip) return 'unknown'
  return `hint:${makeSecretHmacHint(ip, 'ip-hint')}`
}

/**
 * 安全事件日志：best-effort 写入 account_id、event_type、HMAC ip_hint 与固定短语 details。
 * 写入失败只记录 console.error，不向认证主流程抛出异常；
 * 任何情况下不得把原始 IP、密码、token 或请求正文落库。
 */
export function logSecurityEvent(
  eventType: SecurityEventType,
  accountId: number | null,
  ip: string,
  details?: string,
): void {
  try {
    dbRun(
      'INSERT INTO security_log (event_type, account_id, ip_hint, details) VALUES (?, ?, ?, ?)',
      [eventType, accountId, makeIpHint(ip), details ?? null],
    )
  } catch (err) {
    // 日志写入是 best-effort：失败不阻断认证主流程，也不打印敏感参数
    // eslint-disable-next-line no-console
    console.error('Security log write failed:', err)
  }
}
