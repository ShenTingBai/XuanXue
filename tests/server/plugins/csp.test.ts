import { describe, it, expect, vi, beforeEach } from 'vitest'

// CSP nonce 注入的回归测试。
// 背景：旧实现只读 renderer 的 response.headers，而 CSP 由 nuxt.config.ts 的
// routeRules 直接写到 event 上，导致 nonce 替换被静默跳过——响应头始终是
// 'unsafe-inline'，但 <script nonce="..."> 照常注入，形成「有 nonce 却不生效」。
const NONCE = '00112233445566778899aabbccddeeff'

const mockGetResponseHeader = vi.hoisted(() => vi.fn())
const mockSetResponseHeader = vi.hoisted(() => vi.fn())

vi.mock('h3', async importOriginal => ({
  ...(await importOriginal<typeof import('h3')>()),
  getResponseHeader: mockGetResponseHeader,
  setResponseHeader: mockSetResponseHeader,
}))

vi.mock('node:crypto', async importOriginal => ({
  ...(await importOriginal<typeof import('node:crypto')>()),
  randomBytes: () => Buffer.from('00112233445566778899aabbccddeeff', 'hex'),
}))

vi.hoisted(() => {
  vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
})

import cspPlugin from '~/server/plugins/csp'

interface RenderResponse {
  body?: string
  headers?: Record<string, string | undefined>
}
type Hook = (response: RenderResponse, ctx: { event: unknown }) => void

/** 用假 nitroApp 捕获 render:response 钩子并执行一次。 */
function invoke(response: RenderResponse, event: unknown = {}): RenderResponse {
  let hook: Hook | undefined
  const nitroApp = {
    hooks: {
      hook: (name: string, fn: Hook) => {
        if (name === 'render:response') hook = fn
      },
    },
  }
  ;(cspPlugin as unknown as (app: unknown) => void)(nitroApp)
  expect(hook).toBeDefined()
  hook!(response, { event })
  return response
}

describe('CSP nonce 注入', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('CSP 来自 event（routeRules 写入处）时替换 nonce 并写回响应头', () => {
    mockGetResponseHeader.mockReturnValue(
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    )
    const response: RenderResponse = {
      body: '<html><script>window.__NUXT__=1</script></html>',
      headers: { 'content-type': 'text/html' },
    }
    invoke(response)

    expect(mockGetResponseHeader).toHaveBeenCalledWith(expect.anything(), 'content-security-policy')
    expect(mockSetResponseHeader).toHaveBeenCalledTimes(1)
    const call = mockSetResponseHeader.mock.calls[0] as [unknown, string, string]
    expect(call[1]).toBe('Content-Security-Policy')
    expect(call[2]).toContain(`'nonce-${NONCE}'`)
    // script-src 的 unsafe-inline 必须被移除
    expect(call[2]).not.toContain("script-src 'self' 'unsafe-inline'")
    // style-src 的 unsafe-inline 必须保留（Vue hydration 注入的内联样式无法用 nonce）
    expect(call[2]).toContain("style-src 'self' 'unsafe-inline'")
  })

  it('注入 <script> 的 nonce 与响应头 nonce 完全一致', () => {
    mockGetResponseHeader.mockReturnValue(
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    )
    const response: RenderResponse = {
      body: '<script src="/a.js"></script><script>window.__NUXT__=1</script>',
      headers: {},
    }
    invoke(response)

    const headerValue = (mockSetResponseHeader.mock.calls[0] as [unknown, string, string])[2]
    const headerNonce = /'nonce-([a-f0-9]+)'/.exec(headerValue)?.[1]
    expect(headerNonce).toBe(NONCE)

    const bodyNonces = [...(response.body ?? '').matchAll(/nonce="([a-f0-9]+)"/g)].map(m => m[1])
    expect(bodyNonces).toHaveLength(2)
    expect(bodyNonces.every(n => n === headerNonce)).toBe(true)
  })

  it('已带 nonce 的 <script> 不重复注入', () => {
    mockGetResponseHeader.mockReturnValue("script-src 'self' 'unsafe-inline'")
    const response: RenderResponse = {
      body: '<script nonce="abc">1</script><script>2</script>',
      headers: {},
    }
    invoke(response)

    const body = response.body ?? ''
    expect(body.match(/nonce=/g)).toHaveLength(2)
    expect(body).toContain('<script nonce="abc">')
  })

  it('event 无 CSP 时回退读取 response.headers', () => {
    mockGetResponseHeader.mockReturnValue(undefined)
    const response: RenderResponse = {
      body: '',
      headers: { 'content-security-policy': "script-src 'self' 'unsafe-inline'" },
    }
    invoke(response)

    expect(mockSetResponseHeader).toHaveBeenCalledTimes(1)
    const call = mockSetResponseHeader.mock.calls[0] as [unknown, string, string]
    expect(call[2]).toContain(`'nonce-${NONCE}'`)
  })

  it('两处都取不到 CSP 时不写响应头（不伪造策略）', () => {
    mockGetResponseHeader.mockReturnValue(undefined)
    const response: RenderResponse = { body: '<script>1</script>', headers: {} }
    invoke(response)

    expect(mockSetResponseHeader).not.toHaveBeenCalled()
  })
})
