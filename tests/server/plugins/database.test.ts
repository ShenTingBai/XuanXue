import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * 数据库初始化插件（server/plugins/database.ts）的请求前置等待回归测试。
 *
 * 背景：Nitro 的 `runNitroPlugins` 同步逐个调用插件函数且**不 await** 返回值，
 * 旧实现依赖「Nitro 会 await async 插件」这一未证实行为，首请求可能在
 * schema 建表、迁移与实例锁完成前进入数据库层。
 *
 * 因此测试不用源码字符串断言，而是：
 * 1. mock `initDb` 为可控 deferred Promise；
 * 2. 用 identity stub 让 defineNitroPlugin 暴露真实插件回调；
 * 3. 从假 nitroApp 捕获插件注册的 request hook，直接调用它观察等待行为。
 */

// deferred：把 initDb 的完成时机交到测试手里
const mockInitDb = vi.hoisted(() => vi.fn())
const mockHook = vi.hoisted(() => vi.fn())

vi.mock('../../../server/database/db', () => ({
  initDb: mockInitDb,
}))

vi.hoisted(() => {
  vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
})

import databasePlugin from '~/server/plugins/database'

type PluginFn = (nitroApp: unknown) => void
type RequestHook = () => Promise<void>

/** 可控 deferred：手动决定 resolve / reject 时机。 */
function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** 执行插件并捕获它注册的 request hook。 */
function runPlugin(): RequestHook {
  let hook: RequestHook | undefined
  const nitroApp = {
    hooks: {
      hook: (name: string, fn: RequestHook) => {
        mockHook(name, fn)
        if (name === 'request') hook = fn
      },
    },
  }
  ;(databasePlugin as unknown as PluginFn)(nitroApp)
  expect(hook, '插件必须注册 request hook').toBeDefined()
  return hook!
}

describe('数据库初始化插件：请求前置等待', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('插件执行时只调用一次 initDb（不依赖插件返回值被 await）', () => {
    const deferred = createDeferred<void>()
    mockInitDb.mockReturnValue(deferred.promise)

    let hook: RequestHook | undefined
    const nitroApp = {
      hooks: {
        hook: (name: string, fn: RequestHook) => {
          if (name === 'request') hook = fn
        },
      },
    }

    // 插件回调必须是同步的：返回 undefined 才证明它没有把等待寄托在插件返回值上
    const pluginReturn = (databasePlugin as unknown as PluginFn)(nitroApp)
    expect(pluginReturn).toBeUndefined()
    expect(hook).toBeDefined()
    expect(mockInitDb).toHaveBeenCalledTimes(1)

    deferred.resolve()
  })

  it('initDb 未 resolve 前，并发 request hook 都保持 pending', async () => {
    const deferred = createDeferred<void>()
    mockInitDb.mockReturnValue(deferred.promise)

    const hook = runPlugin()
    const first = hook()
    const second = hook()

    // 用微任务队列冲刷：若 hook 未真正等待，此时已 settled
    let firstSettled = false
    let secondSettled = false
    void first.then(() => {
      firstSettled = true
    })
    void second.then(() => {
      secondSettled = true
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(firstSettled).toBe(false)
    expect(secondSettled).toBe(false)

    deferred.resolve()
    await Promise.all([first, second])
    expect(firstSettled).toBe(true)
    expect(secondSettled).toBe(true)
  })

  it('resolve 后 request hook 完成，且没有第二次 initDb（共享同一 Promise）', async () => {
    const deferred = createDeferred<void>()
    mockInitDb.mockReturnValue(deferred.promise)

    const hook = runPlugin()
    const first = hook()
    const second = hook()

    deferred.resolve()
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined])

    // 两个请求共享初始化过程：initDb 只在插件执行时调用一次
    expect(mockInitDb).toHaveBeenCalledTimes(1)
  })

  it('initDb reject 时 request hook 也拒绝（失败不被伪装成已就绪）', async () => {
    const deferred = createDeferred<void>()
    mockInitDb.mockReturnValue(deferred.promise)

    const hook = runPlugin()
    const pending = hook()
    const failure = new Error('数据库初始化失败')

    deferred.reject(failure)

    await expect(pending).rejects.toThrow('数据库初始化失败')
    expect(mockInitDb).toHaveBeenCalledTimes(1)
  })
})
