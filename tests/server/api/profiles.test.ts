import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// Hoisted mock factories
// ============================================================================

const mockGetHeader = vi.hoisted(() =>
  vi.fn((_event: any, name: string) => {
    if (name?.toLowerCase() === 'authorization') return 'Bearer valid-token'
    if (name?.toLowerCase() === 'content-length') return '100'
    return undefined
  }),
)
const mockReadBody = vi.hoisted(() => vi.fn())
const mockGetQuery = vi.hoisted(() => vi.fn())
const mockCreateErrorFn = vi.hoisted(() =>
  vi.fn((args: any) => {
    throw Object.assign(new Error(args.statusMessage), { statusCode: args.statusCode })
  }),
)
const mockEventContext = vi.hoisted(() => ({}) as any)
const mockGetRouterParam = vi.hoisted(() => vi.fn())

// Stub Nuxt auto-import globals
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
  dbRun: vi.fn(() => ({ lastInsertRowid: 2, changes: 1 })),
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
  toSafeProfile: vi.fn((row: any) => {
    const { pin, parent_profile_id, ...safe } = row
    return {
      id: row.id,
      nickname: row.nickname,
      gender: null,
      birth_date: null,
      birth_calendar: null,
      birth_hour: null,
      birth_minute: null,
      birth_place: null,
      birth_longitude: null,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    }
  }),
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { dbGet, dbRun, dbAll } from '~/server/database/db'
import { checkRateLimit } from '~/server/utils/rateLimit'

// ============================================================================
// Profiles API tests
// ============================================================================

describe('Profiles API handlers', () => {
  // --------------------------------------------------------------------------
  // GET /api/profiles (list)
  // --------------------------------------------------------------------------

  describe('GET /api/profiles (list)', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      vi.clearAllMocks()
      mockGetHeader.mockReturnValue('Bearer valid-token')
      vi.mocked(checkRateLimit).mockReturnValue(true)

      handler = (await import('~/server/api/profiles/index.get')).default
    })

    it('returns main profile with subs array', async () => {
      vi.mocked(dbGet).mockReturnValue({
        id: 1,
        nickname: 'testuser',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      })
      vi.mocked(dbAll).mockReturnValue([])

      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result).toHaveProperty('main')
      expect(result).toHaveProperty('subs')
      expect(result.main.isMain).toBe(true)
      expect(Array.isArray(result.subs)).toBe(true)
      expect(result.main.nickname).toBe('testuser')
    })

    it('returns subs as an array of profiles with isMain=false', async () => {
      vi.mocked(dbGet).mockReturnValue({
        id: 1,
        nickname: 'mainuser',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      })
      vi.mocked(dbAll).mockReturnValue([
        {
          id: 2,
          nickname: 'sub1',
          created_at: '2025-01-02T00:00:00.000Z',
          updated_at: '2025-01-02T00:00:00.000Z',
        },
        {
          id: 3,
          nickname: 'sub2',
          created_at: '2025-01-03T00:00:00.000Z',
          updated_at: '2025-01-03T00:00:00.000Z',
        },
      ])

      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result.subs).toHaveLength(2)
      for (const sub of result.subs) {
        expect(sub.isMain).toBe(false)
        expect(sub).not.toHaveProperty('pin')
      }
    })

    it('throws 401 without auth header', async () => {
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 404 when main profile not found', async () => {
      vi.mocked(dbGet).mockReturnValue(undefined)
      await expect(handler({ context: { profileId: 999 } } as any)).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  // --------------------------------------------------------------------------
  // POST /api/profiles (create sub-profile)
  // --------------------------------------------------------------------------

  describe('POST /api/profiles (create sub-profile)', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      vi.clearAllMocks()
      mockGetHeader.mockReturnValue('Bearer valid-token')
      mockReadBody.mockResolvedValue({ nickname: 'newsub' })
      vi.mocked(checkRateLimit).mockReturnValue(true)
      vi.mocked(dbGet).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM profiles WHERE nickname =')) return undefined
        if (sql.includes('SELECT * FROM profiles WHERE id ='))
          return {
            id: 2,
            nickname: 'newsub',
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          }
        return undefined
      })

      handler = (await import('~/server/api/profiles/index.post')).default
    })

    it('creates a sub-profile and returns it', async () => {
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result).toHaveProperty('id', 2)
      expect(result).toHaveProperty('nickname', 'newsub')
      expect(result).not.toHaveProperty('pin')
    })

    it('throws 401 without auth header', async () => {
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 429 when rate limit exceeded', async () => {
      vi.mocked(checkRateLimit).mockReturnValue(false)
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 429,
      })
    })

    it('throws 400 when nickname is missing', async () => {
      mockReadBody.mockResolvedValue({})
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 when nickname is too short', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'a' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 when nickname is too long', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'a'.repeat(21) })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 409 when nickname already exists', async () => {
      vi.mocked(dbGet).mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM profiles WHERE nickname =')) return { id: 1 }
        return undefined
      })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 409,
      })
    })

    it('throws 400 for invalid birth_date format', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'validname', birth_date: 'not-a-date' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 for invalid birth_calendar value', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'validname', birth_calendar: 'invalid' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 for out-of-range birth_hour', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'validname', birth_hour: 25 })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 for invalid gender value', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'validname', gender: 'other' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('accepts valid optional fields', async () => {
      mockReadBody.mockResolvedValue({
        nickname: 'validname',
        birth_date: '2000-01-15',
        birth_calendar: 'lunar',
        birth_hour: 14,
        birth_minute: 30,
        gender: '男',
        birth_place: 'Beijing',
        birth_longitude: 116.4,
      })
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result).toHaveProperty('id')
    })
  })

  // --------------------------------------------------------------------------
  // GET /api/profiles/[id] (detail)
  // --------------------------------------------------------------------------

  describe('GET /api/profiles/[id] (detail)', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      vi.clearAllMocks()
      mockGetHeader.mockReturnValue('Bearer valid-token')

      handler = (await import('~/server/api/profiles/[id].get')).default
    })

    it('returns the profile when auth matches id', async () => {
      vi.mocked(dbGet).mockReturnValue({
        id: 1,
        nickname: 'testuser',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      })
      const result = await handler({ context: { params: { id: '1' }, profileId: 1 } } as any)
      expect(result).toHaveProperty('id', 1)
      expect(result).not.toHaveProperty('pin')
    })

    it('throws 400 for non-numeric id', async () => {
      await expect(
        handler({ context: { params: { id: 'abc' }, profileId: 1 } } as any),
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('throws 401 without auth header', async () => {
      await expect(handler({ context: { params: { id: '1' } } } as any)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('throws 403 when profileId does not match requested id', async () => {
      await expect(
        handler({ context: { params: { id: '2' }, profileId: 1 } } as any),
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('throws 404 when profile does not exist', async () => {
      vi.mocked(dbGet).mockReturnValue(undefined)
      await expect(
        handler({ context: { params: { id: '1' }, profileId: 1 } } as any),
      ).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  // --------------------------------------------------------------------------
  // PUT /api/profiles/[id] (update)
  // --------------------------------------------------------------------------

  describe('PUT /api/profiles/[id] (update)', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      vi.clearAllMocks()
      mockGetHeader.mockReturnValue('Bearer valid-token')
      mockReadBody.mockResolvedValue({ gender: '女' })
      mockGetRouterParam.mockReturnValue('1')
      vi.mocked(checkRateLimit).mockReturnValue(true)
      vi.mocked(dbGet).mockImplementation((sql: string) => {
        if (sql.includes('SELECT parent_profile_id FROM profiles')) {
          return { parent_profile_id: 1 }
        }
        if (sql.includes('SELECT * FROM profiles')) {
          return {
            id: 1,
            nickname: 'updated',
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
          }
        }
        return undefined
      })

      handler = (await import('~/server/api/profiles/[id].put')).default
    })

    it('updates a profile field and returns the updated profile', async () => {
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result).toHaveProperty('id', 1)
    })

    it('throws 401 without auth header', async () => {
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 403 when profileId is neither owner nor parent', async () => {
      mockGetRouterParam.mockReturnValue('3')
      vi.mocked(dbGet).mockImplementation((sql: string) => {
        if (sql.includes('SELECT parent_profile_id FROM profiles')) {
          return { parent_profile_id: 2 }
        }
        if (sql.includes('SELECT * FROM profiles')) {
          return { id: 3, nickname: 'other' }
        }
        return undefined
      })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('throws 429 when rate limited', async () => {
      vi.mocked(checkRateLimit).mockReturnValue(false)
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 429,
      })
    })

    it('throws 400 for invalid birth_date format', async () => {
      mockReadBody.mockResolvedValue({ birth_date: 'bad-date' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 for invalid birth_calendar', async () => {
      mockReadBody.mockResolvedValue({ birth_calendar: 'invalid' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 for out-of-range birth_hour', async () => {
      mockReadBody.mockResolvedValue({ birth_hour: 30 })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 for invalid birth_minute', async () => {
      mockReadBody.mockResolvedValue({ birth_minute: 70 })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 for invalid gender', async () => {
      mockReadBody.mockResolvedValue({ gender: 'X' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 for birth_place exceeding 50 chars', async () => {
      mockReadBody.mockResolvedValue({ birth_place: 'x'.repeat(51) })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 for birth_longitude out of range', async () => {
      mockReadBody.mockResolvedValue({ birth_longitude: 200 })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 400 when no update fields provided', async () => {
      mockReadBody.mockResolvedValue({})
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 404 when target profile does not exist', async () => {
      vi.mocked(dbGet).mockImplementation((sql: string) => {
        if (sql.includes('SELECT parent_profile_id FROM profiles')) return undefined
        return undefined
      })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 404,
      })
    })

    it('accepts partial updates with valid data', async () => {
      mockReadBody.mockResolvedValue({
        birth_date: '2000-06-15',
        gender: '女',
        birth_hour: null,
      })
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result).toHaveProperty('id', 1)
    })

    it('allows setting birth_hour/birth_minute to null', async () => {
      mockReadBody.mockResolvedValue({ birth_hour: null, birth_minute: null })
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result).toHaveProperty('id', 1)
    })

    it('throws 400 for empty id from getRouterParam', async () => {
      mockGetRouterParam.mockReturnValue('')
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })

  // --------------------------------------------------------------------------
  // DELETE /api/profiles/[id]
  // --------------------------------------------------------------------------

  describe('DELETE /api/profiles/[id]', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      vi.clearAllMocks()
      mockGetHeader.mockReturnValue('Bearer valid-token')
      mockGetRouterParam.mockReturnValue('2')
      vi.mocked(checkRateLimit).mockReturnValue(true)
      vi.mocked(dbGet).mockReturnValue({ id: 2, parent_profile_id: 1 })

      handler = (await import('~/server/api/profiles/[id].delete')).default
    })

    it('returns 204 on successful deletion (as parent deleting sub-profile)', async () => {
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result.status).toBe(204)
    })

    it('returns 204 when user deletes own profile', async () => {
      mockGetRouterParam.mockReturnValue('1')
      vi.mocked(dbGet).mockReturnValue({ id: 1, parent_profile_id: null })
      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result.status).toBe(204)
    })

    it('throws 401 without auth header', async () => {
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('throws 400 for empty id from getRouterParam', async () => {
      mockGetRouterParam.mockReturnValue('')
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('throws 404 when target profile does not exist', async () => {
      vi.mocked(dbGet).mockReturnValue(undefined)
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 404,
      })
    })

    it('throws 403 when user is neither owner nor parent', async () => {
      mockGetRouterParam.mockReturnValue('3')
      vi.mocked(dbGet).mockReturnValue({ id: 3, parent_profile_id: 2 })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 403,
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
