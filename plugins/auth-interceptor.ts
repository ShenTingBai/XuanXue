/**
 * 全局认证拦截器
 *
 * 拦截所有 $fetch 请求的 401 响应，自动清除本地会话并跳转到登录页。
 * 排除登录/注册接口（这些接口的 401 是正常业务流程）。
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  // 延迟到 next tick 执行，确保 Nuxt app 已初始化完成
  nextTick(() => {
    try {
      const { currentProfile, logout } = useAuth()
      const router = useRouter()

      // Create an intercepted fetch instance
      const intercepted = globalThis.$fetch.create({
        onResponseError({ request, response }) {
          if (response.status !== 401) return

          // Skip auth endpoints — login/register 401 is normal business logic
          const url = typeof request === 'string' ? request : (request instanceof URL ? request.href : request.url)
          if (url.includes('/api/auth/login') || url.includes('/api/auth/register') || url.includes('/api/auth/logout')) {
            return
          }

          // Only act if user is currently logged in
          if (!currentProfile.value) return

          logout()
          router.push('/login?expired=1')
        },
      })

      globalThis.$fetch = intercepted
    } catch {
      // Plugin dependencies not yet ready — skip interceptor setup
    }
  })
})
