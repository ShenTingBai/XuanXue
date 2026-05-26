# CLAUDE.md

此文件为 Claude Code 在本仓库中工作提供指引。

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
├── constants/bazi.ts             # STEMS、BRANCHES、WUXING_COLORS（唯一数据源）
├── composables/                  # 计算引擎 + 共享状态
│   ├── useAuth.ts                # 认证状态（基于 useState）
│   ├── useSolarTerms.ts          # 节气日期、月柱、五虎遁
│   ├── useBaZi.ts                # 四柱、十神、大运
│   ├── useShenSha.ts             # 25+ 查找表，按维度组织
│   └── useLiuNian.ts             # 11 年跨度、评分、规则模板文本
├── components/tools/
│   ├── bazi/                     # BaziGrid、ElementAnalysis、DayMasterCard 等
│   ├── constellation/
│   ├── shengxiao/
│   └── ToolPageLayout.vue        # 三栏布局：#nav / #mobile-nav / #nav-right
├── pages/                        # login、index、profile/[id]、tools/{bazi,shengxiao,constellation}
├── server/
│   ├── api/auth/                 # login.post、register.post、logout.delete
│   ├── api/divinations/          # CRUD：index.post、index.get、[id].get
│   ├── database/db.ts            # sql.js SQLite
│   └── utils/                    # auth（令牌提取）、rateLimit（内存限流）
└── tests/                        # 仅组合式函数 — tests/composables/*.test.ts
```

**类型与组合式函数放在一起**——没有独立的 `types/` 目录。共享接口（`Profile`、`BaZiResult`）从其所属的组合式函数中 `export`。

## 开发原则

- **先想再写。** 明确陈述假设。不确定就问——不要默默猜测。
- **简单优先。** 解决问题的代码越少越好。不加臆测功能，不为单次使用的代码建抽象，不为不可能发生的状态做错误处理。
- **精准修改。** 只改任务要求的。不"顺手优化"相邻代码，不重构没坏的东西，不删除已有的死代码（除非明确要求）。
- **目标驱动。** 实现前先定义可验证的成功标准。修 bug 先写复现用例，加功能先定验收标准。

## 架构

### 状态管理

- 组合式函数使用 `useState()`（而非 `ref()`）管理共享状态。`useAuth` 使用 `useState<Profile | null>('auth:profile', ...)` 使 layout 和页面共享同一响应式实例。
- 同步组合式函数**禁止**声明为 `async`。仅在需要 `await` 时才使用 `async`。
- 纯计算型组合式函数（如 `useBaZi.ts`、`useSolarTerms.ts`）导出类型化函数，不导出 Vue 响应式——它们是零依赖的计算引擎，由页面/组件的 setup 调用。

### 持久化

- **Session**：`localStorage` 键 `xuanxue:session`，存储 `{ token, profile }`。
- **Greeting**：`localStorage` 键 `xuanxue:greeting`，存储 `{ prefix, subtitle }`——自包含，不依赖 API。
- `restoreSession()` 从 localStorage 读取；**必须**在 `layouts/default.vue` **和**每个页面的 `onMounted` 中都调用。
- 保存 profile 后，调用 `updateProfile(response)`（而非 `restoreSession()`）来同步 `useState` 和 localStorage。

### 认证流程

1. 页面加载 → `restoreSession()` 读取 localStorage → `currentProfile` 填充。
2. 无 session → 重定向到 `/login`。
3. 登录/注册 → API 返回 `{ token, profile }` → 写入 localStorage + `useState`。
4. 登出 → DELETE `/api/auth/logout`（尽力而为）→ 清除 localStorage + `useState`。

### UI 设计：墨韵 · Ink Resonance

传统中式书房美学：

- **色板**：墨（5 阶）、纸（6 阶）、朱砂（#C62828 主色）、金、玉。
- **纸纹**：`body::after` SVG feTurbulence，`z-index: 40`，页面内容在 `.relative.z-10`。
- **组件**：`btn-seal`（印章按钮）、`input-ink`（下划线输入框）、`tool-card`（玻璃卡片）、`divider-ink`、`seal-mark`、`dropdown-panel`。
- 卡片使用 `backdrop-filter: blur(8px)` 覆盖在墨韵渐变背景上。
- 字体：Ma Shan Zheng（展示标题）+ Noto Sans SC（正文，字重 400/500），自托管 woff2 位于 `public/fonts/`，通过 `nuxt.config.ts` 中的 `<link rel="preload">` 预加载。

### 安全头

在 `nuxt.config.ts` → `routeRules` 中配置：

- CSP：`default-src 'self'`，`script-src 'unsafe-inline'`（Nuxt 3 hydration 所需）。生产环境强化需通过 Nitro render hooks 或 `@nuxtjs/csp` 实现 nonce 策略以移除 `unsafe-inline`。
- HSTS（2 年 max-age + preload）、`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: strict-origin-when-cross-origin`、`Permissions-Policy: camera=(), microphone=(), geolocation=()`。

### Git 工作流

- 功能开发在专用分支（`phase-*`、`feat/*`、`fix/*`）上进行，**永远不要在 `main` 上直接开发**。
- `main` 应始终保持干净——没有进行中的功能提交，没有计划/规范类提交。
- 功能完成后通过 PR 合并回 `main`（`gh pr create`）。
- **合并到 `main` 时必须使用 `git merge --no-ff`**，保留分支拓扑为提交图谱中的可见合并气泡。禁止快进合并——每个功能分支必须在图谱中留下可见的轨迹。

### 关键约定

- API 响应用泛型类型：`$fetch<Type>(url, ...)`。**禁止**使用 `as any`。
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
- **大运起运年龄**当前使用简化公式 `((birthYear * 7 + 13) % 6) + 3`。真正的八字根据出生日期到最近节气边界的距离除以 3 计算。这是已知缺陷。
- **日期解析**：使用显式的 `parseDate(str)`（按 `-` 分割后 `parseInt`），**禁止**使用 `new Date(str)`——它依赖时区，对 YYYY-MM-DD 字符串不可靠。
- **农历**：标记为农历的出生日期在日柱计算中被视为公历。这是已知缺陷——农历生日的计算结果仅为近似值。

### ShenSha / LiuNian / Divinations 约定

#### ShenSha

- `calculateShenSha()` 返回 `ShenSha[]`，每条匹配规则返回一条——同一柱上可出现多个神煞。
- 神煞按查找维度组织：年支（三合，6 种模式通过 `checkSanHeBranch()`）、日干（天干，9 类含禄神/羊刃/天乙贵人/太极贵人/文昌贵人/学堂/词馆/金舆/福星贵人）、月支（天德贵人/月德贵人/血刃/勾绞）、日支（天赦/十恶大败/魁罡）、通用（空亡/红鸾/天喜/丧门/吊客/孤辰/寡宿/元辰）。
- `ShenSha.category` 取值为：`'吉'` | `'凶'` | `'中性'`。
- `ShenSha.pillar` 可为：`'年柱'` | `'月柱'` | `'日柱'` | `'时柱'` | `'流年'`。
- `ShenSha.position` 为：`'天干'` | `'地支'` | `'本柱'`。
- LiuNian 的流年神煞在 `useLiuNian.ts` 中通过 `computeYearShensha()` 计算，覆盖 6 种模式：桃花(3)/驿马(2)/将星(0)/华盖(1)/劫煞(4)/灾煞(5)——索引对应 `checkSanHeBranch()` 模式数组位置。
- 神煞查找表是权威来源——未经核对文献**禁止修改**映射。

#### LiuNian

- `calculateLiuNian()` 计算当前年份 ±range 年（默认 5，共 11 年）。
- 仅当前年份获得 `detail` 对象，包含 `daYunInteraction`、`pillarsInteraction` 和 12 个 `monthlyStems`。
- 评分算法：基准 50 + 喜用神(+30) / 中性(0) / 忌神(-20) + 地支关系（+10 到 -22.5，加权：日柱=1.5x，其他柱=1.0x）+ 神煞（±5），压缩到 0-100。
- 地支关系覆盖全部 5 种：六合(+10)、六冲(-15)、三刑(-12)、六害(-8)、六破(-6)。每种关系对每个柱都检查。
- 总结文本是纯规则模板拼接——**不是 AI 生成**。模板顺序：十神流年短语 + 五行匹配 + 地支关系结论 + 神煞提及。
- 月干使用五虎遁（年上起月法）通过 `useSolarTerms.ts` 中的 `getMonthStemStart()` 计算。月份边界使用顺序编号（寅月=1...丑月=12）；精确的节气边界尚未实现。
- 大运查找使用 `getDaYunForYear()`，将年龄匹配到周期范围；无匹配时回退到第一个周期。

#### Divinations API

- 三个端点：`POST /api/divinations`（保存）、`GET /api/divinations?type=bazi`（列表）、`GET /api/divinations/[id]`（详情）。
- POST 校验：需要认证令牌、每 profile 每分钟限流 10 次、校验 type 必须在 `VALID_TYPES = new Set(['shengxiao', 'constellation', 'bazi', 'yijing', 'ziwei'])` 中。
- 自动保存是静默的 fire-and-forget——保存失败不阻塞用户查看结果。
- GET 列表排除 `result_data`（仅元数据以节省带宽），GET 详情包含 `result_data` 并校验归属（`profile_id` 不匹配返回 403）。
- `input_data` 和 `result_data` 在 SQLite 中以 JSON 字符串存储；读取时通过 `safeJsonParse()` 反序列化。
- BaZi 页面的历史下拉显示最近 5 条记录；点击恢复完整结果并重新计算神煞/流年。

#### 已知缺陷

- **神煞变体来源**：部分神煞有多个查找来源变体（如天乙贵人同时有日干版本和年干版本）。本实现使用日干版本，这是子平法中使用最广的版本。年干变体尚未实现。
- **LiuNian 神煞覆盖**：流年神煞仅覆盖 6 种最常见的年支模式（桃花、驿马、将星、华盖、劫煞、灾煞）。更深层的传播——日干和月支神煞对流年地支的触发——留待后续增强。
- **LiuNian 月份边界**：月干使用年上起月法（五虎遁），但月份边界使用简化的顺序编号（寅月=1 到 丑月=12）。精确的节气边界需要为年内每月集成 `getSolarTerm`。

### Nuxt 自动导入注意事项

- `components/tools/` 下的组件可能仅以 `Tools` 前缀自动注册（如 `ToolsInkDivider`）。短名称别名如 `InkDivider` 在某些 Nuxt 版本中可能不解析。组件在运行时解析失败时，添加显式导入：`import InkDivider from '~/components/tools/InkDivider.vue'`。
- `computed` 和 `ref` 由 Vue 自动导入。不需要显式导入。

### ToolPageLayout 约定

- 三个具名插槽：`#nav`（桌面端左侧栏）、`#mobile-nav`（移动端横向滚动）、`#nav-right`（右侧栏，xl+ 屏幕）。
- 三个侧栏均通过 `v-if="$slots.nav"` 等条件渲染——工具不需要某个插槽时不填即可。
- 左侧栏（`#nav`）用于工具内导航（生肖/星座选择器、锚点链接）。**禁止**在此重复顶栏的跨工具导航链接。
- 右侧栏（`#nav-right`）用于个人信息摘要（仅 BaZi）——sticky 定位 `top-20`，仅 xl+。
- BaZi：无 `#nav`，仅 `#nav-right`（BaziInfoSidebar）。Shengxiao：`#nav`（AnimalNav）+ `#mobile-nav`。Constellation：`#nav`（ConstellationNav）+ `#mobile-nav`。

### SSR 与客户端守卫

- 在初始化中读取 `localStorage` 的组合式函数需要 `if (import.meta.client)` 守卫。Nuxt 在服务端运行组合式函数 setup 时 `localStorage` 不可用。
- Layout 应监听 `route.path` 以在路由切换时关闭下拉菜单：`watch(() => route.path, () => { showDropdown.value = false })`。
