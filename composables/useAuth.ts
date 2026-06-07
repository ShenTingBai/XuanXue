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
  birth_place?: string | null
  birth_longitude?: number | null
  parent_profile_id?: number | null
}

export const useAuth = () => {
  const currentProfile = useState<Profile | null>('auth:profile', () => null)

  function getAuthHeaders(): Record<string, string> {
    return {}
  }

  async function restoreSessionFromApi(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) return false
      const data = await response.json()
      if (data && data.profile) {
        currentProfile.value = data.profile
        return true
      }
      return false
    } catch {
      // Network error or not logged in — completely normal, silently ignore
      return false
    }
  }

  async function restoreSession() {
    if (!import.meta.client) return
    if (currentProfile.value) return // 已有档案，不覆盖
    await restoreSessionFromApi()
  }

  /** Update the shared state after profile save */
  function updateProfile(profile: Profile) {
    currentProfile.value = profile
  }

  async function login(nickname: string, pin: string) {
    const res = await $fetch<{ token: string; profile: Profile }>('/api/auth/login', {
      method: 'POST',
      body: { nickname, pin },
    })
    currentProfile.value = res.profile
  }

  async function register(nickname: string, pin: string) {
    const res = await $fetch<{ token: string; profile: Profile }>('/api/auth/register', {
      method: 'POST',
      body: { nickname, pin },
    })
    currentProfile.value = res.profile
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'DELETE' })
    } catch {
      // best-effort logout
    }
    currentProfile.value = null
  }

  return {
    currentProfile,
    getAuthHeaders,
    restoreSession,
    login,
    register,
    logout,
    updateProfile,
  }
}
