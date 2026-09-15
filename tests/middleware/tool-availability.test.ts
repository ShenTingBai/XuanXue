import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOOL_CATALOG, isToolPubliclyAvailable } from '~/constants/tool-catalog'

/**
 * 工具可用性路由围栏测试。
 *
 * 中间件现在是 async，并在服务端读取授权内部验证白名单、把判定结果播种进 `useState`，
 * 客户端只信任该播种值（未知即失败关闭）。因此测试分两类：
 * - 路由行为（本文件）：默认矩阵下全部重定向；客户端被播种为允许时仅放行该工具；
 * - 白名单判定本身（`tests/server/internal-verification.test.ts`）。
 */

type ToolAvailabilityMiddleware = (to: { path: string }) => unknown

const navigateTo = vi.fn((target: unknown) => target)
let middleware: ToolAvailabilityMiddleware
/** 模拟 SSR 播种的 useState 容器：按 key 稳定持有，不因再次调用而重置。 */
const stateStore: Record<string, unknown> = {}

function seedInternalAccess(value: Record<string, boolean>): void {
  stateStore['tools:internalAccess'] = value
}

function stubNuxtGlobals(): void {
  for (const key of Object.keys(stateStore)) delete stateStore[key]
  vi.stubGlobal('defineNuxtRouteMiddleware', (handler: ToolAvailabilityMiddleware) => handler)
  vi.stubGlobal('navigateTo', navigateTo)
  vi.stubGlobal('useRequestEvent', () => undefined)
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!(key in stateStore)) stateStore[key] = init()
    return {
      get value() {
        return stateStore[key]
      },
      set value(next: unknown) {
        stateStore[key] = next
      },
    }
  })
}

describe('工具可用性路由围栏', () => {
  beforeEach(async () => {
    vi.resetModules()
    navigateTo.mockClear()
    stubNuxtGlobals()

    middleware = (await import('~/middleware/tool-availability.global'))
      .default as ToolAvailabilityMiddleware
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('默认矩阵（无内部授权播种）下所有真实工具路由都重定向到统一状态页', async () => {
    const nonPublicTools = TOOL_CATALOG.filter(tool => !isToolPubliclyAvailable(tool.id))
    expect(nonPublicTools).toHaveLength(11)

    for (const tool of nonPublicTools) {
      const target = { path: '/tools/status', query: { tool: tool.id }, replace: true }

      await expect(middleware({ path: tool.route })).resolves.toEqual(target)
      expect(navigateTo).toHaveBeenLastCalledWith(target)
    }

    expect(navigateTo).toHaveBeenCalledTimes(11)
  })

  it('尾斜杠路径不能绕过围栏：/tools/<id>/ 与多尾斜杠都进入同一状态页', async () => {
    for (const tool of TOOL_CATALOG) {
      const target = { path: '/tools/status', query: { tool: tool.id }, replace: true }

      await expect(middleware({ path: `${tool.route}/` })).resolves.toEqual(target)
      await expect(middleware({ path: `${tool.route}//` })).resolves.toEqual(target)
    }
  })

  it('internal + enabled 的 zeji 与 bazi 不得被当成普通访客公开能力', async () => {
    expect(isToolPubliclyAvailable('zeji')).toBe(false)
    expect(isToolPubliclyAvailable('bazi')).toBe(false)
    for (const id of ['zeji', 'bazi']) {
      const target = { path: '/tools/status', query: { tool: id }, replace: true }
      await expect(middleware({ path: `/tools/${id}` })).resolves.toEqual(target)
    }
  })

  it('客户端只信任 SSR 播种的授权：播种为允许时仅放行该工具', async () => {
    // 模拟服务端已判定 bazi 允许内部验证并写入 useState。
    seedInternalAccess({ bazi: true })

    await expect(middleware({ path: '/tools/bazi' })).resolves.toBeUndefined()
    // 其余 internal + enabled 工具未播种，仍须重定向。
    await expect(middleware({ path: '/tools/zeji' })).resolves.toEqual({
      path: '/tools/status',
      query: { tool: 'zeji' },
      replace: true,
    })
  })

  it('允许普通非工具路由与状态页本身继续原有页面生命周期', async () => {
    await expect(middleware({ path: '/tools/status' })).resolves.toBeUndefined()
    await expect(middleware({ path: '/' })).resolves.toBeUndefined()
    await expect(middleware({ path: '/login' })).resolves.toBeUndefined()
    await expect(middleware({ path: '/tools/not-real-route' })).resolves.toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('名称相近的伪工具路由不被拦截', async () => {
    await expect(middleware({ path: '/tools/bazi-extra' })).resolves.toBeUndefined()
    await expect(middleware({ path: '/tools/cezi-ish' })).resolves.toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('bazi 路由必须服务端渲染：否则 D3 白名单永远无法播种（浏览器验收实测）', () => {
    // 回归背景：/tools/** 曾整体 ssr:false，围栏中间件因此只在客户端运行，
    // 既不服务端重定向也不播种授权结果，客户端「未知即失败关闭」使**授权账号同样被拒**，
    // 内部验证通道等于不可用（R5-B 浏览器验收：匿名与白名单账号都被重定向状态页）。
    const source = readFileSync(resolve(process.cwd(), 'nuxt.config.ts'), 'utf-8')
    const toolsRule = source.indexOf("'/tools/**'")
    const baziRule = source.indexOf("'/tools/bazi'")
    expect(toolsRule).toBeGreaterThan(-1)
    expect(baziRule, 'nuxt.config.ts 必须为 /tools/bazi 单独声明 ssr: true').toBeGreaterThan(-1)
    // 更具体的路由规则必须写在通配规则之后，才能覆盖它。
    expect(baziRule).toBeGreaterThan(toolsRule)
    const baziBlock = source.slice(baziRule, baziRule + 120)
    expect(baziBlock).toContain('ssr: true')
  })
})
