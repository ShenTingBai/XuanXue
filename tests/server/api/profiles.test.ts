/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'

const mockDbGet = vi.hoisted(() => vi.fn())
const mockDbRun = vi.hoisted(() => vi.fn(() => ({ lastInsertRowid: 1, changes: 1 })))
const mockDbAll = vi.hoisted(() => vi.fn(() => []))
const mockReadBody = vi.hoisted(() => vi.fn())
const mockGetRouterParam = vi.hoisted(() => vi.fn())
const mockCreateErrorFn = vi.hoisted(() =>
  vi.fn((args: any) => {
    throw Object.assign(new Error(args.statusMessage), { statusCode: args.statusCode })
  }),
)

vi.hoisted(() => {
  vi.stubGlobal(
    'defineEventHandler',
    vi.fn((handler: any) => handler),
  )
  vi.stubGlobal('readBody', mockReadBody)
  vi.stubGlobal('getRouterParam', mockGetRouterParam)
  vi.stubGlobal('createError', mockCreateErrorFn)
})

vi.mock('~/server/database/db', () => ({
  dbGet: mockDbGet,
  dbRun: mockDbRun,
  dbAll: mockDbAll,
}))

// ============================================================================
// 旧档案接口 R2 封存测试：所有路由必须在任何数据库、限流或请求正文操作前返回 410
// ============================================================================

describe('旧 /api/profiles 接口封存（410）', () => {
  const routes = [
    { name: 'GET /api/profiles', path: '~/server/api/profiles/index.get' },
    { name: 'POST /api/profiles', path: '~/server/api/profiles/index.post' },
    { name: 'GET /api/profiles/[id]', path: '~/server/api/profiles/[id].get' },
    { name: 'PUT /api/profiles/[id]', path: '~/server/api/profiles/[id].put' },
    { name: 'DELETE /api/profiles/[id]', path: '~/server/api/profiles/[id].delete' },
  ]

  for (const route of routes) {
    it(`${route.name} 统一返回 410 且不调用任何数据库/正文/参数读取`, async () => {
      vi.clearAllMocks()
      const handler = (await import(route.path)).default
      await expect(handler({} as any)).rejects.toMatchObject({ statusCode: 410 })

      expect(mockDbGet).not.toHaveBeenCalled()
      expect(mockDbRun).not.toHaveBeenCalled()
      expect(mockDbAll).not.toHaveBeenCalled()
      expect(mockReadBody).not.toHaveBeenCalled()
      expect(mockGetRouterParam).not.toHaveBeenCalled()
    })
  }

  it('410 文案不泄漏旧档案是否存在', async () => {
    for (const route of routes) {
      vi.clearAllMocks()
      const handler = (await import(route.path)).default
      try {
        await handler({} as any)
        // 不应成功
        expect('should not reach').toBe('threw')
      } catch (e: any) {
        expect(e.statusCode).toBe(410)
        expect(String(e.message)).not.toMatch(/档案不存在|未登录|无权/)
      }
    }
  })
})
