import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { dbRun, dbGet } from '../database/db'

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  // If format is unrecognizable (not legacy plaintext and not scrypt hash), reject
  if (!salt || !hash || hash.length < 64) {
    return false
  }
  const derived = scryptSync(pin, salt, 64).toString('hex')
  const derivedBuf = Buffer.from(derived, 'hex')
  const hashBuf = Buffer.from(hash, 'hex')
  return timingSafeEqual(derivedBuf, hashBuf)
}

export function isLegacyPin(stored: string): boolean {
  return !stored.includes(':') && stored.length === 4
}

export function createSessionToken(profileId: number): string {
  // Enforce single-session: delete existing sessions for this profile before creating a new one
  dbRun('DELETE FROM sessions WHERE profile_id = ?', [profileId])
  const token = randomBytes(24).toString('hex')
  const hashed = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  dbRun('INSERT INTO sessions (profile_id, token_hash, expires_at) VALUES (?, ?, ?)', [profileId, hashed, expiresAt])
  return token
}

export function getProfileIdFromToken(rawToken: string): number | null {
  if (!rawToken) return null
  const hashed = createHash('sha256').update(rawToken).digest('hex')
  const session = dbGet(
    'SELECT profile_id, expires_at FROM sessions WHERE token_hash = ?',
    [hashed]
  )
  if (!session) return null

  // Check expiry
  if (session.expires_at) {
    const expiresAt = new Date(session.expires_at.endsWith('Z') ? session.expires_at : session.expires_at + 'Z').getTime()
    if (Date.now() > expiresAt) {
      // Delete expired session
      dbRun('DELETE FROM sessions WHERE token_hash = ?', [hashed])
      return null
    }
  }

  return (session.profile_id as number) ?? null
}

export function deleteSession(rawToken: string): void {
  const hashed = createHash('sha256').update(rawToken).digest('hex')
  dbRun('DELETE FROM sessions WHERE token_hash = ?', [hashed])
}

export function cleanupExpiredSessions(): void {
  const now = new Date().toISOString()
  dbRun("DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < ?", [now])
}
