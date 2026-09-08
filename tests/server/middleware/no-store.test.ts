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
