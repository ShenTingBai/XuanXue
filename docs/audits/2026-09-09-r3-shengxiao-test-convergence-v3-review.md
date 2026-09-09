# R3 测试证据收敛 v3 — 审阅与修正记录

> 日期：2026-09-09
> 执行者：ZCode（计划执行器）
> 计划：`plan-20260909-r3-shengxiao-test-convergence-v3.yaml`（v2.2）
> 状态：**implemented_verification_pending** —— 仅补写有效测试与审阅记录，未运行任何自动化、构建或浏览器验收；产品源码全部字节不变；不记 Accepted，不升级 R3 阶段。
> 基线：HEAD `5af305e61861724f017f3079416e5d2de89bbc2f`；baseline 指纹 `.claude/results/20260909-r3-shengxiao-test-convergence-v3-baseline.json`（19 非数据库文件）；黄金 YAML SHA256 `46ec8612c132bce1b14c35162fd0e3bff636234116ade207f1418f40640dbfbd`。

---

## 1. v2 产品修正获静态接受

v2 计划（`20260909-r3-shengxiao-implementation-convergence-v2`）修正的以下方向，Codex 静态审阅**接受其实施方向**，尚无运行证据：

- 真实历法接口：`calendar.ts` 改用 `Solar.fromJulianDay(month.getFirstJulianDay())`，移除虚构 `LunarMonth.getSolar()`；
- 领域 `asOfDate` 严格验证（无效返回 `engine_error`）；
- 页面提交门 `ageConfirm === 'confirmed'`、按钮仅 click、`exportError` 绑定 ExportButton、成功 `freshness: 'current'`、普通结果显示公历输入日期。

## 2. ExportButton 仅 prop 证据偏差未接受（v3 修正）

v2 的 `tests/components/shengxiao-page.test.ts` 对 ExportButton 使用 stub 捕获 `export-error` prop，仅验证页面把值传给组件，**不满足 v2 计划要求的独立组件行为证据**（失败文案出现、已保存不出现、导出元素与文件名）。v3 改为**真实挂载 ExportButton**：

- 在 `mount` 前为 ExportButton `<script setup>` 依赖的 Vue 组合式 API（`ref`/`watch`/`computed`/`onUnmounted`）显式 `vi.stubGlobal` 提供，`afterEach` 恢复；
- `useExportImage` 替身返回**共享** `isExporting`/`exportError` ref，驱动 `false→true→false` 流转；
- 点击真实 `.export-btn`，断言 `exportToImage` 收到 `privacy-card` 实际 `HTMLElement`（`data-privacy-card` 存在、文本不含 `2024`/`02-10`）与文件名 `生肖文化卡片.png`；
- `isExporting` false→true→false 且 `exportError` 非空 → 断言真实失败文案「导出失败，请重试」出现、「已保存」不出现；
- 清空错误后再次导出 → 断言成功反馈「已保存」出现。

> 说明：`vi.stubGlobal('ref', ...)` 对 `<script setup>` 编译产物的全局标识符解析是否在 Vitest 环境完全生效，属**静态推断**（Node 全局对象属性即全局绑定）；实际运行验证留待授权。此为源码推断与运行结果的区别，如实记录。

## 3. 本轮测试补充（repair-tests）

### 3.1 `tests/components/shengxiao-page.test.ts`

| 用例                     | v3 修正                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 游客空草稿不自动计算     | 保留；断言 3 个数字输入与空值                                                                                                                                    |
| unknown/underage 门禁    | 明确为**浏览器禁用行为**证据（disabled 按钮 + 点击后引擎不调用），不冒充函数内门禁；函数内门禁独立证明留待真实浏览器验收                                         |
| 单次原生点击只调用一次   | 保留 click 恰好一次；明确「键盘（Enter/Space）单次激活待真实浏览器验收」，不以 trigger(click) 称键盘证据                                                         |
| 确认年龄生成             | 断言隐私卡片出现、干支甲辰、公历输入日期 `2024-02-10`                                                                                                            |
| stale 禁止导出           | 修改输入后 `.export-btn` 不渲染（即使 canExportTool mock 放行）                                                                                                  |
| 真实 ExportButton 导出   | 见第 2 节；验证元素/文件名/失败文案/成功反馈                                                                                                                     |
| authenticated→guest 清除 | 断言年月日实际 value 清空、年龄 radio 取消、个人结果区（`[data-privacy-card]`）消失、**公共文化列表 12 个 tab 仍在**；不再断言整页无「龙」（与公共文化列表冲突） |
| 引擎失败保留输入         | 断言实际 value `['2024','2','10']` 而非元素存在                                                                                                                  |
| 隐私卡片不含日期         | 断言卡片文本不含 `2024`/`02-10`，普通结果含                                                                                                                      |

### 3.2 `tests/utils/shengxiao-engine.test.ts`

| 用例                           | v3 修正                                                                                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 非法与范围外输入不得调用适配器 | 改为 `vi.fn` spy，分别断言 `toLunar` 与 `yearBoundary` 调用次数为 0（不再仅靠抛错后 engine_error——catch 会吞掉任何异常）                                                                              |
| asOfDate 空串/不可能/非格式    | 三个用例均改 `vi.fn` spy，断言 `toLunar`/`yearBoundary` 调用 0 + `engine_error`                                                                                                                       |
| 完整成功结果断言               | 先 `expect(outcome.phase).toBe('success')` 再类型收窄，failure 分支因前置断言不可达，不构成空过；`ruleVersion` 从独立黄金 fixture（`rule_version`）读取，不用生产 `SHENGXIAO_RULE_VERSION` 生成期待值 |
| 26 日期预期逐例                | `ruleVersion` 断言改从 fixture 读                                                                                                                                                                     |
| 真实 1900/2024/2026 年界       | 保留（真实 adapter，不 mock 掉待修 calendar）                                                                                                                                                         |

## 4. 静态证据（已执行）

- baseline.json 19 文件指纹逐一一致；known_dirty 17 文件字节**全部保留**（产品源码未改）。
- `git diff --check` 通过；乱码检测干净；黄金 YAML SHA256 不变；数据库不读。
- 两个测试文件 TS 语法静态解析通过（未运行）。
- 只读确认 ExportButton watchers（`isExporting`→`showSuccess`、`exportError`→`showExportError`）、engine `catch{}` 统一 `engine_error`、公共生肖列表 `role="tab"` 始终渲染。

## 5. 明确区分静态推断与运行证据

- **静态推断**：`vi.stubGlobal('ref', ...)` 对真实 ExportButton 的可用性；yearBoundary 修复后行为；adapter spy 断言在真实运行时的行为。测试已编写但**未运行**。
- **运行证据（缺）**：`npm run typecheck`、`npm run test`、`npm run lint`、`npm run build`、真实浏览器 320/360/390/414 + 200% 缩放、完整支持年份春节边界、独立历表与独立引擎交叉核对、键盘真实激活。全部**待用户显式授权**。

## 6. 历史 result 处置

- v1/v2 result/checkpoint **原件保留、未篡改**。
- v1 result 根 `status=success` 错误已在 v2 审阅记录更正；v2 result 根 `status=implemented_verification_pending`。
- 本 v3 result 根 `status=implemented_verification_pending`。

## 7. 公开围栏与阶段状态

- shengxiao 工具目录保持 `in_review/internal/blocked/disabled` 不变。
- 首页入口、sitemap、路由放行必须留在来源与完整验收通过后。
- R3 阶段不升级；不提交、不推送；完整运行验收与用户批准后另行调整。

## 8. Codex 静态复核与最小补充

本节记录执行报告之后的复核，前文保留执行时的描述。接受真实 ExportButton 挂载方案、适配器零调用断言，以及成功断言之后用于类型收窄的 return；这些仍是待运行的测试代码。

不接受「函数内年龄门禁只能留待真实浏览器证明」这一偏差：禁用按钮只证明交互入口受限。现已在测试中暂时解除 DOM 按钮禁用，保持真实年龄状态不变，触发原点击监听器，分别断言 unknown/underage 不调用引擎且年龄声明未改变；另有 confirmed 正常提交用例作为对照。此方式不作为真实键盘行为证据。

同时将页面实例销毁统一放到 afterEach，确保断言失败也能清理监听器和定时器；导出目标增加与页面实际隐私卡片元素的身份相等断言。黄金哈希用例标题改为只声明元数据格式有效，不再把正则匹配表述为源文件内容一致。

以上只涉及两份测试及本审阅文档，未修改生产代码、黄金文件或历史 result/checkpoint。未运行 typecheck/test/lint/build 或浏览器验收，状态继续为 implemented_verification_pending。
