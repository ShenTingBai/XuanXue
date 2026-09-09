# R3 生肖实施映射（证据准备子步骤产出）

> 状态：已通过实施前资料审阅；实施计划已编写，未执行
>
> 版本：0.2.0（Codex 补证同步稿）
>
> 最后更新：2026-09-09
>
> 用途：本文件是 R3 代码计划的「逐文件现状→目标」映射，不是代码已完成说明。
> 依据：[来源台账](../product/evidence/shengxiao/shengxiao-source-ledger.md)、[规则台账](../product/evidence/shengxiao/shengxiao-rule-ledger.md)、
> [黄金样例](../product/evidence/shengxiao/shengxiao-golden-cases.yaml)、[生肖与星座契约](../product/contracts/shengxiao-and-constellation-tool-contract.md)、
> [工具统一体验与内容治理规范](../product/governance/tool-experience-and-content-governance-spec.md)、
> [用户档案与数据生命周期规范](../product/governance/profile-and-data-lifecycle-spec.md)。
> 当前代码基线：HEAD 42a65b43（R2 已接受）。shengxiao 在工具目录为 `in_review/internal/blocked/disabled`。

---

## 1. 目标架构总览

R3「查我的生肖」与「认识十二生肖」按以下分层重建（契约 §19）：

- **页面** `pages/tools/shengxiao.vue`：只呈现输入、调用领域服务、按状态渲染、展示依据与范围；不自行计算。
- **输入组件** `components/tools/BirthDateInput.vue`（拟新建）：年月日选择器，校验真实日期/闰日/未来/支持范围。
- **页面内存草稿**：工具页面**组件生命周期内的 `ref`/`reactive`** 草稿（v2 修正：不建议依赖 Nuxt 共享 `useState` 的跨组件缓存，它不保证离页销毁；页面草稿初始为空、不写 localStorage/sessionStorage/URL/日志，刷新/离页/关闭/退出清除）。
- **全局结果状态** `ToolResultState`（拟新建共享类型/composable）：phase/successQualifier/freshness/failureCategory 四维。
- **纯生肖领域服务** `composables/shengxiao/*` 或 `utils/shengxiao/*`（拟新建）：公历→农历（lunar-javascript 1.7.7 候选）、干支/生肖/五行/纳音查表、年界判定；不读时钟、不访问网络、不写历史。
- **来源数据**：文化内容与字段说明按稳定键索引的内容登记表（拟新建），与计算分离（契约 §19.4）。

---

## 2. 逐文件映射

### 2.1 现有路径（需修改/退出）

| 现有文件                                              | 现状                                                                                                                                                                                                                                                                                                                               | R3 处置                                                                                                                                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pages/tools/shengxiao.vue`                           | 强制登录跳转、自动读 currentProfile.birth_date、按 birth_year 计算、引用 18 个组件/组合式函数（见第 6 节断开点）。**v2 修正**：本文件实际源码**不含** history/save/保存/POST 调用（R1 已移除自动历史保存，grep 确认无 `history`/`save`/`api/divinations`/`POST`）；v1 映射把 R1 已移除的自动保存写成当前事实，属过时表述，予以纠正 | **重写**：游客优先、完整日期输入、主动计算、ToolResultState 渲染、依据与范围、零历史；删除全部旧组件引用                                                                                               |
| `composables/useShengXiao.ts`                         | 按公历年取模（getAnimalIndex）、含运势分数/配对/太岁权重/幸运物等禁止内容                                                                                                                                                                                                                                                          | 从新页面依赖链退出；首轮保留旧模块供尚存组件和测试引用，不扩大删除范围。新领域数据独立依据规则台账重建                                                                                                 |
| `constants/shengxiao.ts`                              | 生肖性格/婚配数据                                                                                                                                                                                                                                                                                                                  | **退出**；公共文化数据在新内容登记表重建（需逐条来源）                                                                                                                                                 |
| `components/tools/shengxiao/Hero.vue`                 | 旧 Hero                                                                                                                                                                                                                                                                                                                            | 视新页面结构决定复用或重写（仅视觉资产）                                                                                                                                                               |
| `components/tools/shengxiao/WuXingGrid.vue`           | 五行展示                                                                                                                                                                                                                                                                                                                           | 若保留只展示年干/年支五行（准确命名），需核对数据来源                                                                                                                                                  |
| `components/tools/shengxiao/AnimalNav.vue`            | 生肖切换导航                                                                                                                                                                                                                                                                                                                       | 「认识十二生肖」公共浏览可复用（仅切换公共内容，不创建代表年份）                                                                                                                                       |
| `components/tools/shengxiao/Personality.vue`          | 生肖人格优缺点                                                                                                                                                                                                                                                                                                                     | **退出**（契约 §10.1 删除）                                                                                                                                                                            |
| `components/tools/shengxiao/CompatibilityGrid.vue`    | 婚配                                                                                                                                                                                                                                                                                                                               | **退出**（契约 §8/§12 删除）                                                                                                                                                                           |
| `components/tools/shengxiao/MonthlyFortune.vue`       | 逐月运势                                                                                                                                                                                                                                                                                                                           | **退出**（契约 §12 删除）                                                                                                                                                                              |
| `components/tools/shengxiao/TaiSuiMitigation.vue`     | 化太岁                                                                                                                                                                                                                                                                                                                             | **退出**（契约 §12.1）                                                                                                                                                                                 |
| `components/tools/shengxiao/GuardianBuddha.vue`       | 本命佛                                                                                                                                                                                                                                                                                                                             | **退出**（契约 §12.2）                                                                                                                                                                                 |
| `constants/guardian-buddha.ts`                        | 本命佛映射                                                                                                                                                                                                                                                                                                                         | **退出**；契约 §12.2 已记经文归因 rejected                                                                                                                                                             |
| `constants/tai-sui.ts`                                | 化太岁关系                                                                                                                                                                                                                                                                                                                         | **退出**（未经核验，R-SX-007 未建立）                                                                                                                                                                  |
| `composables/useMonthlyFortune.ts`                    | 月度评分                                                                                                                                                                                                                                                                                                                           | **退出**（契约 §12/§21.1）                                                                                                                                                                             |
| `tests/composables/useShengXiao.test.ts` + exhaustive | 断言旧按公历取模实现                                                                                                                                                                                                                                                                                                               | 首轮保留旧模块测试；另建新领域黄金测试，不把旧评分测试作为 R3 验收证据                                                                                                                                 |
| `server/api/divinations/shared.ts`                    | DIVINATION_TYPES 含 `shengxiao`（枚举保留）                                                                                                                                                                                                                                                                                        | **v2 修正**：`historyPolicy` 已 `disabled`（禁写），枚举保留 `shengxiao` 类型不表示可写入；R3 不新建生肖历史、不因枚举存在就要求删除服务器类型。首轮实现明确保留枚举及服务端围栏，不改服务器和历史模型 |

### 2.2 共享路径（保留，不删除）

| 现有文件                                                                       | 处置                                                                                 |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `components/tools/ToolPageLayout.vue`                                          | 保留（页面骨架）                                                                     |
| `components/tools/PageHero.vue`                                                | 保留（补充工具范围与内容性质）                                                       |
| `components/tools/ScrollTopButton.vue`、`SkeletonCard.vue`、`SkeletonBars.vue` | 保留（通用 UI，非生肖专属）                                                          |
| `components/tools/InkDivider.vue`、`ExportButton.vue`                          | 保留（ExportButton 按治理规范 §13 改为准确下载状态）                                 |
| `constants/bazi.ts`（ANIMALS 等）                                              | 保留（共享干支生肖基础，但生肖字段是否直接引用需评估；若含旧语义则在新领域数据重建） |
| `composables/useExportImage.ts`                                                | 保留（导出用）                                                                       |
| `utils/date.ts`（parseDate）                                                   | 保留（日期解析）                                                                     |
| `composables/useAuth.ts`                                                       | 保留（游客/认证三态）                                                                |

> 计划 must：「不得以移除旧生肖入口为由删除共享算法」。共享的 ToolPageLayout/PageHero/ExportButton/日期工具/干支基础必须保留。

### 2.3 拟新建路径

| 拟创建文件                                                                          | 职责                                                                                                  |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `components/tools/BirthDateInput.vue`                                               | 年月日选择器；校验真实日期、闰年 2/29、不支持未来、支持范围 1901-01-01 至 asOfDate；不同时填公历+农历 |
| `composables/tool-result-state.ts`（或 `types/`）                                   | 共享 `ToolResultState`：phase、successQualifier、freshness、failureCategory、failureDetailCode        |
| `composables/shengxiao/useShengXiaoDomain.ts`（或 `utils/shengxiao/`）              | 纯领域服务：公历→农历、年界、干支/生肖/地支/五行/纳音、yearBoundary；接收显式 asOfDate                |
| `composables/shengxiao/shengxiao-content.ts`（或 `constants/shengxiao-content.ts`） | 文化内容登记表（按稳定键索引，与计算分离）；仅含已核验来源内容                                        |
| `composables/shengxiao/shengxiao-sources.ts`                                        | 来源引用常量（sourceId → 显示名/链接），与来源台账同步                                                |

---

## 3. 草稿生命周期（契约 §6、profile spec §9）

| 行为                | 目标                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| 初始草稿            | 为空；不使用今天/当前年/示例值填充（契约 §6.3、foundation §5.2）                                               |
| 主动计算            | 用户填写完整日期后点击生成才计算；不自动计算（契约 §6 决策 6）                                                 |
| 修改输入            | 旧结果标记 `freshness = stale`，显示「输入已修改，结果尚未更新」，禁止保存/导出旧结果（治理规范 §7.4）         |
| 刷新/离页/关闭/退出 | 清除草稿与结果（foundation §5.2；不写 localStorage/sessionStorage/URL/日志）                                   |
| 登录不自动迁移      | 登录/注册不自动迁移游客草稿（profile spec §9.3、foundation §5.3）                                              |
| 档案带入            | 仅主动「从本人档案带入」复制出生日期到草稿；档案无日期时不报错不跳转；R4 前不提供保存入口（契约 §6.3）         |
| 十四岁确认          | 页面状态确认；未满十四岁不能提交个人日期计算，但仍可浏览「认识十二生肖」（profile spec §5.4、foundation §5.4） |

## 4. 结果状态与失败（契约 §7、治理规范 §7）

| 情形      | phase           | successQualifier / failureCategory              |
| --------- | --------------- | ----------------------------------------------- |
| 未提交    | idle            | —                                               |
| 填写/修改 | editing         | —                                               |
| 输入完整  | ready           | —                                               |
| 生成中    | processing      | —                                               |
| 唯一结果  | success         | successQualifier = unique（生肖不用 candidate） |
| 日期非法  | failure         | invalid_input                                   |
| 超范围    | failure         | unsupported_input / UNSUPPORTED_DATE            |
| 换算异常  | failure         | engine_error                                    |
| 输入已改  | success（保留） | freshness = stale                               |

## 5. 导出（契约 §6.5）

- 若保留导出，默认「隐私文化卡片」：可含生肖/干支/基础分类/规则版本；**不含**完整出生日期、昵称、账号标识、档案标识。
- 导出在客户端完成，不以服务端保存为前提。
- `stale` / `failure` / `processing` 结果不得导出（治理规范 §13.1）。

## 6. 旧生产依赖断开点（契约 §12、§21.1）

以下为 `pages/tools/shengxiao.vue` 当前引用、R3 必须断开且**不删除其他工具共享引擎**的清单：

| 断开点       | 现状引用                                                                                                                                                              | 处置                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 旧领域计算   | `composables/useShengXiao`（取模生肖/运势/配对）                                                                                                                      | 移除引用；新领域服务替代                                   |
| 逐月运势     | `useMonthlyFortune` + `MonthlyFortune.vue`                                                                                                                            | 移除                                                       |
| 配对         | `CompatibilityGrid.vue`                                                                                                                                               | 移除                                                       |
| 人格         | `Personality.vue`                                                                                                                                                     | 移除                                                       |
| 化太岁       | `TaiSuiMitigation.vue` + `constants/tai-sui`                                                                                                                          | 移除                                                       |
| 本命佛       | `GuardianBuddha.vue` + `constants/guardian-buddha`                                                                                                                    | 移除                                                       |
| 旧评分展示   | `FortuneBars.vue`                                                                                                                                                     | 移除                                                       |
| 悬浮注       | `MethodologyNote.vue`                                                                                                                                                 | 移除（来源进入正常阅读流）                                 |
| 档案自动填充 | `ProfileAutoFillBanner.vue`                                                                                                                                           | R4 前不提供档案带入保存入口；若保留带入仅显式复制          |
| 旧历史写入   | 已由 R1 移除；`historyPolicy=disabled` 禁写。**v2 修正**：当前源码 shengxiao.vue 无自动保存调用，divinations 枚举保留 `shengxiao` 类型不代表可写入；R3 不新建生肖历史 | 维持禁写；是否清理 DIVINATION_TYPES 枚举由 R3 代码计划裁决 |

> 共享引擎保留：ToolPageLayout、PageHero、ExportButton、InkDivider、ScrollTopButton、Skeleton\*、useExportImage、utils/date、constants/bazi（评估后）。

## 7. 资料缺口结论与已裁决差异

### 资料状态（按来源台账与 Codex 补证同步）

| 编号    | 阻塞项                    | 影响                  | 分类                                                                            |
| ------- | ------------------------- | --------------------- | ------------------------------------------------------------------------------- |
| BLK-001 | 国标目标条款              | 年界和编排依据        | 资料缺口已关闭，扫描页定位见[附录](2026-09-09-r3-calendar-evidence-addendum.md) |
| BLK-004 | 纳音配对及名称版本        | 纳音字段              | 资料缺口已关闭，按 SRC-005 电子转录正文采用，不宣称原刻校勘                     |
| BLK-005 | 三合/六合/冲/害/刑/破来源 | 年度地支关系/关系图谱 | **可选**（不展示时不阻塞第一版）                                                |
| BLK-006 | 生肖文化形象来源          | 扩展文化形象          | **可选**（不展示时不阻塞第一版）                                                |
| BLK-007 | 十二地支五行              | 年支五行              | 资料缺口已关闭，按 SRC-007 地支分组采用，未校订天干疑字                         |
| BLK-008 | 1900 农历年起点           | 1901-01-01 完整年界   | 资料缺口已关闭，SRC-008 同期官方记录与 HKO 组合支持                             |

### 需 Codex 裁决的真实差异（v2：本计划已记录结论）

1. **HKO 口径为「香港标准时间」（UTC+8），项目要求 Asia/Shanghai（同为 UTC+8）**：民用时钟一致，但严格记录为独立口径。**本计划结论**：纯日期口径明确保留，不把 Asia/Shanghai 历史时区全范围等同固定 UTC+8（规则台账固定口径已更新）；实施说明明示「以 Asia/Shanghai 为准，HKO 表作 UTC+8 交叉核对」。
2. **1901-01-01 所属庚子年起点超出 HKO 覆盖**：Codex 已补齐 SRC-008 同期官方记录，起点1900-01-31，结合 HKO 下一年首得终点1901-02-18。SX-001 恢复有来源的成功预期，未运行引擎；产品输入下界保持1901-01-01。
3. **生肖与八字年柱在立春-春节间可能不同**（SX-201 示例 2024-02-05）：**本计划结论**：差异解释按契约 §8.2 已获批，无需再次用户决策；R3 页面加入该解释文案。
4. **《三命通会》转录页用字作「戍属犬」，现代通行「戌属狗」**：**本计划结论**：对转录页「戍」字只记录该网页用字，未对照底本不得断言原书用字或通假；展示地支以教育部辞典的「戌」为依据（来源台账 SRC-004、规则台账 R-SX-006 已同步为「转录页用字」）。
5. **lunar-javascript `LunarYear` 聚合方式**：**本计划结论**：仅按只读源码审查说明（months 数组未按农历年过滤，需按农历年号 `getYear()` 筛选；不能直接取列表首尾当农历年边界），删除 v1 未经支持的「公历自然年聚合」概括（规则台账 §5 已更新）。

## 8. 后续测试清单（供 R3 代码计划）

- 生肖领域单元测试：消费 `golden_cases` 的26个日期预期（18 success / 6 invalid_input / 2 unsupported_input）；18个成功预期全部断言分类四字段、规则版本与年界时区，0 unresolved、1 optional。本轮仅整理数据，未运行；
- 六十甲子穷举测试：消费同文件 `classification_cases` 的60条预期，按 `inputGanZhi` 核对干支顺序、生肖/地支、年干阴阳五行、年支五行与纳音；两类数据分开计数，不能把60条分类当作60个公历日期测试；
- 年界黄金测试（春节前一日/当日/后一日三连例、立春-春节差异、跨年、asOfDate 边界）；
- 输入校验测试（闰日、非闰年 2/29、非法月日、缺年/缺月/缺日、超范围）；
- 页面交互测试（游客、草稿生命周期、主动计算、stale、十四岁确认、档案带入）；
- 明确断言生成结果时不调用历史保存 API；
- 禁止内容断言（无运势分、无配对、无本命佛/化太岁、无幸运物）；
- 移动端 320/360/390/414 + 200% 缩放验收（代码计划阶段执行）。

## 9. 公开围栏与放行

- shengxiao 当前 `in_review/internal/blocked/disabled` 保持不变。
- 首页入口、sitemap、路由放行必须留在来源与完整验收通过后（治理规范 §22、契约 §24.7）；
- 不设计隐蔽生产绕过路由；本映射不构成代码完成或公开放行。

## 10. Codex 审查发现及处置（v2 收敛 + v3 定向补齐）

| 审查发现                                  | 处置                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| SX-504 inputDate=asOfDate 却预期未来失败  | 已修正：inputDate=2026-02-18、asOfDate=2026-02-17 预期 unsupported；SX-501 保持同日成功（黄金样例 v2）                         |
| SX-001 将未核验起点放成功集合             | 历史上移入 SX-U1；现由 SRC-008 独立年首记录补齐，已恢复 SX-001，未运行验证                                                     |
| R-SX-004 将纳音性质用作年干/年支五行证据  | SRC-005a 仅支持纳音五行；年干取 SRC-006，年支取 SRC-007，三者分别取证                                                          |
| 纳音仅列名称未成 60 甲子映射              | 正文已直读30组配对；采用选定电子转录名称并修正无依据的名称转换，BLK-004 资料缺口关闭                                           |
| 实施映射顶部链接指向错误目录              | 已修正为 `../product/` 前缀（本文件位于 docs/audits/）                                                                         |
| 把 R1 已移除的自动历史保存写成当前事实    | 已纠正：源码 grep 确认无 history/save/POST；historyPolicy=disabled 禁写，不因枚举存在要求删服务器类型                          |
| 草稿 useState 共享缓存建议                | 已改：页面组件生命周期内 ref/reactive，不依赖 Nuxt 共享 useState 的离页销毁假设                                                |
| 五项待裁决                                | 已记录本计划结论（见第 7 节）                                                                                                  |
| 1901-01-01 至 19 日「腊月」表述           | 已改「十一月」（T1901c.txt：1-01 为十一、1-20 为十二月）                                                                       |
| 404 误当产品下界依据                      | 已改：404 仅说明网页缺 1900 资料，产品下界依据契约 §6.2/§8.3                                                                   |
| expectedStatus 混用 phase/failureCategory | v3 已拆为 expectedPhase + failureCategory + successQualifier（黄金样例 v3）                                                    |
| sourceRefs/startSource 混入中文说明       | v3 已清理为可解析纯净键（黄金样例 v3）                                                                                         |
| BLK-005/006 必需/可选矛盾、BLK-004 漏列   | 必需资料 BLK-001/004/007/008 已补齐；BLK-005/006 仍为可选未核验扩展，第一版不展示                                              |
| 十二地支五行完全无正文                    | SRC-007《五行大义》卷二·第五论配支干有可定位地支分组，按二手层级接受；网页原题编号另记，天干疑字不作校订，BLK-007 资料缺口关闭 |
| 1900 起点                                 | 旧访问失败不推定为地理封锁；现由同期官方外交文件明确支持1900-01-31，BLK-008 资料缺口关闭                                       |

> **范围声明**：本映射范围为「查我的生肖」与「认识十二生肖」（契约批准范围）；第一版基础公共文化浏览采用已核验的生肖次序、地支对应、干支循环基础（SRC-003/003a/004）；必需证据（年界、干支、生肖、下界、年支五行、纳音）与可选文化扩展（地支关系、扩展文化形象）分开记录，不擅自改变 Approved 范围。

---

> **状态说明**：本映射已通过[实施前资料审阅](2026-09-09-r3-evidence-package-review.md)；代码计划已编写，执行前需提交证据文档基线。产品公开验收仍未完成。标注「拟」的路径是后续代码建议，本轮未改产品代码、未运行构建测试、未开放工具。
