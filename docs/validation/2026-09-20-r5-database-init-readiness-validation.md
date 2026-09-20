# R5 数据库初始化未等待的首请求竞态修复 · 验证记录

> 计划：`plan-20260920-r5-database-init-readiness-v1`
>
> 验证日期：2026-09-20
>
> 验证状态：**technical_verification_passed_pending_user_acceptance**（自动化验证已完成，待用户最终接受）

## 1. 背景与缺陷

`server/plugins/database.ts` 原实现导出 **async** Nitro plugin 并 `await initDb()`，
注释假设「Nitro 在启动阶段会 await 插件返回值」。该假设与本地安装的 Nitro 2.13.4
运行时语义不符：

```js
// node_modules/nitropack/dist/runtime/internal/app.mjs:156
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);          // 同步调用，未 await 返回值
    } catch (error) { ... }
  }
}
```

因此首请求可能在 `initDb` 完成（schema 建表、迁移记录、实例锁、PRAGMA）之前进入数据库层。

## 2. 修复机制

`server/plugins/database.ts` 改为**同步**插件函数：

```ts
export default defineNitroPlugin(nitroApp => {
  const databaseReady = initDb() // 插件执行时创建一次共享初始化 Promise

  nitroApp.hooks.hook('request', async () => {
    await databaseReady // 每个请求等待同一个 Promise
  })
})
```

- 插件回调同步返回 `undefined`，不再依赖 Nitro await 插件返回值。
- `initDb()` 在插件执行时**只调用一次**；`db.ts` 自身的 `initComplete` 缓存
  保证并发首请求共享同一初始化过程（不重复初始化、不竞争落盘）。
- Nitro 的 `onRequest` 确实 `await callHook("request", event)`（app.mjs:77），
  因此 request hook 是实际生效的请求前置边界。
- 未修改 `server/database/db.ts`、DB_PATH、实例锁、迁移顺序与业务 API。

## 3. 定向测试（deferred 驱动）

`tests/server/plugins/database.test.ts`（新建，4 例全过）：

| #   | 场景                | 断言                                                                      |
| --- | ------------------- | ------------------------------------------------------------------------- |
| ①   | 插件执行            | 插件回调同步返回 `undefined`；`initDb` 恰好调用 1 次；request hook 已注册 |
| ②   | deferred 未 resolve | 两个并发 request hook 均保持 pending（微任务冲刷后仍未 settled）          |
| ③   | resolve 后          | 两个 hook 都完成，且 `initDb` 仍只调用 1 次（共享同一 Promise）           |
| ④   | initDb reject       | request hook 同样 reject，失败不被伪装成已就绪                            |

测试用 `vi.mock` 把 `initDb` 替换为可控 deferred Promise，并用 identity stub 暴露真实
插件回调、从假 nitroApp 捕获其注册的 request hook 直接驱动——不是源码字符串断言。

## 4. 命令结果

| 命令                                                   | 退出码                                 |
| ------------------------------------------------------ | -------------------------------------- |
| `git diff --check`                                     | 0                                      |
| `npm run typecheck`                                    | 0（仅既有 duplicated imports warning） |
| `npx vitest run tests/server/plugins/database.test.ts` | 0（4/4）                               |
| `npm run test`                                         | 0（86 文件 / 2638 用例）               |
| `npm run build`                                        | 0                                      |

## 5. 数据库隔离

- 本次验证**未读取、未哈希、未创建、未迁移、未修改、未删除任何业务数据库文件**。
- 定向测试全部使用 `vi.mock` 替换 `initDb`，不产生任何数据库文件。
- 全量测试由 `tests/helpers/vitest-setup.ts` 按 worker 注入 `os.tmpdir()` 下的临时库路径，
  不触碰仓库内 `xuanxue-r2.db` / `xuanxue.db`。
- 未运行预览服务（本计划无浏览器验收要求）。

## 6. 未覆盖边界

- request hook 的 rejection 会被 Nitro 的 `.catch(captureError)` 捕获后请求继续（app.mjs:77-78）。
  因此初始化失败时，请求不会在 hook 层中断，而是在后续调用 `getDb()` 时抛
  「System not ready — database unavailable」。这属于既有行为，本计划未改变；
  失败传播测试（场景④）验证的是 hook 层面的拒绝语义，未覆盖 Nitro 捕获后的表现。
- 真实 Nitro 服务器上的端到端首请求竞态未做压测复现；本次以运行时源码证据
  （`runNitroPlugins` 不 await）+ hook 等待语义 + 单元测试三层证据承担。

## 7. plan_amendments

见 `.claude/results/20260920-r5-database-init-readiness-v1-result.yaml` 的
`plan_amendments` 段。

## 8. 结论

首请求竞态修复已通过全部自动化门禁，未触碰数据库层、业务数据库与上一项未提交代码。
状态为 **technical_verification_passed_pending_user_acceptance**，待用户最终接受。
