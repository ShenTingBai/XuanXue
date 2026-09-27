# 收敛生肖页「依据与范围」重复标题并迁移来源清单 — 验证记录

> 计划：`.claude/plans/plan-20260927-shengxiao-scope-heading-convergence-v1.yaml`
> 日期：2026-09-27
> 执行：ZCode（plan-execute v2.2）
> 基线 commit：`8fd8230`（`docs(r6): 归档公开收口复审`）
> 计划状态：**success**
> 用户接受与正式公开批准：**accepted（2026-09-27，用户明确确认）**

---

## 1. 本轮动因

用户于 2026-09-27 在本地 dev 预览生成生肖结果后发现：「依据与范围」这个标题在页面上出现了两次。

用户决定（本计划的收敛目标）：

1. 同名标题全页**只保留页面 Ⅳ 段 `#shengxiao-scope`**（用户原话「依据与范围就出现在Ⅳ就好了」）；
2. 结果区不再保留同名 section；
3. 结果区原有的来源清单**迁移而非删除**；
4. 来源清单默认收起，Ⅳ 段原有边界 bullet 保持直接可见。

---

## 2. 缺陷证据（改造前）

结果生成后，页面上同时存在两个文案相同、均为 `h2` 的标题：

| #   | 位置                                                                   | 来源                                                      | DOM 纵坐标 |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------- | ---------- |
| 1   | 计算结果区内第 4 张卡片，`aria-labelledby="shengxiao-sources-heading"` | `components/tools/shengxiao/VerifiedResult.vue`（改造前） | ≈ 2226     |
| 2   | 页面 Ⅳ 段 `#shengxiao-scope`                                           | `pages/tools/shengxiao.vue` 的 `SectionHeading`           | ≈ 3865     |

该重复只在生成结果后出现（结果卡在 `v-if="result"` 内）。

**同类缺陷在八字页已修过**：`docs/design/2026-09-15-bazi-interaction-affordance.md` §G 记录八字当时移除了组件内重复的同名标题，只由页面段标题承担，并留下回归断言
「标题只出现一次」（`tests/components/bazi-page.test.ts`）。生肖是后来的实现，未同步该收敛。

---

## 3. 改动内容

### 3.1 `components/tools/shengxiao/VerifiedResult.vue`

- **删除**结果区同名「依据与范围」`<section>`、`#shengxiao-sources-heading` 标题与 aria 引用、
  说明句副本、`visibleSources()` 及其仅在该列表使用的 `resolveSourceTitle`/`resolveSourceLink` 导入；
- **保留**基础结果（公历/农历/干支年/生肖/地支）、年界与版本卡片、传统分类折叠件、隐私文化卡片；
- **新增**契约 §9.1 要求的来源入口：基础结果卡内直接可见的链接
  `查看依据与范围（来源清单与规则版本）` → `href="#shengxiao-scope"`。

净变化 −40 行。

### 3.2 `pages/tools/shengxiao.vue`

- 新增 `resolveSourceTitle` / `resolveSourceLink` 导入（**只读复用** `constants/shengxiao-sources.ts`，未改来源数据）；
- 新增 `sourcesExpanded` 状态与 `visibleSources` 计算属性：条数与编号直接取自 `result.sourceRefs`，
  页面不增删、不改名；
- Ⅳ 段加入结果卡原说明句的逐句等价文本（「生肖年界采用中国农历正月初一（契约 §8.1）。传统分类仅表示
  特定传统体系的分类对应关系，不作个人命运判断。」）；
- Ⅳ 段加入**默认收起**的来源面板：`marginal-toggle` 标准模式（`aria-expanded` / `aria-controls` /
  `@keydown.enter` / `@keydown.space.prevent` 齐全）+ 设计系统 §4.1 标准 `expand` 过渡；
- 4 条边界 bullet 保持直接可见，位于折叠面板**之外**；
- 复位策略：`handleSubmit` 成功分支显式复位收起态；`watch(result)` 仅处理清空场景
  （不依赖结果对象的引用变化，见 §7 第 2 条）。

---

## 4. 来源迁移对应矩阵（迁移前 → 迁移后）

`utils/shengxiao/engine.ts` 的 `sourceRefs` 固定 9 条，改造前后逐条一致：

| #   | sourceId | 迁移前渲染位置 | 迁移后渲染位置 | 链接目标                  |
| --- | -------- | -------------- | -------------- | ------------------------- |
| 1   | SRC-001  | 结果卡来源清单 | Ⅳ 段来源面板   | `std.samr.gov.cn`         |
| 2   | SRC-002  | 结果卡来源清单 | Ⅳ 段来源面板   | `hko.gov.hk`              |
| 3   | SRC-002a | 结果卡来源清单 | Ⅳ 段来源面板   | `hko.gov.hk`              |
| 4   | SRC-003  | 结果卡来源清单 | Ⅳ 段来源面板   | `dict.revised.moe.edu.tw` |
| 5   | SRC-003a | 结果卡来源清单 | Ⅳ 段来源面板   | `hko.gov.hk`              |
| 6   | SRC-005  | 结果卡来源清单 | Ⅳ 段来源面板   | `guoxuemeng.com`          |
| 7   | SRC-006  | 结果卡来源清单 | Ⅳ 段来源面板   | `guoxuemeng.com`          |
| 8   | SRC-007  | 结果卡来源清单 | Ⅳ 段来源面板   | `miko.org`                |
| 9   | SRC-008  | 结果卡来源清单 | Ⅳ 段来源面板   | `history.state.gov`       |

**条数未减少（9 → 9），编号与链接目标均未改变。** 浏览器展开实测 9 条链接的 `href` 全部为真实
`https://` 外链（见 §6.2）。

### 4.1 与文化区来源折叠件的关系

`components/tools/shengxiao/VerifiedCulture.vue` 的折叠件标签是「展开/收起**依据与来源**」
（不同文案、非标题），列出 `CULTURE_SOURCES = ['SRC-003', 'SRC-003a', 'SRC-004']`，
其中 **SRC-004 是唯一不在结果 sourceRefs 内的来源**。

因此 R6 公开门禁第 5 项所列的 10 条来源
（SRC-001/002/002a/003/003a/**004**/005/006/007/008）在页面上仍全部可追溯：
结果相关 9 条由 Ⅳ 段来源面板承担，SRC-004 由文化区折叠件承担。该组件按计划要求**未修改**。

---

## 5. 契约与设计规范符合性

| 要求                                               | 来源                                  | 满足方式                                                                                     |
| -------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| 结果第一层含「规则版本与来源入口」                 | 契约 §9.1                             | 规则版本沿用报头 meta 与「年界与范围」卡片；来源入口为基础结果卡内的 `#shengxiao-scope` 链接 |
| 详细规则解释、来源台账**可以**默认收起             | 设计系统 §4.1「规则与来源的折叠边界」 | 来源清单默认收起，使用 `marginal-toggle` 标准模式                                            |
| 年界、支持范围、隐私状态、关键限制**必须直接可见** | 同上                                  | Ⅳ 段说明句 + 4 条 bullet 位于折叠面板之外，收起态直接可见                                    |
| 折叠件须有 `aria-expanded` / `aria-controls` 关联  | 设计系统 §4.1 折叠/展开标准模式       | 已具备；面板 id `shengxiao-scope-sources`                                                    |
| 全页「依据与范围」标题唯一                         | 用户决定 + 八字先例                   | 仅 `#shengxiao-scope` 的 `SectionHeading` 渲染该标题                                         |

---

## 6. 浏览器实测

dev server（`http://127.0.0.1:3210`，仓库外临时库 `D:\@Temp\xuanxue-dev-20260927\dev.db`）以
输入 `1990-06-15` 生成结果后进行实测。

### 6.1 六档断点

| 视口宽度 | 横向溢出 | 「依据与范围」标题数 | 折叠控件可见 | 收起态说明句与边界 |
| -------- | -------- | -------------------- | ------------ | ------------------ |
| 320      | 无       | 1                    | 是           | 直接可见           |
| 360      | 无       | 1                    | 是           | 直接可见           |
| 390      | 无       | 1                    | 是           | 直接可见           |
| 414      | 无       | 1                    | 是           | 直接可见           |
| 920      | 无       | 1                    | 是           | 直接可见           |
| 1280     | 无       | 1                    | 是           | 直接可见           |

`document.documentElement.scrollWidth === clientWidth` 在六档均成立。

### 6.2 来源面板展开实测（390px）

- 初始 `aria-expanded="false"`，面板 `#shengxiao-scope-sources` 不在 DOM；
- 点击后 `aria-expanded="true"`，面板出现，**链接数 = 9**；
- 9 条链接的 `href` 全部为真实 `https://` 地址，编号 SRC-001…SRC-008 与引擎 `sourceRefs` 逐条一致；
- 展开后仍无横向溢出。

### 6.3 自动化环境限制（如实记录）

自动化浏览器标签页处于后台时 `document.hidden === true`，rAF 被节流，Playwright 的
`click()/check()` 会因 stability 检查超时失败。本轮交互改用页面内 DOM 事件派发完成，
**仍走页面自身事件处理器**。这是自动化环境限制，不是产品缺陷；人工点击不受影响。

---

## 7. 工程门禁（全部真实执行，格式化后串行）

| 检查     | 命令                   | 结果                                                                       |
| -------- | ---------------------- | -------------------------------------------------------------------------- |
| 全仓格式 | `npm run format:check` | **通过（exit 0）**                                                         |
| 空白错误 | `git diff --check`     | **通过（exit 0）**                                                         |
| 乱码     | AGENTS.md 规定扫描命令 | 无命中（`rg` exit 1）                                                      |
| 类型     | `npm run typecheck`    | **通过（exit 0）**；仅既有 `Duplicated imports "HexagramInfo"` 警告        |
| 测试     | `npm run test`         | **通过（exit 0）**：91 文件 / **2750 用例全通过**（较上轮 +4，即本轮新增） |
| 静态检查 | `npm run lint`         | **通过（exit 0）**：0 errors / 59 warnings（与改动前基线一致，未新增）     |
| 构建     | `npm run build`        | **通过（exit 0）**：Nitro 构建完成，7.16 MB（gzip 1.63 MB）                |

### 7.1 新增回归断言（`tests/components/shengxiao-page.test.ts`，61 → 65 tests）

1. **标题全页唯一**（生成前/生成后均断言数量为 1；`#shengxiao-sources-heading` 元素与
   `aria-labelledby` 引用均不存在；`#shengxiao-scope` 的 `aria-labelledby` 指向存在的 heading）；
2. **结果第一层来源入口**存在、`href="#shengxiao-scope"`、位于成功结果卡内且不随折叠卸载；
3. **Ⅳ 段来源清单**默认收起（`aria-expanded=false`、面板不在 DOM）、收起态说明句与 4 条 bullet
   直接可见、展开后 9 条链接 + 9 个 SRC 编号 + 每条 `href` 为 `http(s)`；
4. **重新生成后回到收起态**。

既有 61 项断言全部保留并通过，未放宽或删除；未修改
`tests/pages/tools/tool-copy-content.test.ts`。

---

## 8. R6 公开门禁复核（第 5 / 10 项）

| 门禁项                               | 原证据                                       | 本轮形态下的证据                                                                                          | 结论       |
| ------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| 第 5 项：关键计算可回链 ruleId       | 「页面『依据与范围』列出全部来源」           | 页面 Ⅳ 段来源面板展开后列出结果相关 9 条；SRC-004 由文化区折叠件承担；10 条仍全部可追溯                   | **仍成立** |
| 第 10 项：结果含时间、规则和来源版本 | 「时区、农历年起止、规则版本、9 条来源引用」 | 时区与农历年起止仍在「年界与范围」卡片；规则版本在报头 meta 与卡片；9 条来源引用由结果第一层入口指向 Ⅳ 段 | **仍成立** |

**来源条数未减少，公开结论未降低。** 本记录不改写
`docs/audits/2026-09-21-shengxiao-public-gate-review.md` 与 `-v2.md` 的历史结论。

---

## 9. 未修改边界（只读确认）

| 文件 / 范围                                               | 状态                                             |
| --------------------------------------------------------- | ------------------------------------------------ |
| `components/tools/shengxiao/VerifiedCulture.vue`          | **未修改**（哈希 `41cc1eec…`，与文化区折叠件同） |
| `constants/shengxiao-sources.ts`                          | **未修改**（哈希 `7919f951…`）                   |
| `constants/tool-catalog.ts`                               | 未修改                                           |
| `utils/shengxiao/**`（含 `engine.ts` 的 sourceRefs）      | 未修改                                           |
| `tests/pages/tools/tool-copy-content.test.ts`             | 未修改                                           |
| `docs/audits/2026-09-21-shengxiao-public-gate-review*.md` | 未修改（历史结论保留）                           |
| 服务端 / 数据库 / 公开状态                                | 未修改                                           |
| 生成按钮早期禁用行为                                      | 不在本计划范围（已确认为设计行为，真实交互正常） |

---

## 10. 状态分离

| 状态         | 值                                                                          |
| ------------ | --------------------------------------------------------------------------- |
| 执行         | **Executed**：4 个任务全部完成，改动仅限 allowed_paths 内 3 个文件 + 本记录 |
| 工程门禁     | **通过**：format / diff / 乱码 / typecheck / test / lint / build 全绿       |
| 浏览器验证   | **已完成**：六档断点 + 展开态 9 条链接实测（本记录 §6）                     |
| 用户接受     | **pending**：执行器浏览器验收不替代用户接受                                 |
| 正式公开批准 | **pending**（本轮未改变任何工具的公开状态）                                 |
| 提交         | 未执行 commit / push（计划 `git.auto_commit: false`）                       |

---

## 11. 计划偏差（详见 result `plan_amendments`）

1. **`verify.grep` 与 `spec` 互斥（来源编号字面量）**：计划要求页面源码含 ≥9 个 `SRC-xxx` 字面量，
   但同一任务的 spec 要求以 `result.sourceRefs` 数据驱动渲染——源码中不会出现这些字面量。
   已按 spec 执行（避免出现第二份来源清单），并以更强的等价证据替代：
   引擎固定 9 条来源 + 运行时断言展开后 9 条链接与编号（§7.1 第 3 条）。
2. **`verify.grep` 全仓 `shengxiao-sources-heading` count 0 不可满足**：要断言该 id 不存在，
   测试必须写出该 id。产品源码命中为 **0**；4 处命中全部位于新增的否定断言
   （`expect(...).exists()).toBe(false)`），符合语义意图。
3. **折叠复位策略调整**：初始实现用 `watch(result)` 复位，依赖结果对象的引用变化；
   因测试中引擎 mock 返回同一对象引用而不触发，改为 `handleSubmit` 成功分支显式复位
   - `watch` 仅处理清空场景。生产行为不变，鲁棒性提升。

---

## 12. 用户接受记录（2026-09-27）

用户在执行完成后的后续对话中明确表示「目前我同意公开」。据此更新本轮产品验收状态：

- `user_acceptance`: **accepted**；
- `public_approval`: **accepted（产品决策层）**；
- 代码、工具目录、服务端、数据库和部署状态：**本轮未改变**；
- Git commit / push：**未执行**，仍需按项目流程由用户审计后处理。

该记录只确认用户对当前生肖公开候选体验的接受，不扩展本轮已验证的内容范围；新增公共文化内容仍需独立来源核验、契约审查和回归验证。
