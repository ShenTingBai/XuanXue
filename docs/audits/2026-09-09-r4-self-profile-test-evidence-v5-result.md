# R4 真实桥接集成回归补证结果（test evidence v5）

> 状态：Implemented（implemented_verification_pending）— 真实桥接集成测试证据补齐，仅编写未运行、未验收、未 Accepted、未公开
>
> 日期：2026-09-09
>
> 前置审阅：[v4 静态复核](../audits/2026-09-09-r4-self-profile-convergence-v4-review.md)（证据缺口：v4 回归下沉主张不成立——单元测试未导入 useSelfProfileDraft；BroadcastChannel 替身回送自身不符浏览器语义；真实 API composable 显式 import useAuth 而测试仅 stubGlobal）
>
> 计划：`.claude/plans/plan-20260909-r4-self-profile-test-evidence-v5.yaml`
>
> 结果：`.claude/results/20260909-r4-self-profile-test-evidence-v5-result.yaml`（根 status 为 `implemented_verification_pending`）
>
> 审阅：本文件供 Codex 复核，确认 `plan_amendments` 后决定是否结束收敛循环或发起进一步计划

## 1. 结论

v4 审阅指出的测试证据缺口已补齐，本轮只新增/修正测试，不修改任何生产源码。根状态保持 `implemented_verification_pending`：

- **未运行** typecheck/test/pretest/lint/build/preview/dev、Vitest、Nuxt prepare、浏览器验收；
- **未**初始化、读取、创建、迁移、修改或删除任何数据库文件；
- **未**安装依赖、未改锁文件、未暂存/提交/推送/合并、未改 Git 钩子、未切分支；
- 测试只编写不运行；未来运行只能在用户另行授权后。

## 2. 测试证据边界（新增/修正内容）

### 2.1 API 层测试修正（tests/composables/useSelfProfile.test.ts）

- **认证模块替身修正**：真实 `useSelfProfile` 显式 `import { useAuth } from './useAuth'`，测试由 `vi.stubGlobal('useAuth')` 改为 `vi.mock('../../composables/useAuth')`（真实依赖入口模块路径），工厂经 `vi.hoisted` 容器引用共享真实 Vue refs（authStatus/currentAccount/markSessionExpired），避免 hoist 期访问未初始化变量。
- **BroadcastChannel 替身修正**：`postMessage` 只投递到同名的**其他未关闭**实例，不回送发送者自身（与浏览器语义一致）；`close()` 后不再投递。
- **真实广播语义用例**：宿主 A 广播 → A 自身不收、宿主 B 收到；B 关闭后不再收到。不依赖手调 bindChannel 补救。
- **生命周期清理强化**：`mountedWrappers` 追踪全部宿主，afterEach 先强制卸载（触发 composable onBeforeUnmount 清理监听/频道）再恢复 global 与认证状态并 `unstubAllGlobals`，即使断言失败也执行。
- 保留 token/loading、旧 401、summary/写入交错及其他有效回归，不降低断言。

### 2.2 真实桥接集成测试（tests/composables/useSelfProfileDraft.integration.test.ts，新建）

- 导入并真实运行 `useSelfProfile` 与 `useSelfProfileDraft`，在同一 Vue 宿主 setup 中共享 API 实例与真实草稿/结果回调；只 mock 认证模块、fetch 与 BroadcastChannel 外部边界，**不 mock** 桥接实现、`verifyBeforeCompute` 或摘要 watch。
- 宿主内执行真实页面接线 `api.onRemoteEvent.add(bridge.onRemoteEvent)`（等价 shengxiao.vue setup 语义）。
- 覆盖（断言最终来源/草稿/结果状态，而非仅 spy 调用顺序）：
  1. requestImport/confirmImport 真实建立来源后，延迟 fetch 使 summary 返回新版本：summary watcher 清 origin，`verifyBeforeCompute` 安全返回有界失败（stale_version 或 no_source 视 watcher 与续体先后）且无异常，旧草稿/结果被原子失效清除；
  2. 带入 → 手改 → `api.save` 成功新版本：`onLocalWriteCommitted` 在 summary watcher 可观察前更新 origin，草稿/结果保持（同页保存不被误清）；
  3. 网络失败保存不假同步来源（origin 保持 v1），草稿保留但 verify 阻止使用；
  4. 外部实例广播 usage-changed / saved 版本变化仍真实失效来源并清草稿；
  5. A→B 按实际页面清理顺序（bridge.clear → clearData）后频道保留，B 账号可重新带入，另一实例对 B 广播 profile-deleted 能清除 B 来源。
- 每例 afterEach 强制卸载 wrapper 并清理。

## 3. API 层测试与真实桥接集成测试的覆盖分工

| 层               | 文件                                                      | 覆盖                                                                                            |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| API 组合函数单元 | tests/composables/useSelfProfile.test.ts                  | 有界读取结果、代际/账号切换、token loading、本地写成功回调时序、频道生命周期/广播语义、卸载清理 |
| 真实桥接集成     | tests/composables/useSelfProfileDraft.integration.test.ts | 真实桥接注册、来源同步、summary watcher 协作、外部事件失效、同页保存时序、A→B 频道继续工作      |

## 4. 未做与边界

- 不改任何生产源码（allowed 仅含测试与审计文档；composables/components/pages/server/types/utils/constants 均禁止写）；
- 不改旧 `/api/profiles`、旧档案页、useAuth 别名或旧 DB；不建立旧账户认领或历史兼容；
- 不开放工具目录/全局路由、不新增绕过围栏的调试路由；不改生肖引擎/黄金/来源，不做 R5；
- 不运行任何项目代码、测试、构建、数据库操作、浏览器验收。

## 5. 静态证据

- 计划门禁校验通过（0 errors, 0 warnings）；
- HEAD `45ad4a7a7ba8762efea3fb0652b0d350996667d7`，分支 `codex/foundation-rebuild`，与计划一致；
- v5 基线 `.claude/results/20260909-r4-self-profile-test-evidence-v5-baseline.json` 全部 38 个非数据库文件 SHA256 匹配；dirty 清单（43 项）与 git 状态一致；生产源码非数据库指纹未变；
- v4 guard 已 inactive；v5 checkpoint 首次创建；
- `git diff --check` 与逐文件乱码检测（AGENTS.md 命令）0 命中；
- 测试文件括号/花括号结构平衡（describe/it 计数核对）。

## 6. plan_amendments 摘要

见 result YAML 的 `plan_amendments` 段。已知需 Codex 审阅的漂移：

1. 无计划外文件改动；全部改动在 allowed_paths 内，known_dirty 与 allowed 严格不相交；生产源码零改动。
2. v4 的「回归下沉」主张经本计划以独立真实桥接集成测试文件纠正，v4 原执行史不回改（证据边界见本文第 3 节）。

## 7. 后续授权后验收矩阵

| 验收项       | 说明                                                                        |
| ------------ | --------------------------------------------------------------------------- |
| 自动化       | typecheck / test / lint / build 全绿（仅授权后运行；含新集成测试文件）      |
| 临时库端到端 | 日期规范化、差异确认、并发、删除、注销级联、带入撤销、页内认证、no-store/SW |
| 移动端       | 320/360/390/414 CSS px 四档宽度、200% 文本缩放                              |
| 数据库       | 未初始化/读取；验收时用临时库并核对旧库指纹不变                             |

## 8. 分支与远端清理待办

- 新分支基线为 `codex/foundation-rebuild`（含 R3 提交 `45ad4a7` 全部历史）；远端旧分支 `codex/p0-tool-availability-containment` 仍指向 `5af305e`，旧名称清理尚未完成（不伪造远端已删）。
- 本计划不触发推送钩子（无 Git 操作），也不绕过钩子。

根状态必须保持 `implemented_verification_pending`，直到上述验收完成并经用户确认。
