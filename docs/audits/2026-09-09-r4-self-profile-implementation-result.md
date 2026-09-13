# R4 本人档案实施结果审计

> 状态：Implemented（implemented_verification_pending）— 代码实施与验证用例编写完成，未验收、未 Accepted、未公开
>
> 日期：2026-09-09
>
> 计划：`.claude/plans/plan-20260909-r4-self-profile-v1.yaml`
>
> 结果：`.claude/results/20260909-r4-self-profile-v1-result.yaml`（`plan_amendments` 见下）
>
> 审阅：本文件供 Codex 审阅，确认 `plan_amendments` 后决定接受偏差或发起修正计划

## 1. 结论

R4 本人档案（完整出生日期字段组 + 最小授权凭证）已完成代码实施与验证用例编写。根结果为 `implemented_verification_pending`：

- **未运行** `npm run typecheck` / `npm run test` / `npm run pretest` / `npm run lint` / `npm run build` / `npm run preview` / `npm run dev`、Vitest、Nuxt prepare、浏览器验收；
- **未**初始化、读取、创建、迁移、修改或删除任何数据库文件；
- **未**安装依赖、未改锁文件、未暂存/提交/推送/合并、未改 Git 钩子、未切分支；
- 测试只编写不运行；未来运行只能在用户另行授权后。

## 2. 实施内容（逐文件）

### 2.1 领域与类型

- `types/self-profile.ts`：严格联合 `RawBirthDate`（solar 的 `isLeapMonth` 必须 null；lunar 必须显式布尔）、`NormalizedBirthDate`、`SelfProfile`、`ExpectedProfile`、`SelfProfileSummary`、有限错误码、保存/删除/授权请求、页面草稿 `BirthDateDraft`。
- `constants/self-profile-policy.ts`：告知版本 `2026-09-09`、转换版本 `lunar-javascript 1.7.7 / self-profile-date-v1`、最小规范化公历 `1901-01-01`、最小年龄 14、最大请求字节 4096、用途/数据类别/动作枚举。
- `utils/self-profile/birth-date.ts`：纯函数 `normalizeBirthDate`（公历/农历校验 + LunarYear 月份表筛选 + round-trip 核对 + 范围校验）、`isAtLeastFourteen`（完整公历周年比较，含 2 月 29 日规则）、`describeBirthDate`、`diffBirthDate`（原历法变化即使规范化同日也算修改）。复用 `utils/shengxiao/date` 纯公历校验，不调用生肖分类或旧八字规则。

### 2.2 持久化

- `server/database/self-profile-schema.ts`：只新建 `self_profiles`（id TEXT PK、account_id UNIQUE REFERENCES accounts ON DELETE CASCADE、version CHECK>=1、use_allowed CHECK IN(0,1)、日期组全 null 或完整 CHECK、solar 闰月 null/lunar 0/1）与 `consent_receipts`（id、account_id FK CASCADE、purpose、data_category、action、policy_version、status active/revoked、created_at/revoked_at；不含出生值、before/after JSON、完整 IP、昵称、token）及索引。
- `server/database/db.ts`：导入 R4 DDL，在 R2 accounts 建立后初始化两表及索引（幂等 CREATE IF NOT EXISTS）；迁移记录版本 4 在两表和索引成功后事务内写入，重复启动不重复记录。默认 DB_PATH 仍为 `xuanxue-r2.db`，外部覆盖、WASM 打包、事务/持久化调度保留。
- `server/services/self-profile.ts`：`createSelfProfileService({get,run,transaction,now})` 依赖注入 + `selfProfileService` 默认实例；`get/summary/save/deleteBirthDate/deleteProfile/setUsage`。保存原子：校验账号 active 且有年龄声明、normalizeBirthDate、拒绝未满 14、consent accepted===true 且版本匹配、expected null 且有行 409、更新 WHERE account_id+id+version 且 changes===1 否则 409、相同值不重复写、时间与 id 服务端生成。删除日期整组归 null+关闭使用+version+1+撤回凭证；删整档撤回+最小删除凭证后删行；setUsage(false) 保留日期停止带入，setUsage(true) 需新版本确认且字段非空。注销仍依赖 accounts 外键级联。

### 2.3 API 与缓存

- `server/utils/self-profile-request.ts`：统一身份（`event.context.accountId`，未认证 401）、写接口 `assertSameOriginMutation` 先于写入（跨源 403）、真实 UTF-8 字节 4096 上限（`readRawBody` + Buffer.byteLength 兜底，不信任 Content-Length）、字段白名单/expected 结构/严格布尔与整数校验、固定错误映射（400/401/403/409/413/500），不回显日期或完整对象。
- `server/api/self-profile/index.get.ts`：GET 档案（仅当前账号）。
- `server/api/self-profile/summary.get.ts`：GET 无出生值摘要。
- `server/api/self-profile/index.put.ts`：PUT 保存（差异确认后）。
- `server/api/self-profile/birth-date.delete.ts`：DELETE 出生日期字段组。
- `server/api/self-profile/index.delete.ts`：DELETE 整档。
- `server/api/self-profile/usage.patch.ts`：PATCH 使用授权。
- `server/middleware/no-store.ts`：新增 `/api/self-profile` 精确前缀（不误匹配 `/api/self-profiled`），保留 auth/profiles/divinations。
- `nuxt.config.ts`：SW NetworkOnly 新增 `/api/self-profile`（先于 NetworkFirst），sitemap 排除 `/self-profile`；保留旧三条规则与工具围栏派生排除。

### 2.4 客户端

- `composables/useSelfProfile.ts`：私有 ref（出生资料不入 useState/模块变量/localStorage/sessionStorage/URL）；restoring 不请求、guest 不报错、401 调 `markSessionExpired`；每个请求捕获 accountId+序号，晚到结果丢弃；409 保留编辑值不自动重试；同页成功后才替换；BroadcastChannel 只传 accountId/档案 id/version/action；focus 重取 summary。
- `composables/useSelfProfileDraft.ts`：当前工具实例的字段复制/来源/撤销；无档案或无日期不显示带入；明确点击才 GET 完整 profile；非空不同草稿替换前确认；快照为紧邻带入前完整年月日；手改标 manual 但仍可撤销；删除/撤回通知清撤销缓存与未提交带入字段；账号退出/变化/卸载清理。
- `components/profile/BirthDateGroupInput.vue`：公历/农历切换（切换即清空提示）、农历闰月必须明确（null 不默认否）、原表达与规范化同时可见、字段关联错误、墨韵表单样式。
- `components/profile/SelfProfileSaveDialog.vue`：差异新增/修改/保持、原历法表达+规范化公历、checkbox 默认未选、expected 冻结、候选/版本变化失效并清空勾选、失败保留候选、409 要求重新读取、焦点/Tab/Escape。
- `pages/self-profile.vue`：restoreSession 三态、guest 且无网络错误才 replace `/login`、加载失败不伪装空档案、SEO noindex、三状态展示（无档案/完整日期/日期组已删除）、删日期与删档分开确认、撤回与重新允许分开、删除不退出登录、离开/换账号/退出清理敏感状态。
- `pages/account.vue`：已认证账号设置中增加「本人档案」入口。
- `layouts/default.vue`：桌面账号菜单与移动账号区增加 `/self-profile` 入口（限已认证），桌面菜单 tabindex 0/1/2 保持键盘导航。

### 2.5 验证用例（只编写，不运行）

- `tests/utils/self-profile-birth-date.test.ts`：公历闰日/非法/小数/字符串/超界；农历 2023 闰二月初一→2023-03-22、2024 正月初一→2024-02-10、1900 十一月十一→1901-01-01（复用已批准 R3 黄金 SX-301/SX-105/SX-001 独立事实）；2024 无闰二月；月末越界拒绝；年龄边界固定 asOfDate=2026-09-09；asOfDate 无效抛调用错误。
- `tests/server/self-profile.test.ts`：真实 sql.js 内存库 + 真实 R2/R4 DDL；一账号一档、隔离、版本 CAS、缺失 expected、删除重建旧 id/version 拒绝、相同值不重复写、全 null/完整 CHECK、失败凭证写入回滚、删除失败回滚、撤回后 summary 不可带入但日期保留、再授权需新版本、DELETE accounts 级联、receipt/错误不含出生值。
- `tests/server/api/self-profile.test.ts`：六路由匿名 401、跨源 403、伪造 accountId/未知字段 400、实际 body 超 4KB 无 Content-Length 仍 413、非法日期 400、未成年 403、旧版本 409、事务失败 500、成功 DTO 白名单；服务 spy 断言未授权/超限/非法不调用写服务；GET summary 无日期。
- `tests/composables/useSelfProfile.test.ts`：restoring/guest 不请求、已登录仅 summary、明确动作才读完整 profile、失败保留、401 清理、A 账号慢响应在切换 B 后被丢弃、409 必须重新确认、成功事件无出生值、clear 清理、跨 tab 不支持时 focus 重取。
- `tests/components/self-profile.test.ts`：真实挂载输入/保存对话框；公历/农历切换清空、闰月必须明确、原表达与规范化可见、差异新增/修改/保持、默认未勾选、候选变更取消旧确认、保存失败保留、冲突重新读取、删日期与删档文案区分、焦点/Tab/Escape。
- `tests/components/shengxiao-page.test.ts`：保留 12 个 R3 测试 + 真实 ExportButton 回归；扩展 summary/fullprofile/保存 API 与 AuthDialog mock 边界（无日期不显示带入、只 summary 不泄露 DOB、显式带入不计算、不同草稿先确认、取消保留、手改 manual、撤销恢复、stale 不能保存、删除/撤回不复活 undo、游客保存→页内认证→二次确认、页头登录不触发 PUT、日志/存储/URL 无出生值、导出目标仍为真实隐私卡片不含档案 ID）。
- `tests/server/middleware/no-store.test.ts`：新增 `/api/self-profile` 及子路径成功/失败共用 no-store，`/api/self-profiled` 不误匹配；保留原 auth/profiles/divinations 检查。
- `tests/config/nuxt-public-content.test.ts`：Workbox 新增 self-profile 第四类 NetworkOnly；sitemap 排除 `/self-profile`；保留原工具围栏与敏感三类。

## 3. 边界与未做

- 不改旧 `/api/profiles`（仍 410）、旧档案页、`useAuth.currentProfile` 别名、旧 DB；
- 不开放工具目录/全局路由、不新增绕过围栏的调试路由；不改生肖引擎/黄金/来源；
- 不做 R5 历史或八字计算，不读旧 `divination_results`，不建立旧账户认领或历史兼容；
- 不增加时间地点性别亲友档案、头像/完整度/长期现实状态、自动保存、自动计算或全站 UI 改版；
- 不运行任何项目代码、测试、构建、数据库操作、浏览器验收。

## 4. 静态证据

- 计划门禁校验通过（0 errors, 0 warnings）；
- HEAD `5af305e61861724f017f3079416e5d2de89bbc2f`，分支 `codex/p0-tool-availability-containment`，与基线一致；
- 基线 `.claude/results/20260909-r4-self-profile-v1-baseline.json` 中 24 个非数据库文件 SHA256 全部匹配（核对脚本在 R4 计划内只读执行）；
- 所有 create 目标在实施前均不存在；
- 旧 `/api/profiles` 五接口均 410 且不访问数据库；`useAuth.currentProfile` 恒 null；默认库 `xuanxue-r2.db`；`readRawBody` 在 h3 1.15.11 真实导出；
- lunar-javascript 1.7.7 API 静态核验：`getMonthsInYear` 按农历年过滤、闰月 `getMonth()` 返回负号、`Lunar.fromYmd` 接受负月；黄金事实 2023 闰二月初一→2023-03-22、2024 正月初一→2024-02-10、1900 十一月十一→1901-01-01、2024 无闰二月、round-trip 保闰月符号全部确认；
- `git diff --check` 与 AGENTS.md 规定的乱码检测命令对全部改动文件执行，0 命中（检测命令本身未写入待检文件，避免自指误报）。

## 5. plan_amendments 摘要

见 result YAML 的 `plan_amendments` 段。已知需 Codex 审阅的漂移：

1. `docs/project/stage-roadmap.md`「当前准备」行在实施前已被外部改为「实施计划在 R3 提交推送后重建为干净提交基线，沿用 `codex/foundation-rebuild`」——与计划实际分支 `codex/p0-tool-availability-containment` 不一致；执行器保留了该行未改写，仅更新状态/链接。建议 Codex 与用户确认该行归属。
2. 计划 `known_dirty_files` 含 `pages/tools/shengxiao.vue`，同时计划 allowed_paths 明确把它列为 task-6 的 `target_files`（modify）。按计划 `must`「修改目标不放 known_dirty 只读列表」执行，正常修改。

## 6. 未来临时库端到端验收矩阵（待用户授权后运行）

| 验收项        | 说明                                                     |
| ------------- | -------------------------------------------------------- |
| 日期规范化    | 公历/农历/闰月/1901 下界/当日上界/非法输入               |
| 差异确认      | 新增/修改/保持、原历法切换同日视为修改                   |
| 并发          | 版本 CAS、删除重建旧 expected 拒绝、重复点击幂等         |
| 删除          | 删日期组（保留档案）、删整档（保留账号/会话/最小凭证）   |
| 注销级联      | DELETE accounts 级联删档案/凭证/会话                     |
| 带入撤销      | 从档案带入、替换确认、手改 manual、撤销恢复前值          |
| 页内认证      | 游客保存→认证→二次确认，绝无隐式写入                     |
| no-store / SW | `/api/self-profile` 成功/失败均 no-store，SW NetworkOnly |
| 移动端        | 320/360/390/414 CSS px 四档宽度、200% 文本缩放           |
| 自动化        | typecheck / test / lint / build 全绿（仅授权后运行）     |

根结果必须保持 `implemented_verification_pending`，直到上述验收完成并经用户确认。
