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

export interface ProfileWithFlag extends Profile {
  isMain: boolean
}

export const useAuth = () => {
  const currentProfile = useState<Profile | null>('auth:profile', () => null)
  const subProfiles = useState<ProfileWithFlag[]>('auth:subProfiles', () => [])

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
    subProfiles.value = []
  }

  /** Load sub-profiles from the API */
  async function loadSubProfiles() {
    if (!import.meta.client) return
    try {
      const res = await $fetch<{ main: ProfileWithFlag; subs: ProfileWithFlag[] }>('/api/profiles')
      currentProfile.value = res.main
      subProfiles.value = [res.main, ...res.subs]
    } catch {
      // Best-effort — if sub-profiles can't be loaded, keep current state
    }
  }

  /** Switch to a different profile (main or sub) */
  function switchProfile(profile: Profile) {
    currentProfile.value = profile
  }

  return {
    currentProfile,
    subProfiles,
    getAuthHeaders,
    restoreSession,
    login,
    register,
    logout,
    updateProfile,
    loadSubProfiles,
    switchProfile,
  }
}
