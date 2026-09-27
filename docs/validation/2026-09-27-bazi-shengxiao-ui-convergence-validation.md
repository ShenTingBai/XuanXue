# 八字与生肖主体 UI 收敛验证记录（2026-09-27）

> 计划：`.claude/plans/plan-20260927-bazi-shengxiao-ui-convergence-v1.yaml`（Plan Protocol v2.2.1）
> 状态：**Executed**（全部工程门禁与真实浏览器验收通过；用户审计前不表示 Accepted）
> 执行器：ZCode（plan-execute v2.2）
> 前置依赖：`20260927-bazi-export-convergence-v1` result `status: success`、`guard_released: true`；其 `acceptance_status: pending_user_audit` 在本计划 result 中继续单独标记——八字导出尚未被用户接受，本计划不冒称其已验收。

## 1. 收敛范围与实现映射

设计基线：`docs/design/design-system.md` §4.2b「工具页主体收敛（八字 / 生肖，2026-09-27）」（本计划先落文档、后改代码）。

| 收敛项       | 实现                                                                                                                                                                                                                                                                     | 八字侧                                                                                                                                                     | 生肖侧                                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 输入承载卡   | 页面模板改 `card-paper-solid rounded-xl p-6 sm:p-8`                                                                                                                                                                                                                      | Ⅱ 段既有（基线，未动）                                                                                                                                     | Ⅰ 段收进单卡：日期输入、隐私说明、带入/替换/撤销、年龄声明、生成按钮                                                                                                                             |
| 依据折叠壳   | 新建 `components/editorial/EvidenceDisclosure.vue`（原生 `details/summary`、`closed-label`/`open-label`/`content-id`/`mark-class`、summary 同步 `aria-expanded`+`aria-controls`、方形 ＋/－ 标记、card-warm 卡片、slot）                                                 | `BaziEvidenceScope.vue` 改用共享壳；`data-bazi-evidence-scope` 落 details 根、`bazi-fold-mark` 经 `mark-class` 保留、`data-bazi-not-output` 与全部原文不动 | Ⅳ 段来源清单从 `marginal-toggle` + `Transition`（v-if 卸载）换为共享壳（`content-id="shengxiao-scope-sources"`，受控 `open`，重新生成复位收起）                                                  |
| 年龄确认控件 | 新建 `components/tools/AgeConsentCheckbox.vue`（v-model、单 `type=checkbox` sr-only、`choice-control--block`、`choice-control__indicator--box`、`data-age-confirmation` + `data-bazi-age` 同一真实 input）                                                               | `BaziInputForm.vue` 改用共享组件，`data-bazi-age` 契约与 `update:age-confirmed` 不变                                                                       | `ageConfirm` 三态 radio（unknown/confirmed/underage）改为 `ageConfirmed` 布尔；`canSubmit`、提交前快照、登出/换账号/离页清理全部布尔化；「未满」分支与 `ageBlocked` 提示移除，未勾选禁用生成保留 |
| 设计文档     | `design-system.md` 新增 §4.2b 收敛基线小节                                                                                                                                                                                                                               | —                                                                                                                                                          | —                                                                                                                                                                                                |
| 回归测试     | 新建 `tests/components/evidence-disclosure.test.ts`（6 例）、`tests/components/age-consent-checkbox.test.ts`（4 例）；`tests/components/shengxiao-page.test.ts` 年龄回归改 checkbox 门禁并锁定共享文案与方框 indicator，折叠测试改断言 `aria-expanded` 与 details `open` | forbidden 的 `tests/components/bazi-page.test.ts` **未修改而全部通过**（共享壳钩子兼容）                                                                   | —                                                                                                                                                                                                |

不在范围（未动）：`components/tools/shengxiao/VerifiedCulture.vue`（其「展开/收起依据与来源」marginal-toggle 保留）、生肖公共文化 tabs、领域字段、计算引擎、来源数据、保存/导出行为。

## 2. 执行期用户指令（两项计划变更，已实施）

1. **「生肖的依据与范围在未生成结果前也应展示规则依据」**：原计划 requirement「结果为空时不渲染来源折叠件」被用户指令覆盖。实现：页面新增 `DEFAULT_SOURCE_REFS`（与引擎固定 `sourceRefs` 同集合、同顺序、不改名不增删），生成前即渲染折叠件（默认收起），生成后仍以结果自带 `sourceRefs` 为准。真实浏览器验证：空态下折叠件存在、默认收起、展开后 9 条链接与编号完整。
2. **「侧边栏定位不够，点击依据与范围没跳」**：根因为全局 `html { scroll-behavior: smooth }`（main.css §11）与 `IndexNav.vue onSelect` 的 smooth 滚动——平滑滚动在部分环境（含内嵌浏览器窗格）不推进，表现为「高亮跳了、页面不跳」。修复：`onSelect` 改 `scrollIntoView({ behavior: 'instant', block: 'start' })`（与原生 hash 导航一致，`scroll-margin-top: 5rem` 避遮挡仍生效，`prefersReducedMotion` 辅助函数随之移除）。该文件为四页共用件（`/self-profile`、`/account`、`/tools/bazi`、`/tools/shengxiao`），不在计划 allowed_paths，属用户指令驱动的白名单外修改。

## 3. 自动化门禁（全部 exit 0）

| 门禁                                                                      | 结果                                             |
| ------------------------------------------------------------------------- | ------------------------------------------------ |
| `npm run format:check`                                                    | exit 0                                           |
| `git diff --check`                                                        | exit 0                                           |
| 乱码特征扫描（AGENTS.md v2.2 特征集；命令原文不复制进本文件以免自指误报） | 无命中                                           |
| `npm run typecheck`                                                       | exit 0（仅既有 HexagramInfo 重复导入警告）       |
| `npm run test`                                                            | exit 0（94 文件 / 2775 用例）                    |
| `npm run lint`                                                            | exit 0（0 errors / 59 warnings，与既有基线一致） |
| `npm run build`                                                           | exit 0                                           |

## 4. 真实浏览器验收（隔离生产预览：仓库外 `DB_PATH` + 随机 `SESSION_SECRET` + 端口 3212）

### 4.1 生肖页（/tools/shengxiao，1280×900）

- 空态：年龄 checkbox 存在于真实 input、未勾选、方框 indicator、block 变体、与八字逐字同一长文案；页面 radio 数为 0；输入、说明、年龄、生成键同在一张 `card-paper-solid` 卡；事实条（年界/支持范围/时区）直接可见。
- **生成前**Ⅳ段：四条边界 bullet 与说明句直接可见；来源折叠件存在且默认收起（用户指令 1）；展开后 9 条链接 + SRC-001…008 编号完整、外链非空；收起后摘要恢复「展开来源清单（9 条）」。
- 生成流程：填 1990-06-15 → 勾选共享 checkbox（`data-bazi-age` 钩子在位）→ 生成键解禁 → 点击 → 成功态与结果呈现。
- 生成后Ⅳ段：四条 bullet 仍直接可见；折叠件默认收起；展开/收起 `aria-expanded` 与 details `open` 同步（展开时标记填充朱砂）；重新生成后复位收起。
- 清理：刷新后年龄 checkbox 回到未勾选、草稿清空、结果移除。

### 4.2 八字页（/tools/bazi，1280×900）

- 年龄 checkbox 与生肖共用同一组件：长文案逐字一致、方框 indicator、block 变体、`data-bazi-age` 与 `data-age-confirmation` 同在真实 input。
- Ⅴ段折叠件：`data-bazi-evidence-scope` 落 details 根、card-warm 卡片、默认收起、`aria-controls="bazi-evidence-scope-content"`、`bazi-fold-mark` 与共享标记同元素并存；生成后展开可见来源清单与 `2026-09-14-bazi-date-v1`，收起正常。
- 卷目跳转：点击「依据与范围」瞬时跳转，`#bazi-scope` 顶部距视口 80px（`scroll-margin-top: 5rem`），65px 吸顶栏不遮挡（用户指令 2）。

### 4.3 响应式（两页同法实测）

- 断点 320 / 360 / 390 / 414 / 920 / 1280 CSS 像素：`document.scrollWidth === clientWidth`，无页面级横向滚动。
- 320px + 200% 文本缩放（root font-size 32px 模拟）：无横向溢出、关键文本无右缘裁切、年龄 checkbox 与折叠摘要可达。

### 4.4 截图证据（仓库外，审计后可删除）

- `D:/tmp/xuanxue-ui-convergence-verify/shengxiao-input-card-1280.png`（Ⅰ 段收敛输入卡）
- `D:/tmp/xuanxue-ui-convergence-verify/shengxiao-scope-disclosure-open-1280.png`（生成前Ⅳ段：四条 bullet 可见 + 折叠件展开 9 条）

## 5. 已知边界

- 生肖Ⅳ段位于页面末尾：视口高 900px 时点击Ⅳ卷目滚动到底（`scrollY` 达最大值），Ⅳ标题距视口顶约 437px——这是内容长度的物理限制，非定位缺陷；八字页内容较长，Ⅳ 可精确到达 80px。
- `VerifiedCulture.vue` 的 marginal-toggle 文化折叠件按计划明确不改；其视觉与共享壳的差异属「可保留的语义差异」（design-system §4.2b 第 5 条）。
- 测试环境（happy-dom）中 details 收起态内容仍在 DOM：折叠断言以 `aria-expanded` 与 `open` 属性表达，视觉可见性由真实浏览器验收承担。

## 6. 验收状态

- **Executed**：实现、自动化门禁、真实浏览器验收全部完成。
- **Accepted 待用户审计**：本记录不表示用户已接受；前置八字导出计划同样处于 `pending_user_audit`。
- **Blocked**：无。
