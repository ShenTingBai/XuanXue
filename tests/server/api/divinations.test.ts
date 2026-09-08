/* eslint-disable @typescript-eslint/no-explicit-any */
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

vi.mock('~/server/utils/rateLimit', () => ({
  checkRateLimit: vi.fn(() => true),
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

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { dbGet, dbRun, dbAll } from '~/server/database/db'
import { checkRateLimit } from '~/server/utils/rateLimit'
import { TOOL_CATALOG, canCreateHistory, canReadHistory } from '~/constants/tool-catalog'

// ============================================================================
// Divinations API tests (R1 围栏期)
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

    it('当前围栏期所有合法已登录类型都返回 403 且不执行 dbRun', async () => {
      const nonCreateableTypes = TOOL_CATALOG.filter(tool => !canCreateHistory(tool.id))
      expect(nonCreateableTypes).toHaveLength(11)

      for (const tool of nonCreateableTypes) {
        mockReadBody.mockResolvedValue({
          type: tool.id,
          input_data: { test: true },
          result_data: { result: tool.id },
        })
        await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
          statusCode: 403,
        })
      }

      expect(dbRun).not.toHaveBeenCalled()
    })

    it('throws 401 when no auth header', async () => {
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

    it('显式 type 为 disabled 时返回 403 且不查询列表', async () => {
      const disabledType = TOOL_CATALOG.find(tool => !canReadHistory(tool.id))
      expect(disabledType).toBeDefined()
      mockGetQuery.mockReturnValue({ type: disabledType!.id })

      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 403,
      })
      expect(dbAll).not.toHaveBeenCalled()
    })

    it('无 type 且当前没有可读类型时直接返回空数组且不查询数据库', async () => {
      const readableTypes = TOOL_CATALOG.filter(tool => canReadHistory(tool.id))
      expect(readableTypes).toHaveLength(0)

      const result = await handler({ context: { profileId: 1 } } as any)
      expect(result).toEqual([])
      expect(dbAll).not.toHaveBeenCalled()
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

    it('throws 400 for invalid type filter', async () => {
      mockGetQuery.mockReturnValue({ type: 'invalid_type' })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
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

    it('归属通过后 disabled 类型返回 403 且不返回 input/result 正文', async () => {
      const disabledType = TOOL_CATALOG.find(tool => !canReadHistory(tool.id))
      vi.mocked(dbGet).mockReturnValue({
        id: 42,
        profile_id: 1,
        type: disabledType!.id,
        input_data: '{"birthYear":2000}',
        result_data: '{"dayMaster":"甲"}',
        created_at: '2025-01-01T00:00:00.000Z',
      })
      await expect(handler({ context: { profileId: 1 } } as any)).rejects.toMatchObject({
        statusCode: 403,
      })
    })
  })
})
