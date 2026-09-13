# R4 确认快照与异步状态顺序收敛结果（convergence v4）

> 状态：Implemented（implemented_verification_pending）— 代码修复与回归用例编写完成，未验收、未 Accepted、未公开
>
> 日期：2026-09-09
>
> 前置审阅：[v3 静态复核](../audits/2026-09-09-r4-self-profile-convergence-v3-review.md)（P1：显示候选与冻结请求不一致/来源 await 后可能为空/同页保存来源同步晚于摘要监听；P2：旧操作扣减新账号 loading/页面清理误关新绑定频道）
>
> 计划：`.claude/plans/plan-20260909-r4-self-profile-convergence-v4.yaml`
>
> 结果：`.claude/results/20260909-r4-self-profile-convergence-v4-result.yaml`（根 status 为 `implemented_verification_pending`）
>
> 审阅：本文件供 Codex 复核，确认 `plan_amendments` 后决定接受偏差或发起进一步修正计划

## 1. 结论

v3 静态复核发现的五个残留缺口已逐项修复，回归用例只编写不运行。根状态保持 `implemented_verification_pending`：

- **未运行** typecheck/test/pretest/lint/build/preview/dev、Vitest、Nuxt prepare、浏览器验收；
- **未**初始化、读取、创建、迁移、修改或删除任何数据库文件；
- **未**安装依赖、未改锁文件、未暂存/提交/推送/合并、未改 Git 钩子、未切分支；
- 回归只编写不运行；未来运行只能在用户另行授权后。

## 2. 修复内容（逐文件）

### 2.1 confirmation-snapshot（P1 #1：显示候选与冻结请求不一致）

- `components/profile/SelfProfileSaveDialog.vue`：watcher 改为「原子作废旧确认快照」——任何 candidate/currentProfile/accountId/conflict/readiness 变化都先清勾选并把 `frozenBirthDate` 置 null（旧快照不可再次提交），不再提前 return；可确认状态下用当前 candidate/currentProfile/accountId 重新 `freezeSnapshot()`。候选与 profile 同时变化也完整处理，diff/description 与最终 payload 同源：显示新候选 B 后重新勾选提交的就是 B。
- `tests/components/self-profile.test.ts`：候选变化用例全部改用 `setProps` 真实驱动挂载组件（不再只改局部未绑定 ref）。断言：A 勾选后改 B 旧同意失效；显示 B 后重勾选发出的 raw 必须 B 而非 A；候选 B + profile v2 同时到达时 expected=v2 且 raw=B；账号变化（同 id/version）后 accountId=9；candidate null/readiness false/conflict 不发 confirm；reload 成功回传 version=2 后新快照携带 v2。

### 2.2 async-state-order（P1 #2/#3、P2 #4/#5）

- `composables/useSelfProfileDraft.ts`：
  - 新增 `originRevision` 来源代际与 `setOrigin()` 统一写入点（所有 origin 赋值/清空都递增代际）。
  - `verifyBeforeCompute` 捕获不可变 origin 快照与来源代际，await 之后先核对 `origin.value` 仍存在且 `originRevision` 未变，再比较本次成功 summary；来源被 summary watcher/通知/退出清空时返回有界失败 `no_source`，不解引用空 origin、不写新来源。
  - 注册 `profileApi.onLocalWriteCommitted` 回调（`handleLocalWriteCommitted`）：本地写成功时在 API 发布新 summary 之前同步 origin 版本——summary watcher 观察到的已是已确认版本，不会把同页保存当外部变更清空草稿；不再依赖父页面 await 后补救式 resyncOrigin。
  - `clear()` 改调 `profileApi.clearData()`（只清数据不动频道），频道归属由 useSelfProfile 账号生命周期独占管理。
- `composables/useSelfProfile.ts`：
  - loading 改为 token 集合：`opStart()` 返回唯一 token，`opEnd(token)` 只删除自己的 token；`invalidate()` 清空集合并归零。旧代际请求的 finally 不能扣减新账号 loading。
  - 新增 `onLocalWriteCommitted` 监听集合与 `notifyLocalWriteCommitted()`：save/deleteBirthDate/deleteProfile/setUsage 服务端成功且 `isWriteStale` 通过后、`profile.value`/`summary.value` 更新之前触发，携带 accountId/profileId/version；失败/CAS 冲突不触发。
  - 频道归属统一：auth watch 与 onMounted 独占绑定、登出/卸载关闭；新增 `clearData()`（仅 invalidate，不动频道）供页面个人状态清理；`clear()` 保留完整销毁语义（含关频道）供登出/卸载路径。
  - 保持请求隔离、读取有界结果与旧 GET 失效（写入开始 readSeq++）。
- `pages/tools/shengxiao.vue`：移除 `confirmSave` 成功后 await 后补救式 `resyncOrigin` 调用（来源同步协议已由桥接在 summary 发布前完成）；A→B/登出 `clearPersonalState` → `draftBridge.clear()`（现为 clearData 语义）不再误关新账号频道。
- `tests/composables/useSelfProfile.test.ts`：真实宿主延迟 Promise——A 请求在途→换 B→B 新请求→A finally 后 B loading 仍 true，B 完成后 false；本地保存成功时 `onLocalWriteCommitted` 先于 summary 发布且携带新版本，网络失败不触发成功回调；`clearData` 后频道仍在且能收到 message（真实清理路径，不手动 bind 补救）。
- `tests/components/shengxiao-page.test.ts`：保留 R3 及 v1-v3 既有断言；新增 verify 返回 `no_source` 时引擎不被调用且页面不崩溃（invalidateSource+提示）；保存成功后页面不再调用 resyncOrigin（协议前置）；外部 saved 版本变化仍原子失效（普通远端 saved 不作为授权放行）。真实桥接的 watch 先清 origin/await 安全结束/本地保存来源同步时序由 composables 宿主测试承载（本文件对 useSelfProfile/useSelfProfileDraft 为模块级 mock，无法在同文件内切换真实实现，见 plan_amendments）。

## 3. 未做与边界

- 不改旧 `/api/profiles`（仍 410）、旧档案页、`useAuth.currentProfile` 别名、旧 DB；不建立旧账户认领或历史兼容；
- 不开放工具目录/全局路由、不新增绕过围栏的调试路由；不改生肖引擎/黄金/来源，不做 R5 历史或八字计算；
- 不增加时间地点性别亲友档案、头像/完整度/长期现实状态、自动保存、自动计算或全站 UI 改版；
- 不运行任何项目代码、测试、构建、数据库操作、浏览器验收。

## 4. 静态证据

- 计划门禁校验通过（0 errors, 0 warnings）；
- HEAD `45ad4a7a7ba8762efea3fb0652b0d350996667d7`，分支 `codex/foundation-rebuild`，与计划一致；
- v4 基线 `.claude/results/20260909-r4-self-profile-convergence-v4-baseline.json` 全部 38 个非数据库文件 SHA256 匹配；dirty 清单（41 项，含目录展开）与 git 状态一致；
- v3 guard 已 inactive；v4 checkpoint 首次创建，不沿用 v1/v2/v3 completed_tasks；
- `git diff --check` 与逐文件乱码检测（AGENTS.md 命令）0 命中；
- 测试文件括号/花括号结构平衡（describe/it 计数核对）；
- token 化核对：6 处 `opStart()` 均捕获 token、6 处 `opEnd(token)`，无残留无参 `opEnd()`；`notifyLocalWriteCommitted` 在四个写方法各插入一次且位于 summary 更新之前。

## 5. plan_amendments 摘要

见 result YAML 的 `plan_amendments` 段。已知需 Codex 审阅的漂移：

1. `tests/components/shengxiao-page.test.ts` 对 `~/composables/useSelfProfile` 与 `useSelfProfileDraft` 是模块级 vi.mock，无法在同文件内切换真实实现；计划要求的「真实 useSelfProfileDraft + 响应式 summary」集成回归由 `tests/composables/useSelfProfile.test.ts` 的真实宿主测试承载（watch 先清 origin/await 安全结束/本地保存来源同步时序/clearData 频道保留均在其内）。
2. 无其他计划外文件改动；全部改动在 allowed_paths 内，known_dirty 与 allowed 严格不相交。

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
