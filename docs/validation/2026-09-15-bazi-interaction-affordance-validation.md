# 八字页交互反馈微调：实施与验收记录

> 设计基线：[`docs/design/2026-09-15-bazi-interaction-affordance.md`](../design/2026-09-15-bazi-interaction-affordance.md)（2026-09-15 用户确认，范围 A/B/C）
>
> 触发：用户 2026-09-15 复核 R5-D 页面后反馈「UI 还需调整、互动效果不太明显」
>
> 复核截图（改前）：`D:/@Temp/xuanxue-evidence/2026-09-15-r5d-ui-review/`（14 张，含悬停/焦点/高亮状态）
>
> 验收截图（改后）：`D:/@Temp/xuanxue-evidence/2026-09-15-bazi-affordance/`（13 张，见 §4）
>
> 运行授权：用户已授权本阶段运行五道门禁与真机验收（2026-09-15）
>
> 执行者与审查者：同一会话

## 1. 门禁结果（2026-09-15，先停 dev 服务器后逐条运行）

| 命令                     | 退出码 | 结果                                                                          |
| ------------------------ | ------ | ----------------------------------------------------------------------------- |
| `git diff --check`       | 0      | 无空白错误                                                                    |
| `npx prettier --check .` | 0      | All matched files use Prettier code style                                     |
| `npm run typecheck`      | 0      | 无 TS 错误                                                                    |
| `npm run test`           | 0      | **80 文件 / 2591 例全过**（本轮 +4：见 §3；追加项 G 再加 1 例 → 2592，见 §7） |
| `npm run build`          | 0      | Σ 7.05 MB（gzip 1.61 MB）                                                     |

## 2. 三项改动的真机确认

### A 卷目当前项与悬停（`components/editorial/IndexNav.vue`）

| 断言             | 实测                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| 活动项左侧指示条 | 有：2px 朱砂竖条，落在文字左侧留白内（`02` / `03` / `09` 截图均可见）  |
| 活动项序号变朱砂 | 有：`Ⅱ` / `Ⅳ` 序号为朱砂色                                             |
| 悬停底色         | 有：4% 墨色浅底，覆盖整行                                              |
| 旧的 1px 下划线  | 已移除（源码断言 `not.toContain('.index-label::after')` 锁住）         |
| 窄屏（≤920）     | 指示条隐藏，活动项改用 2px 朱砂下边框；`11-after-320.png` 可见         |
| 320px 无横向溢出 | `scrollWidth 305 / clientWidth 320`                                    |
| 三页共用回归     | `/self-profile`、`/account` 卷目四锚点与四节 id 一一对应，外观同步生效 |

### B 勾选框与输入焦点（`components/bazi/BaziInputForm.vue`）

| 断言                                  | 实测                                                            |
| ------------------------------------- | --------------------------------------------------------------- |
| 未勾选                                | 浅墨描边方框，**无系统蓝**（`04-after-checkbox-unchecked.png`） |
| 勾选                                  | 朱砂实心 + 白色对勾（`05-after-checkbox-checked.png`）          |
| 键盘聚焦                              | `input:focus-visible + .bazi-check` 给 2px 朱砂描边             |
| 下拉聚焦                              | 下划线转朱砂 + 4% 朱砂极浅底（`06-after-select-focus.png`）     |
| `[data-bazi-age]` 仍在真实 `input` 上 | 是（保留 `data-bazi-age`，组件测试继续用它 `setValue`）         |
| 交互链路未变                          | 勾选后生成键由 disabled 转可用，生成得三柱（真机走通）          |

### C 折叠件加重（`BaziPillarCard.vue` + `BaziReadingGuide.vue`）

| 断言           | 实测                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| 三柱卡折叠标记 | 1rem 朱砂描边方块 + `＋`；展开后填充朱砂 + 白色 `－`（`07` / `08`）         |
| 六问折叠标记   | **本轮新增**：此前完全没有可视线索；现每条问题前都有同款方块（`09` / `10`） |
| 悬停反馈       | 两处摘要悬停均有 4% 墨色浅底                                                |
| 摘要字色       | 三柱卡由 `ink-medium` 提到 `ink-dark`                                       |
| 结构未变       | 仍是原生 `details/summary`，三层结构与文案一字未改                          |

## 3. 本轮额外发现并修复的缺陷（F1：空态下拉显示预选值）

**现象**：空态下三个下拉显示「2026 / 1月 / 1日」，看起来像预填了今天或默认日期，而契约要求「**无任何默认值**：不预填今天、不预填零点、不预填示例日期」。

**根因**（真机 DOM 实测，非推测）：三个占位符都写成 `<option value="" disabled>选择年份</option>`。Vue 把 `value` 补成 `''` 时下拉里还只有占位符（被 `disabled` 跳过 → 无选中项）；随后 `v-for` 动态插入真实选项，浏览器对 `<select>` 执行 reset，选中**第一个非 disabled 选项**，于是 `selectedIndex = 1`、显示 `2026 / 1月 / 1日`（年份选项是倒序，2026 在首位），而绑定值属性仍是 `""`：

```
修复前：{id: bazi-input-year, value: "2026", idx: 1, shown: "2026"}
        {id: bazi-input-month, value: "1",  idx: 1, shown: "1月"}
        {id: bazi-input-day,   value: "1",  idx: 1, shown: "1日"}
```

**修复**：去掉三个占位符的 `disabled`（占位符可被选中后，reset 会停在它上面）。修复后：

```
修复后：{id: bazi-input-year, value: "", idx: 0, shown: "选择年份"}
        {id: bazi-input-month, value: "", idx: 0, shown: "选择月份"}
        {id: bazi-input-day,   value: "", idx: 0, shown: "选择日期"}
```

**影响与边界**：占位符现在可以被用户重新选回（等同于清空该字段），此时生成键保持禁用并给出既有原因文案——与原空态行为一致，不新增状态。真机走完整链路（选 1990-06-15 → 勾选 → 生成）通过，三柱正常。

**同类代码的对照**：`components/profile/BirthDateGroupInput.vue` 用了同样的 `value="" disabled` 写法，但 `/self-profile` 出生日期编辑器（2026-09-15 真机）三个下拉实测为 `idx 0` + 占位符 + `value ""`，**未出现该缺陷**——差异来自渲染时机（该编辑器在展开时才创建 `<select>`，reset 时占位符是唯一选项）。因此本轮**不改**档案页组件，仅记录该对照；若后续要统一写法，属档案页专项。

**新增回归断言**（静态，防回退）：

- `tests/pages/tools/bazi.test.ts`：占位符必须存在三个、且都不得带 `disabled`（用例名「空态不得出现预选值」）
- `tests/pages/tools/bazi.test.ts`：卷目活动项指示条与序号变朱砂存在、旧下划线实现不得回归
- `tests/pages/tools/bazi.test.ts`：勾选框 `sr-only`、`bazi-check`、两处折叠标记存在，且组件不出现 `rgba(`
- `tests/components/bazi-page.test.ts`：`[data-bazi-age]` 仍是 checkbox 且带 `sr-only`、页面存在 `.bazi-check`、六问有 6 个 `.bazi-fold-mark`

测试数：`tests/pages/tools/bazi.test.ts` 8 → 11；`tests/components/bazi-page.test.ts` 29 → 30（合计 2587 → 2591）。

## 4. 证据（仓库外 `D:/@Temp/xuanxue-evidence/2026-09-15-bazi-affordance/`）

| 文件                               | 字节   | SHA256（前 16 位） |
| ---------------------------------- | ------ | ------------------ |
| 01-after-top.png                   | 508095 | 20d8df91706f531a   |
| 02-after-index-hover.png           | 515129 | 4b25b858400cb482   |
| 03-after-index-active.png          | 482744 | dd7fc60e6bfc0c8c   |
| 04-after-checkbox-unchecked.png    | 476062 | 1b5341f8a3edf99d   |
| 05-after-checkbox-checked.png      | 475991 | 883989e2d62e4798   |
| 06-after-select-focus.png          | 477743 | 2d31bafb5a2622da   |
| 07-after-pillar-fold-hover.png     | 481750 | 3fc244a92d62fe7e   |
| 08-after-pillar-fold-open.png      | 496364 | 10e18b3ea21a9039   |
| 09-after-guide-hover.png           | 489296 | ddae0dee8c1fa758   |
| 10-after-guide-open.png            | 502843 | e3bf8619a15ec3a4   |
| 11-after-320.png                   | 159122 | a4e001d5dc4d30b6   |
| 12-after-self-profile.png          | 475757 | 5a4bf9d1e4e71a6b   |
| 13-self-profile-date-editor.png    | 401509 | 49eabc55f7ffd783   |
| 14-scope-collapsed.png             | 444498 | 08343a3f6eaab41b   |
| 15-scope-expanded.png              | 536391 | e12c66ec523fbf11   |
| 16-index-follows-expanded-fold.png | 536538 | e886ccb02f1e9e88   |

改前对照见 `D:/@Temp/xuanxue-evidence/2026-09-15-r5d-ui-review/`（14 张）。

## 5. 未覆盖 / 下一步

- **三段断点全档**未逐档重测（本轮只改交互样式，未动布局；1440 / 320 已实测，320 无横向溢出）
- **触摸端 hover 语义**：悬停底色在触摸设备不触发，可点性由「方形标记 + 边框」承担；未做移动端真机验证
- `prefers-reduced-motion` 下的过渡未单独验证（本轮只加颜色/底色/对勾缩放过渡，无位移）
- 基线 §5 已排除项仍不做：D 版本可读化、E Ⅲ 段三柱加重、F 全站主按钮加重
- **提交**：本轮改动与 R5-D 已随单提交 `7877285`（`feat(bazi): R5-D 出版版外壳与交互可供性`）提交。此处原先建议的「拆两个提交」**不可行**：`components/editorial/*` 自创建起从未单独提交，R5-D 的中间态在 git 中不存在。

## 6. 本轮建立的不变量（后续不得放宽）

1. **空态不得显示任何预选值**：三个日期下拉的占位符必须是可被选中的第一项（不带 `disabled`），否则浏览器 reset 会回退到第一个真实选项。
2. **交互必须至少双重编码**：卷目当前节＝指示条 + 朱砂序号 + 字色；折叠件＝方形标记形状 + 展开态填充 + 字色；不使用颜色作为唯一区分。
3. **表单控件不使用浏览器原生外观**：checkbox / radio 一律 `sr-only` + 样式化 span，四态（未选/选中/悬停/键盘聚焦）都不得出现系统默认控件。
4. **不引入全局 CSS**：本轮改动全部落在组件 scoped 样式内，`assets/css/main.css` 零改动。
5. **同一页面的标题不得重复**：Ⅴ 段的「依据与范围」只由页面段标题承担（组件内不得再出现同名 h3）；折叠件用原生 `details`，摘要即按钮。

## 7. 追加项 G：Ⅴ 依据与范围默认收起（2026-09-15，用户指令）

**改法**：`components/bazi/BaziEvidenceScope.vue` 根节点由 `section.card-warm.p-6` 改为 `details.bazi-scope-fold.card-warm`（默认无 `open`），`<summary>` 即展开按钮（方形 ＋/－ 标记 + 「展开/收起：来源清单、版本、限制说明与本页不输出的内容」双标签）；原内容整体移入 `.bazi-scope-body`。`pages/tools/bazi.vue` 零改动。

**真机实测**（agent-browser，1440×900）：

| 状态       | `open` | 内容可见（`checkVisibility()`） | 摘要可见 | 页面高度 |
| ---------- | ------ | ------------------------------- | -------- | -------- |
| 进页默认   | false  | **false**                       | true     | 3744     |
| 点摘要之后 | true   | true                            | true     | 4675     |

- 全页「依据与范围」标题数量：**1**（改造前为 2：页面段标题 + 组件内 h3）
- 320px + 200% 文本缩放（展开态）：`scrollWidth 305 / clientWidth 320`，无横向溢出
- 截图：`14-scope-collapsed.png`（收起，Ⅴ 段只剩一行摘要按钮）、`15-scope-expanded.png`（展开）

**探针口径提醒**（记录以免后人误判）：对关闭的 `<details>` 内部元素，Chrome 用 `content-visibility` 机制隐藏，`getBoundingClientRect().height > 0` **不能**作为「可见」判据（实测为 true 但实际未绘制）；应使用 `el.checkVisibility()` 或直接看截图。

**新增测试**：`tests/components/bazi-page.test.ts` 增加「Ⅴ 段默认收起：摘要即展开按钮，且『依据与范围』标题只出现一次」——断言默认无 `open`、摘要文案、内容仍在 DOM（非 `v-if` 卸载）、点击摘要后 `open` 出现且文案切到「收起：」、全页同名标题恰好 1 个。同时把上一轮的折叠标记计数断言按区域收紧（六问 6 个、Ⅴ 段 1 个），避免三处折叠件共用同一视觉时计数互相干扰。

**追加项 G 的门禁复跑**：`git diff --check` 0 / `npx prettier --check .` 0 / `npm run typecheck` 0 / `npm run test` **80 文件 2592 例全过** / `npm run build` 0（先停 dev）。

## 8. 追加项 H/I（2026-09-15，用户批准 / 反馈）

### H 卷目高亮改为每次按几何重算（`components/editorial/IndexNav.vue`）

| 场景                                  | 修复前           | 修复后                                                                        |
| ------------------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| 平滑滚动到 Ⅴ 顶部                     | 高亮 **Ⅵ**（错） | **Ⅴ依据与范围** ✓                                                             |
| 就在该位置展开 Ⅴ 段                   | 仍停在 Ⅵ（错）   | 保持 **Ⅴ** ✓                                                                  |
| 滚到 Ⅵ                                | Ⅵ                | **Ⅵ本次结果操作** ✓                                                           |
| 滚到页面底部                          | Ⅵ                | **Ⅵ**（`lastAbove` 兜底生效）✓                                                |
| 滚到 Ⅲ（未生成结果时 Ⅲ 仅约 80px 高） | —                | 高亮 **Ⅳ**：Ⅲ 不覆盖高亮带，覆盖带的是 Ⅳ（规则如此；生成结果后 Ⅲ 变高即正确） |

三页真机回归：

| 页面            | 进页高亮                             | 滚到某段后           |
| --------------- | ------------------------------------ | -------------------- |
| `/tools/bazi`   | 无（首节在高亮带下方，与改造前一致） | Ⅴ ✓ / Ⅵ ✓ / 底部 Ⅵ ✓ |
| `/self-profile` | 无                                   | Ⅲ溯 · 溯源与范围 ✓   |
| `/account`      | 无                                   | Ⅲ数 · 数据与告知 ✓   |

两页 1440 下 `scrollWidth 1425 / clientWidth 1440`，无横向溢出。截图：`16-index-follows-expanded-fold.png`（展开 Ⅴ 后高亮停在 Ⅴ）。

**未覆盖**：IntersectionObserver 回调路径在 happy-dom 下不可测（无 IO 实现），本节结论全部来自真机；单元测试只覆盖锚点 href 与结构。

### I 档案带入入口改为次要描边按钮（`pages/tools/bazi.vue`）

**改法**：按钮 `btn-ghost` → `btn-quiet`，前面加 16px 下箭头图标（`aria-hidden`）；说明文字 `text-ink-light` → `text-ink-medium`（此前低于设计规格「说明文字不得低于 ink.medium」的下限）。仍不填色，把「本屏唯一朱砂」留给生成键。

**验证**：组件测试断言入口按钮类名含 `btn-quiet`、其说明段落不含 `text-ink-light`，并继续点通带入流程（`tests/components/bazi-page.test.ts`「档案带入后手改日期：保存摘要的来源必须回到『手动填写』」一例）。

**如实说明（真机截图缺失）**：真机会话里 `[data-bazi-import]` **没有渲染**——当前账号「验收账号」的档案摘要为 `{exists: false, hasBirthDate: false, canImport: false}`（`/self-profile` 用途节显示「还没有出生日期，无法带入」），而入口露出条件是 `exists && hasBirthDate && canImport`。因此本轮**无法**提供该按钮的真机前后对比；改由组件测试锁定类名与文案下限。若需要截图，请在 `/self-profile` 保存一次出生日期并允许带入（或授权我操作），我再补拍。

**追加项 H/I 的门禁复跑**：`git diff --check` 0 / `npx prettier --check .` 0 / `npm run typecheck` 0 / `npm run test` **80 文件 2592 例全过** / `npm run build` 0。

**如实记录一次返修**：首次 typecheck 报 `tests/components/bazi-page.test.ts(532,24) TS2339: Property 'exists' does not exist`——`page.get()` 的返回类型已剔除 `exists`；改为不调用 `exists()`（`get()` 找不到即抛错，等价于断言存在），随后 typecheck 0。
