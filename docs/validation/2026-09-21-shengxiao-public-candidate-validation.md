# 生肖公开候选验证记录

> 计划：`plan-20260921-shengxiao-public-candidate-v1`
>
> 验证日期：2026-09-21
>
> 执行者：ZCode（Claude 侧执行器）
>
> 依据：治理规范 [工具统一体验与内容治理规范 §22](../product/governance/tool-experience-and-content-governance-spec.md)、
> [生肖与太阳星座工具契约](../product/contracts/shengxiao-and-constellation-tool-contract.md)、
> [生肖来源台账](../product/evidence/shengxiao/shengxiao-source-ledger.md)、
> [R6 全链路公开门禁审计](../audits/2026-09-21-r6-full-chain-public-gate-audit.md)。
>
> 证据目录（仓库外，不入库）：`D:/Temp/xuanxue-shengxiao-verify/`（隔离数据库、预览日志）。

---

## 1. 本次验证的目标与边界

**目标**：把生肖从 `in_review / internal / blocked / disabled` 切换为
`approved / public / enabled / disabled` 后，验证游客公开路径、零服务器历史、输出闭集、
移动端与可访问性，并复核治理规范 §22 的 16 项公开准入。

**本次不包含**（治理规范 §22 与计划 must_not 明确排除）：

- 太阳星座（constellation）、八字（bazi）与其余 8 项工具的公开状态变更；
- 生肖服务器历史、自动保存、默认日期补全、人格/婚配/运势/本命佛/化太岁内容恢复；
- 部署、提交、推送与正式上线；本记录**不构成用户最终公开批准**。

---

## 2. 目录状态与消费者一致性

### 2.1 目录状态变更

`constants/tool-catalog.ts` 中 shengxiao 的四维状态：

| 维度          | 变更前    | 变更后     |
| ------------- | --------- | ---------- |
| reviewStatus  | in_review | approved   |
| exposure      | internal  | public     |
| computePolicy | blocked   | enabled    |
| historyPolicy | disabled  | disabled（不变） |

其余 10 项工具四维字段逐字未动；`zeji` 与 `bazi` 保持 `internal + enabled`（§20.2 内部验证通道）。

### 2.2 消费者清单（task-1 审计产出）

`isToolPubliclyAvailable` / 目录派生公开面的**全部**消费者，均已随目录变更同步生效：

| 消费者                        | 位置                                 | 行为                                                    |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------- |
| 首页入口卡片                  | `pages/index.vue`                    | 从目录过滤公开工具；生肖卡片出现                        |
| 顶栏与移动端抽屉导航          | `layouts/default.vue`                | `TOOL_CATALOG.filter(isToolPubliclyAvailable)`          |
| SEO / PWA / Open Graph / Twitter | `nuxt.config.ts`                  | `publicToolNames` 派生，描述含「生肖」                  |
| sitemap                       | `nuxt.config.ts` `sitemap.exclude`   | 非公开路由排除，`/tools/shengxiao` 进入                 |
| 路由围栏（客户端 + SSR）      | `middleware/tool-availability.global.ts` | 公开判定为真时直接放行                                  |
| 状态页参数                    | `pages/tools/status.vue`             | `getStatusOnlyToolFromQuery` 排除已公开工具             |
| 导出                          | `constants/tool-catalog.ts` `canExportTool` | 公开后放行                                        |
| 历史写入（服务端）            | `server/api/result-history/index.post.ts` | `canCreateHistory` 仍为 false → 403               |
| 历史读取（服务端）            | `server/api/result-history/index.get.ts`  | `canReadHistory` 仍为 false → 拒绝                |
| 历史边界工具                  | `server/utils/result-history-request.ts`  | `assertInternalAccessIfNotPublic` 对公开工具直接返回 |
| 旧占卜历史接口                | `server/api/divinations/*`           | `canCreateHistory` / `canReadHistory` 未受影响          |

### 2.3 零变更确认

`constellation`、`bazi` 及其余 8 项工具的四维状态与 `canReadHistory` / `canCreateHistory` 行为
均与变更前一致；`historyPolicy` 全部维持原值。

---

## 3. 自动化门禁

四项门禁在 `.nuxt/schema` 串行执行，避免并发竞争。

| 门禁             | 命令                 | 结果 | 备注                                             |
| ---------------- | -------------------- | ---- | ------------------------------------------------ |
| 类型检查         | `npm run typecheck`  | 通过 | 仅既有 `HexagramInfo` 重复导入 warning，非本次引入 |
| 全量测试         | `npm run test`       | 通过 | 89 个文件 / 2701 个用例全部通过                   |
| Lint             | `npm run lint`       | 通过 | 0 error；56 个既有 warning，均非本次改动引入      |
| 生产构建         | `npm run build`      | 通过 | 总产物体积 7.07 MB（gzip 1.62 MB）                |

### 3.1 本次计划指定的测试文件

```
npx vitest run tests/constants/tool-catalog.test.ts tests/middleware/tool-availability.test.ts \
  tests/config/nuxt-public-content.test.ts tests/pages/index-content.test.ts \
  tests/components/shengxiao-page.test.ts
```

结果：5 个文件 / 107 个用例全部通过。其中生肖页面测试由 45 项扩展至 50 项，
新增断言覆盖：公开态空草稿不自动计算、不写服务器历史、导出可用但零历史入口、
输出闭集不含人格/婚配/运势/本命佛/化太岁、刷新与卸载零持久化、档案带入替换/撤销仍为显式操作。

### 3.2 乱码与空白检查

- AGENTS.md 规定的乱码检测命令：0 命中；
- `git diff --check`：通过。

---

## 4. 真实浏览器验收（生产构建预览）

**环境**：`node .output/server/index.mjs`，端口 3210，`DB_PATH` 指向仓库外
`D:/Temp/xuanxue-shengxiao-verify/xuanxue-r2.db`，`SESSION_SECRET` 使用一次性随机值。
仓库内 `xuanxue.db`（旧只读备份）与 `xuanxue-r2.db` 时间戳均早于本次验证，**未被读写**。

### 4.1 游客公开路径

| 检查项                       | 结果                                                          |
| ---------------------------- | ------------------------------------------------------------- |
| 首页公开入口                 | 顶栏导航与「术数工具」区均出现「生肖」入口，指向 `/tools/shengxiao` |
| 直接访问 `/tools/shengxiao`  | 游客 HTTP 200，**不重定向**状态页                              |
| 尾斜杠 `/tools/shengxiao/`   | 同样放行，不绕过围栏判断                                       |
| 未公开工具仍被围栏           | `/tools/constellation`、`/tools/bazi`、`/tools/ziwei`、`/tools/meihua` 均 302 至 `/tools/status?tool=<id>` |
| SSR 与客户端判定一致         | `/tools/bazi` 由 SSR 直接 302；生肖页无重定向                   |

### 4.2 游客业务链路

| 检查项             | 结果                                                                |
| ------------------ | ------------------------------------------------------------------- |
| 空草稿             | 打开页面三个日期输入为空，无默认值、无示例填充                       |
| 不自动计算         | 未点击「生成生肖结果」前不产生任何结果                              |
| 年龄门禁           | 未确认已满十四周岁时提交按钮 `disabled`，函数内二次拦截              |
| 主动生成           | 2024-02-10 → 甲辰年正月初一 / 干支甲辰 / 生肖龙 / 对应地支辰         |
| 输出闭集           | 仅可复算字段（公历、农历、干支、生肖、地支）与年干五行/阴阳、年支五行、纳音等传统分类 |
| 禁止内容           | 页面无婚配、本命佛、化太岁、运势、幸运数字/颜色等文字                |
| 修改 stale         | 修改年份后出现「输入已修改，结果尚未更新」，导出按钮消失              |
| 刷新清空           | 刷新后草稿为空、结果消失、`localStorage`/`sessionStorage` 长度为 0、URL 不含日期 |
| 档案带入           | 登录后出现「从本人档案带入 1 项」；带入前不自动计算、不预读完整档案    |
| 替换确认           | 非空草稿时展示「当前：2000年1月1日 → 拟带入：1990年6月15日」          |
| 确认替换           | 草稿变为 1990-06-15，仍不自动计算                                   |
| 撤销带入           | 恢复为替换前的 2000-01-01，仍不自动计算                             |

### 4.3 日期边界（对照来源台账）

| 用例             | 期望（来源）                                     | 实测结果                                  |
| ---------------- | ------------------------------------------------ | ----------------------------------------- |
| 1901-01-01 下界  | 庚子年（鼠）十一月，SRC-008 + HKO T1901c         | 干支年庚子，正常出结果                    |
| 2024-02-09       | 癸卯年腊月三十（兔），HKO T2024c                 | 癸卯年腊月三十，生肖兔                    |
| 2024-02-10 黄金  | 甲辰年正月初一（龙），HKO T2024c                 | 甲辰年正月初一，生肖龙                    |
| 2023-02-30 非法  | 公历不存在，应拒绝                               | 「请输入真实存在的公历日期（注意闰年二月二十九日）」 |
| 2099-01-01 未来  | 超出查询当日，应拒绝且不近似计算                  | 「暂不支持查询未来日期」                  |
| 非法输入保留     | 失败后保留输入，可直接修正                       | 输入保留 2023/2/30，修正后恢复出结果       |

### 4.4 零服务器历史

| 检查项                         | 结果                                                          |
| ------------------------------ | ------------------------------------------------------------- |
| 计算期间网络请求               | 仅 `/api/auth/me`（会话恢复）；**无** `result-history` / `divinations` 调用 |
| `POST /api/result-history`     | 401（未认证）；同源 + 已认证时仍受 `canCreateHistory=false` 拒绝 |
| `GET /api/result-history`      | 401（未认证），且 `tool=shengxiao` 不因公开而放宽历史读取        |
| 隔离数据库内容                 | 全流程结束后库文件中 `shengxiao` 出现次数为 **0**               |
| 页面历史入口                   | 无「查看历史」「历史记录」入口                                  |

### 4.5 导出

| 检查项         | 结果                                                              |
| -------------- | ----------------------------------------------------------------- |
| 导出可用       | 公开后 `.export-btn` 渲染，current 结果可导出                      |
| 真实产物       | 拦截 `<a download>` 捕获到 `生肖文化卡片.png`，`data:image/png`，约 74 KB |
| 卡片内容       | 「生肖龙 / 地支辰 / 干支年甲辰 / 年干五行木 / 年支五行土 / 纳音覆灯火 / 规则版本：2026-09-09」 |
| 隐私           | 卡片文本**不含**出生日期（2024-02-10）、不含档案 ID 或账号信息      |
| stale 禁止导出 | 输入修改后导出按钮消失，不可导出旧结果                              |

### 4.6 响应式与缩放

在四个 CSS 像素宽度逐一实测（`document.documentElement.scrollWidth` 与
逐元素 `getBoundingClientRect().right` 对比视口宽度）：

| 宽度 | 文档宽 | 横向滚动 | 溢出元素 | 主按钮尺寸 |
| ---- | ------ | -------- | -------- | ---------- |
| 320  | 305    | 无       | 0        | 181×51     |
| 360  | 345    | 无       | 0        | 181×51     |
| 390  | 375    | 无       | 0        | 181×51     |
| 414  | 399    | 无       | 0        | 181×51     |

- 生肖公共文化 12 个 tab 按钮均为 44×44 以上，满足触控目标要求；
- **200% 文本缩放**（`html { font-size: 200% }`，390px 视口）：无横向滚动、0 溢出元素；
- 未禁用浏览器缩放：viewport meta 为 `width=device-width, initial-scale=1, maximum-scale=5`，
  页面不存在 `user-scalable=no` 或全局 `overflow: hidden`。

### 4.7 键盘、状态与错误恢复

| 检查项             | 结果                                                              |
| ------------------ | ----------------------------------------------------------------- |
| 可聚焦元素         | 39 个；跳转链接、导航、三个日期输入、年龄 radio、提交按钮、生肖 tab、来源链接均可聚焦 |
| 状态提示           | 失败区 `role="alert"`、处理中与 stale 区 `role="status"`，均进入正常阅读流 |
| 错误可恢复         | 非法日期报错后保留输入，修正为合法日期即恢复出结果，错误文案消失     |
| 非颜色表达         | 错误、stale、年龄状态均带文字说明，不只依赖颜色                     |
| 加载与保存状态     | 导出中/已保存状态通过按钮 `aria-label` 与可见文本宣布               |

### 4.8 公开面与 console

| 检查项              | 结果                                                        |
| ------------------- | ----------------------------------------------------------- |
| 页面 SEO            | title「生肖文化 — 玄·道」；description 为中性生肖查询说明     |
| 全局 PWA 描述       | 「传统文化自我探索：生肖等探索工具」                          |
| sitemap             | 含 `/tools/shengxiao`，不含 constellation/bazi 及其余 8 项   |
| robots.txt          | `Disallow: /api/`，Sitemap 指向 `https://xuanji.me/sitemap.xml` |
| console 与资源错误  | 完整游客链路（含生成与导出）中 `console.error`、`error`、`unhandledrejection` 均为 0 条 |

---

## 5. 环境限制与未覆盖项（诚实记录）

1. **Playwright 可操作性超时**：IAB 标签页在后台时 `document.hidden === true`，
   `requestAnimationFrame` 被节流，导致 Playwright 的 stability 检查与
   `html-to-image` 导出在非活动标签页上停滞。已在**活动标签页**完成导出验证并捕获真实 PNG；
   受影响的仅是自动化驱动方式，不是产品行为。
2. **生肖 tab 键盘方向键**：公共文化 tab 使用原生 `button` + `role="tab"`，
   未实现 roving tabindex / 方向键切换。该实现属 R3 既有范围，本计划未要求改动，
   已记录为后续可访问性改进项（详见 §6）。
3. **未做**：真实移动设备、屏幕阅读器实机、`prefers-reduced-motion` 实机验证；
   自动化测试不能替代来源审计，本记录亦不替代用户最终体验验收。
4. **未做**：其他工具（星座/八字等）的公开路径验收——它们仍处于围栏状态。

---

## 6. 后续跟进项

| 编号   | 事项                                             | 归属                                        |
| ------ | ------------------------------------------------ | ------------------------------------------- |
| FU-001 | 首页公开工具卡片文案仍为「功能整理中，敬请期待」，与生肖已公开的事实不符 | 需修正计划（`pages/index.vue` 不在本计划 allowed_paths） |
| FU-002 | 生肖公共文化 tab 未实现方向键/roving tabindex     | R3 既有范围，建议后续可访问性专项            |
| FU-003 | 用户对公开体验的最终验收（治理 §22 第 15 项）      | 用户                                        |

---

## 7. 结论

目录、自动化门禁、游客业务链路、零服务器历史、日期边界、导出隐私、四档响应式与
200% 缩放、键盘与错误恢复、公开面一致性均已取得可复现证据。

**本记录证明工程与体验基线满足公开候选条件，但不构成公开批准**：
治理规范 §22 第 15 项（用户完成体验验收）需由用户确认，且 §6 FU-001 的首页文案
不一致项需在公开接受前收敛。
