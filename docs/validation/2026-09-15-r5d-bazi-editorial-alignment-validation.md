# R5-D 八字页出版版版式对齐：实施与验收记录

> 计划：`.claude/plans/plan-20260915-r5d-bazi-editorial-alignment.yaml`（已通过 `D:/Env/Claude/scripts/plan-validate.py`，0 errors / 0 warnings）
>
> 设计基线：[`docs/design/2026-09-15-bazi-editorial-alignment.md`](../design/2026-09-15-bazi-editorial-alignment.md)（2026-09-15 用户已确认，D1–D13）
>
> 上游阶段：R5-C（提交 `7073f5d`）；内部验证入口修复（提交 `b3160e8`）
>
> 运行授权：用户已授权本阶段运行 `git diff --check` / `npx prettier --check .` / `npm run typecheck` / `npm run test` / `npm run build` 与真机断点验收（2026-09-15）
>
> 执行者与审查者：同一会话

## 1. 执行进度

| 计划任务                       | 状态 | 产物                                                                                                     |
| ------------------------------ | ---- | -------------------------------------------------------------------------------------------------------- |
| `audit-current-state`          | ✅   | 调用方清单（2 页 + 3 组件）、`editorial-*` 类与断点、八字页六节结构与测试断言位置                        |
| `extract-editorial-components` | ✅   | 新增 `components/editorial/{IndexNav,Masthead,SectionHeading}.vue`；删除三个 `Profile*`；同步 5 处调用方 |
| `reshell-bazi-page`            | ✅   | `pages/tools/bazi.vue` 换成出版版外壳（卷目 + 报头 + 六个 `editorial-section` + 显式页脚）               |
| `sync-design-system`           | ✅   | `docs/design/design-system.md`（组件归属改写 + 卷目版式适用判据 + 已知未修项）                           |
| `update-tests`                 | ✅   | 三份测试同步；既有断言一条未放宽                                                                         |
| `gates-and-acceptance`         | ✅   | 本文 §2、§3、§4                                                                                          |

## 2. 门禁结果（2026-09-15，先停 dev 服务器后逐条运行）

| 命令                     | 退出码 | 结果                                                                                                        |
| ------------------------ | ------ | ----------------------------------------------------------------------------------------------------------- |
| `git diff --check`       | 0      | 无空白错误                                                                                                  |
| `npx prettier --check .` | 0      | All matched files use Prettier code style                                                                   |
| `npm run typecheck`      | 0      | 无 TS 错误                                                                                                  |
| `npm run test`           | 0      | **80 文件 / 2587 例全过**（R5-C 为 2583 例，本轮 +4：卷目锚点、aria-labelledby、页面静态回归、`seal` 属性） |
| `npm run build`          | 0      | 构建完成：Σ 7.05 MB（gzip 1.61 MB）                                                                         |

`npm run build` 前先停掉 dev 服务器（job `pwsh-4`），构建后重新拉起（job `pwsh-5`，端口 3000、随机 `SESSION_SECRET`、`XUANXUE_INTERNAL_TOOLS=bazi:1|2|3|4|5`、默认库 `xuanxue-r2.db`），避免 dev 与 build 同时写 `.nuxt` 造成 dev 反复重启。

## 3. 真机验收（agent-browser，Chromium 1440×900 基准）

### 3.1 结构与语义（登录验收账号后整页加载 `/tools/bazi`）

| 断言                            | 实测                                                                                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 六段顺序（`data-bazi-section`） | `guide / input / summary / detail / scope / actions`                                                                                          |
| 六个分节 id                     | `bazi-guide / bazi-input / bazi-summary / bazi-detail / bazi-scope / bazi-actions`                                                            |
| 卷目六条锚点                    | `#bazi-guide … #bazi-actions`，与六个 id 一一对应                                                                                             |
| 卷目标签与段名                  | `Ⅰ工具说明 / Ⅱ本次操作 / Ⅲ核心结果摘要 / Ⅳ通俗解释与详细结果 / Ⅴ依据与范围 / Ⅵ本次结果操作`（规范全名，无简写）                               |
| 唯一 `h1`                       | `["八字基础排盘"]`                                                                                                                            |
| 六个分节 `aria-labelledby`      | 全部指向存在的标题 id（`headingId` 生效）                                                                                                     |
| 页脚                            | `footer` 元素 1 个（`PageFooter` 显式渲染）                                                                                                   |
| 报头                            | 印章「八」；眉题「工具 · 日期级排盘（年 / 月 / 日三柱）」；副题沿用原文案；状态胶囊「内部验证中」；元信息「规则版本 2026-09-14-bazi-date-v1」 |
| 卷目脚注                        | 「三柱（年 / 月 / 日）／只到日期级 · 不含时辰」                                                                                               |
| 匿名围栏仍生效                  | 未登录整页加载 `/tools/bazi` → 302 到 `/tools/status?tool=bazi`                                                                               |

### 3.2 交互

| 项                     | 实测                                                                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 锚点点击               | 点击卷目第 4 条 → 焦点落到 `#bazi-detail`，当前项高亮为「Ⅳ通俗解释与详细结果」                                                                              |
| 说明                   | 该组件对锚点点击 `preventDefault()` 并自行 `scrollIntoView` + 移交焦点，因此 **URL hash 不变化**（与 `/self-profile`、`/account` 既有行为一致，非本轮引入） |
| 滚动高亮               | 生成结果后滚到 Ⅲ → 高亮「Ⅲ核心结果摘要」；滚到 Ⅵ → 高亮「Ⅵ本次结果操作」；回到顶部 → 高亮「Ⅰ工具说明」                                                      |
| 生成三柱（1990-06-15） | 三柱卡 3、日主标记 1、五行构成 1、状态横幅「✓ 已生成日期级结果：三柱（年、月、日）／共四柱，缺时柱。」                                                      |
| 保存弹层 smoke         | 点保存 → `[role=dialog]` 1 个、`[data-bazi-save-summary]` 1、`[data-bazi-save-privacy]` 1；Escape 可关闭（回到 0）                                          |
| 回到顶部按钮           | 滚动超过阈值后 `button[aria-label="回到顶部"]` 出现（回顶后为 0）                                                                                           |

### 3.3 断点与宽度（`scrollWidth` = `clientWidth` − 15px 滚动条即无横向溢出）

| 视口宽              | scrollWidth / clientWidth | 外壳列        | 卷目定位 | 正文左边框 |
| ------------------- | ------------------------- | ------------- | -------- | ---------- |
| 1440                | 1425 / 1440               | 1152px 容器   | sticky   | 1px        |
| 1120                | 1105 / 1120               | `214px 827px` | sticky   | 1px        |
| 1000                | 985 / 1000                | `214px 707px` | sticky   | 1px        |
| 920                 | 905 / 920                 | 单列 `857px`  | static   | 0          |
| 768                 | 753 / 768                 | 单列 `705px`  | static   | 0          |
| 700                 | 685 / 700                 | 单列 `645px`  | static   | 0          |
| 414                 | 399 / 414                 | 单列 `359px`  | static   | 0          |
| 360                 | 345 / 360                 | 单列 `305px`  | static   | 0          |
| 320                 | 305 / 320                 | 单列 `265px`  | static   | 0          |
| 320 + 200% 文本缩放 | 305 / 320                 | 单列          | static   | 0          |

- 1440 下卷目左边缘 169px = 顶栏容器左边缘 169px（视口减去滚动条后同为 168.5px），**与顶栏 logo 对齐**（设计基线 D9 的口径）。
- 断点行为与设计基线 §2 一致：≥921px 两列 + sticky 卷目 + 正文左分隔线；≤920px 收为单列、卷目转正文上方网格；四档宽度与 200% 文本缩放均无页面级横向滚动。

### 3.4 既有出版版页面回归（共用组件改名后）

| 页面            | 实测                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/self-profile` | `h1`「本人档案」；卷目 `#sec-record/#sec-usage/#sec-scope/#sec-archive` 与四个分节 id 一一对应；页脚 1；无横向溢出 |
| `/account`      | `h1`「验收账号」；卷目 `#sec-account/#sec-session/#sec-data/#sec-close` 与四个分节 id 一一对应；页脚 1；无横向溢出 |

## 4. 证据（仓库外，`D:/@Temp/xuanxue-evidence/2026-09-15-r5d-bazi-editorial/`）

| 文件                      | 字节    | SHA256（前 16 位） |
| ------------------------- | ------- | ------------------ |
| 01-bazi-1440.png          | 1085118 | e13c65a0318d42ad   |
| 02-bazi-1440-viewport.png | 508112  | a8b314175e8e4ac5   |
| 03-bazi-920.png           | 408746  | 93a3c0f5b78b8033   |
| 04-bazi-320.png           | 302692  | 5d79a4ac6eab61f7   |
| 05-account-1440.png       | 517020  | bfa40cc0f49aa91a   |
| 05-self-profile-1440.png  | 553294  | 6179943c023fa4d3   |

## 5. 本轮顺带修正 / 观察（如实记录，不是计划外改动）

1. **嵌套 `<main>` 被消除**：`layouts/default.vue` 已有 `<main id="main-content">` 包裹页面插槽，而改造前的八字页自己又写了一个 `<main class="bazi-page">`（嵌套 main landmark，HTML 无效）。换成出版版外壳后页面根节点为 `<div class="bazi-page editorial-shell">` + `<article class="editorial-article">`，与 `/self-profile`、`/account` 一致。
2. **空态下的卷目高亮**：未生成结果时 Ⅲ 段只有 80px 高，滚动到 Ⅲ 顶部时落在高亮带（视口 25%–35%）内的是 Ⅳ 段，因此高亮显示 Ⅳ。生成结果后 Ⅲ 段高 536px，高亮即正确落在 Ⅲ。这是共用卷目组件既有的「带内命中」规则，不是本轮引入的缺陷，也未改动其行为。
3. **`data-profile-index` 钩子名保留**：卷目组件已抽为三页共用，但 DOM 钩子仍是历史命名 `data-profile-index`——`/self-profile` 与 `/account` 的既有页面测试以它选择卷目，改名会牵动两个已验收页面的测试。已在组件注释与设计系统文档中标注，留给后续专项。

## 6. 未覆盖 / 下一步

- **失败态（日期无效 / 超出范围 / 引擎未完成）未在真机走通**：下拉取值范围本身就是支持区间，构造不出越界输入；由组件测试覆盖。
- **保存与历史的完整链路本轮只做 smoke**：真实保存、快照只读、删除、清空确认的交互由组件测试与服务端测试覆盖（R5-C 已真机验收过，本轮未改动这些组件）。
- **`prefers-reduced-motion` 下的滚动行为**未逐项真机验证（卷目组件的既有行为，本轮未改动）。
- 「中文名 + 版本」的版本呈现口径（设计基线 W1）与窄屏内边距 4–8px 错位（D13）按计划留到下一轮。
- 本轮改动**未提交**：Git 操作需用户单独授权。

## 7. 本轮建立的不变量（后续不得放宽）

1. **八字页使用出版版外壳**：`editorial-shell` + `editorial-article` + 六个 `editorial-section`，不再使用 `ToolPageLayout` 与 `PageHero`；`pages/tools/bazi.vue` 的精确 import 集合与「不得回归工具页外壳」已由静态测试锁住。
2. **卷目六条锚点与六个分节 id 一一对应**，标签用治理规范全名（Ⅳ 不得简写），顺序固定。
3. **六个分节必须声明可解析的 `aria-labelledby`**（`SectionHeading` 的 `headingId` 落到 `h2`）。
4. **共用外壳组件在 `components/editorial/`**：`IndexNav`（`items` + `footnote`）、`Masthead`（`seal` 默认「玄」）、`SectionHeading`（可选 `headingId`）；档案专件仍留 `components/profile/`。
5. **段内组件（`components/bazi/**`）与全局 CSS 未在本轮改动**；卷目版式的适用判据已写入 `docs/design/design-system.md`。
