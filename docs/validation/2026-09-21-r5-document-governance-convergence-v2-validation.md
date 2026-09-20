# R5 文档治理收敛 v2（R5-A 完成条件与复核身份） · 验证记录

> 计划：`plan-20260921-r5-document-governance-convergence-v2`
>
> 验证日期：2026-09-21
>
> 验证状态：**technical_verification_passed_pending_user_acceptance**（静态核对已完成，待用户最终接受）

## 1. v1 遗留的两处口径问题

v1（`plan-20260921-r5-document-governance-convergence-v1`）已修正主要文档漂移，但留下两处未收净：

### 1.1 R5-A §六仍允许 `unreviewed` 作为完成裁决

v1 重写的 §六第 1 条为：

> 逐条给出明确裁决（`approved` / `in_review` / `rejected` / **保持 `unreviewed`**）

把「保持 `unreviewed`」与三种真实裁决并列，等于**未审阅的来源也能满足完成条件**，
使完成条件可被"不做事"假通过。同一问题也出现在 §二裁决列说明与页首用途行。

### 1.2 product README 仍称 DSH 记录为「第三方独立复核」

`docs/product/README.md` §8.7 末条写「第三方独立复核（2026-09-15 全面复核）」。
根据交接，**DSH 同时参与执行与复核**，属执行期同组人员，不能替代
[2026-09-20 Codex 独立审查](../audits/2026-09-20-codex-independent-review-7073f5d-588b6cb.md)。
v1 只修了同一段更早的「第三方补做」表述，这一处漏改。

## 2. 修订内容

### 2.1 R5-A 完成条件（`docs/audits/2026-09-15-r5a-source-review-checklist.md`）

| 位置               | 修订后                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 页首用途行         | 「需在裁决列填写**三态之一**才能推进 `sourceReviewStatus`；`unreviewed` 表示尚未裁决，**不构成完成**」                                                                                            |
| §二裁决列说明      | 「必须填写 `approved` / `in_review` / `rejected` 之一；`unreviewed` 表示尚未裁决，**不构成完成**」                                                                                                |
| §六第 1 条         | 「**必须进入三态之一**……`unreviewed` 表示尚未裁决，**不构成本项完成**：只要仍有外部来源停留在该状态，第 6 项的推进前提就不成立」                                                                  |
| §六第 2 条（新增） | 「`in_review` / `rejected` 的**阻断含义**：若影响 R5 必需主张，则对应准入**仍未满足**；必须在台账记录未决项、影响范围与责任人，不得因「已完成逐条裁决」而视同通过」                               |
| §六第 3 条         | `implementation_only` 只确认边界，**不因确认边界而提升任何证据等级**                                                                                                                              |
| §六第 6 条         | 推进前提改为「7 条外部来源**全部离开 `unreviewed`**、无影响必需主张的 `in_review`/`rejected` 未决项、`implementation_only` 边界已确认、未决 GAP 已如实登记」，并明确**不要求**全部变成 `approved` |
| §七引用            | 「第三方独立复核」→「**DSH 执行期全面复核记录**」，并注明不替代 Codex 独立审查                                                                                                                    |
| 页首生成行         | 「第三方（DSH）整理」→「**DSH（执行期同组）整理**」                                                                                                                                               |

### 2.2 复核身份（`docs/product/README.md` §8.7）

「第三方独立复核（2026-09-15 全面复核）」→「**DSH 执行期全面复核记录**（2026-09-15 全面复核）」，
并补明：该记录由执行期同组人员撰写，提供取证与诊断价值，**但不替代** 2026-09-20 Codex 独立审查；
文件名保留历史标题，不改写其正文。保留「骨架可信」与「§15.4 更正 0 个公开工具」的历史事实边界。

## 3. 静态核对结果

### 3.1 计划 grep 断言

| 断言                               | 结果    |
| ---------------------------------- | ------- |
| `保持 \`unreviewed\`` in R5-A 清单 | **0** ✓ |
| `第三方独立复核` in product README | **0** ✓ |

### 3.2 语义一致性脚本（18 项全过）

```
✓ 外部来源必须进入三态之一 / unreviewed 不构成本项完成 / 7 条须全部离开 unreviewed
✓ 无「保持 unreviewed」选项 / in_review/rejected 阻断必需主张 / 要求记录未决项与责任人
✓ implementation_only 只确认边界 / 不提升证据等级
✓ product README 与 R5-A 均改称「DSH 执行期全面复核记录」/ 不替代 Codex 独立审查
✓ R5-A 生成者标注为执行期同组 / 无「第三方独立复核」残留
✓ 保留 evidence_prepared_review_pending / GAP-BZ-001/004/007 未决
✓ R5 仍待用户接受、未写 Accepted / 保留 §16 更正引用
总计 18 项，失败 0 项
```

### 3.3 其他检查

- `git diff --check`：exit 0
- 乱码检测（两文件）：0 命中
- 身份误称全面排查：两文件均无「第三方独立」「第三方补做」「独立审查于」残留

## 4. 执行边界

- **未运行项目代码、测试或构建**（本计划 `type: docs`，验证为静态核对）。
- **未读取、哈希、创建、迁移、修改或删除任何数据库文件**。
- **未修改**：本次只改两个 allowed 文档（R5-A 清单、product README）；
  `docs/audits/2026-09-15-third-party-full-review.md`（历史文件标题与正文保持原样）、
  `docs/audits/2026-09-20-codex-independent-review-*.md`、来源台账、代码与测试全部未触碰。
- **未改变任何实际状态值**：`sourceStatus`、`sourceReviewStatus`、`GAP` 状态、R5 阶段状态、
  工具目录四维状态与公开围栏均未改动——本计划只修**完成条件与称谓**，不代替审阅本身。

## 5. 未解决事项（如实保留）

- **R5-A 人工审阅裁决仍未执行**：7 条外部来源仍全部为 `unreviewed`，本次修订使完成条件
  不再允许该状态假通过，但**裁决本身**仍需用户/Codex 完成。
- **3 项未决 GAP 仍在**：`GAP-BZ-001`（立春年界为条文推导）、`GAP-BZ-004`（NAOJ 覆盖清单）、
  `GAP-BZ-007`（原刻影印核对）。
- **commit BOM 历史留痕**：提交 `4fc7470` 的 subject 前含 BOM（2026-09-20 独立审查 §57 记录），
  保留为历史留痕，不重写历史提交。

## 6. plan_amendments

见 `.claude/results/20260921-r5-document-governance-convergence-v2-result.yaml` 的
`plan_amendments` 段。

## 7. 结论

R5-A 完成条件不再允许 `unreviewed` 假通过，`in_review`/`rejected` 的阻断语义已明确；
DSH 执行期复核与 Codex 独立审查的身份边界在两份当前入口文档中均已分开表述。
R5 保持待用户接受、未 Accepted、未公开放行。状态为
**technical_verification_passed_pending_user_acceptance**，待用户最终接受。
