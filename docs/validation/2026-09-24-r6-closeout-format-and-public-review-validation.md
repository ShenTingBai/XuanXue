# R6 收口：格式门禁归属与最终门禁记录

> 计划：`.claude/plans/plan-20260924-r6-closeout-format-and-public-review-v1.yaml`
> 日期：2026-09-24
> 执行：ZCode（plan-execute v2.2）
> 基线：commit `806dd32`（已推送至 `origin/codex/foundation-rebuild`）
> 计划状态：**partial** —— 格式门禁目标受 scope 阻塞（见 §3），其余任务完成
> 用户接受与正式公开批准：**pending**

---

## 1. 提交与工作区基线

| 项                     | 值                                                          |
| ---------------------- | ----------------------------------------------------------- |
| HEAD                   | `806dd32` `feat(product): 统一游客生命周期与工具页设计系统` |
| 远端                   | 已推送至 `origin/codex/foundation-rebuild`                  |
| 806dd32 规模           | 49 文件，+5653 / −1835                                      |
| 本文件创建时工作区改动 | 3 份 Bazi 文档（2 修改 + 1 新增）                           |

`806dd32` 包含游客生命周期、12 个工具页统一外壳、控件体系与文案收敛；
本轮**未**修改该提交，保持其可追溯性。

### 1.1 三份未提交文档的独立归属

| 文件                                                          | 状态 | 归属                               |
| ------------------------------------------------------------- | ---- | ---------------------------------- |
| `docs/product/README.md`                                      | 修改 | R5 GAP-BZ-007 内部范围接受相关表述 |
| `docs/product/evidence/bazi/bazi-source-ledger.md`            | 修改 | 同上（来源台账）                   |
| `docs/validation/2026-09-21-r5-gap007-accepted-limitation.md` | 新增 | 同上（限制记录）                   |

这三份属于 **R5 GAP-BZ-007 内部范围接受限制**，与 `806dd32` 的产品/UI 变更
不是同一逻辑变更，**须单独归档**，不得与其混成一次提交。

---

## 2. `.githooks/pre-push` 审计

| 检查项                       | 结论                                                    |
| ---------------------------- | ------------------------------------------------------- |
| 是否为检查型门禁             | 是（`npx prettier --check .`，无 `--write`）            |
| 是否会自动改写文件           | 否                                                      |
| 注释与输出是否准确           | 是（准确描述「格式 → 类型 → 测试」三段与失败拒绝推送）  |
| 失败原因是否可归为 hook 缺陷 | 否——hook 是正确实现的严格门禁，失败来自仓库既有格式债务 |

计划 spec 规定「仅在确认现有逻辑没有功能缺陷时保留检查型 hook；如需调整，只修注释或输出文字」。
经审计**未发现功能缺陷**，注释与输出文字亦准确，故**未作修改**（修改会让 manifest 显示无谓变更）。

---

## 3. 全仓 Prettier 门禁：scope 阻塞

### 3.1 实测失败清单

`npx prettier --check .` 初始失败 **13** 个文件。执行 `allowed_paths` 内格式化后剩余 **12** 个。

| #    | 文件                                                                                                                                                                                                                                                                                                      | 计划 scope 归属                                          | 可否修复      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------- |
| 1    | `docs/product/evidence/bazi/bazi-source-ledger.md`                                                                                                                                                                                                                                                        | `allowed_paths`                                          | ✅ **已修复** |
| 2    | `components/auth/AuthForm.vue`                                                                                                                                                                                                                                                                            | `forbidden_paths`（`components/**`）                     | ❌            |
| 3–4  | `docs/audits/2026-09-21-shengxiao-public-gate-review{,-v2}.md`                                                                                                                                                                                                                                            | `known_dirty_files`（`docs/audits/**`）                  | ❌            |
| 5–10 | `docs/validation/2026-09-21-{auth-lifecycle-product-flow,auth-save-account-switch-browser-supplement,guest-compute-persistence-lifecycle,shengxiao-designed-flow-and-mobile-account-v3,shengxiao-public-candidate-convergence-v2,shengxiao-public-candidate,ui-control-system-convergence}-validation.md` | `known_dirty_files`（`docs/validation/2026-09-21-*.md`） | ❌            |
| 11   | `docs/validation/2026-09-24-tool-copy-residual-convergence-validation.md`                                                                                                                                                                                                                                 | `known_dirty_files`（点名）                              | ❌            |
| 12   | `docs/validation/2026-09-24-zeji-weight-boundary-visibility-validation.md`                                                                                                                                                                                                                                | `known_dirty_files`（点名）                              | ❌            |

### 3.2 为何不可达成

计划的 `must` 要求 `npx prettier --check .` 通过，但该命令**扫描全仓**；

- 12/13 的失败文件**不在** `allowed_paths` 内，
- 其中 1 个显式落在 `forbidden_paths`，11 个被 `known_dirty_files` 覆盖，
- 而计划 `must_not` 禁止「使用 Prettier --write 改写未纳入本任务的业务源码或历史文档」，
  `scope.notes` 亦要求「执行器不得顺手格式化整个工作区」。

三者构成**计划内部矛盾**：`must` 的可达成前提与 `must_not`/`known_dirty_files` 的范围约束互斥。

### 3.3 执行器的处置（未绕过）

- **未**格式化这 12 个文件；
- **未**修改 `.prettierignore` 把失败文件排除（那正是计划 `must_not` 禁止的「通过删除规则掩盖问题」）；
- **未**放宽或改写 `.githooks/pre-push` 使门禁通过；
- 已修复范围内唯一可修的 1 个文件，并验证改动为**纯空白/表格对齐**（剥离空白后内容字节级相同）。

### 3.4 已完成的范围内修复

`docs/product/evidence/bazi/bazi-source-ledger.md`：仅 markdown 表格单元格对齐与行尾空白调整，
`sourceStatus`/`sourceReviewStatus`、GAP-BZ-001/007 表述、「公开准入仍阻断」、
`verified_secondary`、`in_review`、「本项目采用」等关键主张逐一复核**全部保留**（5 insertions / 5 deletions）。

### 3.5 债务归属与影响

12 个失败文件**全部在 `806dd32` 中提交并已推送**，即格式债务属**已推送基线**，
不是本轮工作区新引入。实际影响：

- `git push` 会被 `.githooks/pre-push` 因格式检查失败拒绝；
- 三份 Bazi 文档所在分支**当前无法通过 pre-push**；
- 已在 §5 记为 follow-up：需一个把上述 12 文件纳入授权范围的计划（或一次独立的纯格式修复提交）。

---

## 4. 最终工程门禁

| 检查                 | 命令                     | 结果                                    |
| -------------------- | ------------------------ | --------------------------------------- |
| 空白错误             | `git diff --check`       | 通过（exit 0）                          |
| 全仓格式             | `npx prettier --check .` | **失败（12 文件，超出 scope，见 §3）**  |
| 乱码（本轮改动文档） | AGENTS.md 规定特征扫描   | 无命中                                  |
| 类型                 | `npm run typecheck`      | 通过（exit 0；仅既有重复导入警告）      |
| 测试                 | `npm run test`           | **91 文件 / 2746 用例全通过**           |
| 静态检查             | `npm run lint`           | 0 errors（59 warnings，均为改动前既有） |
| 构建                 | `npm run build`          | 通过                                    |

范围受限检查项：

| 检查                  | 结果                                                  |
| --------------------- | ----------------------------------------------------- |
| `allowed_only`        | 本轮写入均在本计划 `allowed_paths` 内                 |
| `forbidden_untouched` | `components/**`、`pages/**` 等 forbidden 路径未被写入 |

### 4.1 范围内文件格式终态

执行器可写范围内 **全部文件均通过** `npx prettier --check`：

| 文件                                                                            | 格式                       |
| ------------------------------------------------------------------------------- | -------------------------- |
| `docs/product/README.md`                                                        | pass（本就合规，未改）     |
| `docs/product/evidence/bazi/bazi-source-ledger.md`                              | pass（本轮格式化）         |
| `docs/validation/2026-09-21-r5-gap007-accepted-limitation.md`                   | pass（本就合规，未改）     |
| `docs/validation/2026-09-24-r6-public-gate-review-validation.md`                | pass（本轮新建后格式化）   |
| `docs/validation/2026-09-24-r6-closeout-format-and-public-review-validation.md` | pass（本文件）             |
| `.githooks/pre-push`                                                            | 非 Prettier 解析目标，未改 |

新建的两份验证文档初稿含表格对齐差异，已运行 Prettier 修正；
经逐行语义比对（表格按单元格切分、折叠空白）确认**仅格式变化、正文语义不变**。

仓库整体格式终态（供对照）：in-scope 全通过，**12 个 out-of-scope 文件仍失败**（清单见 §3.1）。

---

## 5. 未提交文件归属结论与提交分组建议

**本轮未执行任何 git commit / push**（计划 `git.auto_commit: false`；项目规范要求先交用户审计）。

建议 Codex 审阅后按以下分组提交：

1. **R5 GAP-BZ-007 文档组**（独立）：
   `docs/product/README.md`、`docs/product/evidence/bazi/bazi-source-ledger.md`、
   `docs/validation/2026-09-21-r5-gap007-accepted-limitation.md`；
2. **R6 复审记录组**：
   `docs/validation/2026-09-24-r6-public-gate-review-validation.md`、本文件；
3. **格式债务修复**（需新计划的单独提交）：§3.1 表中 #2–12。

三组不应混合——第 1 组是内部范围接受限制的治理记录，第 3 组是纯格式修复。

---

## 6. 状态分离

| 状态         | 值                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------- |
| 工程通过     | 是（typecheck / test / lint / build 全绿）                                                     |
| 格式门禁     | **未通过**（12 文件超出 scope，属已推送基线债务，见 §3）                                       |
| 浏览器执行   | R6 复审已实测（游客/登录/保存/退出/围栏，见 `2026-09-24-r6-public-gate-review-validation.md`） |
| 用户接受     | **pending**                                                                                    |
| 正式公开批准 | **pending**（生肖待用户接受；八字仍被 GAP-BZ-001/007 阻断）                                    |

---

## 7. 后续事项

1. 新计划把 §3.1 的 12 个文件纳入授权范围，一次性修复全仓格式（或将 `.githooks/pre-push`
   的全仓检查范围调整为受控路径——但该决定需用户/Codex 明确批准，执行器不得自行放宽门禁）；
2. 用户完成生肖真实手机体验验收与用户接受确认；
3. 三份 Bazi 文档独立提交。
