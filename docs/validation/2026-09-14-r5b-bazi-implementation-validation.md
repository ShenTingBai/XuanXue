# R5-B 八字基础排盘与结果历史：实施验证记录

> 计划：`.claude/plans/plan-20260914-r5b-bazi-implementation-v1.yaml`（已通过 `D:/Env/Claude/scripts/plan-validate.py`，0 errors / 0 warnings）
>
> 设计：`docs/design/2026-09-14-r5-bazi-page-ia.md`、`docs/design/2026-09-14-r5-clarify-and-scope.md`
>
> 证据：`docs/product/evidence/bazi/`（来源台账 / 规则台账 / 黄金样例）
>
> 执行者与审查者：同一会话（用户明确"审核和执行都是你"）
>
> 运行授权：用户已授权本阶段运行 typecheck / test / build 与 320/360/390/414 + 200% 浏览器验收（2026-09-14）

**范围说明（路径纪律）**：上列设计文档与 `docs/product/evidence/bazi/` 是计划**之前**（消歧与取证阶段）形成的产物，也是本计划的 `references.must_read` 输入；它们在工作区中仍是未跟踪文件，但**执行期未被修改**。计划 `forbidden_paths` 中的旧八字资产（`composables/useBaZi.ts`、`components/tools/bazi/` 等）、旧测试（`tests/composables/useBaZi*.test.ts`、`useSolarTerms.test.ts`）、`utils/shengxiao/**`、`package-lock.json`、`*.db`、`docs/product/README.md`、`docs/project/stage-roadmap.md` 经逐项核对**零改动**（`git status` 不含它们；仓库内 `xuanxue.db` 的 mtime 仍为 2026-09-07）。

## 1. 执行进度

| 计划任务                                            | 状态    | 产物                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseline-audit`                                    | ✅ 完成 | HEAD `f7ef986`、分支 `codex/foundation-rebuild`；旧资产 11 个齐全；`result_snapshots` 不存在；迁移版本 4；bazi 目录四项旧值                                                                                                                                                                                                                         |
| `bazi-domain`                                       | ✅ 完成 | `types/bazi.ts`、`constants/bazi-rules.ts`                                                                                                                                                                                                                                                                                                          |
| `bazi-adapter`                                      | ✅ 完成 | `utils/bazi/calendar-adapter.ts`、`types/lunar-javascript.d.ts`（扩展声明）                                                                                                                                                                                                                                                                         |
| `bazi-pillars-engine`                               | ✅ 完成 | `utils/bazi/pillars.ts`、`utils/bazi/engine.ts`                                                                                                                                                                                                                                                                                                     |
| `bazi-tests`（领域部分提前完成）                    | ✅ 完成 | `tests/utils/bazi/calendar-adapter.test.ts`（14 例）、`tests/utils/bazi/golden-cases.test.ts`（32 例）、`tests/utils/bazi/pillars.test.ts`（16 例）、`tests/utils/bazi/engine.test.ts`（10 例）、`tests/constants/bazi-rules.test.ts`（10 例）、`tests/fixtures/bazi-golden.json`                                                                   |
| `bazi-history-storage`                              | ✅ 完成 | `server/database/result-history-schema.ts`、`server/database/db.ts`（迁移版本 5）、`server/services/result-history.ts`、`tests/server/result-history.test.ts`（11 例）                                                                                                                                                                              |
| `bazi-recompute-and-api`                            | ✅ 完成 | `server/services/tool-recompute.ts`、`server/utils/result-history-request.ts`、`server/api/result-history/` 五个端点、`server/middleware/no-store.ts`、`nuxt.config.ts`                                                                                                                                                                             |
| `internal-verification-channel`（提前执行，见 A10） | ✅ 完成 | `server/utils/internal-verification.ts`、`middleware/tool-availability.global.ts`、`constants/tool-catalog.ts`（仅 bazi 两项）；**生产可用性由 F1 修复补齐**（见 §9）                                                                                                                                                                               |
| `self-profile-history-linkage`                      | ✅ 完成 | `server/services/self-profile.ts`（historyMode + 计数）、`server/api/self-profile/summary.get.ts`、`server/api/self-profile/index.delete.ts`、`composables/useSelfProfile.ts`、`pages/self-profile.vue`（条数 + 两个选项 + 保留提示）、`tests/server/self-profile-history-linkage.test.ts`（7 例）、`tests/pages/self-profile.test.ts`（新增 1 例） |
| `bazi-tests`（服务与接口部分）                      | ✅ 完成 | `tests/server/api/result-history.test.ts`（19 例）、`tests/server/internal-verification.test.ts`（8 例）、`tests/server/middleware/no-store.test.ts`（新增 2 例）                                                                                                                                                                                   |
| `bazi-page-input-and-status`                        | ✅ 完成 | `composables/useBaziDraft.ts`、`components/bazi/BaziStatusBanner.vue`、`components/bazi/BaziInputForm.vue`、`pages/tools/bazi.vue`（Ⅰ–Ⅲ 段）                                                                                                                                                                                                        |
| `bazi-page-result-and-scope`                        | ✅ 完成 | `components/bazi/BaziPillarCard.vue`、`BaziCandidatePanel.vue`、`BaziDateComparison.vue`、`BaziReadingGuide.vue`、`BaziEvidenceScope.vue`、页面 Ⅳ–Ⅴ 段                                                                                                                                                                                              |
| `bazi-save-and-history`                             | ✅ 完成 | `composables/useBaziProfileImport.ts`、`composables/useResultHistory.ts`、`components/bazi/BaziSaveDialog.vue`、`BaziHistoryPanel.vue`、页面 Ⅵ 段                                                                                                                                                                                                   |
| `bazi-tests`（页面与组件部分）                      | ✅ 完成 | `tests/components/bazi-page.test.ts`（21 例）、`tests/pages/tools/bazi.test.ts`（5 例）、`tests/composables/useBaziDraft.test.ts`（21 例）、`tests/composables/useResultHistory.test.ts`（10 例）                                                                                                                                                   |
| `dependency-pin`                                    | ✅ 完成 | `package.json`：`lunar-javascript` 由 `^1.7.7` 改为精确 `1.7.7`；`package-lock.json` 零改动（锁内已是 1.7.7）                                                                                                                                                                                                                                       |
| `gates-and-browser`                                 | ✅ 完成 | 四道门禁 + 生产构建浏览器验收（§2、§8），发现并修复 F1–F5（§9），本记录补齐                                                                                                                                                                                                                                                                         |

## 2. 本轮门禁结果

| 项目                             | 结果                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `npx prettier --check .`（全仓） | 退出码 0，`All matched files use Prettier code style!`                             |
| `npm run typecheck`              | 退出码 0（多轮复验；仅既有 `HexagramInfo` 重复导入警告）                           |
| `npm run test`（完整套件）       | **80 文件 / 2570 例通过**（R4 基线 67 / 2379；本轮新增 13 个文件、191 例，无回归） |
| `npm run build`                  | 退出码 0（Nitro 生产输出，7.06 MB / gzip 1.61 MB）                                 |
| `git diff --check`               | 退出码 0（无空白错误）                                                             |
| 乱码检测                         | 改动/新增文件 **0 命中**；全仓仅命中已知误报（见下）                               |
| BOM                              | 改动/新增文件均无 BOM                                                              |

乱码检测全仓命中 10 处，逐条核对**均为已知误报**且与本轮改动无关：`AGENTS.md` 的检测命令行本身（自指）、`constants/stroke-dict.ts` 的笔画字典单字条目（7 处）、`constants/tai-sui.ts` 的宝石名用字、`docs/archive/project-story.md` 的复制术语用字。为避免检测命令自指，此处不重复列出命中字符。真实乱码（U+FFFD 替换字符、双重解码串）在本轮所有新增与改动文件中为 **0**，且均无 BOM。

轮 2 附带确认：`db.ts` 增加 R5 建表与迁移版本 5 后，既有的 schema 断言测试（`tests/server/database/account-schema.test.ts` 等）**未受影响**，完整套件一次通过。

## 3. 黄金样例驱动情况

`tests/utils/bazi/golden-cases.test.ts` 直接消费证据包：29 例 = 5 参照样例 + 24 管道样例。
参照样例逐条显式断言，管道样例按 `expectedPhase` 统一驱动，并有一条覆盖性用例断言两类合计恰好等于 fixture 全部 caseId。

**防漂移**：fixture 记录证据 YAML 的 SHA256（`c1b5b97e3a2907de6626928200fca0a155e79c11e83cebc18c27cb0d897f38be`）；证据文件若被改动而未重新生成 fixture，第一条用例即失败。YAML→JSON 转换沿用 R3 的 `shengxiao-golden.json` 做法，避免测试期依赖未声明的 `yaml` 包（`yaml` 仅为传递依赖）。

## 4. 计划修订（plan_amendments）

| #   | 修订                                                                                                                 | 原因                                                                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `allowed_paths` 增加 `types/lunar-javascript.d.ts`                                                                   | 该文件是受限声明面，缺少 R5 必需的 `Lunar.getJieQiTable()` 与 `Solar.getHour/getMinute/getSecond`；R3/R4 亦曾扩展此文件                                                                                                                                                   |
| A2  | `allowed_paths` 增加 `tests/fixtures/bazi-golden.json`                                                               | 沿用 R3 先例，把证据 YAML 转为测试 fixture，避免依赖未声明的 YAML 解析包                                                                                                                                                                                                  |
| A3  | `types/bazi.ts`：`pillars: BaziPillarSet \| null` 拆为 `dayPillar` + `uniquePillars`                                 | 原设计在候选情形下 `pillars` 为 null，会**丢失仍然唯一可靠的日柱**；拆开后日柱恒在                                                                                                                                                                                        |
| A4  | `BaziCalendarAdapter` 增加 `isValidLunarDate()`                                                                      | 原设计只能靠 `lunarToSolar` 抛错区分失败原因，会把"依赖库故障"误报为"用户输入的闰月不存在"                                                                                                                                                                                |
| A5  | 领域错误码：缺字段归 `INVALID_DATE`，`MISSING_FIELD` 保留不用                                                        | 证据包 BZ-105 的冻结期望为 `invalid_input` + `INVALID_DATE`；R5 无"用户要求的完整能力缺必要字段"场景                                                                                                                                                                      |
| A6  | 适配器时刻格式化改为**四舍五入到分**，并加防跨日规则                                                                 | 证据包 BZ-401 记录的 A 级来源（日本国立天文台）按分钟四舍五入发布；截断会使约半数节气比来源少 1 分钟。防跨日规则见 §5                                                                                                                                                     |
| A7  | 命名偏差：`pillars.ts` 导出 `dayGanZhi`（计划中写作 `dayPillarFromAnchor`）；未实现 `makeBaziCalendarAdapter(deps)`  | 适配器无可注入依赖，测试直接通过 `BaziCalendarAdapter` 接口注入假实现，比无参工厂更直接                                                                                                                                                                                   |
| A8  | `ResultSnapshotSummary.displayName` 改为 `displayNamePrefix` + `savedAt`                                             | 完整标题需按 Asia/Shanghai 格式化保存时间；该格式化属展示层职责（`utils/self-profile/display.ts` 已有 `formatUpdatedAt`），不在服务端重复实现                                                                                                                             |
| A9  | 只建 `(account_id, tool_id, created_at DESC)` 一个复合索引，不另建 `(account_id, tool_id)`                           | 后者是前者的前缀，列表等值条件与计数共用同一索引即够；避免冗余索引的写入开销                                                                                                                                                                                              |
| A10 | **调整任务顺序**：`internal-verification-channel` 提前到写接口测试之前执行                                           | 保存端点要用真实的 `canCreateHistory('bazi')` 判定；若先写测试就只能 mock 目录，会掩盖目录与接口的真实耦合。提前后接口测试可对着真实矩阵跑                                                                                                                                |
| A11 | `allowed_paths` 增加 `tests/server/api/divinations.test.ts`，并更新其中两条目录驱动断言                              | 该文件按 `TOOL_CATALOG` 动态推导期望（"全部 11 类型 403""无任何可读类型"）。bazi 改为 `create_allowed` 后前提改变，按**新的真实矩阵**改写而**不放宽**：改为断言"除 bazi 外 10 个仍 403、bazi 是唯一例外"，以及"无 type 时只查询可读类型（本次为 bazi），不扩大到其他工具" |
| A12 | `allowed_paths` 增加 `tests/server/middleware/no-store.test.ts`，补 2 例覆盖 `/api/result-history`                   | 交付规范 §3.2 要求结果历史接口不得进入持久缓存；既有 no-store 测试逐条列出敏感前缀但未含新路径，须显式覆盖（含"前缀相似不误匹配"反例）                                                                                                                                    |
| A13 | `allowed_paths` 增加 `tests/server/api/self-profile.test.ts`，仅给服务 mock 补 `countHistoryWithBirthInput: () => 0` | `summary.get` 与 `index.delete` 按计划新增历史计数调用；该测试的服务 spy 是手写对象，缺该方法会抛 TypeError。补一个返回 0 的方法即可让**既有断言全部按原样通过**（无历史时行为不变），不改断言、不放宽                                                                    |
| A14 | `tests/pages/self-profile.test.ts`：页面 mock 补 `historyWithBirthInputCount` / `deleteProfile`，并新增 1 例         | 页面弹层现在读取历史条数并回传处置方式，原 3 例只覆盖首屏加载与索引锚点，无法证明"未选择就不发请求"这条硬约束；新用例断言：条数与两个选项都渲染、默认都不选中、未选择时零调用且错误提示**落在弹层内**、选"保留"后只发送 `keep`                                            |

### 4.1 目录枚举变更的连带影响（如实登记）

`bazi` 的 `historyPolicy` 由 `disabled` 改为 `create_allowed`，是 D3 方案 B 的必要条件（治理规范 §20.2 要求目录是历史写入的单一状态来源）。但它同时被**旧** `/api/divinations` 端点用作创建/读取闸门，因此产生一处连带影响：

- 旧端点对 `type=bazi` 的目录级拒绝不再生效（其余 10 个工具不受影响）；
- 生产中的实际可达性没有变化：该端点要求 `event.context.profileId`，而认证中间件**从不为它赋值**（`server/types/h3.d.ts` 自注"仅保留以维持已封存端点编译"），因此所有请求仍在 401 处终止；
- 该端点写入的 `divination_results` 表在全仓没有 DDL，即使越过 401 也无法写入。

处置：不改动封存的旧端点（项目配置禁止），改为在测试中**显式记录**这一新现实（A11），并把本条写入本记录；R6 公开门禁时应复核旧端点是否仍需保留。

### 4.2 删除整份档案时的历史处置：三层强制（交付规范 §7.5、数据规范 §13）

"仍有含出生输入的历史时必须先由用户明确选择"不是提示语，而是三道独立防线，任一层被绕过都不会静默删数据：

| 层       | 位置                                      | 行为                                                                                             |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 页面     | `pages/self-profile.vue`                  | 打开弹层即重置选择；条数 > 0 且未选择时**不发请求**，错误提示渲染在弹层内（不藏在遮罩背后）      |
| HTTP     | `server/api/self-profile/index.delete.ts` | 缺 `historyMode` 时服务层抛 `HistoryModeRequiredError` → **409 + `HISTORY_MODE_REQUIRED`**       |
| 领域服务 | `server/services/self-profile.ts`         | `historyCount > 0 && !hasMode` 直接抛错；`delete` 要求注入删除能力，未注入时宁可失败也不留下快照 |

统计与删除都按 **accountId + `tool_id='bazi'`** 限定，且在同一事务内执行（`delete` 先删快照再删档案）。两个选项都不设默认值；选"保留"时页面显式提示"保留的历史快照中仍包含保存时的出生输入，档案删除不代表这些出生资料已消失"，避免用户把删档误解为出生资料已全部消失。

## 5. 精度与午夜边界的实测结论（新增证据，供 R5 后续与 R6 使用）

对 **1901—2026 共 126 年 × 12 个"节" = 1512 个节**做了扫描（脚本仅存于仓库外临时目录）：

| 观察项                                 | 结果                                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 十二个"节"取齐的年份                   | **126/126**（无缺项，说明适配器的多观测日采集 + 目标年份筛选在支持区间内稳定）                     |
| 最接近午夜的一次                       | **1911 年立夏 = 1911-05-07 00:00:18（距午夜 18 秒）**                                              |
| 距午夜 5 分钟以内的节                  | 6 个：1911 立夏 18s、1917 大雪 59s、1948 惊蛰 127s、1982 小寒 155s、2014 惊蛰 136s、2016 小暑 201s |
| 秒数 ≥ 30（取整与截断会差 1 分钟）的节 | 738 / 1512（约 49%）                                                                               |

由此确定两条实现规则（均已落在代码与测试中）：

1. **取整到分**：与引用来源的发布口径一致；
2. **防跨日**：若取整会把时刻推到相邻日历日则改为向下取整，保证"时刻"与"日历日"自洽。该情形在支持区间内**未出现**（1911 立夏 00:00:18 取整后仍为同日 00:00），但规则必须有，否则 23:59:40 一类的年会显示成"次日 00:00"而边界实际落在当日。

同时确认 `BAZI_NEAR_MIDNIGHT_MINUTES = 5` 的阈值有效：它恰好覆盖上表 6 个真实案例，页面须对这类边界提示"判定对精度敏感"。

## 6. 尚未覆盖 / 下一步

本轮计划内任务已全部执行完毕（含 build 与四档浏览器验收）。仍然未覆盖的部分：

- **游客页内认证路径无法在真机验证**：八字页当前为 `internal`，未登录访客在服务端即被 302 到状态页，因此「游客点保存 → AuthDialog → 认证后进入保存摘要」这条路径在生产构建下**不可达**；其逻辑由页面组件测试覆盖（认证成功不触发保存、只进入摘要）。
- **`historyMode='delete'`（删除档案并同删历史）在浏览器中未走通**：验收中选择的是「保留」，同删路径由服务端接口测试与领域服务测试覆盖（含事务回滚）。
- **交节时刻 1 秒级精度、原刻影印核对**：属证据缺口（GAP-BZ-005/006/007），不在本轮范围。
- **旧 `/api/divinations` 的 `type=bazi` 目录级拒绝失效**（见 §4.1）：本轮如实登记，留待 R6 复核。

## 7. 已建立的关键不变量（后续任务不得放宽）

1. **快照不可变**：服务层只有插入与删除，没有更新快照内容的方法（`server/services/result-history.ts`）。
2. **幂等**：`UNIQUE(account_id, tool_id, result_id)` + `ON CONFLICT DO NOTHING`；重复保存返回既有记录且 `created=false`，内容不被覆盖。
3. **账号隔离**：读取与删除一律按 `accountId` 限定，未命中统一返回 null / 0，不区分"不存在"与"非本人"，避免用错误码枚举他人记录 id。
4. **安全摘要**：列表项只含 `displayNamePrefix`、`savedAt`、`asOfDate`、`phase`、`successQualifier`、`ruleVersion`、`inputOrigin`、`recordId`、`resultId`，**不含出生输入与结果正文**（有测试断言字段集合）。
5. **旧结构容错**：JSON 解析失败时原样返回字符串，记录仍可读、可删（治理规范 §12）。
6. **级联删除**：账号注销由 `accounts` 外键级联清除全部快照，服务不额外维护清理逻辑。
7. **候选不叉乘**：`utils/bazi/pillars.ts` 的 `buildPillars` 对跨"节"日期返回恰好两个完整情形（立春当日年柱与月柱同刻切换）。
8. **措辞红线**：`constants/bazi-rules.ts` 的 `BAZI_LIMITATIONS` / `BAZI_NOT_OUTPUT` 是页面 Ⅴ 段的唯一来源，页面不得自行改写或删减其中的精度与证据等级声明。
9. **内部验证通道必须在服务端判定**：`/tools/bazi` 必须保持 `ssr: true`。若退回客户端渲染，围栏中间件只在客户端运行，白名单永远无法播种，授权账号同样被拒（§8 的 F1，已有回归测试）。
10. **错误码只从 `error.data.data.code` 读**：Nuxt 的 `createError({ data })` 经 ofetch 后业务码在第二层 `data`；客户端不得再假设浅层形状（§8 的 F4）。

## 8. 浏览器验收（真机构建，2026-09-14）

### 8.1 环境与方法

| 项         | 值                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------- |
| 构建       | `npm run build`（Nitro 生产输出，`node .output/server/index.mjs`）                            |
| 端口       | `PORT=3210`                                                                                   |
| 数据库     | `DB_PATH=%TEMP%\r5b-preview-659b89fe\r5b.db`（**系统临时目录新库，仓库内无任何 \*.db 变动**） |
| 会话密钥   | 随机 48 位十六进制，写入同一临时目录，随目录一并删除                                          |
| 内部验证   | `XUANXUE_INTERNAL_TOOLS=bazi:1`（账号 1 = 验收账号R5B，浏览器内注册取得）                     |
| 驱动       | `agent-browser`（本机全局 CLI，CDP 驱动 Chromium），逐条命令输出与截图留档                    |
| 证据目录   | `D:/@Temp/xuanxue-evidence/2026-09-14-r5b-bazi/`（仓库外，20 张 PNG，清 unit 见 §8.4）        |
| 临时库处置 | 验收结束后删除整个临时目录（含 `r5b.db` 与密钥文件），确认删除成功                            |

浏览器内注册时即验证了注册表单本身：三种确认勾选（十四周岁、隐私政策、服务规则）与昵称/密码校验全部按预期阻断提交。

### 8.2 验收结果（逐项）

| 验收项                                       | 结果 | 证据                                                                                                                                               |
| -------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 匿名访问 /tools/bazi 被围栏拦下              | ✅   | 修复后为**服务端 302** → `/tools/status?tool=bazi`（修复前仅客户端重定向，见 F1）                                                                  |
| 授权账号可进入 /tools/bazi                   | ✅   | 标题「八字基础排盘 — 玄·道」，六段 `[data-bazi-section]` 齐全                                                                                      |
| 十四周岁声明为提交前提                       | ✅   | 未勾选时生成按钮禁用并说明原因（页面测试与真机一致）                                                                                               |
| 公历输入 → 日期级结果（partial，3/4）        | ✅   | 2000-08-15 →「已生成日期级结果：三柱（年、月、日）／共四柱，缺时柱」，年柱庚辰/月柱甲申/日柱乙巳（日干乙）                                         |
| 档案带入（Q2）+ 带入后来源标注               | ✅   | 带入 1990-06-15；保存摘要写「出生日期（从本人档案带入）」                                                                                          |
| 手改后来源回到「手动填写」                   | ✅   | 手改 06-16 后保存摘要写「出生日期（手动填写）」；日柱 辛亥→壬子（F2 修复后的行为）                                                                 |
| 跨「节」日期 → 恰好 2 个完整情形             | ✅   | 2000-08-07 立秋：交节时刻 2000-08-07 13:03；情形 1（立秋前）庚辰+癸未、情形 2（立秋后）庚辰+甲申，日柱丁酉                                         |
| 输入修改后 stale，保留旧结果且不自动重算     | ✅   | 摘要显示「输入已修改，结果尚未更新」+ 旧输入摘要；保存入口禁用；旧三柱仍在页面上                                                                   |
| 保存前展示摘要（七项）并需再次确认           | ✅   | 输入类别/结果内容/版本/隐私提示/保存时间/如何查看删除/不会做什么（截图 04）                                                                        |
| 保存成功 + 幂等提示                          | ✅   | 「本次结果已保存（…），重复保存不会产生第二条记录」；列表 2 条 = 2 次生成，各 1 条                                                                 |
| 历史列表只显示安全摘要（无出生日期）         | ✅   | 条目为「八字基础排盘 · 2026/09/14 23:36」+ 完整性/来源/规则版本/查询当日                                                                           |
| 打开历史只读快照、不静默重算                 | ✅   | 快照详情面板标注「按当时的规则版本 … 生成，不会随当前规则变化而改写」                                                                              |
| 「用当前规则重新计算」生成未保存结果         | ✅   | 记录数保持 2（原记录不变），保存入口重新可用（未保存态）                                                                                           |
| 删除单条                                     | ✅   | 2 → 1，仅目标记录消失                                                                                                                              |
| 清空前显示条数并确认                         | ✅   | 「确认清空全部 1 条八字历史记录？」+ 取消/确认；确认后 0 条并回到空态                                                                              |
| 档案删除前显示历史条数 + 两个选项 + 保留说明 | ✅   | 「仍有 2 条历史快照包含保存时的出生输入」+ 保留/同时删除；未选择时弹层内提示「请先选择历史记录的处置方式」                                         |
| 选择「保留」后档案删除、历史保留             | ✅   | 危险区显示无档案；/tools/bazi 历史仍为 2 条（截屏 12/13）                                                                                          |
| 敏感接口 no-store                            | ✅   | `/api/result-history`、`/api/result-history?tool=bazi`、`/api/self-profile` 均返回 `Cache-Control: no-store, max-age=0`（未认证 401 时同样带该头） |

### 8.3 移动端与 200% 文本缩放

| 视口                     | 页面横向溢出 | 结果                                                                                                     |
| ------------------------ | ------------ | -------------------------------------------------------------------------------------------------------- |
| 320 × 640                | 无           | `clientWidth 320 / scrollWidth 305`（差值即滚动条）                                                      |
| 360 × 740                | 无           | 360 / 345                                                                                                |
| 390 × 844                | 无           | 390 / 375                                                                                                |
| 414 × 896                | 无           | 414 / 399                                                                                                |
| 320 + 200% 文本缩放      | 无           | 根字号 16px → 32px；320 / 305；在该档位下完成「勾选+选日期+生成」并得到结果                              |
| 触控目标（320 档，实测） | —            | `select` / `.bazi-choice` / `.btn-seal` 均 ≥44px；20px 的三个元素是**字段文字 label**，其关联控件为 44px |

200% 文本缩放通过 `document.documentElement.style.fontSize = '32px'` 模拟（全站尺寸与间距以 rem 为主，等价于纯文本放大）。该档位下卡片内边距同步放大，正文每行字数明显减少但仍在正常阅读流内、无控件不可达；这一点如实记录，不在验收中粉饰。

### 8.4 证据清单（仓库外，SHA256）

`D:/@Temp/xuanxue-evidence/2026-09-14-r5b-bazi/`：

| 文件                                | 字节   | SHA256（前 16 位） |
| ----------------------------------- | ------ | ------------------ |
| 01-authorized-landing.png           | 333277 | 30ea81a6a59382c1   |
| 02-profile-saved.png                | 298102 | 372ff58567867318   |
| 03-import-partial.png               | 318900 | 858fd2c506ab55ac   |
| 04-save-summary.png                 | 154270 | ff320a672b8dc50c   |
| 05-saved.png                        | 292432 | f7655973f9e992bc   |
| 06-stale.png                        | 293046 | 6f8ab204a5758a48   |
| 07-candidate.png                    | 310098 | ec8dac5c60ae7e89   |
| 08-history-snapshot.png             | 290732 | 4790c9e6249f94f6   |
| 09-recompute-unsaved.png            | 284381 | 6c5430bf90579744   |
| 10-profile-delete-history-mode.png  | 133412 | 4a2361e8bab62657   |
| 11-origin-manual-after-edit.png     | 153393 | 1779e9f1642f959c   |
| 12-profile-deleted-history-kept.png | 275624 | 09fe7773375bdae5   |
| 13-history-one-left.png             | 333277 | 30ea81a6a59382c1   |
| 14-clear-all-confirm.png            | 290060 | aeb5b746b7f92dc5   |
| 15-history-cleared.png              | 297604 | 7305f0d9f5a912e1   |
| 16-320.png                          | 126727 | b0ec699a2baed265   |
| 17-360.png                          | 141622 | 630b65414fe4f24f   |
| 18-390.png                          | 160465 | 9b24970f2827335a   |
| 19-414.png                          | 181707 | b4ca3ad6157d5b46   |
| 20-320-zoom200.png                  | 99537  | 691fb0c1b0f9bd9e   |

两点如实说明：13 与 01 哈希相同（该步的 CSS 选择器点击未生效，那一帧仍是页面顶部；"删除单条后剩 1 条"由同一批命令的文本证据给出）；预览进程的 stdout/stderr 日志未随证据保留，验收结论全部基于服务端实际响应与页面渲染。

## 9. 浏览器验收发现并修复的缺陷（F1–F5）

真机验收的价值正在于此：以下五项都不是单测能发现的，全部在**修复后重跑相关验收**。

| #   | 缺陷                                                           | 根因与影响                                                                                                                                                                                       | 修复                                                                                                          |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| F1  | **D3 内部验证通道在生产构建下完全不可用**                      | `/tools/**` 为 `ssr: false`，围栏中间件只在客户端运行：既不服务端重定向也不播种授权结果，客户端「未知即失败关闭」使**授权账号同样被拒**（白名单形同不存在）                                      | `nuxt.config.ts` 为 `/tools/bazi` 单独声明 `ssr: true`；附带收益是匿名访客改为服务端 302；新增回归测试        |
| F2  | **档案带入后手改日期，快照仍记录「输入来自本人档案」**         | 页面把输入事件直接接到草稿 setter，从未调用桥接的 `onManualEdit()`，provenance 因此是错的                                                                                                        | 页面统一走 `withManualOrigin()`；新增「手改后摘要显示手动填写」回归用例                                       |
| F3  | **删除整份档案的弹层不显示历史条数与两个选项**                 | `/self-profile` 只调 `loadProfile()`，而历史条数由 `loadSummary()` 写入 → 页面侧条数恒为 0 → 前置选择整块不渲染，请求不带 `historyMode` 而被服务端拒绝                                           | 页面进入与重试路径都补 `loadSummary()`；页面测试断言必须读取摘要                                              |
| F4  | **`HISTORY_MODE_REQUIRED` 被误报成「档案已在其他页面被修改」** | Nuxt `createError({ data })` 经 ofetch 后业务码在 `error.data.data.code`，而客户端读的是 `error.data.code` → 拿不到码就落入版本冲突分支（同类：`RESULT_MISMATCH`/`COUNT_MISMATCH` 判定同样失效） | 两个组合式函数改为兼容两种形状的 `serviceErrorCode`/`errorCodeOf`；测试改用**真实嵌套形状**，并补浅层兼容用例 |
| F5  | 选择处置方式后「请先选择…」的守卫提示仍留在弹层里              | 守卫错误只在打开弹层时清空，用户做出选择后没有清除                                                                                                                                               | 增加 `watch(deleteHistoryMode)` 清除守卫提示；页面测试断言选择后弹层内不再有 `role="alert"`                   |

F4 的教训已写入 §7 不变量 10：**测试若自己编造错误形状，就会把实现与现实的偏差一起固化**。本轮把两处 mock 改成了浏览器实测到的真实响应体形状。

## 10. 计划修订补充（A15–A18）

| #   | 修订                                                                              | 原因                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A15 | `constants/bazi-rules.ts` 增加 `BAZI_FAILURE_REASONS`                             | Ⅲ 段状态横幅与 Ⅱ 段输入区就近错误需要同一套失败文案；两处各写一份中文串，改一处必漏另一处                                                                     |
| A16 | **计划 allowed_paths 之外**：`tests/composables/useSelfProfile.test.ts` 新增 2 例 | F4 的修复点在 `useSelfProfile.deleteProfile` 的错误码分支，其天然归属是该组合式函数的测试文件；计划只列了服务端与页面测试，未列此文件。**未改动任何既有断言** |
| A17 | `tests/composables/useBaziDraft.test.ts` 增加「从本人档案带入」8 例               | Q2 的替换确认/撤销/来源失效/版本变化边界在原计划里没有测试覆盖，只有页面级手动验收步骤                                                                        |
| A18 | `nuxt.config.ts` 增加 `/tools/bazi: { ssr: true }`                                | F1 修复；计划虽把 `nuxt.config.ts` 列入 allowed_paths（为 no-store 与 SW 围栏），但未预期需要改 `routeRules`                                                  |
