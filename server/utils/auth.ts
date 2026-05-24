import { randomBytes } from 'node:crypto'
import { dbRun, dbGet } from '../database/db'

export function createSessionToken(profileId: number): string {
  const token = randomBytes(24).toString('hex')
  dbRun('INSERT INTO sessions (profile_id, token) VALUES (?, ?)', [profileId, token])
  return token
}

export function getProfileIdFromToken(token: string): number | null {
  if (!token) return null
  const session = dbGet('SELECT profile_id FROM sessions WHERE token = ?', [token])
  return session?.profile_id ?? null
}

export function deleteSession(token: string): void {
  dbRun('DELETE FROM sessions WHERE token = ?', [token])
}
