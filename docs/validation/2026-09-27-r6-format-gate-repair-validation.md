# 修复 R6 基线十二文件格式门禁 — 验证记录

> 计划：`.claude/plans/plan-20260927-r6-format-gate-repair-v2.yaml`
> 日期：2026-09-27
> 执行：ZCode（plan-execute v2.2）
> 基线 commit：`806dd32`（`codex/foundation-rebuild`，已推送）
> 计划状态：**success**
> 用户接受与正式公开批准：**pending**（本轮不涉及）

---

## 1. 本轮动因

上一轮计划（`.claude/results/20260924-r6-closeout-format-and-public-review-v1-result.yaml`）
的 `repair-format-baseline` 任务记为 **failed**，原因是计划内部范围冲突：

- `rules.must` 要求「修复 pre-push 全仓 Prettier 门禁，使 `npx prettier --check .` 通过」；
- 但当时 13 个失败文件中仅 1 个在 `allowed_paths` 内，其余 12 个被计划自身的
  `forbidden_paths`（1 个，`components/auth/AuthForm.vue`）与 `known_dirty_files`
  （11 个 Markdown）排除。

执行器当时**未绕过**：没有改 `.prettierignore` 排除失败文件，也没有放宽 `pre-push` 门禁
（后者正是该计划 `must_not` 禁止的「删除规则掩盖问题」），而是把范围内可修的部分修完、
把冲突记录为 `plan_amendments` 第 1 条并交 Codex 处置。

本轮计划把上述 12 个文件明确纳入授权范围，使「全仓格式通过」这一验收标准首次可达。

---

## 2. 基线快照（执行前）

| 项                      | 值                                                                               |
| ----------------------- | -------------------------------------------------------------------------------- |
| HEAD                    | `806dd32967173b0f947f9a906c26652493de27d1`（`feat(product): 统一游客生命周期…`） |
| 分支                    | `codex/foundation-rebuild`                                                       |
| 暂存区                  | 空（`git diff --cached --name-only` 无输出）                                     |
| 工作区既有未提交        | 2 个已跟踪改动 + 4 个未跟踪文件（见 §6，执行器全程未触碰）                       |
| `npm run format:check`  | 失败，12 文件（清单见 §3）                                                       |
| 12 文件 vs 计划路径三层 | **全部在 `allowed_paths` 内，无 `forbidden` / `known_dirty` 命中**               |

与上一轮的关键差异：上轮 12 个失败文件**越界**；本轮同样的 12 个文件是**计划授权的目标**，
`format-listed-files.target_files` 的 12 条路径与 Prettier 实际报错清单**逐条精确一致**。

### 2.1 门禁无缺陷

`.githooks/pre-push` 为检查型门禁，依次运行 `npx prettier --check .` → `npx nuxi typecheck`
→ `npx vitest run --reporter=verbose`；`.githooks/pre-commit` 只对**已暂存**文件跑
`lint-staged`（其 Prettier 为 `--check`，不写文件）。两者均不含 `--write`、不改写工作树，
注释与输出文字准确描述了门禁语义。**失败原因是输入文件不符合已安装 Prettier，不是 hook 缺陷。**

---

## 3. 十二文件清单与逐文件结果

原始副本（含 md5）保存于仓库外 `D:\@Temp\xuanxue-format-repair-20260927\originals`，
供逐文件比对；比对脚本亦在该目录（`semantic_diff.py` / `strict_sep.py` / `claims.py`）。

| #   | 文件                                                                                     | 变更行 | 变更性质                      |
| --- | ---------------------------------------------------------------------------------------- | ------ | ----------------------------- |
| 1   | `components/auth/AuthForm.vue`                                                           | 3/12   | 模板 `<span>` 属性换行折叠 ×3 |
| 2   | `docs/audits/2026-09-21-shengxiao-public-gate-review-v2.md`                              | 33/33  | 表格列宽重排（4 表）          |
| 3   | `docs/audits/2026-09-21-shengxiao-public-gate-review.md`                                 | 31/31  | 表格列宽重排（3 表）          |
| 4   | `docs/validation/2026-09-21-auth-lifecycle-product-flow-validation.md`                   | 51/51  | 表格列宽重排（6 表）          |
| 5   | `docs/validation/2026-09-21-auth-save-account-switch-browser-supplement.md`              | 60/60  | 表格列宽重排（7 表）          |
| 6   | `docs/validation/2026-09-21-guest-compute-persistence-lifecycle-validation.md`           | 44/44  | 表格列宽重排（6 表）          |
| 7   | `docs/validation/2026-09-21-shengxiao-designed-flow-and-mobile-account-v3-validation.md` | 58/58  | 表格列宽重排（7 表）          |
| 8   | `docs/validation/2026-09-21-shengxiao-public-candidate-convergence-v2-validation.md`     | 53/53  | 表格列宽重排（7 表）          |
| 9   | `docs/validation/2026-09-21-shengxiao-public-candidate-validation.md`                    | 84/84  | 表格列宽重排（11 表）         |
| 10  | `docs/validation/2026-09-21-ui-control-system-convergence-validation.md`                 | 69/69  | 表格列宽重排（9 表）          |
| 11  | `docs/validation/2026-09-24-tool-copy-residual-convergence-validation.md`                | 36/36  | 表格列宽重排（5 表）          |
| 12  | `docs/validation/2026-09-24-zeji-weight-boundary-visibility-validation.md`               | 11/11  | 表格列宽重排（2 表）          |

**Markdown 侧：11 份文档的变更行 100% 落在表格行内，非表格变更行为 0。**
Prettier 只做列宽对齐，未改动任何正文、标题、链接、代码块或结论。

---

## 4. 语义核验（四层，逐层加严）

计划明确要求「不能只以删除空白后的字符串相等替代审阅」，故按四层独立核验：

### 第 1 层 — 最强判定：表格分隔行归一后的严格 token 比对

把 Markdown 表格分隔行（`| --- | --- |`）整体归一为 `[SEP]` 后，对全部非空白 token
序列做严格逐项比对（代码块内容原样保留）：

| 结果            | 文件数 |
| --------------- | ------ |
| PURE-FORMAT     | 12/12  |
| 存在 token 差异 | 0      |

即：**除表格分隔行的 dash 数量外，12 个文件的 token 序列逐项完全一致。**

### 第 2 层 — AuthForm.vue 逐字符与语义元素核验

| 检查项                                                       | 结果                          |
| ------------------------------------------------------------ | ----------------------------- |
| 全文件去除所有空白后逐字符比对                               | 完全一致（5747 vs 5747 字符） |
| `script` 段全文比对                                          | 完全一致                      |
| 事件监听序列（`@click` / `@click.stop` / `@submit.prevent`） | 完全一致                      |
| 属性名+值对序列（含 `v-model`、`:disabled`、`aria-*`）       | 完全一致                      |
| 字符串字面量集合                                             | 完全一致                      |
| 插值表达式集合（`{{ }}`）                                    | 完全一致                      |
| 标签序列                                                     | 完全一致                      |

**登录/注册行为、授权确认逻辑与表单字段绑定未发生任何变化**；3 处 `<span>` 属性由多行
折叠为单行，属性数量、顺序与取值不变。

### 第 3 层 — Markdown 结构元素全量比对

| 结构元素             | 结果                     |
| -------------------- | ------------------------ |
| 标题序列             | 12/12 一致               |
| 链接目标（含裸 URL） | 12/12 一致               |
| 表格单元格内容与行序 | 12/12 一致（分隔行除外） |
| 数字多重集           | 12/12 一致               |
| 围栏代码块内容       | 12/12 一致               |

### 第 4 层 — 关键主张抽样核验

逐文件抽查本轮文档承载的关键结论，比对原始副本与新文件的**出现次数**，全部不变：

| 文档组                 | 抽查主张                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 生肖公开门禁两篇       | `pass_public_gate`、`用户最终体验验收`、`roving tabindex`、`FU-001`、`FU-002`、`historyPolicy=disabled`、`2711`、`isToolPubliclyAvailable` |
| 账号与会话生命周期三篇 | `self-profile`、`logout`、`history`、`guest`、`localStorage`、`sessionStorage`                                                             |
| 生肖设计与候选收敛三篇 | `320` / `360` / `390` / `414` / `200%`、`user_acceptance`                                                                                  |
| 控件体系一篇           | `44`、`tab`、`aria-`                                                                                                                       |
| 文案去重两篇           | `metaText`、`indexFootnote`、`无经典原文量化标准`、`工程校准`、`协纪辨方书`、`zejiSynthesis`                                               |

**来源结论、验证数字、公开状态与用户接受待办均未被改写。**

---

## 5. 格式与工程门禁（本轮实际执行结果）

### 5.1 格式门禁

| 检查                         | 命令                              | 结果                                                             |
| ---------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| 全仓格式（上一轮的核心阻塞） | `npm run format:check`            | **通过（exit 0）**「All matched files use Prettier code style!」 |
| 空白错误                     | `git diff --check`                | 通过（exit 0）                                                   |
| 编码                         | 字节级核验                        | 12 文件全部 UTF-8 **无 BOM**、纯 **LF**（CRLF 计数 = 0）         |
| 乱码                         | 项目 AGENTS.md 规定的乱码特征扫描 | 无命中（`rg` exit 1）                                            |

### 5.2 工程门禁（全部在本轮格式化之后串行执行）

| 检查     | 命令                | 结果                                                                      |
| -------- | ------------------- | ------------------------------------------------------------------------- |
| 类型     | `npm run typecheck` | **通过（exit 0）**；仅既有 `Duplicated imports "HexagramInfo"` 警告       |
| 测试     | `npm run test`      | **通过（exit 0）**：**91 文件 / 2746 用例全通过**，与上轮基线一致         |
| 静态检查 | `npm run lint`      | **通过（exit 0）**：0 errors / 59 warnings（59 为改动前既有基线，未新增） |
| 构建     | `npm run build`     | **通过（exit 0）**：Nitro 构建完成，总产物体积 7.15 MB（gzip 1.63 MB）    |

### 5.3 关于格式化的 Vue 文件必须重跑工程门禁

`AuthForm.vue` 是本轮唯一被格式化的代码文件。项目在 **2026-09-13 R4 事故**中记录过
「pre-commit 的 `prettier --write` 在门禁验证之后改写源码，把多语句内联处理器改成 Vue
无法编译的形式，提交树上的 typecheck/build 随即失效」。因此本轮对该文件重新运行
typecheck / test / lint / build（结果即上表），确认格式化未引入编译或行为回归。

其中**静态检查警告数与改动前完全一致（59）**，说明格式化未新增任何 lint 问题。

---

## 6. 未触碰的既有未提交内容

执行器全程未修改下列文件（mtime 均早于本轮格式化窗口，或由 ZCode 客户端生成）：

| 文件                                                                            | mtime      | 归属                                                    |
| ------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------- |
| `.zcodeignore`                                                                  | 11:05:43   | ZCode 客户端默认排除模板（早于执行器首次写盘 11:10:11） |
| `docs/product/README.md`                                                        | 2026-09-24 | R5/R6 文档组                                            |
| `docs/product/evidence/bazi/bazi-source-ledger.md`                              | 2026-09-24 | R5 GAP-BZ-007 文档组                                    |
| `docs/validation/2026-09-21-r5-gap007-accepted-limitation.md`                   | 2026-09-21 | R5 GAP-BZ-007 文档组                                    |
| `docs/validation/2026-09-24-r6-closeout-format-and-public-review-validation.md` | 2026-09-24 | R6 复审记录组                                           |
| `docs/validation/2026-09-24-r6-public-gate-review-validation.md`                | 2026-09-24 | R6 复审记录组                                           |

格式化窗口（11:11:55–11:12:11）严格只覆盖 §3 的 12 个授权文件。
`forbidden_paths` 中的 `.githooks/**`、`.prettierignore`、`.prettierrc*`、`.gitignore`、
`package.json`、`package-lock.json`、`node_modules/**`、`server/**`、`pages/**`、
`composables/**`、`constants/**`、`*.db` **全部未改动**。

---

## 7. 上一轮「最终门禁状态矛盾」的纠正

上一轮 result 的 `final-closeout-gates` 任务记为 `task success`，但其 `verify.automation`
中 `npx prettier --check .` 的实际结果是 `failed`（12 文件越界）。该任务的
`status: success` 只表示「收口文档与其余门禁已完成」，不表示该任务的**全部** automation
条目通过——这在 result 里以 `verification[].status: failed` 如实记录了，但任务级状态
与「全绿」的直观读法存在歧义。

**本轮明确纠正**：本次 `verify-final-tree` 的每一条 automation 均为实际退出码 0，
格式门禁以 `npm run format:check` 的真实 exit code 为准；上一轮历史记录保留不删，
以 `20260924-r6-closeout-format-and-public-review-v1-result.yaml` 原文为准，
本文件不覆盖、不改写它。

---

## 8. 状态分离（不得互相替代）

| 状态         | 值                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------- |
| 格式门禁     | **通过**：全仓 `format:check` exit 0（本轮实际达成）                                         |
| 工程门禁     | 见 result YAML `verify-final-tree`（typecheck / test / lint / build）                        |
| 浏览器证据   | **沿用上一轮**：R6 复审的真实浏览器证据基于 `806dd32` 构建，本轮为纯格式修复，未重跑同一链路 |
| 用户接受     | **pending**（未改变）                                                                        |
| 正式公开批准 | **pending**（未改变；八字 GAP-BZ-001/007 仍阻断公开）                                        |

---

## 9. 提交分组（建议，需 Codex 审阅后执行）

本轮修复是**纯格式变更**，建议单独成组，不与产品/文档语义变更混合：

| 组  | 内容                                                                       |
| --- | -------------------------------------------------------------------------- |
| ①   | 本记录（`docs/validation/2026-09-27-r6-format-gate-repair-validation.md`） |
| ②   | §3 的 12 个格式化文件                                                      |
| ③   | R5 GAP-BZ-007 三份文档（另行审阅）                                         |
| ④   | R6 复审两份记录（另行审阅）                                                |

组 ①② 合为一个「修复格式门禁」提交即可（本记录是它的验证证据）；③④ 属其他逻辑变更，
不得与 ①② 混为同一提交。上述分组为建议，**提交由 Codex / 用户执行**——本轮
`git.auto_commit: false`，未执行任何 commit / push。

---

## 10. 限制与未覆盖

1. **本轮未启动浏览器预览**（计划 `must_not` 明确禁止）。R6 浏览器结论继续引用上一轮
   证据，不重复运行同一链路。
2. **未重跑生肖真实设备验收**：仍为 `user_acceptance_pending`，非本轮范围。
3. **`plan_guard.py` 的 glob 深度缺陷持续存在**：hook 的 `RESULTS_GLOB` 为
   `D:/Projects/*/.claude/results/active-plan-guard.yaml`，本项目位于
   `D:/Projects/Project/XuanXue/`（两级），hook 实测 fail-open。本轮路径约束由
   **执行器人工严格执行 + `git status` / mtime 复核**保证（见 §6），并已记入
   result 的 `plan_amendments`。**建议单独修正该脚本。**
4. **内容真实性治理仍为跨轮遗留**：称骨 / 择日 / 星座副题的预测口吻未在本轮处理。
