# R5 内部验证路由跨账号权限缓存复用修复 · 验证记录

> 计划：`plan-20260920-r5-internal-access-account-binding-v1`
>
> 验证日期：2026-09-20
>
> 验证状态：**technical_verification_passed_pending_user_acceptance**（自动化与临时库浏览器验收已完成，待用户最终接受）

## 1. 背景与缺陷

`middleware/tool-availability.global.ts` 原实现把 SSR 播种的内部验证允许值按工具缓存为
`Record<string, boolean>`，客户端复用条件只检查 `authStatus !== 'guest'`，不检查播种时的
账号与当前账号是否一致。因此账号 A（白名单）的 `true` 播种在退出后换号登录 B 时，
B 会因 `authStatus === 'authenticated'` 直接复用 A 的允许值——非白名单账号被放行。

## 2. 修复内容

将 `tools:internalAccess` 状态从 `Record<string, boolean>` 改为账号边界结构：

```ts
interface InternalAccessCache {
  accountId: number | null   // 播种时服务端取得的可信账号 id
  decisions: Record<string, boolean>  // 工具 id → 是否放行
}
```

- **服务端**：SSR 裁决后写入 `{ accountId, decisions }`；账号变化时丢弃旧账号全部判定。
- **客户端**：游客态一律失败关闭；当前账号与播种 `accountId` 不一致（或缺失）时
  不得读取 `decisions`——非水合期整页重取由服务端重新裁决，水合期失败关闭；
  账号一致时保留 true / false / 未知三分支原行为。
- 未修改：`useAuth.ts`、`internal-verification.ts`、`result-history-request.ts`、
  `tool-catalog.ts`、数据库与会话协议。服务端 `assertInternalAccessIfNotPublic`
  二次校验边界不变，白名单仍是唯一安全边界。

## 3. 回归测试矩阵

新增 7 个账号切换/会话生命周期测试，连同既有围栏断言共 18 例全部通过：

| # | 场景 | 预期 |
|---|------|------|
| ① | 播种 `accountId=12` + 当前 `auth:account.id=12` + authenticated | bazi 放行 |
| ② | 同一播种 + 当前账号 id=34（A→B）非水合期 | 整页重取 `external: true`，不放行 |
| ③ | 当前账号为空 + authStatus=guest | 进状态页 |
| ④ | A 的 true 播种 → 退出 → 登录 B | B 整页重取，不复用 true |
| ⑤ | A→B 且水合期 | 失败关闭，不重取 |
| ⑥ | 播种 false + 账号一致 | 直接进状态页 |
| ⑦ | 水合期同账号 | 复用 SSR 播种值放行（不误判跨账号） |
| 既有 | 未播种未知值、尾斜杠、伪工具路由、SSR 配置 | 保持原行为 |

## 4. 命令结果

| 命令 | 退出码 |
|------|--------|
| `git diff --check` | 0 |
| `npm run typecheck` | 0（仅既有 duplicated imports warning） |
| `npx vitest run tests/middleware/tool-availability.test.ts` | 0（18/18） |
| `npm run test` | 0（85 文件 / 2634 用例） |
| `npm run build` | 0 |

## 5. 临时库浏览器验收（A→B）

- 使用系统临时目录 `/tmp/xuanxue-r5-browser-*` 下的独立临时数据库（`DB_PATH` 指向临时库），
  未读取/修改业务数据库 `xuanxue-r2.db`（SHA256 验收前后均为 `d2025fee…f78c5` 不变）。
- 生产构建 `node .output/server/index.mjs` + `XUANXUE_INTERNAL_TOOLS=bazi:1` 启动预览。

| 步骤 | 结果 |
|------|------|
| 注册白名单账号 A（id=1），访问 `/tools/bazi` | ✅ 进入八字页（URL 保持 `/tools/bazi`） |
| 退出 A（游客态）访问 `/tools/bazi` | ✅ 回到 `/tools/status?tool=bazi` |
| 注册非白名单账号 B（id=2）登录后访问 `/tools/bazi` | ✅ 回到 `/tools/status?tool=bazi`，**未复用 A 的 true** |

浏览器验证证明：服务端白名单是唯一放行来源，客户端旧账号播种无法放行新账号。

## 6. 未覆盖边界（记录）

- 多设备/多会话并发切换：本次为单浏览器顺序流程验证，并发会话切换由 `useAuth` 恢复逻辑与
  服务端会话协议承担，不在本计划范围。
- `zeji` 工具的账号切换：与 `bazi` 共用同一中间件路径与状态结构，行为等价，未单独浏览器验证。
- 业务数据库在任何步骤均未被读取、修改或删除；临时库仅存在于系统临时目录，已删除。

## 7. plan_amendments

见 `.claude/results/20260920-r5-internal-access-account-binding-v1-result.yaml` 的
`plan_amendments` 段。主要偏差：SSR 播种的账号变化处理改为丢弃旧账号全部判定（而非保留
仅更新当前工具），更严格；客户端水合期处理补充了「同账号刷新不误判跨账号」的恢复中场景。

## 8. 结论

账号边界修复已通过全部自动化门禁与临时库浏览器验收，未触碰白名单、useAuth、数据库与
公开围栏。状态为 **technical_verification_passed_pending_user_acceptance**，待用户最终接受。
