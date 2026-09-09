# R3 实现静态收敛 v2 — 审阅与修正记录

> 日期：2026-09-09
> 执行者：ZCode（计划执行器）
> 计划：`plan-20260909-r3-shengxiao-implementation-convergence-v2.yaml`（v2.2）
> 状态：**implemented_verification_pending** —— 完成静态返修与回归用例编写，未运行任何自动化、构建或浏览器验收；不记 Accepted，不升级 R3 阶段。
> 基线：HEAD `5af305e61861724f017f3079416e5d2de89bbc2f`；baseline 指纹文件 `.claude/results/20260909-r3-shengxiao-implementation-convergence-v2-baseline.json`；黄金 YAML SHA256 `46ec8612c132bce1b14c35162fd0e3bff636234116ade207f1418f40640dbfbd`。

---

## 1. Codex 源码审阅发现（本次返修输入）

Codex 只读审查 v1 实施后发现的缺口，全部在本计划内修正：

1. **真实历法接口错误**：`calendar.ts` 调用 `LunarMonth.getSolar()`，但安装包 `lunar-javascript@1.7.7` 的 `LunarMonth` 仅有 `getFirstJulianDay()`，无 `getSolar()`；v1 的 `types/lunar-javascript.d.ts` 为此虚构了 `getSolar` 声明。正常换算将在 `yearBoundary` 抛异常（源码推断，未运行复现）。应使用包内真实 `Solar.fromJulianDay()` 转换月首，并保留农历年筛选。
2. **页面交互缺口**：
   - 缺输入公历日期展示；
   - 未向 `ExportButton` 传 `exportError`，导出失败会误示「已保存」；
   - 原生按钮重复绑定 `keydown` 与 `click`，会重复计算；
   - 提交函数只拒绝 `underage`，未拒绝 `unknown`；
   - 领域 `asOfDate` 未验证，空值被误归为不支持输入（应属环境错误）。
3. **v1 result 状态错误**：v1 result 根 `status` 实际为 `success`，与文字 `implemented_verification_pending` 不符。
4. **v1 文件数与越界**：v1 实际改动 18 个非数据库文件，`types/lunar-javascript.d.ts` 不在 v1 allowed 范围。接受最小类型扩展需求，但不追认虚构接口、不宣称原路径合规。

## 2. A1 有条件接受及 A2–A5 方向接受

| 项  | v1 偏离                                   | v2 裁决                                                                                              |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A1  | `types/lunar-javascript.d.ts` 越界        | **有条件接受**：作为最小必要类型扩展纳入本计划 allowed；虚构的 `LunarMonth.getSolar` 不追认，v2 移除 |
| A2  | `lunarMonthName` 用「腊」表示十二月       | 方向接受，保留                                                                                       |
| A3  | 页面测试 `vi.mock` 引擎                   | 方向接受，保留                                                                                       |
| A4  | `VerifiedResult` defineExpose 导出 DOM    | 方向接受，保留                                                                                       |
| A5  | `getShanghaiDate()` 失败返回 engine_error | 方向接受；v2 在领域层进一步严格验证 asOfDate                                                         |

## 3. 本轮修正逐文件清单

| 文件                                                                          | 动作   | 修正内容                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types/lunar-javascript.d.ts`                                                 | modify | 移除虚构 `LunarMonth.getSolar()`；`Solar` 追加真实 `fromJulianDay(number): Solar`；`LunarMonth` 追加真实 `getFirstJulianDay(): number`；保留既有声明                                                                                                                            |
| `utils/shengxiao/calendar.ts`                                                 | modify | `yearBoundary` 用 `Solar.fromJulianDay(month.getFirstJulianDay())` 取当年与次年年首；确认首月属于目标农历年且为非闰正月（月号 1 且非闰），缺失抛异常；结束日仍为次年首减一日                                                                                                    |
| `utils/shengxiao/engine.ts`                                                   | modify | 范围比较与适配器调用前严格验证 `asOfDate`；无效 asOfDate（空串/不可能日期/非 YYYY-MM-DD）返回 `engine_error`；保留 invalid input 与合法范围外 `UNSUPPORTED_DATE` 原契约                                                                                                         |
| `pages/tools/shengxiao.vue`                                                   | modify | `handleSubmit` 第一道门要求 `ageConfirm === 'confirmed'`；原生 button 仅保留 click（删除 Enter/Space 手工触发）；年龄 radio 共享 `name="age-confirm"`；解构 `useExportImage.exportError` 并绑定 `ExportButton.export-error`；成功显式 `freshness: 'current'`                    |
| `components/tools/shengxiao/VerifiedResult.vue`                               | modify | 普通基础结果显示 `result.inputDate` 及「公历出生日期」标签；隐私卡片仍只含文化分类与版本，不含输入日期或账号标识                                                                                                                                                                |
| `tests/utils/shengxiao-engine.test.ts`                                        | modify | 补真实 adapter 1900/2024/2026 年首断言（不 mock 掉待修 calendar）；补完整成功结果断言（SX-501 全字段）；补无效 asOfDate（空串/不可能日期/非格式）→ `engine_error` 且不调用 adapter                                                                                              |
| `tests/components/shengxiao-page.test.ts`                                     | modify | 补普通结果显示输入日期而隐私卡片不含日期；提交门 unknown/underage 不调用引擎；单次原生激活只调用一次；`vi.mock` canExportTool 允许导出，覆盖 current 可导出、stale 不可导出及 `export-error` prop 传递；`vi.useFakeTimers` + `vi.setSystemTime` 控制系统日期并在 afterEach 还原 |
| `docs/audits/2026-09-09-r3-shengxiao-implementation-result.md`                | modify | 追加 v2 收敛更正章节（7.1 更正 v1 实际 18 文件、类型声明越界、真实接口错误、未运行状态；7.2 本轮修正清单；7.3 静态证据与未运行项；7.4 v1 amendments 处置）                                                                                                                      |
| `docs/audits/2026-09-09-r3-shengxiao-implementation-convergence-v2-review.md` | create | 本文件                                                                                                                                                                                                                                                                          |

## 4. 静态证据（已执行，不构成运行证据）

- `git diff --check`：通过（exit 0）。
- 乱码检测：本轮全部修改文件无命中。
- known_dirty 10 文件（BirthDateInput.vue、VerifiedCulture.vue、shengxiao-rules.ts、shengxiao-sources.ts、birth-date-input.test.ts、shengxiao-golden.json、shengxiao-classification.test.ts、types/shengxiao.ts、types/tool-result.ts、utils/shengxiao/date.ts）字节与 baseline 指纹一致，**未触碰**。
- 黄金 YAML SHA256 不变（`46ec8612…bfbd`）；只读证据文档零修改。
- 真实接口核对：`LunarMonth.getFirstJulianDay()`（lunar.js:2825）、`Solar.fromJulianDay()`（lunar.js:626）、`LunarYear.getMonthsInYear()` 均存在；`LunarMonth.getSolar()` 不存在（1592 行 `getSolar` 属 `Lunar` 类）。
- 禁止路径（server/、middleware/、composables/、tool-catalog、bazi、tai-sui、guardian-buddha、package*.json、nuxt/vitest config、*.db、node_modules、.superpowers）零触碰。

## 5. 明确区分静态推断与运行证据

- **静态推断**：`yearBoundary` 修复后的行为（1900/2024/2026 年首、lunarDate 与黄金匹配）是基于安装包真实接口与黄金数据的静态预期，测试已编写**但未运行**。
- **运行证据（缺）**：`npm run typecheck`、`npm run test`、`npm run lint`、`npm run build`、真实浏览器 320/360/390/414 + 200% 缩放、完整支持年份春节边界、独立历表与独立引擎交叉核对。全部**待用户显式授权**。

## 6. v1 result 状态更正说明

- v1 result 根 `status` 为 `success`，与文字 pending 不符——**错误**。
- v1 result/checkpoint **原件保留、未篡改**。
- 本 v2 result 根 `status` 为 **`implemented_verification_pending`**。
- 后续审阅以本记录与 v2 result 为准，不回写 v1 历史为成功。

## 7. 公开围栏与阶段状态

- shengxiao 工具目录保持 `in_review/internal/blocked/disabled` 不变。
- 首页入口、sitemap、路由放行必须留在来源与完整验收通过后。
- R3 阶段不升级；不提交、不推送；完整运行验收与用户批准后另行调整。
