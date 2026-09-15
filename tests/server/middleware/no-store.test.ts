/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetRequestURL = vi.hoisted(() => vi.fn())
const mockSetResponseHeaders = vi.hoisted(() => vi.fn())

vi.hoisted(() => {
  vi.stubGlobal(
    'defineEventHandler',
    vi.fn((handler: any) => handler),
  )
  vi.stubGlobal('getRequestURL', mockGetRequestURL)
  vi.stubGlobal('setResponseHeaders', mockSetResponseHeaders)
})

let handler: (event: any) => void

describe('敏感接口 no-store 中间件', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('~/server/middleware/no-store')
    handler = mod.default
  })

  async function callForPath(path: string) {
    mockGetRequestURL.mockReturnValue({ pathname: path })
    await handler({} as any)
  }

  it('/api/auth 设置 no-store 响应头', async () => {
    await callForPath('/api/auth')
    expect(mockSetResponseHeaders).toHaveBeenCalledWith(
      {},
      {
        'Cache-Control': 'no-store, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    )
  })

  it('/api/auth/login 子路径设置 no-store 响应头', async () => {
    await callForPath('/api/auth/login')
    expect(mockSetResponseHeaders).toHaveBeenCalled()
  })

  it('/api/profiles 与 /api/profiles/1 设置 no-store', async () => {
    await callForPath('/api/profiles')
    expect(mockSetResponseHeaders).toHaveBeenCalled()
    vi.clearAllMocks()
    await callForPath('/api/profiles/1')
    expect(mockSetResponseHeaders).toHaveBeenCalled()
  })

  it('/api/divinations 与 /api/divinations/1 设置 no-store', async () => {
    await callForPath('/api/divinations')
    expect(mockSetResponseHeaders).toHaveBeenCalled()
    vi.clearAllMocks()
    await callForPath('/api/divinations/1')
    expect(mockSetResponseHeaders).toHaveBeenCalled()
  })

  it('/api/self-profile 与子路径（/summary）成功/失败共用 no-store', async () => {
    await callForPath('/api/self-profile')
    expect(mockSetResponseHeaders).toHaveBeenCalled()
    vi.clearAllMocks()
    await callForPath('/api/self-profile/summary')
    expect(mockSetResponseHeaders).toHaveBeenCalled()
    vi.clearAllMocks()
    await callForPath('/api/self-profile/birth-date')
    expect(mockSetResponseHeaders).toHaveBeenCalled()
  })

  it('/api/self-profiled 不误匹配（前缀相似不设置 no-store）', async () => {
    await callForPath('/api/self-profiled')
    expect(mockSetResponseHeaders).not.toHaveBeenCalled()
  })

  it('/api/result-history 与子路径/查询共用 no-store（R5 结果历史）', async () => {
    await callForPath('/api/result-history')
    expect(mockSetResponseHeaders).toHaveBeenCalled()
    vi.clearAllMocks()
    await callForPath('/api/result-history/1f0f2a3c-0000-4000-8000-000000000000')
    expect(mockSetResponseHeaders).toHaveBeenCalled()
    vi.clearAllMocks()
    // query 存在时仍按 pathname 匹配（与既有 /api/divinations 用例同一手法）。
    mockGetRequestURL.mockReturnValue({
      pathname: '/api/result-history',
      search: '?tool=bazi&limit=20',
    })
    await handler({} as any)
    expect(mockSetResponseHeaders).toHaveBeenCalled()
  })

  it('/api/result-history-extra 不误匹配（前缀相似不设置 no-store）', async () => {
    await callForPath('/api/result-history-extra')
    expect(mockSetResponseHeaders).not.toHaveBeenCalled()
  })

  it('/api/other、页面路由不设置 no-store', async () => {
    await callForPath('/api/other')
    expect(mockSetResponseHeaders).not.toHaveBeenCalled()
    vi.clearAllMocks()
    await callForPath('/')
    expect(mockSetResponseHeaders).not.toHaveBeenCalled()
    await callForPath('/tools/bazi')
    expect(mockSetResponseHeaders).not.toHaveBeenCalled()
  })

  it('前缀相似但不匹配的路径不设置 no-store（如 /api/authentic）', async () => {
    await callForPath('/api/authentic')
    expect(mockSetResponseHeaders).not.toHaveBeenCalled()
    await callForPath('/api/authx')
    expect(mockSetResponseHeaders).not.toHaveBeenCalled()
  })

  it('query 存在时仍按 pathname 匹配', async () => {
    mockGetRequestURL.mockReturnValue({
      pathname: '/api/divinations',
      search: '?type=bazi',
    })
    await handler({} as any)
    expect(mockSetResponseHeaders).toHaveBeenCalled()
  })
})
