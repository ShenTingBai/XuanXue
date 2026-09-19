# XuanXue 第三方独立全面复核（2026-09-15）

> 状态：Independent review — 外部视角，未经执行器门禁，不改变任何阶段状态
>
> 方法：静态全量阅读 + 三路专项审计（算法 / 安全 / 工程化）+ 作者实测门禁
>
> 边界：未提交、未推送、未修改任何产品代码。本次结论不构成 `Accepted`，也不替代 Codex 审查与用户验收。
>
> 审计基线：分支 `codex/foundation-rebuild`，HEAD `481cef9`，工作区脏（14 修改 / 3 删除 / 4 新增）

---

## 一、执行摘要

本项目呈现出一种罕见的**结构性失衡**：治理、文档、审计与本地工程纪律的水平显著高于同类项目，
但其**交付价值**与**机器强制力**严重滞后。

核心事实：

| 指标                                    | 数值                                         |
| --------------------------------------- | -------------------------------------------- |
| Git 提交总数                            | 615                                          |
| 文档总行数（`docs/**/*.md`）            | 11,742                                       |
| 过程产物（`.claude/plans` + `results`） | 57 + 66 = 123 份                             |
| 源码行数（排除测试）                    | 56,332                                       |
| 文档 / 源码比                           | ≈ 21%                                        |
| 测试文件 / 用例                         | 80 文件 / 2,592 用例                         |
| **当前对普通公众开放的工具**            | **0 个**（11 项全部 `exposure: 'internal'`） |

一句话结论：**骨架可信、解读不可信；人的自觉 8 分、机器强制 3 分；文档世界一流、交付严重滞后。**

综合评分 **6.5 / 10**。

---

## 二、证据与验证边界

### 2.1 本次实测通过的门禁（用户授权）

| 命令                | 结果                                     |
| ------------------- | ---------------------------------------- |
| `npm run typecheck` | **0 错误，exit 0**                       |
| `npm run test`      | **80 文件 / 2,592 用例全部通过，exit 0** |

测试耗时 20.00s（transform 17.77s / collect 51.85s / tests 13.51s / environment 134.19s）。
结果与 `docs/validation/2026-09-15-bazi-interaction-affordance-validation.md` 记录一致，
**当前工作树确实通过自身门禁**，这一点应当肯定。

首次执行测试时遇到 `spawn EPERM`（`node_modules/vite/node_modules/esbuild/lib/main.js:2268`），
属执行环境沙箱禁止管道 stdio，**不是项目缺陷**；放宽权限后正常通过。

### 2.2 已验证为「误报」的一项

`README.md` 在 PowerShell 控制台输出为乱码（`鐜?路 閬?` 形态）。经 `read` 工具直接读取，
**文件本身编码完全正常**，UTF-8 中文正确。这是终端以 GBK 解码 UTF-8 的显示问题。
**不得据此对 README 做任何"编码修复"。**

### 2.3 未做运行时验证的项（诚实标注）

以下结论来自静态代码与构建产物分析，**未在真实运行时复现**，落地前需一次黑盒验收：

1. `PRAGMA foreign_keys=ON` 在 sql.js 中是否真正生效（决定注销级联是否真的删除子表）；
2. CSP 修复前的真实响应头最终形态（需 `curl -sI` 实测）；
3. PWA Service Worker 因 `navigateFallback` 指向未预缓存的 `/` 而安装失败的实际表现；
4. 反向代理是否使用 `$proxy_add_x_forwarded_for`（`deploy/` 已 gitignore，仓库内无配置可查），
   这直接决定 XFF 限流绕过是否可被实际利用。

---

## 三、真正的优势（逐条附证据）

### 3.1 类型纪律：教科书级

- `tsconfig.json` 继承 `.nuxt/tsconfig.json`，其中 `"strict": true`。
- 全 `src`（排除 tests）显式 `any` 仅 **5 处，全部位于 `server/database/sql.js.d.ts`**
  （第 7、8、15、17、21 行）+ 第 1 行的文件级 `eslint-disable`。这是手写第三方类型 shim，
  是合理的唯一豁免点。
- `as any` = **0**，`<any>` = **0**，`@ts-ignore` = **0**，`@ts-expect-error` = **0**，`@ts-nocheck` = **0**。
- `eslint-disable` 全仓仅 **11 处**（10 处 `no-console` + 1 处上述文件级）。

`CLAUDE.md` 声称"禁止 `as any`"是被真正执行的，而非口号。

### 3.2 安全底座：多项达到或超过生产水准

**已确认良好（避免后续重复劳动）：**

| 项                   | 证据                                                                                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL 全参数化，零注入 | `db.ts:241-283`；全仓无 `db.exec`；所有拼入 SQL 的字符串均为代码常量列名或生成的 `?` 列表（`result-history.ts:169-172`、`self-profile.ts:197-201`）                                                                           |
| 会话 token 熵与存储  | `randomBytes(24)` → 192bit（`auth.ts:55`），**仅存 HMAC-SHA256 摘要**（`auth.ts:56/67`），库泄露无法伪造会话                                                                                                                  |
| 时序安全比较         | `timingSafeEqual` + 畸形哈希前置校验（`auth.ts:31-39`）                                                                                                                                                                       |
| Cookie 属性          | HttpOnly / Secure / SameSite=strict / Path=/ / Max-Age=604800（`auth.ts:127-135`）；编译产物中确认 `secure:true`                                                                                                              |
| CSRF 双保险          | `SameSite=strict` **且** `assertSameOriginMutation`（`request-origin.ts:9-36`）已覆盖**全部活跃写端点**：register、login、logout、logout-all、account.delete、self-profile 四个写接口、result-history post/delete/[id].delete |
| 无 IDOR              | self-profile 全部 `WHERE account_id=?` + id/version CAS（`self-profile.ts:243/269/347/375/423/458`）；result-history 按 accountId 限定且未命中统一 403，不区分存在性（`result-history.ts:177/251/269/280/296`）               |
| 输入校验             | `readRawBody` + 真实 UTF-8 字节上限（4096/8192），**不信任 Content-Length**；严格键集合全等白名单；原型污染不可达                                                                                                             |
| 数据生命周期         | 注销事务内先删安全日志再删 accounts → 外键级联 sessions/self_profiles/consent_receipts/result_snapshots（`account.delete.ts:52-55`），要求昵称+密码复核                                                                       |
| 日志脱敏             | `security_log` 只存域分隔 HMAC IP 提示与固定短语（`securityLog.ts:18-44`），90 天清理；全 server 仅 5 处 `console.*` 且无 PII                                                                                                 |
| 缓存边界             | `no-store` 按路径段边界覆盖 5 组敏感 API（`middleware/no-store.ts:3-26`）；PWA 对敏感路径 NetworkOnly 规则编译正确                                                                                                            |

### 3.3 黄金样例机制：真实的外部核验

`tests/utils/bazi/golden-cases.test.ts`：

- `:141-149` 用 **SHA256 锁定证据 YAML** 防漂移，实测哈希与
  `docs/product/evidence/bazi/bazi-golden-cases.yaml` **完全匹配**
  （`c1b5b97e3a2907de6626928200fca0a155e79c11e83cebc18c27cb0d897f38be`）；
- `:159-209` 期望值来自 **GB/T 33661—2017 国标扫描页、香港天文台 T2000c/T2023c/T2026c、
  日本国立天文台 2026《暦要項》（JST 减 1 小时换算北京时间）**；
- 来源台账明文**禁止**把 lunar-javascript 输出当期望值，
  `SRC-BZ-006` 标注为 `implementation_only`；
- `:305-310` 断言两类样例**恰好**覆盖全部 caseId，防止漏测静默通过。

这是全仓质量最高的测试，也是"证据驱动"真正落地的证明。

### 3.4 围栏系统：设计严谨，边界写明

`constants/tool-catalog.ts` 定义四维状态（`reviewStatus` / `exposure` / `computePolicy` / `historyPolicy`），
`middleware/tool-availability.global.ts` 强制：

- 判定**始终由服务端做出**，客户端不猜、不放行未知；
- 服务端用请求上下文里的可信 `accountId` 判定并写入 `useState` 供客户端复用；
- 客户端未见播种时**不直接失败关闭**，而是整页重取让服务端重新裁决——
  注释里解释了原因：登录是纯客户端动作，SSR payload 无播种值，"未知即拒绝"会导致
  **已授权账号点入口必然落到状态页**（R5-C 后实测复现过）。

这种"把权衡写进注释"的习惯在本仓广泛存在，可维护性显著受益。

### 3.5 文档诚实度：罕见品质

2026-09-13 的事故被完整、不加粉饰地记录（`docs/product/README.md:187-189`、
`docs/audits/2026-09-13-r4-self-profile-acceptance-review.md`）：

- `.githooks/pre-commit` 的 `prettier --write` 在验收**之后**改写了源码，
  使提交 `53cd19d` 的树上 **typecheck 11 错、测试 2289 通过 + 45 例编译失败、build 失败**，
  而验收文档声称全绿；
- 文档逐项对账："2289 + 45 = 2334，与验收文档声称的用例数一致"；
- 同轮把 pre-commit 从**改写型**改为**门禁型**（`prettier --check` / `eslint`），这是正确修复。

**这个项目从不把失败改写成成功**。这一点值得高度肯定，也是它能持续自我纠偏的根本原因。

### 3.6 新八字引擎：干净且诚实

- 日柱用国标明文锚点 `1949-10-01 = 甲子`（`constants/bazi-rules.ts:60`）+ 纯整数儒略日差取模；
- 节气走 lunar-javascript `getJieQiTable()`，**四舍五入到分钟**并防跨日（`calendar-adapter.ts:68-76`）；
- 边界候选建模正确（`pillars.ts:150-241`）；
- 页面用 `BAZI_NOT_OUTPUT` **主动列明自己不输出什么**（`constants/bazi-rules.ts:178`），
  包括"不支持 23:00—23:59 的午夜换日与子初换日双候选"；
- 旧 UI 组件（含 `运势评分 X/100`、喜用神/忌神）**已完全不被新页面挂载**，
  且有 `tests/pages/tools/bazi.test.ts:22-43` 专门断言页面不得再引用它们。

---

## 四、P0 — 会直接产生错误结论或被攻破

### 4.1 旧八字引擎日柱地支系统性偏移 +2

**证据**：`composables/useBaZi.ts:245-273`

```ts
// 1900-01-01 is a 甲子日 (stem=0, branch=0) in the sexagenary cycle.
const DAYS_FROM_EPOCH_TO_1900_01_01 = 693902
```

该注释断言错误。**1900-01-01 真值为甲戌日**，三法互证：

1. 国标锚点反推：1949-10-01 = 甲子，回推 `−18170 mod 60 = 10` = 甲戌；
2. `lunar-javascript`：`Solar.fromYmd(1900,1,1).getLunar().getDayInGanZhi()` = 甲戌；
3. JDN 公式 `(JDN + 49) mod 60`。

因此 `legacyIdx = 真值 − 10 (mod 60)`，等价于**日干永远正确、日支永远错后两位**：

| 日期       | 旧实现   | 真值 | 黄金样例 |
| ---------- | -------- | ---- | -------- |
| 1949-10-01 | 甲**寅** | 甲子 | BZ-701   |
| 2000-01-01 | 戊**申** | 戊午 | BZ-704   |
| 1964-07-14 | 甲**寅** | 甲子 | BZ-703   |
| 2026-09-14 | 辛**巳** | 辛卯 | BZ-705   |
| 2024-06-15 | 庚**子** | 庚戌 | BZ-707   |

**影响链**（日支 = 夫妻宫）：

- `useHeHun.ts:295-349` 六合 +8 / 六冲 −10 / 六害 −6 / 相刑 −4；
- `useHeHun.ts:352-383` 阴差阳错 / 孤鸾；
- `useShenSha.ts` 空亡（用日支定旬）；
- 藏干 / 日主强弱（`useBaZi.ts:306-357`）。

**测试把错误固化了**：`tests/composables/useBaZi.test.ts:775-776` 的 inline snapshot
把 `dayPillar.branch` 固化为 `"申"`，`:795` 固化为 `"寅"`。
fixture 自己承认（`tests/fixtures/bazi-golden.json` BZ-704 note）：

> **项目现有实现给出「戊申」（错误锚点）**，旧测试内联快照固化了该错误；本样例即为纠错基准
> （D12 裁决：不改旧测试）

**当前风险等级**：合婚整体被围栏挡住（`computePolicy: 'blocked'`），**公众看不到**。
但 `useHeHun.ts` 仍在调用旧引擎，一旦放开围栏即输出系统性错误的合婚结论。

**修复**：删除自研锚点，改用 `constants/bazi-rules.ts:60` 的 `BAZI_DAY_PILLAR_ANCHOR`
或直接复用 `utils/bazi/pillars.ts:80-88` 的 `dayGanZhi()`；同轮把 `useHeHun` 切到 `utils/bazi`；
并重写被固化的 inline snapshot（此时 D12"不改旧测试"的前提已失效）。

### 4.2 安全三连

#### 4.2.1 IP 限流可被 `X-Forwarded-For` 伪造绕过（CWE-348 / CWE-290 → CWE-307）

`server/utils/rateLimit.ts:80-94`：仅当 `remoteAddress` ∈ `TRUSTED_PROXY_IPS`
（默认 `127.0.0.1, ::1, ::ffff:127.0.0.1`，见 `:66`）时信任转发头，
随后取**最左值** `forwarded.split(',')[0].trim()`（`:87`）。

- 登录限流是**唯一**的暴破防线，且只按 IP：
  `login.post.ts:37-41` `checkRateLimit('login:' + clientIp, 5, 60000)`；
  `register.post.ts:77-81` 3/min。
- **无**按账号失败计数、**无**锁定、**无**退避、**无**验证码；
  `schema.ts:11` 的 `accounts.status CHECK(status IN ('active'))` 导致根本没有封禁状态可用。
- 触发条件：应用在本机反代之后（`remoteAddress = 127.0.0.1` → 命中默认可信集）。
  若 nginx 使用最常见的 `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`，
  客户端自带的 XFF 会被前置，**最左值即攻击者可控** → 每请求换伪造 IP，限流永不触发。
- **放大器**：`scryptSync` 同步阻塞事件循环约 50–100ms（`auth.ts:38`），
  单线程下约 10 req/s 即可打满 CPU。
- 结合注册 409 可枚举昵称，构成**无上限在线撞库**。

**修复**：代理侧强制覆盖 `X-Forwarded-For`；或代码改为从右向左跳过可信跳数取第一个不可信 IP；
增加按账号退避 / 锁定；限流迁共享存储。另：`getTrustedProxies()` 结果应缓存，现每请求构造 Set。

#### 4.2.2 认证端点请求体上限可被 chunked 绕过（CWE-400 / CWE-770，未认证可达）

`register.post.ts:26-29`、`login.post.ts:19-22`、`account.delete.ts:14-17`
**只检查 `Content-Length` 头**，随后 `await readBody(event)` 读入整包
（register:31 / login:24 / account.delete:24）。

缺 `Content-Length`（`Transfer-Encoding: chunked`）时 `parseInt('0') = 0` → 通过检查。

- 三处限流都排在**读体之后**（register:31→78，login:24→38）；
- `account.delete` **完全无限流**。

**对照正确写法**：`self-profile-request.ts:42-48`、`result-history-request.ts:57-61`
使用 `readRawBody` + `Buffer.byteLength` 兜底 —— 说明团队知道正确做法，只是未铺开。

**复现**：`curl -X POST /api/auth/login -H 'Transfer-Encoding: chunked' -H 'Origin: https://host' --data-binary @2GB.json`

**修复**：三端点统一改用 `readBoundedJsonBody`，限流前移。

#### 4.2.3 CSP nonce 在生产从未生效（CWE-693）

`server/plugins/csp.ts:13-20` 从 `response.headers['Content-Security-Policy']` 取值再替换 nonce；
取不到则静默跳过。

但 Nuxt renderer 的 `ctx.response.headers` **只有** `content-type` + `x-powered-by`
（`.output/server/chunks/routes/renderer.mjs` 中 `renderRoute()` 返回这两个），
`routeRules` 的 CSP 由 `createRouteRulesHandler` 直接写到 `event`
（`.output/server/chunks/_/nitro.mjs:4600` 定义、`:8750` `h3App.use`），
不进入 `ctx.response.headers`；`render:response` 钩子（`nitro.mjs:8799+`）只拿到 renderer headers。
全量构建产物中 `getResponseHeaders` 出现 **0 次**（421 个 js 全扫）。

**结果**：`if (csp)` 恒假 → 响应头仍是 `script-src 'self' 'unsafe-inline'`；
而 `<script nonce="...">` 属性注入在 `if` **之外**（`csp.ts:26-31`）照常执行
→ **表面有 nonce、CSP 从不引用，XSS 缓解为零，且极易被误判为已修复**。

`tests/` 中**不存在任何** csp / nonce / Content-Security-Policy 断言（grep 无匹配）→ 无测试能发现。

**修复**：钩子内改用 `getResponseHeader(event, 'content-security-policy') || response.headers?.[...]` 并写回；
验收 `curl -sI https://host/ | grep -i content-security-policy` 应含 `nonce-` 且 `script-src` 不含 `'unsafe-inline'`；
补集成测试。

### 4.3 sql.js 持久化：非原子写 + 丢数据窗口 + 多实例互覆盖

`db.ts:51-56` `saveFile()` = `db.export()` → `fs.writeFileSync(path, buffer)`：

- **无临时文件 + rename**、**无 fsync** → 写入中崩溃/断电即文件截断，
  账号 / 会话 / 档案**一次性损毁**，无备份、无 journal；
- 节流 5 秒（`db.ts:58-100`，`MIN_SAVE_INTERVAL = 5000`）→ 硬崩溃 / SIGKILL / OOM
  丢失最近约 5 秒**已返回成功**的写入；`SIGINT/SIGTERM/beforeExit`（`:172-184`）
  只覆盖优雅退出；
- **多实例部署根本不成立**：各持内存副本，每 5 秒整文件覆盖写，后写者抹掉前者全部写入。

进程内并发是安全的（单线程 + 同步 + 每写路径都在 `withTransaction`，`db.ts:204-236`，
仅 COMMIT 后调度落盘）——这部分设计正确。

**次要问题**：`PRAGMA journal_mode=WAL`（`db.ts:128`）对 sql.js 无意义；
`db.export()` + 整文件写同步阻塞事件循环；保存失败只 `console.error`（`:78/93/113`）无告警；
DB 默认在项目根（`db.ts:30`）与 `public/` 同级。

**修复**：临时文件 + fsync + rename（同目录原子替换）、保留 `.bak`、强制单实例、
DB 移出 web root 并设 0600、失败告警。

---

## 五、P1 — 工程交付风险

### 5.1 CI 对当前代码库一次都没跑过

GitHub API 实测：

- `GET /repos/ShenTingBai/XuanXue/actions/runs` → `total_count: 80`，
  最新 run #80 `head_branch: main`、`head_sha: 2aa1574`、`created_at: 2026-06-08T04:26:04Z`；
- `GET .../actions/runs?branch=codex/foundation-rebuild` → **`total_count: 0`**；
- `origin/main` 尖端 = `2aa1574`（2026-06-08）；
  `git rev-list --left-right --count origin/main...HEAD` = `0  17`
  → **HEAD 领先 main 17 个提交，main 完全被 HEAD 包含**。

`ci.yml:3-8` 的触发器只覆盖 `push[branches: main]` 与 `pull_request[branches: main]`，
而 R2–R5 全部提交只存在于长期分支。

→ 那 80 次绿色 CI 属于 2026-06 的旧代码；**当前代码库的绿灯完全依赖作者手跑**。
`CLAUDE.md:242-244`"个人开发不强制每次走 PR"与 workflow 触发器互相矛盾。

**这是 2026-09-13"验收树与提交树分叉"事故能发生的结构性根因**：
一旦依赖人工自觉，提交树与验收树就必然分叉。

### 5.2 coverage 是三重死配置

1. `vitest.config.ts:23` `enabled: false`；
2. `package.json:5-17` **无任何** `test:coverage` 脚本，只有 `"test": "vitest run"`；
3. `.github/workflows/ci.yml` 全文 54 行，grep `coverage` **0 命中**。

→ `thresholds {lines:60, branches:45, functions:60, statements:60}`（`:24-29`）
**从未被评估过一次**。即使打开，`:30` 的
`include: ['composables/**/*.ts','utils/**/*.ts','server/utils/**/*.ts']`
把 `server/api`、`server/services`、`server/database`、`components`、`pages` 全部排除。

另：`:20` `passWithNoTests: process.env.CI ? false : true` → 本地若 include 写错会**静默 0 用例成功**。

**CI 还缺 `npm run build`** —— 而 build 恰是历史上唯一真正拦下过事故的门禁
（Vue 模板 + `semi: false` 这类问题只有 build 能抓）。

### 5.3 测试广度薄，且部分测试是自证

**覆盖广度**（静态推算，因 `enabled: false` 无实测）：

- 配置 include 范围内：语句覆盖约 **65–78%**；
- **全仓（含 components/pages/server/api）：约 25–35%**；
- `components/` 88 个 `.vue`，仅 13 个文件出现 `mount(`，实际挂载约 10 个 → **≈11%**；
- `pages/` 19 个，仅 account / self-profile / tools-bazi / tools-status 有行为测试；
  **cezi / constellation / guming / hehun / meihua / name-test / yijing / zeji / ziwei
  九个工具页零页面测试**；
- components 16,437 + pages 9,154 = **25,591 LOC（全仓 45.8%）**，却是覆盖最薄的一层。

**自证测试（具体例证）**：

| 位置                                                             | 问题                                                                                                                         |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `useShenSha-exhaustive.test.ts:19-26, 261-303, 310-347, 411-455` | 期望值直接 `import { LU_SHEN_MAP, TIAN_YI_MAP, TIAN_DE_MAP … }` 推导后再断言实现命中 —— **改表即改测试，传统规则内容零校验** |
| 同上 `:353-368`、`:609-617`                                      | 词馆用 `LU_SHEN_MAP` 作期望、天喜用 `(红鸾+6)%12` 现算 —— 把实现公式重抄一遍                                                 |
| 同上 `:193-220, 248-259, 493-504, 520, 585-598, 630-643`         | **本地硬编码表作独立期望，才有效**。同文件两种做法并存，说明作者知道差别                                                     |
| `useBaZi-exhaustive.test.ts:313-329`                             | 断言身强分布 `偏弱===2`，注释直写"强=30 / 偏强=20 / 中和=8 / 偏弱=2" —— 数字只能由当前实现跑出                               |
| `useBaZi.test.ts:731-857`                                        | 36 处 `toMatchInlineSnapshot`（全仓 41 处），`.snap` 文件 0 个（内联快照评审时不易发现）                                     |
| `useBaZi-exhaustive-d.test.ts:41-70`                             | 大运只断言 `age>0 && age<11`、男≠女 —— 方向对而公式错也能通过                                                                |
| `useZiwei.test.ts:19-35`                                         | 一串 `toBeDefined`，只证明"没崩溃"                                                                                           |
| `useSolarTerms.test.ts:106-109`                                  | 节气只断言"±1 天以内"，实际放过 2024 小寒错日                                                                                |

**把源码当字符串测**：11 个文件用 `readFileSync` 断言源码文本
（`nuxt-public-content.test.ts`、`history-containment.test.ts`、`sqljs-production-runtime.test.ts` 等），
其中 `sqljs-production-runtime.test.ts:30-32` 还是**条件断言**（`.output` 缺失时静默跳过）。
这类测试锁文本存在性，重构即红，行为回归却抓不到。

**关键安全链路未被真实覆盖**：

- 注销/级联删除：`account.delete` 仅有全 mock 测试，
  且 `tests/server/api/auth.test.ts:45-48` 把 `withTransaction` 换成"直接执行回调、不 BEGIN/COMMIT"
  → **"单一事务"这个核心承诺在测试里根本没被证实**；
- 限流：三个 API 测试把 `checkRateLimit` mock 成 `() => true` → 「限流真的会在 API 层拦住请求」无覆盖；
- 同源校验：`auth.test.ts:91-93`、`result-history.test.ts:68-70` mock 掉 `assertSameOriginMutation`
  → **端点是否真的调用了它，没有任何断言**；
- `server/plugins/csp.ts` **零测试**。

**SSR 分支结构性不可测**：`vitest.config.ts:13` 硬编码 `define: {'import.meta.client': 'true'}`，
全仓 `import.meta.client` 出现 **28 次**，`import.meta.server` 仅 1 次
→ 所有 SSR 分支在测试里永远走不到，而 `/tools/bazi` 恰恰是 `ssr: true`。

**测试基础设施风险**：`divinations.test.ts:33` 与 `utils/auth.test.ts:29` 都调真实 `initDb()` 落盘，
而 `vitest.config.ts` 未覆盖 `fileParallelism`（Vitest 3 默认 `true`）
→ **两个 worker 进程并发读改写同一个 sqlite 文件**，且都用 `LIKE 'test_%'` 清库，互为外部状态。

### 5.4 文档漂移（而"文档与实现一致"正是本项目第一价值主张）

| 文档声明                                                                    | 实际                                                                                                  | 证据                                                                                                                                   |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` 说 R4 = `implemented_verification_pending`、"**不是 Accepted**" | `docs/product/README.md:207` = **Accepted**（2026-09-14）；提交 `f7ef986` 正文即"状态更新为 Accepted" | 三处互相矛盾                                                                                                                           |
| `docs/product/README.md` 矩阵说 `bazi` = `blocked` / `disabled`             | `tool-catalog.ts:77-78` = **`enabled` + `create_allowed`**                                            | 代码领先文档                                                                                                                           |
| `stage-roadmap.md` 说"R5 尚未生成实施计划、未运行任何 R5 代码"              | R5-B（`c1eb1eb`）、R5-C（`7073f5d`）已提交，R5-D 在工作区                                             | 路线图严重滞后                                                                                                                         |
| `CLAUDE.md:317-318` HistoryModal 展示最近 5 条、BaZi 页用它                 | 无任何页面挂载；`history-containment.test.ts:39-49` 正断言 11 页不得含 `<HistoryModal>`               | 组件不可达                                                                                                                             |
| `CLAUDE.md:322` 提到 `EntertainmentDisclaimer`                              | **文件不存在**                                                                                        | `Test-Path` = False                                                                                                                    |
| `CLAUDE.md:71-88` 列 19 个 composable                                       | 实际 **26 个**                                                                                        | 缺 useBaziDraft / useBaziProfileImport / useDailyWuxing / useProfileAutoFill / useResultHistory / useSelfProfile / useSelfProfileDraft |
| `CLAUDE.md:159` tests/ 只有 composables/server/utils/helpers                | 还有 components / pages / middleware / config / constants / fixtures                                  | 目录清单                                                                                                                               |
| `CLAUDE.md:172-174` 结构未含 `components/bazi/`、`components/editorial/`    | 均存在（`editorial/` 还是未跟踪）                                                                     | 目录清单                                                                                                                               |
| `README.md:58` R3 "57 文件、2170 用例"                                      | 历史值，当前 80 文件 / 2592 例                                                                        | —                                                                                                                                      |
| `.env.example:2` `DB_PATH=./xuanxue.db`                                     | `db.ts:30` 默认 `xuanxue-r2.db`，且旧库被声明**禁读**                                                 | 照抄会把新表建在旧库上混入历史 PII                                                                                                     |

`docs/product/README.md:234` 自己的规矩："状态变化必须同时更新本文矩阵和阶段路线图" ——
**当前已违反**。

---

## 六、P2 — 战略与架构

### 6.1 过程远超产品，治理文档开始自我繁殖

- 11,742 行文档 / 56,332 行源码 ≈ **21%**；
- `docs/audits` 24 份、`docs/product` 22 份、`docs/design` 11 份、`docs/validation` 6 份；
- `.claude/plans` 57 份 + `.claude/results` 66 份 = **123 份过程产物**；
- **产出 0 个公众可用工具**。

更值得注意的信号：`P2`–`P7` 六条路线被整体 `Superseded` 后换成 R1–R6
（`stage-roadmap.md:197-248`），而 R1–R4 才刚 Accepted。
**路线图本身被重写过一次，这本身就是过程成本的证据。**

### 6.2 0–100 评分遍布 8 处，与自身硬约束正面冲突

`.Codex/project-config.md` 第 3 条明写：

> 禁止向用户呈现 **0–100 分**、工程内部评分、随机内容伪装成个体结论

`README.md:22` 亦称"未核验内容不得用免责声明、娱乐标签或**工程评分**包装成可信结论"。

但实际实现：

| 位置                              | 基准与权重                                                               | 来源声明                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `useLiuNian.ts:267-307`           | 50 +30/−20 + 地支关系 ±10/15/12/8/6（日柱×1.5）+ **每神煞 ±5（无上限）** | 无来源                                                                                   |
| `constants/hehun.ts:43-58, 21-29` | 年柱15/日柱25/五行20/纳音10/十神15/神煞10/生肖5                          | 文件头**自认**「开发者合成（非经典原文）」；参考"百度百科八字合婚条目、民间合婚技法汇总" |
| `constants/name-test.ts:239-262`  | 吉20/半吉10，人格双倍，三才 20/8                                         | 无来源                                                                                   |
| `useZeJi.ts:100-155`              | 50 + 值星±20/−15 + 天神±15/−10 + 宜忌 +15/−5                             | 自认「无经典原文的量化标准」                                                             |
| `useYijing.ts:354-422`            | 静卦45/独动65/…/六爻皆动35 + 阴阳平衡×5 + 六亲± + 卦名关键词 ±10/−8      | 无来源                                                                                   |
| `useMonthlyFortune.ts:199-242`    | 55 + 六合18/三合12/冲−18/刑−14/害−12/破−8                                | 无来源                                                                                   |
| `useShengXiao.ts:142-151`         | 值太岁−20/冲−15/刑−12/害−10/破−8/三合+15/六合+10                         | 注释仅 "informed by traditional theory"                                                  |
| `useConstellation.ts:496-524`     | 有真实黄经输入，但系数 2.0/0.8/1.2/0.6 无来源                            | 无来源                                                                                   |

**公平地说**：`constants/hehun.ts` 与 `constants/zeji.ts` 在文件头**主动承认**无经典依据 ——
这是诚实，但不是合规。且代码是活的（`zeji` 的 `computePolicy` 为 `enabled`），
围栏一放开即违反自身产品硬约束。

**附带缺陷**：合婚等级阈值文档与实现不一致（`constants/hehun.ts:24` 写"≥85 上吉/≥65 吉/≥45 平"，
实现 `getHeHunGrade` 是 ≥70/≥45）；神煞维度**以满分 10 起扣**（`useHeHun.ts:639`）
且"平和"项也加分（`:218` +1、`:344` +2）→ 所有配对白送 ≥13 分，总分基线偏高、区分度低。

### 6.3 重复实现严重

- **地支关系表 4 份且语义不等价**：`useShenSha.ts:38-77`、`useShengXiao.ts:42-109`、
  `useLiuNian.ts:72-106`、`constants/hehun.ts:113-210`（破/刑优先级不同）；
- **五行生克映射 6 份**：`useBaZi.ts:108,110,398,400`、`useMonthlyFortune.ts:23-38`、
  `constants/hehun.ts:305-319`、`constants/meihua.ts:536-544`、`useDailyWuxing.ts:26-29`、
  以及 `tests/composables/useBaZi.test.ts:434-435`；
- **两套完整八字栈并存**：新 `utils/bazi/*`（正确）与旧
  `useBaZi.ts`(753) + `useShenSha.ts`(824) + `useLiuNian.ts` 组合；
- **同名异义函数**：`getNayinWuxing(stem, branch)`（`constants/bazi.ts:268`，查表）
  与 `getNayinWuxing(nayinName)`（`constants/hehun.ts:364`，末字启发式）跨模块同名，**误引即静默错**；
- **神煞规则双份**：`useShenSha.ts` 与 `useLiuNian.ts:331-519`；
- **月干逻辑复制**：`useMonthlyFortune.ts:64-99` 注释自认 "duplicates logic from useLiuNian.ts"；
- **干支顺序被字面量重写**：`useHeHun.ts:641-642` `'子丑寅卯…'.indexOf(...)` 绕过 `BRANCHES`；
- `constants/bazi.ts:16` 自称"项目唯一数据源"，但实际只有 STEMS/BRANCHES/WUXING_COLORS
  被 `bazi-rules.ts:132-135` 复用；**藏干表 `HIDDEN_STEMS` 只在 `useBaZi.ts:70`**。

### 6.4 巨型文件与函数

| 行数  | 文件                                             |
| ----- | ------------------------------------------------ |
| 9,583 | `constants/stroke-dict.ts`（纯数据，可接受）     |
| 1,047 | `components/tools/ziwei/ZiWeiCelestialChart.vue` |
| 934   | `pages/tools/meihua.vue`                         |
| 922   | `pages/self-profile.vue`                         |
| 856   | `pages/index.vue`                                |
| 847   | `components/tools/constellation/NatalChart.vue`  |
| 824   | `composables/useShenSha.ts`                      |
| 809   | `composables/useHeHun.ts`                        |
| 753   | `composables/useBaZi.ts`                         |
| 749   | `pages/tools/guming.vue`                         |

**超长函数**：`composables/useSelfProfile.ts:94` 的 `useSelfProfile()` **约 522 行**（文件止于 615 行）；
`composables/useShenSha.ts:380` 的 `calculateShenSha()` **约 445 行**，
且同文件 28-365 行塞了 30 余张传统规则表（与"常量层唯一数据源"精神相悖）。

全仓 >600 行源文件 **19 个**；`.vue` 从 2026-09-13 的 91 个增至 **110 个**。

### 6.5 死代码及其测试错配

- `/api/divinations` 三个端点 + `components/tools/HistoryModal.vue` 已成**不可达死代码**
  （`pages/**` 对 `/api/divinations` 引用 **0 命中**，且 `history-containment.test.ts:27-60`
  正断言 11 个工具页不得再引用它们），
  但仍有 `tests/server/api/divinations.test.ts`（292 行）等测试在跑 → **测的是死代码**，
  也是覆盖率数字虚高的原因之一。
- `components/tools/bazi/*` 6 个旧组件（含 0–100 评分 UI）无任何页面引用，
  仅测试仍在断言它们。

### 6.6 时区与日期口径不一致（有用户可见后果）

最具体的一例：**公开首页的"今日命签"对国内用户在 00:00–08:00 显示昨天的签**。

`constants/fortune-sticks.ts:381`：

```ts
const d = dateStr ?? new Date().toISOString().slice(0, 10)
```

`toISOString()` 是 **UTC 日期**。北京时间 UTC+8，本地 00:00–08:00 时 UTC 仍是前一天。
`components/home/DailyFortuneStick.vue:63` 导入 `getDailyFortune` 且未传日期。

同类口径不一致（均无测试兜底）：

- `utils/date.ts:54` 用本地 `getFullYear/getMonth/getDate`；
- `server/database/db.ts:170` 用 SQLite `datetime('now','-90 days')`（格式 `YYYY-MM-DD HH:MM:SS`）
  去比 `new Date().toISOString()` 写入的 `...T...Z` 字符串 → **字典序比较口径不一致**。

README 其实**已经记录**了命签缺陷（"函数默认按 UTC 日期字符串稳定映射同一签"）——
但**记录了，没修**。这正是本项目最典型的病症。

### 6.7 其他中等问题（择要）

- **真太阳时是死代码且名不副实**：`utils/time.ts:16-27` 只做经度差修正，**未加均时差**（±16 min）；
  全仓 `longitude` 只命中星座组件，八字页与紫微页都**不传**经纬度
  → `useBaZi.ts:679-682`、`useZiwei.ts:38-44` 均为死分支，
  但 `CLAUDE.md` 仍宣称 ZiWeiInputForm 收集 longitude/latitude。
  另有 `getTrueSolarHourIndex`（`:41-48`）返回 0–11 **永远取不到 12**，
  一旦传经度会把晚子时（23:30）算成早子时且不跨日回退。
- **紫微 `fixLeap=true` 硬编码**：`useZiwei.ts:48` 第 4 参为 iztro 的"闰月拆半"流派，
  无来源、无用户选择、界面无提示；`:49-51` 用 `catch { return null }` 吞掉一切异常，
  无法区分输入非法与库故障。
- **择吉与八字的"年干支"口径冲突且无提示**：`useZeJi.ts:67-69` 用 `getYearInGanZhi()`
  （民用干支年，正月初一交替），八字用**立春**；来源台账明确要求二者"不得互相替代"。
- **姓名五格外格算错**：`useNameTest.ts:129-130` 统一 `外格 = 总格 − 人格 + 1`，
  单姓单名应恒为 2 实得 1；复姓双名应为姓首+名末，实得 +1。
- **合婚 `dominantA` 归约比较错人**：`useHeHun.ts:441-443`
  `elementCountsA[a] >= elementCountsB[b]`（A 的值与 **B** 的值比），`dominantB` 却正确。
- **称骨年柱按农历年取表**：`useGuMing.ts:114` `((birthYear-4)%60)`，
  春节至立春间出生者取到上一年表行。
- **易经六神依赖客户端时钟**：`useYijing.ts:84-93` `if (!import.meta.client) return 0`
  - `new Date(2000,0,1)` 本地时区差商 → **SSR 与 CSR 六神不同**。
- **本命星盘伪精度**：`useNatalChart.ts:185` 行星黄经固定取 UTC 12:00（忽略出生时刻）；
  `:200` 上升黄经取星座中点（非真实上升度）；`:79-88` 逆行判定**未做 0/360 环绕归一**
  → 春分点附近把顺行误判为逆行；`computeAspects`（`:133`）用 `orb/2` 把容许度砍半。
- **神煞层面**：`calculateShenSha` 声明了 `gender` 但**从未解构使用**
  → 所有分阴阳男女的神煞必然错；元辰/大耗被实现成年支六冲（=岁破）；
  词馆硬编码等于禄神；天乙/太极/文昌同时输出日干版 + 年干版导致同名神煞成对重复
  并进入 `useLiuNian.ts:301-304` 的 ±5 累加；天赦用月支表却标 `source:'日支'`；
  31 个神煞**无任何来源标注**。
- **旧引擎静默降级**：`useBaZi.ts:639-654` 农历转换失败时 `console.warn` 后**继续按公历计算**，
  且 `tests/composables/useBaZi.test.ts:224-233` 把该行为写成期望
  → 用户输入农历 13 月会得到一份看似正常的错误命盘。这与新引擎"异常一律返回 engine_error，
  **不回退**"（`utils/bazi/engine.ts:11`）直接矛盾。
- **命名漂移**：`tool-catalog.ts:118` 把 `yijing` 的 name 写成 `'六爻'`，
  而产品文档已把六爻排盘独立封存、yijing 定位为"周易卦象阅读"。

---

## 七、修复计划

### 7.1 立刻（每条 ≤1 小时，收益最大）

| #   | 动作                                                                                                           | 位置                                                       |
| --- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | **CI 触发器放开分支**（`['**']` 或至少 `codex/**`、`feat/**`、`fix/**`）—— 单此一条即"零 CI → 有 CI"           | `.github/workflows/ci.yml:3-8`                             |
| 2   | **CI 补 `npm run build` job**                                                                                  | 同上                                                       |
| 3   | **CSP 改用 `getResponseHeader(event, …)` 并写回** + 补响应头断言测试                                           | `server/plugins/csp.ts:13-20`                              |
| 4   | **auth 三端点改 `readBoundedJsonBody`，限流前移**（照抄 `self-profile-request.ts:42-48`）                      | `register.post.ts` / `login.post.ts` / `account.delete.ts` |
| 5   | **代理强制覆盖 XFF** + 按账号退避/锁定                                                                         | `server/utils/rateLimit.ts:80-94`                          |
| 6   | **`saveFile()` 改临时文件 + fsync + rename**，强制单实例，DB 移出 web root                                     | `server/database/db.ts:51-56`                              |
| 7   | **`pre-push` 补 `nuxi typecheck`**                                                                             | `.githooks/pre-push:5`                                     |
| 8   | **`coverage.enabled: true`** + include 纳入 server/api、services、database、components、pages，先设实测基线    | `vitest.config.ts:20,23,30`                                |
| 9   | **`getDailyFortune` 改用本地日期**（`getFullYear/getMonth/getDate`）                                           | `constants/fortune-sticks.ts:381`                          |
| 10  | **`.env.example` 的 `DB_PATH` 改 `./xuanxue-r2.db`** 并注明旧库禁读                                            | `.env.example:2`                                           |
| 11  | 删死依赖 `potrace`；`npm install --package-lock-only` 消除 lock spec 漂移；`engines` 收紧 `>=22` + 加 `.nvmrc` | `package.json`                                             |
| 12  | **删或修** `sqljs-production-runtime.test.ts:30-32` 的条件断言                                                 | 该文件                                                     |

### 7.2 本周

13. **修日柱锚点**：`useBaZi.ts:245-273` 改用 `BAZI_DAY_PILLAR_ANCHOR` 或 `dayGanZhi()`，
    同轮把 `useHeHun` 切到 `utils/bazi`，并重写被固化的 inline snapshot。
14. **文档对账**：把 `CLAUDE.md` / `README.md` / `docs/product/README.md` 矩阵 /
    `stage-roadmap.md` 的 R4、R5、bazi 状态统一到代码事实；删掉 HistoryModal、
    EntertainmentDisclaimer 的过时描述；`.env.example` 同步。
15. **神煞测试改独立来源期望**：删掉 `useShenSha-exhaustive.test.ts:19-26` 对实现表的 import，
    照 `tests/constants/bazi-rules.test.ts:56-77` 的写法用古籍条文作期望。
16. `calculateShenSha` 补 `gender` 维度；修词馆=禄神、天乙/太极/文昌双份重复输出。
17. **补关键链路真集成测试**：
    ① 真实内存 sql.js 跑完整 `account.delete`（真实 FK 级联）；
    ② 真实 h3 event 跑"限流 → 401/403/429"串联；
    ③ 补"`assertSameOriginMutation` 真的被调用了"的断言。
18. **统一 DB 测试隔离**：`divinations.test.ts` / `utils/auth.test.ts` 改用内存库或独立 `DB_PATH`。

### 7.3 本月

19. **拆巨型函数/文件**：`useSelfProfile.ts:94`（522 行）、`calculateShenSha`（445 行）、
    `ZiWeiCelestialChart.vue`（1047 行）、`meihua.vue`（934 行）、`self-profile.vue`（922 行）。
20. **统一数据源**：地支关系 4 份、五行生克 6 份收敛到 `constants/`；
    消除同名异义的 `getNayinWuxing`；让 `constants/bazi.ts` 名副其实。
21. **处置旧八字栈**：`components/tools/bazi/*` 6 个组件 + `useBaZi/useShenSha/useLiuNian`
    或删除、或明确标注 `frozen` 并移出合婚调用路径。
22. **开启 type-aware lint**：`eslint.config.mjs:72` 换 `recommendedTypeChecked`
    - `parserOptions.projectService`，至少覆盖 `server/**`、`composables/**`，
      把 `no-floating-promises` 设为 error。
23. **11 个 grep 测试逐步转行为测试**；`import.meta.client` 硬编码改为可切换并补 SSR 分支测试。
24. **覆盖率阈值分阶段收紧**：先按实测值设基线（防倒退），再逐季 +5。

### 7.4 战略（最重要）

25. **冻结治理扩张，把"让一个工具真正对公众开放"当作唯一目标。**

当前 615 提交 / 0 公开工具。R6 公开门禁是唯一能把前面所有工作转化为用户价值的一步。
建议在 R6 完成前**不再新增审计文档、不再新开阶段、不再重写路线图**。

26. **把"已记录的已知缺陷"建成待修清单并按周清空。**

本项目最大的风险不是不知道问题，而是**知道了、写下来了、然后放着**
（命签 UTC bug、`.env.example` 错库、CSP 失效、日柱锚点均已记录在案）。
建议：`docs/` 中每一处"待整改/待治理"表述都收敛为一个带编号的 GAP 条目，
配一个负责人和一个截止周，而不是继续散落在 README 与审计报告中。

---

## 八、评分

| 维度               | 分      | 说明                                                       |
| ------------------ | ------- | ---------------------------------------------------------- |
| 类型与安全编码纪律 | **8.5** | strict + 零 `as any` + 零注入 + 无 IDOR，全仓最好的一环    |
| 测试工程质量       | **8**   | 黄金样例 SHA256 防漂移是真本事；但存在自证测试             |
| 文档诚实度         | **8.5** | 如实记录失败与返修，从不粉饰                               |
| 算法正确性         | **6**   | 新引擎可信（骨架对），旧引擎日柱系统性错误；评分全部无依据 |
| 自动化强制力（CI） | **3**   | 当前分支 0 次 CI，coverage 死配置，CI 无 build             |
| 测试覆盖广度       | **4**   | 全仓约 25–35%；45.8% 的代码（components/pages）覆盖 ≈10%   |
| 文档/配置新鲜度    | **5**   | 多处自相矛盾，`.env.example` 有实际危害                    |
| 交付/可用性        | **3**   | 615 提交，公众可用工具 0 个                                |

**综合 6.5 / 10**

分对象可信度：

| 对象                             | 分     | 理由                                                                                                                    |
| -------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| 八字工具（新引擎，日期级三柱）   | 7/10   | 国标锚点、分钟级节气、边界候选建模正确、证据台账齐全；扣分：只有三柱、分钟级只外部核验 2026 一年、全部来源 `unreviewed` |
| 紫微斗数（iztro）                | 7/10   | 传参与时辰映射正确；扣分：闰月流派硬编码、异常统一吞成 null                                                             |
| 生肖（R3 已整改）                | 7/10   | 页面已剥离运势/婚配/评分，与契约一致                                                                                    |
| 易经 / 梅花 / 择吉 / 称骨 / 姓名 | 4–6/10 | 硬规则（八卦、纳甲、六亲、世应、纳音、三才五格骨架）正确可核对；评分与解读文案全部自造                                  |
| 合婚（在产但被围栏）             | 3/10   | 上游吃日支系统性错误；权重自认合成；基线偏高区分度低                                                                    |
| 旧八字 UI 栈                     | 3/10   | 日柱错、节气偏早且 0.83% 整日错、神煞误取、评分无依据、静默回退                                                         |

---

## 九、结语

**骨架可信、解读不可信；人的自觉 8 分、机器强制 3 分；文档世界一流、交付严重滞后。**

工程素养在**类型纪律、安全底座、证据台账**三件事上已明显超过绝大多数同类项目。
缺的不是能力，是**把已经写下来的东西真正修掉、并让机器替你把关**。

修好 §7.1 那 12 条，工程化评分可从 6.5 提到 8.5；
而只有走完 R6 让一个工具真正开放，这个项目才算从"优秀的治理实验"变成"有人用的产品"。

---

## 十、修复实施记录（批次 1：安全与门禁）

> 执行时间：2026-09-15
>
> 授权：用户明确批准「第一批 11 项」范围，并授权运行 `typecheck` + `test` 验证
>
> Git：**未提交、未推送**，按仓库规则交用户审计后再决定

### 10.1 完成项

| #   | 项目                 | 改动                                                                                                                            | 关键文件                                                                                                                                   |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | CSP nonce 生效       | 改为优先 `getResponseHeader(event, 'content-security-policy')` 并写回；两处取值兼容                                             | `server/plugins/csp.ts`                                                                                                                    |
| 2   | 认证端点体积上限     | 新增共享 `readBoundedJsonBody(event, maxBytes)`，按真实 UTF-8 字节兜底；限流前移到读体之前                                      | `server/utils/bounded-json-body.ts`（新增）、`server/api/auth/{register.post,login.post,account.delete}.ts`、`constants/account-policy.ts` |
| 3   | X-Forwarded-For 伪造 | 改为**从右向左**跳过可信代理取第一个不可信地址；可信集按 env 缓存；剥离 IPv4 端口/IPv6 方括号                                   | `server/utils/rateLimit.ts`                                                                                                                |
| 4   | CI 触发器            | `push.branches` 由 `[main]` 改为 `['**']`，`pull_request` 放开                                                                  | `.github/workflows/ci.yml`                                                                                                                 |
| 5   | CI 补 build          | 新增 `build` job 执行 `npm run build`                                                                                           | 同上                                                                                                                                       |
| 6   | 覆盖率真实生效       | 新增 `test:coverage` 脚本；CI 改跑覆盖率版本；include 补入 `server/api`、`server/services`、`server/database`；阈值改为实测基线 | `vitest.config.ts`、`package.json`、`.github/workflows/ci.yml`                                                                             |
| 7   | 本地门禁             | pre-push 在测试之前增加 `nuxi typecheck`                                                                                        | `.githooks/pre-push`                                                                                                                       |
| 8   | 今日命签 UTC bug     | 改用本地日期构造 YYYY-MM-DD                                                                                                     | `constants/fortune-sticks.ts`                                                                                                              |
| 9   | `.env.example`       | `DB_PATH` 改为 `./xuanxue-r2.db` 并注明旧库禁读；补充可信代理配置说明                                                           | `.env.example`                                                                                                                             |
| 10  | 依赖与版本           | 删除死依赖 `potrace`；`engines.node` 收紧为 `>=22`；新增 `.nvmrc`；lock 的 `lunar-javascript` spec 对齐为 `1.7.7`               | `package.json`、`.nvmrc`、`package-lock.json`                                                                                              |
| 11  | 静默跳过的断言       | 条件断言改为 `it.skipIf`，跳过在报告中显式可见                                                                                  | `tests/server/database/sqljs-production-runtime.test.ts`                                                                                   |

### 10.2 附带改动

- `server/utils/self-profile-request.ts` 的 `readBoundedJsonBody` 重命名为
  `readSelfProfileJsonBody` 并委托给共享实现。原因：与新增通用实现同名会导致
  Nuxt 自动导入冲突（实测出现 `Duplicated imports` 警告）。
  4 个 self-profile 端点同步更新，行为不变。
- **新增 devDependency `@vitest/coverage-v8@3.2.4`**（与 vitest 3.2.4 严格对齐）。
  这是必要的：仓库此前**根本没装覆盖率 provider**，`coverage.provider: 'v8'` 是空引用——
  即使有人把 `enabled` 改成 `true`，也会直接崩在 `MISSING DEPENDENCY` 上。
  这从运行时层面证实了"覆盖率从未真正跑过"。

### 10.3 新增回归测试（+3 文件 / +23 用例）

| 文件                                     | 覆盖内容                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `tests/server/plugins/csp.test.ts`       | routeRules 场景下 nonce 真正写回；**头部 nonce 与 body 注入 nonce 一致**；已带 nonce 不重复注入；取不到 CSP 时不伪造 |
| `tests/server/utils/rateLimit.test.ts`   | 客户端伪造 XFF 前缀不影响结果（核心回归）；跳过可信跳；全可信时回退 socket；IPv4 端口与 IPv4-mapped IPv6             |
| `tests/constants/fortune-sticks.test.ts` | 未传日期按本地日期取签；时区相关断言带守卫                                                                           |
| `tests/server/api/auth.test.ts`（扩展）  | chunked 缺失 Content-Length 仍 413；声明超限读体前拒绝；非法 JSON 400；限流先于读体（并断言未读体）；注销接口受限流  |

### 10.4 验证结果（实测）

| 检查                               | 结果                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                | **0 错误**                                                                                                              |
| `npm run test`                     | **83 文件 / 2615 用例全部通过**（基线 80 / 2592）                                                                       |
| `npm run test:coverage`            | **通过**，阈值 85/80/91/85 对实测 86.91/82.44/93.31/86.91                                                               |
| `npx prettier --check`（改动文件） | 通过                                                                                                                    |
| 中文乱码检测                       | 改动文件 **0 命中**（仓库既有 8 处命中位于 `constants/stroke-dict.ts`、`constants/tai-sui.ts`，为检测特征字的合法误报） |

**覆盖率实测基线（2026-09-15，含 server/api、server/services、server/database）**：

| 指标            | 实测   | 设定阈值 |
| --------------- | ------ | -------- |
| 语句 Statements | 86.91% | 85       |
| 分支 Branches   | 82.44% | 80       |
| 函数 Functions  | 93.31% | 91       |
| 行 Lines        | 86.91% | 85       |

`components/**` 与 `pages/**` **暂未纳入** include：其覆盖率约 10%，
纳入会把全局阈值拉到无意义。应在补齐组件/页面测试后再纳入并重设阈值。

### 10.5 本批未覆盖（后续批次）

| 批次               | 内容                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 批次 2（正确性）   | 旧引擎日柱锚点修正、`useHeHun` 切换到 `utils/bazi`、重写被固化的 inline snapshot、`calculateShenSha` 补 `gender` 维度、修词馆=禄神与天乙/太极/文昌双份重复 |
| 批次 3（数据安全） | `db.ts` `saveFile()` 改临时文件 + fsync + rename、强制单实例、DB 移出 web root                                                                             |
| 批次 4（文档对账） | `CLAUDE.md` / `README.md` / 产品索引矩阵 / 路线图的 R4、R5、bazi 状态同步到代码事实；删除 HistoryModal、EntertainmentDisclaimer 的过时描述                 |
| 批次 5（可维护性） | 拆巨型函数、统一地支关系与五行映射数据源、处置旧八字栈死代码、开启 type-aware lint、grep 测试转行为测试                                                    |

**运行时未验证项**（沿用 §2.3）：CSP 修复后的真实响应头形态需 `curl -sI` 实测；
`PRAGMA foreign_keys` 在 sql.js 的实际效果需一次黑盒验收；
反向代理是否使用 `$proxy_add_x_forwarded_for` 需实机确认——本次改动已使
XFF 伪造在代码层面不再可得逞，但代理侧强制覆盖仍是更稳妥的纵深防御。

---

## 十一、修复实施记录（批次 3：数据安全）

> 执行时间：2026-09-15
>
> 授权：用户批准「按推荐顺序执行批次 3」
>
> Git：**未提交、未推送**

### 11.1 完成项

| #   | 项目                    | 改动                                                                                                                                                              |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **原子落盘**            | `saveFile()` 改为「同目录临时文件 → `fsync` → `rename` 原子替换」；覆盖前保留 `.bak` 回退副本；对目录项 `fsync` 确保 rename 本身持久化；rename 失败时清理临时文件 |
| 2   | **单实例保护**          | 新增 `server/utils/instance-lock.ts`；`initDb()` 启动时获取锁，已被**存活**的其他进程持有时拒绝启动；崩溃残留（持有进程已消失）可自动接管                         |
| 3   | **库文件不在 web root** | 新增 `assertDbPathOutsideWebRoot()`：`DB_PATH` 落在 `public/` 之下时拒绝启动                                                                                      |
| 4   | **Node 版本单一权威**   | `.nvmrc` 由 `22` 改为 `24`（本机唯一已安装版本），CI 各 job 改用 `node-version-file: '.nvmrc'` 读取，本地与 CI 从此不可能漂移                                     |

### 11.2 关键设计取舍（需用户知悉）

**单实例锁在测试中显式跳过。**
`tests/server/divinations.test.ts` 与 `tests/server/utils/auth.test.ts` **都调用真实
`initDb()`，且共用 globalSetup 注入的同一个临时库路径**；Vitest 3 默认
`fileParallelism: true`，两个文件会落在不同 worker 进程 → 硬性单实例锁会直接打挂测试。
因此由 `tests/helpers/vitest-global-setup.ts` 设置 `XUANXUE_DISABLE_DB_LOCK=1`。

锁本身的正确性由**独立单元测试**覆盖（9 条），包括：陈旧锁接管、损坏锁接管、
存活进程持有时拒绝、拒绝时携带 `lockPath`/`holderPid`、**释放时不误删已被他人接管的锁**、
递归创建目录、`isProcessAlive` 边界。

**不改变 `DB_PATH` 默认值。**
把默认路径从项目根挪到 `data/` 会让既有用户的库文件"看起来消失"（应用会新建空库），
风险远高于收益。因此改为**拒绝错误配置**（落在 `public/` 内即启动失败），而不是移动数据。

**`.nvmrc` 用 24 而不是 CI 原来的 22。**
本机只安装了 Node 24，写 22 会让 `nvm use` 直接失败；而本机的
typecheck / test / build 在 24 上均已通过，说明 24 是被验证可用的版本。
故以 `.nvmrc` 为单一权威，CI 读取它而不是硬编码 —— 消除"两处各自声明"的结构性漂移。

### 11.3 新增测试（+2 文件 / +12 用例）

| 文件                                        | 覆盖内容                                                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `tests/server/utils/instance-lock.test.ts`  | 9 条：创建/释放幂等、损坏锁接管、崩溃残留接管、存活进程拒绝、错误信息可定位、不误删他人锁、递归建目录、`isProcessAlive` 边界 |
| `tests/server/database/persistence.test.ts` | 3 条：初始化后库文件非空、**落盘后目录内无 `.tmp` 残留**、覆盖前生成 `.bak`                                                  |

### 11.4 验证结果（实测）

| 检查                                             | 结果                                                      |
| ------------------------------------------------ | --------------------------------------------------------- |
| `npm run typecheck`                              | **0 错误**                                                |
| `npm run test`                                   | **85 文件 / 2627 用例全部通过**（批次 1 后为 83 / 2615）  |
| `npm run test:coverage`                          | **通过**，阈值 85/80/91/85 对实测 86.96/82.41/93.43/86.96 |
| `npx prettier --check .`（全仓，即 CI 实际命令） | 通过                                                      |
| 中文乱码检测                                     | 改动文件 **0 命中**                                       |

### 11.5 本批**未**解决（重要）

1. **5 秒写节流窗口仍在**：`MIN_SAVE_INTERVAL = 5000` 未改动，硬崩溃 / SIGKILL / OOM
   仍会丢失最近 ≤5 秒**已返回成功**的写入。消除它需要改为写入即落盘或增量落盘，
   属架构改动，不在本批范围。
2. **`saveFile()` 失败仍只 `console.error`**，没有告警出口。
   本批为其补上了原子性与回退副本，但**失败可见性未改善**。
3. `README.md` / `CLAUDE.md` 中"旧库 `xuanxue.db` 仅作离线只读备份"的表述
   与新的 `assertDbPathOutsideWebRoot` 不冲突，但文档尚未提及该守卫，留待批次 4 对账。
4. 真太阳时死代码、旧八字栈处置、文档对账、巨型函数拆分仍在批次 2 / 4 / 5。
