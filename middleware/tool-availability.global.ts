import { getToolByRoute, isToolPubliclyAvailable } from '~/constants/tool-catalog'

/**
 * 工具路由围栏。
 *
 * 默认规则：只有 `approved + public + enabled` 的工具允许普通访客进入，其余真实工具路由
 * 统一重定向状态页。
 *
 * D3 方案 B 的**唯一**例外（治理规范 §20.2 明文允许 `internal + enabled` 用于授权内部验证）：
 * 当目录 `computePolicy === 'enabled'` 且服务端白名单明确授权当前账号时放行。
 * 该例外不改动 `exposure`，也不放宽公开判定——`isToolPubliclyAvailable` 仍为 false，
 * 顶栏导航、首页列表与 SEO 因此完全不受影响。
 *
 * 判定与客户端行为：
 * - 服务端（SSR）用请求上下文里的可信 accountId 判定，并写入 `useState` 供客户端复用；
 * - 客户端软导航只信任 SSR 播种的结果，未知一律**失败关闭**（重定向状态页），
 *   避免任何人在浏览器里用软导航绕过围栏。
 */
export default defineNuxtRouteMiddleware(async to => {
  const tool = getToolByRoute(to.path)
  if (!tool) return
  if (isToolPubliclyAvailable(tool.id)) return

  if (tool.computePolicy === 'enabled' && (await isInternalAccessAllowed(tool.id))) return

  return navigateTo({ path: '/tools/status', query: { tool: tool.id }, replace: true })
})

/**
 * 是否允许当前账号对该工具做内部验证。
 * 白名单读取只在服务端发生（动态导入，不进入客户端包）。
 */
async function isInternalAccessAllowed(toolId: string): Promise<boolean> {
  const access = useState<Record<string, boolean>>('tools:internalAccess', () => ({}))

  if (import.meta.server) {
    const event = useRequestEvent()
    const accountId = event?.context?.accountId
    if (typeof accountId !== 'number' || !Number.isInteger(accountId)) return false

    const { isInternalVerificationAllowed } = await import('~/server/utils/internal-verification')
    const allowed = isInternalVerificationAllowed(toolId, accountId)
    if (access.value[toolId] !== allowed) {
      access.value = { ...access.value, [toolId]: allowed }
    }
    return allowed
  }

  // 客户端：只认可服务端播种的结果；没有记录就是没被授权。
  return access.value[toolId] === true
}
