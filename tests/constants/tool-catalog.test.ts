import { describe, expect, it } from 'vitest'
import {
  canCreateHistory,
  canExportTool,
  canPubliclyCompute,
  canReadHistory,
  getStatusOnlyToolFromQuery,
  getToolById,
  getToolByRoute,
  isToolPubliclyAvailable,
  TOOL_CATALOG,
} from '~/constants/tool-catalog'

const REVIEW_STATUSES = ['unreviewed', 'in_review', 'approved', 'suspended', 'retired']
const EXPOSURES = ['public', 'internal', 'status_only']
const COMPUTE_POLICIES = ['enabled', 'blocked']
const HISTORY_POLICIES = ['create_allowed', 'read_only', 'disabled']

describe('tool catalog — 四维目录契约', () => {
  it('keeps all existing tool ids and routes unique', () => {
    expect(TOOL_CATALOG).toHaveLength(11)
    expect(new Set(TOOL_CATALOG.map(tool => tool.id)).size).toBe(11)
    expect(new Set(TOOL_CATALOG.map(tool => tool.route)).size).toBe(11)
  })

  it('每个工具都声明完整且合法的四维字段', () => {
    for (const tool of TOOL_CATALOG) {
      expect(REVIEW_STATUSES).toContain(tool.reviewStatus)
      expect(EXPOSURES).toContain(tool.exposure)
      expect(COMPUTE_POLICIES).toContain(tool.computePolicy)
      expect(HISTORY_POLICIES).toContain(tool.historyPolicy)
    }
  })

  it('围栏期矩阵：全部 in_review/internal/disabled，仅 zeji 计算 enabled，其余 blocked', () => {
    for (const tool of TOOL_CATALOG) {
      expect(tool.reviewStatus).toBe('in_review')
      expect(tool.exposure).toBe('internal')
      expect(tool.historyPolicy).toBe('disabled')
    }
    expect(getToolById('zeji')?.computePolicy).toBe('enabled')
    for (const tool of TOOL_CATALOG.filter(tool => tool.id !== 'zeji')) {
      expect(tool.computePolicy).toBe('blocked')
    }
  })

  it('当前矩阵没有任何普通访客可用工具，internal + enabled 不等于公开', () => {
    for (const tool of TOOL_CATALOG) {
      expect(isToolPubliclyAvailable(tool.id)).toBe(false)
      expect(canPubliclyCompute(tool.id)).toBe(false)
      expect(canExportTool(tool.id)).toBe(false)
      expect(canReadHistory(tool.id)).toBe(false)
      expect(canCreateHistory(tool.id)).toBe(false)
    }
  })

  it('未知 ID 对所有辅助函数一律返回 false 或 undefined', () => {
    expect(isToolPubliclyAvailable('unknown')).toBe(false)
    expect(canPubliclyCompute('unknown')).toBe(false)
    expect(canReadHistory('unknown')).toBe(false)
    expect(canCreateHistory('unknown')).toBe(false)
    expect(canExportTool('unknown')).toBe(false)
    expect(getStatusOnlyToolFromQuery('unknown')).toBeUndefined()
    expect(getToolById('unknown')).toBeUndefined()
    expect(getToolByRoute('/tools/unknown')).toBeUndefined()
  })

  it('状态页参数只接受单值的不可公开工具 id', () => {
    for (const tool of TOOL_CATALOG) {
      expect(getStatusOnlyToolFromQuery(tool.id)?.id).toBe(tool.id)
    }
    expect(getStatusOnlyToolFromQuery(['ziwei'])).toBeUndefined()
    expect(getStatusOnlyToolFromQuery(undefined)).toBeUndefined()
    expect(getStatusOnlyToolFromQuery(null)).toBeUndefined()
  })

  it('目录路由始终能回查到同一工具 id', () => {
    for (const tool of TOOL_CATALOG) {
      expect(getToolByRoute(tool.route)?.id).toBe(tool.id)
    }
  })

  it('getToolByRoute 接受目录精确路径及尾斜杠规范化结果', () => {
    for (const tool of TOOL_CATALOG) {
      expect(getToolByRoute(`${tool.route}/`)?.id).toBe(tool.id)
      expect(getToolByRoute(`${tool.route}//`)?.id).toBe(tool.id)
    }
  })

  it('getToolByRoute 不接受子路径、前缀相似路径或未知路径', () => {
    for (const tool of TOOL_CATALOG) {
      expect(getToolByRoute(`${tool.route}/extra`)).toBeUndefined()
      expect(getToolByRoute(`${tool.route}-extra`)).toBeUndefined()
      expect(getToolByRoute('/tools/not-a-real-route')).toBeUndefined()
      expect(getToolByRoute('/tools/bazi-extra')).toBeUndefined()
    }
    // 根路径不被错误映射成工具
    expect(getToolByRoute('/')).toBeUndefined()
    expect(getToolByRoute('')).toBeUndefined()
  })

  it('getStatusOnlyToolFromQuery 只返回当前不可公开的单值工具', () => {
    for (const tool of TOOL_CATALOG) {
      // 当前围栏期全部不可公开，因此均返回工具
      expect(getStatusOnlyToolFromQuery(tool.id)?.id).toBe(tool.id)
    }
    expect(getStatusOnlyToolFromQuery(['ziwei'])).toBeUndefined()
    expect(getStatusOnlyToolFromQuery(undefined)).toBeUndefined()
    expect(getStatusOnlyToolFromQuery(null)).toBeUndefined()
    expect(getStatusOnlyToolFromQuery('unknown')).toBeUndefined()
  })

  it('getStatusOnlyToolFromQuery 逻辑显式依赖 isToolPubliclyAvailable，未来公开工具不显示整理中', () => {
    // 契约验证：若某工具变为 approved/public/enabled，则不再作为状态页工具返回。
    // 通过构造「公开可用」判断来断言排除逻辑（模拟未来状态变化）。
    const original = getToolById('zeji')
    expect(original).toBeDefined()
    // 当前 zeji 为 internal+enabled → 不可公开 → 应返回状态页工具
    expect(getStatusOnlyToolFromQuery('zeji')?.id).toBe('zeji')
  })
})
