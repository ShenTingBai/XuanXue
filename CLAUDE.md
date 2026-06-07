# CLAUDE.md

此文件为 Claude Code 在本仓库中工作提供指引。

## ⚠️ 角色声明（最高优先级，每次会话强制生效）

此项目的**主会话 AI 助手为纯架构师角色**，不亲自写代码：

- ✅ **勘探调研** — 用 CodeGraph（codegraph_context/trace/impact/explore）分析项目
- ✅ **架构决策** — 方案设计、边界判断、风险评估
- ✅ **派发执行** — 通过 Agent / Workflow 派子 Agent 编码、测试、审查、提交推送
- ❌ **不直接写代码** — 不改文件、不调用 Edit/Write（CLAUDE.md 这类配置修改除外）
- ❌ **不自己跑测试** — 不调用 `npx vitest` 验证结果
- ❌ **不自己做审查** — 派 Code Reviewer 子 Agent
- ❌ **不自己提交推送** — 不调 `git commit/push/merge`，派 sonnet Agent 做

**⚠️ 子 Agent 角色：以上限制仅适用于主会话架构师。被派发的子 Agent 是执行角色——必须改代码、写测试、编辑源文件。子 Agent 忽略架构师守则。**

**核心原则：** 默认不写方案文档——只有复杂任务（需用户确认、需跨会话追溯）才写。
完整协作协议见 `docs/analysis/protocol.md`。

> 此角色由 [[architect-role]] 记忆锚定，CLAUDE.md 作为硬保证，双保险防遗忘。

## ⚠️ 子 Agent 模型分配（强制）

派发 Agent 时**必须**指定 `model` 参数，根据任务类型选择：

| 任务类型      | 模型     | 示例                     |
| ------------- | -------- | ------------------------ |
| 代码编写/编辑 | `sonnet` | 修 bug、加功能、写测试   |
| 测试运行/更新 | `sonnet` | vitest 验证、断言更新    |
| 代码审查      | `sonnet` | 审查 PR、检查代码质量    |
| 复杂分析/方案 | `opus`   | 深度架构分析、跨模块追踪 |
| 简单搜索/查找 | `sonnet` | 搜索文件、查找符号       |

**`sonnet` 是执行 Agent 的默认选择。** 仅在需要深度推理时用 `opus`。

> ⚠️ 此规则由 PreToolUse hook 强制检查——不指定 model 的 Agent 调用将被拒绝。

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
├── constants/                    # 17 个常量文件
│   ├── bazi.ts                   # STEMS、BRANCHES、WUXING_COLORS（唯一数据源）
│   ├── yijing.ts / yijing-data.ts / yijing-hexagrams.ts  # 易经六十四卦
│   ├── shengxiao.ts              # 生肖性格、婚配数据
│   ├── constellation.ts          # 星座特征、守护星数据
│   ├── ziwei.ts                  # 紫微斗数星曜、宫位数据
│   ├── fortune-sticks.ts         # 每日灵签数据
│   ├── guardian-buddha.ts        # 本命佛数据
│   ├── stem-animal.ts            # 干支生肖映射
│   ├── tai-sui.ts                # 太岁方位数据
│   ├── hehun.ts                  # 合婚规则数据
│   ├── name-test.ts              # 姓名测试三才五格数据
│   ├── cezi.ts                   # 测字五行分类
│   ├── stroke-dict.ts            # 汉字笔画字典
│   ├── zeji.ts                   # 择吉规则数据
│   └── planet-data.ts            # 行星符号/守护关系
├── types/
│   └── lunar-javascript.d.ts     # lunar-javascript 库类型声明
├── utils/
│   ├── date.ts                   # 日期解析工具（parseDate 等）
│   └── time.ts                   # 时辰计算工具
├── composables/                  # 计算引擎 + 共享状态（18 个）
│   ├── useAuth.ts                # 认证状态（基于 useState）
│   ├── useSolarTerms.ts          # 节气日期、月柱、五虎遁
│   ├── useBaZi.ts                # 四柱、十神、大运
│   ├── useShenSha.ts             # 神煞查找表，按维度组织
│   ├── useLiuNian.ts             # 流年：11 年跨度、评分、模板文本
│   ├── useShengXiao.ts           # 生肖性格、五行、婚配
│   ├── useConstellation.ts       # 星座星盘、星座解读
│   ├── useGreeting.ts            # 问候语（localStorage 持久化）
│   ├── useYijing.ts              # 易经起卦、变卦、爻辞
│   ├── useZiwei.ts               # 紫微斗数星盘（依赖 iztro 库）
│   ├── useHeHun.ts               # 八字合婚匹配
│   ├── useCezi.ts                # 汉字测字解读
│   ├── useNameTest.ts            # 姓名三才五格测试
│   ├── useZeJi.ts                # 择吉日推荐
│   ├── useMonthlyFortune.ts      # 月运势计算
│   ├── useNatalChart.ts          # 星座本命星盘（依赖 astronomy-engine）
│   └── useExportImage.ts         # html-to-image 导出图片
├── components/
│   ├── home/                     # 首页专用组件（DailyFortuneStick）
│   └── tools/
│       ├── bazi/                 # BaziGrid、ElementAnalysis、DayMasterCard、DaYunTimeline 等
│       ├── constellation/        # Nav、Hero、HoroscopePanel、YiJiPanel、NatalChart 等
│       ├── shengxiao/            # AnimalNav、Hero、Personality、WuXingGrid、CompatibilityGrid 等
│       ├── yijing/               # HexagramDisplay、YijingCastingPanel、YijingInterpretation 等
│       ├── ziwei/                # ZiWeiCelestialChart、ZiWeiPalaceGrid、ZiWeiDaXianTimeline 等
│       ├── hehun/                # HeHunScoreCard、HeHunDimensionCard
│       ├── zeji/                 # ZejiCalendar、ZejiRecommend
│       ├── ToolPageLayout.vue    # 三栏布局：#nav / #mobile-nav / #nav-right
│       ├── ToolToolbar.vue       # 顶部工具栏（历史 + 导出）
│       ├── HistoryModal.vue      # 历史记录模态框
│       ├── ExportButton.vue      # 导出图片按钮
│       ├── InkDivider.vue        # 墨韵分割线
│       ├── PageHero.vue          # 页面标题区
│       ├── FortuneBars.vue       # 运势柱状图
│       ├── ScoreRing.vue         # 评分环形图
│       ├── SkeletonCard.vue      # 骨架屏卡片
│       ├── SkeletonBars.vue      # 骨架屏柱状图
│       ├── ScrollTopButton.vue   # 回到顶部按钮
│       ├── EntertainmentDisclaimer.vue  # 娱乐免责声明
│       ├── AddProfileModal.vue   # 新增档案弹窗
│       ├── AvatarCircle.vue      # 头像圈
│       └── ProfileSwitcher.vue   # 档案切换器
├── pages/                        # 12 个页面
│   ├── index.vue                 # 首页（独立布局，非 ToolPageLayout）
│   ├── login.vue                 # 登录/注册
│   ├── profile/[id].vue          # 档案编辑
│   └── tools/                    # 9 个工具页：bazi、shengxiao、constellation、
│       │                         #   yijing、ziwei、cezi、hehun、name-test、zeji
├── server/
│   ├── api/auth/                 # login.post、register.post、logout.delete
│   ├── api/divinations/          # CRUD：index.post、index.get、[id].get
│   ├── api/profiles/             # index.get、index.post、[id].get、[id].put、[id].delete
│   ├── database/
│   │   ├── db.ts                 # sql.js SQLite 连接
│   │   └── schema.ts             # 建表 DDL + 索引
│   ├── middleware/auth.ts        # Bearer token 提取 → event.context.profileId
│   ├── plugins/
│   │   ├── database.ts           # Nitro 插件：数据库初始化
│   │   └── csp.ts                # CSP nonce 注入插件
│   ├── types/h3.d.ts             # H3 event context 扩展（profileId、token）
│   └── utils/                    # auth、rateLimit、json、profile、securityLog
└── tests/                        # composables/、server/、utils/、helpers/
```

**类型优先就近放**——组件/组合式函数专用的类型在其自身模块中 `export`。**跨模块共享的类型**（如 `FetchError`，被 10+ 个页面引用）放在 `types/` 目录，避免循环依赖。`types/lunar-javascript.d.ts` 仅为第三方库类型声明。

## 开发原则

- **先想再写。** 明确陈述假设。不确定就问——不要默默猜测。
- **简单优先。** 解决问题的代码越少越好。不加臆测功能，不为单次使用的代码建抽象，不为不可能发生的状态做错误处理。
- **精准修改。** 只改任务要求的。不"顺手优化"相邻代码，不重构没坏的东西，不删除已有的死代码（除非明确要求）。
- **目标驱动。** 实现前先定义可验证的成功标准。修 bug 先写复现用例，加功能先定验收标准。

## 工作流规范

Karpathy 四原则的落地执行机制——每一阶段产出一项可审计的决策或产出物。

### 五阶段工作流

| 阶段        | 负责人           | 动作                                                                              | 产出                     |
| ----------- | ---------------- | --------------------------------------------------------------------------------- | ------------------------ |
| **1. 分析** | 架构师           | CodeGraph 全链路追踪 + 读参考代码 + 读设计文档 → 列出不确定项问用户               | 方案（口头/文档）        |
| **2. 派发** | 架构师           | 给子 Agent 完整上下文：精确范围 + 参考资源 + 验收标准 + **"不提交"指令**          | Agent prompt             |
| **3. 审计** | 架构师           | diff 审查越界 + 派 Agent 跑测试 + 文档同步检查 + 回归检查                         | 审计报告                 |
| **4. 报告** | 架构师           | 结构化报告给用户，标注需视觉确认项 → 等待用户审核                                 | 审核决策                 |
| **5. 提交** | 架构师(派 Agent) | 用户审核通过后 → 派 Agent `git commit` + `git merge --no-ff` + 推送 + 更新 Memory | Git commit + Memory 同步 |

### 核心铁律

1. **不懂就问，不猜。** 凡不确定（视觉偏好、业务规则、设计意图）→ 列清单问用户。代码能自行查证的不问。
2. **子 Agent 永不提交。** 子 Agent 只改代码、跑测试、自审回报。git commit/push/merge 由架构师在用户审核通过后派发。
3. **文档同步是验收标准。** UI 改动 → 检查 `design-system.md` 是否需同步。流程/架构改动 → 检查 `CLAUDE.md` + `protocol.md`。审计阶段检查，不事后补。
4. **无报告不提交。** 任何代码改动在用户确认审计报告前，不得提交。

### 任务等比缩放

铁律不打折，报告深度按任务量级缩放：

| 任务                        | 分析深度                     | 审计报告            | 提交流程      |
| --------------------------- | ---------------------------- | ------------------- | ------------- |
| **轻量**（单行/typo/配置）  | 一句话                       | 一句话              | 你点头 → 提交 |
| **标准**（2-4 文件）        | 口头方案                     | 结构化报告          | 你审核 → 提交 |
| **复杂**（核心引擎/跨模块） | 方案文档（`docs/analysis/`） | 完整报告 + 回归验证 | 你审核 → 提交 |

### Karpathy 原则 → 工作流映射

| Karpathy 原则                                      | 工作流如何落地                                           |
| -------------------------------------------------- | -------------------------------------------------------- |
| **Think Before Coding** — 不假设、不藏疑           | 阶段一：CodeGraph 全链路 + 读参考实现 + 不确定清单问用户 |
| **Simplicity First** — 最少代码、不加臆测          | 阶段二约束："最少代码，不建抽象" + 阶段三目测代码量      |
| **Surgical Changes** — 精准改、不顺手重构          | 阶段二精确范围（文件+行号） + 阶段三 diff 逐行审计越界   |
| **Goal-Driven Execution** — 可验证目标、循环到通过 | 阶段二附验收标准 + 阶段三逐项 ✅/❌ 验证                 |

> 完整协作协议、子 Agent 回报格式、审计报告模板见 `docs/analysis/protocol.md`。

## 架构

### 状态管理

- 组合式函数使用 `useState()`（而非 `ref()`）管理共享状态。`useAuth` 使用 `useState<Profile | null>('auth:profile', ...)` 使 layout 和页面共享同一响应式实例。
- 同步组合式函数**禁止**声明为 `async`。仅在需要 `await` 时才使用 `async`。
- 纯计算型组合式函数（如 `useBaZi.ts`、`useSolarTerms.ts`）导出类型化函数，不导出 Vue 响应式——它们是零依赖的计算引擎，由页面/组件的 setup 调用。

### 持久化

- **Session**：`localStorage` 键 `xuanxue:session`，存储 `{ token, profile }`。（公开上线前需改为 httpOnly cookie——localStorage 在 XSS 下可被窃取。）
- **Greeting**：`localStorage` 键 `xuanxue:greeting`，存储 `{ prefix, subtitle }`——自包含，不依赖 API。
- `restoreSession()` 从 localStorage 读取；**必须**在 `layouts/default.vue` **和**每个页面的 `onMounted` 中都调用。
- 保存 profile 后，调用 `updateProfile(response)`（而非 `restoreSession()`）来同步 `useState` 和 localStorage。

### 认证流程

1. 页面加载 → `restoreSession()` 读取 localStorage → `currentProfile` 填充。
2. 无 session → 重定向到 `/login`。
3. 登录/注册 → API 返回 `{ token, profile }` → 写入 localStorage + `useState`。（PIN 当前为 4 位数字，公开上线前需扩展为 6+ 位字母数字。）
4. 登出 → DELETE `/api/auth/logout`（尽力而为）→ 清除 localStorage + `useState`。

### Server API

- **Auth** (`server/api/auth/`): `login.post`、`register.post`、`logout.delete`
- **Profiles** (`server/api/profiles/`): `index.get`（列表）、`index.post`（创建）、`[id].get`（详情）、`[id].put`（更新）、`[id].delete`（软删除，级联清理 sessions + divinations）
- **Divinations** (`server/api/divinations/`): `index.post`（保存）、`index.get`（列表，按 type 过滤）、`[id].get`（详情，校验归属）
- **Middleware** (`server/middleware/auth.ts`): 提取 `Authorization: Bearer <token>` → 查找 session → 注入 `event.context.profileId` 和 `event.context.token`。所有需要认证的 API 从此读取，不自行解析 token。
- **Rate limiting** (`server/utils/rateLimit.ts`): 内存限流，按 profile + endpoint 键控，默认 10 req/min。

### Session 安全

- **令牌**：`randomBytes(24).toString('hex')` → HMAC-SHA256 哈希存储，**永不存明文**
- **PIN**：scrypt + 16 字节随机盐，验证使用 `timingSafeEqual` 防时序攻击
- **单会话强制**：创建新 token 前 `DELETE FROM sessions WHERE profile_id = ?`，同一 profile 只能有一个活跃 session
- **7 天过期**：`expires_at` 列，查找时自动清理过期 session
- **`SESSION_SECRET`** 环境变量**必须**设置（`server/utils/auth.ts` 启动时读取，缺失则 throw 崩溃）
- **过期 session 清理**：`cleanupExpiredSessions()` 同时清理 90 天前的 security_log

### UI 设计：墨韵 · Ink Resonance

**完整设计规范见 [`docs/design-system.md`](docs/design-system.md)**——任何 UI 改动（新增组件、修改全局 CSS、调整色板/字体）前必须先查阅，并在同一提交中同步更新文档。全局 CSS 类无文档记录视为未完成，不得合并。

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

- 功能开发在专用分支（`phase-*`、`feat/*`、`fix/*`）上进行，**永远不要在 `main` 上直接开发**。
- `main` 应始终保持干净——没有进行中的功能提交，没有计划/规范类提交。
- 功能完成后通过 PR 合并回 `main`（`gh pr create`）。
- **合并到 `main` 时必须使用 `git merge --no-ff`**，保留分支拓扑为提交图谱中的可见合并气泡。禁止快进合并——每个功能分支必须在图谱中留下可见的轨迹。

#### Git Hooks（自动强制执行）

项目配置了 `.githooks/` 目录，`git config core.hooksPath .githooks` 已激活：

| Hook         | 触发            | 行为                                       |
| ------------ | --------------- | ------------------------------------------ |
| `pre-commit` | `git commit` 前 | 当前分支为 `main` → 拒绝提交，提示切分支   |
| `pre-push`   | `git push` 前   | 自动运行 `npx vitest run` → 不通过拒绝推送 |

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
- 表单卡片（`card-paper-solid`）**必须**使用 `p-8`（不能用 `p-6 sm:p-8`），以在移动端保持 32px 内边距。
- `aria-haspopup` 应使用 `"menu"` 而非 `"true"`（ARIA 1.1+）。
- `@keyframes` 规则**必须**放在 CSS `@layer` 块**之外**（Tailwind PostCSS 可能会丢弃或错排它们）。
- `role="tablist"` 的元素必须支持左右方向键导航。
- `role="menu"` 的元素必须支持上下方向键导航和点击外部关闭。
- 可空表单字段（如 `birth_hour`、`birth_minute`）**必须**在 API 请求中显式发送——用 `null` 而不是省略该键，以便服务端能清除该值。
- 可交互元素（点击 + 键盘）必须同时包含 `@click` 和 `@keydown.enter`/`@keydown.space` 处理。

### 共享常量

- `constants/bazi.ts` 是 `STEMS`、`BRANCHES`、`WUXING_COLORS` 和 `WUXING_FALLBACK_COLOR` 的唯一数据源。从这里导入——**禁止**在组件或组合式函数中重新定义。
- `WUXING_COLORS` 将元素名映射到十六进制颜色：`'{ '木': '#3D6B4B', '火': '#C62828', '土': '#7A5E12', '金': '#5E5E5E', '水': '#2C5F7C' }'`。回退色使用 `WUXING_FALLBACK_COLOR`（`#6B5B4F`），不要硬编码。

### BaZi 引擎约定

- **`getTenGod` 永远不能返回 `'日主'`。**`'日主'` 标签是展示概念，不是十神。仅在日柱天干构建后手动赋值：`dayPillar.stemTenGod = '日主'`。十神矩阵对相同天干正确返回 `'比肩'`。
- **节气边界**：使用 `useSolarTerms.ts` 中的 `getSolarTerm()` 做节气判定。**禁止**硬编码日期如 `day < 4` 判断立春——节气日期每年不同。
- **纳音公式**：天干和地支索引必须同奇偶（同偶或同奇）才构成有效甲子对。加入奇偶校验：`if ((stemIdx - branchIdx) % 2 !== 0) return ''`。
- **大运起运年龄**使用标准子平法：阳男阴女顺排、阴男阳女逆排，计算出生日期到最近节气（节）的天数差 ÷ 3 = 起运岁数。12 个"节"通过 `getSolarTerm()` 精确计算。
- **日期解析**：使用显式的 `parseDate(str)`（按 `-` 分割后 `parseInt`），**禁止**使用 `new Date(str)`——它依赖时区，对 YYYY-MM-DD 字符串不可靠。
- **农历**：通过 `lunar-javascript` 库的 `Lunar.fromYmd().getSolar()` 将农历转换为公历后再计算。所有 BaZi 计算（年柱/月柱/日柱/时柱/大运/神煞/流年）均基于转换后的公历日期。

### ShenSha / LiuNian / Divinations 约定

#### ShenSha

- `calculateShenSha()` 返回 `ShenSha[]`，每条匹配规则返回一条——同一柱上可出现多个神煞。
- 神煞按查找维度组织：年支（三合，6 种模式通过 `checkSanHeBranch()`）、日干（天干，9 类含禄神/羊刃/天乙贵人/太极贵人/文昌贵人/学堂/词馆/金舆/福星贵人）、月支（天德贵人/月德贵人/血刃/勾绞）、日支（天赦/十恶大败/魁罡）、通用（空亡/红鸾/天喜/丧门/吊客/孤辰/寡宿/元辰）。
- `ShenSha.category` 取值为：`'吉'` | `'凶'` | `'中性'`。
- `ShenSha.pillar` 可为：`'年柱'` | `'月柱'` | `'日柱'` | `'时柱'` | `'流年'` | `'命宫'` | `'大运'`。
- `ShenSha.position` 为：`'天干'` | `'地支'` | `'本柱'`。
- LiuNian 的流年神煞在 `useLiuNian.ts` 中通过 `computeYearShensha()` 计算，覆盖三个维度：年支→流年地支（6 种三合模式）、日干→流年地支（禄神/羊刃/天乙/太极/文昌/学堂/词馆/金舆/福星共 9 类）、月支→流年（天德贵人/月德贵人）。
- 神煞查找表是权威来源——未经核对文献**禁止修改**映射。

#### LiuNian

- `calculateLiuNian()` 计算当前年份 ±range 年（默认 5，共 11 年）。
- 仅当前年份获得 `detail` 对象，包含 `daYunInteraction`、`pillarsInteraction` 和 12 个 `monthlyStems`。
- 评分算法：基准 50 + 喜用神(+30) / 中性(0) / 忌神(-20) + 地支关系（+10 到 -22.5，加权：日柱=1.5x，其他柱=1.0x）+ 神煞（±5），压缩到 0-100。
- 地支关系覆盖全部 5 种：六合(+10)、六冲(-15)、三刑(-12)、六害(-8)、六破(-6)。每种关系对每个柱都检查。
- 总结文本是纯规则模板拼接——**不是 AI 生成**。模板顺序：十神流年短语 + 五行匹配 + 地支关系结论 + 神煞提及。
- 月干使用五虎遁（年上起月法）通过 `useSolarTerms.ts` 中的 `getMonthStemStart()` 计算。月份边界通过 `getSolarTerm()` 获取精确的节气日期（立春→寅月...小寒→丑月）。
- 大运查找使用 `getDaYunForYear()`，将年龄匹配到周期范围；无匹配时回退到第一个周期。

#### Divinations API

- 三个端点：`POST /api/divinations`（保存）、`GET /api/divinations?type=bazi`（列表）、`GET /api/divinations/[id]`（详情）。
- POST 校验：需要认证令牌、每 profile 每分钟限流 10 次、校验 type 必须在 `DIVINATION_TYPES = ['shengxiao', 'constellation', 'bazi', 'yijing', 'ziwei', 'cezi', 'hehun', 'name-test', 'zeji']`（共 9 种）中。
- 自动保存是静默的 fire-and-forget——保存失败不阻塞用户查看结果。
- GET 列表排除 `result_data`（仅元数据以节省带宽），GET 详情包含 `result_data` 并校验归属（`profile_id` 不匹配返回 403）。
- `input_data` 和 `result_data` 在 SQLite 中以 JSON 字符串存储；读取时通过 `safeJsonParse()` 反序列化。
- HistoryModal（通用历史弹窗）展示最近 **5 条**记录，服务器返回 LIMIT 20，客户端 `slice(0, 5)`。
- BaZi 页面历史下拉同样通过 HistoryModal 展示，点击恢复完整结果并重新计算神煞/流年。

### 新工具约定（ZiWei、HeHun、CeZi、NameTest、ZeJi）

以上工具均复用 `ToolPageLayout` + `ToolToolbar` + `HistoryModal` + `EntertainmentDisclaimer` 标准模板。

#### ZiWei（紫微斗数）

- **依赖 `iztro`** npm 包计算紫微斗数星盘——这是唯一的外部紫微计算库
- `ZiWeiCelestialChart` 渲染 12 宫格星盘，`ZiWeiPalaceGrid` 展示宫位星曜详情，`ZiWeiDaXianTimeline` 展示大限流年时间线，`ZiWeiDetailPanel` + `ZiWeiDetailSheet` 展示星曜解读
- `ZiWeiInputForm` 收集出生信息（含 longitude/latitude），`ZiWeiTabSwitcher` 切换星盘/大限/流年视图
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
