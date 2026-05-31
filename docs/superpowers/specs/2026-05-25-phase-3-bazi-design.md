# Phase 3 — 八字排盘工具设计文档

> **状态：已完成** — 对应设计已实现
>
> **For agentic workers:** This spec covers UI design, calculation engine, and component architecture for the BaZi (Four Pillars) tool. Implementation follows via superpowers:writing-plans → superpowers:subagent-driven-development.

**Goal:** 在 Phase 2 基础之上，实现专业八字排盘工具，完成四柱推演、十神定位、五行旺衰分析和大运排盘。

**Architecture:** 纯前端 TypeScript 计算引擎（composables 层）+ 节气数据模块 + 现有 API 无变更 + Nuxt 3 页面扩展。

**Tech Stack:** Nuxt 3 / Vue 3 / TailwindCSS / 墨韵 Ink Resonance 设计系统

---

## 一、设计原则

1. **数据密度与可读性平衡** — 八字排盘信息量大（四柱×4维度+五行+大运），需通过栅格化布局和排版层级保证可读性
2. **风格统一** — 严格使用 ink/paper/cinnabar 设计 token、Ma Shan Zheng + Noto Sans SC 字体系统
3. **学术严谨** — 所有天干地支、十神、藏干、纳音映射严格按经典子平法，不编造规则
4. **渐进式展示** — 日主强弱、喜用神等高阶分析在基础四柱下方逐段展开，信息层级清晰
5. **离线可算** — 所有玄学计算在前端纯函数完成，含节气数据内置在代码中

## 二、设计 Token 延续

完全复用 Phase 1/2 的 ink/paper/cinnabar 配色系统、字体系统、阴影系统、圆角系统和组件库。

**Phase 3 新增 / 强化 Token：**

| Token | 值 | 用途 |
|-------|-----|------|
| `bazi-grid-border` | `#C62828` 40% opacity | 四柱表格边框 |
| `ten-god-self` | `#2C1810` | 比肩/劫财（同我） |
| `ten-god-resource` | `#4A7C59` | 正印/偏印（生我） |
| `ten-god-output` | `#2C5F7C` | 食神/伤官（我生） |
| `ten-god-wealth` | `#B8860B` | 正财/偏财（我克） |
| `ten-god-power` | `#C62828` | 正官/偏官（克我） |
| `wuxing-bar` | 各五行色 | 统计条形图 |

## 三、页面路由与导航

### 3.1 路由表

| 路由 | 页面 | 说明 |
|------|------|------|
| `/tools/bazi` | 八字排盘 | 基于出生年月日时计算四柱八字 |
| `/` | 首页 | 八字工具卡片解锁为可点击状态 |

### 3.2 导航变更

在 `layouts/default.vue` 中，将八字导航项的 `available` 从 `false` 改为 `true`。首页工具卡片同样解锁。

### 3.3 断点与布局规则

| 断点 | 布局 | 说明 |
|------|------|------|
| ≥ 1024px | 左侧主内容 + 右侧信息侧栏（sticky） | 侧栏为基础信息+五行概览 |
| 640-1024px | 单列 | 侧栏折叠为可展开的顶部信息区 |
| < 640px | 单列压缩 | 四柱改为72px卡片横向滚动，五行统计2列网格，大运横向滚动 |

### 3.4 移动端设计要点

**四柱展示：** 移动端使用横向滚动容器（overflow-x: auto），每柱为一张 72px 宽的紧凑卡片。保持四柱并排的视觉特征，日柱卡片用红色边框高亮。底部显示"← 左右滑动查看四柱 →"提示。

**信息侧栏：** 折叠为顶部可展开信息栏，仅显示日主+身强+喜用神摘要。

**五行统计：** 改为 2 列网格，条形图高度降至 6px，减少垂直占用。

**大运：** 改为横向滚动卡片，每张 56px 宽，十神用单字缩写（劫/偏/杀/印/官/财等）。

## 四、八字排盘页 (`/tools/bazi`)

### 4.1 数据来源

- `birth_date`（必填）— 出生日期
- `birth_calendar`（可选，默认 solar）— 阳历/农历
- `birth_hour`（可选，0-23）— 出生时辰
- `birth_minute`（可选，0-59）— 出生分钟
- `gender`（可选，男/女）— 大运顺逆需要

缺少 `birth_date` 时显示"请先完善出生信息"引导。缺少 `birth_hour` 时显示时柱占位符"——"并提示"设置时辰以查看时柱"。

### 4.2 页面结构（桌面端）

```
┌─────────────────────────────────┬──────────────────┐
│  顶栏（Logo + 导航 + 用户）      │                  │
├─────────────────────────────────┤  信息侧栏          │
│  ┌── 四柱排盘 ──────────────┐  │  (sticky)         │
│  │  ┌──────┬──────┬──────┬──────┐│                  │
│  │  │  年柱  │  月柱  │  日柱  │  时柱  ││  基础信息          │
│  │  ├──────┼──────┼──────┼──────┤│  庚申年 · 1998    │
│  │  │  戊   │  乙   │  庚   │  丙   ││  农历/阳历         │
│  │  │  寅   │  丑   │  辰   │  子   ││  生肖: 虎          │
│  │  ├──────┼──────┼──────┼──────┤│  性别: 男          │
│  │  │  偏印 │  正财 │  日主 │  七杀 ││                    │
│  │  ├──────┼──────┼──────┼──────┤│  ──────────        │
│  │  │ 甲甲戊│ 己癸辛│ 戊乙癸│  癸   ││  五行统计           │
│  │  │  丙   │      │      │       ││  木 ██████  3      │
│  │  └──────┴──────┴──────┴──────┘│  火 ██      1      │
│  │                               │  土 ██████  3      │
│  │  ──── 五行旺衰 ────           │  金 ████    2      │
│  │  日主庚金，生于丑月（土旺金相）    │  水 ████    2      │
│  │  木 ████████████ 3            │                    │
│  │  火 ████        1            │  ──────────        │
│  │  土 ████████████ 3            │  日主                │
│  │  金 ████████     2            │  庚金 · 偏强         │
│  │  水 ████████     2            │  喜用: 水木          │
│  │                               │  忌神: 土金          │
│  │  ──── 日主分析 ────           │                    │
│  │  庚金生于丑月，得月令生扶。       │                    │
│  │  四柱土金较旺，日主偏强。        │                    │
│  │  喜水木耗泄，忌土金生扶。        │                    │
│  │                               │                    │
│  │  ──── 大运排盘 ────           │                    │
│  │  7-16岁   丙寅   七杀/偏印     │                    │
│  │  17-26岁  丁卯   正官/正财     │                    │
│  │  27-36岁  戊辰   偏印/偏印    │                    │
│  │  37-46岁  己巳   正印/七杀    │                    │
│  │  47-56岁  庚午   比肩/正官    │                    │
│  │                               │                    │
│  │  [📜 重新排盘]                 │                    │
│  └───────────────────────────────┘                    │
└─────────────────────────────────┴──────────────────┘
```

### 4.3 数据结构

```typescript
interface HiddenStem {
  stem: string        // 天干（甲/乙/丙/丁/戊/己/庚/辛/壬/癸）
  tenGod: string      // 十神（正官/偏官/正印/偏印/比肩/劫财/正财/偏财/食神/伤官）
  wuxing: string      // 五行
}

interface BaZiPillar {
  stem: string
  branch: string
  stemTenGod: string
  branchTenGod: string
  hiddenStems: HiddenStem[]
  stemWuxing: string
  branchWuxing: string
}

interface DaYunCycle {
  startAge: number
  endAge: number
  stemBranch: string
  stemTenGod: string
  branchTenGod: string
  description: string   // 如"七杀/偏印"
}

interface BaZiResult {
  yearPillar: BaZiPillar
  monthPillar: BaZiPillar
  dayPillar: BaZiPillar
  hourPillar: BaZiPillar | null    // birth_hour 未设置时为 null
  dayMaster: string                 // 日主天干
  dayMasterWuxing: string
  dayMasterStrength: '强' | '偏强' | '中和' | '偏弱' | '弱'
  favorableElements: string[]       // 喜用神
  unfavorableElements: string[]     // 忌神
  elementCounts: Record<string, number>  // {木: 2, 火: 3, 土: 1, 金: 2, 水: 4}
  elementPercentages: Record<string, number> // {木: 16.7, 火: 25, 土: 8.3, 金: 16.7, 水: 33.3}
  daYun: DaYunCycle[]
  birthYear: number
  birthCalendar: 'solar' | 'lunar'
  birthHour: number | null
  gender: '男' | '女' | null
}
```

### 4.4 计算引擎：`composables/useBaZi.ts`

纯函数，Profile → BaZiResult，需要 `useSolarTerms.ts` 提供节气数据。

#### 年柱

```
年干 = (birthYear - 4) % 10 → index（0=甲, 1=乙, ..., 9=癸）
年支 = (birthYear - 4) % 12 → index（0=子, 1=丑, ..., 11=亥）

立春边界：
  若 birth_calendar === 'solar' 且 出生日期 < 当年立春日期：
    年干 = (birthYear - 5) % 10
    年支 = (birthYear - 5) % 12
  否则不变。
```

#### 月柱

使用五虎遁（Wu Hu Dun）确定月干：

```
年干 → 月干起始表：
  甲/己年 → 月干起始 = 丙(2)
  乙/庚年 → 月干起始 = 戊(4)
  丙/辛年 → 月干起始 = 庚(6)
  丁/壬年 → 月干起始 = 壬(8)
  戊/癸年 → 月干起始 = 甲(0)

月干 = (月干起始 + monthIndex) % 10

月支（固定，按节气确定月令）：
  寅月(2) = 立春-惊蛰  卯月(3) = 惊蛰-清明
  辰月(4) = 清明-立夏  巳月(5) = 立夏-芒种
  午月(6) = 芒种-小暑  未月(7) = 小暑-立秋
  申月(8) = 立秋-白露  酉月(9) = 白露-寒露
  戌月(10)= 寒露-立冬  亥月(11)= 立冬-大雪
  子月(0) = 大雪-小寒  丑月(1) = 小寒-立春

monthIndex = (月支索引 - 2 + 12) % 12（寅=0, 卯=1, ..., 丑=11）
```

#### 日柱

利用 1900-01-01（甲子日，stem=0, branch=0）作为基准日期：

```
// 计算从 1900-01-01 到目标日期的天数
function daysFromBase(year: number, month: number, day: number): number {
  // 处理 1/2 月作为前一年（便于闰年计算）
  let y = month <= 2 ? year - 1 : year
  let m = month <= 2 ? month + 12 : month
  // 计算到公元元年的天数，再减去到 1900 的天数
  const days = 365 * (y - 1)
    + Math.floor((y - 1) / 4)
    - Math.floor((y - 1) / 100)
    + Math.floor((y - 1) / 400)
    + Math.floor((367 * m - 362) / 12)
    + (m <= 2 ? 0 : (isLeapYear(year) ? -1 : -2))
    + day - 1
  // 1900-01-01 的 days ≈ 693595 (从公元元年开始)
  return days - BASE_1900_DAYS  // BASE_1900_DAYS = 693595
}

日干索引 = daysFromBase % 10
日支索引 = daysFromBase % 12
```

#### 时柱

用五鼠遁（Wu Shu Dun）确定时干：

```
日干 → 时干起始表：
  甲/己日 → 时干起始 = 甲(0)
  乙/庚日 → 时干起始 = 丙(2)
  丙/辛日 → 时干起始 = 戊(4)
  丁/壬日 → 时干起始 = 庚(6)
  戊/癸日 → 时干起始 = 壬(8)

时支（固定）：
  子(0)=23-01, 丑(1)=01-03, 寅(2)=03-05, 卯(3)=05-07
  辰(4)=07-09, 巳(5)=09-11, 午(6)=11-13, 未(7)=13-15
  申(8)=15-17, 酉(9)=17-19, 戌(10)=19-21, 亥(11)=21-23

时干 = (时干起始 + hourBranchIndex) % 10
hourBranchIndex = (birthHour + 1) % 12
```

若 `birth_hour` 为 null，时柱返回 null，页面显示占位符。

#### 十神

日干（日主）与其他天干的关系：

| 关系 | 定义 | 十神 |
|------|------|------|
| 同我·同阴阳 | 天干相同 | 比肩 |
| 同我·异阴阳 | 同五行不同阴阳 | 劫财 |
| 生我·同阴阳 | 生我且阴阳相同 | 偏印 |
| 生我·异阴阳 | 生我且阴阳不同 | 正印 |
| 我生·同阴阳 | 我生且阴阳相同 | 食神 |
| 我生·异阴阳 | 我生且阴阳不同 | 伤官 |
| 克我·同阴阳 | 克我且阴阳相同 | 偏官（七杀） |
| 克我·异阴阳 | 克我且阴阳不同 | 正官 |
| 我克·同阴阳 | 我克且阴阳相同 | 偏财 |
| 我克·异阴阳 | 我克且阴阳不同 | 正财 |

天干五行属性：
- 甲=木(阳), 乙=木(阴), 丙=火(阳), 丁=火(阴)
- 戊=土(阳), 己=土(阴), 庚=金(阳), 辛=金(阴)
- 壬=水(阳), 癸=水(阴)

#### 地支藏干

| 地支 | 藏干（主→中→余） |
|------|----------------|
| 子 | 癸 |
| 丑 | 己癸辛 |
| 寅 | 甲丙戊 |
| 卯 | 乙 |
| 辰 | 戊乙癸 |
| 巳 | 丙庚戊 |
| 午 | 丁己 |
| 未 | 己丁乙 |
| 申 | 庚壬戊 |
| 酉 | 辛 |
| 戌 | 戊辛丁 |
| 亥 | 壬甲 |

藏干十神同样按日主计算。

#### 五行统计

统计四柱中所有天干 + 地支藏干的五行出现次数：

```
counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
遍历 年/月/日/时柱 的 stem → 加对应五行
遍历 年/月/日/时柱 的 hiddenStems → 加对应五行
percentages = 各元素 counts / 总计数 × 100
```

#### 日主强弱（简化版）

基于月令（Month Order）判断：

| 日主五行 | 旺（得令）月 | 相（次旺）月 | 休 | 囚 | 死 |
|---------|------------|------------|-----|-----|-----|
| 木 | 寅、卯（春） | 亥、子（冬） | 巳、午 | 辰、戌、丑、未 | 申、酉 |
| 火 | 巳、午（夏） | 寅、卯（春） | 辰、戌、丑、未 | 申、酉 | 亥、子 |
| 土 | 辰、戌、丑、未（四季） | 巳、午（夏） | 申、酉 | 亥、子 | 寅、卯 |
| 金 | 申、酉（秋） | 辰、戌、丑、未 | 亥、子 | 寅、卯 | 巳、午 |
| 水 | 亥、子（冬） | 申、酉（秋） | 寅、卯 | 巳、午 | 辰、戌、丑、未 |

得令（旺）== 强；得相（次旺）== 偏强；休囚 == 中和；死 == 偏弱/弱

#### 大运排盘

```
阳男阴女 → 顺排（从月柱顺推）
阴男阳女 → 逆排（从月柱逆推）

顺排 = 月柱干支 +1 每运
逆排 = 月柱干支 -1 每运

起运年龄：
  从出生日到下一个（顺排）/上一个（逆排）节气日
  三天 = 一岁，一天 = 四个月，一个时辰 = 十天
  // Phase 3 简化：固定起运年龄从月柱推算
  // 更精确的起运计算在 Phase 3 后续完善

每运 10 年
```

### 4.5 节气数据：`composables/useSolarTerms.ts`

内置 1900-2100 年间关键节气日期（立春、惊蛰、清明、立夏、芒种、小暑、立秋、白露、寒露、立冬、大雪、小寒）的压缩查找表。

数据结构：

```typescript
interface SolarTermEntry {
  month: number   // 公历月份 (1-12)
  day: number     // 公历日期 (1-31)
}

// 按年份索引，每个节气存 month/day
type SolarTermTable = Record<number, SolarTermEntry[]>
// 12 个节气顺序: 立春, 惊蛰, 清明, 立夏, 芒种, 小暑, 立秋, 白露, 寒露, 立冬, 大雪, 小寒
```

查找函数：

```typescript
function getSolarTerm(year: number, termIndex: number): { month: number, day: number }
// termIndex: 0=立春, 1=惊蛰, 2=清明, 3=立夏, 4=芒种, 5=小暑, 6=立秋, 7=白露, 8=寒露, 9=立冬, 10=大雪, 11=小寒

function getMonthPillar(year: number, month: number, day: number, calendar: 'solar' | 'lunar'): { stem: string, branch: string }
```

### 4.6 组件拆分

| 组件 | 文件 | 说明 |
|------|------|------|
| `BaziGrid` | `components/tools/bazi/BaziGrid.vue` | 四柱排盘核心表（年/月/日/时柱，含十神、藏干） |
| `ElementAnalysis` | `components/tools/bazi/ElementAnalysis.vue` | 五行统计条形图 + 分析 |
| `DayMasterCard` | `components/tools/bazi/DayMasterCard.vue` | 日主强弱 + 喜忌神卡片 |
| `DaYunTimeline` | `components/tools/bazi/DaYunTimeline.vue` | 大运时间线（桌面端flex row + 移动端横向滚动卡片） |
| `BaziInfoSidebar` | `components/tools/bazi/BaziInfoSidebar.vue` | 侧栏：基础信息 + 五行概览 + 日主摘要（移动端折叠为顶部栏） |

## 五、通用组件复用

| 组件 | 用途 |
|------|------|
| `ToolPageLayout` | 两栏布局（主内容+侧栏/移动端导航） |
| `InkDivider` | 章节分隔标题 |
| `PageHero` | 页面标题区域（若需要） |
| `SkeletonCard` | 加载骨架 |
| `SkeletonBars` | 加载骨架条 |

## 六、加载与空状态

| 状态 | 展示 |
|------|------|
| Loading | SkeletonCard 占位 |
| 缺少 birth_date | "请先完善出生信息"+ 链接到档案 |
| 缺少 birth_hour | 四柱正常显示，时柱显示"——" + 提示文字 |
| 数据就绪 | 完整排盘展示 |

## 七、动画

参考 Phase 2 动画方案，按模块依次 fadeIn：

| 模块 | delay | 动画 |
|------|-------|------|
| 四柱排盘表 | 50ms | fadeIn |
| 五行旺衰 | 200ms | fadeIn + 条形图从 0 到目标值 |
| 日主分析 | 300ms | fadeIn |
| 大运时间线 | 400ms | fadeIn + stagger 80ms，当前运红色高亮 |
| 侧栏信息 | 100ms | fadeIn |

## 八、未定事项

- **神煞系统**（天乙贵人、桃花、华盖等）在 Phase 4 加入
- **合婚匹配**（双方八字对比）在 Phase 4+ 
- **流年详批**（流年与大运交互分析）在 Phase 4+
- **起运年龄精确计算**（按节气日数 ÷3）需要进一步测试后完善
