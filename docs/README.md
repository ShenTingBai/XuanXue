# 文档导航与目录规范

本目录按文档职责分类。产品规则、工程说明和历史证据分别维护；这里提供导航，不复制阶段状态或规则数值。

## 目录分类

| 目录                       | 内容与边界                                               | 主要入口                                                                                       |
| -------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `product/governance/`      | 产品总纲、通用体验与内容治理、资料生命周期规范           | [产品总纲](product/governance/product-charter.md)                                              |
| `product/delivery/`        | 已批准的交付范围与阶段依赖                               | [首批交付规范](product/delivery/foundation-rebuild-and-first-tools-delivery-spec.md)           |
| `product/contracts/`       | 首页及各工具的输入、输出、行为与验收契约                 | [产品规范索引](product/README.md)                                                              |
| `product/evidence/<tool>/` | 来源台账、规则映射、独立黄金预期；按工具归档             | [生肖证据](product/evidence/shengxiao/shengxiao-source-ledger.md)                              |
| `project/`                 | 阶段状态与路线图                                         | [阶段路线图](project/stage-roadmap.md)                                                         |
| `engineering/`             | 工程协作与实施流程                                       | [协作协议](engineering/agent-protocol.md)                                                      |
| `architecture/`            | 系统架构说明、交互图及配套检查产物                       | [运行架构](architecture/xuanxue-runtime-architecture.html)                                     |
| `design/`                  | 项目设计系统；`references/` 保存视觉参考，不作为产品规则 | [设计系统](design/design-system.md)                                                            |
| `decisions/`               | 已作出的重要决策及理由（ADR）                            | [公开试运行决策](decisions/ADR-2026-09-04-002-public-preview-runtime-and-document-boundary.md) |
| `audits/`                  | 带日期的审查、补证和裁决记录                             | [R3证据包审阅](audits/2026-09-09-r3-evidence-package-review.md)                                |
| `validation/`              | 实际执行的验证方法、环境与结果                           | [移动端验收记录](validation/2026-09-01-p1-mobile-browser-validation.md)                        |
| `archive/`                 | 供追溯的旧项目叙述，不覆盖当前规则                       | [项目故事](archive/project-story.md)                                                           |

## 阅读顺序与维护规则

1. 了解当前产品与阶段，先读[产品索引](product/README.md)和[路线图](project/stage-roadmap.md)。
2. 实施具体工具，读对应契约、证据台账和最新审阅；界面工作同时读设计系统。
3. 来源和预期数值只在证据目录维护；审计记录解释如何取得和裁决，不再复制一套可编辑真值表。
4. 新增文档放入对应职责目录，并从现有索引接入。工具证据沿用`<tool>/`子目录；跨工具治理不放入单个工具证据目录。
5. 正式文档更新日期、版本和引用；历史审计保留当时结论。移动历史文档或修复链接不代表重新批准其内容。
6. `.claude/plans/`和`.claude/results/`保存执行协议产物；当前有效计划随路径迁移更新，已作废计划和历史执行结果保留原路径用于追溯。
7. 资料审核通过、代码实施、运行验证与公开批准是不同状态。只有实际执行过的检查才能写入`validation/`；未运行项明确标注待验收。

本次目录整理保留文档职责和既有决策，文件路径变化不改变产品范围。架构页面及其图片、检查JSON成组存放，便于保留相对资源引用。
