/**
 * 全局认证拦截器
 *
 * 非认证接口返回 401 时调用 markSessionExpired 并跳转到登录页，不再发起 logout 请求。
 * 认证接口自身的错误不递归处理；恢复中和游客状态不重复跳转；普通网络失败不误判为会话过期。
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  // 延迟到 next tick 执行，确保 Nuxt app 已初始化完成
  nextTick(() => {
    try {
      const { authStatus, markSessionExpired } = useAuth()
      const router = useRouter()

      // 认证接口自身的 401 是正常业务流程，不触发会话过期处理
      const authEndpoints = new Set([
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/logout',
        '/api/auth/logout-all',
        '/api/auth/account',
      ])

      // Create an intercepted fetch instance
      const intercepted = globalThis.$fetch.create({
        onResponseError({ request, response }) {
          if (response.status !== 401) return

          const url =
            typeof request === 'string'
              ? request
              : request instanceof URL
                ? request.href
                : request.url
          const path = new URL(url, 'http://localhost').pathname

          // 认证接口自身错误不递归处理
          if (authEndpoints.has(path)) return

          // 只在已登录状态下处理会话过期；恢复中和游客状态不重复跳转
          if (authStatus.value !== 'authenticated') return

          markSessionExpired()
          router.push('/login?expired=1')
        },
      })

      globalThis.$fetch = intercepted
    } catch {
      // Plugin dependencies not yet ready — skip interceptor setup
    }
  })
})
