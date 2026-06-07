/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '../../composables/useAuth'
import type { Profile } from '../../composables/useAuth'

// ============================================================================
// Global mocks: Nuxt useState, Nuxt $fetch
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

// Mock global fetch for restoreSessionFromApi
const mockGlobalFetch = vi.fn()
vi.stubGlobal('fetch', mockGlobalFetch)

// ============================================================================
// Constants
// ============================================================================

const mockProfile: Profile = {
  id: 1,
  nickname: 'testuser',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  gender: null,
  birth_date: null,
  birth_calendar: null,
  birth_hour: null,
  birth_minute: null,
}

// ============================================================================
// Tests
// ============================================================================

describe('useAuth', () => {
  beforeEach(() => {
    stateMap.clear()
    mockFetch.mockReset()
    mockGlobalFetch.mockReset()
  })

  // ========================================================================
  // getAuthHeaders
  // ========================================================================

  describe('getAuthHeaders', () => {
    it('returns empty object (cookie-based auth)', () => {
      const auth = useAuth()
      expect(auth.getAuthHeaders()).toEqual({})
    })
  })

  // ========================================================================
  // restoreSession
  // ========================================================================

  describe('restoreSession', () => {
    it('populates currentProfile via API on success', async () => {
      mockGlobalFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profile: mockProfile }),
      })
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.currentProfile.value).toEqual(mockProfile)
    })

    it('sets currentProfile to null when API returns non-ok', async () => {
      mockGlobalFetch.mockResolvedValueOnce({ ok: false })
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.currentProfile.value).toBeNull()
    })

    it('sets currentProfile to null when API throws (network error)', async () => {
      mockGlobalFetch.mockRejectedValueOnce(new Error('Network error'))
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.currentProfile.value).toBeNull()
    })
  })

  // ========================================================================
  // login
  // ========================================================================

  describe('login', () => {
    it('updates currentProfile on success', async () => {
      mockFetch.mockResolvedValueOnce({ token: 'login-token', profile: mockProfile })
      const auth = useAuth()
      await auth.login('testuser', 'abc123')
      expect(auth.currentProfile.value).toEqual(mockProfile)
    })

    it('rejects and does not update state on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const auth = useAuth()
      await expect(auth.login('testuser', 'abc123')).rejects.toThrow('Network error')
      expect(auth.currentProfile.value).toBeNull()
    })

    it('rejects on invalid credentials (401)', async () => {
      mockFetch.mockRejectedValueOnce(Object.assign(new Error('Unauthorized'), { statusCode: 401 }))
      const auth = useAuth()
      await expect(auth.login('wronguser', '0000')).rejects.toThrow()
      expect(auth.currentProfile.value).toBeNull()
    })

    it('passes nickname and pin as body to $fetch', async () => {
      mockFetch.mockResolvedValueOnce({ token: 't', profile: mockProfile })
      const auth = useAuth()
      await auth.login('myuser', 'abc999')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: { nickname: 'myuser', pin: 'abc999' },
      })
    })
  })

  // ========================================================================
  // register
  // ========================================================================

  describe('register', () => {
    it('updates currentProfile on successful registration', async () => {
      mockFetch.mockResolvedValueOnce({ token: 'reg-token', profile: mockProfile })
      const auth = useAuth()
      await auth.register('newuser', 'abc123')
      expect(auth.currentProfile.value).toEqual(mockProfile)
    })

    it('rejects on duplicate nickname (409)', async () => {
      mockFetch.mockRejectedValueOnce(Object.assign(new Error('Conflict'), { statusCode: 409 }))
      const auth = useAuth()
      await expect(auth.register('existing', 'abc123')).rejects.toThrow()
    })

    it('rejects on invalid PIN format (400)', async () => {
      mockFetch.mockRejectedValueOnce(Object.assign(new Error('Bad request'), { statusCode: 400 }))
      const auth = useAuth()
      await expect(auth.register('newuser', '1234')).rejects.toThrow()
    })

    it('passes nickname and pin as body to $fetch', async () => {
      mockFetch.mockResolvedValueOnce({ token: 't', profile: mockProfile })
      const auth = useAuth()
      await auth.register('brandnew', 'xyz321')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: { nickname: 'brandnew', pin: 'xyz321' },
      })
    })
  })

  // ========================================================================
  // logout
  // ========================================================================

  describe('logout', () => {
    it('clears state on successful logout', async () => {
      mockFetch.mockResolvedValueOnce({ success: true })
      const auth = useAuth()
      // Set initial profile
      auth.currentProfile.value = mockProfile
      await auth.logout()
      expect(auth.currentProfile.value).toBeNull()
    })

    it('still clears state when API call fails (best-effort)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const auth = useAuth()
      auth.currentProfile.value = mockProfile
      await auth.logout()
      expect(auth.currentProfile.value).toBeNull()
    })

    it('handles logout when no session exists', async () => {
      const auth = useAuth()
      mockFetch.mockRejectedValueOnce(new Error('No session'))
      await expect(auth.logout()).resolves.toBeUndefined()
      expect(auth.currentProfile.value).toBeNull()
    })

    it('calls $fetch DELETE without custom auth headers', async () => {
      mockFetch.mockResolvedValueOnce({ success: true })
      const auth = useAuth()
      await auth.logout()
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'DELETE',
      })
    })
  })

  // ========================================================================
  // updateProfile
  // ========================================================================

  describe('updateProfile', () => {
    it('updates currentProfile state', () => {
      const updatedProfile: Profile = {
        ...mockProfile,
        nickname: 'updateduser',
        gender: '男',
        birth_date: '2000-01-15',
      }
      const auth = useAuth()
      auth.updateProfile(updatedProfile)
      expect(auth.currentProfile.value).toEqual(updatedProfile)
    })

    it('updates state with new profile data', () => {
      const auth = useAuth()
      auth.updateProfile(mockProfile)
      expect(auth.currentProfile.value).toEqual(mockProfile)
    })
  })
})
