import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOOL_CATALOG } from '~/constants/tool-catalog'

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

  it('将每个隐藏工具的精确路由重定向到统一状态页', () => {
    for (const tool of TOOL_CATALOG.filter(item => item.exposure === 'hidden')) {
      const target = { path: '/tools/status', query: { tool: tool.id }, replace: true }

      expect(middleware({ path: tool.route })).toEqual(target)
      expect(navigateTo).toHaveBeenLastCalledWith(target)
    }

    expect(navigateTo).toHaveBeenCalledTimes(3)
  })

  it('允许可见工具和未知路由继续原有页面生命周期', () => {
    for (const tool of TOOL_CATALOG.filter(item => item.exposure === 'listed')) {
      expect(middleware({ path: tool.route })).toBeUndefined()
    }

    expect(middleware({ path: '/tools/not-real-route' })).toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
