import { getToolByRoute } from '~/constants/tool-catalog'

export default defineNuxtRouteMiddleware(to => {
  const tool = getToolByRoute(to.path)

  if (tool?.exposure === 'hidden') {
    // 保留旧路由和既有记录用于后续只读历史迁移；P0 先在页面挂载前阻止新的计算生命周期。
    return navigateTo({ path: '/tools/status', query: { tool: tool.id }, replace: true })
  }
})
