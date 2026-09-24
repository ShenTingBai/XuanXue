# 移动账户底部布局与生肖设计稿页面结构 — 验证记录（v3）

> 计划：`.claude/plans/plan-20260921-shengxiao-designed-flow-and-mobile-account-v3.yaml`
> 日期：2026-09-21
> 执行：ZCode（plan-execute v2.2）
> 计划状态：**partial** —— 见 §6 阻断项（计划内部矛盾，非实现缺陷）
> 用户接受与正式公开批准：**pending**

---

## 1. 本轮范围

承接 UI control v1 的 `choice-control` 成果，做两件事：

1. 移动抽屉把 guest 与 authenticated 的账户入口统一固定到底部账户区；
2. 生肖页面按设计稿意图重排为「标题与事实 → 输入 → 计算结果 → 文化 → 依据与范围」的阅读结构。

**不在范围内**：计算规则、来源结论、工具目录、认证 API、围栏、历史策略、数据库；
不复制仓库外 Open Design HTML 的独立顶栏、容器或整套 CSS。

---

## 2. 设计稿比对（只取内容层级，不取实现）

从设计稿提取的层级为：`h1 生肖文化` → 事实 meta → `h2 出生日期输入` → `h2 计算结果`（含
`h3 未能生成结果` / `h3 传统分类` / `h3 年界与范围`）→ `h2 文化说明` → `h2 依据与范围`，
另有独立顶栏、抽屉演示、modal 与「设计交付」章节。

**排除项**（按计划 must_not）：独立顶栏 `header.topnav`、`nav.sp-topnav-tools`、base64 Logo、
演示控制条、`section.sx-handoff` 交付说明、固定示例数据（庚辰 2000-08-07 等）。

**落地映射**：设计稿措辞 → 产品既有措辞，保留真实项目壳：

| 设计稿 | 落地实现 | 说明 |
| --- | --- | --- |
| `h2 出生日期输入` | `h2 查我的生肖` | 保留产品既有措辞（计划明示） |
| `h2 计算结果` | `h2 计算结果`（新增） | 本轮新增的可见阅读层级 |
| `h2 文化说明` | `h2 认识十二生肖` | 保留产品既有措辞 |
| `h2 依据与范围` | `h2 依据与范围` | 已有 |

---

## 3. 实施内容

### 3.1 移动抽屉账户区（`layouts/default.vue`）

改动前：`nav(工具导航)` → **guest 账户项** → `flex-1` spacer → authenticated 账户区 → 底部哨兵。
guest 与 authenticated 分处两个不同的视觉分组。

改动后：`nav(工具导航)` → `flex-1` spacer → 底部账户区（guest 或 authenticated 二选一）→ 底部哨兵。

- guest 沿用同一分隔线样式与 `flex flex-col px-3 py-3 gap-1` 容器，与登录态结构对称；
- guest 仍是**单一**账户控件（账户图形 + 「未登录」，`aria-label="未登录，前往登录或注册"`，链接 `/login`），
  未出现并排「登录」标签；
- guest 守卫放在外层 `<template>` 上，使分隔线与容器随身份一起出现/消失（否则登录态会多出一条空分隔线）；
  `v-if="authStatus === 'guest'"` 总数仍为 2，`restoring` 防闪烁不变；
- 未改动：焦点捕获（`trapFocusForward` / `trapFocusBack`）、Escape、关闭、route 导航、退出逻辑、
  authenticated 菜单内容。

### 3.2 生肖页面结构（`pages/tools/shengxiao.vue` 等）

1. **事实与边界 meta**（新增）：年界口径、支持范围、时区、规则版本四项以 `dl` 直接可见。
   这四项决定「结果是否适用于你」，因此不进任何折叠区。
2. **输入卡**：保留「查我的生肖」、档案带入、替换确认、撤销、年龄确认、主动生成与隐私说明。
3. **计算结果**（新增可见层级）：`h2 计算结果` + 「结果只包含可核验的年份、干支、生肖与农历日期，
   以及传统分类对应关系，不含推断」；状态覆盖**空态 / 处理中 / 失败 / stale / 成功**五态，
   空态为「尚未生成结果」引导；成功态保留导出与主动保存。状态与结果同处一个 `aria-live="polite"`
   `aria-atomic="true"` 区域。
4. **文化区与依据区**：保留十二生肖 tabs 键盘模型与来源台账折叠。

折叠边界修正：`VerifiedCulture` 的文化边界说明与 `VerifiedResult` 的传统分类关键限制
（「不代表个人整体五行强弱，也不能推出喜用神、性格或命运」）从折叠面板内**移出**，改为始终直接可见——
折叠只影响详细程度，不影响适用性判断。

侧边导航新增「计算结果」锚点，与设计稿的卷目索引意图一致。

### 3.3 八字兼容钩子清理（`components/bazi/BaziInputForm.vue`）

删除 `bazi-check` class 与 `.bazi-age input:checked + .bazi-check` scoped 规则及其注释；
十四周岁 checkbox 只使用全局 `choice-control__indicator--box`。业务值、验证与事件未变。

---

## 4. 工程验证

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 空白错误 | `git diff --check` | 通过 |
| 乱码 | 项目 AGENTS.md 规定的乱码特征扫描 | 无命中 |
| 类型 | `npm run typecheck` | 通过（exit 0） |
| 静态检查 | `npm run lint` | 0 errors（57 warnings，均为改动前既有） |
| 构建 | `npm run build` | 通过（7.07 MB / 1.62 MB gzip） |
| 测试 | `npm run test` | **未全绿：2732 passed / 1 failed** —— 见 §6 |
| 迁移残留 | `rg "bazi-check" components/bazi/BaziInputForm.vue tests/pages/tools/bazi.test.ts` | 0 匹配 |
| 账户底部顺序 | `npx vitest run tests/layouts/default-layout.test.ts` | 11 passed |
| 生肖结构回归 | `npx vitest run tests/components/shengxiao-page.test.ts` | 61 passed（新增 4 项结构断言） |
| 八字交互回归 | `npx vitest run tests/pages/tools/bazi.test.ts` | 11 passed |

---

## 5. 真实浏览器验收（生产构建）

浏览器：ZCode IAB。服务：`node .output/server/index.mjs`，`DB_PATH` 指向临时库。

### 5.1 移动抽屉账户区（390px，guest）

| 指标 | 实测 |
| --- | --- |
| 工具导航底部 | y=157 |
| 账户项顶部 / 底部 | y=664 / y=708 |
| 抽屉面板底部 | y=720 |
| 账户项命中高 | 44px |
| 账户项是否在导航之后 | 是（664 > 157） |
| spacer 是否早于账户项 | 是 |
| `/login` 入口数 | 1 |
| 文本 / aria-label | 「未登录」 /「未登录，前往登录或注册」 |
| 是否并排「未登录 登录」 | 否 |

### 5.2 移动抽屉账户区（390px，authenticated）

账号块顶部 y=580，退出项底部 y=708，面板底部 y=720，导航底部 y=157；
抽屉项依次为 生肖 / 账号与安全 / 本人档案 / 退出，显示真实昵称 `v3_audit`，无 guest 入口。
两种身份占据**同一底部账户区**。

### 5.3 窄屏与字体缩放

| 视口 | 横向溢出 | 选择控件最小高 | meta 溢出 |
| --- | --- | --- | --- |
| 320px | 无 | 44px | 无 |
| 360px | 无 | 44px | 无 |
| 390px | 无 | 44px | 无 |
| 414px | 无 | 44px | 无 |
| 320px + 200% 字体 | 无 | 236px | 无 |
| 414px + 200% 字体 | 无 | 101px | 无 |

320px 抽屉 guest 账户项：命中高 44px、底部 y=688（面板底 700）、文本无裁切、`/login` 入口 1 个。

### 5.4 生肖页面结构（生产构建）

| 项 | 实测 |
| --- | --- |
| 四段存在 | `#shengxiao-query` / `#shengxiao-result` / `#shengxiao-culture` / `#shengxiao-scope` 全部存在 |
| 事实 meta | 年界口径 / 支持范围（公历 1901-01-01 至查询当日）/ 时区 Asia/Shanghai / 规则版本 2026-09-09，全部直接可见 |
| 计算结果标题与说明 | 「计算结果」+「不含推断」可见 |
| 默认状态 | 空态「尚未生成结果」，位于 `aria-live="polite" aria-atomic="true"` 容器内 |
| 文化 tabs | 12 个 tab，tablist / tabpanel 关联存在 |
| 来源台账 | `aria-expanded="false"`，`#culture-sources-panel` 不存在；文化边界说明仍直接可见 |
| 侧边锚点 | 查我的生肖 / 计算结果 / 认识十二生肖 |
| 生成后 | 成功态出现、空态消失、生肖与干支可见、年界与范围可见、**关键限制可见**、传统分类仍默认收起、导出与保存入口存在 |
| console / unhandledrejection | 0 |

### 5.5 截图

`D:/Projects/Project/XuanXue/.claude/audit-shots/`

| 文件 | 内容 |
| --- | --- |
| `v3-01-mobile-drawer-guest.png` | 390px 抽屉：账户项贴底、与工具导航分离 |
| `v3-02-mobile-drawer-auth.png` | 390px 抽屉登录态：同底部账户区 |
| `v3-03-shengxiao-structure.png` | 生肖页面：meta、输入卡、计算结果层级 |

---

## 6. 阻断项：`npm run test` 未全绿（计划内部矛盾）

**现象**：1 个用例失败，且与实现无关：

```
FAIL tests/components/bazi-page.test.ts > 八字页面六段结构 > 交互反馈：勾选框不用原生样式，六问折叠有可展开标记
tests/components/bazi-page.test.ts:122
  expect(page.find('.bazi-check').exists()).toBe(true)
```

**原因**：计划同时要求两件互斥的事：

1. `rules.must_not`：「不保留 bazi-check 兼容钩子作为第二套 choice-control 视觉」，
   且 task `remove-bazi-compat-hook` 的 grep 门禁要求 `components/bazi/BaziInputForm.vue`
   中 `bazi-check` 出现次数为 0；
2. task `remove-bazi-compat-hook` 的 automation 门禁运行
   `tests/components/bazi-page.test.ts` 并要求 exit 0，而该文件第 122 行断言
   `page.find('.bazi-check').exists()` 为 true。

删除钩子后该断言必然为假。而 `tests/components/bazi-page.test.ts` **不在计划的
`scope.allowed_paths`，也不在任何任务级 `allowed_paths`，亦不在 `known_dirty_files`**，
执行器无权修改。

**处置**：按路径约束，未修改该文件；in-scope 改动全部完成（钩子已删除、grep 门禁 0 匹配）。
本项记入 `plan_amendments`，交 Codex 修正计划。

**建议修正（一行）**：`tests/components/bazi-page.test.ts:122` 的 `.bazi-check` 改为
`.choice-control__indicator--box`（该选择器在挂载后的页面中存在；同文件其余
`[data-bazi-age]` 断言均已通过）。

---

## 7. 限制与未覆盖

1. **blocked 工具未做浏览器复验**：合婚 / 称骨 / 紫微 / 择日在目录中为 `computePolicy: blocked`，
   路由围栏统一重定向状态页，真实页面无法打开。本轮未伪称其视觉已通过浏览器验收；
   其选择控件迁移由 v1 的源码审查与单元测试覆盖，待公开前复验。
2. **真实移动设备**：仅视口模拟，未在真机验收。
3. **键盘实操**：抽屉的 Tab / Shift+Tab 焦点捕获与 Escape 由源码与既有测试覆盖，
   本轮未逐键在浏览器中实测（后台标签页 rAF 节流会影响按键稳定性判定）。
4. `200%` 字体缩放以根字号模拟，与浏览器「缩放文字」菜单行为等价但不完全等同。
5. 历史文档（`docs/design/2026-09-15-bazi-interaction-affordance.md` 等）仍记录已退役的
   `bazi-check`，属受日期约束的旧记录，本轮未改；如需批注应由后续计划处理。

---

## 8. 状态分离（不得互相替代）

| 状态 | 值 |
| --- | --- |
| 工程通过 | **否**（typecheck / lint / build 通过，`npm run test` 有 1 项因计划矛盾未绿） |
| 视觉验收 | 通过（本文 §5，生产构建 + 真实浏览器） |
| 用户接受 | **pending** |
| 正式公开批准 | **pending**（本轮未改变任何工具的公开状态） |

---

## 9. 数据库隔离与清理结果

- 预览服务以 `DB_PATH` 指向临时文件（`/tmp/v3-preview.db`）启动；
  `xuanxue-r2.db` 与 `xuanxue.db` 未被读取、写入或迁移；
- 审计账号 `v3_audit` 及其数据只存在于临时库，进程结束后即废弃；
- 未执行任何 git commit / push（计划 `auto_commit: false`）；
- 预览与开发服务已停止。
