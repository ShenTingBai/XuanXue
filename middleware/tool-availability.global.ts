import { getToolByRoute, isToolPubliclyAvailable } from '~/constants/tool-catalog'

export default defineNuxtRouteMiddleware(to => {
  const tool = getToolByRoute(to.path)

  // 只有 approved/public/enabled 的普通访客可进入；其余真实工具路由统一进入状态页。
  // internal + enabled 仅允许授权内部验证，不能解释为普通访客可以访问。
  if (tool && !isToolPubliclyAvailable(tool.id)) {
    return navigateTo({ path: '/tools/status', query: { tool: tool.id }, replace: true })
  }
})
