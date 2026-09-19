import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'

// getClientIp 的安全性回归。
// 背景：旧实现取 X-Forwarded-For 的**最左值**。常见的
// `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for` 会把客户端
// 自带的 XFF 前置到链首，最左值完全由攻击者控制 —— 每请求换一个伪造 IP
// 即可让 IP 限流永不触发。现改为从右向左跳过可信代理。
const mockGetHeader = vi.hoisted(() => vi.fn())

vi.mock('h3', async importOriginal => ({
  ...(await importOriginal<typeof import('h3')>()),
  getHeader: mockGetHeader,
}))

import { getClientIp } from '~/server/utils/rateLimit'

const DEFAULT_TRUSTED = '127.0.0.1,::1,::ffff:127.0.0.1'
let originalTrusted: string | undefined

function makeEvent(remoteAddress: string): H3Event {
  return { node: { req: { socket: { remoteAddress } } } } as unknown as H3Event
}

/** 按请求头名返回给定映射中的值。 */
function headers(map: Record<string, string | undefined>) {
  mockGetHeader.mockImplementation((_event: unknown, name: string) => map[name.toLowerCase()])
}

describe('getClientIp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    originalTrusted = process.env.TRUSTED_PROXY_IPS
    process.env.TRUSTED_PROXY_IPS = DEFAULT_TRUSTED
  })

  afterEach(() => {
    if (originalTrusted === undefined) {
      delete process.env.TRUSTED_PROXY_IPS
    } else {
      process.env.TRUSTED_PROXY_IPS = originalTrusted
    }
  })

  it('来源非可信代理时忽略 X-Forwarded-For，直接返回 socket 地址', () => {
    headers({ 'x-forwarded-for': '1.2.3.4' })
    expect(getClientIp(makeEvent('203.0.113.9'))).toBe('203.0.113.9')
  })

  it('单跳可信代理：返回链上唯一的客户端地址', () => {
    headers({ 'x-forwarded-for': '203.0.113.5' })
    expect(getClientIp(makeEvent('127.0.0.1'))).toBe('203.0.113.5')
  })

  it('客户端伪造前缀不影响结果：取最右侧不可信地址（核心回归）', () => {
    // $proxy_add_x_forwarded_for 会把客户端自带的 XFF 前置到链首
    headers({ 'x-forwarded-for': '9.9.9.9, 203.0.113.5' })
    const first = getClientIp(makeEvent('127.0.0.1'))

    headers({ 'x-forwarded-for': '8.8.8.8, 203.0.113.5' })
    const second = getClientIp(makeEvent('127.0.0.1'))

    expect(first).toBe('203.0.113.5')
    expect(second).toBe('203.0.113.5')
    // 旧实现会分别返回 9.9.9.9 / 8.8.8.8，从而绕过限流
    expect(first).not.toBe('9.9.9.9')
  })

  it('跳过链上被显式声明的可信代理', () => {
    process.env.TRUSTED_PROXY_IPS = `${DEFAULT_TRUSTED},10.0.0.1`
    headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' })
    expect(getClientIp(makeEvent('127.0.0.1'))).toBe('203.0.113.5')
  })

  it('链上全部为可信代理时回退 socket 地址，不返回可伪造的左端值', () => {
    process.env.TRUSTED_PROXY_IPS = `${DEFAULT_TRUSTED},10.0.0.1`
    headers({ 'x-forwarded-for': '10.0.0.1, 10.0.0.1' })
    expect(getClientIp(makeEvent('127.0.0.1'))).toBe('127.0.0.1')
  })

  it('剥离 IPv4 端口后缀后再判定', () => {
    headers({ 'x-forwarded-for': '203.0.113.5:12345' })
    expect(getClientIp(makeEvent('127.0.0.1'))).toBe('203.0.113.5')
  })

  it('无 X-Forwarded-For 时使用 X-Real-IP', () => {
    headers({ 'x-real-ip': '203.0.113.7' })
    expect(getClientIp(makeEvent('127.0.0.1'))).toBe('203.0.113.7')
  })

  it('X-Real-IP 为可信地址时不作为客户端地址', () => {
    // 必须把 10.0.0.1 显式列入可信集，否则它本来就该被当作客户端地址。
    process.env.TRUSTED_PROXY_IPS = `${DEFAULT_TRUSTED},10.0.0.1`
    headers({ 'x-real-ip': '10.0.0.1' })
    expect(getClientIp(makeEvent('127.0.0.1'))).toBe('127.0.0.1')
  })

  it('IPv4 映射 IPv6 的可信代理也能识别', () => {
    headers({ 'x-forwarded-for': '203.0.113.5' })
    expect(getClientIp(makeEvent('::ffff:127.0.0.1'))).toBe('203.0.113.5')
  })
})
