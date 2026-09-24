/**
 * 工具入口状态目录（四维）。
 *
 * 客户端与服务端共用唯一状态来源，统一控制审核、访问、计算、历史与导出；
 * 不在此目录外另写绕过规则。R1 围栏期矩阵来自已批准的产品索引，
 * 阶段条件文本不得写入运行枚举。
 *
 * @author LiXinwen
 */
export type ToolId =
  | 'shengxiao'
  | 'constellation'
  | 'zeji'
  | 'bazi'
  | 'name-test'
  | 'cezi'
  | 'guming'
  | 'ziwei'
  | 'yijing'
  | 'hehun'
  | 'meihua'

export type ToolReviewStatus = 'unreviewed' | 'in_review' | 'approved' | 'suspended' | 'retired'
export type ToolExposure = 'public' | 'internal' | 'status_only'
export type ToolComputePolicy = 'enabled' | 'blocked'
export type ToolHistoryPolicy = 'create_allowed' | 'read_only' | 'disabled'

export interface ToolCatalogEntry {
  id: ToolId
  name: string
  route: string
  reviewStatus: ToolReviewStatus
  exposure: ToolExposure
  computePolicy: ToolComputePolicy
  historyPolicy: ToolHistoryPolicy
}

export const TOOL_CATALOG: readonly ToolCatalogEntry[] = [
  // 公开候选：shengxiao 是唯一 approved / public / enabled 工具，公开范围限于 R3 Accepted 的
  // 「查我的生肖 / 认识十二生肖」限定能力。公开范围**不含** constellation 太阳星座、
  // 人格/婚配/运势/本命佛/化太岁扩展，也不含服务器历史（historyPolicy 保持 disabled）；
  // 其余 10 项仍为 in_review / internal，zeji 与 bazi 仅按 §20.2 供授权内部验证。
  {
    id: 'shengxiao',
    name: '生肖',
    route: '/tools/shengxiao',
    reviewStatus: 'approved',
    exposure: 'public',
    computePolicy: 'enabled',
    // 零服务器历史：游客结果只存在当前页面，不写历史表（契约 §6.4）。
    historyPolicy: 'disabled',
  },
  {
    id: 'constellation',
    name: '星座',
    route: '/tools/constellation',
    reviewStatus: 'in_review',
    exposure: 'internal',
    computePolicy: 'blocked',
    historyPolicy: 'disabled',
  },
  {
    id: 'zeji',
    name: '择日',
    route: '/tools/zeji',
    reviewStatus: 'in_review',
    exposure: 'internal',
    computePolicy: 'enabled',
    historyPolicy: 'disabled',
  },
  {
    id: 'bazi',
    name: '八字',
    route: '/tools/bazi',
    reviewStatus: 'in_review',
    exposure: 'internal',
    // R5：按治理规范 §20.2「internal + enabled 只允许授权内部验证」启用计算与历史创建，
    // 供授权账号在真实构建上验收；exposure 保持 internal，公开判定仍为 false，
    // 顶栏/首页/SEO 不受影响。内部验证由 XUANXUE_INTERNAL_TOOLS 白名单控制，默认关闭。
    computePolicy: 'enabled',
    historyPolicy: 'create_allowed',
  },
  {
    id: 'name-test',
    name: '姓名',
    route: '/tools/name-test',
    reviewStatus: 'in_review',
    exposure: 'internal',
    computePolicy: 'blocked',
    historyPolicy: 'disabled',
  },
  {
    id: 'cezi',
    name: '测字',
    route: '/tools/cezi',
    reviewStatus: 'in_review',
    exposure: 'internal',
    computePolicy: 'blocked',
    historyPolicy: 'disabled',
  },
  {
    id: 'guming',
    name: '称骨',
    route: '/tools/guming',
    reviewStatus: 'in_review',
    exposure: 'internal',
    computePolicy: 'blocked',
    historyPolicy: 'disabled',
  },
  {
    id: 'ziwei',
    name: '紫微斗数',
    route: '/tools/ziwei',
    reviewStatus: 'in_review',
    exposure: 'internal',
    computePolicy: 'blocked',
    historyPolicy: 'disabled',
  },
  {
    id: 'yijing',
    name: '六爻',
    route: '/tools/yijing',
    reviewStatus: 'in_review',
    exposure: 'internal',
    computePolicy: 'blocked',
    historyPolicy: 'disabled',
  },
  {
    id: 'hehun',
    name: '合婚',
    route: '/tools/hehun',
    reviewStatus: 'in_review',
    exposure: 'internal',
    computePolicy: 'blocked',
    historyPolicy: 'disabled',
  },
  {
    id: 'meihua',
    name: '梅花',
    route: '/tools/meihua',
    reviewStatus: 'in_review',
    exposure: 'internal',
    computePolicy: 'blocked',
    historyPolicy: 'disabled',
  },
]

export function getToolById(id: string): ToolCatalogEntry | undefined {
  return TOOL_CATALOG.find(tool => tool.id === id)
}

/** 移除路径末尾一个或多个斜杠；根路径（'/' 或 ''）保持不变，避免把子路径或相似前缀映射成工具。 */
function normalizeTrailingSlash(route: string): string {
  if (route === '/' || route === '') return route
  return route.replace(/\/+$/, '')
}

export function getToolByRoute(route: string): ToolCatalogEntry | undefined {
  return TOOL_CATALOG.find(tool => tool.route === normalizeTrailingSlash(route))
}

/** 普通访客公开判断：同时满足 approved、public、enabled。 */
export function isToolPubliclyAvailable(id: string): boolean {
  const tool = getToolById(id)
  return (
    tool?.reviewStatus === 'approved' &&
    tool.exposure === 'public' &&
    tool.computePolicy === 'enabled'
  )
}

/** 公开计算：只有已获准公开且计算启用才允许。 */
export function canPubliclyCompute(id: string): boolean {
  return isToolPubliclyAvailable(id)
}

/** 历史读取：只在 read_only 或 create_allowed 时允许。 */
export function canReadHistory(id: string): boolean {
  const policy = getToolById(id)?.historyPolicy
  return policy === 'read_only' || policy === 'create_allowed'
}

/** 历史创建：只在 create_allowed 时允许。 */
export function canCreateHistory(id: string): boolean {
  return getToolById(id)?.historyPolicy === 'create_allowed'
}

/** 导出：只在 approved/public/enabled 时允许。 */
export function canExportTool(id: string): boolean {
  return isToolPubliclyAvailable(id)
}

/**
 * 状态页只接受单值的不可公开工具参数，避免 query 被伪造成任意功能状态。
 * internal + enabled 不等于普通访客可访问，因此统一进入状态页；
 * 已公开工具不显示整理中，显式依赖 isToolPubliclyAvailable 排除。
 */
export function getStatusOnlyToolFromQuery(value: unknown): ToolCatalogEntry | undefined {
  if (typeof value !== 'string') return undefined
  const tool = getToolById(value)
  if (!tool || isToolPubliclyAvailable(tool.id)) return undefined
  return tool
}
