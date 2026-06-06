/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '../../composables/useAuth'
import type { Profile } from '../../composables/useAuth'

// ============================================================================
// Global mocks: Nuxt useState, Nuxt $fetch, localStorage
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

// ============================================================================
// Constants
// ============================================================================

const SESSION_KEY = 'xuanxue:session'

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
  let store: Record<string, string>

  beforeEach(() => {
    stateMap.clear()
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
    })
    mockFetch.mockReset()
  })

  // ========================================================================
  // getStoredSession (internal, tested indirectly through getAuthHeaders)
  // ========================================================================

  describe('getStoredSession (via getAuthHeaders)', () => {
    it('returns null when no session exists — empty headers', () => {
      const auth = useAuth()
      expect(auth.getAuthHeaders()).toEqual({})
    })

    it('returns session when valid token and profile are stored', () => {
      store[SESSION_KEY] = JSON.stringify({
        token: 'valid-token-abc',
        profile: mockProfile,
      })
      const auth = useAuth()
      expect(auth.getAuthHeaders()).toEqual({ Authorization: 'Bearer valid-token-abc' })
    })

    it('returns null for malformed JSON (JSON.parse throws, caught by try-catch)', () => {
      store[SESSION_KEY] = 'not-valid-json{{{'
      const auth = useAuth()
      expect(auth.getAuthHeaders()).toEqual({})
      // Malformed JSON is caught by try-catch and returns null
      // The entry is NOT removed (removeItem is only called when JSON is valid but missing keys)
      expect(store[SESSION_KEY]).toBe('not-valid-json{{{')
    })

    it('returns null when parsed object is missing required keys', () => {
      store[SESSION_KEY] = JSON.stringify({ someKey: 'someValue' })
      const auth = useAuth()
      expect(auth.getAuthHeaders()).toEqual({})
      // Invalid entry should be removed
      expect(store[SESSION_KEY]).toBeUndefined()
    })

    it('returns null when profile is missing id field', () => {
      store[SESSION_KEY] = JSON.stringify({ token: 'x', profile: { nickname: 'nope' } })
      const auth = useAuth()
      expect(auth.getAuthHeaders()).toEqual({})
    })
  })

  // ========================================================================
  // setStoredSession (internal, tested indirectly through login/register)
  // ========================================================================

  describe('setStoredSession (via login)', () => {
    it('writes token and profile to localStorage on successful login', async () => {
      mockFetch.mockResolvedValueOnce({
        token: 'login-token-xyz',
        profile: mockProfile,
      })
      const auth = useAuth()
      await auth.login('testuser', '1234')

      const stored = JSON.parse(store[SESSION_KEY])
      expect(stored.token).toBe('login-token-xyz')
      expect(stored.profile.nickname).toBe('testuser')
      expect(stored.profile.id).toBe(1)
    })

    it('overwrites existing session on subsequent login', async () => {
      const profile2: Profile = { ...mockProfile, id: 2, nickname: 'user2' }

      mockFetch.mockResolvedValueOnce({ token: 'token-1', profile: mockProfile })
      const auth = useAuth()
      await auth.login('user1', '1111')
      expect(JSON.parse(store[SESSION_KEY]).token).toBe('token-1')

      mockFetch.mockResolvedValueOnce({ token: 'token-2', profile: profile2 })
      await auth.login('user2', '2222')
      expect(JSON.parse(store[SESSION_KEY]).token).toBe('token-2')
      expect(JSON.parse(store[SESSION_KEY]).profile.nickname).toBe('user2')
    })

    it('does NOT write to localStorage when login fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const auth = useAuth()
      await expect(auth.login('testuser', '1234')).rejects.toThrow()
      expect(store[SESSION_KEY]).toBeUndefined()
    })
  })

  // ========================================================================
  // getAuthHeaders
  // ========================================================================

  describe('getAuthHeaders', () => {
    it('returns Authorization header when valid token exists', () => {
      store[SESSION_KEY] = JSON.stringify({ token: 'my-token', profile: mockProfile })
      const auth = useAuth()
      const headers = auth.getAuthHeaders()
      expect(headers).toEqual({ Authorization: 'Bearer my-token' })
    })

    it('returns empty object when localStorage is empty', () => {
      const auth = useAuth()
      expect(auth.getAuthHeaders()).toEqual({})
    })

    it('returns empty object when stored value is not a valid session', () => {
      store[SESSION_KEY] = JSON.stringify({ notToken: true })
      const auth = useAuth()
      expect(auth.getAuthHeaders()).toEqual({})
    })
  })

  // ========================================================================
  // restoreSession
  // ========================================================================

  describe('restoreSession', () => {
    it('populates currentProfile from valid localStorage', async () => {
      store[SESSION_KEY] = JSON.stringify({ token: 't', profile: mockProfile })
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.currentProfile.value).toEqual(mockProfile)
    })

    it('sets currentProfile to null when localStorage is empty', async () => {
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.currentProfile.value).toBeNull()
    })

    it('sets currentProfile to null when localStorage has corrupted JSON', async () => {
      store[SESSION_KEY] = 'corrupted{json'
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.currentProfile.value).toBeNull()
    })

    it('sets currentProfile to null when session is missing profile.id', async () => {
      store[SESSION_KEY] = JSON.stringify({ token: 't', profile: { nickname: 'foo' } })
      const auth = useAuth()
      await auth.restoreSession()
      expect(auth.currentProfile.value).toBeNull()
    })
  })

  // ========================================================================
  // login
  // ========================================================================

  describe('login', () => {
    it('sets token in localStorage and updates currentProfile on success', async () => {
      mockFetch.mockResolvedValueOnce({ token: 'login-token', profile: mockProfile })
      const auth = useAuth()
      await auth.login('testuser', '1234')

      const stored = JSON.parse(store[SESSION_KEY])
      expect(stored.token).toBe('login-token')
      expect(auth.currentProfile.value).toEqual(mockProfile)
    })

    it('rejects and does not update state on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const auth = useAuth()
      await expect(auth.login('testuser', '1234')).rejects.toThrow('Network error')
      expect(auth.currentProfile.value).toBeNull()
      expect(store[SESSION_KEY]).toBeUndefined()
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
      await auth.login('myuser', '9999')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: { nickname: 'myuser', pin: '9999' },
      })
    })
  })

  // ========================================================================
  // register
  // ========================================================================

  describe('register', () => {
    it('sets session and profile on successful registration', async () => {
      mockFetch.mockResolvedValueOnce({ token: 'reg-token', profile: mockProfile })
      const auth = useAuth()
      await auth.register('newuser', '1234')

      const stored = JSON.parse(store[SESSION_KEY])
      expect(stored.token).toBe('reg-token')
      expect(auth.currentProfile.value).toEqual(mockProfile)
    })

    it('rejects on duplicate nickname (409)', async () => {
      mockFetch.mockRejectedValueOnce(Object.assign(new Error('Conflict'), { statusCode: 409 }))
      const auth = useAuth()
      await expect(auth.register('existing', '1234')).rejects.toThrow()
      expect(store[SESSION_KEY]).toBeUndefined()
    })

    it('rejects on invalid PIN format (400)', async () => {
      mockFetch.mockRejectedValueOnce(Object.assign(new Error('Bad request'), { statusCode: 400 }))
      const auth = useAuth()
      await expect(auth.register('newuser', '12')).rejects.toThrow()
    })

    it('passes nickname and pin as body to $fetch', async () => {
      mockFetch.mockResolvedValueOnce({ token: 't', profile: mockProfile })
      const auth = useAuth()
      await auth.register('brandnew', '4321')

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: { nickname: 'brandnew', pin: '4321' },
      })
    })
  })

  // ========================================================================
  // logout
  // ========================================================================

  describe('logout', () => {
    it('clears localStorage and state on successful logout', async () => {
      store[SESSION_KEY] = JSON.stringify({ token: 'my-token', profile: mockProfile })
      mockFetch.mockResolvedValueOnce({ success: true })
      const auth = useAuth()
      await auth.logout()

      expect(store[SESSION_KEY]).toBeUndefined()
      expect(auth.currentProfile.value).toBeNull()
    })

    it('still clears state when API call fails (best-effort)', async () => {
      store[SESSION_KEY] = JSON.stringify({ token: 'my-token', profile: mockProfile })
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      const auth = useAuth()
      await auth.logout()

      expect(store[SESSION_KEY]).toBeUndefined()
      expect(auth.currentProfile.value).toBeNull()
    })

    it('handles logout when no session exists', async () => {
      const auth = useAuth()
      mockFetch.mockRejectedValueOnce(new Error('No session'))
      await expect(auth.logout()).resolves.toBeUndefined()
      expect(auth.currentProfile.value).toBeNull()
    })

    it('calls $fetch DELETE with auth headers when token exists', async () => {
      store[SESSION_KEY] = JSON.stringify({ token: 'my-token', profile: mockProfile })
      mockFetch.mockResolvedValueOnce({ success: true })
      const auth = useAuth()
      await auth.logout()

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer my-token' },
      })
    })
  })

  // ========================================================================
  // updateProfile
  // ========================================================================

  describe('updateProfile', () => {
    it('updates both state and localStorage when session exists', () => {
      store[SESSION_KEY] = JSON.stringify({ token: 'my-token', profile: mockProfile })
      const updatedProfile: Profile = {
        ...mockProfile,
        nickname: 'updateduser',
        gender: '男',
        birth_date: '2000-01-15',
      }
      const auth = useAuth()
      auth.updateProfile(updatedProfile)

      expect(auth.currentProfile.value).toEqual(updatedProfile)
      const stored = JSON.parse(store[SESSION_KEY])
      expect(stored.profile.nickname).toBe('updateduser')
      expect(stored.profile.birth_date).toBe('2000-01-15')
      // Token must be preserved
      expect(stored.token).toBe('my-token')
    })

    it('updates state even when no session exists in localStorage', () => {
      const auth = useAuth()
      auth.updateProfile(mockProfile)
      expect(auth.currentProfile.value).toEqual(mockProfile)
      // localStorage should not be modified when there is no prior session
      expect(store[SESSION_KEY]).toBeUndefined()
    })

    it('updates state and preserves existing token in localStorage', () => {
      store[SESSION_KEY] = JSON.stringify({ token: 'persist-token', profile: mockProfile })
      const auth = useAuth()
      auth.updateProfile({ ...mockProfile, nickname: 'new-name' })

      expect(auth.currentProfile.value?.nickname).toBe('new-name')
      expect(JSON.parse(store[SESSION_KEY]).token).toBe('persist-token')
      expect(JSON.parse(store[SESSION_KEY]).profile.nickname).toBe('new-name')
    })
  })
})
