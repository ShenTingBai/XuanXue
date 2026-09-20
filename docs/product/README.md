# XuanXue 产品规范索引

> 状态：Active — 当前产品文档入口与状态单一事实来源
>
> 版本：1.15.0
>
> 最后更新：2026-09-09
>
> 适用范围：XuanXue 现有产品打磨、后续单项功能讨论、实施计划生成和验收

## 1. 本索引解决什么问题

本目录同时存在已经批准的产品决策、尚待讨论的工具、尚未完成的来源核验和尚未实施的代码整改。为了避免把“文档已批准”误写成“功能已完成”，后续统一从本文判断每份规范的职责和状态。

本文只整理已经形成的事实和决策，不补写尚未讨论工具的规则，不代表任何未验收功能已经可以公开。

## 2. 四类状态必须分开记录

| 状态维度 | 回答的问题                   | 允许值或表达                                         |
| -------- | ---------------------------- | ---------------------------------------------------- |
| 决策状态 | 产品规则是否已经由用户审阅   | `Pending / Approved / Superseded`                    |
| 实施状态 | 当前代码是否已经按规范完成   | `Not started / In progress / Implemented / Accepted` |
| 核验状态 | 规则与来源是否有足够证据     | 使用通用规范的 `sourceStatus`；未核验不得写成已验证  |
| 公开状态 | 普通访客当前是否应看到和使用 | 使用工具目录的审核、访问、计算、历史四维状态         |

四个维度不得互相替代：

- `Approved` 只表示产品决策已批准；
- 自动化测试通过不表示来源已经核验；
- 页面当前可访问不表示已经批准公开；
- 页面被隐藏不表示代码、历史数据或规则已经删除；
- 文档收口不表示所有工具整改完成。

## 3. 规范层级与职责

发生冲突时按以下顺序处理：

1. [产品总纲](governance/product-charter.md)与项目级产品、内容硬约束；
2. [工具统一体验与内容治理规范](governance/tool-experience-and-content-governance-spec.md)；
3. [用户档案与数据生命周期规范](governance/profile-and-data-lifecycle-spec.md)；
4. 对应单项工具契约负责该工具的输入、规则、来源和输出事实；[基础重建与首批工具交付规范](delivery/foundation-rebuild-and-first-tools-delivery-spec.md)负责跨模块阶段顺序和首批缩小范围；
5. 经用户批准的单阶段实施计划；
6. 当前代码、测试和旧页面文案。

单项工具契约与首批交付规范职责不同，不能用其中一份静默覆盖另一份。两者在同一事项上出现实质冲突时，先同步产品文档，再生成实施计划。

设计系统负责墨韵视觉语言和基础组件样式，不得覆盖产品规范中的真实性、隐私、公开准入和内容边界。Raw、审计历史和项目故事用于说明决策如何形成，不是当前产品规则的替代品。

### 3.1 文档维护与审阅入口

- 本索引维护规范职责、当前结论和链接；阶段进入/完成门槛以[路线图](../project/stage-roadmap.md)为准，不在审计报告另建阶段状态表。
- 来源台账只维护出处、等级、采用版本与审核范围；规则台账维护字段语义；黄金数据维护预期值。修订其中一项时同步受影响的引用、计数和版本说明。
- `docs/audits/` 保存带日期的核验与裁决证据；现状判断引用最新有效审阅，不把旧审计快照当作当前源码事实。历史失败和作废计划保留追溯，不改写成成功。
- 文档发生内容变化时更新日期与版本；资料通过、实现完成、运行验收及用户公开批准分别记录。正式文档通过正常审计与提交管理，不随执行器临时result自动升级状态。
- 当前 R3 审阅入口：[实施前资料审阅](../audits/2026-09-09-r3-evidence-package-review.md)与[运行验收记录](../audits/2026-09-09-r3-shengxiao-runtime-acceptance.md)。限定实现已获用户接受，公开准入仍独立管理；R4 本人档案已于 2026-09-14 获用户接受（`Accepted`），R5 八字基础排盘与结果历史已进入实施（见 §8.7），公开准入仍未开始。

## 4. 当前运行环境

XuanXue 已部署在可由互联网访问的服务器上，主要用于项目所有者日常使用和向他人展示，目前未主动宣传。当前统一分类为 `public_preview`：

- 它说明系统客观上可以被公众访问；
- 它不表示系统已经具备正式生产、安全、隐私、来源或内容验收资格；
- “未宣传”不能作为降低账号、接口、出生资料和历史记录安全要求的理由；
- 未通过公开门槛的工具必须同时受首页、导航、SEO、直接路由、服务端接口、历史和导出围栏约束。

当前运行事实与后续约束由 [ADR-2026-09-04-002：确认公开试运行运行环境与文档边界](../decisions/ADR-2026-09-04-002-public-preview-runtime-and-document-boundary.md) 记录。

## 5. 已批准的产品规范

| 规范                                                                                   | 决策状态 | 实施状态               | 来源/规则状态                                                                         | 当前结论                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | -------- | ---------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [产品总纲](governance/product-charter.md)                                              | Approved | 不适用；各能力独立判断 | 不适用                                                                                | 定位、用户、成功标准、三层结构、准入、第一版范围和轻量版本治理已批准                                                                                          |
| [首页与每日内容](contracts/homepage-and-daily-content-contract.md)                     | Approved | Not started            | 历法规则映射、24 节气内容目录和观照题库待建立与核验                                   | 首页结构、每日三层内容、发现入口、登录边界、透明性和三层验收已经批准                                                                                          |
| [用户档案与数据生命周期](governance/profile-and-data-lifecycle-spec.md)                | Approved | In progress            | 不适用；安全边界仍需公网专项验收                                                      | 决策已固定，不代表现有档案代码合格                                                                                                                            |
| [基础重建与首批工具交付](delivery/foundation-rebuild-and-first-tools-delivery-spec.md) | Approved | In progress            | R1–R4 限定交付已接受；R5 八字证据另行核验                                             | 固定安全、账号、游客生肖、本人档案、八字历史和全链路验收六阶段顺序                                                                                            |
| [工具统一体验与内容治理](governance/tool-experience-and-content-governance-spec.md)    | Approved | Not started            | 治理模型已批准，来源数据尚未建立                                                      | 所有工具后续共同遵守                                                                                                                                          |
| [八字工具](contracts/bazi-tool-contract.md)                                            | Approved | Not started            | 多项历法、神煞和时间规则待核验                                                        | 未满足合同清单前不得标记第一版完成                                                                                                                            |
| [生肖与太阳星座](contracts/shengxiao-and-constellation-tool-contract.md)               | Approved | In progress            | 生肖限定来源与运行证据通过；扩展及星座证据仍待核验                                    | R3 生肖限定功能 Accepted，太阳星座未实施；两者公开准入独立，当前围栏不变                                                                                      |
| [日期对照（内部标识 `zeji`）](contracts/zeji-tool-contract.md)                         | Approved | Not started            | 日期事实范围、八类事项、传统背景和首批名单待专项核验                                  | 双入口、三层独立准入、首批两至三类、零服务器历史、本地 PNG 和五组验收门已批准；当前目录为 `in_review / internal / enabled / disabled`，日期对照新能力尚未实施 |
| [八字关系对照（现有合婚退役）](contracts/hehun-tool-contract.md)                       | Approved | Not started            | 第一批干支关系只批准进入审计池，来源与实现均待核验                                    | 现有评分式合婚退役；候选继续封存，采用第三方当次草稿、浏览器本地计算、零服务器历史和十二项重新开放门禁                                                        |
| [称骨表对照（现有称骨算命下线）](contracts/guming-tool-contract.md)                    | Approved | Not started            | 具体底本、四项记值表、歌诀、权利和内容风险均未核验                                    | 下线决定已批准，旧页面下线尚未实施；后续只保留次级文化查表候选，底本无法确认时不得重建或公开                                                                  |
| [周易卦象阅读（现有易经/六爻混合功能退役）](contracts/yijing-tool-contract.md)         | Approved | Not started            | 武英殿《周易正义》基础账本、异文、解释和起卦规则均待专项核验                          | 浏览六十四卦为主、实体硬币记录/浏览器安全模拟为辅；六爻排盘独立封存，候选通过十七项门禁前保持内部隐藏                                                         |
| [姓名笔画与五格对照（现有姓名测试退役）](contracts/name-five-grid-tool-contract.md)    | Approved | Not started            | 1931 年候选底本、1929/1933 年交叉核对、81 数理和一级 3500 字账本均待专项核验          | 现有评分式姓名测试退役；后续只保留近现代方法资料对照候选，通过十八项门禁前保持内部隐藏和计算禁用                                                              |
| [测字双轨候选（现有测字占卜退役）](contracts/cezi-tool-contract.md)                    | Approved | Not started            | 规范字、汉字资料、历史案例、内容与权利均待专项核验                                    | 总入口保留“测字”，分为“了解一个字／一字观照”；旧五行、81 数理和吉凶预测退役，按能力门禁开放，目标为内部隐藏、计算阻断、历史禁用                               |
| [紫微斗数基础命盘（现有紫微预测功能退役）](contracts/ziwei-tool-contract.md)           | Approved | Not started            | 固定 `iztro 2.5.8` 规则已有工程证据；宫位、星曜、四化、亮度和五行局传统来源待专项核验 | 只保留基础命盘候选；大限流年、现实预测、错误作者归因和原生对象直存退役，通过二十项门禁前保持内部隐藏、计算阻断与历史禁用                                      |
| [梅花易数·起卦演示](contracts/meihua-tool-contract.md)                                 | Approved | Not started            | 取数、历法、互卦例外、体用和共享周易内容均待专项核验                                  | 只保留年月日时演示候选；手动/随机三数、问题输入、自动保存和预测模板退出，通过契约验收前保持内部隐藏、计算阻断与历史禁用                                       |

以上各行的“退役、下线、隐藏、阻断”表示已批准的治理要求，是否已经实现以代码和验证证据另行判断。“Not started”表示尚未按整份新规范开始系统性整改；已有页面、引擎、测试和 P0 局部成果不等于新契约已经实施。实际开始整改后应改记 In progress，而不是等到全部验收才更新状态。

## 6. 工具横向状态矩阵

### 6.1 当前代码围栏与后续放行

下表按 2026-09-15 只读核对的[工具目录](../../constants/tool-catalog.ts)记录当前四维枚举；这是代码事实，不是线上验收。旧 listed/hidden 已由 R1 替换，不继续作为当前状态维护。

| 工具 ID         | 第一版角色               | reviewStatus | exposure | computePolicy | historyPolicy  |
| --------------- | ------------------------ | ------------ | -------- | ------------- | -------------- |
| `shengxiao`     | 首批核心：生肖           | in_review    | internal | blocked       | disabled       |
| `constellation` | 后续核心：太阳星座       | in_review    | internal | blocked       | disabled       |
| `bazi`          | 首批核心：八字基础排盘   | in_review    | internal | enabled       | create_allowed |
| `zeji`          | 候选：日期对照           | in_review    | internal | enabled       | disabled       |
| `guming`        | 候选：称骨表对照         | in_review    | internal | blocked       | disabled       |
| `yijing`        | 候选：周易卦象阅读       | in_review    | internal | blocked       | disabled       |
| `name-test`     | 候选：姓名笔画与五格对照 | in_review    | internal | blocked       | disabled       |
| `cezi`          | 候选：测字双轨           | in_review    | internal | blocked       | disabled       |
| `ziwei`         | 封存候选：紫微基础命盘   | in_review    | internal | blocked       | disabled       |
| `hehun`         | 封存候选：八字关系对照   | in_review    | internal | blocked       | disabled       |
| `meihua`        | 封存候选：梅花起卦演示   | in_review    | internal | blocked       | disabled       |

生肖须在 R3 来源、实现、自动化、浏览器和用户验收完成后另行批准 approved/public/enabled，历史保持 disabled；八字在 R5/R6 对应验收后才可批准公开与 create_allowed。阶段条件不是运行枚举，不能提前写入目录。太阳星座不属于首批 R1–R6 交付。

11项工具路由均受挂载前围栏限制；zeji 的 internal/enabled 不放行普通访客。当前 R1 的四维目录与历史权限围栏已落地，未来产品能力仍按各自契约验收，不从旧 listed 状态推定可用。不得新增独立六爻公开入口绕过 yijing/meihua 围栏。

### 6.2 验收后的历史目标与导出差异

| 工具范围                           | 对应候选或核心版本通过验收后的历史策略                                    | 本地 PNG 边界                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 八字                               | create_allowed；仅主动确认保存，前置能力未验收不得切换                    | 默认脱敏；完整自用版须主动选择                                                            |
| 紫微                               | create_allowed；重新开放并完成历史验收后才可切换；当前围栏期仍为 disabled | 默认脱敏；完整自用版须主动选择                                                            |
| 生肖、太阳星座、称骨、八字关系对照 | disabled                                                                  | 按单项契约脱敏与预览；对方输入额外提示                                                    |
| 姓名、测字、周易、梅花             | disabled                                                                  | 姓名默认匿名；测字按资料/观照轨道；周易保留形成方式；梅花保留演示日期和时辰、默认不含分钟 |
| 日期对照                           | disabled                                                                  | 只为事项比较导出用户选择的一至五个完整日期；单日查看不提供导出                            |

所有生成结果的导出与服务器保存分离，不创建公开结果链接或二维码。周易静态卦象资料页可复制普通页面地址，不等于分享个人生成结果。合婚等工具的“历史为 disabled”不禁止当页临时结果；紫微的“未来可保存”也不解除当前封存。各项输入、资料带入和导出细节仍以单项契约为准，不能为了模板统一抹平领域差异。

## 7. 尚待讨论或形成契约的范围

梅花易数已完成本轮逐项产品决策，用户于 2026-09-06 审阅通过，现由[梅花易数·起卦演示契约](contracts/meihua-tool-contract.md)作为统一依据；不再列为尚无契约的工具。独立六爻排盘继续封存，未来如恢复，仍需另立契约，不能借周易卦象阅读或梅花易数恢复。

本轮已完成现有工具契约的横向复核与修订，记录见第 8 章；不据此宣称所有潜在功能都已讨论完毕。各工具仍须分别完成来源核验、实施及验收；文档批准不是公开许可，也不是自动启动实施计划的授权。

## 8. 本轮文档收口记录

本轮横向审计和文档修订记录在[2026-09-06 产品规范横向审计与收口记录](../audits/2026-09-06-product-document-closure-audit.md)。该记录只证明文档对账已经完成，不证明代码围栏、来源核验、数据安全或浏览器验收已经完成。

用户已接受该文档基线说明。本次待提交文件分类、过时说明修订及排除范围见该记录第 8 章；这批追加修订待审阅，不改变各工具的 Not started、来源或公开状态，也不构成 Git 操作授权。

2026-09-07，用户进一步逐项批准[基础重建与首批工具交付规范](delivery/foundation-rebuild-and-first-tools-delivery-spec.md)，固定 R1–R6 交付顺序并替代旧 P2–P7 路线。该批准仍只表示产品决策完成，不表示已经生成实施计划、修改代码或通过验收。

### 8.1 R1 安全收口与 R2 账号会话状态

R1 安全收口（停止自动历史写入、工具目录客户端与服务端围栏、排除认证/档案/历史接口持久缓存）已于 2026-09-07 实施并由用户接受，接受证据与提交见 [阶段路线图](../project/stage-roadmap.md#r1-安全收口)。相关提交 `2c61039` 已推送。

R2 账号与会话（独立 Account、多设备会话、HttpOnly Cookie 认证、同源校验、旧档案 410 封存）已完成实施，状态为 **Implemented, verification pending**：尚未运行 typecheck、测试、构建与浏览器验收，未写成 Accepted。默认新库为 `xuanxue-r2.db`，旧 `xuanxue.db` 仅作离线只读备份。本段不改变任何工具的公开状态（当前仍无普通访客可用工具）。

R2 收敛修复（convergence v2：事务/畸形凭证/IP 提示边界、跨组件恢复去重与网络错误重试、认证与注销弹层焦点闭环）已完成实施，同样为 **verification pending**；计划 `.claude/plans/plan-20260908-r2-account-and-session-convergence-v2.yaml`，结果 `.claude/results/20260908-r2-account-and-session-convergence-v2-result.yaml`。本轮未运行任何构建、测试、类型检查或浏览器验收。

R2 最终静态收敛（convergence v3：账号页重试后的游客跳转、AuthDialog 两种打开方式的初始焦点、事务测试表述与实际覆盖对齐）已完成实施，仍为 **Implemented, verification pending**；计划 `.claude/plans/plan-20260908-r2-account-and-session-convergence-v3.yaml`，结果 `.claude/results/20260908-r2-account-and-session-convergence-v3-result.yaml`。本轮同样未运行任何构建、测试、类型检查或浏览器验收。

R2 已于 2026-09-08 通过完整自动化与浏览器验收，状态更新为 **Accepted**。验收返修（convergence v4：恢复安全日志写入契约、修复注册依赖与事务类型、修复测试路径/自动导入环境/断言真实性）修复了此前 typecheck（securityLog 缺失导出、register 缺 dbRun 导入、事务泛型转换）、test（26 用例失败，含组件自动导入、mock 串扰、路径错误、陈旧构建产物）与 build（Nitro MISSING_EXPORT）的失败证据；修复后全套验收全绿：typecheck 0 错误、完整测试 53 文件 / 2133 用例通过、lint 0 error、build 成功。浏览器验收（生产 preview + os.tmpdir 独立临时库）覆盖游客跳转、注册、登录、两会话并存、当前设备退出、退出所有设备、防枚举错误文案、注销弹层焦点循环与注销、320/360/390/414 CSS px 与 320px + 200% 根字号无横向溢出、敏感 API `Cache-Control: no-store`；xuanxue.db SHA256 验收前后保持 `DCC92D73…8AAC` 不变。计划 `.claude/plans/plan-20260908-r2-account-and-session-acceptance-convergence-v4.yaml`，结果 `.claude/results/20260908-r2-account-and-session-acceptance-convergence-v4-result.yaml`。R2 进入门槛（R2 Accepted）已满足；R3 证据阶段已发起（见下段），R3 代码尚未实施。

2026-09-09，R3 证据经历 v1 准备、v2 收敛和 v3 收口。此前存在日期预期、来源语义及引用定位问题；Codex 随后直接补证，并按用户授权同步归档。当前证据包已**通过限定范围的实施前资料审阅**（[审阅记录](../audits/2026-09-09-r3-evidence-package-review.md)）；采用来源的限定主张已批准，产品实现与公开放行仍未完成：

- [生肖来源台账](evidence/shengxiao/shengxiao-source-ledger.md)：补齐国标目标扫描条款与同期官方外交档案（SRC-008）；纳音配对与年支五行按选定电子转录的限定主张采用，保留底本未核实说明。
- [生肖规则映射台账](evidence/shengxiao/shengxiao-rule-ledger.md)：正月初一年界、纯日期、1901-01-01 至 asOfDate 支持范围不变；年干、年支和纳音分别取证，明确 expectedPhase 与 failureCategory 的字段约定。
- [生肖黄金样例](evidence/shengxiao/shengxiao-golden-cases.yaml)：26 个日期预期（18 success / 6 invalid_input / 2 unsupported_input），18 个成功预期均补齐年干五行、阴阳、年支五行、纳音、规则版本和年界时区；另有60条六十甲子分类预期，覆盖12生肖/地支、10天干和30纳音组。共86条预期，0 个必需 unresolved、1 个 optional。数据依据来源台账整理，未运行测试；60条分类不等于60年公历换算覆盖。
- [R3 生肖实施映射](../audits/2026-09-09-r3-shengxiao-implementation-map.md)：同步资料缺口结论和后续实现约束，产品代码尚未实施。
- [历法补证附录](../audits/2026-09-09-r3-calendar-evidence-addendum.md)：记录国标目标条款页码与扫描载体等级；同期官方记录支持1900-01-31年首，结合 HKO 得到完整区间1900-01-31至1901-02-18。

**资料缺口已关闭**：BLK-001/004/007/008。电子转录与原刻校勘的等级明确区分，不再将扫描本设为二手资料统一准入门槛。纳音采用正文名称（含金泊金、路傍土、井泉水、覆灯火）；《五行大义》卷二·第五论配支干与网页原题编号区分，天干疑字不静默校订。**可选扩展** BLK-005/006（地支关系及扩展文化形象）仍未核验，第一版不展示；基础生肖次序、地支对应与干支循环保留。

R2 保持 **Accepted**；R3 保持 **Approved**，运行验证和公开准入未完成，工具目录仍为 `in_review/internal/blocked/disabled`。本次文档重分类已获授权并通过现有项目构建、类型检查及53文件/2133用例测试（[验证记录](../validation/2026-09-09-document-reorganization-validation.md)）；R3新实现及浏览器验收尚未完成。下一步先提交文档基线，再执行 R3 实现计划。计划已准备于 `.claude/plans/plan-20260909-r3-shengxiao-implementation-v1.yaml`，执行前须确认文档基线已提交；不再重复查找已取得的两项资料。

历史 v1/v2/v3 result 保留原状。v4 补证计划 `plan-20260909-r3-calendar-evidence-v4.yaml` 已由用户明确作废，不再交执行器运行；Codex 直接研究结果与已取得证据保留，记录见 `.claude/results/20260909-r3-calendar-evidence-v4-result.yaml`。

### 8.1 当前进展更正（2026-09-09）

上面的证据准备与文档分类段落保留其历史语境。当前 R3 已经过代码实施、两轮收敛及用户授权的运行验收：57 文件、2170 用例通过；126 个支持年份春节边界及 378 日期与官方历表一致，组件浏览器交互、缩放及实际图片导出已验证。用户确认继续并明确优先跑通功能和要求，产品 UI 视觉打磨后置。R3 限定功能实施状态为 **Accepted**，太阳星座仍未实施，工具公开围栏保持原状。

R4 按已批准交付规范准备本人档案实现计划；不重复讨论已批准的账号、档案数量、字段或保存方式。R4 尚未实施，不沿用 R3 的构建测试授权。后续以路线图和最新验收记录为准，不再把前文“R3 尚未开始/黄金未运行”当作现状。

### 8.2 R4 本人档案实施状态（2026-09-09）

R4 本人档案已完成代码实施与验证用例编写，状态为 **Implemented（implemented_verification_pending）**：

- 独立接口 `/api/self-profile`（GET 档案、GET summary、PUT 保存、DELETE 出生日期、DELETE 整档、PATCH 使用授权）；旧 `/api/profiles` 五接口继续 410。
- 新数据库表 `self_profiles`、`consent_receipts`（独立 `self-profile-schema.ts`）；默认仍为 `xuanxue-r2.db`。
- 本人档案页 `/self-profile`、账号设置入口、生肖页「从本人档案带入 / 保存本人资料」显式交互。
- 完整出生日期字段组（公历/农历 + 闰月）、服务端规范化与未满十四岁拒绝、差异确认、版本并发冲突、删除/撤回与最小授权凭证。

本状态不代表 Accepted、不代表公开放行；R3 限定功能保持 Accepted，R4 不自动升级 R5。实施详情与未来验收矩阵见 [R4 实施结果审计](../audits/2026-09-09-r4-self-profile-implementation-result.md)。

### 8.3 R4 运行验收与提交后复验（2026-09-13）

2026-09-13 已按用户授权在生产预览与独立临时库上完成 R4 运行验收（typecheck/test/lint/build 及 320/360/390/414 + 200% 浏览器链路），当时四项门禁通过，记录见 [R4 运行时验收](../audits/2026-09-11-r4-self-profile-runtime-acceptance.md)。

但提交 `53cd19d` 的树与那次验收的树不是同一棵：`.githooks/pre-commit` 执行 `npx lint-staged` → `prettier --write`，而 `.prettierrc` 的 `semi: false` 把 `pages/tools/shengxiao.vue` 的多语句内联处理器改写成换行且无分号的形式，Vue 只认「换行 + 分号」，于是生产构建解析失败；同一轮格式化还把 `tests/utils/self-profile-birth-date.test.ts` 中 5 处 `@ts-expect-error` 与其报错行拆开。提交树上实测：typecheck 11 个错误、测试 64 文件 / 2289 通过 + 1 套件编译失败（2289 + 45 = 2334，与验收文档声称的用例数一致）、build 失败、lint 通过。

复验结论、证据链与修复见 [R4 验收复验（驳回）](../audits/2026-09-13-r4-self-profile-acceptance-review.md)。修复后四项门禁在格式化稳定的树上全部通过（typecheck 0 错、测试 64 文件 / 2334 用例、lint 0 error / 26 warnings、build 成功），并在生产预览 + 系统临时目录全新数据库上完成真机浏览器验收：注册、建档、差异确认、409 冲突与重读、停止/重新允许带入、字段组删除、整档删除保留会话、公开围栏、320/360/390/414 × 16px/32px 无横向溢出、320px + 200% 弹层可达、`no-store` 共 **35/35 通过**；证据存于仓库外 `D:/@Temp/xuanxue-evidence/2026-09-13-r4-verify/`（含 SHA256 清单；按用户要求不纳入仓库），公开围栏下不可达的带入/替换/撤销由 125 例组件级测试承担。同时把 `.githooks/pre-commit` 从改写型（`prettier --write`）改为门禁型（`prettier --check`），并使 `npx prettier --check .` 全仓通过。但 **R4 仍为 `Implemented`、待用户接受，未 Accepted、未公开放行**。

### 8.4 R4 出版版视觉对齐（2026-09-13）

按用户批准的设计基线，`/self-profile` 对齐本人档案出版版原型：卷目索引（Ⅰ 录 / Ⅱ 授 / Ⅲ 溯 / Ⅳ 归）+ 报头 + 分节 + 记录卡，并补齐 Ⅱ 四类用途矩阵（逐行取自《用户档案与数据生命周期产品规范》§10.1）、Ⅲ 溯源与范围、Ⅳ 归档与删除（默认折叠）。仅页面级改动：未动全站顶栏、页脚、数据层与 API；原型中涉及 R5 结果历史的文案（历史条数、旧输入标记）按"不承诺未实现能力"改写，设计稿示例版本 `1.2.0` 一律使用真实告知版本 `2026-09-09`。

设计基线 [出版版视觉对齐设计](../design/2026-09-13-self-profile-editorial-redesign.md)；验收 [出版版视觉对齐验收](../audits/2026-09-13-self-profile-editorial-acceptance.md)：typecheck/lint/build/prettier 通过，测试 **66 文件 / 2365 例**通过，真机验收 **51/51 通过**，证据存于仓库外 `D:/@Temp/xuanxue-evidence/2026-09-13-self-profile-editorial/`（含 SHA256 清单；按用户要求不纳入仓库）。视觉打磨开始不等于 R4 已接受：**R4 仍为 `Implemented`、待用户接受，未 Accepted、未公开放行**。

### 8.5 账号与档案信息架构调整（2026-09-13）

用户提出的「取消账号设置页、并入本人档案」经讨论后确定为**保留两页、重新分工**：账号是身份验证与会话管理（规范 §3.1），与本人档案（§3.2）不是同一领域，且注销账号（全删 + 全部会话失效）与删除本人档案（保留账号与会话）爆炸半径不同（§13），不适合放在同一区。

落地：**登录 / 注册 / 会话恢复的落脚点改为 `/self-profile`**（注册不自动建档，空态正好引导）；`/account` 重做为出版版「账号与安全」（Ⅰ 账 / Ⅱ 话 / Ⅲ 数 / Ⅳ 销），展示昵称规则、创建时间、真实隐私与服务规则版本、本人档案状态摘要，以及退出当前设备 / 退出所有设备 / 注销；顶栏账号菜单保持三项，退出登录全局可达。同轮把 `.auth-dialog-*` 从各组件 scoped 副本提升为全局单一定义，修掉页面自己 Teleport 的弹层拿不到样式的问题。

设计见 [账号与档案信息架构调整设计](../design/2026-09-13-account-and-profile-ia.md)，验收见 [IA 调整验收](../audits/2026-09-13-account-and-profile-ia-acceptance.md)（真机 32/32，R2 三条账号流程已复跑）。页脚已统一：两页都渲染全站 `PageFooter`。以上 8.3–8.5 三段末尾「R4 仍为 `Implemented`、待用户接受」的表述是该轮当时的真实状态，已被下节取代。

### 8.6 R4 用户接受（2026-09-14）

用户已确认接受 R4 本人档案初版，R4 状态由 `Implemented` 更新为 **`Accepted`**。接受依据：

- 四项门禁在格式化稳定的提交树上通过：typecheck 0 错误、测试 **67 文件 / 2379 用例**、lint 0 error / 26 既有 warnings、`npm run build` 成功，另加 `npx prettier --check .` 与 `git diff --check` 全仓通过；
- 三轮真机浏览器验收证据齐备并已复核：R4 修复树复验 **35/35**、出版版视觉对齐 **51/51**、账号与档案信息架构 **32/32**；截图与 SHA256 清单存于仓库外 `D:/@Temp/xuanxue-evidence/`（按用户要求不纳入仓库）；
- 提交 `e473a3c`（修复提交钩子格式化导致的验收失效）与 `4dd43c6`（本人档案初版：出版版视觉与账号信息架构调整）已推送至 `codex/foundation-rebuild`。

接受范围与限制（不得被后续引用放大）：

1. 接受限定为「本人档案初版」，即功能、数据流程与已批准要求成立；不是对完整产品、视觉细节或来源真实性的整体验收；
2. **不构成公开放行**：工具目录仍为 `in_review / internal / blocked / disabled`，R6 公开门禁未开始；
3. 已知限制：`/tools/` 围栏下「带入 / 替换 / 撤销带入」没有真实浏览器路径，由 125 例组件级测试承担；
4. R4 的构建测试授权**不延伸**到 R5；R5 进入门槛（R4 `Accepted`）已满足，但 R5 尚未生成实施计划、未运行任何代码。

### 8.7 R5 八字基础排盘与结果历史实施状态（2026-09-15）

截至 2026-09-15，R5 已进入实施。本节只记录**可核对的代码事实**，不构成 R5 完成、Accepted 或公开放行：

- `constants/tool-catalog.ts` 中 `bazi` 的 `computePolicy` 为 `enabled`、`historyPolicy` 为 `create_allowed`；`exposure` 保持 `internal`，`isToolPubliclyAvailable` 仍为 false，普通访客仍被重定向到状态页。内部验证由 `XUANXUE_INTERNAL_TOOLS` 白名单控制，默认关闭。
- 已提交：`c1eb1eb`（R5-B 八字基础排盘与结果历史，含 D3 授权内部验证通道）、`7073f5d`（R5-C 按设计规格改造八字页 UI，六段结构与内容闭集不变）、`481cef9`（八字页出版版版式对齐设计基线）、`7877285`（R5-D 出版版外壳 + 交互可供性第二轮，合并为单提交）。
- 上述两轮的验收记录见 [R5-D 版式对齐验收](../validation/2026-09-15-r5d-bazi-editorial-alignment-validation.md)与[交互可供性验收](../validation/2026-09-15-bazi-interaction-affordance-validation.md)。这两份验收记录属于**执行者自查**（由执行 R5-D 的一方在提交前自行核对 `codex_review_checklist` 8 项），不是独立审查。**Codex 独立审查**见 [2026-09-20 独立审查记录](../audits/2026-09-20-codex-independent-review-7073f5d-588b6cb.md)：该审查覆盖 `7073f5d` 至 `588b6cb` 区间并指出了 R5 仍需收敛的问题。内部权限账号绑定、数据库初始化等待、请求体上限、实例锁接管已有对应修复与技术验证记录；本轮 IAB 生产预览已补齐浏览器证据，但发现卷目触控目标仅 34px，专项修复见 [R5 卷目触控目标计划](../.claude/plans/plan-20260920-r5-index-nav-touch-target-v1.yaml)，console 逐条采集仍受运行时限制。（第二轮无 `plan.yaml`／`result.yaml`，属流程留痕缺口。）
- R5 新引擎位于 `utils/bazi/*`（国标锚点 1949-10-01 甲子、分钟级节气、边界候选建模）。旧 `composables/useBaZi.ts` 的日柱锚点错误已于 `89f626d` 修正——原用自研锚点断言「1900-01-01 是甲子日」（真值甲戌），因天干地支对同一偏差值分别取模，表现为**日干恒对、日支恒偏移 +2**；现改为复用 `utils/bazi/pillars.ts` 的 `dayGanZhiIndex()`，日柱规则在仓库内只保留一处实现。`useHeHun.ts` 经 `calculateBaZi` 自动获得正确日支；相关工具围栏内不对外。
- 八字来源**取证已完成**（[来源台账](evidence/bazi/bazi-source-ledger.md)：**9 条来源条目——7 条外部证据（`SRC-BZ-001`—`005`、`008`、`009`）+ 2 条 `implementation_only`（`SRC-BZ-006`、`007`）**逐条登记，含国标 GB/T 33661—2017 扫描页目视核对、香港天文台逐年数据逐行核对、日本国立天文台《暦要項》；8 条 GAP 逐条登记），台账状态为 `evidence_prepared_review_pending`。R5-A 已完成逐条人工审阅裁决：外部来源 `SRC-BZ-001`—`005` 为 `approved`，`SRC-BZ-008/009` 为 `in_review`；`SRC-BZ-006/007` 仅确认 `implementation_only` 边界；`GAP-BZ-004` 的 NAOJ HTML 覆盖枚举已完成并关闭，剩余前置来源缺口为 `GAP-BZ-001`（立春年界直接原文）与 `GAP-BZ-007`（原刻影印核对）。注意 `implementation_only` 条目不构成外部证据，按定义不应裁决为 `approved`。DSH 执行期全面复核记录（[2026-09-15 全面复核](../audits/2026-09-15-third-party-full-review.md)）对引擎的判读为"骨架可信"，其 §15.4 亦更正了"0 个公开工具"的表述；该记录由执行期同组人员撰写，提供取证与诊断价值，**但不替代** [2026-09-20 Codex 独立审查](../audits/2026-09-20-codex-independent-review-7073f5d-588b6cb.md)（文件名保留历史标题，不改写其正文）。

**R5 阶段状态已由用户于 2026-09-20 确认，为 Accepted（限定内部验证版）**；本接受不改变公开准入与工具围栏，`bazi` 仍不对普通访客开放。完整边界见 [R5 内部验证版限定接受记录](../validation/2026-09-20-r5-limited-acceptance-validation.md)。

## 9. 已完成的审计与历史证据

- [P1 真实性与移动端审计](../audits/2026-09-01-p1-truthfulness-and-mobile-audit.md)：190 个独立展示点的规范账本；
- [P1 审计证据历史](../audits/2026-09-01-p1-audit-evidence-history.md)：记录 P1、P1.1、P1.2 的纠正过程；
- [P1 移动端浏览器验证](../validation/2026-09-01-p1-mobile-browser-validation.md)：记录 MethodologyNote 根因复现与未测边界；
- [P1 接受 ADR](../decisions/ADR-2026-09-01-001-p1-audit-acceptance-and-public-containment.md)：限定 P1 接受范围与公开收缩决定；
- [项目阶段路线图](../project/stage-roadmap.md)：记录阶段历史、状态和进入门槛。

## 10. 文档维护规则

1. 新增或修改工具规则时，先更新对应契约，再生成实施计划；
2. 每份工具契约必须引用本索引、通用规范和档案规范；
3. 单项工具不得重新定义通用状态枚举，只能提供领域级详细代码和映射；
4. 状态变化必须同时更新本文矩阵和阶段路线图；
5. 旧决策发生变化时新增 ADR 或明确标注 `Superseded`，不通过改写历史制造一致性；
6. 旧项目故事、Raw 和审计报告必须保留其历史语境，不作为当前完成状态；
7. 实施、来源核验和真实浏览器验收没有证据时，对应状态保持未完成；
8. 本索引不得写入未经用户批准的功能规则或发布日期。
9. 产品版本、数据库结构、工具规则、内容来源和文档版本分别治理，不得用一个版本号替代全部语义。

## 11. 本轮收口明确不做什么

- 不生成或讨论代码实施计划；
- 不修改产品代码、数据库、测试或页面；
- 不替尚未讨论的工具创造规则；
- 不把现有代码行为倒写为目标产品决策；
- 不把引用链接存在误写为来源已经核验；
- 不宣称 XuanXue 已经完成第一版或具备正式生产资格。
