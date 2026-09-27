import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

/** 目录源码：用于断言不残留面向用户的开发模式派生入口。 */
const catalogSource = readFileSync(resolve(process.cwd(), 'constants/tool-catalog.ts'), 'utf-8')

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

  it('公开候选矩阵：shengxiao 与 bazi 为 approved/public/enabled', () => {
    for (const tool of TOOL_CATALOG) {
      const isPublicCandidate = tool.id === 'shengxiao' || tool.id === 'bazi'
      expect(tool.reviewStatus).toBe(isPublicCandidate ? 'approved' : 'in_review')
      expect(tool.exposure).toBe(isPublicCandidate ? 'public' : 'internal')
      // shengxiao 零服务器历史；bazi 公开计算但保存/历史仍走显式认证确认。
      expect(tool.historyPolicy).toBe(tool.id === 'bazi' ? 'create_allowed' : 'disabled')
    }
    for (const tool of TOOL_CATALOG) {
      const expectEnabled = tool.id === 'zeji' || tool.id === 'bazi' || tool.id === 'shengxiao'
      expect(tool.computePolicy).toBe(expectEnabled ? 'enabled' : 'blocked')
    }
  })

  it('shengxiao 与 bazi 对普通访客公开：公开计算与导出放行，历史策略独立', () => {
    for (const tool of TOOL_CATALOG) {
      const expectPublic = tool.id === 'shengxiao' || tool.id === 'bazi'
      // 未公开工具不能被 computePolicy 绕过。
      expect(isToolPubliclyAvailable(tool.id)).toBe(expectPublic)
      expect(canPubliclyCompute(tool.id)).toBe(expectPublic)
      expect(canExportTool(tool.id)).toBe(expectPublic)
    }
    // 公开不等于允许匿名历史：shengxiao 零服务器历史，bazi 仍要求认证后显式保存。
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
    // 已公开的 shengxiao 与 bazi 不进入状态页；其余 9 项仍按 id 返回。
    expect(getStatusOnlyToolFromQuery('shengxiao')).toBeUndefined()
    expect(getStatusOnlyToolFromQuery('bazi')).toBeUndefined()
    for (const tool of TOOL_CATALOG) {
      if (tool.id === 'shengxiao' || tool.id === 'bazi') continue
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
    // shengxiao 与 bazi 已公开：不再作为状态页工具返回。
    expect(getStatusOnlyToolFromQuery('shengxiao')).toBeUndefined()
    expect(getStatusOnlyToolFromQuery('bazi')).toBeUndefined()
    for (const tool of TOOL_CATALOG) {
      if (tool.id === 'shengxiao' || tool.id === 'bazi') continue
      expect(getStatusOnlyToolFromQuery(tool.id)?.id).toBe(tool.id)
    }
    expect(getStatusOnlyToolFromQuery(['ziwei'])).toBeUndefined()
    expect(getStatusOnlyToolFromQuery(undefined)).toBeUndefined()
    expect(getStatusOnlyToolFromQuery(null)).toBeUndefined()
    expect(getStatusOnlyToolFromQuery('unknown')).toBeUndefined()
  })

  it('getStatusOnlyToolFromQuery 逻辑显式依赖 isToolPubliclyAvailable，已公开工具不显示整理中', () => {
    // 契约验证：approved/public/enabled 的工具不再作为状态页工具返回。
    // shengxiao 与 bazi 已公开 → 必须被排除；zeji 仍 internal+enabled → 仍返回状态页工具。
    expect(isToolPubliclyAvailable('shengxiao')).toBe(true)
    expect(getStatusOnlyToolFromQuery('shengxiao')).toBeUndefined()
    expect(isToolPubliclyAvailable('bazi')).toBe(true)
    expect(getStatusOnlyToolFromQuery('bazi')).toBeUndefined()
    expect(getToolById('zeji')).toBeDefined()
    expect(getStatusOnlyToolFromQuery('zeji')?.id).toBe('zeji')
  })

  it('目录不包含面向用户的开发模式派生入口', () => {
    // 回归背景：目录曾导出 getLocalDevNavTools，把 internal + enabled 工具以
    // 「（内部验证）」命名追加进顶栏与首页。研发阶段身份不应成为用户可见产品模式，
    // 未公开工具改由开发者直接访问真实路由调试，服务端围栏照常生效。
    // 断言只针对派生入口与用户可见命名后缀；`internal`/治理注释里的「内部验证」
    // 是线上准入元数据，不在本断言范围（见计划 context）。
    expect(catalogSource).not.toContain('getLocalDevNavTools')
    expect(catalogSource).not.toContain('（内部验证）')
    expect(catalogSource).not.toContain('本地开发专用')
  })
})
