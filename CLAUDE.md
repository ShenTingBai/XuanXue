# CLAUDE.md

此文件为 Claude Code 在本仓库中工作提供指引。

## 当前权威与角色分工

本文件主要记录项目结构和既有代码行为。发生冲突时，依次服从：

1. 根目录 `AGENTS.md`；
2. `.Codex/project-config.md`；
3. `docs/product/README.md` 及其正式产品规范；
4. `docs/engineering/agent-protocol.md`；
5. 本文件中的既有实现说明。

当前协作分工：

- 用户批准产品边界、实施阶段、最终验收和 Git 操作；
- Codex 负责产品与架构判断、计划生成、result/diff 独立审查和验收组织；
- Claude 只执行已经由用户授权且通过门禁的 v2.2 计划，默认不提交；
- 文档纠正等经用户明确授权的限定任务可以由 Codex 直接完成，不存在“Codex 永远不能改文件”的规则；
- 尚未形成契约的功能继续讨论，不从当前代码臆造目标规则。

完整协作协议见 `docs/engineering/agent-protocol.md`，当前产品状态见 `docs/product/README.md`。

## 常用命令

```bash
npm run dev            # 启动开发服务器（默认端口 3000）
npm run build          # 生产构建
npm run preview        # 预览生产构建
npm run typecheck      # TypeScript 类型检查
npm run test           # 运行全部测试
npx vitest run tests/composables/useBaZi.test.ts  # 运行单个测试文件
npx vitest             # watch 模式（无参数即 watch，非 run）
```

## 项目结构

```text
├── app.vue                       # 根组件：<NuxtLayout> + <NuxtPage>
├── nuxt.config.ts                # 模块、CSP/HSTS 头、字体预加载
├── tailwind.config.ts            # 设计令牌：墨/纸/朱砂色板
├── vitest.config.ts              # Vitest 测试配置
├── assets/css/main.css           # 全局 CSS（组件类、keyframes、纸纹）
├── docs/                         # 项目文档 + 设计系统规范
├── public/fonts/                 # 自托管 woff2 字体
├── constants/                    # 干支、卦象、星曜、笔画字典等领域数据
│   ├── bazi.ts                   # STEMS、BRANCHES、WUXING_COLORS（主数据源；藏干表仍在 useBaZi.ts，尚未收敛）
│   ├── yijing.ts / yijing-data.ts / yijing-hexagrams.ts  # 易经六十四卦
│   ├── shengxiao.ts              # 生肖性格、婚配数据（旧内容，页面已不再引用）
│   ├── constellation.ts          # 星座特征、守护星数据
│   ├── ziwei.ts                  # 紫微斗数星曜、宫位数据
│   ├── fortune-sticks.ts         # 每日灵签数据（按本地日期取签）
│   ├── guardian-buddha.ts        # 本命佛数据
│   ├── stem-animal.ts            # 干支生肖映射
│   ├── tai-sui.ts                # 太岁方位数据
│   ├── hehun.ts                  # 合婚规则数据（权重自认为开发者合成，无经典依据）
│   ├── name-test.ts              # 姓名测试三才五格数据
│   ├── cezi.ts                   # 测字五行分类
│   ├── stroke-dict.ts            # 汉字笔画字典
│   ├── zeji.ts                   # 择吉规则数据
│   ├── gu-ming.ts / meihua.ts     # 称骨、梅花旧规则数据
│   ├── tool-catalog.ts           # 工具四维状态目录（审核/暴露/计算/历史）
│   └── planet-data.ts            # 行星符号/守护关系
├── types/
│   └── lunar-javascript.d.ts     # lunar-javascript 库类型声明
├── utils/
│   ├── date.ts                   # 日期解析工具（parseDate 等）
│   └── time.ts                   # 时辰计算工具
├── composables/                  # 计算引擎 + 共享状态（共 26 个）
│   ├── useAuth.ts                # 认证状态（基于 useState）
│   ├── useSolarTerms.ts          # 节气日期、月柱、五虎遁
│   ├── useBaZi.ts                # 【旧引擎】四柱、十神、大运（日柱锚点已知错误，仍被 useHeHun 调用）
│   ├── useShenSha.ts             # 【旧引擎】神煞查找表，按维度组织
│   ├── useLiuNian.ts             # 【旧引擎】流年：11 年跨度、工程评分、模板文本
│   ├── useShengXiao.ts           # 生肖分类与干支；旧性格/婚配/运势函数仍在，但页面已不再引用
│   ├── useConstellation.ts       # 星座星盘、星座解读
│   ├── useGreeting.ts            # 问候语（localStorage 持久化）
│   ├── useYijing.ts              # 易经起卦、变卦、爻辞
│   ├── useZiwei.ts               # 紫微斗数星盘（依赖 iztro 库）
│   ├── useHeHun.ts               # 八字合婚匹配（上游依赖旧 useBaZi 的日柱，围栏内）
│   ├── useCezi.ts                # 汉字测字解读
│   ├── useNameTest.ts            # 姓名三才五格测试
│   ├── useZeJi.ts                # 择吉日推荐
│   ├── useGuMing.ts / useMeiHua.ts # 称骨、梅花旧计算
│   ├── useMonthlyFortune.ts      # 月运势计算
│   ├── useNatalChart.ts          # 星座本命星盘（依赖 astronomy-engine）
│   ├── useExportImage.ts         # html-to-image 导出图片
│   ├── useBaziDraft.ts           # R5 八字页草稿（走 utils/bazi 新引擎）
│   ├── useBaziProfileImport.ts   # 八字页从本人档案带入
│   ├── useResultHistory.ts       # R5 结果历史读写
│   ├── useSelfProfile.ts         # R4 本人档案状态
│   ├── useSelfProfileDraft.ts    # 生肖页档案带入/撤销
│   ├── useDailyWuxing.ts         # 首页今日穿衣
│   └── useProfileAutoFill.ts     # 旧档案自动填充（随旧档案页封存）
├── components/
│   ├── home/                     # 首页专用组件（DailyFortuneStick）
│   ├── bazi/                     # R5 当前八字页组件（BaziInputForm、BaziPillarCard 等）
│   ├── profile/                  # R4 本人档案页组件
│   └── tools/
│       ├── bazi/                 # 【死代码】旧八字区块（BaziGrid、ElementAnalysis、DayMasterCard 等）
│       │                         #   已无任何页面引用，仅测试仍在断言；见"旧八字栈"段
│       ├── constellation/        # Nav、Hero、HoroscopePanel、YiJiPanel、NatalChart 等
│       ├── shengxiao/            # AnimalNav、Hero、Personality、WuXingGrid、CompatibilityGrid 等
│       ├── yijing/               # HexagramDisplay、YijingCastingPanel、YijingInterpretation 等
│       ├── ziwei/                # ZiWeiCelestialChart、ZiWeiPalaceGrid、ZiWeiDaXianTimeline 等
│       ├── hehun/                # HeHunScoreCard、HeHunDimensionCard
│       ├── zeji/                 # ZejiCalendar、ZejiRecommend
│       ├── ToolPageLayout.vue    # 三栏布局：#nav / #mobile-nav / #nav-right
│       ├── ToolToolbar.vue       # 顶部工具栏（历史 + 导出）
│       ├── HistoryModal.vue      # 【死代码】历史模态框，已无页面引用，见 Divinations API 段
│       ├── ExportButton.vue      # 导出图片按钮
│       ├── InkDivider.vue        # 墨韵分割线
│       ├── PageHero.vue          # 页面标题区
│       ├── FortuneBars.vue       # 运势柱状图
│       ├── ScoreRing.vue         # 评分环形图
│       ├── SkeletonCard.vue      # 骨架屏卡片
│       ├── SkeletonBars.vue      # 骨架屏柱状图
│       ├── ScrollTopButton.vue   # 回到顶部按钮
│       ├── AvatarCircle.vue      # 头像圈
│       └── auth/                 # AuthForm、AuthDialog（统一认证表单与页内弹层）
├── pages/                        # 首页、登录、账号、工具与状态页
│   ├── index.vue                 # 首页（独立布局，非 ToolPageLayout）
│   ├── login.vue                 # 登录/注册（复用 AuthForm）
│   ├── account.vue               # 账号设置：退出当前设备、退出所有设备、注销
│   ├── profile/[id].vue          # 旧档案页：R4 前重定向 /account，不读取旧数据
│   └── tools/                    # 工具页含 bazi、shengxiao、constellation、zeji、guming、
│                                 # yijing、ziwei、cezi、hehun、name-test、meihua；另有 status.vue
├── middleware/tool-availability.global.ts # 隐藏工具页面挂载前拦截
├── server/
│   ├── api/auth/                 # register.post、login.post、me.get、logout.delete、logout-all.delete、account.delete
│   ├── api/divinations/          # 保存与查询：index.post、index.get、[id].get
│   ├── api/profiles/             # R4 前统一返回 410，不访问数据库
│   ├── api/self-profile/         # R4 本人档案：index.get、summary.get、index.put、birth-date.delete、index.delete、usage.patch
│   ├── database/
│   │   ├── db.ts                 # sql.js 连接：R2+R4+R5 DDL、_migrations 版本 4/5、
│   │   │                         #   原子落盘（临时文件+fsync+rename）、单实例锁、public/ 路径守卫
│   │   ├── schema.ts             # R2 账号/会话/安全日志 DDL + 索引
│   │   ├── self-profile-schema.ts # R4 本人档案两表（self_profiles/consent_receipts）DDL + 索引
│   │   └── result-history-schema.ts # R5 结果快照表（result_snapshots）DDL + 索引
│   ├── services/
│   │   ├── self-profile.ts       # R4 领域服务：createSelfProfileService 依赖注入 + 默认实例
│   │   ├── result-history.ts     # R5 结果历史领域服务
│   │   └── tool-recompute.ts     # R5 服务端复算
│   ├── middleware/auth.ts        # 只从 xuanxue_token Cookie 恢复 → event.context.accountId
│   ├── plugins/
│   │   ├── database.ts           # Nitro 插件：数据库初始化
│   │   └── csp.ts                # CSP nonce 注入插件（从 event 读取 routeRules 策略并写回）
│   ├── types/h3.d.ts             # H3 event context 扩展（accountId、sessionId、sessionToken）
│   └── utils/                    # auth、rateLimit、bounded-json-body、instance-lock、
│                                 # request-origin、securityLog、account、self-profile-request 等
└── tests/                        # composables/、components/、pages/、server/、middleware/、
                                  # config/、constants/、utils/、helpers/、fixtures/
```

**类型优先就近放**——组件/组合式函数专用的类型在其自身模块中 `export`。**跨模块共享的类型**（如 `FetchError`，被 10+ 个页面引用）放在 `types/` 目录，避免循环依赖。`types/lunar-javascript.d.ts` 仅为第三方库类型声明。

## 开发原则

- **先想再写。** 明确陈述假设。不确定就问——不要默默猜测。
- **简单优先。** 解决问题的代码越少越好。不加臆测功能，不为单次使用的代码建抽象，不为不可能发生的状态做错误处理。
- **精准修改。** 只改任务要求的。不"顺手优化"相邻代码，不重构没坏的东西，不删除已有的死代码（除非明确要求）。
- **目标驱动。** 实现前先定义可验证的成功标准。修 bug 先写复现用例，加功能先定验收标准。

## 工作流规范

当前采用 Plan Protocol v2.2：

1. Codex 先调查代码和现行规范，能查证的事实不让用户猜；
2. 产品规则逐项讨论并由用户批准，尚未成文的范围保持 `Pending`；
3. 只有用户明确要求进入实施阶段时，Codex 才输出歧义与假设并生成单阶段 YAML；
4. Claude 按 `/plan-execute` 执行，通过路径门禁并记录 `plan_amendments`，默认不提交；
5. Codex 独立审查 result、diff、测试和浏览器证据；
6. 用户确认接受后，再单独决定提交、推送或后续阶段。

核心原则仍是先想再写、简单优先、精准修改和目标驱动。完整边界、返工收敛和文档同步规则见 `docs/engineering/agent-protocol.md`。

## 架构

### 状态管理

- 组合式函数使用 `useState()`（而非 `ref()`）管理共享状态。`useAuth` 使用 `useState<AuthStatus>('auth:status', ...)` 与 `useState<Account | null>('auth:account', ...)` 使 layout 和页面共享同一响应式实例；`currentProfile` 仅为已封存旧工具的只读恒 null 兼容出口。
- 同步组合式函数**禁止**声明为 `async`。仅在需要 `await` 时才使用 `async`。
- 纯计算型组合式函数（如 `useBaZi.ts`、`useSolarTerms.ts`）导出类型化函数，不导出 Vue 响应式；它们仍可能依赖项目常量和历法库，不能概括为零依赖。

### 持久化

- **Session**：客户端只使用服务端设置的 `xuanxue_token` HttpOnly Cookie，认证响应不再返回原始会话令牌，服务端不再接受 Bearer 凭证头。
- **Greeting**：`localStorage` 键 `xuanxue:greeting`，存储 `{ prefix, subtitle }`——自包含，不依赖 API。
- `restoreSession()` 是异步函数，在客户端通过 Cookie 请求 `/api/auth/me`；需要登录状态的页面必须正确处理恢复完成与失败，不把旧页面的重复调用方式作为新模板。
- R2 默认新库为 `xuanxue-r2.db`，Account 与未来 SelfProfile 分离；旧 `xuanxue.db` 仅作离线只读备份，不读取、不迁移、不删除。

### 认证流程

1. 客户端调用 `restoreSession()`，通过 Cookie 请求 `/api/auth/me`，成功后填充 `currentAccount` 并进入 `authenticated`；401 或网络错误进入 `guest`，恢复结束前不闪现游客入口。
2. 认证状态三态为 `restoring | guest | authenticated`。
3. 注册只创建 Account 与当前 Session，不隐式建档；请求提交昵称、密码、已满十四周岁确认与两个固定规则版本（2026-09-08）。
4. 登录新增独立 Session 不互踢；当前退出只删除当前会话，全部退出删除该账号全部会话；退出失败客户端保持登录状态并明确提示。
5. 注销要求当前昵称与密码复核，在单一事务中删除账号与可识别安全日志并使全部会话失效。

### Server API

- **Auth** (`server/api/auth/`): `register.post`、`login.post`、`me.get`、`logout.delete`、`logout-all.delete`、`account.delete`
- **Profiles** (`server/api/profiles/`): 全部旧档案接口在 R4 前统一返回 410，不访问数据库
- **SelfProfile** (`server/api/self-profile/`): R4 本人档案：`index.get`、`summary.get`、`index.put`、`birth-date.delete`、`index.delete`、`usage.patch`
- **Divinations** (`server/api/divinations/`): `index.post`（保存）、`index.get`（列表，按 type 过滤）、`[id].get`（详情，校验归属）
- **Middleware** (`server/middleware/auth.ts`): 只从 `xuanxue_token` HttpOnly Cookie 恢复会话，注入 `event.context.accountId`、`sessionId` 与仅供当前请求删除会话使用的 `sessionToken`；不再接受 Bearer。
- **Rate limiting** (`server/utils/rateLimit.ts`): 内存限流，按 key（IP/account）键控。客户端 IP 由 `getClientIp()` 从 `X-Forwarded-For` **从右向左**跳过可信代理取第一个不可信地址（不取最左值——那由客户端完全控制）；可信集由 `TRUSTED_PROXY_IPS` 声明。

### 本人档案（R4，Accepted）

R4 本人档案只实现完整出生日期字段组，状态为 **`Accepted`（2026-09-14 用户确认接受）**。
接受限定为「本人档案初版」：功能、数据流程与已批准要求成立；**不构成公开放行**——工具目录
仍为 `in_review / internal / blocked / disabled`，R6 公开门禁未开始。接受依据：四项门禁在
格式化稳定的提交树上通过（typecheck 0 错、测试 67 文件 / 2379 用例、lint 0 error、build 成功），
另有复验 35/35、出版版视觉 51/51、信息架构 32/32 三轮真机浏览器验收。详见
[产品规范索引](docs/product/README.md) 与 [阶段路线图](docs/project/stage-roadmap.md)。

- **领域类型**：`types/self-profile.ts` 定义严格联合 `RawBirthDate`（solar 的 `isLeapMonth` 必须 null；lunar 必须显式布尔）、`NormalizedBirthDate`、`SelfProfile`、`ExpectedProfile`、`SelfProfileSummary`、有限错误码与请求/草稿类型。
- **策略常量**：`constants/self-profile-policy.ts`（告知版本 `2026-09-09`、转换版本、最小日期/年龄/字节、用途/数据类别/动作）。
- **纯函数**：`utils/self-profile/birth-date.ts`（前后端共用，`normalizeBirthDate`/`isAtLeastFourteen`/`describeBirthDate`/`diffBirthDate`）；复用 `utils/shengxiao/date` 纯公历校验，不调用生肖分类或旧八字规则。
- **数据库**：`server/database/self-profile-schema.ts` 只新建 `self_profiles`（account_id UNIQUE、日期组全 null 或完整约束）与 `consent_receipts`（用途/类别/动作/版本/状态，不含出生值）；`db.ts` 幂等创建并在事务内写 `_migrations` 版本 4。默认仍为 `xuanxue-r2.db`；**严禁读取、打开、迁移、修改、删除任何数据库文件**。
- **服务**：`server/services/self-profile.ts` 的 `createSelfProfileService({get,run,transaction,now})` 依赖注入供内存 SQL 测试，`selfProfileService` 为生产实例。所有写入原子、按可信 accountId 限定、id+version CAS、相同值不重复写、注销靠 accounts 外键级联。
- **HTTP 边界**：`server/utils/self-profile-request.ts` 统一身份（`event.context.accountId`）、同源、真实 UTF-8 字节 4096 上限、白名单结构校验与固定错误映射；`no-store.ts` 已覆盖 `/api/self-profile`，SW 对该路径 NetworkOnly。
- **客户端**：`composables/useSelfProfile.ts`（私有 ref、accountId+请求序号防串号、401 清理、BroadcastChannel 只传 accountId/档案 id/version/action）、`composables/useSelfProfileDraft.ts`（生肖页带入/撤销）、`components/profile/*` 与 `pages/self-profile.vue`。
- **关键约束**：所有日期写操作需差异确认、同源、本人权限与版本 CAS；R4 已 Accepted，但其构建测试授权不延伸至 R5；不建立旧账户认领或历史兼容，不读旧 `divination_results`。

### Session 安全

- **令牌**：`randomBytes(24).toString('hex')` → HMAC-SHA256 哈希存储，**永不存明文**
- **凭证**：scrypt + 每次随机盐，验证使用 `timingSafeEqual` 防时序攻击，密码长度 8–64 且不 trim
- **多会话并存**：新登录不删除其他会话；当前退出只删当前会话，全部退出删该账号全部会话
- **7 天过期**：`expires_at` 列，查找时自动清理过期 session
- **`SESSION_SECRET`** 环境变量**必须**设置（`server/utils/auth.ts` 启动时读取，缺失则 throw 崩溃）
- **过期 session 清理**：`cleanupExpiredSessions()` 清理过期会话

### UI 设计：墨韵 · Ink Resonance

**完整设计规范见 [`docs/design/design-system.md`](docs/design/design-system.md)**——任何 UI 改动（新增组件、修改全局 CSS、调整色板/字体）前必须先查阅，并在同一提交中同步更新文档。全局 CSS 类无文档记录视为未完成，不得合并。

传统中式书房美学：

- **色板**：墨（7 阶）、纸（6 阶）、朱砂（#C62828 主色）、金、玉。
- **纸纹**：`body::after` SVG feTurbulence，`z-index: 40`，页面内容在 `.relative.z-10`。
- **组件**：`btn-seal`（印章按钮）、`input-ink`（下划线输入框）、`tool-card`（玻璃卡片）、`divider-ink`、`seal-mark`、`dropdown-panel`。
- 卡片使用 `backdrop-filter: blur(8px)` 覆盖在墨韵渐变背景上。
- 字体：Ma Shan Zheng（展示标题）+ Noto Sans SC（正文，字重 400/500），自托管 woff2 位于 `public/fonts/`，通过 `nuxt.config.ts` 中的 `<link rel="preload">` 预加载。

### 安全头

在 `nuxt.config.ts` → `routeRules` 中配置：

- CSP：`default-src 'self'`，`script-src 'unsafe-inline'`。`server/plugins/csp.ts` 在运行时将 `script-src` 的 `unsafe-inline` 替换为每请求随机 nonce（`randomBytes(16).toString('hex')`），并注入到所有 `<script>` 标签。`style-src` 保留 `unsafe-inline`——Vue hydration 期间注入的内联样式无法使用 nonce。
- HSTS（2 年 max-age + preload）、`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy: camera=(), microphone=(), geolocation=()`。

### Git 工作流

- 功能开发在短期 `feat/*`、`fix/*`、`docs/*` 分支上进行；稳定的 `main` 只接受经过审查的阶段成果。
- 个人开发不强制复杂 GitFlow 或每次走 PR；提交、合并和推送必须与用户授权和阶段证据一致。

#### Git Hooks（自动强制执行）

项目配置了 `.githooks/` 目录，`git config core.hooksPath .githooks` 已激活：

| Hook         | 触发            | 行为                                                               |
| ------------ | --------------- | ------------------------------------------------------------------ |
| `pre-commit` | `git commit` 前 | 当前分支为 `main` → 拒绝提交，提示切分支                           |
| `pre-commit` | `git commit` 前 | `lint-staged`：`eslint` + `prettier --check`（门禁型，不改写源码） |
| `pre-push`   | `git push` 前   | 先 `nuxi typecheck`，再 `npx vitest run` → 不通过拒绝推送          |

新克隆项目需执行：`git config core.hooksPath .githooks`

### 关键约定

- API 响应用泛型类型：`$fetch<Type>(url, ...)`。**禁止**使用 `as any`（在测试文件中可适当使用）。
- 跨文件引用的类型必须在定义模块中 `export`（如 `export interface Profile` 在 `useAuth.ts` 中）。
- `setTimeout` 句柄必须先追踪并清除，再设置新的，防止快速重复提交时的过期闭包。在 `onUnmounted` 中清理。
- 带 `min`/`max` 的数字输入**必须**在 JS 中再次校验范围——HTML `type="number"` 不能阻止手动输入越界值。
- 下拉菜单的 Escape 按键处理必须绑在菜单容器上（不能只绑在触发按钮上）。
- 问候语字段**禁止**出现在 profile 编辑页（`profile/[id].vue`）。
- 所有输入框必须有 `<label for="id">` 关联。
- 自定义 radio 使用 `sr-only` input + 样式化的 `<span>`，通过 `.sr-only:focus-visible + span` 实现 focus-visible 环。
- 表单卡片（`card-paper-solid`）默认遵循设计系统的 `p-6 sm:p-8`：窄屏 24px，`sm` 起 32px；特殊间距必须通过对应页面验收。
- `aria-haspopup` 应使用 `"menu"` 而非 `"true"`（ARIA 1.1+）。
- `@keyframes` 规则**必须**放在 CSS `@layer` 块**之外**（Tailwind PostCSS 可能会丢弃或错排它们）。
- `role="tablist"` 的元素必须支持左右方向键导航。
- `role="menu"` 的元素必须支持上下方向键导航和点击外部关闭。
- 可空表单字段（如 `birth_hour`、`birth_minute`）**必须**在 API 请求中显式发送——用 `null` 而不是省略该键，以便服务端能清除该值。
- 可交互元素（点击 + 键盘）必须同时包含 `@click` 和 `@keydown.enter`/`@keydown.space` 处理。

### 共享常量

- `constants/bazi.ts` 是 `STEMS`、`BRANCHES`、`WUXING_COLORS` 和 `WUXING_FALLBACK_COLOR` 的唯一数据源。从这里导入——**禁止**在组件或组合式函数中重新定义。
- `WUXING_COLORS` 将元素名映射到十六进制颜色：`'{ '木': '#3D6B4B', '火': '#C62828', '土': '#7A5E12', '金': '#5E5E5E', '水': '#2C5F7C' }'`。回退色使用 `WUXING_FALLBACK_COLOR`（`#6B5B4F`），不要硬编码。

### BaZi 既有实现与整改边界

以下用于定位旧实现，不替代 [八字工具契约](docs/product/contracts/bazi-tool-contract.md)。历法锚点、输入精度、传统规则和来源仍待按契约整改，不能仅凭已有函数和测试认定可信。

- **`getTenGod` 永远不能返回 `'日主'`。**`'日主'` 标签是展示概念，不是十神。仅在日柱天干构建后手动赋值：`dayPillar.stemTenGod = '日主'`。十神矩阵对相同天干正确返回 `'比肩'`。
- **节气边界**：当前 `getSolarTerm()` 只返回月、日，八字契约已记录其缺少精确节气时刻；不得把它描述为精确时刻规则，也不应以固定日期如 `day < 4` 替代。
- **纳音公式**：天干和地支索引必须同奇偶（同偶或同奇）才构成有效甲子对。加入奇偶校验：`if ((stemIdx - branchIdx) % 2 !== 0) return ''`。
- **大运起运年龄**：当前按性别方向计算出生日期与相邻节气的整日差 ÷ 3，并向下取整生成周期；八字契约已记录其精度和来源缺口，不得称为已核验的“标准子平法”。
- **日期解析**：使用显式的 `parseDate(str)`（按 `-` 分割后 `parseInt`），**禁止**使用 `new Date(str)`——它依赖时区，对 YYYY-MM-DD 字符串不可靠。
- **农历**：通过 `lunar-javascript` 库的 `Lunar.fromYmd().getSolar()` 将农历转换为公历后再计算。所有 BaZi 计算（年柱/月柱/日柱/时柱/大运/神煞/流年）均基于转换后的公历日期。

### ShenSha / LiuNian / Divinations 既有实现

#### ShenSha

- `calculateShenSha()` 返回 `ShenSha[]`，每条匹配规则返回一条——同一柱上可出现多个神煞。
- 神煞按查找维度组织：年支（三合，6 种模式通过 `checkSanHeBranch()`）、日干（天干，9 类含禄神/羊刃/天乙贵人/太极贵人/文昌贵人/学堂/词馆/金舆/福星贵人）、月支（天德贵人/月德贵人/血刃/勾绞）、日支（天赦/十恶大败/魁罡）、通用（空亡/红鸾/天喜/丧门/吊客/孤辰/寡宿/元辰）。
- `ShenSha.category` 取值为：`'吉'` | `'凶'` | `'中性'`。
- `ShenSha.pillar` 可为：`'年柱'` | `'月柱'` | `'日柱'` | `'时柱'` | `'流年'` | `'命宫'` | `'大运'`。
- `ShenSha.position` 为：`'天干'` | `'地支'` | `'本柱'`。
- LiuNian 的流年神煞在 `useLiuNian.ts` 中通过 `computeYearShensha()` 计算，覆盖三个维度：年支→流年地支（6 种三合模式）、日干→流年地支（禄神/羊刃/天乙/太极/文昌/学堂/词馆/金舆/福星共 9 类）、月支→流年（天德贵人/月德贵人）。
- 神煞查找表只证明当前项目如何实现，不是权威来源。未经对应工具契约和来源核验，不得把映射写成已验证规则；修改时必须保留规则版本和审计证据。

#### LiuNian

本节仅描述旧引擎。工程评分、喜忌及现实断言不能作为新实现模板，是否保留字段以八字契约为准。

- `calculateLiuNian()` 计算当前年份 ±range 年（默认 5，共 11 年）。
- 仅当前年份获得 `detail` 对象，包含 `daYunInteraction`、`pillarsInteraction` 和 12 个 `monthlyStems`。
- 评分算法：基准 50 + 喜用神(+30) / 中性(0) / 忌神(-20) + 地支关系（+10 到 -22.5，加权：日柱=1.5x，其他柱=1.0x）+ 神煞（±5），压缩到 0-100。
- 地支关系覆盖全部 5 种：六合(+10)、六冲(-15)、三刑(-12)、六害(-8)、六破(-6)。每种关系对每个柱都检查。
- 总结文本是纯规则模板拼接——**不是 AI 生成**。模板顺序：十神流年短语 + 五行匹配 + 地支关系结论 + 神煞提及。
- 月干通过 `useSolarTerms.ts` 中的 `getMonthStemStart()` 计算；月份边界仍使用 `getSolarTerm()` 的日级输出，没有实现契约要求的精确节气时刻。
- 大运查找使用 `getDaYunForYear()`，将年龄匹配到周期范围；无匹配时回退到第一个周期。

#### Divinations API

> **本段描述的是已退役的死代码。** `pages/**` 对 `/api/divinations` 与 `HistoryModal` 的引用为
> **0 命中**，且 `tests/pages/tools/history-containment.test.ts` 明确断言 11 个工具页不得再引用它们
> （`event.context.profileId` 从不赋值，`divination_results` 表全仓无 DDL，整条链路恒 401）。
> 历史读写已由 R5 的 `result-history` 端点与 `components/bazi/BaziHistoryPanel.vue` 承接。
> 保留该实现仅为追溯，**不得在新页面复用，也不得据此推断当前历史行为**。

- 三个端点：`POST /api/divinations`（保存）、`GET /api/divinations?type=bazi`（列表）、`GET /api/divinations/[id]`（详情）。
- POST 校验：需要认证令牌、每 profile 每分钟限流 10 次、校验 type 必须在 `server/api/divinations/shared.ts` 的 `DIVINATION_TYPES`（当前 11 种）中。
- 当前遗留实现会以 fire-and-forget 自动保存；这是已确认待整改行为。目标规范要求生成与保存分离，只有用户主动确认后才能创建历史。
- GET 列表排除 `result_data`（仅元数据以节省带宽），GET 详情包含 `result_data` 并校验归属（`profile_id` 不匹配返回 403）。
- `input_data` 和 `result_data` 在 SQLite 中以 JSON 字符串存储；读取时通过 `safeJsonParse()` 反序列化。

**当前历史实现（R5）**：`server/api/result-history/*` + `server/services/result-history.ts` +
`composables/useResultHistory.ts`；仅 `create_allowed` 的工具可创建，服务端复算、不可变快照、按 accountId 限定归属。

### 新工具约定（ZiWei、HeHun、CeZi、NameTest、ZeJi）

以上页面当前复用了 `ToolPageLayout`、`ToolToolbar` 等组件，但这只是既有实现记录。`EntertainmentDisclaimer.vue` **已不存在于仓库**（旧文件已删除），不要按它写新代码。后续是否保留历史、导出、免责声明或其他能力由通用规范和单项工具契约决定，不得继续套用统一旧模板。

#### ZiWei（紫微斗数）

- **依赖 `iztro`** npm 包计算紫微斗数星盘——这是唯一的外部紫微计算库
- `ZiWeiCelestialChart` 渲染 12 宫格星盘，`ZiWeiPalaceGrid` 展示宫位星曜详情，`ZiWeiDaXianTimeline` 展示大限流年时间线，`ZiWeiDetailPanel` + `ZiWeiDetailSheet` 展示星曜解读
- `ZiWeiInputForm` 收集出生**公历**日期、时辰与性别（**不收集 longitude/latitude**；全仓 `longitude` 仅出现在星座组件，紫微页与八字页均不传经纬度，`useZiwei.ts` 的真太阳时分支实际不可达），`ZiWeiTabSwitcher` 切换星盘/大限/流年视图
- `ZiWeiInfoSidebar` 作为 `#nav-right` 展示个人信息摘要

#### HeHun（合婚）

- 基于八字日柱天干五合 + 地支六合计算配对分数
- `HeHunScoreCard` 展示总分（0-100），`HeHunDimensionCard` 展示各维度（五行、性格、运势等）
- 依赖 `constants/hehun.ts` 中的合婚规则数据

#### CeZi（测字）

- 基于汉字笔画数 + 五行分类进行字义解读
- 依赖 `constants/cezi.ts`（五行分类）和 `constants/stroke-dict.ts`（笔画字典）

#### NameTest（姓名测试）

- 使用三才五格法分析姓名笔画
- 依赖 `constants/name-test.ts` 中的吉凶规则数据

#### ZeJi（择吉）

- 基于农历日期推荐吉日
- `ZejiCalendar` 日历视图，`ZejiRecommend` 推荐列表
- 依赖 `constants/zeji.ts` 中的择吉规则

### Nuxt 自动导入注意事项

- `components/tools/` 下的组件可能仅以 `Tools` 前缀自动注册（如 `ToolsInkDivider`）。短名称别名如 `InkDivider` 在某些 Nuxt 版本中可能不解析。组件在运行时解析失败时，添加显式导入：`import InkDivider from '~/components/tools/InkDivider.vue'`。
- `computed` 和 `ref` 由 Vue 自动导入。不需要显式导入。

### ToolPageLayout 约定

- 三个具名插槽：`#nav`（桌面端左侧栏）、`#mobile-nav`（移动端横向滚动）、`#nav-right`（右侧栏，xl+ 屏幕）。
- 三个侧栏均通过 `v-if="$slots.nav"` 等条件渲染——工具不需要某个插槽时不填即可。
- 左侧栏（`#nav`）用于工具内导航（生肖/星座选择器、锚点链接）。**禁止**在此重复顶栏的跨工具导航链接。
- 右侧栏（`#nav-right`）用于个人信息摘要（仅 BaZi）——sticky 定位 `top-20`，仅 xl+。
- BaZi：无 `#nav`，仅 `#nav-right`（BaziInfoSidebar）。Shengxiao：`#nav`（AnimalNav）+ `#mobile-nav`。Constellation：`#nav`（ConstellationNav）+ `#mobile-nav`。ZiWei：无 `#nav`，仅 `#nav-right`（ZiWeiInfoSidebar）。HeHun/CeZi/NameTest/ZeJi：无侧栏，仅主内容区。

### SSR 与客户端守卫

- 在初始化中读取 `localStorage` 的组合式函数需要 `if (import.meta.client)` 守卫。Nuxt 在服务端运行组合式函数 setup 时 `localStorage` 不可用。
- Layout 应监听 `route.path` 以在路由切换时关闭下拉菜单：`watch(() => route.path, () => { showDropdown.value = false })`。
