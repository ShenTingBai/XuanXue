# 生肖公开候选收敛验证记录（v2）

> 计划：`plan-20260921-shengxiao-public-candidate-convergence-v2`
>
> 验证日期：2026-09-21
>
> 执行者：ZCode（Claude 侧执行器）
>
> 依据：治理规范 [工具统一体验与内容治理规范 §22](../product/governance/tool-experience-and-content-governance-spec.md)、
> [生肖与太阳星座工具契约](../product/contracts/shengxiao-and-constellation-tool-contract.md)、
> [生肖公开候选验证记录 v1](./2026-09-21-shengxiao-public-candidate-validation.md)、
> [生肖公开门禁复核 v1](../audits/2026-09-21-shengxiao-public-gate-review.md)。
>
> 证据目录（仓库外，已清理）：`D:/Temp/xuanxue-convergence-verify/`。

---

## 1. 本次收敛的两个缺口

| 编号   | 缺口                                                                 | 来源             |
| ------ | -------------------------------------------------------------------- | ---------------- |
| FU-001 | 首页 `toolCardNote()` 对 public 工具返回「功能整理中，敬请期待」，与生肖已公开事实矛盾 | v1 验证记录 §6   |
| FU-002 | `VerifiedCulture.vue` 使用 `role=tablist/tab`，但 12 个 tab 均保留默认 `tabindex`，无方向键/Home/End | v1 验证记录 §6   |

两者均不改变生肖业务范围：计算、来源、输出闭集、零服务器历史、目录四维状态全部保持不变。

---

## 2. 修改内容

### 2.1 FU-001：首页公开工具卡片文案（`pages/index.vue`）

```diff
 function toolCardNote(tool: ToolCatalogEntry): string {
   return tool.exposure === 'public'
-    ? `${tool.name}功能整理中，敬请期待。`
+    ? '已通过公开准入，可直接使用。'
     : '内部验证中（未公开）：点此进入。'
 }
```

- 公开分支改为**工具无关**的中性可用文案，后续新增公开工具无需再改；
- 不再拼接 `tool.name`，避免把通用文案写成生肖专属；
- internal 分支保持「内部验证中（未公开）：点此进入。」，继续如实说明可用但未公开；
- 相邻的过时注释「当前围栏期没有任何普通访客可用工具」一并修正；
- 入口列表、目录派生、登录 CTA、SEO 与 R6 响应式修复均未改动。

### 2.2 FU-002：生肖 tablist 键盘模型（`components/tools/shengxiao/VerifiedCulture.vue`）

按 WAI-ARIA tabs 自动激活模式补齐：

| 行为                       | 实现                                                         |
| -------------------------- | ------------------------------------------------------------ |
| roving tabindex            | 选中项 `tabindex=0`，其余 `-1`（Tab 键在 tablist 只停一次）    |
| ArrowRight / ArrowDown     | 选中下一项，末项回绕到首项                                     |
| ArrowLeft / ArrowUp        | 选中上一项，首项回绕到末项                                     |
| Home / End                 | 选中第一项 / 最后一项                                          |
| 焦点跟随                   | 每次键盘切换后 `nextTick` 聚焦新选中的 tab，焦点与 `aria-selected` 一致 |
| tab ↔ tabpanel 关联        | tab 有稳定 `id` 与 `aria-controls`；面板 `aria-labelledby` 跟随当前 tab |
| 保留行为                   | 鼠标点击、Enter、Space、`aria-selected`、`aria-current`、面板内容与来源链接不变 |

实现说明：面板内含来源链接（可聚焦），按 WAI-ARIA tabs 模式**未**给面板添加 `tabindex`，
避免多出一个冗余 Tab 停留点。

---

## 3. 自动化门禁

四项门禁串行执行，避免 `.nuxt/schema` 并发竞争。

| 门禁     | 命令                | 结果 | 备注                                             |
| -------- | ------------------- | ---- | ------------------------------------------------ |
| 类型检查 | `npm run typecheck` | 通过 | 仅既有 `HexagramInfo` 重复导入 warning           |
| 全量测试 | `npm run test`      | 通过 | 89 个文件 / **2711** 个用例（v1 为 2701，本次 +10） |
| Lint     | `npm run lint`      | 通过 | 0 error；57 个既有 warning                        |
| 生产构建 | `npm run build`     | 通过 | 7.07 MB（gzip 1.62 MB），与 v1 一致               |

### 3.1 计划指定的定向测试

```
npx vitest run tests/pages/index-content.test.ts tests/components/shengxiao-page.test.ts
```

结果：2 个文件 / **78** 个用例全部通过（index-content 21 项、shengxiao-page 57 项）。

### 3.2 grep 验证（计划 verify）

`pages/index.vue` 中 `功能整理中，敬请期待` 出现次数：**0**（PASS）。

### 3.3 乱码与空白

- AGENTS.md 规定的乱码检测：0 命中；
- `git diff --check`：通过。

---

## 4. 真实浏览器复验（生产构建预览）

**环境**：`node .output/server/index.mjs`，端口 3211，`DB_PATH` 指向仓库外
`D:/Temp/xuanxue-convergence-verify/xuanxue-r2.db`，`SESSION_SECRET` 使用一次性随机值。
验证结束后临时目录（含 DB/.bak/.lock）已清理；仓库内 `xuanxue.db` 与 `xuanxue-r2.db`
时间戳早于本次验证，**未被读写**。

### 4.1 FU-001 复验

| 检查项           | 结果                                                     |
| ---------------- | -------------------------------------------------------- |
| 首页生肖卡片文案 | 「已通过公开准入，可直接使用。」                          |
| 旧文案           | 页面文本不含「功能整理中，敬请期待」                      |
| 内部验证文案     | 生产构建中不出现（`getLocalDevNavTools(false)` 为空）     |
| 卡片入口         | `aria-label="打开生肖工具"`，`href="/tools/shengxiao"`    |

### 4.2 FU-002 复验（真实浏览器键盘）

在 `http://127.0.0.1:3211/tools/shengxiao` 实测：

| 操作                     | 选中项 | 焦点位置 | 面板标题 | `aria-labelledby`        | tabindex=0 数量 |
| ------------------------ | ------ | -------- | -------- | ------------------------ | --------------- |
| 初始                     | 鼠     | —        | —        | `…-tab-0`                | 1               |
| ArrowRight（自第 1 项）  | 牛     | 第 2 项  | 牛       | `…-tab-1`                | 1               |
| ArrowDown（自第 2 项）   | 虎     | 第 3 项  | 虎       | `…-tab-2`                | 1               |
| ArrowLeft（自第 3 项）   | 牛     | 第 2 项  | 牛       | `…-tab-1`                | 1               |
| End（自第 1 项）         | 猪     | 第 12 项 | 猪       | `…-tab-11`               | 1               |
| Home（自第 12 项）       | 鼠     | 第 1 项  | 鼠       | `…-tab-0`                | 1               |
| ArrowRight（自第 12 项） | 鼠     | 第 1 项  | —        | —                        | 1（首尾循环）   |
| ArrowLeft（自第 1 项）   | 猪     | 第 12 项 | —        | —                        | 1（首尾循环）   |
| ArrowUp（自第 1 项）     | 猪     | 第 12 项 | —        | —                        | 1（首尾循环）   |

其余行为：

| 检查项              | 结果                                                             |
| ------------------- | ---------------------------------------------------------------- |
| Tab 键停留点        | tablist 中恰好 1 个 tab 可停留（roving tabindex 生效）             |
| 真实指针点击第 6 项 | 选中蛇、焦点落到该按钮、面板更新为蛇                              |
| Enter 激活          | 第 8 项 → 选中羊                                                  |
| Space 激活          | 第 10 项 → 选中鸡                                                 |
| tab ↔ panel 关联    | tab 均有 `id` 与 `aria-controls="shengxiao-culture-panel"`；面板 `aria-labelledby` 跟随选中项 |
| console 错误        | 完整键盘遍历 + 点击过程中 `console.error`/`window.error`/`unhandledrejection` 均为 0 条 |

### 4.3 未变更范围复验

| 检查项                | 结果                                                            |
| --------------------- | --------------------------------------------------------------- |
| 生肖目录四维状态      | `approved / public / enabled / disabled`（未变）                 |
| 黄金样例 2024-02-10   | 甲辰年正月初一 / 生肖龙（对照 HKO T2024c）                        |
| 输出闭集              | 卡片仅含生肖、地支、干支年、年干五行、年支五行、纳音、规则版本    |
| 禁止内容              | 页面无婚配/本命佛/化太岁/运势/幸运数字                            |
| 零服务器历史          | 计算期间仅 `/api/auth/me`；无 `result-history`/`divinations` 调用；隔离库中 `shengxiao` 出现 **0** 次 |
| 历史入口              | 页面无「查看历史」「历史记录」                                    |
| 其他工具围栏          | constellation / bazi / ziwei 均 302 至 `/tools/status?tool=<id>`  |
| 四档响应式            | 320/360/390/414：无横向滚动、0 溢出元素；tab 按钮最小 44×46      |
| 200% 文本缩放         | 390px 视口下无横向滚动、0 溢出元素                                |

---

## 5. 未覆盖项与限制（诚实记录）

1. **自动化测试环境限制**：happy-dom 中游离节点无法持有 `document.activeElement`，
   焦点断言必须用 `attachTo` 挂到真实文档。已在测试内注明，避免把测试环境限制误判为组件缺陷。
2. **合成 `.click()` 不移动焦点**：`element.click()` 不产生指针焦点；
   浏览器复验改用 Playwright 真实指针点击确认焦点行为。
3. **未做**：真实移动设备、屏幕阅读器实机（NVDA/VoiceOver）、`prefers-reduced-motion` 实机验证。
4. **未做**：用户最终公开体验验收——本记录不替代用户接受。
5. **IAB 后台标签页节流**：`document.hidden === true` 时截图/渲染可能超时；
   已改用新活动标签页完成证据采集，属自动化环境限制而非产品行为。

---

## 6. 结论

FU-001 与 FU-002 均已修复并取得真实浏览器证据：

- 首页公开工具卡片文案与 catalog 事实一致，且为工具无关的中性文案；
- 生肖 tablist 具备完整 roving tabindex、方向键、Home/End、焦点跟随与 tab/tabpanel 关联；
- 生肖业务范围、目录状态、零服务器历史与其他工具围栏均未改变。

**本记录证明工程与体验基线已收敛，但不构成公开批准**：治理规范 §22 第 15 项
（用户完成体验验收）仍需用户确认。
