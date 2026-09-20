import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOOL_CATALOG, isToolPubliclyAvailable } from '~/constants/tool-catalog'

/**
 * 工具可用性路由围栏测试。
 *
 * 中间件是 async：服务端读取授权内部验证白名单、把判定结果播种进 `useState`；
 * 客户端只信任该播种值，未见播种时**整页重取**（由服务端重新裁决），水合期则失败关闭。
 * 因此测试分三类：
 * - 路由行为（本文件，vitest 环境下 `import.meta.server === false`，即客户端分支）；
 * - 白名单判定本身（`tests/server/internal-verification.test.ts`）；
 * - 真实 SSR 播种与整页重取（R5-C 浏览器验收证据）。
 */

interface MiddlewareRoute {
  path: string
  fullPath: string
}

type ToolAvailabilityMiddleware = (to: MiddlewareRoute) => unknown

const navigateTo = vi.fn((target: unknown) => target)
let middleware: ToolAvailabilityMiddleware
/** 模拟 SSR 播种的 useState 容器：按 key 稳定持有，不因再次调用而重置。 */
const stateStore: Record<string, unknown> = {}
/** 模拟客户端是否处于初次水合（`useNuxtApp().isHydrating`）。 */
let isHydrating = false

/** 模拟 SSR 播种的内部验证缓存：判定值绑定播种时的账号 id。 */
function seedInternalAccess(value: {
  accountId: number | null
  decisions: Record<string, boolean>
}): void {
  stateStore['tools:internalAccess'] = value
}

/** 模拟客户端当前登录账号（useAuth 的 auth:account）。 */
function seedCurrentAccount(account: { id: number } | null): void {
  stateStore['auth:account'] = account
}

function stubNuxtGlobals(): void {
  for (const key of Object.keys(stateStore)) delete stateStore[key]
  isHydrating = false
  vi.stubGlobal('defineNuxtRouteMiddleware', (handler: ToolAvailabilityMiddleware) => handler)
  vi.stubGlobal('navigateTo', navigateTo)
  vi.stubGlobal('useRequestEvent', () => undefined)
  vi.stubGlobal('useNuxtApp', () => ({ isHydrating }))
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

/** 目录里 `internal + enabled`（内部验证通道可放行）的工具，当前应为 zeji 与 bazi。 */
const enabledInternalTools = TOOL_CATALOG.filter(
  tool => !isToolPubliclyAvailable(tool.id) && tool.computePolicy === 'enabled',
)
/** 其余不可公开工具：无论登录与否都必须进状态页。 */
const blockedTools = TOOL_CATALOG.filter(
  tool => !isToolPubliclyAvailable(tool.id) && tool.computePolicy !== 'enabled',
)

function fenceTarget(toolId: string) {
  return { path: '/tools/status', query: { tool: toolId }, replace: true }
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

  it('默认矩阵（无内部授权播种）下不可公开工具都不得放行', async () => {
    const nonPublicTools = TOOL_CATALOG.filter(tool => !isToolPubliclyAvailable(tool.id))
    expect(nonPublicTools).toHaveLength(11)
    expect(enabledInternalTools.map(tool => tool.id)).toEqual(['zeji', 'bazi'])
    expect(blockedTools).toHaveLength(9)

    for (const tool of blockedTools) {
      const target = fenceTarget(tool.id)

      await expect(middleware({ path: tool.route, fullPath: tool.route })).resolves.toEqual(target)
      expect(navigateTo).toHaveBeenLastCalledWith(target)
    }

    // computePolicy 为 enabled 的工具在未知状态下整页重取同一路径，由服务端裁决；
    // 它们绝不等价于「普通访客可访问」。
    for (const tool of enabledInternalTools) {
      await expect(middleware({ path: tool.route, fullPath: tool.route })).resolves.toBe(tool.route)
      expect(navigateTo).toHaveBeenLastCalledWith(tool.route, { external: true })
    }

    expect(navigateTo).toHaveBeenCalledTimes(nonPublicTools.length)
  })

  it('尾斜杠路径不能绕过围栏：/tools/<id>/ 与多尾斜杠都进入同一处理', async () => {
    for (const tool of TOOL_CATALOG) {
      if (tool.computePolicy === 'enabled' && !isToolPubliclyAvailable(tool.id)) {
        await expect(
          middleware({ path: `${tool.route}/`, fullPath: `${tool.route}/` }),
        ).resolves.toBe(`${tool.route}/`)
        continue
      }

      const target = fenceTarget(tool.id)

      await expect(
        middleware({ path: `${tool.route}/`, fullPath: `${tool.route}/` }),
      ).resolves.toEqual(target)
      await expect(
        middleware({ path: `${tool.route}//`, fullPath: `${tool.route}//` }),
      ).resolves.toEqual(target)
    }
  })

  it('internal + enabled 的 zeji 与 bazi 不得被当成普通访客公开能力', async () => {
    expect(isToolPubliclyAvailable('zeji')).toBe(false)
    expect(isToolPubliclyAvailable('bazi')).toBe(false)
    for (const id of ['zeji', 'bazi']) {
      // 未播种时只能是「进状态页」或「整页重取」，绝不放行。
      const result = await middleware({ path: `/tools/${id}`, fullPath: `/tools/${id}` })
      expect([fenceTarget(id), `/tools/${id}`]).toContainEqual(result)
    }
  })

  it('客户端只信任 SSR 播种的授权：播种为允许时仅放行该工具', async () => {
    // 模拟服务端已判定账号 12 对 bazi 允许内部验证并写入 useState。
    seedCurrentAccount({ id: 12 })
    stateStore['auth:status'] = 'authenticated'
    seedInternalAccess({ accountId: 12, decisions: { bazi: true } })

    await expect(
      middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' }),
    ).resolves.toBeUndefined()
    // 其余 internal + enabled 工具未播种：整页重取（服务端复判），不直接放行。
    await expect(middleware({ path: '/tools/zeji', fullPath: '/tools/zeji' })).resolves.toBe(
      '/tools/zeji',
    )
    expect(navigateTo).toHaveBeenLastCalledWith('/tools/zeji', { external: true })
  })

  it('登录后点入口链接可用：软导航整页重取，且保留完整路径', async () => {
    // 回归背景：登录是纯客户端动作，SSR payload 里没有内部工具播种值。
    // 旧实现「未知即失败关闭」使已授权账号点首页「八字（内部验证）」卡片必落到状态页。
    await expect(
      middleware({ path: '/tools/bazi', fullPath: '/tools/bazi?from=home' }),
    ).resolves.toBe('/tools/bazi?from=home')
    expect(navigateTo).toHaveBeenLastCalledWith('/tools/bazi?from=home', { external: true })
  })

  it('水合期未见播种时失败关闭，不整页重取（避免刷新死循环）', async () => {
    isHydrating = true

    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toEqual(
      fenceTarget('bazi'),
    )
    expect(navigateTo).toHaveBeenLastCalledWith(fenceTarget('bazi'))
  })

  it('播种为拒绝时不重取：直接进状态页', async () => {
    seedCurrentAccount({ id: 12 })
    stateStore['auth:status'] = 'authenticated'
    seedInternalAccess({ accountId: 12, decisions: { bazi: false } })

    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toEqual(
      fenceTarget('bazi'),
    )
    expect(navigateTo).toHaveBeenLastCalledWith(fenceTarget('bazi'))
  })

  it('退出登录后不再复用旧播种：播种的允许值只在有会话时生效', async () => {
    seedInternalAccess({ accountId: 12, decisions: { bazi: true } })
    stateStore['auth:status'] = 'guest'
    seedCurrentAccount(null)

    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toEqual(
      fenceTarget('bazi'),
    )
  })

  it('播种账号与当前账号一致且已认证：直接放行（正常复用）', async () => {
    seedCurrentAccount({ id: 12 })
    stateStore['auth:status'] = 'authenticated'
    seedInternalAccess({ accountId: 12, decisions: { bazi: true } })

    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('A→B 换号登录：非水合期整页重取，不得复用 A 的 true 直接放行', async () => {
    // A（id=12）的 SSR 播种 bazi=true，当前已换为 B（id=34）登录。
    seedCurrentAccount({ id: 34 })
    stateStore['auth:status'] = 'authenticated'
    seedInternalAccess({ accountId: 12, decisions: { bazi: true } })

    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toBe(
      '/tools/bazi',
    )
    expect(navigateTo).toHaveBeenLastCalledWith('/tools/bazi', { external: true })
  })

  it('A→B 换号登录且水合期：失败关闭，不得放行也不整页重取', async () => {
    isHydrating = true
    seedCurrentAccount({ id: 34 })
    stateStore['auth:status'] = 'authenticated'
    seedInternalAccess({ accountId: 12, decisions: { bazi: true } })

    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toEqual(
      fenceTarget('bazi'),
    )
    expect(navigateTo).toHaveBeenLastCalledWith(fenceTarget('bazi'))
  })

  it('A 的 true 播种后退出再登录 B：B 仍整页重取而不是复用 true', async () => {
    // 先以 A 播种并复用（放行）。
    seedCurrentAccount({ id: 12 })
    stateStore['auth:status'] = 'authenticated'
    seedInternalAccess({ accountId: 12, decisions: { bazi: true } })
    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toBeUndefined()

    // 退出 A：auth:status 变 guest，auth:account 清空。
    stateStore['auth:status'] = 'guest'
    seedCurrentAccount(null)
    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toEqual(
      fenceTarget('bazi'),
    )

    // 登录 B：auth:status 恢复 authenticated，当前账号变为 34，但播种仍是 A 的 12。
    stateStore['auth:status'] = 'authenticated'
    seedCurrentAccount({ id: 34 })
    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toBe(
      '/tools/bazi',
    )
    expect(navigateTo).toHaveBeenLastCalledWith('/tools/bazi', { external: true })
  })

  it('当前账号为空且 authStatus=guest：进状态页（游客不可复用任何播种）', async () => {
    seedCurrentAccount(null)
    stateStore['auth:status'] = 'guest'
    seedInternalAccess({ accountId: 12, decisions: { bazi: true } })

    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toEqual(
      fenceTarget('bazi'),
    )
  })

  it('播种 false 且账号一致：直接进状态页', async () => {
    seedCurrentAccount({ id: 12 })
    stateStore['auth:status'] = 'authenticated'
    seedInternalAccess({ accountId: 12, decisions: { bazi: false } })

    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toEqual(
      fenceTarget('bazi'),
    )
    expect(navigateTo).toHaveBeenLastCalledWith(fenceTarget('bazi'))
  })

  it('水合期同账号可复用 SSR 播种值：不因 auth 恢复中而误判跨账号', async () => {
    // 服务端渲染时已播种账号 12 的 bazi=true，客户端水合时 auth:status 仍为 restoring、
    // auth:account 尚未恢复；此时必须放行（同账号刷新），不能失败关闭。
    isHydrating = true
    stateStore['auth:status'] = 'restoring'
    seedCurrentAccount(null)
    seedInternalAccess({ accountId: 12, decisions: { bazi: true } })

    await expect(middleware({ path: '/tools/bazi', fullPath: '/tools/bazi' })).resolves.toBeUndefined()
  })

  it('允许普通非工具路由与状态页本身继续原有页面生命周期', async () => {
    for (const path of ['/tools/status', '/', '/login', '/tools/not-real-route']) {
      await expect(middleware({ path, fullPath: path })).resolves.toBeUndefined()
    }
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('名称相近的伪工具路由不被拦截', async () => {
    await expect(
      middleware({ path: '/tools/bazi-extra', fullPath: '/tools/bazi-extra' }),
    ).resolves.toBeUndefined()
    await expect(
      middleware({ path: '/tools/cezi-ish', fullPath: '/tools/cezi-ish' }),
    ).resolves.toBeUndefined()
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
