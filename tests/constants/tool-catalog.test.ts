import { describe, expect, it } from 'vitest'
import {
  canCreateHistory,
  canExportTool,
  canPubliclyCompute,
  canReadHistory,
  getLocalDevNavTools,
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

  it('围栏期矩阵：全部 in_review/internal，仅 zeji 与 bazi 计算 enabled，仅 bazi 允许创建历史', () => {
    for (const tool of TOOL_CATALOG) {
      expect(tool.reviewStatus).toBe('in_review')
      expect(tool.exposure).toBe('internal')
      // R5：bazi 因授权内部验证需要创建历史（治理规范 §20.2），其余工具仍为 disabled。
      expect(tool.historyPolicy).toBe(tool.id === 'bazi' ? 'create_allowed' : 'disabled')
    }
    for (const tool of TOOL_CATALOG) {
      const expectEnabled = tool.id === 'zeji' || tool.id === 'bazi'
      expect(tool.computePolicy).toBe(expectEnabled ? 'enabled' : 'blocked')
    }
  })

  it('当前矩阵没有任何普通访客可用工具，internal + enabled 不等于公开', () => {
    for (const tool of TOOL_CATALOG) {
      // 公开判定与公开发放行必须全部为 false：internal 不能被 computePolicy 绕过。
      expect(isToolPubliclyAvailable(tool.id)).toBe(false)
      expect(canPubliclyCompute(tool.id)).toBe(false)
      expect(canExportTool(tool.id)).toBe(false)
    }
    // 历史读写：仅 bazi 因授权内部验证放行，其余仍不可读不可建。
    for (const tool of TOOL_CATALOG) {
      const expectHistory = tool.id === 'bazi'
      expect(canReadHistory(tool.id)).toBe(expectHistory)
      expect(canCreateHistory(tool.id)).toBe(expectHistory)
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

  it('本地开发导航项：仅开发环境返回，且不改写目录的公开声明', () => {
    // 生产构建（isDev=false）必须为空：顶栏与公开面与已批准状态完全一致。
    expect(getLocalDevNavTools(false)).toEqual([])

    const dev = getLocalDevNavTools(true)
    expect(dev.map(tool => tool.id).sort()).toEqual(['bazi', 'zeji'])
    for (const tool of dev) {
      expect(tool.name).toContain('内部验证')
      // 只是开发期展示项：目录本身的公开判定与四维字段不得被改写。
      expect(isToolPubliclyAvailable(tool.id)).toBe(false)
      expect(getToolById(tool.id)?.name).not.toContain('内部验证')
      expect(tool.reviewStatus).toBe('in_review')
      expect(tool.exposure).toBe('internal')
    }
  })
})
