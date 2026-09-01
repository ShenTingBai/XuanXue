/**
 * 工具入口状态目录。
 *
 * P0 只约束入口曝光，不评价工具规则、结果质量或保存策略；后续专项审核会独立处理。
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

export type ToolExposure = 'listed' | 'hidden'

export interface ToolCatalogEntry {
  id: ToolId
  name: string
  route: string
  exposure: ToolExposure
}

export const TOOL_CATALOG: readonly ToolCatalogEntry[] = [
  { id: 'shengxiao', name: '生肖', route: '/tools/shengxiao', exposure: 'listed' },
  { id: 'constellation', name: '星座', route: '/tools/constellation', exposure: 'listed' },
  { id: 'zeji', name: '择日', route: '/tools/zeji', exposure: 'listed' },
  { id: 'bazi', name: '八字', route: '/tools/bazi', exposure: 'listed' },
  { id: 'name-test', name: '姓名', route: '/tools/name-test', exposure: 'listed' },
  { id: 'cezi', name: '测字', route: '/tools/cezi', exposure: 'listed' },
  { id: 'guming', name: '称骨', route: '/tools/guming', exposure: 'listed' },
  // 隐藏工具保留既有路由和数据，P0 仅阻止新的入口曝光与计算生命周期。
  { id: 'ziwei', name: '紫微斗数', route: '/tools/ziwei', exposure: 'hidden' },
  { id: 'yijing', name: '六爻', route: '/tools/yijing', exposure: 'listed' },
  { id: 'hehun', name: '合婚', route: '/tools/hehun', exposure: 'hidden' },
  { id: 'meihua', name: '梅花', route: '/tools/meihua', exposure: 'hidden' },
]

export function getToolById(id: string): ToolCatalogEntry | undefined {
  return TOOL_CATALOG.find(tool => tool.id === id)
}

export function getToolByRoute(route: string): ToolCatalogEntry | undefined {
  return TOOL_CATALOG.find(tool => tool.route === route)
}

export function shouldListTool(id: string): boolean {
  return getToolById(id)?.exposure === 'listed'
}

/**
 * 历史数据不应绕过工具入口围栏，保留可见项原有的时间排序。
 */
export function filterListedToolRecords<T extends { type: string }>(records: readonly T[]): T[] {
  return records.filter(record => shouldListTool(record.type))
}

/**
 * 状态页只接受单值的隐藏工具参数，避免 query 被伪造成任意功能状态。
 */
export function getHiddenToolFromQuery(value: unknown): ToolCatalogEntry | undefined {
  if (typeof value !== 'string') return undefined

  const tool = getToolById(value)
  return tool?.exposure === 'hidden' ? tool : undefined
}
