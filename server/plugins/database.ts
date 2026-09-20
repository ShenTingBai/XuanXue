import { initDb } from '../database/db'

/**
 * 数据库初始化插件。
 *
 * Nitro 的 `runNitroPlugins` 是**同步**逐个调用插件函数的
 * （node_modules/nitropack/dist/runtime/internal/app.mjs），不会 await 插件返回值。
 * 旧实现依赖「Nitro 会 await 插件返回的 Promise」这一未证实行为：首请求可能在
 * schema 建表、迁移记录与实例锁完成前进入数据库层。
 *
 * 因此这里不再返回 Promise，改为在插件执行时创建**一次**共享初始化 Promise，
 * 并注册为 request hook 的前置等待。Nitro 的 onRequest 确实
 * `await callHook("request", event)`，所以每个请求都会等待同一个初始化 Promise——
 * request hook 才是实际的请求前置边界，而不是插件返回值。
 *
 * initDb 自身带重复调用保护（返回同一 Promise），此处不做第二次调用，也不改数据库层。
 */
export default defineNitroPlugin(nitroApp => {
  const databaseReady = initDb()

  nitroApp.hooks.hook('request', async () => {
    await databaseReady
  })
})
