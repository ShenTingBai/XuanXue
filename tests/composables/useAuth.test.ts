/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '../../composables/useAuth'
import type { Account } from '../../types/account'

// ============================================================================
// Global mocks: Nuxt useState, Nuxt $fetch, import.meta.client
// ============================================================================

const stateMap = new Map<string, { value: any }>()
vi.stubGlobal(
  'useState',
  vi.fn(<T>(key: string, init?: () => T): { value: T } => {
    if (!stateMap.has(key)) {
      stateMap.set(key, { value: init ? init() : undefined })
    }
    return stateMap.get(key)!
  }),
)

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// 覆盖 vitest.config 的 define，保证客户端分支执行
vi.stubGlobal('importMetaClient', true)

// ============================================================================
// Constants
// ============================================================================

const mockAccount: Account = {
  id: 1,
  nickname: 'testuser',
  status: 'active',
  ageConfirmedAt: '2026-09-08T00:00:00.000Z',
  privacyPolicyVersion: '2026-09-08',
  serviceTermsVersion: '2026-09-08',
  createdAt: '2026-09-08T00:00:00.000Z',
  updatedAt: '2026-09-08T00:00:00.000Z',
}

// ============================================================================
// Tests
// ============================================================================

describe('useAuth', () => {
  beforeEach(() => {
    stateMap.clear()
    mockFetch.mockReset()
  })

  // ========================================================================
  // 三态恢复
  // ========================================================================

  describe('restoreSession / authStatus 三态', () => {
    it('初始状态为 restoring', () => {
      const auth = useAuth()
      expect(auth.authStatus.value).toBe('restoring')
    })

    it('恢复成功进入 authenticated', async () => {
      mockFetch.mockResolvedValueOnce({ account: mockAccount })
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.authStatus.value).toBe('authenticated')
      expect(auth.currentAccount.value).toEqual(mockAccount)
    })

    it('401 进入 guest 且不设置网络错误', async () => {
      mockFetch.mockRejectedValueOnce(Object.assign(new Error('Unauthorized'), { statusCode: 401 }))
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.authStatus.value).toBe('guest')
      expect(auth.currentAccount.value).toBeNull()
      expect(auth.restoreError.value).toBeNull()
    })

    it('网络错误进入 guest 并保留可见错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.authStatus.value).toBe('guest')
      expect(auth.currentAccount.value).toBeNull()
      expect(auth.restoreError.value).toContain('网络')
    })

    it('restoreSession 去重：并发调用只发一次请求', async () => {
      mockFetch.mockResolvedValue({ account: mockAccount })
      const auth = useAuth()
      await Promise.all([auth.restoreSession(), auth.restoreSession(), auth.restoreSession()])
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('两个独立 useAuth 实例并发恢复只请求一次（模块级共享）', async () => {
      mockFetch.mockResolvedValue({ account: mockAccount })
      const authA = useAuth()
      const authB = useAuth()
      await Promise.all([authA.restoreSession(), authB.restoreSession()])
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(authA.authStatus.value).toBe('authenticated')
      expect(authB.authStatus.value).toBe('authenticated')
    })

    it('网络失败后显式重试可成功恢复', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ account: mockAccount })
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.restoreError.value).toContain('网络')
      expect(auth.authStatus.value).toBe('guest')

      // 存在 restoreError 时允许显式重试；重试期间回到 restoring，成功后清理错误
      await auth.restoreSession()
      expect(auth.authStatus.value).toBe('authenticated')
      expect(auth.currentAccount.value).toEqual(mockAccount)
      expect(auth.restoreError.value).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('网络失败后重试仍失败则留在 guest 并保留错误', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      const auth = useAuth()
      await auth.restoreSession()
      await auth.restoreSession()
      expect(auth.authStatus.value).toBe('guest')
      expect(auth.restoreError.value).toContain('网络')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('登录成功清理旧的恢复错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.restoreError.value).toContain('网络')
      // 登录成功
      mockFetch.mockResolvedValueOnce({ account: mockAccount })
      await auth.login('testuser', 'password123')
      expect(auth.restoreError.value).toBeNull()
    })
  })

  // ========================================================================
  // login / register
  // ========================================================================

  describe('login', () => {
    it('登录成功更新 currentAccount 并进入 authenticated', async () => {
      mockFetch.mockResolvedValueOnce({ account: mockAccount })
      const auth = useAuth()
      await auth.login('testuser', 'password123')
      expect(auth.currentAccount.value).toEqual(mockAccount)
      expect(auth.authStatus.value).toBe('authenticated')
    })

    it('发送新字段 nickname/password，不发送 pin/token', async () => {
      mockFetch.mockResolvedValueOnce({ account: mockAccount })
      const auth = useAuth()
      await auth.login('myuser', 'password123')
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: { nickname: 'myuser', password: 'password123' },
      })
      const body = mockFetch.mock.calls[0][1].body
      expect(body).not.toHaveProperty('pin')
      expect(body).not.toHaveProperty('token')
    })

    it('失败不更新状态', async () => {
      mockFetch.mockRejectedValueOnce(Object.assign(new Error('Unauthorized'), { statusCode: 401 }))
      const auth = useAuth()
      await expect(auth.login('baduser', 'password123')).rejects.toThrow()
      expect(auth.currentAccount.value).toBeNull()
      expect(auth.authStatus.value).toBe('restoring')
    })
  })

  describe('register', () => {
    it('注册成功更新 currentAccount', async () => {
      mockFetch.mockResolvedValueOnce({ account: mockAccount })
      const auth = useAuth()
      await auth.register('newuser', 'password123', true, '2026-09-08', '2026-09-08')
      expect(auth.currentAccount.value).toEqual(mockAccount)
    })

    it('发送注册请求体包含年龄与规则版本', async () => {
      mockFetch.mockResolvedValueOnce({ account: mockAccount })
      const auth = useAuth()
      await auth.register('newuser', 'password123', true, '2026-09-08', '2026-09-08')
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: {
          nickname: 'newuser',
          password: 'password123',
          ageConfirmed: true,
          privacyPolicyVersion: '2026-09-08',
          serviceTermsVersion: '2026-09-08',
        },
      })
    })
  })

  // ========================================================================
  // logout / logoutAll / deleteAccount
  // ========================================================================

  describe('logout', () => {
    it('成功清空状态', async () => {
      mockFetch.mockResolvedValueOnce({ success: true })
      const auth = useAuth()
      auth.currentAccount.value = mockAccount
      auth.authStatus.value = 'authenticated'
      await auth.logout()
      expect(auth.currentAccount.value).toBeNull()
      expect(auth.authStatus.value).toBe('guest')
    })

    it('失败保留状态并重新抛出', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const auth = useAuth()
      auth.currentAccount.value = mockAccount
      auth.authStatus.value = 'authenticated'
      await expect(auth.logout()).rejects.toThrow()
      expect(auth.currentAccount.value).toEqual(mockAccount)
      expect(auth.authStatus.value).toBe('authenticated')
    })
  })

  describe('logoutAll', () => {
    it('成功清空状态', async () => {
      mockFetch.mockResolvedValueOnce({ success: true })
      const auth = useAuth()
      auth.currentAccount.value = mockAccount
      auth.authStatus.value = 'authenticated'
      await auth.logoutAll()
      expect(auth.currentAccount.value).toBeNull()
      expect(auth.authStatus.value).toBe('guest')
    })

    it('失败保留状态', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const auth = useAuth()
      auth.currentAccount.value = mockAccount
      auth.authStatus.value = 'authenticated'
      await expect(auth.logoutAll()).rejects.toThrow()
      expect(auth.currentAccount.value).toEqual(mockAccount)
    })
  })

  describe('deleteAccount', () => {
    it('成功清空状态', async () => {
      mockFetch.mockResolvedValueOnce({ success: true })
      const auth = useAuth()
      auth.currentAccount.value = mockAccount
      auth.authStatus.value = 'authenticated'
      await auth.deleteAccount('testuser', 'password123')
      expect(auth.currentAccount.value).toBeNull()
      expect(auth.authStatus.value).toBe('guest')
    })

    it('失败保留状态', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const auth = useAuth()
      auth.currentAccount.value = mockAccount
      auth.authStatus.value = 'authenticated'
      await expect(auth.deleteAccount('testuser', 'password123')).rejects.toThrow()
      expect(auth.currentAccount.value).toEqual(mockAccount)
    })
  })

  // ========================================================================
  // markSessionExpired 与 deprecated currentProfile
  // ========================================================================

  describe('markSessionExpired', () => {
    it('把 authenticated 置为 guest 并清空账号', () => {
      const auth = useAuth()
      auth.currentAccount.value = mockAccount
      auth.authStatus.value = 'authenticated'
      auth.markSessionExpired()
      expect(auth.authStatus.value).toBe('guest')
      expect(auth.currentAccount.value).toBeNull()
    })
  })

  describe('deprecated currentProfile', () => {
    it('恒为 null，不提供 updateProfile', () => {
      const auth = useAuth()
      expect(auth.currentProfile.value).toBeNull()
      expect((auth as any).updateProfile).toBeUndefined()
      // 即使认证后也保持 null（不冒充 SelfProfile）
      auth.currentAccount.value = mockAccount
      expect(auth.currentProfile.value).toBeNull()
    })
  })
})
