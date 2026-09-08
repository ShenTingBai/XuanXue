/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetHeader = vi.hoisted(() => vi.fn())
const mockGetRequestURL = vi.hoisted(() => vi.fn())
const mockCreateErrorFn = vi.hoisted(() =>
  vi.fn((args: any) => {
    throw Object.assign(new Error(args.statusMessage), { statusCode: args.statusCode })
  }),
)

vi.mock('h3', () => ({
  getHeader: mockGetHeader,
  getRequestURL: mockGetRequestURL,
}))

vi.hoisted(() => {
  vi.stubGlobal('createError', mockCreateErrorFn)
})

import { assertSameOriginMutation } from '../../../server/utils/request-origin'

function makeEvent(method: string, origin?: string, secFetchSite?: string) {
  mockGetHeader.mockImplementation((_e: any, name: string) => {
    if (name?.toLowerCase() === 'origin') return origin
    if (name?.toLowerCase() === 'sec-fetch-site') return secFetchSite
    return undefined
  })
  mockGetRequestURL.mockReturnValue({ origin: 'http://localhost:3000' })
  return { method } as any
}

describe('同源校验 assertSameOriginMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET 请求不校验（只校验写请求）', () => {
    expect(() => assertSameOriginMutation(makeEvent('GET', undefined))).not.toThrow()
  })

  it('同源 POST 通过', () => {
    expect(() => assertSameOriginMutation(makeEvent('POST', 'http://localhost:3000'))).not.toThrow()
  })

  it('跨源 POST 拒绝 403', () => {
    try {
      assertSameOriginMutation(makeEvent('POST', 'http://evil.example'))
      expect('should not reach').toBe('threw')
    } catch (e: any) {
      expect(e.statusCode).toBe(403)
    }
  })

  it('缺失 Origin 的写请求拒绝 403', () => {
    try {
      assertSameOriginMutation(makeEvent('POST', undefined))
      expect('should not reach').toBe('threw')
    } catch (e: any) {
      expect(e.statusCode).toBe(403)
    }
  })

  it('格式非法 Origin 拒绝 403', () => {
    try {
      assertSameOriginMutation(makeEvent('POST', 'not-a-url'))
      expect('should not reach').toBe('threw')
    } catch (e: any) {
      expect(e.statusCode).toBe(403)
    }
  })

  it('Sec-Fetch-Site=cross-site 拒绝 403', () => {
    try {
      assertSameOriginMutation(makeEvent('POST', 'http://localhost:3000', 'cross-site'))
      expect('should not reach').toBe('threw')
    } catch (e: any) {
      expect(e.statusCode).toBe(403)
    }
  })

  it('同源且 same-origin 的 PUT/DELETE 通过', () => {
    expect(() =>
      assertSameOriginMutation(makeEvent('PUT', 'http://localhost:3000', 'same-origin')),
    ).not.toThrow()
    expect(() =>
      assertSameOriginMutation(makeEvent('DELETE', 'http://localhost:3000', 'same-origin')),
    ).not.toThrow()
  })
})
