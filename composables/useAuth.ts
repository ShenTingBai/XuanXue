import type { Account, AuthStatus } from '~/types/account'

/**
 * 旧档案只读兼容别名类型：仅供已封存工具编译，运行期恒为 null，不承载数据。
 */
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

// 模块级共享恢复去重：layout/page 的独立 useAuth 实例共享同一 /api/auth/me 请求。
let sharedRestorePromise: Promise<void> | null = null

export const useAuth = () => {
  // 三态共享状态：恢复结束前不得闪现游客入口或错误跳转
  const authStatus = useState<AuthStatus>('auth:status', () => 'restoring')
  const currentAccount = useState<Account | null>('auth:account', () => null)
  // 恢复网络错误：独立于三态，仅网络故障时保留可见、可重试信息；401 不设置。
  const restoreError = useState<string | null>('auth:restore-error', () => null)

  // 已封存旧工具只读兼容出口：恒为 null，不提供 updateProfile。
  // @deprecated 不把 Account 冒充 SelfProfile，也不恢复旧档案读取。
  const currentProfile = useState<Profile | null>('auth:legacy-profile', () => null)

  /** 会话过期处理：由 401 拦截器调用，进入 authenticated → guest 并清理恢复错误。 */
  function markSessionExpired() {
    if (import.meta.client) {
      authStatus.value = 'guest'
      currentAccount.value = null
      restoreError.value = null
    }
  }

  /** 清除旧的恢复错误（成功、登录、注册、退出、注销时调用）。 */
  function clearRestoreError() {
    restoreError.value = null
  }

  async function restoreSession(): Promise<void> {
    if (!import.meta.client) return
    // 已在恢复中：所有实例共享同一请求
    if (sharedRestorePromise) return sharedRestorePromise
    // 已确认游客且无错误：不重复请求（恢复失败除外，restoreError 存在时允许重试）
    if (authStatus.value !== 'restoring' && !restoreError.value) return

    authStatus.value = 'restoring'
    sharedRestorePromise = (async () => {
      try {
        const res = await $fetch<{ account: Account }>('/api/auth/me')
        currentAccount.value = res.account
        authStatus.value = 'authenticated'
        restoreError.value = null
      } catch (e: unknown) {
        const statusCode = (e as { statusCode?: number })?.statusCode
        currentAccount.value = null
        authStatus.value = 'guest'
        if (statusCode === 401) {
          // 401 是正常游客态，不显示网络错误
          restoreError.value = null
        } else {
          // 网络失败：保留可见、可重试的中文错误
          restoreError.value = '无法确认登录状态，请检查网络连接后重试'
        }
      } finally {
        sharedRestorePromise = null
      }
    })()
    return sharedRestorePromise
  }

  /** 显式进入游客态（如登录页已确认无会话），并清除恢复错误。 */
  function enterGuest() {
    authStatus.value = 'guest'
    currentAccount.value = null
    restoreError.value = null
  }

  async function login(nickname: string, password: string) {
    const res = await $fetch<{ account: Account }>('/api/auth/login', {
      method: 'POST',
      body: { nickname, password },
    })
    currentAccount.value = res.account
    authStatus.value = 'authenticated'
    clearRestoreError()
  }

  async function register(
    nickname: string,
    password: string,
    ageConfirmed: boolean,
    privacyPolicyVersion: string,
    serviceTermsVersion: string,
  ) {
    const res = await $fetch<{ account: Account }>('/api/auth/register', {
      method: 'POST',
      body: {
        nickname,
        password,
        ageConfirmed,
        privacyPolicyVersion,
        serviceTermsVersion,
      },
    })
    currentAccount.value = res.account
    authStatus.value = 'authenticated'
    clearRestoreError()
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'DELETE' })
    } catch {
      // 退出失败：保留已登录状态，明确提示，不伪装成功
      throw new Error('退出失败，请稍后再试')
    }
    currentAccount.value = null
    authStatus.value = 'guest'
    clearRestoreError()
  }

  async function logoutAll() {
    try {
      await $fetch('/api/auth/logout-all', { method: 'DELETE' })
    } catch {
      throw new Error('退出所有设备失败，请稍后再试')
    }
    currentAccount.value = null
    authStatus.value = 'guest'
    clearRestoreError()
  }

  async function deleteAccount(nickname: string, password: string) {
    try {
      await $fetch('/api/auth/account', {
        method: 'DELETE',
        body: { nickname, password },
      })
    } catch {
      throw new Error('注销失败，请稍后再试')
    }
    currentAccount.value = null
    authStatus.value = 'guest'
    clearRestoreError()
  }

  return {
    authStatus,
    currentAccount,
    restoreError,
    // deprecated 只读恒 null 兼容出口
    currentProfile,
    markSessionExpired,
    restoreSession,
    enterGuest,
    login,
    register,
    logout,
    logoutAll,
    deleteAccount,
  }
}
