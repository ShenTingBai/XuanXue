# R5-A 八字来源审阅裁决记录

> 裁决日期：2026-09-21
>
> 裁决人：用户确认，Codex 记录
>
> 状态：`technical_verification_passed_pending_user_acceptance`

## 裁决结果

- `SRC-BZ-001`—`SRC-BZ-005`：按各自限定主张记为 `sourceReviewStatus: approved`。
- `SRC-BZ-008`、`SRC-BZ-009`：记为 `sourceReviewStatus: in_review`。两条来源仍是在线整理本，原刻影印核对由 `GAP-BZ-007` 阻断；`SRC-BZ-009` 的立春年界结论还受 `GAP-BZ-001` 的条文推导限制。
- `SRC-BZ-006`、`SRC-BZ-007`：确认 `implementation_only` 边界，`sourceReviewStatus` 保持 `unreviewed`，不参与外部证据裁决，不提升任何证据等级。`SRC-BZ-007` 原有的产品批准不再被表述为来源审阅批准。

## GAP 状态

- `GAP-BZ-001`：保持未决。立春年界只能表述为由《三命通会》条文与二十四节气定义推出、本项目采用。
- `GAP-BZ-004`：保持未决。NAOJ HTML 年份覆盖清单尚未完成。
- `GAP-BZ-007`：保持未决。在线整理本尚未完成原刻影印核对。

其余 GAP 的既有“已关闭 / 不触发 / 已收敛 / 已记录”状态没有被本次裁决扩大或改写。R5 的工具目录四维状态、公开围栏和阶段 Accepted 状态均未改变；`in_review` 来源与三个未决 GAP 对应的准入仍需后续收敛。

## 同步文件

- `docs/product/evidence/bazi/bazi-source-ledger.md`
- `docs/audits/2026-09-15-r5a-source-review-checklist.md`
- `docs/product/README.md`
- `docs/project/stage-roadmap.md`

本记录未运行项目代码、测试、构建或浏览器验收，未读取、哈希或修改任何数据库文件。
