# R4 本人档案剩余链路收敛结果（convergence v3）

> 状态：Implemented（implemented_verification_pending）— 代码修复与回归用例编写完成，未验收、未 Accepted、未公开
>
> 日期：2026-09-09
>
> 前置审阅：[v2 静态复核](../audits/2026-09-09-r4-self-profile-convergence-v2-review.md)（P1：通知未启动/游客认证清意图/撤回后重复计算/失败重读被当成功；P2：CHECK NULL 漏洞）
>
> 计划：`.claude/plans/plan-20260909-r4-self-profile-convergence-v3.yaml`
>
> 结果：`.claude/results/20260909-r4-self-profile-convergence-v3-result.yaml`（根 status 为 `implemented_verification_pending`）
>
> 审阅：本文件供 Codex 复核，确认 `plan_amendments` 后决定接受偏差或发起进一步修正计划

## 1. 结论

v2 静态复核发现的剩余链路缺口已逐项修复，回归用例只编写不运行。根状态保持 `implemented_verification_pending`：

- **未运行** typecheck/test/pretest/lint/build/preview/dev、Vitest、Nuxt prepare、浏览器验收；
- **未**初始化、读取、创建、迁移、修改或删除任何数据库文件；
- **未**安装依赖、未改锁文件、未暂存/提交/推送/合并、未改 Git 钩子、未切分支；
- 回归只编写不运行；未来运行只能在用户另行授权后。

## 2. 修复内容（逐文件）

### 2.1 channel-lifecycle（P1）

- `composables/useSelfProfile.ts`：
  - 频道在真实生命周期绑定：组合函数 `onMounted`（客户端已登录）与 auth watch（登录/换账号自动 `bindChannel`，登出/guest 关闭）共同驱动，不再只暴露方法；SSR 无 BroadcastChannel 时 `createChannel` 返回 null，不创建 Node 频道。
  - 通知处理 `handleRemoteEvent`：先 `readSeq++` 使在途读取过期，再清缓存（profile 命中清空）并派发元数据；晚到 GET 因序号过期返回 stale，不能恢复已撤回/删除资料；不取消已获服务端成功的写结果。
  - 卸载 `onBeforeUnmount`：`invalidate()` 使所有旧请求无法更新敏感 ref，关闭频道、移除焦点监听并清空监听器。
  - 读接口有界结果：`SummaryReadResult`/`ProfileReadResult` = success（含成功 null）/failure/unauthenticated/stale；`loadSummary`/`loadProfile` 全路径返回有界结果，调用方不再把失败当成功 null。
  - 写入开始 `beginWrite` 同时 `readSeq++`：旧 GET 不能覆盖写入后的新状态；`loading` 改为未完成操作计数（`opStart`/`opEnd`），不被过期请求提前清掉。
  - focus/visibility 成功刷新摘要后，草稿桥接经 summary 差异比较版本/授权并失效候选/撤销/来源；网络失败保持阻止使用。
- `tests/composables/useSelfProfile.test.ts`：全部用例经生命周期宿主挂载（真实 onMounted/watch/onBeforeUnmount）；真实 message 事件、账户切换、卸载与 focus 事件驱动；延迟 GET 在撤回/删除/新写入之后返回不能恢复旧 profile 或覆盖新 summary；过期 401 不注销新账号；成功无档案与失败/过期结果可区分；卸载使旧请求无法更新 ref 并关闭频道；所有 wrapper/listener 清理。

### 2.2 guest-and-revocation（P1）

- `composables/useSelfProfileDraft.ts`：
  - 引入 `origin`（账号/id/version）元数据：带入时设置，手改（`onManualEdit`）只把来源标 manual 但保留 origin，不能用单一 manual 标记掩盖撤回约束。
  - 原子失效 `invalidateSource`：清受影响页面日期/结果、候选、撤销缓存与来源元数据（经 `clearImportedDraft`/`clearResult` 回调）；通知（profile-deleted/usage/birth-date-deleted/saved 版本变化）与成功 summary 差异共用。
  - `verifyBeforeCompute` 使用本次成功 summary（`loadSummary(true)` 有界结果）核对来源版本/授权；网络失败/过期保留草稿但禁止依赖资料计算。
  - `requestImport` 按有界结果仅在 success 且有档案、useAllowed 时建立候选；stale 响应不改变新候选。
  - `resyncOrigin`：同页保存成功后来源版本同步，避免误判失效。
- `pages/tools/shengxiao.vue`：
  - 认证 watch 区分：authenticated A→B 与登出清理个人状态；guest→authenticated（页内登录）保留游客草稿/结果/年龄与显式保存意图，绝不自动 PUT。
  - `handleSubmit` 捕获输入修订号、账号/认证代际、年龄声明与来源，await 校验后逐项重核；编辑/退出/改未成年/来源失效/卸载取消旧提交；阻止重复在途提交。
  - 撤回/删除/版本变化（verify 返回 revoked/stale_version/no_profile）调用 `invalidateSource` 原子失效并提示；第二次点击也不能按 manual 计算旧日期。
  - 保存读取/重读按新版有界结果处理；保存成功 `resyncOrigin`。
- `tests/components/shengxiao-page.test.ts`：保留 12 个 R3 用例与真实 ExportButton；新增：来源依赖计算前校验（通过/网络失败不清草稿/revoked 原子失效/版本变化）、await 期间手改取消旧提交、撤销调用、A→B 清理、真实 AuthDialog 认证事件（同时更新 authStatus/currentAccount，保留草稿进入差异确认不自动 PUT）、页头登录不触发保存等。

### 2.3 confirmed-save（P1）

- `components/profile/SelfProfileSaveDialog.vue`：
  - 新增 `readiness` 与 `accountId` props：读取失败/过期/会话失效（readiness=false）时不可生成可确认差异，禁用勾选与确认并提供 reload；首次无档案也绑定真实账号 id。
  - 打开时冻结 expected、accountId 与 raw 候选的复制（`frozenBirthDate`），`handleConfirm` 不读可变 `props.candidate.raw`。
  - 任一账号/candidate/id/version/授权/readiness 变化使旧同意失效并清空勾选；仅显式成功重读后展示新差异并重新勾选。
- `pages/self-profile.vue`：open/reload 使用明确读取结果，仅 success 且账号/弹框意图未变才 readiness=true/清 conflict/重建差异；失败不假装空档、不解除冲突，候选保留但不能保存；confirm 核对 payload.accountId 与当前账号；saveIntentSeq 阻止晚到异步流程重新打开已关闭弹框。
- `pages/tools/shengxiao.vue`：保存 open/reload 采用同样明确读取状态、账号/草稿修订号与弹框意图边界；GET 失败不显示可确认新增；confirm 核对真实 payload.accountId；409 重读失败继续禁提交，成功重读才解除并重新同意；退出/关闭/游客取消意图使晚到 GET 不能重新弹窗。
- `tests/components/self-profile.test.ts`：真实对话框事件 payload 核对（冻结复制、expected/accountId/consent 版本）；readiness=false 禁勾选/确认并 reload、false→true 恢复后重新勾选才能确认；账号/profile id 同 version 变化失效；reload 成功后携带新快照。
- `tests/components/shengxiao-page.test.ts`：补成功读取 null 首次创建（expected=null 才 PUT）、保存意图取消后晚到读取不重开弹框、409 重读失败保持冲突与禁提交、重读成功才解除。

### 2.4 nullable-check（P2）

- `server/database/self-profile-schema.ts`：公历/农历完整分支显式 `raw_calendar IS NOT NULL AND raw_calendar = 'solar'/'lunar'`，避免 NULL 比较产生 NULL 使整个 CHECK 放行；保留全空分支与公历 null 闰月/农历 0/1 合法契约。
- `tests/server/self-profile.test.ts`：真实内存 SQL 反例——raw_calendar=NULL 但其余公历字段完整拒绝；raw_calendar=NULL 但其余农历字段完整（含闰月 0/1）拒绝；lunar 行闰月为 NULL 拒绝；全空允许；保留公历/农历正常保存、更新及 CAS/rollback。

## 3. 未做与边界

- 不改旧 `/api/profiles`（仍 410）、旧档案页、`useAuth.currentProfile` 别名、旧 DB；不建立旧账户认领或历史兼容；
- 不开放工具目录/全局路由、不新增绕过围栏的调试路由；不改生肖引擎/黄金/来源，不做 R5 历史或八字计算；
- 不增加时间地点性别亲友档案、头像/完整度/长期现实状态、自动保存、自动计算或全站 UI 改版；
- 不运行任何项目代码、测试、构建、数据库操作、浏览器验收。

## 4. 静态证据

- 计划门禁校验通过（0 errors, 0 warnings）；
- HEAD `45ad4a7a7ba8762efea3fb0652b0d350996667d7`，分支 `codex/foundation-rebuild`，与计划一致；
- v3 基线 `.claude/results/20260909-r4-self-profile-convergence-v3-baseline.json` 全部 38 个非数据库文件 SHA256 匹配；dirty 清单与 git 状态一致（目录级 untracked 属预期）；
- v2 guard 已 inactive；v3 checkpoint 首次创建，不沿用 v1/v2 completed_tasks；
- `git diff --check` 与逐文件乱码检测（AGENTS.md 命令）0 命中；
- 测试文件括号/花括号结构平衡（describe/it 计数核对）。

## 5. plan_amendments 摘要

见 result YAML 的 `plan_amendments` 段。已知需 Codex 审阅的漂移：

1. 无计划外文件改动；全部改动在 allowed_paths 内，known_dirty 与 allowed 严格不相交。
2. v3 执行期间未发生新的外部 Git 事件（HEAD/分支保持计划基线）。

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

根状态必须保持 `implemented_verification_pending`，直到上述验收完成并经用户确认。
