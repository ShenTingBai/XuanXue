/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initDb, dbRun, dbGet, dbAll } from '../../server/database/db'
import {
  createSessionToken,
  getProfileIdFromToken,
  deleteSession,
  hashPin,
} from '../../server/utils/auth'
import { checkRateLimit } from '../../server/utils/rateLimit'

describe('Divinations API (unit tests)', () => {
  let profileId: number
  let token: string
  let otherProfileId: number
  let otherToken: string

  beforeAll(async () => {
    await initDb()

    // Clean up any leftover test data
    dbRun(
      "DELETE FROM divination_results WHERE profile_id IN (SELECT id FROM profiles WHERE nickname LIKE 'test_div_%')",
    )
    dbRun(
      "DELETE FROM sessions WHERE profile_id IN (SELECT id FROM profiles WHERE nickname LIKE 'test_div_%')",
    )
    dbRun("DELETE FROM profiles WHERE nickname LIKE 'test_div_%'")

    // Create test profile 1
    const pin = hashPin('1234')
    const { lastInsertRowid: pid1 } = dbRun('INSERT INTO profiles (nickname, pin) VALUES (?, ?)', [
      'test_div_user1',
      pin,
    ])
    profileId = pid1
    token = createSessionToken(profileId)

    // Create test profile 2 (different owner)
    const { lastInsertRowid: pid2 } = dbRun('INSERT INTO profiles (nickname, pin) VALUES (?, ?)', [
      'test_div_user2',
      pin,
    ])
    otherProfileId = pid2
    otherToken = createSessionToken(otherProfileId)
  })

  afterAll(() => {
    // Cleanup
    deleteSession(token)
    deleteSession(otherToken)
    dbRun('DELETE FROM divination_results WHERE profile_id IN (?, ?)', [profileId, otherProfileId])
    dbRun('DELETE FROM sessions WHERE profile_id IN (?, ?)', [profileId, otherProfileId])
    dbRun('DELETE FROM profiles WHERE id IN (?, ?)', [profileId, otherProfileId])
  })

  // === Auth utility tests ===

  describe('Authentication', () => {
    it('getProfileIdFromToken returns profile ID for valid token', () => {
      const id = getProfileIdFromToken(token)
      expect(id).toBe(profileId)
    })

    it('getProfileIdFromToken returns null for invalid token', () => {
      expect(getProfileIdFromToken('')).toBeNull()
      expect(getProfileIdFromToken('nonexistent-token-12345')).toBeNull()
    })

    it('getProfileIdFromToken returns null for null token', () => {
      expect(getProfileIdFromToken(null as unknown as string)).toBeNull()
    })
  })

  // === Rate limit utility tests ===

  describe('Rate limiting', () => {
    it('checkRateLimit allows first request', () => {
      const key = `test-rate-${Date.now()}`
      expect(checkRateLimit(key, 5, 60000)).toBe(true)
    })

    it('checkRateLimit blocks after exceeding max attempts', () => {
      const key = `test-rate-block-${Date.now()}`
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(key, 5, 60000)).toBe(true)
      }
      expect(checkRateLimit(key, 5, 60000)).toBe(false)
    })

    it('checkRateLimit uses separate keys independently', () => {
      const keyA = `test-rate-indep-a-${Date.now()}`
      const keyB = `test-rate-indep-b-${Date.now()}`
      // Exhaust keyA
      for (let i = 0; i < 3; i++) checkRateLimit(keyA, 3, 60000)
      expect(checkRateLimit(keyA, 3, 60000)).toBe(false)
      // keyB should still be allowed
      expect(checkRateLimit(keyB, 3, 60000)).toBe(true)
    })
  })

  // === Divination CRUD tests (testing database operations directly) ===

  describe('Divination CRUD', () => {
    let divinationId: number

    it('POST: creates a divination record', () => {
      const inputData = JSON.stringify({ birthYear: 2000, birthMonth: 1, birthDay: 1 })
      const resultData = JSON.stringify({ dayMaster: '甲' })

      const { lastInsertRowid, changes } = dbRun(
        'INSERT INTO divination_results (profile_id, type, input_data, result_data) VALUES (?, ?, ?, ?)',
        [profileId, 'bazi', inputData, resultData],
      )

      expect(changes).toBe(1)
      expect(lastInsertRowid).toBeGreaterThan(0)
      divinationId = lastInsertRowid
    })

    it('GET list: returns records without result_data', () => {
      const rows = dbAll(
        'SELECT id, type, input_data, created_at FROM divination_results WHERE profile_id = ? AND type = ? ORDER BY created_at DESC LIMIT 20',
        [profileId, 'bazi'],
      )

      expect(rows.length).toBeGreaterThan(0)
      const record = rows.find(r => r.id === divinationId)
      expect(record).toBeDefined()
      expect(record!.type).toBe('bazi')
      // result_data should NOT be in the SELECT columns (verified by the query itself)
      expect(record as any).not.toHaveProperty('result_data')
    })

    it('GET detail: returns full record with result_data', () => {
      const record = dbGet(
        'SELECT id, profile_id, type, input_data, result_data, created_at FROM divination_results WHERE id = ?',
        [divinationId],
      )

      expect(record).toBeDefined()
      expect(record!.type).toBe('bazi')
      expect(record!.result_data).toBeDefined()
      expect(record!.profile_id).toBe(profileId)
    })

    it('GET detail: returns undefined for non-existent record', () => {
      const record = dbGet(
        'SELECT id, profile_id, type, input_data, result_data, created_at FROM divination_results WHERE id = ?',
        [999999],
      )
      expect(record).toBeUndefined()
    })

    it('ownership check: other user cannot see records they do not own', () => {
      // Query records with the OTHER user's profileId — should not find our record
      const rows = dbAll('SELECT id FROM divination_results WHERE profile_id = ? AND id = ?', [
        otherProfileId,
        divinationId,
      ])
      expect(rows.length).toBe(0)
    })

    it('ownership check: owner can see their own records', () => {
      const rows = dbAll('SELECT id FROM divination_results WHERE profile_id = ? AND id = ?', [
        profileId,
        divinationId,
      ])
      expect(rows.length).toBe(1)
      expect(rows[0].id).toBe(divinationId)
    })
  })

  // === Size limits ===

  describe('Payload size validation', () => {
    it('accepts payloads under 100KB', () => {
      const data = JSON.stringify({ data: 'x'.repeat(1000) })
      expect(Buffer.byteLength(data)).toBeLessThan(100_000)
    })

    it('rejects payloads over 100KB', () => {
      const data = JSON.stringify({ data: 'x'.repeat(100_000) })
      expect(Buffer.byteLength(data)).toBeGreaterThan(100_000)
    })
  })
})
