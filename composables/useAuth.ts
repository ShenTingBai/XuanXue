export interface Profile {
  id: number
  nickname: string
  created_at: string
  updated_at: string
  gender?: '男' | '女' | null
  birth_date?: string | null
  birth_calendar?: 'solar' | 'lunar' | null
  birth_hour?: number | null
  birth_minute?: number | null
}

interface StoredSession {
  token: string
  profile: Profile
}

export const useAuth = () => {
  const currentProfile = useState<Profile | null>('auth:profile', () => null)
  const SESSION_KEY = 'xuanxue:session'

  function getStoredSession(): StoredSession | null {
    if (!import.meta.client) return null
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (typeof parsed?.token === 'string' && parsed?.profile && typeof parsed.profile.id === 'number') {
        return parsed as StoredSession
      }
      localStorage.removeItem(SESSION_KEY)
      return null
    } catch {
      return null
    }
  }

  function setStoredSession(token: string, profile: Profile) {
    if (!import.meta.client) return
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, profile }))
  }

  function getAuthHeaders(): Record<string, string> {
    const session = getStoredSession()
    if (session?.token) {
      return { Authorization: `Bearer ${session.token}` }
    }
    return {}
  }

  function restoreSession() {
    const session = getStoredSession()
    currentProfile.value = session?.profile ?? null
  }

  /** Update both the shared state and localStorage session after profile save */
  function updateProfile(profile: Profile) {
    const session = getStoredSession()
    if (session) {
      setStoredSession(session.token, profile)
    }
    currentProfile.value = profile
  }

  async function login(nickname: string, pin: string) {
    const res = await $fetch<StoredSession>('/api/auth/login', {
      method: 'POST',
      body: { nickname, pin },
    })
    setStoredSession(res.token, res.profile)
    currentProfile.value = res.profile
  }

  async function register(nickname: string, pin: string) {
    const res = await $fetch<StoredSession>('/api/auth/register', {
      method: 'POST',
      body: { nickname, pin },
    })
    setStoredSession(res.token, res.profile)
    currentProfile.value = res.profile
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
    } catch {
      // best-effort logout
    }
    localStorage.removeItem(SESSION_KEY)
    currentProfile.value = null
  }

  return { currentProfile, getAuthHeaders, restoreSession, login, register, logout, updateProfile }
}
