# R6 八字公开门禁复审

> 计划：`plan-20260921-r6-bazi-public-gate-reaudit-v1`
>
> 复审日期：2026-09-21
>
> 执行者：ZCode（Claude 侧执行器）
>
> 依据：治理规范 [工具统一体验与内容治理规范 §22](../product/governance/tool-experience-and-content-governance-spec.md)
> 的 16 项公开准入清单；R6 初次审计（`2026-09-21-r6-full-chain-public-gate-audit.md`）与公开面返工验证
> （`2026-09-21-r6-public-surface-truthfulness-validation.md`）；[复审浏览器验证](../validation/2026-09-21-r6-bazi-public-gate-reaudit-validation.md)。
>
> 复审范围：只判断 bazi 公开门禁是否从初次审计的 4 项阻断缩小为来源/体验阻断；不修改任何目录、
> 导航、SEO、PWA 或公开 exposure。

---

## 1. 结论摘要

| 工具 | 最终结论                              | 说明                                                                                     |
| ---- | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| bazi | `remain_internal_pending_rework`（未通过公开准入） | 初次审计的 4 项阻断（第 7/8/16 项首页公开面 + 第 6 项来源）已缩小为 2 项（第 6 项来源 GAP + 第 15 项公开体验）；第 7/8/16 项**已解除** |

**bazi 仍不能公开**。首页公开面 truthfulness 返工只解除了第 7/8/16 项；来源（GAP-BZ-001/007）与
游客公开体验（第 15 项）仍是独立阻断。本复审**不修改工具目录**，`bazi` 仍为
`in_review / internal / enabled / create_allowed`，普通访客仍进状态页。

---

## 2. 返工后基线确认

- **HEAD**：`05ed06c`；分支 `codex/foundation-rebuild`。
- **首页返工**：`constants/sample-bazi.ts` 已删除，生产代码（非测试）零引用；
  `pages/index.vue` 保留中性定位、登录 CTA、今日玄机与工具核验提示。
- **robots**：`public/robots.txt` 的 Sitemap 为 `https://xuanji.me/sitemap.xml`，与 `nuxt.config.ts`
  的 `siteUrl` 一致。
- **工具目录未变**：`shengxiao = in_review/internal/blocked/disabled`；
  `bazi = in_review/internal/enabled/create_allowed`。

## 3. 治理规范 §22 的 16 项复审矩阵（bazi）

| # | 准入项                     | 初次审计   | 复审结论  | 证据 / 说明                                                                                          |
| - | -------------------------- | ---------- | --------- | ---------------------------------------------------------------------------------------------------- |
| 1 | 产品用途和用户价值明确     | pass       | pass      | 契约 §3；未变                                                                                       |
| 2 | 单项工具合同已经用户批准   | pass       | pass      | 契约已批准；R5 限定内部版 Accepted                                                                  |
| 3 | 输入、精度、缺失降级完整   | pass       | pass      | 日期级三柱、农历闰月、边界候选、缺时柱 partial；未变                                               |
| 4 | 没有虚构默认输入           | pass       | pass      | 不默认今天/零点/子时；未变                                                                         |
| 5 | 关键计算可以回链 ruleId    | pass       | pass      | R-BZ-002~010；未变                                                                                 |
| 6 | 来源核验到版本和位置       | **blocked** | **blocked** | **GAP-BZ-001（立春年界无直接原文）与 GAP-BZ-007（原刻影印核对未完成）保持未决**；`SRC-BZ-008/009` 仍为 `verified_secondary / in_review` |
| 7 | 文案没有超过证据           | **blocked** | **pass**  | **已解除**：首页命盘预览整段删除（SSR/客户端/构建产物禁止字段 0 命中）；`/tools/bazi` 页否定清单措辞合规 |
| 8 | 高风险内容已删除或阻断     | **blocked** | **pass**  | **已解除**：首页示例神煞「天生福气…衣食无忧」现实承诺随 `sample-bazi.ts` 删除；八字页不输出福星贵人等 |
| 9 | 普通用户能够理解摘要       | pass       | pass      | 白话六问、术语解释；未变                                                                           |
| 10 | 结果包含时间、规则和来源版本 | pass     | pass      | 规则/来源集合/引擎版本/查询当日；未变                                                              |
| 11 | 保存、历史和删除符合本文   | pass       | pass      | 显式保存、服务端复算、不可变快照、删除闭环；R6 初次审计已验                                          |
| 12 | 自动化测试通过             | pass       | pass      | 89 文件 / 2690 用例；含新增 5 条公开面回归                                                          |
| 13 | 320、360、390、414 和 200% 缩放通过 | pass | **部分**  | 四档无溢出（305/345/375/399）；**游客态 320px+200% 无溢出，但登录态 320px+200% 发现横向溢出**（见 §5，新发现问题，不属本次返工引入） |
| 14 | 键盘和状态提示通过         | pass       | pass      | R5 + R6 初次审计已验证；未变                                                                       |
| 15 | 用户完成体验验收           | **blocked** | **blocked** | 游客从首页进入八字页的**公开路径**仍为 internal 围栏，无法做公开体验验收；需公开启用前单独完成       |
| 16 | 设计文档、代码和测试一致   | **blocked** | **pass**  | **已解除**：`sample-bazi.ts` 删除后首页与契约 §16 一致；回归测试锁定禁止字段不回归                  |

**复审结论**：第 7/8/16 项已解除（首页公开面 truthfulness 修复生效）；第 6 项（来源 GAP）与第 15 项
（公开体验）仍为独立阻断。bazi 公开门禁**未通过**，仍为 `remain_internal_pending_rework`。

## 4. 工具四维状态与公开启用条件

- `bazi` 当前：`in_review / internal / enabled / create_allowed`（白名单内部验证通道，未变）。
- **公开启用前置条件**（全部满足后才能另行生成公开启用计划）：
  1. 关闭 `GAP-BZ-001`（立春年界原文或明确裁决）与 `GAP-BZ-007`（原刻影印核对）；
  2. 完成第 15 项游客公开体验验收（需先有内部预演/临时公开路径）；
  3. 修复登录态首页 320px+200% 溢出（§5 新发现问题）；
  4. 用户对公开启用单独授权。
- 本复审**不构成** `approved + public + enabled`，也不修改目录。

## 5. 复审新发现（不属于本次返工引入）

| # | 问题 | 定位 | 影响 |
| - | ---- | ---- | ---- |
| 1 | **登录态首页 320px + 200% 文本缩放横向溢出**（scrollWidth 476 > clientWidth 305，溢出 171px） | 登录态首页「今日玄机」卡片头部的 `slip-date-inline`（日期 2026年9月21日 · 周一）与 `slip-fortune--吉`（白露）在 32px 根字号下 flex 不换行 | 登录态首页在 200% 缩放下出现横向滚动；`slip-hd` 为 `display:flex` 且 `slip-ttl` 有 `margin-right:auto`，日期与节气标签不换行。**游客态 320px+200% 无溢出**（已验证） |

该问题与命盘预览删除无关（「今日玄机」组件未被本计划触碰），属既有登录态首页响应式缺口；
因本计划只读复审不修改代码，已如实记录，需后续响应式专项计划修复。

## 6. 状态边界

- 本复审是**执行者产出**，不是 Codex 独立审查；结论待 Codex 审阅 `plan_amendments` 与用户决定。
- **R6 不得 Accepted**：第 6 项来源 GAP 与第 15 项公开体验仍 blocked。
- 本地 sitemap loc 使用预览 host（127.0.0.1:4400），不视为生产域名一致性证明；生产部署域名
  需单独记录与复核。
