import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOOL_CATALOG, isToolPubliclyAvailable } from '~/constants/tool-catalog'

type ToolAvailabilityMiddleware = (to: { path: string }) => unknown

const navigateTo = vi.fn((target: unknown) => target)
let middleware: ToolAvailabilityMiddleware

describe('工具可用性路由围栏', () => {
  beforeEach(async () => {
    vi.resetModules()
    navigateTo.mockClear()
    vi.stubGlobal('defineNuxtRouteMiddleware', (handler: ToolAvailabilityMiddleware) => handler)
    vi.stubGlobal('navigateTo', navigateTo)

    middleware = (await import('~/middleware/tool-availability.global'))
      .default as ToolAvailabilityMiddleware
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('当前矩阵下所有真实工具路由都在页面挂载前重定向到统一状态页', () => {
    const nonPublicTools = TOOL_CATALOG.filter(tool => !isToolPubliclyAvailable(tool.id))
    expect(nonPublicTools).toHaveLength(11)

    for (const tool of nonPublicTools) {
      const target = { path: '/tools/status', query: { tool: tool.id }, replace: true }

      expect(middleware({ path: tool.route })).toEqual(target)
      expect(navigateTo).toHaveBeenLastCalledWith(target)
    }

    expect(navigateTo).toHaveBeenCalledTimes(11)
  })

  it('尾斜杠路径不能绕过围栏：/tools/<id>/ 与多尾斜杠都进入同一状态页', () => {
    for (const tool of TOOL_CATALOG) {
      const target = { path: '/tools/status', query: { tool: tool.id }, replace: true }

      expect(middleware({ path: `${tool.route}/` })).toEqual(target)
      expect(middleware({ path: `${tool.route}//` })).toEqual(target)
    }
  })

  it('internal + enabled 的 zeji 不得被当成普通访客公开能力', () => {
    expect(isToolPubliclyAvailable('zeji')).toBe(false)
    const target = { path: '/tools/status', query: { tool: 'zeji' }, replace: true }
    expect(middleware({ path: '/tools/zeji' })).toEqual(target)
    expect(middleware({ path: '/tools/zeji/' })).toEqual(target)
  })

  it('允许普通非工具路由与状态页本身继续原有页面生命周期', () => {
    expect(middleware({ path: '/tools/status' })).toBeUndefined()
    expect(middleware({ path: '/' })).toBeUndefined()
    expect(middleware({ path: '/login' })).toBeUndefined()
    expect(middleware({ path: '/tools/not-real-route' })).toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('名称相近的伪工具路由不被拦截', () => {
    expect(middleware({ path: '/tools/bazi-extra' })).toBeUndefined()
    expect(middleware({ path: '/tools/cezi-ish' })).toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
