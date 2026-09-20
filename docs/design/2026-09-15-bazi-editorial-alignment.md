# 八字页出版版版式对齐：设计基线

> 状态：**已确认**（2026-09-15，用户对 §0 全部决策与 §8 三条措辞项按推荐口径采纳）；下一步：单阶段实现计划
>
> 日期：2026-09-15
>
> 上游产物：设计工具原型 `xuandao-bazi-chart.html`（可点击原型，含演示脚手架声明）、`xuandao-bazi-ui-spec.html`（规格）
>
> 上游依据：治理规范 §4.1–4.7（六段 DOM 顺序）、契约 §22；[R5-B 页面信息架构](2026-09-14-r5-bazi-page-ia.md)；[R5-C 设计规格](2026-09-15-bazi-ui-spec.md)与[R5-C 验收记录](../validation/2026-09-15-r5c-bazi-ui-redesign-validation.md)
>
> 决策来源：2026-09-15 用户在「版式对齐选项」中逐项选定（见 §0）
>
> 文档性质：**版式与外壳**设计基线。不改内容闭集、不改措辞红线、不表示任何内容已核验或已获准公开

## 0. 本轮范围（用户已选，逐项固化）

| #   | 决策项     | 选定                                                                                  |
| --- | ---------- | ------------------------------------------------------------------------------------- |
| D1  | 改到哪一层 | **整体换成出版版外壳**：卷目 + 报头 + 细线分节，正文列放宽到约 828px                  |
| D2  | 外壳归属   | **直接用 `editorial-shell`**，像 `/self-profile` 一样，不再套 `ToolPageLayout`        |
| D3  | 组件归属   | **抽到 `components/editorial/`**，`/self-profile`、`/account`、`/tools/bazi` 三页共用 |
| D4  | 侧栏段名   | **治理规范全名**，允许折两行（不简写）                                                |
| D5  | 报头内容   | **真实信息版**：眉题 + 副题 + 状态胶囊 + 元信息行，取值来自真实常量与页面状态         |
| D6  | 窄屏行为   | **沿用出版版三档**（≥1121 / 921–1120 / ≤920），不另造交互                             |
| D7  | 细节靠拢   | **先只做骨架**；Ⅲ/Ⅳ 段内部细节（五行构成条形、编号小节、日期对照归属）下一轮          |
| D8  | 下一步     | 先出本文，用户审过之后才出计划、才动代码                                              |

**2026-09-15 追加决策（讨论「其他页面能否沿用 / 侧边栏位置 / 回顶按钮」后确认）**：

| #   | 决策项           | 选定                                                                                                                                       |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| D9  | 侧边栏水平位置   | **保持现状（方案 A）**：不动全局 `.editorial-shell`。卷目左边缘与顶栏 logo 左边缘对齐（1440px 视口下同为 176px）                           |
| D10 | 其他页面是否沿用 | **不批量铺开**：先只在八字页落地；`/privacy`、`/terms`、`/tools/ziwei` 列为后续候选，生肖/星座页左栏已被工具内选择器占用，不适用           |
| D11 | 版式适用判据     | **写入设计系统**（§10 三条判据），避免以后每页重新讨论                                                                                     |
| D12 | 回到顶部按钮     | **本轮不动其它页面**：`ScrollTopButton` 保留在八字页；生肖页与两个出版版页面是否补齐，列为下一轮候选                                       |
| D13 | 窄屏内边距错位   | **本轮不修**：顶栏与出版版外壳在 921–1023 / 640–720 / <640 三档有 4–8px 内边距差，属既有问题且影响两个已验收页面的窄屏对齐，记为下一轮候选 |

## 1. 为什么这样对齐：原型的骨架 = 我们已有的出版版外壳

R5-C 的差异，主要不是实现走样，而是**转写阶段的判断错误**：`2026-09-15-bazi-ui-spec.md` §5「类的复用与新增」把原型的出版版骨架（`sp-index` + `sp-masthead` + `sp-section`）映射成了工具页卡片语汇（`card-paper-solid`/`card-warm`），等于搬了内容、换了骨架。原型给的本来就是出版版版式，而且与已验收的 R4 版式同源：

| 原型（`xuandao-bazi-chart.html`） | 本项目已有件                                                     | 现状   |
| --------------------------------- | ---------------------------------------------------------------- | ------ |
| `sp-shell` 两列外壳（1120px）     | `.editorial-shell`（`214px + minmax(0,1fr)`，72rem）             | 全局类 |
| `article.sp-scroll` + 左分隔线    | `.editorial-article`（左边框 1px、左内边距 46px）                | 全局类 |
| `aside.sp-index` 卷目 + 脚注      | `ProfileIndexNav`（sticky + 吸顶线几何高亮 + ≤920px 转顶部网格） | 组件   |
| `header.sp-masthead` 报头         | `ProfileMasthead`（印章/眉题/标题/副题/状态胶囊/元信息行）       | 组件   |
| `sp-section-head`（Ⅰ + 标题）     | `ProfileSectionHeading`                                          | 组件   |
| `sp-section`（40px + 上细线）     | `.editorial-section` / `--first`（含 `scroll-margin-top: 5rem`） | 全局类 |

度量实测：原型正文列约 850px；`editorial-article` = 1152 − 64 − 214 − 46 ≈ **828px**。断点三档与 ≤920px 网格化在 R4 验收中有 320px+200% 的真机证据（`docs/audits/2026-09-13-self-profile-editorial-acceptance.md`）。

## 2. 目标版式

```text
layouts/default（全站顶栏，sticky）
└─ .bazi-page（min-height + padding-bottom: 64px，页面级）
   ├─ .editorial-shell（72rem / padding-inline 32px / 214px + 1fr）
   │  ├─ aside 卷目（IndexNav：Ⅰ–Ⅵ 锚点 + 脚注，桌面 sticky top 5rem）
   │  └─ article.editorial-article（左边框 1px）
   │     ├─ header 报头（Masthead：印章「八」/ 眉题 / h1 / 副题 / 状态胶囊 / 元信息行）
   │     ├─ section#bazi-guide   .editorial-section.editorial-section--first  Ⅰ 工具说明
   │     ├─ section#bazi-input   .editorial-section                          Ⅱ 本次操作
   │     ├─ section#bazi-summary .editorial-section                          Ⅲ 核心结果摘要
   │     ├─ section#bazi-detail  .editorial-section                          Ⅳ 通俗解释与详细结果
   │     ├─ section#bazi-scope   .editorial-section                          Ⅴ 依据与范围
   │     └─ section#bazi-actions .editorial-section                          Ⅵ 本次结果操作
   ├─ PageFooter（显式渲染：离开 ToolPageLayout 后不再自动带）
   ├─ ScrollTopButton
   └─ BaziSaveDialog / AuthDialog
```

**六段 ↔ 卷目锚点**（`data-bazi-section` 及其顺序**不变**，仍是 R5-C 的六个值）：

| 卷目标签（全名）     | 锚点            | `data-bazi-section` | 段标题             |
| -------------------- | --------------- | ------------------- | ------------------ |
| Ⅰ 工具说明           | `#bazi-guide`   | `guide`             | 工具说明           |
| Ⅱ 本次操作           | `#bazi-input`   | `input`             | 本次操作           |
| Ⅲ 核心结果摘要       | `#bazi-summary` | `summary`           | 核心结果摘要       |
| Ⅳ 通俗解释与详细结果 | `#bazi-detail`  | `detail`            | 通俗解释与详细结果 |
| Ⅴ 依据与范围         | `#bazi-scope`   | `scope`             | 依据与范围         |
| Ⅵ 本次结果操作       | `#bazi-actions` | `actions`           | 本次结果操作       |

卷目标签与段标题**同字**（D4）：214px 栏内 Ⅳ/Ⅵ 折两行，不简写、不改字。

**度量与断点**（沿用出版版，不新增）：

| 断点       | 卷目                              | 正文列                 |
| ---------- | --------------------------------- | ---------------------- |
| ≥1121px    | sticky 左栏 214px，当前节加下划线 | 828px，左侧 1px 分隔线 |
| 921–1120px | 收窄仍为左栏                      | 收窄                   |
| ≤920px     | 取消 sticky，转正文上方两行网格   | 单列，左边框取消       |
| ≤720px     | 同上                              | 内边距降到 20px        |

分节：`padding-top 40px` + 上细线；首节去线（`--first`）；`scroll-margin-top: 5rem` 抵消吸顶顶栏。**不引入**原型里动态计算 `--sp-nav-offset` 的做法（我们有固定 sticky 顶栏）。

## 3. 组件抽取（`components/profile/` → `components/editorial/`）

| 现路径                                                    | 新路径                                    | 变化                                                                  |
| --------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `components/profile/ProfileIndexNav.vue`                  | `components/editorial/IndexNav.vue`       | 仅改名搬迁；props（`items`/`footnote`）与行为不变                     |
| `components/profile/ProfileMasthead.vue`                  | `components/editorial/Masthead.vue`       | 新增 `seal` 属性（默认 `玄`）；八字页传 `八`                          |
| `components/profile/ProfileSectionHeading.vue`            | `components/editorial/SectionHeading.vue` | 新增可选 `headingId` 属性 → 落到 `h2` 的 `id`，保住 `aria-labelledby` |
| `components/profile/ProfileRecordCard.vue` 等其余档案专件 | 不迁                                      | 仍属档案页，留在 `components/profile/`                                |

**调用方同步**（共 5 处组件 + 2 个页面）：

- 页面：`pages/self-profile.vue`、`pages/account.vue`
- 组件：`components/profile/ProfileUsageSection.vue`、`ProfileScopeSection.vue`、`ProfileDangerZone.vue`（三者内部用了 `ProfileSectionHeading`）
- 新增第三个使用者：`pages/tools/bazi.vue`

**受影响的测试**（口径变化必须显式说明，不得为通过而放宽）：

| 文件                                                              | 影响                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/components/profile-editorial.test.ts`                      | 只改 import 路径与组件名（`ProfileMasthead` → `Masthead`）；三条断言不变                                                                                                                                                                     |
| `tests/pages/tools/bazi.test.ts`                                  | 「页面只使用……组件」是**精确集合断言**，必须同步为：移除 `tools/ToolPageLayout.vue`、`tools/PageHero.vue`，加入 `editorial/IndexNav.vue`、`editorial/Masthead.vue`、`editorial/SectionHeading.vue`、`tools/PageFooter.vue`                   |
| `tests/components/bazi-page.test.ts`                              | ① 段名断言现取 `[data-bazi-section] h2`；改用 `SectionHeading` 后汉字数字在 `h2` **之外**（与原型一致），改为取 `[data-bazi-section] .section-head`，期望数组一字不改；② 「页面只有一个 h1（由 PageHero 提供）」改为「由报头提供」，断言不变 |
| `tests/pages/self-profile.test.ts`、`tests/pages/account.test.ts` | 只做页面级断言、未 stub 组件名，预期不需要改动；执行时逐条确认                                                                                                                                                                               |

`components/tools/bazi/SectionNav.vue`（旧页遗留件）**不启用**：`tests/pages/tools/bazi.test.ts` 的 `legacyIdentifiers` 含 `SectionNav`，本轮新建的组件名 `SectionHeading` 与之不冲突。

## 4. 卷目与报头文案（真实信息版，D5）

**卷目**（`IndexNav`）：

- `items`：上表六条（`num`/`label`/`href`），label 用治理规范全名
- `footnote`：`三柱（年 / 月 / 日）\n只到日期级 · 不含时辰`（原型脚注的措辞，属本页真实边界）
- 无障碍：`<nav aria-label>`、当前节 `aria-current="true"`、点击后焦点移交目标节（组件既有行为）

**报头**（`Masthead`）：

| 字段         | 取值                                                               | 来源                                               |
| ------------ | ------------------------------------------------------------------ | -------------------------------------------------- |
| `seal`       | `八`                                                               | 原型                                               |
| `edition`    | `工具 · 日期级排盘（年 / 月 / 日三柱）`                            | 与 Ⅰ 段定位句同源                                  |
| `title`      | `八字基础排盘`                                                     | 现有 `PageHero` 标题（唯一 `h1` 不变）             |
| `subtitle`   | `按出生日期排出年、月、日三柱，并说明每一步的依据、边界与限制。`   | 现有 `PageHero` 副题逐字沿用                       |
| `statusText` | `内部验证中`（仅在页面判定 `internalOnly` 时渲染；公开后自动消失） | 页面既有 `internalOnly` 计算属性                   |
| `metaText`   | `规则版本 <BAZI_RULE_VERSION>`                                     | `constants/bazi-rules.ts` 常量（A3：版本唯一来源） |

**不做**：不加「初版」「不含出生时刻」这类原型演示标签之外无法追溯的措辞；不做发布日期承诺（治理规范 §20.4）。

## 5. 与既有基线的关系（必须记录的取代与不改动项）

1. **取代**：`docs/design/2026-09-14-r5-bazi-page-ia.md` §2 与 §10「页面外壳沿用 `ToolPageLayout`，且不填 `#nav`/`#mobile-nav`/`#nav-right`」这条决策，被本轮 D1/D2 **取代**。
   - 该条原本的理由是「避免在正文前插入**跨工具导航**而破坏六段 DOM 顺序」。卷目是**页内锚点索引**，不是跨工具导航（未违反「`#nav` 禁止重复顶栏跨工具链接」的既有约定）；六个 `[data-bazi-section]` 仍在 `article` 内按序排列，DOM 顺序断言不受影响。
   - 该文档为历史基线，**不回溯改写**；本文与新计划承担取代说明。
2. **保留**：`ScrollTopButton`、`AuthDialog`（页内认证）、`BaziSaveDialog`、六段内容与全部段内组件（内容闭集、状态矩阵、措辞红线一字不动）。
3. **新增显式页脚**：离开 `ToolPageLayout` 后必须自己渲染 `PageFooter`，与 `/self-profile`、`/account` 一致（全站惯例，且 `tests/pages/account.test.ts` 有一致性回归）。
4. **不改**：`ToolPageLayout` 本身与其 10 个使用者（本页是第一个不使用它的工具页）。
5. **文档同步**：`docs/design/design-system.md` 的「本人档案页组件」小节需改为「出版版共用外壳与组件（`components/editorial/*`）」，并在同批登记八字页的使用情况。

## 6. 本轮明确不做（下一轮候选，D7）

- 五行构成**不**改成原型的条形 + 分数（原型含「水 0/6 · 六个字里未出现」，与契约禁止「缺某行」暗示冲突，需单独定口径）
- Ⅲ 段收束**不**加「查看详细结果与解读」按钮
- Ⅳ 段**不**加「1–6」编号小节
- 日期对照**不**从 Ⅳ 移到 Ⅲ（原型与 R5-C 规格本身不一致，需单独裁决）
- **不**引入原型演示脚手架（状态切换、档案带入可用性两块虚线框）
- **不**引入 Google Fonts（原型用 `fonts.googleapis.com`，我们自托管）；**不**引入 `--font-mono` 第三字族
- **不**新增间距/颜色 CSS 变量；颜色仍只用既有令牌与 `color-mix`；新增全局类需同批写入设计系统

## 7. 验收清单（供下一阶段计划引用）

结构与语义：

- [ ] 卷目六条锚点与六个节 `id` 一一对应；点击后目标节获得焦点；当前节高亮随滚动更新
- [ ] 六个 `[data-bazi-section]` 顺序仍为 `guide/input/summary/detail/scope/actions`；段名为治理规范全名
- [ ] 每页唯一 `h1`（来自报头）；六个节仍有 `aria-labelledby` 指向各自标题
- [ ] `PageFooter` 渲染；`ScrollTopButton`、两个弹层行为不变

版式与响应式（治理 §18、AGENTS.md §5）：

- [ ] 1121+ / 921–1120 / ≤920 / ≤720 四档行为符合 §2 表
- [ ] 320 / 360 / 390 / 414 CSS px 与 **200% 文本缩放**无页面级横向滚动
- [ ] 项目原样保留空态、失败态、候选态、stale 态与已保存态的既有断言

工程门禁：

- [ ] `git diff --check`、`npx prettier --check .`、`npm run typecheck`、`npm run test` 全绿
- [ ] `npm run build` 通过（**必须先停 dev 服务器**：dev 与 build 同时写 `.nuxt` 会导致 dev 重启并 OOM，R5-C 已发生过一次）
- [ ] 真机证据（截图 + SHA256）存仓库外目录，附页码清单；乱码检测 0、BOM 0

## 8. 措辞项（已按推荐口径确认，2026-09-15）

| #   | 项                   | 现状与冲突                                                                                                                                                      | 采纳口径                                                                                                 |
| --- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| W1  | 版本呈现口径         | 规格 §2Ⅴ 要求「中文名 + 版本，不展示内部标识串」；**当前实现与测试锁定的是内部标识串** `2026-09-14-bazi-date-v1`（Ⅴ 段 + `tests/components/bazi-page.test.ts`） | 本轮报头 `metaText` 与 Ⅴ 段保持一致（同串）；「中文名 + 版本」列为下一轮措辞项，改则两处一起改并同步测试 |
| W2  | 卷目脚注文案         | 原型「三柱（年月日）/ 只到日期级 · 不含时辰」                                                                                                                   | 采用 §4 的措辞（`三柱（年 / 月 / 日）` + `只到日期级 · 不含时辰`）                                       |
| W3  | 报头状态胶囊是否常显 | `internalOnly` 当前恒为真（`exposure: internal`），故胶囊会常显                                                                                                 | 按 `internalOnly` 渲染，公开后自动消失（不写死）                                                         |

## 9. 影响面清单（文件级，供计划核对）

**新增**

- `components/editorial/IndexNav.vue`、`components/editorial/Masthead.vue`、`components/editorial/SectionHeading.vue`

**搬迁（原路径删除）**

- `components/profile/ProfileIndexNav.vue`、`ProfileMasthead.vue`、`ProfileSectionHeading.vue`

**修改**

- `pages/tools/bazi.vue`（换外壳、六节容器、报头、卷目、显式页脚）
- `pages/self-profile.vue`、`pages/account.vue`（import 与标签名）
- `components/profile/ProfileUsageSection.vue`、`ProfileScopeSection.vue`、`ProfileDangerZone.vue`（import 与标签名）
- `tests/components/profile-editorial.test.ts`、`tests/components/bazi-page.test.ts`、`tests/pages/tools/bazi.test.ts`
- `docs/design/design-system.md`（组件归属与八字页使用情况）

**不改**

- 六段内容与段内全部组件（`components/bazi/*`）、`constants/bazi-rules.ts`、服务端与数据层、`ToolPageLayout` 及其余 10 个工具页

## 10. 卷目版式的适用判据（D11：实现时同批写入设计系统）

出版版外壳（卷目 + 报头 + 细线分节）**不是全站默认版式**，只在同时满足三条时使用：

1. **主体是长文档**，且能切成 **≥4 个有意义的锚点节**（短页、单表单页不用）；
2. **左栏没有更该常驻的控件**（工具内选择器、筛选器、信息摘要）；一页只有一个左栏，二者不能并存；
3. **该页在治理规范里本就有段序**（如工具页六段）——卷目只是既有段序的目录，**不得因此新增段**。

现状对照（供后续页面引用，不在本轮实施）：

| 页面                                | 现版式                           | 判据结论                        |
| ----------------------------------- | -------------------------------- | ------------------------------- |
| `/self-profile`、`/account`         | 出版版                           | 已用                            |
| `/tools/bazi`                       | 本轮改为出版版                   | 本轮                            |
| `/privacy`、`/terms`                | 纯文本 + 页脚                    | 候选（需先数节数 ≥4）           |
| `/tools/ziwei`                      | 工具页外壳，左栏空、右栏信息摘要 | 候选（左栏可用，需确认节数）    |
| `/tools/shengxiao`、`constellation` | 左栏 = 工具内选择器              | **不适用**（左栏被占用）        |
| 其余工具页                          | 无侧栏                           | 多为「输入 → 结果」短页，收益低 |
| `/`、`/login`、`/tools/status`      | 各自布局                         | 不适用                          |

**已知未修问题（D13，下一轮）**：顶栏容器（`max-w-grid` + `px-4 sm:px-6 lg:px-8`）与出版版外壳（`padding-inline` 32 / 24 / 20px）在三档对不上——921–1023px 差 8px、640–720px 差 4px、<640px 差 4px；≥1024px 与 721–920px 两档对齐。影响 `/self-profile`、`/account` 的窄屏左右对齐，与八字页骨架无关，故本轮不动。
