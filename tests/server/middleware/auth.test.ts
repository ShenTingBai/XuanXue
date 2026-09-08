/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetCookie = vi.hoisted(() => vi.fn())
const mockDeleteCookie = vi.hoisted(() => vi.fn())
const mockResolveSession = vi.hoisted(() => vi.fn())

vi.hoisted(() => {
  vi.stubGlobal(
    'defineEventHandler',
    vi.fn((handler: any) => handler),
  )
})

vi.mock('h3', () => ({
  getCookie: mockGetCookie,
  deleteCookie: mockDeleteCookie,
}))

vi.mock('~/server/utils/auth', () => ({
  resolveSession: mockResolveSession,
}))

let handler: (event: any) => any

describe('认证中间件 auth.ts', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('~/server/middleware/auth')
    handler = mod.default
  })

  it('只从 xuanxue_token Cookie 恢复会话并注入 accountId/sessionId/sessionToken', async () => {
    mockGetCookie.mockReturnValue('cookie-token-abc')
    mockResolveSession.mockReturnValue({ accountId: 7, sessionId: 99 })
    const event: any = { context: {} }
    await handler(event)
    expect(event.context.accountId).toBe(7)
    expect(event.context.sessionId).toBe(99)
    expect(event.context.sessionToken).toBe('cookie-token-abc')
  })

  it('无 Cookie 时不注入上下文', async () => {
    mockGetCookie.mockReturnValue(null)
    mockResolveSession.mockReturnValue(null)
    const event: any = { context: {} }
    await handler(event)
    expect(event.context.accountId).toBeUndefined()
    expect(event.context.sessionId).toBeUndefined()
    expect(event.context.sessionToken).toBeUndefined()
  })

  it('无效或过期 Cookie 清除响应 Cookie', async () => {
    mockGetCookie.mockReturnValue('stale-token')
    mockResolveSession.mockReturnValue(null)
    const event: any = { context: {} }
    await handler(event)
    expect(mockDeleteCookie).toHaveBeenCalledWith(event, 'xuanxue_token', { path: '/' })
    expect(event.context.accountId).toBeUndefined()
  })
})
