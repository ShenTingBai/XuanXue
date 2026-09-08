import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock 生产模块依赖：安全日志测试只验证写入契约本身，不连接真实数据库。
// HMAC mock 返回与输入无关的固定摘要，保证「不含原始 IP」断言不被 mock 回声污染。
const mockDbRun = vi.hoisted(() => vi.fn())
const mockMakeSecretHmacHint = vi.hoisted(() => vi.fn(() => 'a1b2c3d4e5f60718'))

vi.mock('../../../server/database/db', () => ({
  dbRun: mockDbRun,
}))

vi.mock('../../../server/utils/auth', () => ({
  makeSecretHmacHint: mockMakeSecretHmacHint,
}))

import { logSecurityEvent } from '../../../server/utils/securityLog'

describe('logSecurityEvent 安全日志写入契约（模块 mock，不连接真实数据库）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('调用 dbRun 写入 security_log(event_type, account_id, ip_hint, details)', () => {
    logSecurityEvent('login_success', 42, '203.0.113.7', 'Login successful')
    expect(mockDbRun).toHaveBeenCalledTimes(1)
    const [sql, params] = mockDbRun.mock.calls[0]
    expect(sql).toContain('INSERT INTO security_log')
    expect(sql).toContain('event_type')
    expect(sql).toContain('account_id')
    expect(sql).toContain('ip_hint')
    expect(sql).toContain('details')
    expect(params).toEqual(['login_success', 42, 'hint:a1b2c3d4e5f60718', 'Login successful'])
  })

  it('ip_hint 使用 makeSecretHmacHint(ip, ip-hint) 的结果并加 hint: 前缀', () => {
    logSecurityEvent('login_failed', null, '198.51.100.23', 'Wrong password')
    expect(mockMakeSecretHmacHint).toHaveBeenCalledWith('198.51.100.23', 'ip-hint')
    const params = mockDbRun.mock.calls[0][1]
    expect(params[2]).toBe('hint:a1b2c3d4e5f60718')
    // 不保存原始 IP：写入参数中不出现完整 IP
    expect(params.join(' ')).not.toContain('198.51.100.23')
  })

  it('空 IP 写 unknown，不调用 HMAC', () => {
    logSecurityEvent('login_failed', null, '', 'Failed login attempt')
    expect(mockMakeSecretHmacHint).not.toHaveBeenCalled()
    const params = mockDbRun.mock.calls[0][1]
    expect(params[2]).toBe('unknown')
  })

  it('details 缺省写 null', () => {
    logSecurityEvent('logout', 7, '203.0.113.7')
    const params = mockDbRun.mock.calls[0][1]
    expect(params[3]).toBeNull()
  })

  it('dbRun 异常不得向调用者抛出（best-effort 写入）', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDbRun.mockImplementation(() => {
      throw new Error('db write failed')
    })
    expect(() =>
      logSecurityEvent('register', 1, '203.0.113.7', 'New account registered'),
    ).not.toThrow()
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('绝不写原始 IP：SQL 与参数中无 ip 列或原始地址', () => {
    logSecurityEvent('register', 1, '192.0.2.99', 'New account registered')
    const [sql, params] = mockDbRun.mock.calls[0]
    expect(sql).not.toMatch(/\bip\b(?!_hint)/)
    expect(params.join(' ')).not.toContain('192.0.2.99')
  })
})
