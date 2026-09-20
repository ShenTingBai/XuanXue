import type { AuthStatus } from '~/types/account'
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
 * 判定与客户端行为（裁决**始终**由服务端做出，客户端不猜、也不放行未知）：
 * - 服务端（SSR）用请求上下文里的可信 accountId 判定，并写入 `useState` 供客户端复用；
 * - 客户端只有拿到 SSR 播种的 `true` 才放行；
 * - 客户端未见播种（未知）时**不**直接失败关闭，而是整页重取同一路径，让服务端在真实请求上
 *   重新裁决。原因：登录是纯客户端动作，SSR payload 里根本没有该工具的播种值，「未知即拒绝」
 *   会让**已授权账号点入口链接必然落到状态页**（R5-C 后实测：登录后点首页「八字（内部验证）」
 *   卡片 → `/tools/status?tool=bazi`）。整页重取不降低安全性——它反而多走一次服务端判定。
 */
export default defineNuxtRouteMiddleware(async to => {
  const tool = getToolByRoute(to.path)
  if (!tool) return
  if (isToolPubliclyAvailable(tool.id)) return

  if (tool.computePolicy === 'enabled') {
    const decision = await decideInternalAccess(tool.id)
    if (decision === 'allowed') return
    // 整页重取：同一路径重新发起真实请求，由服务端围栏裁决。
    if (decision === 'reload') return navigateTo(to.fullPath, { external: true })
  }

  return navigateTo({ path: '/tools/status', query: { tool: tool.id }, replace: true })
})

/** 内部验证访问裁决：放行 / 进状态页 / 整页重取后由服务端裁决。 */
type InternalAccessDecision = 'allowed' | 'denied' | 'reload'

/**
 * SSR 播种的内部验证缓存：判定值绑定播种时的账号，防止跨账号复用。
 * accountId 为播种时服务端取得的可信账号 id；decisions 为工具 id → 是否放行。
 */
interface InternalAccessCache {
  accountId: number | null
  decisions: Record<string, boolean>
}

/**
 * 当前账号是否允许对该工具做内部验证。
 * 白名单读取只在服务端发生（动态导入，不进入客户端包）。
 */
async function decideInternalAccess(toolId: string): Promise<InternalAccessDecision> {
  const access = useState<InternalAccessCache>('tools:internalAccess', () => ({
    accountId: null,
    decisions: {},
  }))

  if (import.meta.server) {
    const event = useRequestEvent()
    const accountId = event?.context?.accountId
    // 无可信账号身份时不播种（匿名访客不留下任何判定痕迹），也不放行。
    if (typeof accountId !== 'number' || !Number.isInteger(accountId)) return 'denied'

    const { isInternalVerificationAllowed } = await import('~/server/utils/internal-verification')
    const allowed = isInternalVerificationAllowed(toolId, accountId)
    if (access.value.accountId !== accountId || access.value.decisions[toolId] !== allowed) {
      // 账号变化时丢弃旧账号的全部判定，防止残留值被新账号在客户端复用；
      // 同账号仅增量更新当前工具。
      access.value = {
        accountId,
        decisions:
          access.value.accountId === accountId
            ? { ...access.value.decisions, [toolId]: allowed }
            : { [toolId]: allowed },
      }
    }
    return allowed ? 'allowed' : 'denied'
  }

  // 播种值只对播种那一刻的账号有效：A 的 true 被 B 复用就是权限放大。
  // 游客态一律失败关闭：退出登录后不得再读旧播种，也不整页重取试探。
  const authStatus = useState<AuthStatus>('auth:status', () => 'restoring')
  if (authStatus.value === 'guest') return 'denied'

  // 水合期：服务端渲染时播种的 accountId 就是当前会话的真实账号，此时
  // auth:account 可能尚未恢复完成（restoring），直接按播种值裁决，避免同账号
  // 刷新被误判为跨账号；只有恢复已确认账号且与播种不一致时才失败关闭。
  if (useNuxtApp().isHydrating) {
    const currentAccount = useState<{ id: number } | null>('auth:account', () => null)
    if (
      authStatus.value === 'authenticated' &&
      currentAccount.value !== null &&
      access.value.accountId !== null &&
      currentAccount.value.id !== access.value.accountId
    ) {
      return 'denied'
    }
    if (access.value.decisions[toolId] === true) return 'allowed'
    return 'denied'
  }

  // 非水合期（软导航）：账号缺失或与播种账号不一致时不得复用旧播种，
  // 整页重取由服务端对当前账号重新裁决；账号一致时按播种值三分支。
  const currentAccount = useState<{ id: number } | null>('auth:account', () => null)
  if (
    access.value.accountId === null ||
    currentAccount.value === null ||
    currentAccount.value.id !== access.value.accountId
  ) {
    return 'reload'
  }

  if (access.value.decisions[toolId] === true) {
    // 播种值代表**播种那一刻**的会话权限，账号一致且非游客才可复用。
    return 'allowed'
  }
  if (access.value.decisions[toolId] === false) return 'denied'

  // 未知值：账号一致但未播种该工具，整页重取由服务端裁决。
  return 'reload'
}
