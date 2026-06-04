# Batch 4B：星座星盘完整版 — 设计文档

> **日期：** 2026-06-04
> **状态：** 设计中 → 待撰写实现计划
> **前置条件：** Batch 4A 已完成（`phase/batch-4a` 分支，待合并）
> **参考路线图：** `docs/superpowers/plans/2026-05-31-xuandao-phase-7-plus-roadmap.md` §4.3

---

## 一、概述

### 1.1 目标

在现有星座工具中新增 SVG 星盘可视化组件（本命盘 / Natal Chart），展示七曜（日月水金火木土）在 12 星座和 12 宫位中的分布、行星间相位关系，以及对应的解读文字。

### 1.2 现有星座工具状态

星座页面（`pages/tools/constellation.vue`）已实现：

- 12 星座基本信息（`ZODIACS` 数组）
- 今日运势（基于日心黄经的天文算法）
- 月亮星座（`getMoonSign()`，平黄经 ~5° 误差）
- 上升星座（`getRisingSign()`，简化恒星时公式）
- 星座速配（元素匹配 + 手风琴解释）
- 「三垣·星盘」卡片区（太阳/月亮/上升三卡）

**缺口：** 没有星盘图——用户看不到行星在真实天空中的分布，也无法理解各行星之间的关系。

### 1.3 范围

| 包含 | 不包含 |
|------|--------|
| 七曜（日月水金火木土）位置计算 | 天王星、海王星、冥王星 |
| Whole Sign House 宫位制 | Placidus / Koch 等需要经纬度的宫位制 |
| 5 种主要相位（合/六合/刑/三合/冲） | 次要相位（半六合、梅花相位等） |
| SVG 2D 圆形星盘渲染 | 3D 天文馆效果 |
| 72 条行星 × 星座解读 | 引用单一权威古籍 |
| TypeScript + Nuxt 3 + Vitest + `astronomy-engine` | — |

### 1.4 设计原则

- **计算正确性优先**：行星位置误差 < 3°（30° 扇区判定 100% 可靠，边界情况标记警告）
- **墨韵设计体系内**：复用现有色板、字体、组件类，不引入新设计语言
- **渐进增强**：无年份 → 不渲染星盘；无时辰 → 有行星无宫位；有时辰 → 完整星盘
- **混合 SVG+DOM**：SVG 画几何，DOM 放文字和交互（沿袭 `ZiWeiCelestialChart.vue` 的成熟模式）

---

## 二、计算引擎：`composables/useNatalChart.ts`

### 2.1 行星位置：委托 `astronomy-engine`

**依赖：** [`astronomy-engine`](https://www.npmjs.com/package/astronomy-engine) v2.x（MIT，零依赖）
**精度：** ±1 弧分（VSOP87 行星理论 + JPL Horizons 验证）

不使用手写 Kepler 轨道根数——`astronomy-engine` 的 `GeoVector()` + `Ecliptic()` 直接返回地心黄经，一次性解决了：轨道计算、中心差、地心转换、光行差、章动修正。

```typescript
import { GeoVector, Ecliptic, Body } from 'astronomy-engine'

// 获取火星地心黄经——一行代码
const geo = GeoVector(Body.Mars, birthDate, true)  // true = 光行差修正
const ecl = Ecliptic(geo)
// ecl.elon = 地心黄经 (0-360°)
// ecl.elat = 黄纬 (-90~90°)
```

**`useNatalChart.ts` 的职责从「行星计算」变为「数据组装」：**

```
输入: birthYear, birthMonth, birthDay, birthHour

1. 构造 birthDate = new Date(Date.UTC(birthYear, birthMonth-1, birthDay, 12, 0, 0))
2. 对 7 颗行星逐一调用 GeoVector() + Ecliptic()
3. elon → signIndex = floor(elon / 30)
4. 组装 PlanetPosition[]
```

**七曜与 `Body` 枚举的映射：**

| 行星 | `Body` 枚举 | ID |
|------|-----------|-----|
| ☉ 太阳 | `Body.Sun` | sun |
| ☽ 月亮 | `Body.Moon` | moon |
| ☿ 水星 | `Body.Mercury` | mercury |
| ♀ 金星 | `Body.Venus` | venus |
| ♂ 火星 | `Body.Mars` | mars |
| ♃ 木星 | `Body.Jupiter` | jupiter |
| ♄ 土星 | `Body.Saturn` | saturn |

> 💡 `astronomy-engine` 也支持天王星/海王星/冥王星——不需要额外代价。如果将来需要，加一行映射即可。本期不包含（无对应的 12 星座解读数据）。

### 2.2 逆行检测

原理不变（连续两天黄经对比），但用 `astronomy-engine` 取值：

```typescript
function isRetrograde(body: Body, birthDate: Date): boolean {
  const today = Ecliptic(GeoVector(body, birthDate, true)).elon
  const tomorrow = Ecliptic(GeoVector(body, new Date(birthDate.getTime() + 86400000), true)).elon
  return tomorrow < today  // 黄经递减 = 逆行
}
```

### 2.3 现有函数保留策略

`useConstellation.ts` 中已有 `solarLongitude()` 和 `lunarLongitude()` 继续用于：

| 函数 | 用途 | 状态 |
|------|------|------|
| `solarLongitude()` | 今日运势评分的日心角度计算 | **保留**（运势不需要 astrometry-engine 精度） |
| `lunarLongitude()` | 月亮星座单独查询 | **保留**（保持向后兼容） |
| `getRisingSign()` | 上升星座计算（用于星盘 Asc + Whole Sign House 宫位起点） | **保留 + 复用** |

**星盘不调用 `solarLongitude()` 或 `lunarLongitude()`**——直接用 `astronomy-engine`。两个系统共存但互不依赖。

### 2.4 相位计算

对七曜两两配对（C(7,2) = 21 对），检查角度差：

| 相位 | 角度 | 容许度 | 符号 | 线型 |
|------|------|--------|------|------|
| 合相 (conjunction) | 0° | ±8° | ☌ | 实线, jade |
| 六合 (sextile) | 60° | ±6° | ⚹ | 虚线, jade |
| 刑 (square) | 90° | ±6° | □ | 实线, cinnabar |
| 三合 (trine) | 120° | ±6° | △ | 实线, jade |
| 对冲 (opposition) | 180° | ±8° | ☍ | 实线, cinnabar |

**降噪规则：**
- 默认仅展示**紧密相位**（orb ≤ 最大容许度的一半）
- 合相且两星同星座 → 不画穿过圆心的直线，改画星盘外侧的小弧线
- 所有相位线 opacity 0.2-0.25，hover 时提升至 0.5
- 合相判定用 `angularDistance()`（复用 `useConstellation.ts` 已有函数），结果归一化为 0-180°

### 2.6 宫位计算：Whole Sign House

不使用 Equal House（需要精确 Asc 度数，但我们 Asc 依赖假设经纬度）。改用 Whole Sign House：

```
Asc 落入的星座 = 第 1 宫（整宫）
下一个星座     = 第 2 宫
...
Asc 前一星座   = 第 12 宫

// 宫头线（仅用于 SVG 绘制）：
houseCusp[i] = (AscSignIndex + i - 1) × 30°  // i = 1..12
```

宫头线与星座扇区边界完全重合——简化了两套扇区的视觉复杂度。

### 2.7 输出类型

```typescript
interface PlanetPosition {
  id: 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn'
  name: string                // 中文名
  glyph: string               // Unicode 符号
  longitude: number           // 地心黄经 0-360°
  signIndex: number           // 0=Aries..11=Pisces
  signName: string
  signSymbol: string          // ♈♉♊...
  houseIndex: number | null   // 1-12，无时辰时为 null
  retrograde: boolean
  boundaryWarning: boolean    // 在星座边界 ±2° 内
}

interface AspectLine {
  p1: string                  // planet id
  p2: string
  type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  angle: number               // 实际角度差 0-180°
  orb: number                 // 与精确相位的偏差
}

interface NatalChartData {
  planets: PlanetPosition[]
  aspects: AspectLine[]
  ascSignIndex: number | null
  ascLongitude: number | null
  mcLongitude: number | null
  hasHouses: boolean          // birthHour !== null
}
```

---

## 三、SVG 星盘组件：`NatalChart.vue`

### 3.1 架构：混合 SVG + DOM

沿用 `ZiWeiCelestialChart.vue`（1030 行）的成熟模式：

- **SVG 层**（`z-index: 0`）：圆形轨道、扇区分隔线、Asc 线、相位连线、行星底圆
- **DOM 层**（`z-index: 1-3`）：星座符号文字、宫位编号、行星 glyph 标签、中心标识、tooltip（`z-index: 20`）

所有文字通过 DOM 渲染，避免 SVG `<text>` 在中文环境下的跨浏览器字体问题。

### 3.2 几何模型

```
viewBox = "0 0 600 600"
CX = 300, CY = 300

r=0                              圆心
  r=18                           中心 "命" 字印章
    r=60-85                      ☉☽ 日月（inner ring）
      r=100-130                  ☿♀♂ 水火金（mid ring）
        r=145-165                ♃♄ 木土（outer ring）
          r=180-200             宫位编号（DOM 文字）
            r=210-250           相位线渲染区
              r=255-275         星座符号（DOM 文字）
                r=280-292       外圈装饰线
                  r=300         容器边界
```

行星半径环按类型分配以避免碰撞：
- inner（r=72）：太阳、月亮
- mid（r=115）：水星、金星、火星
- outer（r=155）：木星、土星

### 3.3 关键：角度映射公式

星盘 Astrolog 标准布置：
- Asc（上升点）→ 星盘左侧（9 点钟，SVG 180°）
- 宫位从 Asc 开始逆时针编号

```
// 行星在 SVG 上的角度
relativeAngle = (planet.longitude - ascLongitude + 360) % 360
svgDeg = 180 - relativeAngle
svgRad = svgDeg × π / 180

x = CX + r × cos(svgRad)
y = CY + r × sin(svgRad)
```

**‼ 验证表（实现时必须通过）：**

| 位置 | 黄经 | relativeAngle | svgDeg | SVG 方向 |
|------|------|--------------|--------|---------|
| Asc | = Asc | 0° | 180° | 9 点钟 ✓ |
| IC | Asc+90° | 90° | 90° | 6 点钟 ✓ |
| DSC | Asc+180° | 180° | 0° | 3 点钟 ✓ |
| MC | Asc+270° | 270° | 270° | 12 点钟 ✓ |

> ⚠️ 这个公式与 ZiWeiCelestialChart 的 `BRANCH_TO_ANGLE` 完全不同，不可混用。ZiWei 用固定地支→角度映射，星盘用动态 Asc→角度映射。

### 3.4 行星碰撞处理

- 碰撞阈值：两颗行星黄经差 < 5°
- 当行星在同一星座内碰撞：按类型分配到不同半径环（inner/mid/outer）
- 极端情况（3 颗以上同环）：做 ±3° 微小角偏移
- 星群（≥3 颗行星在 5° 内）：tooltip 标注「星群聚集 — 该区域能量极强」，所有星聚合显示

### 3.5 图层分解

| 层 | z-index | 内容 | 实现 |
|----|---------|------|------|
| 0 | 0 | 外圈装饰圆、宫头分隔线、Asc 粗线(朱砂)、相位连线、行星底圆、中心圆 | SVG |
| 1 | 1 | 12 宫位标号（第1-12宫） | DOM（百分比定位） |
| 2 | 2 | 12 星座符号（♈♉♊…）、7 行星 glyph+名称+逆行℞标记 | DOM（百分比定位） |
| 3 | 3 | 中心「命」字印章 + Asc度数标注 | DOM |
| 20 | 20 | Tooltip | DOM |

### 3.6 交互

**行星 hover（`:hover` CSS + `mouseenter` handler）：**
- `transform: scale(1.25)` 放大（200ms transition）
- 该行星参与的相位线高亮（加粗 + opacity → 0.5）
- Tooltip 显示：
  ```
  太阳 ☉
  落入：狮子座 · 第 5 宫
  [解读文本，30-40 字]
  相位：☌ 月亮(合)  △ 木星(三合)
  逆行中 ℞（如适用）
  ```

**相位线 hover：**
- 线加粗、两端行星同时高亮
- Tooltip 显示相位类型 + 解释

**Tooltip 定位：**
- 桌面端（> 640px）：星盘右侧固定位置
- 移动端（≤ 640px）：星盘下方
- 不使用随鼠标浮动的定位（避免 `getBoundingClientRect` 在 `nextTick` 中的抖动问题）

### 3.7 无宫位时的降级渲染

当 `birthHour === null`（无出生时辰）：
- 仍绘制 12 星座扇区线（星座边界不依赖时辰）
- 不绘制 Asc/MC 线
- 不显示宫位编号
- 行星 tooltip 仅显示「落入：狮子座」，不显示「第 X 宫」
- 相位线正常绘制

### 3.8 配色

| 元素 | 颜色 | CSS |
|------|------|-----|
| 外圈装饰圆 | 淡墨 | `stroke-ink-faint opacity-20` |
| 星座扇区分隔线 | 微淡墨虚线 | `stroke-ink-faint opacity-10 stroke-dasharray="2,4"` |
| Asc 线 | 朱砂 | `stroke-cinnabar opacity-50 stroke-width-1.5` |
| MC 线 | 金 | `stroke-gold opacity-35` |
| 行星底圆 | 按行星 | `☉=gold ☽=ice ☿=jade ♀=jade ♂=cinnabar ♃=purple ♄=gray` |
| 吉相位线（合/三合/六合） | 玉色半透明 | `stroke-jade opacity-20` |
| 凶相位线（刑/冲） | 朱砂半透明 | `stroke-cinnabar opacity-18` |
| 中心印章 | 朱砂底 + 金边 | 同 ZiWei 印章样式 |
| Tooltip 背景 | 纸卡色 | `card-warm` |

### 3.9 响应式

```
> 600px: 容器 max-width 600px，全尺寸
360-600px: 行星圆缩小至 70%，星座字号 -20%，相位线 ≤ 6 条
< 360px: 隐藏相位线，tooltip 字体缩小
```

### 3.10 动画

```css
/* 仅当 prefers-reduced-motion: no-preference 时启用 */
星盘容器: fade-in + scale(0.92→1)，600ms
行星逐个浮现: 每个延迟 80ms，7 个总计 560ms
相位线最后画出: 延迟 600ms，每根线 80ms 间隔

/* prefers-reduced-motion: reduce → 所有元素直接显示，无动画 */
```

### 3.11 无障碍

- `role="img"` + `aria-label="本命星盘 — 七曜分布图"`
- 行星按钮：`aria-label="太阳☉ 狮子座 第5宫"`
- `aria-live="polite"` 同步 tooltip 文字到屏幕阅读器
- Tab 键在 7 个行星间移动，Enter 展开详情
- 键盘方向键切换选中行星

---

## 四、解释数据

### 4.1 预置常量规模

| 数据类型 | 条目数 | 存放位置 | 每条字数 |
|---------|--------|---------|---------|
| 行星元数据（glyph/中文名/颜色环） | 7 组 | `constants/planet-data.ts` | 参数值 |
| 太阳 × 星座解读 | 12 条 | 同上 | 30-40 字 |
| 月亮 × 星座解读 | 复用已有 `MOON_INTERPRETATIONS` | `useConstellation.ts` | 已有 |
| 水星 × 星座解读 | 12 条 | `constants/planet-data.ts` | 30-40 字 |
| 金星 × 星座解读 | 12 条 | 同上 | 30-40 字 |
| 火星 × 星座解读 | 12 条 | 同上 | 30-40 字 |
| 木星 × 星座解读 | 12 条 | 同上 | 30-40 字 |
| 土星 × 星座解读 | 12 条 | 同上 | 30-40 字 |
| 相位解释 | 5 条 | 同上 | 20-30 字 |
| **合计新写** | **77 条** | | |

> 数据来源说明：解读文字基于通用星座命理知识合成，与项目现有解读数据（生肖、紫微、八字）一致的质量标准，非引用单一权威古籍。每条确保自洽、不矛盾、符合基本占星逻辑。

### 4.2 解读数据结构

```typescript
// constants/planet-data.ts

export const PLANET_SIGN_INTERPRETATIONS: Record<string, Record<string, string>> = {
  'sun': {
    '白羊座': '太阳在白羊，意志如烈火，行动力极强，勇往直前，是天生的开创者与领袖。',
    '金牛座': '太阳在金牛，意志坚定稳健，重视物质积累与感官满足，不轻易动摇。',
    // ... 10 more
  },
  'mercury': {
    '白羊座': '水星在白羊，思维敏捷直接，说话不拐弯抹角，学习靠冲劲而非耐心。',
    '金牛座': '水星在金牛，思维稳健务实，学习慢但根基扎实，不喜空谈只重实际。',
    // ... 10 more
  },
  // venus, mars, jupiter, saturn: 各 12 条
}

export const ASPECT_INTERPRETATIONS: Record<string, string> = {
  'conjunction': '合相——两颗星能量融合，相互强化，影响最为直接有力。',
  'sextile': '六合——两颗星互相激发，带来机遇与创造力，需主动把握。',
  'square': '刑相——两颗星相互制约，带来内在张力，也是成长的催化剂。',
  'trine': '三合——两颗星和谐共振，天赋所在，顺势而为即有所成。',
  'opposition': '对冲——两颗星相互拉扯，需在两极之间寻找平衡与整合。',
}
```

---

## 五、测试与验证

### 5.1 验算策略

`astronomy-engine` 自带精度保证（VSOP87 + JPL Horizons 验证，±1 弧分），**不需要手写参考案例验证**。测试重点转移到：

- ✅ 数据组装正确性：行星 ID → 中文名 → glyph → 星座映射
- ✅ 相位检测算法：`angularDistance()` + orb 判定
- ✅ Whole Sign House 宫位划分
- ✅ 逆行检测逻辑
- ✅ 边界处理：null 时辰、无效年份、星座边界

### 5.2 测试文件

```
tests/composables/useNatalChart.test.ts  — 数据组装 + 边界测试，约 150 行
```

包括：
- 7 颗行星字段组装完整性（name/glyph/signIndex/houseIndex 均不为空）
- 相位检测基础案例（已知角度差的假数据验证 5 种相位判定）
- Whole Sign House 宫位划分（假 Asc 星座验证宫号映射）
- 逆行检测（固定日期验证已知逆行期的水星/金星）
- 边界情况：`birthYear === null`、`birthHour === null`、无效日期

### 5.3 SVG 组件验证

SVG 星盘组件不编写单元测试（纯视觉组件），通过以下方式验证：
- TypeScript 类型检查（`npx nuxi typecheck`）
- 手动视觉验证（dev server + 多种出生日期测试）
- 响应式测试（320px / 375px / 768px / 1024px）

---

## 六、文件结构

```
constants/
  planet-data.ts              ← 新增：行星元数据(glyph/中文名/颜色环) + 72条行星解读 + 5条相位解释 (~250行)
composables/
  useNatalChart.ts            ← 新增：调用 astronomy-engine → 数据组装 → 相位 + 宫位 (~120行)
  useConstellation.ts         ← 不变（solarLongitude/lunarLongitude/getRisingSign 保留，用于运势评分）
components/tools/constellation/
  NatalChart.vue              ← 新增：SVG+DOM 混合星盘组件 (~450行)
pages/tools/
  constellation.vue           ← 修改：新增星盘 section（+30行）
tests/composables/
  useNatalChart.test.ts       ← 新增：数据组装 + 边界测试 (~150行)
```

---

## 七、边界与降级

| 条件 | 行为 |
|------|------|
| `birthYear === null` | 星盘 section 不渲染，显示「请完善出生年份」 |
| `birthYear < 1900` 或 `> 2100` | 仍计算但 tooltip 显示 ⚠「超出公式最佳范围」 |
| `birthHour === null` | 正常绘制行星+相位，无宫位线/编号，tooltip 不含宫位 |
| `birthHour === 0` | 有效时辰（子时），完整星盘 |
| 星座边界 ±2° | `boundaryWarning=true`，tooltip 显示「靠近 XX 与 YY 交界」 |
| 2 星 < 5° | 碰撞去重到不同半径环 |
| ≥3 星 < 5°（星群） | 聚合显示 + tooltip 标注「星群聚集」 |
| 无紧密相位（orb 全 > 一半） | 仅显示合相线，其余不画 |

---

## 八、数据流

```
Profile (birth_date, birth_hour)
    │
    ▼
parseDate()  →  { year, month, day }
    │
    ▼
calculateNatalChart(year, month, day, birthHour)
    │
    ├─→ computePlanetPositions(date)     → PlanetPosition[7]
    ├─→ computeAspects(positions)        → AspectLine[]
    ├─→ computeHouses(ascLongitude)      → House[12] | null
    │
    ▼
NatalChartData
    │
    ▼
<NatalChart :data="natalChartData" />
    │
    ├─→ SVG 层: 几何图形
    └─→ DOM 层: 文字 + 交互
```

与现有 `calculateConstellation()` 独立运行——星盘数据是新增字段，不影响现有运势/宜忌/速配逻辑。`constellation.vue` 页面在 `calculateConstellation()` 之后额外调用 `calculateNatalChart()`。

---

## 九、实现后验收清单

- [ ] `npx nuxi typecheck` 零错误
- [ ] `npx vitest run` 全部通过（含新增 `useNatalChart.test.ts`）
- [ ] 三个参考日期行星位置误差 < 3°
- [ ] 星座判定 100% 正确（边界情况有 warning 标记）
- [ ] 星盘在 375px/768px/1024px 下布局正常
- [ ] `prefers-reduced-motion: reduce` 关掉动画
- [ ] 无出生年份时不渲染星盘 section
- [ ] 无出生时辰时渲染简化星盘（无宫位）
- [ ] 键盘导航可达 7 颗行星
- [ ] screen reader 读出 aria-label
- [ ] 墨韵配色一致，无越界元素
