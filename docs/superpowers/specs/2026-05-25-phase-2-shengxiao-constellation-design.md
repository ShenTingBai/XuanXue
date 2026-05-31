# Phase 2 — 生肖与星座工具设计文档

> **状态：已完成** — 对应设计已实现
>
> **For agentic workers:** This spec covers UI design, calculation engines, security hardening, and architecture cleanup for Phase 2. Implementation follows via superpowers:writing-plans → superpowers:subagent-driven-development.

**Goal:** 在 Phase 1 基础系统之上，实现生肖排盘和星座运势两个工具页面，同时完成安全增强和架构改进。

**Architecture:** 纯前端 TypeScript 计算引擎（composables 层）+ 现有 API 无变更 + Nuxt 3 页面扩展。安全增强涉及后端数据库和中间件变更。

**Tech Stack:** Nuxt 3 / Vue 3 / TailwindCSS / 墨韵 Ink Resonance 设计系统 / sql.js (SQLite) / Node crypto

---

## 一、设计原则

1. **风格统一** — 所有 Phase 2 UI 必须严格使用 Phase 1 设计 token（ink/paper/cinnabar 色板、Ma Shan Zheng + Noto Sans SC、毛玻璃卡片、btn-seal、input-ink、divider-ink）
2. **工具独立** — 每个工具的页面和计算引擎完全独立，互不依赖
3. **响应式一致** — 同一套布局规则：桌面侧栏+主内容 / 平板单列 / 移动端压缩
4. **离线可算** — 所有玄学计算在前端纯函数完成，无外部 API 依赖
5. **增量安全** — 不和 Phase 1 兼容性断裂（已注册用户可继续使用）

## 二、设计 Token 延续

完全复用 Phase 1 的 ink/paper/cinnabar 配色系统、字体系统、阴影系统、圆角系统和组件库。详见 `2026-05-24-xuanxue-ui-design.md`。

**Phase 2 新增 Token：**

| Token | 值 | 用途 |
|-------|-----|------|
| `wuxing-wood` | `#4A7C59` | 五行木色，属性卡片 |
| `wuxing-fire` | `#C62828` | 五行火色 |
| `wuxing-earth` | `#B8860B` | 五行土色 |
| `wuxing-metal` | `#8E8E8E` | 行金色 |
| `wuxing-water` | `#2C5F7C` | 五行水色 |
| `compat-great` | `rgba(74,124,89,0.12)` bg / `#4A7C59` text | 大吉配对背景 |
| `compat-good` | `rgba(184,134,11,0.12)` bg / `#B8860B` text | 中吉配对背景 |
| `yiyi-border` | `3px solid` | 宜忌区分（绿色=宜，灰色=忌） |

## 三、页面路由与导航

### 3.1 路由表

| 路由 | 页面 | 说明 |
|------|------|------|
| `/tools/shengxiao` | 生肖排盘 | 基于出生年计算生肖、五行、性格、配对 |
| `/tools/constellation` | 星座运势 | 基于出生月日计算星座、性格、今日运势 |
| `/` | 首页 | 工具卡片生肖/星座解锁为可点击状态 |

### 3.2 导航结构

桌面端顶栏增加工具导航条：

```
┌──────────────────────────────────────────────────┐
│ 玄学 [玄]  生肖 │ 星座 │ 八字* │ 六爻* │ 紫微* │  林玄机 ▼ │
└──────────────────────────────────────────────────┘
* = 即将上线，灰色不可点击
```

未上线工具保持 Phase 1 的灰态锁定样式：`opacity: 0.6, cursor: default, tabindex="-1"`。

### 3.3 断点与布局规则

| 断点 | 布局 | 说明 |
|------|------|------|
| ≥ 1024px | 左侧主内容 + 右侧侧栏（sticky） | 侧栏为 12 生肖/12 星座选择导航 |
| 640-1024px | 单列 | 生肖/星座选择改为顶部横向滚动条或下拉组件 |
| < 640px | 单列压缩 | 2 列卡片，配对网格减至 3-4 列，Hero 字号降级 |

## 四、生肖排盘页 (`/tools/shengxiao`)

### 4.1 数据来源

- 用户 Profile 的 `birth_date` 和 `birth_calendar`
- 若 `birth_date` 为空，页面显示"请先完善出生信息"提示并引导至档案编辑页

### 4.2 页面结构（桌面端）

```
┌────────────────────────────────────┬─────────────┐
│  顶栏（Logo + 导航 + 用户）         │             │
├────────────────────────────────────┤  十二生肖    │
│  ┌────────────────────────────┐    │  导航侧栏    │
│  │      🐯                    │    │  (sticky)   │
│  │       寅虎                 │    │             │
│  │  戊寅年 · 1998 · 阳性      │    │  🐭 子鼠    │
│  │  [城头土命]                 │    │  🐮 丑牛    │
│  └────────────────────────────┘    │  🐯 寅虎 ← │
│                                    │  🐰 卯兔    │
│  五行    纳音      地支     方向    │  🐲 辰龙    │
│  ┌──┐   ┌──┐   ┌──┐   ┌──┐      │  🐍 巳蛇    │
│  │土│   │城│   │寅│   │东北│      │  🐴 午马    │
│  └──┘   └──┘   └──┘   └──┘      │  🐑 未羊    │
│                                    │  🐵 申猴    │
│  ──── 性格特征 ────               │  🐔 酉鸡    │
│  ┌──────────┬───────────┐        │  🐶 戌狗    │
│  │ ▸ 优点   │ ▸ 缺点    │        │  🐷 亥猪    │
│  │ 勇敢自信 │ 刚愎自用  │        │             │
│  │ 热情开朗 │ 缺乏耐心  │        │             │
│  └──────────┴───────────┘        │             │
│                                    │             │
│  ──── 2026 流年运势 ────          │             │
│  事业[68%] 财运[52%] 感情[85%] 健康[48%]        │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐                          │
│  └──┘ └──┘ └──┘ └──┘                          │
│                                    │             │
│  ──── 生肖配对 ────               │             │
│  🐶狗  🐴马  🐷猪  🐰兔  🐍蛇  🐒猴           │
│  大吉  大吉  中吉  中吉  相刑  相冲             │
│                                    │             │
│  [📜 重新排盘]  [切换生肖]        │             │
└────────────────────────────────────┴─────────────┘
```

### 4.3 数据结构

```typescript
interface ShengXiaoResult {
  animal: string            // 生肖名（鼠/牛/虎/兔/龙/蛇/马/羊/猴/鸡/狗/猪）
  animalEmoji: string       // 对应 emoji
  earthlyBranch: string     // 地支（子/丑/寅/卯/辰/巳/午/未/申/酉/戌/亥）
  year: number              // 出生年份
  heavenlyStem: string      // 天干（甲/乙/丙/丁/戊/己/庚/辛/壬/癸）
  stemBranch: string        // 干支（如戊寅）
  wuXing: string            // 五行（金/木/水/火/土）
  naYin: string             // 纳音（如城头土）
  direction: string         // 方向
  yangOrYin: string         // 阴阳（阳/阴）
  personalityPro: string[]  // 优点列表
  personalityCon: string[]  // 缺点列表
  fortune: {
    career:   { level: string, score: number }  // 事业
    wealth:   { level: string, score: number }  // 财运
    love:     { level: string, score: number }  // 感情
    health:   { level: string, score: number }  // 健康
  }
  compatibility: Array<{
    animal: string
    emoji: string
    relation: '三合' | '六合' | '中吉' | '相冲' | '相害' | '相刑' | '相克'
    level: 'great' | 'good' | 'bad'
  }>
  lucky: {
    numbers: number[]
    colors: string[]
    direction: string
  }
}
```

### 4.4 计算引擎：`composables/useShengXiao.ts`

纯函数，Profile → ShengXiaoResult。

**生肖计算规则：** `(year - 4) % 12` → index（0=鼠, 1=牛, ..., 11=猪）。农历年边界以春节为准（立春为界），简化版以公历 2 月 4 日为界。

**天干计算：** `(year - 4) % 10` → index（0=甲, 1=乙, ...）

**五行规则：** 按生肖基础五行查表（鼠=水, 牛=土, 虎=木, 兔=木, 龙=土, 蛇=火, 马=火, 羊=土, 猴=金, 鸡=金, 狗=土, 猪=水）。

**纳音查询：** 按完整干支查 60 纳音表。

**配对规则：**
- 三合（大吉）：申子辰、亥卯未、寅午戌、巳酉丑
- 六合（大吉）：子丑、寅亥、卯戌、辰酉、巳申、午未
- 相冲（凶）：子午、丑未、寅申、卯酉、辰戌、巳亥
- 相害（凶）：子未、丑午、寅巳、卯辰、申亥、酉戌

**流年运势算法（deterministic）：**

```text
seed = (currentYear * 7 + animalIndex * 13 + stemIndex * 17)
career  score = (seed * 19 + 11) % 61 + 30   // 30-90
wealth  score = (seed * 23 + 17) % 61 + 30
love    score = (seed * 29 + 5)  % 61 + 30
health  score = (seed * 31 + 13) % 61 + 30
```

每个维度结果固定（同一年+同生肖=同运势），`level` 映射: ≥75=大吉, 60-74=中吉, 45-59=小吉, &lt;45=平。

### 4.5 组件拆分

| 组件 | 文件 | 说明 |
|------|------|------|
| `ShengXiaoHero` | `components/tools/shengxiao/Hero.vue` | Hero 区（emoji + 书法体名称 + 命格徽章） |
| `WuXingGrid` | `components/tools/shengxiao/WuXingGrid.vue` | 2×2 五行属性卡片 |
| `PersonalityCard` | `components/tools/shengxiao/Personality.vue` | 优缺点分列 |
| `FortuneBars` | `components/tools/FortuneBars.vue` | 通用运势进度条（生肖/星座复用） |
| `CompatibilityGrid` | `components/tools/shengxiao/CompatibilityGrid.vue` | 配对网格 |
| `AnimalNav` | `components/tools/shengxiao/AnimalNav.vue` | 12生肖导航（桌面侧栏） |

## 五、星座运势页 (`/tools/constellation`)

### 5.1 页面结构

```
┌────────────────────────────────────┬─────────────┐
│  顶栏（Logo + 导航 + 用户）         │             │
├────────────────────────────────────┤  十二星座    │
│  ┌────────────────────────────┐    │  导航侧栏    │
│  │      ♈                    │    │  (sticky)   │
│  │       白羊座               │    │             │
│  │  3月21日 — 4月19日         │    │  ♈ 白羊座 ← │
│  │  [火象] [火星守护]          │    │  ♉ 金牛座   │
│  │                            │    │  ♊ 双子座   │
│  │  ┌─ 今日运势 ──────────┐  │    │  ♋ 巨蟹座   │
│  │  │  72 / 100          │  │    │  ♌ 狮子座   │
│  │  │  综合 ██████░░ 72  │  │    │  ♍ 处女座   │
│  │  │  爱情 █████░░ 55   │  │    │  ♎ 天秤座   │
│  │  │  事业 ████████ 80  │  │    │  ♏ 天蝎座   │
│  │  │  财运 ████░░░ 45   │  │    │  ♐ 射手座   │
│  │  │  健康 ██████░ 68   │  │    │  ♑ 摩羯座   │
│  │  └───────────────────┘  │    │  ♒ 水瓶座   │
│  └────────────────────────────┘    │  ♓ 双鱼座   │
│                                    │             │
│  元素    守护星   幸运色   幸运数   │             │
│  ┌──┐   ┌──┐   ┌──┐   ┌──┐      │             │
│  │火│   │火星│  │红色│  │ 9│      │             │
│  └──┘   └──┘   └──┘   └──┘      │             │
│                                    │             │
│  ──── 性格特征 ────               │             │
│  热情冲动、勇敢直率...             │             │
│                                    │             │
│  ──── 今日宜忌 ────               │             │
│  ┌ 宜 ──────┐ ┌ 忌 ──────┐      │             │
│  │洽谈合作   │ │冲动消费   │      │             │
│  │开拓新项目 │ │与人争执   │      │             │
│  └──────────┘ └──────────┘      │             │
│                                    │             │
│  ──── 速配星座 ────               │             │
│  ♌狮子 ♐射手 ♊双子 ♎天秤          │             │
│  绝配   绝配  中配   相克          │             │
│                                    │             │
│  [🔄 刷新运势]  [切换星座]        │             │
└────────────────────────────────────┴─────────────┘
```

### 5.2 数据结构

```typescript
interface ConstellationResult {
  name: string              // 星座名（白羊座/金牛座/...）
  symbol: string            // 星座符号（♈/♉/♊/...）
  dateRange: string         // 日期范围（如"3月21日 — 4月19日"）
  element: '火' | '土' | '风' | '水'
  rulingPlanet: string      // 守护星
  luckyColor: string        // 幸运色
  luckyNumber: number       // 幸运数
  personality: string       // 性格描述
  todayHoroscope: {
    overall:  number        // 综合（0-100）
    love:     number        // 爱情
    career:   number        // 事业
    wealth:   number        // 财运
    health:   number        // 健康
  }
  todayYi: string[]         // 今日宜
  todayJi: string[]         // 今日忌
  compatibility: Array<{
    name: string
    symbol: string
    level: 'great' | 'good' | 'bad'
    label: string           // 绝配/中配/相克
  }>
}
```

### 5.3 计算引擎：`composables/useConstellation.ts`

**星座划分规则：** 按标准公历日期范围查表（白羊=3/21-4/19, 金牛=4/20-5/20, 双子=5/21-6/21, 巨蟹=6/22-7/22, 狮子=7/23-8/22, 处女=8/23-9/22, 天秤=9/23-10/23, 天蝎=10/24-11/21, 射手=11/22-12/21, 摩羯=12/22-1/19, 水瓶=1/20-2/18, 双鱼=2/19-3/20）。

**今日运势算法（deterministic）：**

```text
seed = (todayDate + zodiacIndex * prime) % modulus
dayScore = seed / modulus * 100
每个维度 = dayScore ± fixedOffset[dimension]
```

保证同一天同星座结果一致，无需服务器。五维度有固定偏移量（综合=全量，爱情=-12，事业=+8，财运=-20，健康=-5）。

**今日宜忌：** 基于五维度综合评分映射到场景模板池。

**速配规则：** 同元素星座=绝配（火象/土象/风象/水象），对宫=相克，其他=中配。

### 5.4 组件拆分

| 组件 | 文件 | 说明 |
|------|------|------|
| `ConstellationHero` | `components/tools/constellation/Hero.vue` | Hero + 标签 |
| `HoroscopePanel` | `components/tools/constellation/HoroscopePanel.vue` | 今日运势 5 维进度条面板 |
| `YiJiPanel` | `components/tools/constellation/YiJiPanel.vue` | 宜忌并排卡片 |
| `ConstellationNav` | `components/tools/constellation/Nav.vue` | 12星座导航 |

## 六、通用组件提取

Phase 1 中直接写在页面里的重复模式提取为可复用组件：

| 组件 | 说明 | 从哪提取 |
|------|------|---------|
| `InkDivider.vue` | divider-ink 分隔线 | 多个页面重复的 `section-divider` 样式 |
| `FortuneBars.vue` | 通用运势进度条组件 | 生肖/星座都用到 |
| `ToolPageLayout.vue` | 工具页面通用布局（顶栏+侧栏+响应式） | 生肖/星座共享 |
| `PageHero.vue` | 工具页 Hero 区基础结构 | 生肖/星座共享 |

## 七、安全增强

### 7.1 PIN 哈希存储（后端变更）

**现状：** PIN 明文存储。

**变更：** 使用 Node.js `crypto` 的 `scryptSync` 加盐哈希。

```typescript
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  const derived = scryptSync(pin, salt, 64).toString('hex')
  return timingSafeEqual(Buffer.from(hash), Buffer.from(derived))
}
```

**影响范围：**
- `server/api/auth/register.post.ts` — 注册时调用 `hashPin`
- `server/api/auth/login.post.ts` — 登录时调用 `verifyPin` 替代直接比较
- 现有用户数据迁移：在 `login.post.ts` 中检查 PIN 格式——若长度为 4 且不含 `:` 分隔符（未哈希），则判定为旧格式；登录验证通过后，立即用 `hashPin` 重新处理并 `UPDATE profiles SET pin = ? WHERE id = ?` 持久化哈希值。register 始终直接哈希存储。不存在"部分用户哈希、部分明文"的中间状态——首次登录后自动完成升级。

### 7.2 速率限制

基于 `node:http` 请求计数的内存速率限制器：

```typescript
// server/utils/rateLimit.ts
const rateMap = new Map<string, { count: number, resetAt: number }>()

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): boolean {
  // 按 IP/ProfileId 限流
}
```

应用于：
- `POST /api/auth/login` — 5 次/分钟
- `POST /api/auth/register` — 3 次/分钟
- `PUT /api/profiles/:id` — 10 次/分钟

### 7.3 CSP 安全头

在 `nuxt.config.ts` 中添加 Nitro 渲染安全头：

```typescript
nitro: {
  renderer: {
    securityHeaders: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data:; connect-src 'self'"
    }
  }
}
```

### 7.4 Session 过期

**现状：** session 永不过期。

**变更：** sessions 表增加 `expires_at` 字段，session 有效期 7 天。

```sql
ALTER TABLE sessions ADD COLUMN expires_at datetime;
```

- 创建 session 时设 `expires_at = datetime('now', '+7 days')`
- 读取 session 时检查是否过期
- 后台清理：每次登录/注册操作前删除过期 session

### 7.5 安全日志

新建 `security_log` 表：

```sql
CREATE TABLE IF NOT EXISTS security_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  profile_id INTEGER,
  ip TEXT,
  details TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);
```

记录事件：登录失败、PIN 变更、速率限制触发、token 刷新。

## 八、加载骨架屏（Loading Skeleton）

新增 `SkeletonCard` 和 `SkeletonBars` 组件，用于工具页面数据加载中的占位展示：

```vue
<template>
  <div class="skeleton-card animate-pulse rounded-xl bg-paper-medium/50 p-6">
    <div class="h-4 bg-ink-faint/30 rounded w-1/3 mb-4" />
    <div class="h-8 bg-ink-faint/30 rounded w-2/3" />
  </div>
</template>
```

使用 `animate-pulse` 脉冲动画，基于 paper/ink 色板配色而非蓝色/gray，保持风格统一。

## 九、首页变更

- 生肖和星座工具卡片从"即将上线"灰态变为可点击
- 卡片 hover 效果恢复（边框变红、上移 3px、阴影加深）
- 新增顶栏工具导航（所有页面可见）

## 十、响应式与动画

### 入场动画

每个工具页面的模块依次 fadeIn（staggered）：

| 模块 | delay | 动画 |
|------|-------|------|
| Hero 区 | 50ms | fadeIn + translateY(0) |
| 属性卡片 | 150ms each | fadeIn + stagger 100ms |
| 性格/详情 | 350ms | fadeIn |
| 福祉条/运势 | 400ms | fadeIn + 进度条从 0 到目标值动画 |
| 配对网格 | 500ms each | fadeIn + stagger 80ms |

### 配对卡片交互

- hover：上移 2px + 边框加深 + 微阴影
- 大吉卡片 hover 边框变绿
- 点击配对卡片：弹出简短解释（tooltip 或 expand）

## 十一、未定事项

- 紫微斗数和六爻的计算引擎将在 Phase 3+ 实现，Phase 2 预留路由和导航位置即可
- 八字计算引擎的技术细节需在 Phase 3 调研万年历/节气数据来源
- 安全日志的查看和管理界面暂无（后端记录即可）
