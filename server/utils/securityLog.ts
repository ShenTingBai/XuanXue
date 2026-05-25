import { dbRun } from '../database/db'

export type SecurityEventType =
  | 'login_failed'
  | 'login_success'
  | 'register'
  | 'logout'
  | 'pin_changed'
  | 'rate_limit_triggered'
  | 'session_refresh'
  | 'token_refresh'

export function logSecurityEvent(
  eventType: SecurityEventType,
  profileId: number | null,
  ip: string,
  details?: string
): void {
  try {
    dbRun(
      'INSERT INTO security_log (event_type, profile_id, ip, details) VALUES (?, ?, ?, ?)',
      [eventType, profileId, ip, details || null]
    )
  } catch (err) {
    // Security logging is best-effort — don't throw
    console.error('Security log write failed:', err)
  }
}
