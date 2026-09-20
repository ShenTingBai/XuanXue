# 八字页交互反馈微调：设计基线

> 状态：**Draft — 待用户确认**（确认后才改代码）
>
> 日期：2026-09-15
>
> 上游：R5-D 出版版版式对齐（验收见 [`2026-09-15-r5d-bazi-editorial-alignment-validation.md`](../validation/2026-09-15-r5d-bazi-editorial-alignment-validation.md)）；用户 2026-09-15 反馈「UI 还需调整、互动效果不太明显」
>
> 截图复核证据（仓库外）：`D:/@Temp/xuanxue-evidence/2026-09-15-r5d-ui-review/`（空态整页、结果整页、六个分区、卷目悬停、卷目高亮、按钮悬停、输入焦点、Tab 焦点共 14 张）
>
> 已选定范围：**A 卷目当前项与悬停**、**B 勾选框与输入焦点**、**C 折叠件加重**（用户 2026-09-15 选择）；D（版本可读化）、E（Ⅲ 段三柱加重）、F（全站主按钮加重）本轮不做

## 1. 复核结论：反馈为什么"不明显"

逐张看过截图后的实测（静止 / 悬停 / 焦点三态对比）：

| 元素                           | 静止                            | 悬停                          | 焦点               | 判定                                                                                    |
| ------------------------------ | ------------------------------- | ----------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| 卷目链接                       | `ink-medium` 14px               | 字色 → `ink-dark`，无底色位移 | 同悬停             | **弱**：只有颜色变化                                                                    |
| 卷目当前节                     | 1px 下划线                      | —                             | —                  | **太弱**：滚动时几乎得不到位置反馈                                                      |
| 生成三柱结果（`btn-seal`）     | 透明底 + 2px 朱砂描边           | 朱砂从左扫入铺满 + 字变纸白   | 浏览器默认         | 反馈强，但这是全站既有按钮语言（本轮不动，见 §5）                                       |
| 输入 select（`.bazi-control`） | 2px 浅墨下划线                  | —                             | 仅下划线变朱砂     | 中                                                                                      |
| **满十四周岁勾选框**           | **浏览器原生蓝色方框**          | 原生                          | 原生               | **不一致**：与墨/朱砂体系冲突；同文件的历法单选已用 `sr-only` + 样式化 span，勾选框漏了 |
| 三柱卡「＋ 这一柱是怎么来的」  | `ink-medium` 12px + 全角＋      | 无                            | 有 `focus-visible` | **太淡**：缺乏可展开的分量                                                              |
| 六问「怎样看懂这张盘」         | `display:block`，**无任何标记** | 无                            | 有 `focus-visible` | **无可点线索**：只有外框，没有 ＋/箭头                                                  |
| 回到顶部                       | 纸底 + 朱砂描边                 | 朱砂实心 + 白箭头             | —                  | 强 ✓                                                                                    |

根因：除主按钮与回顶按钮外，其余交互都只有「颜色微变」这一重反馈，缺少第二重（底色、描边、指示条、标记形状）。

## 2. 逐项改法

### A 卷目当前项与悬停（`components/editorial/IndexNav.vue`，scoped）

改后为**三重编码**（不只靠颜色）：左侧指示条 + 数字变朱砂 + 字色加深。

```css
.index-link {
  position: relative;
  padding-inline: 8px;
  margin-inline: -8px 0; /* 抵消内边距：文字 x 不变，底色向左右各扩 8px */
  border-radius: 4px;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}
.index-link:hover,
.index-link:focus-visible {
  color: var(--color-ink-dark);
  background: color-mix(in srgb, var(--color-ink-dark) 4%, transparent);
}
.index-link.is-active {
  color: var(--color-ink-dark);
}
.index-link.is-active .index-num {
  color: var(--color-cinnabar);
}
/* 活动项指示条：挂在文字左侧的留白里，不挤压正文列 */
.index-link.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  border-radius: 1px;
  background: var(--color-cinnabar);
}
/* 旧的 1px 下划线去掉：避免与指示条重复装饰 */
.index-link.is-active .index-label::after {
  display: none;
}
```

窄屏（已有 `@media (max-width: 920px)` 块内）追加：卷目转横向网格时**隐藏指示条**，活动项改用 2px 朱砂下边框 + 朱砂数字：

```css
.index-link.is-active::before {
  display: none;
}
.index-link.is-active {
  border-bottom: 2px solid var(--color-cinnabar);
}
```

不做：不动 `items` / `footnote` / 锚点行为 / `data-profile-index` 钩子（两个档案页测试依赖它）；不改窄屏「转正文上方网格」的结构。原计划中的 IntersectionObserver 实现已由 2026-09-20 R5 收敛改为吸顶线几何判定，见本节 H 后的收敛记录。

### B 勾选框与输入焦点（`components/bazi/BaziInputForm.vue`，scoped）

标记层（保留 `data-bazi-age` 在真实 `input` 上——测试与 a11y 都依赖）：

```html
<label class="bazi-age">
  <input
    type="checkbox"
    class="sr-only"
    :checked="draft.ageConfirmed"
    data-bazi-age
    @change="onAge"
  />
  <span class="bazi-check" aria-hidden="true" />
  <span>我已满十四周岁。…（原文案不动）</span>
</label>
```

样式（与同文件已有的 `.sr-only:focus-visible + span` 单选模式一致）：

```css
.bazi-check {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 1.125rem;
  height: 1.125rem;
  margin-top: 0.2rem;
  border: 1px solid var(--color-ink-faint);
  border-radius: 3px;
  background: var(--color-paper-lightest);
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.bazi-age input:checked + .bazi-check {
  border-color: var(--color-cinnabar);
  background: var(--color-cinnabar);
}
.bazi-check::after {
  content: '';
  width: 0.3rem;
  height: 0.6rem;
  border: solid var(--color-paper-lightest);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) scale(0);
  transition: transform 0.15s ease;
}
.bazi-age input:checked + .bazi-check::after {
  transform: rotate(45deg) scale(1);
}
.bazi-age input:focus-visible + .bazi-check {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}
```

输入焦点加强（只作用于本页三个下拉，不动全局 `.input-ink`）：

```css
.bazi-control:focus {
  background: color-mix(in srgb, var(--color-cinnabar) 4%, var(--color-paper-lightest));
}
```

### C 折叠件加重（`BaziPillarCard.vue` + `BaziReadingGuide.vue`，各自 scoped）

两处用**同一套视觉**（因本轮承诺不动全局 CSS，样式在两个组件内各写一份；若将来出现第三个使用者再提升为全局类）：

1. **三柱卡**（`BaziPillarCard.vue`）：`＋/－` 从全角文字改为 1rem 朱砂描边小方块，展开时方块填充朱砂；摘要字色由 `ink-medium` 提到 `ink-dark`；悬停加 4% 墨底。

```css
.bazi-summary {
  padding-inline: 8px;
  margin-inline: -8px 0;
  border-radius: 6px;
  color: var(--color-ink-dark); /* 模板里的 text-ink-medium 一并去掉 */
  transition: background 0.15s ease;
}
.bazi-summary:hover {
  background: color-mix(in srgb, var(--color-ink-dark) 4%, transparent);
}
.bazi-summary::before {
  content: '＋';
  display: grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  border: 1px solid var(--color-cinnabar);
  border-radius: 3px;
  color: var(--color-cinnabar);
  font-size: 0.75rem;
  line-height: 1;
}
details[open] > .bazi-summary::before {
  content: '－';
  background: var(--color-cinnabar);
  color: var(--color-paper-lightest);
}
```

2. **六问**（`BaziReadingGuide.vue`）：现在**完全没有标记**，补同样的方块标记与悬停底色；为不破坏三层排版，摘要改为 flex 两列（标记 + 原三行头区），三层结构与文案一字不动。

```html
<summary class="bazi-guide-summary">
  <span class="bazi-fold-mark" aria-hidden="true" />
  <span class="bazi-guide-head">
    <span class="bazi-layer">第一层 · 白话</span>
    <span class="bazi-guide-question">{{ item.question }}</span>
    <span class="bazi-guide-plain">{{ item.plain }}</span>
  </span>
</summary>
```

```css
.bazi-guide-summary {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  min-height: 44px;
  padding: 6px 8px;
  margin: -6px -8px 0;
  border-radius: 6px;
  cursor: pointer;
  list-style: none;
  transition: background 0.15s ease;
}
.bazi-guide-summary:hover {
  background: color-mix(in srgb, var(--color-ink-dark) 4%, transparent);
}
.bazi-guide-head {
  min-width: 0;
}
.bazi-fold-mark {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  margin-top: 0.15rem;
  border: 1px solid var(--color-cinnabar);
  border-radius: 3px;
  color: var(--color-cinnabar);
  font-size: 0.75rem;
  line-height: 1;
}
.bazi-fold-mark::before {
  content: '＋';
}
details[open] .bazi-fold-mark {
  background: var(--color-cinnabar);
  color: var(--color-paper-lightest);
}
details[open] .bazi-fold-mark::before {
  content: '－';
}
```

### G Ⅴ 依据与范围默认收起（2026-09-15 追加，用户指令）

**改法**（`components/bazi/BaziEvidenceScope.vue`，scoped）：组件根节点由 `section.card-warm.rounded-xl.p-6` 改为 `details.bazi-scope-fold.card-warm.rounded-xl`，默认**不带 `open`**（收起）；`<summary>` 即展开按钮，含方形 ＋/－ 标记与「展开/收起：来源清单、版本、限制说明与本页不输出的内容」两个标签（CSS 按 `details[open]` 切换显示，两个标签都在 DOM 中，被 `display:none` 的那个不被读屏朗读）；原有内容整块放进 `.bazi-scope-body`，其第一个小标题不再额外留白。

**同时修掉一处重复标题**：该组件原本自带 `card-warm` 盒子和第二个 `<h3>依据与范围</h3>`（`aria-labelledby="bazi-scope-heading"`），而页面 Ⅴ 段已有 `SectionHeading`「Ⅴ 依据与范围」——同一页面上「依据与范围」会出现两次。本次移除组件内的 h3；盒子与内边距改由折叠件承担，段标题只由页面承担，因此 `pages/tools/bazi.vue` 零改动。

**红线自查**：

- 未使用浮动「注」按钮或覆盖式说明：折叠件是阅读流内的原生 `details`，与页面已有的三柱卡、六问折叠同一形态（契约 §22）
- **没有隐藏「不输出什么」的信息**：Ⅰ 段已明列「本页不能回答」并逐项写出未输出内容清单；收起态的摘要标签也直接写明「…与本页不输出的内容」，不展开也知道里面有什么
- 未改任何文案、未新增内容；展开区不用固定 `max-height`；触控目标 ≥44px；`focus-visible` 2px 朱砂

**可发现性补偿**：卷目锚点 `#bazi-scope` 直达该段；收起行仍占满整行并带方形标记，不像普通文本。

### H 卷目高亮改为「每次按几何重算」（2026-09-15 追加，用户批准；2026-09-20 收敛修订）

**问题**：原实现只在 IntersectionObserver 回调里取「本次交叉状态发生变化」的条目中 top 最小的一条。两种情况因此失准：① 连续滚动或跳转之后，最后一次变化的那一节不一定是当前节；② 页内折叠/展开改变布局，让某一节在高亮带内长大、把下一节挤出带外——被挤出的那一节只发出「离开」事件，回调里没有可选项，高亮就停在旧值。实测：Ⅴ 段折叠后（高约 170px）平滑滚动到 Ⅴ 顶部，高亮显示 **Ⅵ**；展开 Ⅴ 之后仍停在 Ⅵ。

**原改法**（2026-09-15）：抽出 `syncActive()`，每次回调按当前几何重算全集——优先取**完全覆盖高亮带**（视口 25%–35%）的那一节，否则取最靠上的相交节，再不然取最后一节顶边已在带上方的（滚到底时保持末节高亮）。

**R5 收敛修订**（2026-09-20）：上述高亮带仍会在空态Ⅲ段（约 80px）滚到 `scroll-margin-top: 5rem` 时提前选中Ⅳ。现改为按 5rem 吸顶线处最后一个顶边已越线的章节判定，并以滚动/窗口变化的动画帧合并和 `ResizeObserver` 覆盖折叠布局变化；锚点、DOM 钩子和窄屏结构不变。回归用例与未运行状态见 [短章节高亮收敛记录](../validation/2026-09-20-r5-index-nav-active-section-validation.md)。

**影响面**：三个使用卷目的页面共用（`/tools/bazi`、`/self-profile`、`/account`），三页均已真机回归。唯一语义变化：进页时先对齐一次当前节（若首节已在高亮带内则高亮它；八字页首节在带下方，进页仍无高亮，与改造前一致）。

### I 档案带入入口改为次要描边按钮（2026-09-15 追加，用户反馈「从档案填写出生日期按钮不明显」）

**问题**：入口用了 `btn-ghost`——**无边框**、`ink-medium` 文字、只有 hover 变字色，落在米色面板上像一段说明文字而不是按钮；其下方说明还用 `text-ink-light`，低于设计规格「说明文字不得低于 `ink.medium`」的下限。

**改法**（`pages/tools/bazi.vue`）：按钮 `btn-ghost` → **`btn-quiet`**（1px `ink-faint` 描边 + 10px 圆角 + min-height 44px + hover 边框加深与 5% 墨底），前面加一个 16px 下箭头图标（`aria-hidden`，示意「带入到本次输入」）；说明文字 `text-ink-light` → **`text-ink-medium`**。仍**不填色**：把「本屏唯一朱砂」留给生成键（R5-C 设计规格 §2 Ⅱ）。

**未做**：不改入口位置（仍在日期字段与生成键之间）。若认为位置也偏低，可另议把它提到日期字段上方。

## 3. 硬约束（改动不得越过）

- **不改 `assets/css/main.css`、不新增或修改全局类**（因此无需设计系统同批登记；若确实需要新增全局类，暂停回报）
- 颜色一律 `color-mix(in srgb, var(--color-x) N%, transparent)`，禁止 `rgba()` 与 `bg-x/10`
- 触控目标 ≥44px；`focus-visible` 2px 朱砂描边 + offset 2px；**不使用颜色作为唯一区分**（A 为「指示条 + 数字变色 + 字色」，C 为「符号形状 + 填充 + 字色」）
- 不加位移/缩放类动效，只做颜色与底色过渡（不引 `prefers-reduced-motion` 新分支）
- 文案、内容闭集、六段结构、`details` 原生语义、`aria-*` 一律不动
- `[data-bazi-age]` 必须仍在真实 `input` 上（测试与可访问性依赖）；`[data-profile-index]` 结构与锚点行为不变（`/self-profile`、`/account` 的页面测试依赖）

## 4. 影响面

| 文件                                           | 改动                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `components/editorial/IndexNav.vue`            | A：活动项指示条 + 数字朱砂 + 悬停底色 + 去掉旧下划线 + 窄屏替代规则                                                          |
| `components/bazi/BaziInputForm.vue`            | B：勾选框改 `sr-only` + 样式化方框（勾选态朱砂实心 + 白勾）+ 下拉焦点底色                                                    |
| `components/bazi/BaziPillarCard.vue`           | C：＋/－ 改方块标记 + 摘要字色加深 + 悬停底色                                                                                |
| `components/bazi/BaziReadingGuide.vue`         | C：补方块标记（摘要改 flex 两列）+ 悬停底色                                                                                  |
| `components/bazi/BaziEvidenceScope.vue`        | G：根节点改 `details`，默认收起 + 摘要即展开按钮；移除组件内重复的 `<h3>依据与范围</h3>`                                     |
| `components/editorial/IndexNav.vue`            | H：高亮改为每次回调按几何重算（覆盖带 → 相交 → 带上最后一节），进页先对齐一次                                                |
| `pages/tools/bazi.vue`                         | I：档案带入入口 `btn-ghost` → `btn-quiet` + 下箭头图标；说明文字 `text-ink-light` → `text-ink-medium`                        |
| `tests/components/bazi-page.test.ts`           | 补断言（勾选框仍是 `[data-bazi-age]`、折叠标记存在、Ⅴ 段默认收起且可展开、标题唯一、带入入口为 `btn-quiet`）；既有断言不放宽 |
| `tests/pages/tools/bazi.test.ts`               | 补断言（占位符不得带 `disabled`、卷目指示条、折叠标记与 `sr-only` 勾选框）；既有断言不放宽                                   |
| `docs/validation/…-interaction-affordance-…md` | 新增验收记录（前后对比截图 + SHA256 + 门禁）                                                                                 |

不动：`layouts/**`、`assets/css/**`、`docs/design/design-system.md`（无全局类变化）、`components/bazi/**` 的其余组件与其余测试。

## 5. 本轮不做（已排除，留待后续）

- **D 版本可读化**：报头与 Ⅴ 段的 `2026-09-14-bazi-date-v1` 改为「八字日期规则 · 2026-09-14 版」（需同时改 Ⅴ 段与一个测试）
- **E Ⅲ 段三柱一览加重**：会动全局类 `.bazi-pillar-cell`
- **F 全站主按钮 `.btn-seal` 静止态加重**：影响全站所有页面，需全站回归
- 原型里「三柱为三张独立卡片」的版式差异（属 E 的范畴）

## 6. 验收清单

结构与状态：

- [ ] 卷目活动项在桌面为「2px 朱砂指示条 + 朱砂数字 + ink-dark 字色」，窄屏为「2px 朱砂下边框 + 朱砂数字」
- [ ] 卷目悬停/焦点有可见底色，「可点」不再只靠颜色
- [ ] 勾选框在勾选/未勾选/悬停/键盘聚焦四态下均无浏览器原生蓝色
- [ ] 三个下拉聚焦时下划线变朱砂且出现极浅底色
- [ ] 三柱卡与六问折叠都有方形 ＋/－ 标记，展开后方块填充朱砂；悬停有底色
- [ ] Ⅴ 段默认收起（`details` 无 `open`），点摘要在原地展开/收起，展开区内容随之显示
- [ ] 全页「依据与范围」标题只出现一次（段标题承担，组件内不再重复）
- [ ] 卷目高亮跟随实际位置：滚到某段即高亮该段；展开/收起 Ⅴ 段后**不残留**上一节高亮；滚到底保持末节
- [ ] 档案带入入口看起来像按钮（次要描边 + 图标），且仍不填色；其说明文字不低于 `ink.medium`
- [ ] `details` 语义、`aria-hidden` 标记、44px 触控目标、`focus-visible` 2px 朱砂保持不变

回归：

- [ ] `/self-profile`、`/account` 卷目活动项与悬停表现同步生效且四锚点行为不变
- [ ] 320 / 360 / 390 / 414 与 200% 文本缩放无页面级横向滚动；1440 / 1000 / 920 / 768 断点行为不变
- [ ] `git diff --check`、`npx prettier --check .`、`npm run typecheck`、`npm run test`、`npm run build` 全绿（build 前停 dev）
- [ ] 前后对比截图（空态 + 结果态 × 桌面 + 320）存仓库外目录并给 SHA256
