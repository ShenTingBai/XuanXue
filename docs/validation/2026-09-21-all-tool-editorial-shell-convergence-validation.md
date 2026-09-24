# 统一全站工具页面外壳与卷目系统 — 验证记录

> 计划：`.claude/plans/plan-20260921-all-tool-editorial-shell-convergence-v1.yaml`
> 日期：2026-09-21
> 执行：ZCode（plan-execute v2.2）
> 计划状态：**success**（附受限项，见 §7）
> 用户接受与正式公开批准：**pending**

---

## 1. 本轮范围

把 12 个工具页从两套并存的外壳收敛为一套：新增组合件 `ToolEditorialShell`，
统一 `editorial-shell + IndexNav（卷目） + Masthead（报头） + editorial-article + PageFooter`。
工具页之间只保留段落、输入、结果与来源的差异。

**不在范围内**：工具计算、认证、保存、历史、来源结论、目录状态、服务端围栏、数据库；
首页/登录/隐私/条款/账号/档案保留各自页面类型（共享全局顶栏与页脚），不套工具模板。

---

## 2. 迁移矩阵

| 页面            | 迁移前外壳                           | 迁移后卷目段序                                                                                  | 目录状态           | 浏览器可达                                                 |
| --------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------- |
| `shengxiao`     | ToolPageLayout + PageHero + nav-link | Ⅰ 查我的生肖 / Ⅱ 计算结果 / Ⅲ 认识十二生肖 / Ⅳ 依据与范围                                       | public · enabled   | ✅ 已真实验收                                              |
| `bazi`          | 直接用 editorial-shell 四件套        | Ⅰ 工具说明 / Ⅱ 本次操作 / Ⅲ 核心结果摘要 / Ⅳ 通俗解释与详细结果 / Ⅴ 依据与范围 / Ⅵ 本次结果操作 | internal · enabled | ✅ 已真实验收（内部验证白名单）                            |
| `status`        | ToolPageLayout + PageHero            | Ⅰ 功能状态                                                                                      | 围栏落地页         | ✅ 已真实验收                                              |
| `constellation` | ToolPageLayout + 左栏选择器          | Ⅰ 星座分析 / Ⅱ 本命星盘 / Ⅲ 今日运势与宜忌 / Ⅳ 速配星座                                         | internal · blocked | ❌ 源码 + 单测                                             |
| `zeji`          | ToolPageLayout                       | Ⅰ 选择事项 / Ⅱ 日历与推荐吉日                                                                   | internal · enabled | ❌ 源码 + 单测（`/tools/zeji` 未开 SSR，白名单通道不可用） |
| `hehun`         | ToolPageLayout + `#nav` 侧栏         | Ⅰ 对方信息 / Ⅱ 合婚综论 / Ⅲ 八字对照                                                            | internal · blocked | ❌ 源码 + 单测                                             |
| `guming`        | ToolPageLayout                       | Ⅰ 称骨推算 / Ⅱ 骨重详表 / Ⅲ 袁天罡称骨歌                                                        | internal · blocked | ❌ 源码 + 单测                                             |
| `ziwei`         | ToolPageLayout + `#nav-right` 右栏   | Ⅰ 排盘 / Ⅱ 命盘与宫位解读                                                                       | internal · blocked | ❌ 源码 + 单测                                             |
| `cezi`          | ToolPageLayout                       | Ⅰ 测字 / Ⅱ 测字笺                                                                               | internal · blocked | ❌ 源码 + 单测                                             |
| `name-test`     | ToolPageLayout                       | Ⅰ 输入姓名 / Ⅱ 五格剖象                                                                         | internal · blocked | ❌ 源码 + 单测                                             |
| `yijing`        | ToolPageLayout                       | Ⅰ 起卦方式 / Ⅱ 占卜结果                                                                         | internal · blocked | ❌ 源码 + 单测                                             |
| `meihua`        | ToolPageLayout                       | Ⅰ 梅花易数 / Ⅱ 体用生克分析 / Ⅲ 白话解读                                                        | internal · blocked | ❌ 源码 + 单测                                             |

**卷目条目一律取自页面已有段落**，不为凑足条数新增段：`zeji` / `name-test` / `yijing` / `ziwei` 为 2 项，
`status` 为 1 项。旧判据要求的「≥4 锚点节」已在本轮改为内容规则（见 §3.2），不再作为使用卷目的前置条件。

---

## 3. 实施内容

### 3.1 新增 `components/editorial/ToolEditorialShell.vue`

组合件，固定 DOM 顺序：

```
div.editorial-shell
├─ IndexNav（卷目）
└─ article.editorial-article
   ├─ Masthead
   ├─ <slot name="masthead-extra">   报头补充区（页面级事实/边界条）
   └─ <slot>                          正文 .editorial-section 序列
<slot name="after">                   根级附加区（弹层）
PageFooter
```

Props：`indexItems`、`indexFootnote`（必填，写该页真实边界）、`edition`、`title`、`subtitle`、
`statusText?`、`metaText?`、`seal?`。组件不推断工具状态，不定义新颜色/按钮/卡片。

**`shellClass` 未采纳**：外壳是多根结构（`after` 插槽与页脚为根级兄弟），子组件渲染的节点也不带父组件
scope id，传 class 无法让页面 scoped 规则命中。改为规定「页面根级样式挂在自己插槽内的容器上」，
并在设计系统注册。`shengxiao` 的 `.shengxiao-page` 与 `bazi` 的 `.bazi-page` 均按此实现。

### 3.2 设计系统更新（`docs/design/design-system.md`，版本 1.3.0 → 1.4.0）

- 组件表新增 `ToolEditorialShell` 及其职责；
- 章节「卷目版式的适用判据（2026-09-15）」改写为「卷目版式的适用范围（2026-09-21 起：全部工具页）」：
  原「≥4 锚点节 / 左栏无控件 / 治理规范已有段序」三条改为**内容规则**（卷目只能索引已有段落、
  左栏只做锚点、状态与元信息由页面传入），并登记 `ToolEditorialShell` 的 DOM 顺序、Props 契约、
  根级样式挂载规则、响应式与可访问性要求、`ToolPageLayout` 迁移规则与例外页面；
- 记录旧判据被取代的原因：旧理由「生肖左栏被工具内选择器占用」只对旧实现成立，
  该选择器 `components/tools/shengxiao/AnimalNav.vue` 自 R3 起无人引用（死代码），
  十二生肖浏览已改在正文内以 tabs 呈现。

### 3.3 `IndexNav` 惰性解析修复（`components/editorial/IndexNav.vue`）

旧实现挂载时一次性快照锚点目标，且**目标为空时直接 return**（连滚动监听都不挂）：

- 工具页在异步恢复会话/档案后才渲染结果段 → 快照为空，当前节高亮永久失效；
- `:key` 重绘会整体替换节点 → 快照指向已脱节元素。

现改为：目标失效（空或 `isConnected === false`）时重新解析并重挂几何监听；监听器无条件挂载；
新增 `MutationObserver`（`body` + `childList/subtree`）兜底，覆盖「段落晚渲染」与「keyed 重绘」；
卸载时统一断开。这是计划 `rules.must`「活动项高亮在所有工具页一致」的必要修复。

---

## 4. 工程验证

| 检查     | 命令                                                           | 结果                                                                                                              |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 空白错误 | `git diff --check`                                             | 通过                                                                                                              |
| 乱码     | 项目 AGENTS.md 规定的乱码特征扫描                              | 无命中                                                                                                            |
| 类型     | `npm run typecheck`                                            | 通过（exit 0）                                                                                                    |
| 测试     | `npm run test`                                                 | **90 文件 / 2733 用例全通过**                                                                                     |
| 静态检查 | `npm run lint`                                                 | 0 errors（59 warnings，见下）                                                                                     |
| 构建     | `npm run build`                                                | 通过（7.15 MB / 1.63 MB gzip）                                                                                    |
| 残留外壳 | `rg -l "ToolPageLayout" pages/tools/`                          | 0 命中（12/12 已迁移）                                                                                            |
| 历史收口 | `npx vitest run tests/pages/tools/history-containment.test.ts` | 6 passed（11 个工具页均无 `/api/divinations`、`saveDivinationResult`、`<HistoryModal`、`show-history`、浏览历史） |

lint warnings 57 → 59：新增的 2 条为 `ToolEditorialShell` 的 `statusText` / `metaText`
「requires default value」，与既有 `Masthead.vue` 的两条完全同类（同一写法、同一约定），未单独偏离。

---

## 5. 真实浏览器验收（生产构建）

服务：`node .output/server/index.mjs`，`DB_PATH` 指向临时库，`XUANXUE_INTERNAL_TOOLS` 仅授权 bazi。

### 5.1 跨页外壳一致性（1280×800）

| 页面                      | `.editorial-shell`                        | 卷目 | 卷目项数 | 当前节高亮              | 卷目项命中高 | `h1` 数 | console |
| ------------------------- | ----------------------------------------- | ---- | -------- | ----------------------- | ------------ | ------- | ------- |
| `/tools/shengxiao`        | ✅                                        | ✅   | 4        | ✅ Ⅱ 计算结果           | 44px         | 1       | 0       |
| `/tools/bazi`             | ✅                                        | ✅   | 6        | ✅ Ⅳ 通俗解释与详细结果 | 44px         | 1       | 0       |
| `/self-profile`           | ✅                                        | ✅   | 4        | ✅ Ⅱ 授                 | 44px         | 1       | 0       |
| `/account`                | ✅                                        | ✅   | 4        | ✅ Ⅱ 话                 | 44px         | 1       | 0       |
| `/tools/status?tool=zeji` | ✅                                        | ✅   | 1        | —（单段）               | 44px         | 1       | 0       |
| `/`                       | ❌ 非工具外壳（按 must_not 保留首页模板） | —    | —        | —                       | —            | 1       | 0       |

`/self-profile`、`/account` 的高亮为 `IndexNav` 改动后的回归确认：两页行为未退化。

### 5.2 卷目状态与 Masthead

- 卷目标题「卷 目」、脚注（上细线 + 页面真实边界）均按页面传值渲染；
  `shengxiao` 脚注为「年界 · 农历正月初一 / 支持 1901-01-01 至查询当日」；
- 报头承载印章 / 眉题 / 标题 / 副题 / 状态胶囊 / 元信息行：`shengxiao` 无胶囊（公开工具），
  `status` 页面胶囊为「功能整理中」，`bazi` 由目录 `exposure` 派生；
- 页面只保留一个 `h1`（由 `Masthead` 提供），旧的 `sr-only` h1 已移除。

### 5.3 响应式与字体缩放（`/tools/shengxiao`）

| 视口                        | 横向溢出 | 卷目定位 | 卷目排列              | 卷目项高 | 脚注 |
| --------------------------- | -------- | -------- | --------------------- | -------- | ---- |
| 320 / 360 / 390 / 414 / 900 | 无       | `static` | `row`（回流正文上方） | 44px     | 隐藏 |
| 1024                        | 无       | `sticky` | `column`              | 44px     | 显示 |
| 320 + 200% 字体             | 无       | `static` | `row`                 | 55px     | 隐藏 |
| 414 + 200% 字体             | 无       | `static` | `row`                 | 55px     | 隐藏 |

即：桌面 sticky、≤920px 回流到正文上方两行网格、命中区不低于 44px、200% 字体缩放下不溢出不裁切——
与计划 `rules.must` 第 4 条一致，且与档案/八字同值。

### 5.4 状态页保持纯状态页

`/tools/status?tool=zeji`：1 个 `h1`、0 个输入/提交控件、胶囊「功能整理中」、单项卷目。
围栏落地页未被改成计算页。

### 5.5 截图

`D:/Projects/Project/XuanXue/.claude/audit-shots/`

| 文件                                         | 内容                                              |
| -------------------------------------------- | ------------------------------------------------- |
| `shell-shengxiao-editorial.png`              | 生肖页统一后外壳：卷目 + 报头 + 事实边界条 + Ⅰ 段 |
| `sidebar-bazi.png` / `sidebar-shengxiao.png` | 改造前对照（八字卷目 vs 生肖普通 nav-link）       |

---

## 6. 未公开工具证据边界

9 个 `blocked` 工具（constellation / hehun / guming / ziwei / cezi / name-test / yijing / meihua
与 zeji 的实际可达性）在服务端围栏下**无法打开真实页面**，本轮**未伪称其视觉已通过浏览器验收**。
其证据为：源码迁移 + SFC 编译通过 + 结构性单测全绿 + `history-containment` 跨页扫描。
公开前需按其准入流程补做浏览器复验。未为截图而修改任何围栏。

---

## 7. 限制与未覆盖

1. **blocked 工具无视觉验收**：见 §6。
2. **移动端截图缺失**：本轮截图命令在自动化环境中超时（后台标签页 rAF 节流，属既有环境限制），
   移动端结论来自 `getComputedStyle` 与几何实测（§5.3），不是截图。
3. **constellation 卷目高亮**：其段落由 keyed `content-fade` 在切换星座时重绘，本轮已通过
   `IndexNav` 惰性解析 + DOM 观察兜底；但该页 blocked，未能真机复验。
4. **`ziwei` 行为差异**：原 `#nav-right` 右栏（`hidden lg:block`）改为正文 Ⅱ 段后，
   ≤1023px 也会显示该面板；`ZiWeiDetailSheet` 移动弹层未变（见 plan_amendments）。
5. **导出图片内容变化**：`hehun` / `guming` 的导出 PNG 现在包含新的 Ⅱ/Ⅲ 分节标题；
   `ziwei` 导出少了原 `紫微斗数` h2 行（改为报头 h1 + Ⅰ 段标题）；`cezi` 不变；`meihua` 导出内多了细分隔线。
6. **`name-test` 仍含评分式 UI**（`ScoreRing` / `score-banner` / 大吉阈值）：本轮为外壳迁移，
   未动内容；该工具 blocked，但共享件 `ScoreRing`/`score-banner` 在设计系统中标注为「公开产品禁用」，
   待其契约整改时清理（见 plan_amendments 与 follow-up）。
7. **`AnimalNav.vue` 死代码未删**：计划 task-1 明确「只记录，不在本任务删除」。
8. **历史文档**仍记录已退役的 `bazi-check`（受日期约束的旧记录），本轮未改。

---

## 8. 状态分离（不得互相替代）

| 状态         | 值                                                                   |
| ------------ | -------------------------------------------------------------------- |
| 工程通过     | 是（typecheck / test / lint / build 全绿）                           |
| 视觉验收     | 通过（可达页面：生肖、八字、状态页、档案、账号；blocked 工具未覆盖） |
| 用户接受     | **pending**                                                          |
| 正式公开批准 | **pending**（本轮未改变任何工具的公开状态）                          |

---

## 9. 数据库隔离

预览服务以 `DB_PATH` 指向临时文件（`/tmp/shell-prod.db`）启动；
仓库内 `xuanxue-r2.db` 与 `xuanxue.db` 未被读取、写入或迁移；审计账号只存在于临时库；
未执行任何 git commit / push（计划 `auto_commit: false`）；验收后服务已停止。
