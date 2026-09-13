# R4 本人档案静态收敛结果（convergence v2）

> 状态：Implemented（implemented_verification_pending）— 代码修复与回归用例编写完成，未验收、未 Accepted、未公开
>
> 日期：2026-09-09
>
> 前置审阅：[Codex 静态审阅](../audits/2026-09-09-r4-self-profile-codex-review.md)（P1/P2 阻断清单）
>
> 计划：`.claude/plans/plan-20260909-r4-self-profile-convergence-v2.yaml`
>
> 结果：`.claude/results/20260909-r4-self-profile-convergence-v2-result.yaml`（`plan_amendments` 见下）
>
> 审阅：本文件供 Codex 审阅，确认 `plan_amendments` 后决定接受偏差或发起进一步修正计划

## 1. 结论

R4 本人档案静态审阅发现的阻断与功能缺口已逐项修复，回归用例只编写不运行。根结果保持 `implemented_verification_pending`：

- **未运行** `npm run typecheck` / `npm run test` / `npm run pretest` / `npm run lint` / `npm run build` / `npm run preview` / `npm run dev`、Vitest、Nuxt prepare、浏览器验收；
- **未**初始化、读取、创建、迁移、修改或删除任何数据库文件；
- **未**安装依赖、未改锁文件、未暂存/提交/推送/合并、未改 Git 钩子、未切分支；
- 回归只编写不运行；未来运行只能在用户另行授权后。

## 2. 修复内容（逐文件）

### 2.1 persistence-contract（P1）

- `server/database/self-profile-schema.ts`：`CHECK` 改为三分支——全空 / 公历完整（`raw_calendar='solar'` 且 `raw_is_leap_month IS NULL`）/ 农历完整（`raw_calendar='lunar'` 且 `raw_is_leap_month IN (0,1)`）；所有必填字段显式非 NULL，`calendar` 仅 solar/lunar，避免 SQLite NULL 表达式绕过约束。
- `server/services/self-profile.ts`：日期更新 SQL 由无效的 `SET col, col, ... = (...)` 修复为行值赋值 `SET (col, ...) = (?, ...)`，占位符与 `dateParams` 顺序一致；保留账号限定、id/version CAS、相同值不写、失败回滚与凭证最小化。
- `tests/server/self-profile.test.ts`：真实 sql.js 内存库用例覆盖公历 null 闰月创建/更新、农历布尔创建/更新、solar 非 null 拒绝、lunar null 及 2 拒绝、混合半空拒绝、全空允许、CAS 与凭证写失败回滚；保留原测试，不 mock 成功替代 SQL。

### 2.2 http-contract（P2）

- `server/utils/self-profile-request.ts`：`parseExpected` 显式返回 `ExpectedProfile | undefined`；`consentVersion` 明确收窄 `string | undefined`；类型导入改用 `import type`；保存/删除/usage 顶层及 consent 严格字段白名单（额外 `accountId` 等 400 且不调用写服务）；`allowed=false` 也拒绝未知字段；`mapServiceError` 返回固定 message + `data.code`/`data.field` 白名单，不任意透传 `err.message` 或输入；身份等错误保持约定 HTTP。
- `tests/server/api/self-profile.test.ts`：partial mock 保留真实 `SelfProfileServiceError`（`importOriginal` 展开），`createError` 替身返回带状态/数据的 Error 而非自身 throw；用真实领域错误类模拟；补 consent 未知字段/缺 expected/allowed=false 未知字段、`data.field` 断言；断言拒绝时写服务未调用；六路由 401/403/409/413/500 与有限 code/field 无出生值。

### 2.3 account-lifecycle（P1）

- `composables/useSelfProfile.ts`：引入代际 `generation` + 读序号/写序号分离；`watch` 观察账号 id 与认证状态，authenticated A → B 或登出都使缓存失效；`isStale`/`isWriteStale` 同时核对序号、代际与当前账号；401 在 stale 检查之后处理（旧 401 不能注销新会话）；摘要与完整档案缓存绑定账号+代际，越界读取返回 null 而非其他缓存；摘要刷新记录发起时写序号，期间有写入则丢弃本次摘要（不吞写入结果）；BroadcastChannel 真实注册/关闭，收到本账号 saved/delete_birth_date/delete_profile/usage 事件失效本地完整档案缓存并通知监听器；clear 关闭频道但保留监听器，重新认证可重新绑定；focus/visibility 提供真实注册与清理（`registerFocusRefresh`/`unregisterFocusRefresh`）。
- `tests/composables/useSelfProfile.test.ts`：改为生命周期宿主挂载（真实 watch/onBeforeUnmount 生效）；A→B 无新请求仍丢弃 A 成功与 401；登出清空完整日期；旧失败不清新 loading；summary 与写入交错不吞写入结果；真实模拟 channel 事件失效缓存；focus 事件触发摘要刷新且卸载移除监听；clear 后重新绑定。

### 2.4 draft-revocation（P1）

- `composables/useSelfProfileDraft.ts`：`requestImport` 强制 `loadProfile(true)` 并检查 `useAllowed`/`birthDate`；替换候选绑定账号、profile id/version；`confirmImport` 重核草稿/账号/授权，候选打开后编辑不覆盖；撤销快照保留原来源 id/version 与依赖关系（`UndoSnapshot`），撤销恢复准确前序来源；通知处理 saved/delete_birth_date/profile-deleted/usage：清理候选、受撤回影响快照与未提交带入字段，手改不复活已撤回资料；纯手动无依赖草稿不受无关通知影响；新增 `verifyBeforeCompute`——来源依赖档案时重查 summary 与来源版本，失败/撤回/版本变化阻止计算。
- `pages/tools/shengxiao.vue`：`handleSubmit` 异步，来源依赖档案时先 `verifyBeforeCompute()`，通过后才本地计算，网络错误不能当授权有效；focus/visibility 改用 `registerFocusRefresh`；认证/账号 A→B 清理草稿/结果/桥接；保留游客纯本地计算、年龄门、R3 日期引擎与导出围栏。
- `tests/components/shengxiao-page.test.ts`：保留 12 个 R3 测试与真实 ExportButton；新增来源依赖计算前校验（通过/网络失败/已撤回）、撤销调用、账号清理、候选转发等回归。

### 2.5 frozen-consent（P1）

- `components/profile/SelfProfileSaveDialog.vue`：`confirm` 事件携带冻结载荷 `{ expected, accountId, birthDate, consentPolicyVersion }`，父页面不得重新取可变 profile；账号 id、profile id/version、候选及授权变化使旧确认失效（不只比较 version）；`conflict` 期间禁用确认并提供显式 `reload` 事件；reload 成功由父页面重新读取并展示最新差异后重建快照，checkbox 复位；失败保留候选与可恢复错误，焦点/Tab/Escape 可用。
- `pages/tools/shengxiao.vue`：已登录保存与游客页内认证后保存走同一明确加载流程（`openSaveDialog` 先 `loadProfile(true)`）；GET 失败/401 不把 null 当无档案；`confirmSave(payload)` 只提交冻结载荷，保存期间防重复；409 提供 `reloadForConflict` 重新读取保留候选重做差异，绝不自动换 version 重试；游客认证后不自动 PUT。
- `pages/self-profile.vue`：`openSaveDialog` 强制读取；`confirmSave(payload)` 消费冻结载荷；`reloadForConflict` 补显式重新读取与 409 重做差异流程；读取成功才更换 expected 并重新同意；保留删日期/删档/使用撤回/重新允许区别。
- `tests/components/self-profile.test.ts`：新增真实对话框事件 payload 核对（首次 expected=null、有档案 id/version/accountId）、账号/profile id 同 version 变化失效、conflict 禁提交且 reload 事件、reload 成功后重新勾选携带新快照。
- `tests/components/shengxiao-page.test.ts`：已登录有旧档案保存先 GET 并展示差异、GET 失败不显示首次创建、游客认证后不自动 PUT、保存 payload 与确认一致、409 强制重读再确认。

## 3. 未做与边界

- 不改旧 `/api/profiles`（仍 410）、旧档案页、`useAuth.currentProfile` 别名、旧 DB；不建立旧账户认领或历史兼容；
- 不开放工具目录/全局路由、不新增绕过围栏的调试路由；不改生肖引擎/黄金/来源，不做 R5 历史或八字计算；
- 不增加时间地点性别亲友档案、头像/完整度/长期现实状态、自动保存、自动计算或全站 UI 改版；
- 不运行任何项目代码、测试、构建、数据库操作、浏览器验收。

## 4. 静态证据

- 计划门禁校验通过（0 errors, 0 warnings）；
- HEAD `45ad4a7a7ba8762efea3fb0652b0d350996667d7`，分支 `codex/foundation-rebuild`，与计划一致；
- v2 基线 `.claude/results/20260909-r4-self-profile-convergence-v2-baseline.json` 中 37 个非数据库文件 SHA256 全部匹配（只读核对）；
- v1 guard 已 inactive；v2 checkpoint 首次创建，不沿用 v1 completed_tasks；
- `git diff --check` 与逐文件乱码检测（AGENTS.md 命令）0 命中；
- h3 `createError`/`H3Error.data` 真实导出确认，`mapServiceError` 的 `data` DTO 合法。

## 5. plan_amendments 摘要

见 result YAML 的 `plan_amendments` 段。已知需 Codex 审阅的漂移：

1. 无计划外文件改动；全部改动在 allowed_paths 内，known_dirty 与 allowed 严格不相交。
2. v1 result 语义由 Codex 校正为 `implemented_verification_pending`（v1 执行史保留，不覆盖）。

## 6. 后续授权后验收矩阵

| 验收项       | 说明                                                                        |
| ------------ | --------------------------------------------------------------------------- |
| 自动化       | typecheck / test / lint / build 全绿（仅授权后运行）                        |
| 临时库端到端 | 日期规范化、差异确认、并发、删除、注销级联、带入撤销、页内认证、no-store/SW |
| 移动端       | 320/360/390/414 CSS px 四档宽度、200% 文本缩放                              |
| 数据库       | 未初始化/读取；验收时用临时库并核对旧库指纹不变                             |

## 7. 分支与远端清理待办

- 新分支基线为 `codex/foundation-rebuild`（含 R3 提交 `45ad4a7` 全部历史）；远端旧分支 `codex/p0-tool-availability-containment` 仍指向 `5af305e`，旧名称清理尚未完成（不伪造远端已删）。
- 本计划不触发推送钩子（无 Git 操作），也不绕过钩子。

根结果必须保持 `implemented_verification_pending`，直到上述验收完成并经用户确认。
