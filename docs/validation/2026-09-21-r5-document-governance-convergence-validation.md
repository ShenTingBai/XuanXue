# R5 文档治理收敛（独立审查表述、来源计数、工程版本事实） · 验证记录

> 计划：`plan-20260921-r5-document-governance-convergence-v1`
>
> 验证日期：2026-09-21
>
> 验证状态：**technical_verification_passed_pending_user_acceptance**（静态核对已完成，待用户最终接受）

## 1. 背景

Codex 独立审查（[2026-09-20 独立审查](../audits/2026-09-20-codex-independent-review-7073f5d-588b6cb.md)）
指出当前入口文档存在三类漂移：独立审查身份被误述、来源计数与完成条件自相矛盾、工程版本文档
与仓库事实不一致。本计划只修**当前入口文档**，不改写历史审计正文。

## 2. 修订前后对照

### 2.1 独立审查身份（`docs/product/README.md` §8.7）

| 项                | 修订前                                               | 修订后                                                                                                                             |
| ----------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| R5-D 验收记录性质 | 「独立审查于提交前由**第三方**补做……并**全部通过**」 | 明确为**执行者自查**（执行 R5-D 的一方在提交前自行核对 checklist）                                                                 |
| 独立审查指向      | 未引用真实独立审查                                   | 引用 [2026-09-20 Codex 独立审查](../audits/2026-09-20-codex-independent-review-7073f5d-588b6cb.md)，注明其覆盖区间与指出待收敛问题 |
| R5 状态           | 段末已写「仍由用户确认」                             | 保持，未写成 Accepted 或公开放行                                                                                                   |

### 2.2 八字来源计数与类别

| 文件                                                        | 修订前                                            | 修订后                                                          |
| ----------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| `docs/product/README.md` §8.7                               | 「8 条来源逐条登记」                              | 「**9 条来源条目——7 条外部证据 + 2 条 `implementation_only`**」 |
| `docs/project/stage-roadmap.md` R5 段                       | 「8 条来源逐条登记」                              | 同上，并链接 R5-A 审阅清单                                      |
| `docs/audits/2026-09-15-r5a-source-review-checklist.md` §一 | 「8 条来源」（与 §二标题「9 条」及表格 9 行矛盾） | 「9 条来源条目：7 条外部证据 + 2 条 `implementation_only`」     |

三处均保留 `evidence_prepared_review_pending`、`sourceReviewStatus` 未决与
`GAP-BZ-001`/`004`/`007` 未决事实，未把实现完成写成 Accepted。

### 2.3 R5-A 完成条件（消除自相矛盾）

`docs/audits/2026-09-15-r5a-source-review-checklist.md` §六原写：

> 台账状态由 `evidence_prepared_review_pending` 推进（**全部 `approved`** → 可进入 R5 完成门槛判定）

这与同文件 §二 第 50 行「第 6、7 条是 `implementation_only`，**按定义不应裁决为 `approved`**」
直接冲突。已按**类别**重写完成条件：

1. 外部证据来源（7 条）逐条给出明确裁决；
2. `implementation_only` 来源（2 条）只确认**边界**（不被当作外部证据引用），不参与
   「外部证据是否已核验」的判定；
3. 未决 GAP 必须在台账中如实保留未决状态与责任人。

### 2.4 工程版本事实

| 文件                      | 修订前                                       | 修订后                                                                            |
| ------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| `README.md` 前置要求      | `Node.js ≥ 18`                               | `Node.js ≥ 22`（与 `package.json` `engines: >=22.0.0` 一致；注明 `.nvmrc` 为 24） |
| `CLAUDE.md` `useBaZi` 行  | 「日柱锚点**已知错误**，仍被 useHeHun 调用」 | 「日柱锚点已于 `89f626d` **修正**为复用 `utils/bazi/pillars.ts`」                 |
| `CLAUDE.md` `useHeHun` 行 | 「上游依赖旧 useBaZi 的日柱」                | 「经 `calculateBaZi` 取日柱；`89f626d` 后日柱已正确」                             |

代码事实核对：`composables/useBaZi.ts:14` 已导入 `dayGanZhiIndex`（来自
`utils/bazi/pillars.ts`），`useHeHun.ts:18` 经 `calculateBaZi` 获取四柱——CLAUDE.md
修订后与代码一致。

## 3. 静态一致性核对（21 项全过）

```
✓ 三份入口文档均写「9 条来源」并含 7 外部 + implementation_only 分类
✓ 三份入口文档均无「8 条来源」残留
✓ R5-A 清单无「全部 approved」，且保留 implementation_only 不得 approved 规则
✓ README 写 Node.js ≥ 22、无 ≥ 18；package.json engines >=22.0.0；.nvmrc 为 24
✓ CLAUDE.md 已标 89f626d、无「日柱锚点已知错误」、useHeHun 无「上游依赖旧 useBaZi」
✓ product README 不再称 R5-D 审查为「第三方补做」，已引用 2026-09-20 Codex 独立审查
✓ product README 保留「待用户接受」状态
总计 21 项，失败 0 项
```

计划 grep 断言：`README.md` 的 `Node.js ≥ 18` count 0 ✓；
R5-A 清单的 `全部 approved` count 0 ✓。

## 4. 命令结果

| 命令                     | 退出码    |
| ------------------------ | --------- |
| `git diff --check`       | 0         |
| 乱码检测（5 个改动文档） | 0 命中    |
| 静态一致性脚本（21 项）  | 0（全过） |

**未运行项目代码、测试或构建**（本计划 `type: docs`，验证为静态核对）；
**未读取、哈希、创建、迁移、修改或删除任何数据库文件**。

## 5. 历史留痕与边界

- **未改写的历史内容**：`docs/audits/2026-09-15-third-party-full-review.md`（第三方复核正文）、
  `docs/product/evidence/bazi/**`（来源台账与 GAP）、`docs/audits/2026-09-20-codex-independent-review-*.md`
  （Codex 独立审查）均未修改；本次只在当前索引中标注独立性边界。
- **commit BOM 历史事项**：提交 `4fc7470` 的 subject 前含 UTF-8 BOM（记录于 2026-09-20 独立审查
  §57）。该问题不改变源码运行，但破坏提交标题规范；**保留为历史留痕，不重写历史提交**，
  后续提交不得复制该格式。本次检查的五个目标文档均无 BOM。
- **状态边界**：本计划**不**把 R5 写成 Accepted 或公开放行；工具目录四维状态、公开围栏、
  前几轮技术修复（内部权限、数据库初始化、chunked v1–v4、实例锁）的「待用户接受」状态
  均未被本计划掩盖或改写。
- **未解决的问题**：R5-A 人工审阅裁决仍未执行（`sourceReviewStatus` 仍为 `unreviewed`）；
  `GAP-BZ-001`/`004`/`007` 仍未决。本计划只修正文档表述，不代替审阅。

## 6. plan_amendments

见 `.claude/results/20260921-r5-document-governance-convergence-v1-result.yaml` 的
`plan_amendments` 段。

## 7. 结论

入口文档的状态表述、来源计数与工程版本事实已对齐；历史审计与来源台账未被改写；
R5 仍保持待用户接受与未公开放行。状态为
**technical_verification_passed_pending_user_acceptance**，待用户最终接受。
