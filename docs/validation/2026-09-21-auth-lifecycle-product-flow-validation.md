# 游客计算与登录持久化统一产品流程验证记录

> 计划：`plan-20260921-auth-lifecycle-product-flow-v2`
>
> 执行日期：2026-09-21（本地时间 20:55–21:05）
>
> 执行者：ZCode（执行器侧）
>
> 浏览器环境：ZCode 内置浏览器（IAB，Chromium 内核）
>
> 验证状态：**technical_verification_completed**（等待用户体验验收；不构成任何工具公开准入批准）
>
> 补验：本记录中原「未覆盖项」的账号 A 完整保存闭环与 A→B 换号隔离，
> 已由 [`2026-09-21-auth-save-account-switch-browser-supplement.md`](2026-09-21-auth-save-account-switch-browser-supplement.md)
> 完成浏览器补验，两项状态更新为 `browser_verified`；用户接受仍为 `pending`。

## 1. 背景与范围

上一计划已收敛首页游客入口与全局「未登录 + 登录」显示，但顶栏与首页仍保留一条研发期旁路：
`getLocalDevNavTools` 按 `import.meta.dev` 把 `internal + enabled` 工具以「（内部验证）」命名
追加进全局导航与首页卡片。这使用户界面出现研发阶段身份，且登录态与游客态看到的工具集合不同。

本轮收敛统一产品流程：**公开工具游客直接使用，登录只增加持久化能力，研发阶段身份不出现在用户界面**。
目录四维治理字段、服务端围栏、工具公开状态与认证组件均不在本轮改动范围。

## 2. 变更

| 文件                                 | 修改                                                                                                          | 意图                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `constants/tool-catalog.ts`          | 删除 `getLocalDevNavTools` 及其「（内部验证）」命名派生；保留四维字段、`isToolPubliclyAvailable`、公开计算、历史策略、状态页判定 | 目录只承载治理元数据，不再派生用户可见入口 |
| `layouts/default.vue`                | `navTools` 改为 `TOOL_CATALOG.filter(isToolPubliclyAvailable)`，不再按开发构建或登录态追加；同步改写旧注释       | 导航只呈现公开产品入口，且不随登录态变化   |
| `pages/index.vue`                    | `visibleTools` 只由 `publicTools` 组成；`toolCardNote` 非公开分支改为兜底措辞「该工具尚未公开，暂不提供入口。」 | 首页不出现研发阶段入口或内部验证身份       |
| `tests/constants/tool-catalog.test.ts` | 删除开发专用导航函数测试，改为断言目录源码不含派生入口与用户可见命名后缀                                       | 锁定目录不回到开发模式派生                 |
| `tests/layouts/default-layout.test.ts` | 新增 3 条：布局不引用开发派生入口/内部验证命名/`import.meta.dev`；公开导航由目录派生；导航不依赖登录态           | 锁定顶栏导航语义                           |
| `tests/pages/index-content.test.ts`  | 新增 2 条：首页不出现研发阶段入口；卡片列表只由公开集合组成；非公开分支断言改为「不谎称可用」                   | 锁定首页入口语义                           |

**未修改**：`middleware/tool-availability.global.ts`（服务端围栏）、`server/**`、`components/auth/**`、
`pages/tools/shengxiao.vue`、`nuxt.config.ts`、业务数据库。
**保留**：目录与 `bazi.vue`、`middleware`、`server/utils/internal-verification.ts` 中作为**线上准入元数据**的
`internal` / 「内部验证」表述（计划 context 明确：这些字段只作治理元数据，不作产品文案）。

## 3. 自动化门禁（串行执行，避免 `.nuxt` prepare 竞争）

| 命令                | 退出码 | 结果                                         |
| ------------------- | ------ | -------------------------------------------- |
| `git diff --check`  | 0      | 无空白错误                                   |
| `npm run typecheck` | 0      | 0 错误；仅既有 `HexagramInfo` 重复导入警告   |
| `npm run test`      | 0      | **90 文件 / 2728 用例通过**（净增 5 用例）    |
| `npm run lint`      | 0      | 0 errors / 57 warnings（均为既有）           |
| `npm run build`     | 0      | 生产构建成功（7.07 MB）                      |

专项回归：`npx vitest run tests/constants/tool-catalog.test.ts tests/layouts/default-layout.test.ts tests/pages/index-content.test.ts`
→ 3 文件 / 50 用例通过（目录 12 + 布局 10 + 首页 28）。

乱码检测（AGENTS.md 规定的特征字符集命令）于目录、布局、首页与 `tests/` → 0 命中。

## 4. 生产预览浏览器复验

| 项               | 取值                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| 生产构建         | `node .output/server/index.mjs`（本轮修改后重新构建）                  |
| 预览端口         | `4408`（独立端口）                                                     |
| 临时数据库       | `D:/Env/tmp/xuanxue-preview-flow.db`（仓库外独立空库，`DB_PATH` 覆盖） |
| `SESSION_SECRET` | 取自仓库外 `.env`，未写入本记录                                        |
| 临时账号         | 浏览器注册 `flowcheck596335`（临时库 id=1），仅存在于仓库外临时库      |

### 4.1 游客态

| 检查项                   | 结果                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| 顶栏导航                 | 仅 `生肖` → `/tools/shengxiao`（无 `八字`/`择日` 内部验证项）              |
| 首页「内部验证」「本地开发」 | 均 0 命中                                                              |
| 首页首要入口             | 「立即使用」→ `/tools/shengxiao`（2 处：首屏与页尾）                      |
| 页面级横向溢出           | 0（1280px）                                                               |
| 游客当次计算             | 生肖页填写 1990-06-15 + 确认年龄 → 生成「生肖结果」，结果区含公历/农历与来源 |
| 游客浏览器长期存储       | `localStorage` / `sessionStorage` 键均为空，`document.cookie` 为空        |
| 历史接口游客边界         | `GET /api/divinations` → **401**（游客不产生服务器历史）                  |

### 4.2 未公开工具围栏（游客态）

| 工具             | 结果                                              |
| ---------------- | ------------------------------------------------- |
| `/tools/bazi`    | → `/tools/status?tool=bazi`（功能整理中）         |
| `/tools/zeji`    | → `/tools/status?tool=zeji`（功能整理中）         |
| `/tools/ziwei`   | → `/tools/status?tool=ziwei`（功能整理中）        |

### 4.3 登录态与退出清理

| 检查项                       | 结果                                                                     |
| ---------------------------- | ------------------------------------------------------------------------ |
| 登录态顶栏导航               | 仍仅 `生肖`——不因登录出现未公开工具                                      |
| 登录态首页工具卡片           | 仅 `/tools/shengxiao`（与游客一致）                                      |
| 登录态顶栏身份               | 显示真实昵称 `flowcheck596335`                                           |
| 登录态页面级横向溢出         | 0（1280px）                                                              |
| 退出（`DELETE /api/auth/logout`） | 200                                                                  |
| 退出后身份                   | 顶栏回到「未登录 登录」，昵称不再出现                                     |
| 退出后草稿清理               | 生肖页出生日期输入被清空                                                 |
| 退出后结果清理               | 「生肖结果」标题区与「保存本人资料」入口均不再渲染                        |
| 退出后导航                   | 仍仅 `生肖`（无残留权限播种或内部入口）                                  |

### 4.4 覆盖状态

| 项                                                       | 状态                | 证据                                                                    |
| -------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------- |
| 游客首页直达、导航与卡片只含公开工具                     | `browser_verified`  | 本文档 §4.1                                                             |
| 游客当次计算与零持久化                                   | `browser_verified`  | 本文档 §4.1                                                             |
| 未公开工具围栏（bazi / zeji / ziwei）                     | `browser_verified`  | 本文档 §4.2                                                             |
| 退出清理（昵称、草稿、结果、导航）                       | `browser_verified`  | 本文档 §4.3                                                             |
| **账号 A 完整保存闭环（差异确认 → 单独确认保存）**        | `browser_verified`  | [补验记录 §3](2026-09-21-auth-save-account-switch-browser-supplement.md) |
| **A→B 换号隔离（档案、草稿、结果、历史、权限播种）**      | `browser_verified`  | [补验记录 §4](2026-09-21-auth-save-account-switch-browser-supplement.md) |
| 用户接受                                                 | `pending`           | 等待用户确认；不得据此升级为正式公开批准                                |
| `sitemap.xml` / SEO 输出                                 | `not_covered`       | 本轮未触及 SEO 与目录公开状态                                           |
| 移动端抽屉与四档视口（本轮改动）                          | `not_covered`       | 上一计划已覆盖；本轮未改响应式样式                                      |

## 5. 结论与边界

1. 用户界面不再出现研发阶段身份：顶栏导航与首页卡片只呈现已公开工具，登录态与游客态可见集合一致。
2. 公开工具游客可直接完成当次计算；登录只增加保存本人资料、结果与历史、跨设备能力，两者保持独立动作。
3. 退出登录后草稿、结果与身份均被清理，导航不残留未公开入口；未公开工具的服务端围栏与目录状态未放宽。
4. 本轮**不构成任何工具公开准入批准**：`bazi`、`zeji` 等仍为 `in_review / internal`，
   来源核验结论与线上公开状态均未改变。
5. 本记录为技术验证证据，正式验收等待用户体验确认。
