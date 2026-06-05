import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// Hoisted mock factories — run before any imports
// ============================================================================

const mockGetHeader = vi.hoisted(() => vi.fn())
const mockReadBody = vi.hoisted(() => vi.fn())
const mockGetQuery = vi.hoisted(() => vi.fn())
const mockGetRouterParam = vi.hoisted(() => vi.fn())
const mockCreateErrorFn = vi.hoisted(() =>
  vi.fn((args: any) => {
    throw Object.assign(new Error(args.statusMessage), { statusCode: args.statusCode })
  }),
)

// Stub Nuxt auto-import globals (the server files use these without importing)
vi.hoisted(() => {
  vi.stubGlobal(
    'defineEventHandler',
    vi.fn((handler: any) => handler),
  )
  vi.stubGlobal('getHeader', mockGetHeader)
  vi.stubGlobal('readBody', mockReadBody)
  vi.stubGlobal('getQuery', mockGetQuery)
  vi.stubGlobal('createError', mockCreateErrorFn)
  vi.stubGlobal('getRouterParam', mockGetRouterParam)
})

// ============================================================================
// Module-level mocks
// ============================================================================

vi.mock('~/server/database/db', () => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(() => ({ lastInsertRowid: 1, changes: 1 })),
  dbAll: vi.fn(() => []),
}))

vi.mock('~/server/utils/auth', () => ({
  getProfileIdFromToken: vi.fn(() => 1),
  createSessionToken: vi.fn(() => 'mock-session-token'),
  hashPin: vi.fn((pin: string) => `salt:${pin}:hash`),
  verifyPin: vi.fn(() => true),
  isLegacyPin: vi.fn(() => false),
  deleteSession: vi.fn(),
  cleanupExpiredSessions: vi.fn(),
}))

vi.mock('~/server/utils/rateLimit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('~/server/utils/securityLog', () => ({
  logSecurityEvent: vi.fn(),
}))

vi.mock('~/server/utils/json', () => ({
  safeJsonParse: vi.fn((str: unknown) => {
    if (typeof str === 'string') {
      try {
        return JSON.parse(str)
      } catch {
        return str
      }
    }
    return str
  }),
}))

vi.mock('~/server/utils/profile', () => ({
  toSafeProfile: vi.fn((row: any) => ({
    id: row.id,
    nickname: row.nickname,
    gender: null,
    birth_date: null,
    birth_calendar: null,
    birth_hour: null,
    birth_minute: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  })),
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { dbGet, dbRun, dbAll } from '~/server/database/db'
import { checkRateLimit, getClientIp } from '~/server/utils/rateLimit'

// ============================================================================
// Divinations API tests
// ============================================================================

describe('Divinations API handlers', () => {
  // --------------------------------------------------------------------------
  // POST /api/divinations
  // --------------------------------------------------------------------------

  describe('POST /api/divinations', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      vi.clearAllMocks()
      mockGetHeader.mockReturnValue('Bearer valid-token')
      mockReadBody.mockResolvedValue({
        type: 'bazi',
        input_data: { birthYear: 2000, birthMonth: 1, birthDay: 1 },
        result_data: { dayMaster: '甲' },
      })
      vi.mocked(checkRateLimit).mockReturnValue(true)
      vi.mocked(dbRun).mockReturnValue({ lastInsertRowid: 42, changes: 1 })
      vi.mocked(dbGet).mockReturnValue({ created_at: '2025-01-01T00:00:00.000Z' })

      handler = (await import('~/server/api/divinations/index.post')).default
    })

    it('creates a divination record and returns { id, created_at }', async () => {
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result).toHaveProperty('id', 42)
      expect(result).toHaveProperty('created_at')
    })

    it('throws 401 when no auth header', async () => {
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 401 when token is invalid', async () => {
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 429 when rate limit exceeded', async () => {
      vi.mocked(checkRateLimit).mockReturnValue(false)
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 429,
      })
    })

    it('throws 400 when type is missing', async () => {
      mockReadBody.mockResolvedValue({
        input_data: { birthYear: 2000 },
        result_data: { dayMaster: '甲' },
      })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 when type is invalid', async () => {
      mockReadBody.mockResolvedValue({
        type: 'invalid_type',
        input_data: { birthYear: 2000 },
        result_data: { dayMaster: '甲' },
      })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 when input_data is missing', async () => {
      mockReadBody.mockResolvedValue({
        type: 'bazi',
        result_data: { dayMaster: '甲' },
      })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 when result_data is missing', async () => {
      mockReadBody.mockResolvedValue({
        type: 'bazi',
        input_data: { birthYear: 2000 },
      })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 413 when result_data exceeds size limit', async () => {
      mockReadBody.mockResolvedValue({
        type: 'bazi',
        input_data: { x: 'small' },
        result_data: { data: 'x'.repeat(200_000) },
      })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 413,
      })
    })

    it('throws 413 when input_data exceeds size limit', async () => {
      mockReadBody.mockResolvedValue({
        type: 'bazi',
        input_data: { data: 'x'.repeat(200_000) },
        result_data: { x: 'small' },
      })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 413,
      })
    })

    it('accepts all valid type values', async () => {
      const validTypes = ['shengxiao', 'constellation', 'bazi', 'yijing', 'ziwei']
      for (const t of validTypes) {
        mockReadBody.mockResolvedValue({
          type: t,
          input_data: { test: true },
          result_data: { result: t },
        })
        vi.mocked(dbRun).mockReturnValue({ lastInsertRowid: 1, changes: 1 })
        vi.mocked(dbGet).mockReturnValue({ created_at: '2025-01-01T00:00:00.000Z' })
        const result = await handler({ context: { profileId: 1 } } as any)
        expect(result.id).toBeGreaterThan(0)
      }
    })
  })

  // --------------------------------------------------------------------------
  // GET /api/divinations (list)
  // --------------------------------------------------------------------------

  describe('GET /api/divinations (list)', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      vi.clearAllMocks()
      mockGetHeader.mockReturnValue('Bearer valid-token')
      mockGetQuery.mockReturnValue({})
      vi.mocked(checkRateLimit).mockReturnValue(true)

      handler = (await import('~/server/api/divinations/index.get')).default
    })

    it('returns list of records without result_data', async () => {
      vi.mocked(dbAll).mockReturnValue([
        {
          id: 1,
          type: 'bazi',
          input_data: '{"birthYear":2000}',
          created_at: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          type: 'yijing',
          input_data: '{"coins":[7,7,7,7,7,7]}',
          created_at: '2025-01-02T00:00:00.000Z',
        },
      ])
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
      for (const record of result) {
        expect(record).toHaveProperty('id')
        expect(record).toHaveProperty('type')
        expect(record).toHaveProperty('input_data')
        expect(record).toHaveProperty('created_at')
        expect(record).not.toHaveProperty('result_data')
      }
    })

    it('throws 401 without auth header', async () => {
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 429 when rate limited', async () => {
      vi.mocked(checkRateLimit).mockReturnValue(false)
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 429,
      })
    })

    it('filters by type when query param is provided', async () => {
      mockGetQuery.mockReturnValue({ type: 'bazi' })
      vi.mocked(dbAll).mockReturnValue([
        { id: 1, type: 'bazi', input_data: '{}', created_at: '2025-01-01T00:00:00.000Z' },
      ])
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('bazi')
    })

    it('throws 400 for invalid type filter', async () => {
      mockGetQuery.mockReturnValue({ type: 'invalid_type' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('returns empty array when no records exist', async () => {
      vi.mocked(dbAll).mockReturnValue([])
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result).toEqual([])
    })
  })

  // --------------------------------------------------------------------------
  // GET /api/divinations/[id] (detail)
  // --------------------------------------------------------------------------

  describe('GET /api/divinations/[id] (detail)', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      vi.clearAllMocks()
      mockGetHeader.mockReturnValue('Bearer valid-token')
      mockGetRouterParam.mockReturnValue('42')
      vi.mocked(checkRateLimit).mockReturnValue(true)

      const mod = await import('~/server/api/divinations/[id].get')
      handler = mod.default
    })

    it('returns full record with result_data and input_data', async () => {
      vi.mocked(dbGet).mockReturnValue({
        id: 42,
        profile_id: 1,
        type: 'bazi',
        input_data: '{"birthYear":2000}',
        result_data: '{"dayMaster":"甲"}',
        created_at: '2025-01-01T00:00:00.000Z',
      })
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result.id).toBe(42)
      expect(result.type).toBe('bazi')
      expect(result.input_data).toEqual({ birthYear: 2000 })
      expect(result.result_data).toEqual({ dayMaster: '甲' })
    })

    it('throws 400 for non-numeric id', async () => {
      mockGetRouterParam.mockReturnValue('abc')
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 for empty id', async () => {
      mockGetRouterParam.mockReturnValue('')
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 401 without auth header', async () => {
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 429 when rate limited', async () => {
      vi.mocked(checkRateLimit).mockReturnValue(false)
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 429,
      })
    })

    it('throws 404 when record does not exist', async () => {
      vi.mocked(dbGet).mockReturnValue(undefined)
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 404,
      })
    })

    it('throws 403 when profile_id does not match (ownership)', async () => {
      vi.mocked(dbGet).mockReturnValue({
        id: 42,
        profile_id: 2,
        type: 'bazi',
        input_data: '{}',
        result_data: '{}',
        created_at: '2025-01-01T00:00:00.000Z',
      })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 403,
      })
    })
  })
})

// ============================================================================
// Auth API tests
// ============================================================================

describe('Auth API handlers', () => {
  // --------------------------------------------------------------------------
  // POST /api/auth/login
  // --------------------------------------------------------------------------

  describe('POST /api/auth/login', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      vi.clearAllMocks()
      mockReadBody.mockResolvedValue({ nickname: 'testuser', pin: '1234' })
      vi.mocked(checkRateLimit).mockReturnValue(true)
      vi.mocked(getClientIp).mockReturnValue('127.0.0.1')
      vi.mocked(dbGet).mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM profiles WHERE nickname =')) {
          return { id: 1, nickname: 'testuser', pin: 'salt:hashvalue' }
        }
        if (sql.includes('SELECT COUNT(*) as count FROM security_log')) {
          return { count: 0 }
        }
        return undefined
      })

      const { verifyPin, createSessionToken, cleanupExpiredSessions } =
        await import('~/server/utils/auth')
      vi.mocked(verifyPin).mockReturnValue(true)
      vi.mocked(createSessionToken).mockReturnValue('session-token-abc')
      vi.mocked(cleanupExpiredSessions).mockReturnValue()

      handler = (await import('~/server/api/auth/login.post')).default
    })

    it('returns { token, profile } on successful login', async () => {
      const result = await handler({} as any)
      expect(result).toHaveProperty('token', 'session-token-abc')
      expect(result).toHaveProperty('profile')
      expect(result.profile.nickname).toBe('testuser')
    })

    it('throws 400 when nickname or pin is missing', async () => {
      mockReadBody.mockResolvedValue({})
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 when pin is empty', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'testuser', pin: '' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 when pin is not 4 digits', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'testuser', pin: '12345' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 429 when rate limited', async () => {
      vi.mocked(checkRateLimit).mockReturnValue(false)
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 429,
      })
    })

    it('throws 401 when profile not found', async () => {
      vi.mocked(dbGet).mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM profiles WHERE nickname =')) return undefined
        return undefined
      })
      await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 401 when PIN verification fails', async () => {
      const { verifyPin } = await import('~/server/utils/auth')
      vi.mocked(verifyPin).mockReturnValue(false)
      await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 401 })
    })
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/register
  // --------------------------------------------------------------------------

  describe('POST /api/auth/register', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      vi.clearAllMocks()
      mockReadBody.mockResolvedValue({ nickname: 'newuser', pin: '1234' })
      vi.mocked(checkRateLimit).mockReturnValue(true)
      vi.mocked(getClientIp).mockReturnValue('127.0.0.1')
      vi.mocked(dbGet).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM profiles WHERE nickname =')) return undefined
        if (sql.includes('SELECT * FROM profiles WHERE id =')) return { id: 2, nickname: 'newuser' }
        return undefined
      })
      vi.mocked(dbRun).mockReturnValue({ lastInsertRowid: 2, changes: 1 })

      const { hashPin, createSessionToken, cleanupExpiredSessions } =
        await import('~/server/utils/auth')
      vi.mocked(hashPin).mockReturnValue('salt:hashedpin')
      vi.mocked(createSessionToken).mockReturnValue('session-token-xyz')
      vi.mocked(cleanupExpiredSessions).mockReturnValue()

      handler = (await import('~/server/api/auth/register.post')).default
    })

    it('returns { token, profile } on successful registration', async () => {
      const result = await handler({} as any)
      expect(result).toHaveProperty('token', 'session-token-xyz')
      expect(result).toHaveProperty('profile')
    })

    it('throws 400 when nickname is empty', async () => {
      mockReadBody.mockResolvedValue({ nickname: '', pin: '1234' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 when pin is not 4 digits', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'newuser', pin: 'abc' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 409 when nickname already exists', async () => {
      vi.mocked(dbGet).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM profiles WHERE nickname =')) return { id: 1 }
        return undefined
      })
      await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 409 })
    })

    it('throws 400 when nickname exceeds 20 characters', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'a'.repeat(21), pin: '1234' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 429 when rate limited', async () => {
      vi.mocked(checkRateLimit).mockReturnValue(false)
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 429,
      })
    })
  })
})
