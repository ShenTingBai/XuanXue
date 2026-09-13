# 本人档案页 · 出版版视觉对齐验收

日期：2026-09-13
分支：`codex/foundation-rebuild`
设计基线：[本人档案页出版版视觉对齐设计](../design/2026-09-13-self-profile-editorial-redesign.md)
目标原型：`C:\Users\29522\AppData\Roaming\Open Design\namespaces\release-stable-win\data\projects\d240191c-713e-49ff-b83d-25522d7f1ba7\xuandao-self-profile.html`

结论：**已实施并通过真机验收（51/51）**。R4 整体仍为 `Implemented`、待用户接受，本次不改变公开围栏与数据契约。

## 1. 用户决策

| 编号 | 决策         | 选择                                                      |
| ---- | ------------ | --------------------------------------------------------- |
| D1   | 对齐层级     | 页面级完整对齐（含 Ⅱ/Ⅲ/Ⅳ 三块新内容），全站顶栏与页脚不动 |
| D2   | 文案真实性   | 照原型文案，但涉及尚未实现能力的句子改写                  |
| D3   | 卡片主副口径 | 大字＝规范化公历，副行＝原历法表达 + 「本人填写」         |

## 2. 变更清单

新增：

- `components/profile/ProfileMasthead.vue`、`ProfileIndexNav.vue`、`ProfileSectionHeading.vue`、`ProfileRecordCard.vue`、`ProfileUsageSection.vue`、`ProfileScopeSection.vue`、`ProfileDangerZone.vue`
- `utils/self-profile/display.ts`（展示格式化纯函数）
- `tests/utils/self-profile-display.test.ts`、`tests/components/profile-editorial.test.ts`

修改：

- `pages/self-profile.vue`（版式重写；数据层、保存/删除/撤回/冲突逻辑不变）
- `assets/css/main.css`（新增出版版按钮 `btn-solid`、`btn-quiet`）
- `components/profile/SelfProfileSaveDialog.vue`（动作按钮改用出版版按钮类；逻辑不变）
- `tests/pages/self-profile.test.ts`（按新结构更新选择器）
- `docs/design/design-system.md`（登记新增全局类与档案页组件）

## 3. 与设计文档的落地差异（如实记录）

| 项               | 设计文档                           | 实际落地                                                           | 原因                                                           |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| 副行（公历填写） | 反查失败回退显示 `公历 YYYY-MM-DD` | 反查失败或日期非法时**副行为空、不渲染**，成功时标注「依公历换算」 | 回退串与大字重复且易被误读为原始表达；空值由组件省略该行更诚实 |
| 容器宽度         | 「参考原型 1120px」                | 沿用项目 `max-w-grid`（72rem）                                     | 与全站栅格一致，避免为一个页面引入第二套容器宽度               |
| 顶栏与页脚       | 不实现                             | 不实现                                                             | 属全站层；现有页面均无页脚                                     |

其余结构、文案、断点行为与原型一致。

## 4. 门禁与真机验收

自动化（提交前冻结树）：

| 门禁                     | 结果                                        |
| ------------------------ | ------------------------------------------- |
| `npm run typecheck`      | 通过（exit 0）                              |
| `npx vitest run`         | **66 文件 / 2365 例全部通过**（新增 31 例） |
| `npm run lint`           | 0 error / 26 warnings（均为既有）           |
| `npm run build`          | 通过                                        |
| `npx prettier --check .` | 全仓通过                                    |

真机验收（生产预览 + 系统临时目录全新库 + 独立随机 `SESSION_SECRET`，本机 Chromium）：

**51/51 通过**，覆盖：

- 空态：卷目四锚点与四节 id 一一对应、编辑器默认收起（无日期选择器）、报头眉题副题齐全；
- 建档：从「录入出生日期」展开编辑器 → 3 个选择器 → 「查看本次变更」→ 差异确认「新增出生日期」→ 保存后大字 `1990年5月5日`、副行 `农历 1990年 四月十一 · 依公历换算`、状态胶囊「出生日期已保存」、报头「最近更新 YYYY-MM-DD HH:mm」、编辑器自动收起；
- 内容真实性：Ⅱ 用途矩阵 4 行且四类用途齐备；Ⅲ 展示真实版本 `2026-09-09` 且不含设计稿的 `1.2.0`；「我们保存了什么 / 我们没有保存」齐备；
- 修改与并发：修改弹「修改出生日期」；后台改档后陈旧保存被 409 拦下 → 「重新读取档案」→ 再确认保存为候选值；
- 授权：停止 → 「已停止」+ 重新允许入口 → 勾选同意 → 回到「已开启」；
- 响应式：320/360/390/414 CSS px × 16px/32px 共 8 组无横向溢出；≤920px 卷目转横向网格（`flex-direction: row`）；320px + 200% 弹层 `clientWidth 305 = scrollWidth 305`、`scrollHeight 1418 > clientHeight 700` 且可滚动、确认按钮完整可见（x=16、宽 273、高 87）；
- 归档：危险区默认折叠（`aria-expanded=false`）→ 展开 → 删除出生日期（档案保留、删除态不承诺未实现的历史能力）→ 删除整档（回到空态，`/account` 会话仍有效）；
- 边界：生肖页仍被公开围栏拦到 `/tools/status`；26 条 `/api/self-profile` 响应全部含 `Cache-Control: no-store`。

人工比对：桌面与 390px 截图的卷目、报头、分节、记录卡、印章、状态胶囊与原型的排布、字号层级、间距一致。

## 5. 证据

`D:/@Temp/xuanxue-evidence/2026-09-13-self-profile-editorial/`（仓库外，按用户要求不纳入仓库）：

- `report.json`：51 项检查明细与 API 日志（含 8 组响应式量测数值）；
- 三态与关键状态截图：`10-empty-state-1440.png`、`11-record-card-1440.png`、`12-conflict-1440.png`、`16-danger-open-1440.png`、`17-deleted-state-1440.png`；
- 响应式：`13-dialog-320-200pct.png`、`14-profile-320-200pct.png`、`14-profile-414-200pct.png`；
- 与原型并排样本：`compare/app-record-1440-top.png`、`compare/app-record-390-top.png`；
- 逐个 SHA256 见该目录 `SHA256.txt`。

## 6. 过程事故（如实记录）

本轮用 PowerShell 对 `ProfileUsageSection.vue`、`ProfileDangerZone.vue` 做文本替换，`Get-Content -Raw` 按 ANSI 读取 UTF-8 源文件导致**两文件中文变乱码并写入 BOM**。违反 AGENTS.md「禁止 PowerShell 批量读写源码」。

处置（未叠加修补）：立即停止该路径，用 Write 工具从权威内容整体重写这两个**未入库的新文件**（无 git 可恢复版本）。随后全仓乱码扫描只剩既有的 4 处误报（AGENTS.md 的检测命令自身、项目故事中的一个复制类术语、笔画字典的单字条目、太岁文案中的宝石名），BOM 检查全部文件为 `no-bom`。此后所有源码写入改用 Write/Edit 工具。（本节按 AGENTS.md 要求不复制检测特征串，避免自指误报。）

## 7. 边界与未做

- 未改 `layouts/default.vue`（顶栏、账号菜单、移动抽屉）；页脚在 2026-09-13 的信息架构调整中按用户要求补齐（见 [IA 调整验收](./2026-09-13-account-and-profile-ia-acceptance.md)），本条仅记录当时的落地状态；
- 未改 `composables/useSelfProfile.ts`、`useSelfProfileDraft.ts`、任何 `server/` 代码或 API 契约；
- 未新增出生时刻/地点/性别/亲友字段，未引入「完整度」，未引入 R5 结果历史；
- 未读取、打开、哈希、创建、迁移、修改或删除任何数据库文件；预览使用系统临时目录独立库；
- 未暂存、未提交、未推送、未切换分支。
