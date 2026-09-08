import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto'
import { setCookie, deleteCookie } from 'h3'
import type { H3Event } from 'h3'
import { dbRun, dbGet } from '../database/db'
import {
  AUTH_COOKIE_NAME,
  SESSION_DURATION_DAYS,
  SESSION_DURATION_SECONDS,
} from '../../constants/account-policy'

const SESSION_SECRET: string = (() => {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable must be set to a strong random value')
  }
  return secret
})()

// ── 凭证哈希（scrypt + 每次随机盐）──

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  // 先校验编码格式与解码后长度，再 timingSafeEqual，避免畸形哈希进入比较。
  // hash 必须恰好 128 个十六进制字符（64 字节）；salt 非空且哈希可解码。
  if (!salt || !hash || hash.length !== 128 || !/^[0-9a-fA-F]+$/.test(hash)) {
    return false
  }
  const hashBuf = Buffer.from(hash, 'hex')
  if (hashBuf.length !== 64) {
    return false
  }
  const derived = scryptSync(password, salt, 64)
  return timingSafeEqual(derived, hashBuf)
}

/**
 * 服务端密钥派生的 HMAC-SHA256 提示：只返回固定长度短摘要，不暴露 SESSION_SECRET。
 * 供安全日志等需要不可逆关联提示的场景使用，加入固定域分隔避免跨用途枚举。
 */
export function makeSecretHmacHint(value: string, domain: string): string {
  const key = createHmac('sha256', SESSION_SECRET).update(`hint:${domain}`).digest()
  return createHmac('sha256', key).update(value).digest('hex').slice(0, 16)
}

// ── 会话 ──

/** 生成会话 token 及其 HMAC 哈希与过期时间；不写库，便于在事务中显式落库。 */
export function generateSessionToken(): { token: string; tokenHash: string; expiresAt: string } {
  const token = randomBytes(24).toString('hex')
  const tokenHash = createHmac('sha256', SESSION_SECRET).update(token).digest('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  return { token, tokenHash, expiresAt }
}

/**
 * 创建会话：不删除其他会话（多设备并存）。
 * 数据库只保存以 SESSION_SECRET 做 HMAC-SHA256 后的 token_hash。
 */
export function createSessionToken(accountId: number): string {
  const { token, tokenHash, expiresAt } = generateSessionToken()
  dbRun('INSERT INTO sessions (account_id, token_hash, expires_at) VALUES (?, ?, ?)', [
    accountId,
    tokenHash,
    expiresAt,
  ])
  return token
}

/** 解析当前会话；过期会话会被删除并返回 null。 */
export function resolveSession(rawToken: string): { accountId: number; sessionId: number } | null {
  if (!rawToken) return null
  const hashed = createHmac('sha256', SESSION_SECRET).update(rawToken).digest('hex')
  const session = dbGet('SELECT id, account_id, expires_at FROM sessions WHERE token_hash = ?', [
    hashed,
  ])
  if (!session) return null

  if (session.expires_at) {
    const expiresAtStr = session.expires_at as string
    const expiresAt = new Date(
      expiresAtStr.endsWith('Z') ? expiresAtStr : expiresAtStr + 'Z',
    ).getTime()
    if (Date.now() > expiresAt) {
      dbRun('DELETE FROM sessions WHERE token_hash = ?', [hashed])
      return null
    }
  }

  return { accountId: session.account_id as number, sessionId: session.id as number }
}

/** 兼容别名：仅返回账号 ID。 */
export function getAccountIdFromToken(rawToken: string): number | null {
  const session = resolveSession(rawToken)
  return session ? session.accountId : null
}

/** 删除当前会话（当前设备退出）。 */
export function deleteSession(rawToken: string): void {
  const hashed = createHmac('sha256', SESSION_SECRET).update(rawToken).digest('hex')
  dbRun('DELETE FROM sessions WHERE token_hash = ?', [hashed])
}

/** 按会话 ID 删除（中间件注入的 sessionId 只用于当前会话删除）。 */
export function deleteSessionById(sessionId: number): void {
  dbRun('DELETE FROM sessions WHERE id = ?', [sessionId])
}

/** 删除账号全部会话（退出所有设备、注销）。 */
export function deleteAllSessions(accountId: number): void {
  dbRun('DELETE FROM sessions WHERE account_id = ?', [accountId])
}

export function cleanupExpiredSessions(): void {
  const now = new Date().toISOString()
  dbRun('DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < ?', [now])
}

// ── Cookie 辅助：所有 set/delete Cookie 选项集中在此，保持生产一致性 ──

export function setAuthCookie(event: H3Event, token: string): void {
  setCookie(event, AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  })
}

export function clearAuthCookie(event: H3Event): void {
  deleteCookie(event, AUTH_COOKIE_NAME, { path: '/' })
}
