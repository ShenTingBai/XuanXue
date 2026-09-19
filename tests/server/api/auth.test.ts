/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// Hoisted mock factories — run before any imports
// ============================================================================

const mockGetHeader = vi.hoisted(() => vi.fn())
const mockReadBody = vi.hoisted(() => vi.fn())
const mockReadRawBody = vi.hoisted(() => vi.fn())
const mockGetRequestURL = vi.hoisted(() => vi.fn())
const mockSetCookie = vi.hoisted(() => vi.fn())
const mockDeleteCookie = vi.hoisted(() => vi.fn())
const mockCreateErrorFn = vi.hoisted(() =>
  vi.fn((args: any) => {
    throw Object.assign(new Error(args.statusMessage), { statusCode: args.statusCode })
  }),
)

// 认证端点改走 server/utils/bounded-json-body（显式 import h3），
// 因此除 stubGlobal 外还需替换 h3 模块导出，才能让真实字节上限逻辑受测。
vi.mock('h3', async importOriginal => ({
  ...(await importOriginal<typeof import('h3')>()),
  getHeader: mockGetHeader,
  readRawBody: mockReadRawBody,
}))

// Stub Nuxt auto-import globals
vi.hoisted(() => {
  vi.stubGlobal(
    'defineEventHandler',
    vi.fn((handler: any) => handler),
  )
  vi.stubGlobal('getHeader', mockGetHeader)
  vi.stubGlobal('readBody', mockReadBody)
  vi.stubGlobal('readRawBody', mockReadRawBody)
  vi.stubGlobal('getRequestURL', mockGetRequestURL)
  vi.stubGlobal('setCookie', mockSetCookie)
  vi.stubGlobal('deleteCookie', mockDeleteCookie)
  vi.stubGlobal('createError', mockCreateErrorFn)
})

// ============================================================================
// Module-level mocks
// ============================================================================

const mockDbGet = vi.hoisted(() => vi.fn())
const mockDbRun = vi.hoisted(() => vi.fn(() => ({ lastInsertRowid: 1, changes: 1 })))
const mockDbAll = vi.hoisted(() => vi.fn(() => []))

vi.mock('~/server/database/db', () => ({
  dbGet: mockDbGet,
  dbRun: mockDbRun,
  dbAll: mockDbAll,
  withTransaction: (fn: () => any) => {
    // 测试用模拟事务：直接执行回调，不真正 BEGIN/COMMIT
    return fn()
  },
}))

vi.mock('~/server/utils/auth', () => ({
  hashPassword: vi.fn((p: string) => `salt:${p}:hash`),
  verifyPassword: vi.fn(() => true),
  createSessionToken: vi.fn(() => 'mock-session-token'),
  generateSessionToken: vi.fn(() => ({
    token: 'mock-session-token',
    tokenHash: 'mock-hash',
    expiresAt: '2099-01-01T00:00:00.000Z',
  })),
  setAuthCookie: vi.fn(),
  clearAuthCookie: vi.fn(),
  cleanupExpiredSessions: vi.fn(),
  deleteSessionById: vi.fn(),
  deleteAllSessions: vi.fn(),
}))

vi.mock('~/server/utils/account', () => ({
  toSafeAccount: vi.fn((row: any) => ({
    id: row.id,
    nickname: row.nickname,
    status: 'active',
    ageConfirmedAt: row.age_confirmed_at || '2026-09-08T00:00:00.000Z',
    privacyPolicyVersion: '2026-09-08',
    serviceTermsVersion: '2026-09-08',
    createdAt: row.created_at || '2026-09-08T00:00:00.000Z',
    updatedAt: row.updated_at || '2026-09-08T00:00:00.000Z',
  })),
  normalizeNickname: vi.fn((s: string) => s.normalize('NFC')),
  isValidNickname: vi.fn(() => true),
}))

vi.mock('~/server/utils/rateLimit', () => ({
  checkRateLimit: vi.fn(() => true),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('~/server/utils/securityLog', () => ({
  logSecurityEvent: vi.fn(),
}))

vi.mock('~/server/utils/request-origin', () => ({
  assertSameOriginMutation: vi.fn(),
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { checkRateLimit } from '~/server/utils/rateLimit'
import { setAuthCookie, clearAuthCookie } from '~/server/utils/auth'
import { logSecurityEvent } from '~/server/utils/securityLog'
import { assertSameOriginMutation } from '~/server/utils/request-origin'
// 仅供类型推导：mock 调用参数的类型必须来自真实 dbRun 签名，而非宽松的 vi.fn
import type { dbRun } from '~/server/database/db'

// mock 调用参数类型取自真实签名：logSecurityEvent(eventType, accountId, ip, details?)
type SecurityLogCall = Parameters<typeof logSecurityEvent>
// dbRun(sql, params)：SQL 语句与绑定参数
type DbRunCall = Parameters<typeof dbRun>

// ============================================================================
// R2 Auth API tests
// ============================================================================

function makeEvent(overrides: Record<string, unknown> = {}) {
  return { context: {}, method: 'POST', ...overrides }
}

describe('R2 认证接口', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // readRawBody 委托给既有 readBody 夹具：各用例的 body 写法保持不变，
    // 同时让 bounded-json-body 的真实 UTF-8 字节校验受测。
    mockReadRawBody.mockImplementation(async (event: any) => {
      const body = await mockReadBody(event)
      return body === undefined || body === null ? undefined : JSON.stringify(body)
    })
    // clearAllMocks 会连 mock 实现一并清空，这里显式恢复默认实现，
    // 避免上一个 describe 的用例（如 verifyPassword=false）泄漏到后续用例
    const authMod = await import('~/server/utils/auth')
    vi.mocked(authMod.verifyPassword).mockReturnValue(true)
    vi.mocked(authMod.generateSessionToken).mockReturnValue({
      token: 'mock-session-token',
      tokenHash: 'mock-hash',
      expiresAt: '2099-01-01T00:00:00.000Z',
    })
    mockDbGet.mockImplementation(() => undefined)
    mockDbRun.mockImplementation(() => ({ lastInsertRowid: 1, changes: 1 }))
    mockDbAll.mockImplementation(() => [])
    mockGetRequestURL.mockReturnValue({ origin: 'http://localhost:3000' })
    mockGetHeader.mockImplementation((_e: any, name: string) => {
      if (name?.toLowerCase() === 'content-length') return '100'
      if (name?.toLowerCase() === 'origin') return 'http://localhost:3000'
      return undefined
    })
    vi.mocked(checkRateLimit).mockReturnValue(true)
  })

  // ── 注册 ──
  describe('POST /api/auth/register', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      handler = (await import('~/server/api/auth/register.post')).default
      mockReadBody.mockResolvedValue({
        nickname: 'newuser',
        password: 'password123',
        ageConfirmed: true,
        privacyPolicyVersion: '2026-09-08',
        serviceTermsVersion: '2026-09-08',
      })
      mockDbGet.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM accounts WHERE nickname')) return undefined
        if (sql.includes('SELECT * FROM accounts WHERE id ='))
          return {
            id: 1,
            nickname: 'newuser',
            status: 'active',
            age_confirmed_at: '2026-09-08T00:00:00.000Z',
            privacy_policy_version: '2026-09-08',
            service_terms_version: '2026-09-08',
            created_at: '2026-09-08T00:00:00.000Z',
            updated_at: '2026-09-08T00:00:00.000Z',
          }
        return undefined
      })
      mockDbRun.mockReturnValue({ lastInsertRowid: 1, changes: 1 })
    })

    it('注册成功只返回 account，不返回 token 或 profile', async () => {
      const result = await handler(makeEvent())
      expect(result).toHaveProperty('account')
      expect(result.account.nickname).toBe('newuser')
      expect(result).not.toHaveProperty('token')
      expect(result).not.toHaveProperty('profile')
      expect(setAuthCookie).toHaveBeenCalled()
    })

    it('注册从事务回调返回值取得 accountId/token（不依赖回调外变量）', async () => {
      // mock 的 withTransaction 直接返回回调结果；handler 应从返回值解构并设置 Cookie
      const { generateSessionToken } = await import('~/server/utils/auth')
      vi.mocked(generateSessionToken).mockReturnValue({
        token: 'tx-returned-token',
        tokenHash: 'tx-hash',
        expiresAt: '2099-01-01T00:00:00.000Z',
      })
      await handler(makeEvent())
      expect(setAuthCookie).toHaveBeenCalledWith(expect.anything(), 'tx-returned-token')
    })

    it('注册安全日志不含完整 IP 或无密钥截断摘要', async () => {
      await handler(makeEvent())
      const calls = vi.mocked(logSecurityEvent).mock.calls as SecurityLogCall[]
      const registerLog = calls.find((c: SecurityLogCall) => c[0] === 'register')
      expect(registerLog).toBeDefined()
      // 第三个参数是 clientIp 原始值（getClientIp mock 返回 127.0.0.1），但 securityLog 内部会转成 HMAC 提示。
      // 这里只断言不会把完整 IP 当作 details 写入。
      const details = registerLog![3] as string
      expect(details).not.toContain('127.0.0.1')
    })

    it('注册先执行同源校验', async () => {
      await handler(makeEvent())
      expect(assertSameOriginMutation).toHaveBeenCalled()
    })

    it('密码 8–64 边界', async () => {
      mockReadBody.mockResolvedValue({
        nickname: 'newuser',
        password: '1234567',
        ageConfirmed: true,
        privacyPolicyVersion: '2026-09-08',
        serviceTermsVersion: '2026-09-08',
      })
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })

      mockReadBody.mockResolvedValue({
        nickname: 'newuser',
        password: 'x'.repeat(65),
        ageConfirmed: true,
        privacyPolicyVersion: '2026-09-08',
        serviceTermsVersion: '2026-09-08',
      })
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
    })

    it('ageConfirmed 必须严格为 true', async () => {
      mockReadBody.mockResolvedValue({
        nickname: 'newuser',
        password: 'password123',
        ageConfirmed: 'yes',
        privacyPolicyVersion: '2026-09-08',
        serviceTermsVersion: '2026-09-08',
      })
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
    })

    it('两个规则版本必须等于常量', async () => {
      mockReadBody.mockResolvedValue({
        nickname: 'newuser',
        password: 'password123',
        ageConfirmed: true,
        privacyPolicyVersion: '2020-01-01',
        serviceTermsVersion: '2026-09-08',
      })
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })

      mockReadBody.mockResolvedValue({
        nickname: 'newuser',
        password: 'password123',
        ageConfirmed: true,
        privacyPolicyVersion: '2026-09-08',
        serviceTermsVersion: '2020-01-01',
      })
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
    })

    it('昵称冲突返回 409', async () => {
      mockDbGet.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM accounts WHERE nickname')) return { id: 9 }
        return undefined
      })
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 409 })
    })

    it('限流触发 429', async () => {
      vi.mocked(checkRateLimit).mockReturnValue(false)
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 429 })
    })

    it('缺失 Content-Length 时仍按真实字节拒绝超大请求体（chunked 绕过回归）', async () => {
      // 回归：旧实现只信 Content-Length，缺失该头时 parseInt('0')=0 直接放行，
      // 随后读入整包；现由 bounded-json-body 按真实 UTF-8 字节兜底。
      mockReadRawBody.mockResolvedValue(JSON.stringify({ nickname: 'x'.repeat(4096) }))
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 413 })
    })

    it('Content-Length 声明超限时在读体前拒绝', async () => {
      mockGetHeader.mockImplementation((_e: any, name: string) => {
        if (name?.toLowerCase() === 'content-length') return '999999'
        return undefined
      })
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 413 })
    })

    it('请求体不是合法 JSON 时返回 400', async () => {
      mockReadRawBody.mockResolvedValue('not-json')
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
    })

    it('限流先于读体：被限流时不读取请求体', async () => {
      vi.mocked(checkRateLimit).mockReturnValue(false)
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 429 })
      expect(mockReadRawBody).not.toHaveBeenCalled()
    })
  })

  // ── 登录 ──
  describe('POST /api/auth/login', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      handler = (await import('~/server/api/auth/login.post')).default
      mockReadBody.mockResolvedValue({ nickname: 'testuser', password: 'password123' })
      mockDbGet.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM accounts WHERE nickname'))
          return {
            id: 2,
            nickname: 'testuser',
            credential_hash: 'salt:hash',
            status: 'active',
            age_confirmed_at: '2026-09-08T00:00:00.000Z',
            privacy_policy_version: '2026-09-08',
            service_terms_version: '2026-09-08',
            created_at: '2026-09-08T00:00:00.000Z',
            updated_at: '2026-09-08T00:00:00.000Z',
          }
        return undefined
      })
    })

    it('登录成功返回 account 并设置 Cookie，不返回 token', async () => {
      const result = await handler(makeEvent())
      expect(result).toHaveProperty('account')
      expect(result).not.toHaveProperty('token')
      expect(setAuthCookie).toHaveBeenCalled()
    })

    it('密码不 trim：带首尾空格的密码按原值校验', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'testuser', password: '  password123  ' })
      const { verifyPassword } = await import('~/server/utils/auth')
      vi.mocked(verifyPassword).mockReturnValue(false)
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
      // verifyPassword 必须收到未 trim 的原值
      const calls = vi.mocked(verifyPassword).mock.calls
      expect(calls[calls.length - 1][0]).toBe('  password123  ')
    })

    it('缺失 Content-Length 时仍拒绝超大请求体（chunked 绕过回归）', async () => {
      mockReadRawBody.mockResolvedValue(JSON.stringify({ nickname: 'x'.repeat(4096) }))
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 413 })
    })

    it('不存在与非 active 统一返回 401（防枚举）', async () => {
      mockDbGet.mockReturnValue(undefined)
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })

      mockDbGet.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM accounts WHERE nickname'))
          return { id: 3, nickname: 'locked', credential_hash: 'salt:hash', status: 'suspended' }
        return undefined
      })
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
    })

    it('多次登录创建多个会话（不互踢）', async () => {
      await handler(makeEvent())
      await handler(makeEvent())
      const { createSessionToken } = await import('~/server/utils/auth')
      expect(createSessionToken).toHaveBeenCalledTimes(2)
      // 不调用删除账号全部会话
      const { deleteAllSessions } = await import('~/server/utils/auth')
      expect(deleteAllSessions).not.toHaveBeenCalled()
    })

    it('畸形 credential_hash 统一 401 且不创建 Session', async () => {
      // credential_hash 128 个非十六进制字符：verifyPassword 返回 false，登录必须 401 而非 500
      const { verifyPassword, createSessionToken } = await import('~/server/utils/auth')
      // 显式表达用例意图：畸形哈希被 verifyPassword 拒绝（而非依赖 mock 实现被清空的副作用）
      vi.mocked(verifyPassword).mockReturnValue(false)
      mockDbGet.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM accounts WHERE nickname'))
          return {
            id: 9,
            nickname: 'badhash',
            credential_hash: `salt:${'g'.repeat(128)}`,
            status: 'active',
            age_confirmed_at: '2026-09-08T00:00:00.000Z',
            privacy_policy_version: '2026-09-08',
            service_terms_version: '2026-09-08',
            created_at: '2026-09-08T00:00:00.000Z',
            updated_at: '2026-09-08T00:00:00.000Z',
          }
        return undefined
      })
      vi.mocked(createSessionToken).mockClear()
      await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
      expect(createSessionToken).not.toHaveBeenCalled()
    })
  })

  // ── me ──
  describe('GET /api/auth/me', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      handler = (await import('~/server/api/auth/me.get')).default
      mockDbGet.mockReturnValue({
        id: 5,
        nickname: 'meuser',
        status: 'active',
        age_confirmed_at: '2026-09-08T00:00:00.000Z',
        privacy_policy_version: '2026-09-08',
        service_terms_version: '2026-09-08',
        created_at: '2026-09-08T00:00:00.000Z',
        updated_at: '2026-09-08T00:00:00.000Z',
      })
    })

    it('返回 { account }', async () => {
      const result = await handler(makeEvent({ context: { accountId: 5 } }))
      expect(result).toHaveProperty('account')
      expect(result.account.nickname).toBe('meuser')
    })

    it('无 accountId 返回 401', async () => {
      await expect(handler(makeEvent({ context: {} }))).rejects.toMatchObject({ statusCode: 401 })
    })

    it('账号不存在返回 401 并清 Cookie', async () => {
      mockDbGet.mockReturnValue(undefined)
      await expect(handler(makeEvent({ context: { accountId: 999 } }))).rejects.toMatchObject({
        statusCode: 401,
      })
      expect(clearAuthCookie).toHaveBeenCalled()
    })
  })

  // ── 当前退出 ──
  describe('DELETE /api/auth/logout', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      handler = (await import('~/server/api/auth/logout.delete')).default
    })

    it('只删除当前会话并在成功后清 Cookie', async () => {
      const result = await handler(
        makeEvent({ context: { accountId: 2, sessionId: 10 }, method: 'DELETE' }),
      )
      expect(result).toEqual({ success: true })
      const { deleteSessionById } = await import('~/server/utils/auth')
      expect(deleteSessionById).toHaveBeenCalledWith(10)
      expect(clearAuthCookie).toHaveBeenCalled()
    })

    it('无会话返回 401', async () => {
      await expect(handler(makeEvent({ context: {}, method: 'DELETE' }))).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('删除失败时抛 500 且不清 Cookie', async () => {
      const { deleteSessionById } = await import('~/server/utils/auth')
      vi.mocked(deleteSessionById).mockImplementation(() => {
        throw new Error('db fail')
      })
      await expect(
        handler(makeEvent({ context: { accountId: 2, sessionId: 10 }, method: 'DELETE' })),
      ).rejects.toMatchObject({ statusCode: 500 })
      expect(clearAuthCookie).not.toHaveBeenCalled()
    })
  })

  // ── 全部退出 ──
  describe('DELETE /api/auth/logout-all', () => {
    let handler: (...args: any[]) => any

    beforeEach(async () => {
      handler = (await import('~/server/api/auth/logout-all.delete')).default
    })

    it('删除账号全部会话并清当前 Cookie', async () => {
      const result = await handler(makeEvent({ context: { accountId: 2 }, method: 'DELETE' }))
      expect(result).toEqual({ success: true })
      const { deleteAllSessions } = await import('~/server/utils/auth')
      expect(deleteAllSessions).toHaveBeenCalledWith(2)
      expect(clearAuthCookie).toHaveBeenCalled()
    })

    it('无会话返回 401', async () => {
      await expect(handler(makeEvent({ context: {}, method: 'DELETE' }))).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('响应不暴露会话数量或 token', async () => {
      const result = await handler(makeEvent({ context: { accountId: 2 }, method: 'DELETE' }))
      expect(result).not.toHaveProperty('count')
      expect(result).not.toHaveProperty('token')
    })
  })

  // ── 注销 ──
  describe('DELETE /api/auth/account', () => {
    let handler: (...args: any[]) => any
    let verifyPasswordMock: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      const authMod = await import('~/server/utils/auth')
      verifyPasswordMock = authMod.verifyPassword as ReturnType<typeof vi.fn>
      verifyPasswordMock.mockReturnValue(true)
      handler = (await import('~/server/api/auth/account.delete')).default
      mockReadBody.mockResolvedValue({ nickname: 'deleteuser', password: 'password123' })
      mockDbGet.mockReturnValue({
        id: 7,
        nickname: 'deleteuser',
        credential_hash: 'salt:hash',
        status: 'active',
        age_confirmed_at: '2026-09-08T00:00:00.000Z',
        privacy_policy_version: '2026-09-08',
        service_terms_version: '2026-09-08',
        created_at: '2026-09-08T00:00:00.000Z',
        updated_at: '2026-09-08T00:00:00.000Z',
      })
    })

    it('凭证复核通过后执行事务删除并清 Cookie', async () => {
      const result = await handler(makeEvent({ context: { accountId: 7 }, method: 'DELETE' }))
      expect(result).toEqual({ success: true })
      // 事务内删除安全日志与账号
      const calls = mockDbRun.mock.calls as unknown as DbRunCall[]
      const sqls = calls.map((c: DbRunCall) => c[0] as string)
      expect(sqls.some(s => s.includes('DELETE FROM security_log'))).toBe(true)
      expect(sqls.some(s => s.includes('DELETE FROM accounts'))).toBe(true)
      expect(clearAuthCookie).toHaveBeenCalled()
    })

    it('注销成功后不保留可识别的 account_deleted 日志', async () => {
      vi.mocked(logSecurityEvent).mockClear()
      await handler(makeEvent({ context: { accountId: 7 }, method: 'DELETE' }))
      const events = vi.mocked(logSecurityEvent).mock.calls.map((c: SecurityLogCall) => c[0])
      // 注销成功后不得写入带已删除 accountId 的 account_deleted 事件
      expect(events).not.toContain('account_deleted')
    })

    it('注销安全日志不含完整 IP 或无密钥截断摘要', async () => {
      vi.mocked(logSecurityEvent).mockClear()
      // 密码错误路径会写 login_failed；断言 details 不泄漏完整 IP
      verifyPasswordMock.mockReturnValue(false)
      await expect(
        handler(makeEvent({ context: { accountId: 7 }, method: 'DELETE' })),
      ).rejects.toMatchObject({ statusCode: 401 })
      const calls = vi.mocked(logSecurityEvent).mock.calls as SecurityLogCall[]
      const failed = calls.find((c: SecurityLogCall) => c[0] === 'login_failed')
      expect(failed).toBeDefined()
      const details = failed![3] as string
      expect(details).not.toContain('127.0.0.1')
    })

    it('昵称不一致返回 400', async () => {
      mockReadBody.mockResolvedValue({ nickname: 'wrongname', password: 'password123' })
      await expect(
        handler(makeEvent({ context: { accountId: 7 }, method: 'DELETE' })),
      ).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('注销接口受限流保护且先于读体判定', async () => {
      // 注销含密码复核（scrypt 同步开销），旧实现完全无限流
      vi.mocked(checkRateLimit).mockReturnValue(false)
      await expect(
        handler(makeEvent({ context: { accountId: 7 }, method: 'DELETE' })),
      ).rejects.toMatchObject({ statusCode: 429 })
      expect(mockReadRawBody).not.toHaveBeenCalled()
    })

    it('密码错误返回 401 且不清 Cookie、不删除', async () => {
      verifyPasswordMock.mockReturnValue(false)
      await expect(
        handler(makeEvent({ context: { accountId: 7 }, method: 'DELETE' })),
      ).rejects.toMatchObject({
        statusCode: 401,
      })
      expect(clearAuthCookie).not.toHaveBeenCalled()
      const calls = mockDbRun.mock.calls as unknown as DbRunCall[]
      expect(calls.some((c: DbRunCall) => (c[0] as string).includes('DELETE FROM accounts'))).toBe(
        false,
      )
    })

    it('无会话返回 401', async () => {
      await expect(handler(makeEvent({ context: {}, method: 'DELETE' }))).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('不读取旧 xuanxue.db 或假设 R4/R5 表', async () => {
      await handler(makeEvent({ context: { accountId: 7 }, method: 'DELETE' }))
      const calls = mockDbRun.mock.calls as unknown as DbRunCall[]
      const sqls = calls.map((c: DbRunCall) => c[0] as string)
      expect(sqls.some(s => s.includes('divination_results'))).toBe(false)
      expect(sqls.some(s => s.includes('self_profiles'))).toBe(false)
    })
  })
})
