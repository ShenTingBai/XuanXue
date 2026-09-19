import { initDb } from '../database/db'

/**
 * 数据库初始化插件。
 *
 * 这里**有意**返回 Promise：Nitro 在启动阶段会 await 插件返回值，从而保证开始处理请求前
 * 数据库已完成初始化。若为迁就类型而改成不返回 Promise，请求可能在 initDb 完成前到达。
 *
 * `defineNitroPlugin` 的类型只声明 `() => void`，属 Nitro 类型定义不精确（运行时确实 await），
 * 因此这一处按真实语义保留 async 并显式说明，而不是放弃等待。
 */
// eslint-disable-next-line @typescript-eslint/no-misused-promises -- 见上：Nitro 类型不精确，运行时 await 插件返回值
export default defineNitroPlugin(async () => {
  await initDb()
})
