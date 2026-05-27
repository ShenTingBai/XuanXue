# Ziwei Doushu (紫微斗数) — Phase 6 Design Spec

## 概述

在 XuanXue 中实现完整的紫微斗数工具。包含排盘引擎（基于 iztro）、**双视图命盘**（天星图 / 回宫图）、星曜解读、大限时间轴、自动保存。

---

## 1. 技术栈

- **排盘引擎**: [iztro](https://github.com/SylarLong/iztro) v2.5.8 (MIT, TypeScript)
  - `astro.bySolar(dateStr, timeIndex, gender, fixLeap, lang)` 返回完整命盘
  - `astrolabe.horoscope(date)` 获取运限数据
- **适配层**: `composables/useZiwei.ts` — 包装 iztro API，适配为应用数据模型
- **UI**: 现有墨韵设计系统 + TailwindCSS，复用 `ToolPageLayout` 三栏布局
- **天星图渲染**: SVG 手绘轨道环 + 绝对定位 DOM 星体（不使用 Canvas）

---

## 2. 数据模型

### 2.1 iztro 适配层

iztro 返回的 `FunctionalAstrolabe` 包含完整命盘数据。`useZiwei.ts` 做适配转换而非重新建模：

```typescript
interface ZiWeiStar {
  name: string           // 星曜名称
  type: string           // 星曜类型
  brightness?: string    // 亮度: "庙"|"旺"|"得"|"利"|"平"|"不"
  mutagen?: string       // 四化: "禄"|"权"|"科"|"忌"（在星上，非独立数组）
}

interface ZiWeiPalace {
  index: number          // 0-11
  name: string           // 命宫、兄弟、夫妻...
  earthlyBranch: string  // 寅、卯、辰...
  heavenlyStem: string   // 甲、乙、丙...
  isBodyPalace: boolean   // 是否身宫
  majorStars: ZiWeiStar[] // 主星
  minorStars: ZiWeiStar[] // 辅星
  adjectiveStars: ZiWeiStar[] // 杂曜
  decadalRange: [number, number] // 大限起止年龄 e.g. [25, 34]
  ages: number[]         // 小限年龄
}

interface ZiWeiResult {
  earthlyBranchOfSoulPalace: string  // 命宫地支
  earthlyBranchOfBodyPalace: string  // 身宫地支
  fiveElementsClass: string          // 五行局 e.g. "水二局"
  palaces: ZiWeiPalace[]            // 12 宫
  soul: string                       // 命主
  body: string                       // 身主
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number | null           // iztro timeIndex (0-12)
  gender: 'male' | 'female' | null
}
```

> 四化以 `star.mutagen` 形式存在于每颗星上，使用遍历星收集。可在页面层扁平化为列表。

### 2.2 规则模板解读结构

为每宫准备结构化解读模板（非 AI 生成）：

```typescript
interface PalaceInterpretation {
  palaceName: string
  summary: string       // 宫位特性总述
  starCombinations: string[]  // 星曜组合解读
  daXianAdvice: string  // 大限流年建议
}
```

规则模板存储在 `constants/ziwei.ts` 中，`useZiwei.ts` 提供 `getPalaceInterpretation()` 方法。

---

### 2.3 iztro 时辰索引映射

iztro 的 `timeIndex` 参数（0-12）对应十二时辰：

```
0=早子时(0-1), 1=丑时(1-3), 2=寅时(3-5), 3=卯时(5-7),
4=辰时(7-9), 5=巳时(9-11), 6=午时(11-13), 7=未时(13-15),
8=申时(15-17), 9=酉时(17-19), 10=戌时(19-21), 11=亥时(21-23),
12=晚子时(23-0)
```

用户选择"时辰"（子丑寅卯...）后映射为对应索引。

---

## 3. 双视图设计

### 3.1 布局总览

```
┌──────────────────────────────────────────────────────────────┐
│  Header nav (已有)    [紫微斗数]                              │
├──────────────────────────────────────────────────────────────┤
│                    View 1       View 2                       │
│              ┌──────────┐ ┌──────────┐                      │
│              │ 天星图    │ │ 回宫图    │  ← tab bar           │
│              └──────────┘ └──────────┘                      │
├─────────────────────────────────┬────────────────────────────┤
│                                 │                            │
│   天星图 或 回宫图               │  Detail Panel              │
│   (根据选中 tab 切换)           │  ┌────────────────────┐   │
│                                 │  │ 命宫 · 寅           │   │
│                                 │  │ 紫微 · 天相         │   │
│                                 │  │ 左辅 · 禄存         │   │
│                                 │  │                    │   │
│                                 │  │ 命宫位于寅...       │   │
│                                 │  │ 紫微入命...         │   │
│                                 │  │                    │   │
│                                 │  │ 大限 3-12...       │   │
│                                 │  └────────────────────┘   │
│                                 │                            │
│  DaXian Timeline (shared)       │                            │
│  ───────────────────────────    │                            │
│                                 │                            │
│  History Button (右下角)        │                            │
└─────────────────────────────────┴────────────────────────────┘
```

### 3.2 布局要点

- **Tab 栏**：位于 Hero 下方、主区域上方，两个 tab 按钮：`天星图` / `回宫图`
- **主区域**（左/中）：根据 tab 选择显示天星图或回宫图，两者共享同一位置区域
- **右侧栏**（#nav-right slot）：sticky 定位，显示选中宫位的详细解读（两视图共享）
- **底部**：大限时间轴，位于 chart 区域下方（两视图共享）
- **移动端**（<xl）：右侧栏降级为底部抽屉或轮播；天星图/回宫图自适应缩小

### 3.3 Tab 切换行为

| 行为 | 说明 |
|------|------|
| 默认选中 | 首次排盘后默认显示天星图 |
| 切换 | 点击 tab 即时切换，无过渡动画（即切即显） |
| 宫位选中保持 | 切换视图时，已选中的宫位在两视图间保持同步高亮 |
| 天星图动画 | 只有天星图视图 active 时才运行 requestAnimationFrame 轨道漂移动画；切换到回宫图时取消动画帧 |
| 响应式重绘 | 窗口 resize 时天星图重新计算 scale 和标签位置 |

---

## 4. 组件树

```
pages/tools/ziwei.vue
├── ZiWeiInputForm.vue              # 日期+时辰+性别 输入表单
├── ZiWeiTabSwitcher.vue            # 天星图 / 回宫图 tab 切换按钮
├── ZiWeiCelestialChart.vue         # 天星图（view 1）
│   ├── <svg> orbit rings            # 手绘 SVG 轨道环 + 扇形分割线
│   ├── sector labels                # 宫位文字标签（绝对定位）
│   ├── star orbs                    # 每颗星的点状图标（按颜色分类）
│   ├── center seal                  # 中央紫微印章
│   └── 四化 chips                   # 浮动 chip 标签（化禄/权/科/忌）
├── ZiWeiPalaceGrid.vue             # 回宫图 4×4 网格（view 2）
│   └── ZiWeiPalaceCell.vue ×12     # 单个宫位格
├── ZiWeiDetailPanel.vue            # 右侧栏宫位解读（#nav-right）
├── ZiWeiDaXianTimeline.vue         # 大限时间轴（两视图共享）
├── ToolPageLayout                   # 三栏布局容器
├── HistoryModal                     # 历史记录（复用已有）
└── ZiWeiInfoSidebar                 # 个人信息摘要
```

---

## 5. 天星图渲染方案

### 5.1 技术选型

**采用 SVG + 绝对定位 DOM（不使用 Canvas）**。原因：

- SVG 轨道环可实现手绘风格的贝塞尔曲线 wobble——Canvas 需要额外复杂路径逻辑
- DOM 星体支持 CSS hover/click 事件、transition 动画、响应式缩放，无需命中检测
- 与墨韵设计系统的 TailwindCSS 样式体系天然兼容
- 无需处理 Canvas HiDPI/Retina 缩放问题

### 5.2 渲染层次（从下到上）

| 层级 | 元素 | 技术 |
|------|------|------|
| 0 (最底层) | 背景纸纹 | CSS body::after feTurbulence |
| 1 | SVG 轨道环 + 扇形分割线 | `<svg viewBox="0 0 600 600">` 内 `<path>` + `<line>` |
| 2 | conic-gradient 扇区高亮 | CSS `conic-gradient()` 在绝对定位容器上 |
| 3 | 宫位文字标签 | 绝对定位 `<div>`，`pointer-events: auto` |
| 4 | 星体 orbs + 标签 | 绝对定位 `<div>`，`pointer-events: auto` |
| 5 | 四化 chip 标签 | 绝对定位 `<div>`，`pointer-events: none` |
| 6 (最顶层) | 中央紫微印章 | 绝对定位居中，CSS animation 呼吸效果 |

### 5.3 轨道环绘制

- 使用 5 圈同心轨道环（内垣到外垣），半径分别为 100、145、185、225、255（以 viewBox 600x600 为基准）
- 每圈使用 **4 段三次贝塞尔曲线**拼合，锚点和控制点加入基于半径 seed 的微小扰动（1-2px 量级），模拟毛笔手绘的不完美感
- 扇形分割线：12 条从内环到外环的细线（朱砂色 0.5px），每个地支扇区起点一条

### 5.4 星体布局

- 每个地支扇区占 30°（360° / 12），从 0°（寅）逆时针分布
- 星体在同一扇区内按序均匀散布（间隔约 4°），半径在不同轨道环上交替放置
- 星体颜色按类型映射：金/朱砂/玉/冰/紫/灰/白 七色（`star-orb.cls-*`）

### 5.5 动画

- **轨道漂移**：每颗星以微小角速度（0.003-0.007 rad/frame）沿轨道缓慢旋转，模拟天体运行
- **闪烁**：每颗星透明度以不同 phase 做 `0.82 + 0.18 * sin(t * 1.5 + phase)` 的呼吸变化
- **选中脉冲环**：`chart-star.active::before` 实现 `@keyframes ring-pulse` 扩散动画
- 动画通过 `requestAnimationFrame` 驱动，仅在 天星图 tab active 时运行

### 5.6 响应式

- 天星图容器 `aspect-ratio: 1` 保证正方形
- `chartScale = container.offsetWidth / 600` 用于缩放所有坐标
- resize 时重新计算标签位置和星体坐标

---

## 6. 宫位格设计（回宫图）

回宫图采用传统紫微斗数 4×4 网格布局。

### 6.1 网格布局

```
┌─────┬─────┬─────┬─────┐
│ 辰   │ 巳   │ 午   │ 未   │  (row 0)
│ 夫妻 │ 子女 │ 财帛 │ 疾厄 │
├─────┼─────┼─────┼─────┤
│ 卯   │          │ 申   │  (row 1)
│ 兄弟 │  中央   │ 迁移 │
├─────┤  信息   ├─────┤
│ 寅   │          │ 酉   │  (row 2)
│ 命宫 │          │ 交友 │
├─────┼─────┼─────┼─────┤
│ 丑   │ 子   │ 亥   │ 戌   │  (row 3)
│ 父母 │ 福德 │ 田宅 │ 官禄 │
└─────┴─────┴─────┴─────┘
```

- 12 个边缘格子对应十二宫，4 个中心格子显示五行局/命主/身主/命宫信息
- 使用 CSS Grid `grid-template-columns: repeat(4, 1fr); aspect-ratio: 1`

### 6.2 每个宫位格从上到下

1. **顶栏**：地支（辰巳午未）+ 宫名标签
   - 命宫特殊高亮（朱砂色边框 + 标签）
2. **主星**（0-3 颗）：大字展示，朱砂色
   - 吉星彩色（紫微→金，天机→玉等）
   - 煞星暗色，显示亮度（庙/旺/陷）
3. **辅星**：小于主星的字号，墨色
4. **空宫**：显示 "(空)" 提示
5. **四化**：chip 样式彩色标签（化禄红、化权绿、化科蓝、化忌墨灰）
6. **大限**：底部小字年龄范围

### 6.3 交互

- 选中/悬停：朱砂色边框高亮 + 淡朱砂背景
- 点击宫位 → 更新 `selectedPalaceIdx` → 联动切换详情面板 + 高亮同步到天星图

---

## 7. 宫位解读系统

解读为纯规则模板（非 AI 生成），存储在 `constants/ziwei.ts` 中：

### 7.1 宫位特性

每宫一段总述文本，描述该宫在命盘中的基本含义：

```
命宫：代表一个人的先天禀赋、性格特质、人生走向。
兄弟宫：代表兄弟姐妹关系、朋友往来、人际互动。
夫妻宫：代表婚姻状况、配偶特征、感情生活。
...
```

### 7.2 星曜组合解读

基于宫位中的主星组合，匹配模板：

- 单星：如"紫微在命宫" → "紫微入命，帝王之星，性刚果断..."
- 双星：如"紫微+天相" → "紫微天相在命宫，辅弼之星入命..."
- 特殊组合：如"杀破狼"格局

### 7.3 大限解读

结合大限所在宫位 + 大限主星，生成简短的流年建议。

---

## 8. 交互流程

```
用户输入                  输入后自动排盘
┌──────────────┐        ┌──────────────────┐
│ 输入生辰      │ ───→   │ 显示完整命盘       │
│ 选择性别      │        │ + 默认选中命宫      │
│ 选择时辰      │        │ + 侧栏命宫解读      │
└──────────────┘        │ + 默认显示天星图    │
                         └──────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
            ┌──────────────┐     ┌──────────────┐
            │ 点击天星图 tab │     │ 点击回宫图 tab │
            └──────┬───────┘     └──────┬───────┘
                   │                   │
                   ▼                   ▼
            ┌──────────────┐     ┌──────────────┐
            │ 启动 rAF 动画 │     │ 停止 rAF 动画 │
            │ 显示轨道星图  │     │ 显示 4×4 网格 │
            └──────────────┘     └──────────────┘
                   │                   │
                   └─────────┬─────────┘
                             │
                   点击宫位/星 │
                             ▼
                    ┌──────────────┐
                    │ 高亮所选宫位   │
                    │ 侧栏切换解读   │
                    │ 大限联动高亮   │
                    │ 双视图同步状态 │
                    └──────┬───────┘
                           │
                自动保存   │
                           ▼
                    ┌──────────────┐
                    │ 静默保存到    │
                    │ Divinations  │
                    │ API          │
                    └──────────────┘
```

### 核心交互规则

- **两视图状态同步**：选中的宫位 ID 在 `selectedPalaceIdx` 共享——切换 tab 时高亮保持不变
- **点击目标不同但结果一致**：天星图点击 `sector-label` 或 `chart-star` 触发 `selectPalace()`；回宫图点击 `grid-cell` 触发同一方法
- **命宫默认选中**：排盘完成后默认选中命宫，两视图均高亮显示

---

## 9. API 集成

- **iztro**: 纯客户端计算，无服务端依赖
- **Divinations API**（已有 `POST /api/divinations`）
  - `type: 'ziwei'`（添加 `VALID_TYPES`）
  - 自动静默保存（fire-and-forget），不阻塞 UI
- **HistoryModal** 复用已有组件，type 过滤 `'ziwei'`
- **无额外服务端端点**——iztro 完全在浏览器运行

---

## 10. 文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `constants/ziwei.ts` | 新建 | 星曜解读、宫位特性、四化规则等模板 |
| `composables/useZiwei.ts` | 新建 | iztro 适配层 + 解读方法 |
| `components/tools/ziwei/ZiWeiInputForm.vue` | 新建 | 输入表单（生辰+性别+时辰） |
| `components/tools/ziwei/ZiWeiTabSwitcher.vue` | 新建 | 天星图 / 回宫图 tab 切换 |
| `components/tools/ziwei/ZiWeiCelestialChart.vue` | 新建 | 天星图（SVG 轨道环 + DOM 星体） |
| `components/tools/ziwei/ZiWeiPalaceGrid.vue` | 新建 | 回宫图 4×4 网格 |
| `components/tools/ziwei/ZiWeiPalaceCell.vue` | 新建 | 单个宫位格 |
| `components/tools/ziwei/ZiWeiDetailPanel.vue` | 新建 | 右侧栏宫位解读 |
| `components/tools/ziwei/ZiWeiDaXianTimeline.vue` | 新建 | 大限时间轴 |
| `components/tools/ziwei/ZiWeiInfoSidebar.vue` | 新建 | 个人信息摘要（#nav-right） |
| `pages/tools/ziwei.vue` | 新建 | 页面入口 |
| `layouts/default.vue` | 修改 | 导航栏启用 ziwei |
| `pages/index.vue` | 修改 | 首页启用 ziwei |
| `server/api/divinations/index.post.ts` | 修改 | VALID_TYPES 添加 'ziwei' |

---

## 11. 排除范围（Phase 6 不做）

- ❌ AI / LLM 生成的深度解读
- ❌ 三方四正可视化连线
- ❌ 3D 星体或粒子效果
- ❌ 合盘（双人对比）
- ❌ 流月/流日/流时（仅大限+流年基础）
- ❌ 自定排盘参数（仅 iztro 默认算法）

---

## 12. 成功标准

1. 输入生辰可正确排盘（与 iztro 示例命盘对账）
2. **天星图**正确渲染 5 圈手绘轨道环 + 12 扇区 + 所有星体
3. **回宫图**以 4×4 网格正确定位十二宫（含中央 2×2 信息区）
4. Tab 切换在天星图和回宫图之间即时切换
5. tab 切换后选中宫位在双视图间保持同步高亮
6. 点击天星图的宫位标签/星体可选中宫位并更新详情面板
7. 点击回宫图的格子可选中宫位并更新详情面板
8. 天星图 rAF 动画在切换 tab 时正确启停
9. 大限时间轴正确显示年龄范围（两视图共享）
10. 自动保存到历史记录（fire-and-forget）
11. 历史记录可恢复查看
12. 导航栏和首页入口可用
13. 移动端布局降级可用（右侧栏→底部抽屉/轮播）
