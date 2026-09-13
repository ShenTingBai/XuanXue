# R4 本人档案静态审阅

日期：2026-09-09。审阅基线：`45ad4a7a7ba8762efea3fb0652b0d350996667d7`，分支 `codex/foundation-rebuild`，其上保留 R4 未提交实现。结论：需要返修，状态 `implemented_verification_pending`；没有运行类型检查、测试、构建、浏览器或数据库。

## 阻断与功能缺口

1. **P1，公历保存被数据库约束拒绝。** `server/database/self-profile-schema.ts` 的完整日期分支要求 `raw_is_leap_month IS NOT NULL`，但公历契约和服务 `dateParams` 明确写 null。所有合法公历首次保存均与 CHECK 冲突。必须分别约束全空、公历完整（闰月 null）、农历完整（闰月 0/1），防止 SQLite NULL 表达式绕过约束。
2. **P1，日期更新 SQL 无效。** `server/services/self-profile.ts` 将列名列表插入 `SET raw_calendar, raw_year, ... = (...)`，缺少行值赋值左侧括号。应采用逐列赋值或正确行值语法，保留参数化、CAS 和凭证回滚；真实内存 SQL 用例应覆盖公历与农历创建及更新。
3. **P1，账号隔离与旧响应处理不完整。** `useSelfProfile.isStale` 只比较请求期间保存的 `boundAccountId`，没有比较当前账号；组合函数也不观察账号切换。生肖页只监听 authStatus，authenticated A → authenticated B 不会清理。多个 catch 在检查请求是否过期前处理 401，旧账号的晚到 401 可使新会话失效。缓存读取、成功、失败和 finally 都需要同一账号/代际边界。
4. **P1，撤回、删除和跨页面失效未接通。** 全项目调用点没有调用 `bindChannel`；监听器不会工作。草稿桥接未处理 `birth-date-deleted`，手改标 manual 后提前返回还会留下依赖档案的撤销缓存；导入未校验 `useAllowed`。focus 仅更新 summary，没有与来源 id/version 比较；提交计算也不重查来源，缓存资料可能在撤回后继续带入或计算。替换候选确认和撤销必须绑定账号及来源版本，并在编辑/失效时取消。
5. **P1，差异确认与并发版本没有绑定。** `SelfProfileSaveDialog` 的 `frozenExpected` 没有进入 confirm 事件，父页面提交时从可变 profile 重新取 expected。已登录生肖页打开保存框前没有读取当前档案，容易把已有档案当首次新增；读取失败也可能继续显示无档案差异。409 只显示文字，缺少完整的显式重新读取、重做差异与重新勾选链路。应提交被冻结的候选和版本，旧确认不可自动适用新版本。
6. **P2，HTTP 契约与类型存在缺口。** `parseExpected(): ExpectedProfile` 却返回 undefined；`parseUsageRequest` 的 consentVersion 需要明确收窄。保存、删除、使用授权的顶层及 consent 未执行完整字段白名单；伪造 accountId 目前可被静默丢弃（不是已证实越权，但违反拒绝未知字段契约）。`mapServiceError` 没有返回约定的有限 code/field。需完善固定错误 DTO，禁止回显出生值。
7. **P2，测试的依赖替身与真实入口不一致。** API 测试只给服务模块提供 `selfProfileService`，真实边界却导入 `SelfProfileServiceError`；模拟普通 Error 上加 code 也不满足 instanceof。导入的 h3 API 不能仅用全局 stub 替代。部分焦点/广播测试直接调用辅助函数，不能证明页面已注册事件。应补真实调用链回归，保留已有 R3 断言，不宣称未运行用例已经通过。

## 计划偏差裁决与基线衔接

- 分支改名、R3 提交和推送均由用户明确授权，并已执行；接受此偏差，不再请求重复确认。R3 提交包含 24 个 R3 文件，R4 当前实现保留为工作区增量；远端新分支已核对为同一提交。
- 原 v1 计划和 baseline/checkpoint 的执行起点保留为历史证据，不将 task-1 的 `5af305e` 改写成事后提交，也不把已经开始执行的 v1 冒充新基线计划。v2 收敛计划使用 `45ad4a7` 与 R4 非数据库文件指纹，另行开始执行。
- v1 result 的 `status: success` 与约定不符，直接更正为 `implemented_verification_pending`；8 个任务的实施完成记录保留，不代表功能验收通过。
- 实际读取 v1 YAML，`known_dirty_files` 与 `allowed_paths` 交集为空，`pages/tools/shengxiao.vue` 不在前者中。汇报中第 3 项偏差不成立；不修改原计划来制造该冲突。
- 路线图中“重建为干净提交基线”改为“已提交 R3 + 未提交 R4 指纹”，与实际执行衔接一致。R4 尚未 Accepted，R5 不进入实施。
- 远端旧分支仍指向 `5af305e`，新分支包含其全部历史。旧名称清理尚未完成：仓库 pre-push 会执行工作区测试，目前工作区已有未获运行授权的 R4，故本轮不触发推送钩子，也不绕过钩子。

## 后续

执行 `.claude/plans/plan-20260909-r4-self-profile-convergence-v2.yaml`，只修改明确缺口、编写回归并静态收口。修复后再交 Codex 审阅；运行验收需用户另行授权。视觉打磨后置，隐私、基本可访问性与错误恢复仍是功能要求。
