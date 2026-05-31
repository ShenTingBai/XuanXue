---
title: 紫微斗数 · 天星图重设计
date: 2026-05-31
status: draft
implementation_skill: frontend-design
---

# 紫微斗数 · 天星图重设计

## 背景

`components/tools/ziwei/ZiWeiCelestialChart.vue` 当前版本与设计稿
`demos/ziwei-visual-reference.html` 存在显著视觉差距：

- 轨道圈是几何完美的 SVG circle，缺手绘抣动感
- 星曜按主/辅/杂三档分到 3 个固定半径上，缺 demo 中"星河交错"的裸眼感
- 宫位标签套朱砂边框小匣子，与 demo 贤净文字标签不一致
- 星曜静止，缺漂移与闪烁
- 颜色仅 4 类（gold/gray/jade/ice），缺 demo 7 色五行+君臣体系

本设计以 demo 为视觉目标，**完全重写**该组件，同时保留组件的对外接口
（`palaces`/`selectedIndex`/`mingGongIndex`/`isVisible`/`@select`），父页面零改动。

## 目标

1. 视觉与 demo 1:1 接近，并融入项目「墨韵 · Ink Resonance」设计令牌
2. 动画用 CSS 驱动，不用 `requestAnimationFrame`
3. 仅显示主星 + 辅星，杂曜（adjective stars）从图上剔除，仅在右侧详情面板呈现
4. 保持 12 宫角度映射（项目当前的 `BRANCH_TO_ANGLE`：午=255° 在顶部）
5. 可访问性达 WCAG AA：键盘导航、`role`/`aria-*`、`prefers-reduced-motion`

## 非目标

- 不动 `pages/tools/ziwei.vue`、`ZiWeiPalaceGrid.vue`、`ZiWeiDetailPanel.vue`、
  `ZiWeiDaXianTimeline.vue`、composables、tests
- 不引入新的依赖
- 不改 iztro 计算逻辑

## 实现方法说明

> **实现阶段必须使用 `frontend-design` 技能。** 该技能确保最终代码具备生产
> 级品质——避免通用 AI 美学、注意排版细节、像素级打磨。本 spec 是输入；
> 实现 sub-agent 在阅读 spec 后调用 frontend-design，再产出最终代码。

## 渲染架构

`.celestial-chart` 容器（aspect-ratio: 1，max-w 620px）内 4 层堆叠：

| z-index | 层 | 内容 | 技术 |
|---------|----|------|------|
| 0 | SVG 底层 | 5 条手绘抣动轨道圈、12 条扇形分隔虚线、十字虚线、选中扇形高亮弧 | 静态 SVG `<path>` / `<line>` |
| 1 | DOM 标签层 | 12 个宫位文字标签 | 绝对定位 `<button>` |
| 2 | DOM 星曜层 | 主星 + 辅星 + 四化标签 + tooltip | 绝对定位 `<div>` + CSS 变量驱动 keyframe |
| 3 | DOM 中央 | 紫微印章 + 印章下文字"紫微星" | 绝对定位 `<div>` |

数据流：父组件传 `palaces: IFunctionalPalace[]` → 单一 `computed`
构建 `CelestialStar[]`（含位置、颜色类、动画 phase 与 speed）→ 模板渲染。
**所有派生数据在 computed 中一次性算出，无 watcher、无 RAF。**

## 几何参数

```ts
const CX = 300, CY = 300                 // SVG viewBox 600×600 中心
const PALACE_SECTOR_DEG = 30             // 每宫 30°
const RINGS = [110, 150, 190, 225, 258]  // 5 个星位轨道半径
const ORBIT_RING_RADII = RINGS           // SVG 轨道圈也用这 5 个半径
const LABEL_R = 282                      // 宫位标签距中心
const CENTER_VOID = 76                   // 中央留白半径（虚线圈）
const ANGLE_OFFSET_PER_STAR = 4          // 星曜在扇区内角度间隔（度）
const SECTOR_CENTER_OFFSET = 15          // baseAngle + 15° = 扇区中线
```

`BRANCH_TO_ANGLE` 沿用 `constants/ziwei.ts` 现有映射（午=255°/SVG 顶部）。

## 星曜位置算法

```
对于每个 palace（12 宫）:
  baseAngle = BRANCH_TO_ANGLE[palace.earthlyBranch]
  // 仅取主星 + 辅星，剔除 adjectiveStars
  allStars = [...palace.majorStars, ...palace.minorStars]
  对于 allStars 中第 i 颗:
    angleOffset = (i - (n-1)/2) * 4°
    radius = RINGS[i % 5]
    finalAngle = baseAngle + 15 + angleOffset
    pos = polar(finalAngle, radius)
```

每个 `CelestialStar` 还携带：

```ts
interface CelestialStar {
  id: string
  name: string
  pctX: number; pctY: number       // % of container
  isMajor: boolean
  palaceIdx: number
  colorClass: ColorClass
  mutagen: '禄' | '权' | '科' | '忌' | null
  // CSS 变量
  twinkleDuration: number          // 4-7s deterministic
  twinklePhase: number             // 0-1 deterministic, 用于 animation-delay
  driftDuration: number            // 60-120s deterministic
  driftPhase: number               // 用于 animation-delay
  labelOnLeft: boolean             // 标签放球右还是球左（pos.x < CX 时左侧球→标签放右）
  starIndexInPalace: number        // 用于 entrance stagger
}
```

随机参数用 deterministic seed（基于 `palaceIdx * 31 + i`），保证同一组数据每次刷新位置一致。

## 颜色映射

新增 `STAR_COLOR_MAP: Record<string, ColorClass>` 到 `constants/ziwei.ts`：

| 类别 | 星曜 | ColorClass | 颜色值 | 边框 |
|------|------|----------|--------|------|
| 帝/府 | 紫微、天府 | `gold` | `#C62828` | 1.5px `#D4A84B` |
| 火/血 | 太阳、廉贞、贪狼、七杀 | `cinnabar` | `#A02020` | 1px `rgba(198,40,40,0.3)` |
| 木/智 | 天机、天梁、天同 | `jade` | `#4A8C6F` | 1px `rgba(74,140,111,0.3)` |
| 水/月 | 太阴、文昌、文曲、天魁、天钺 | `ice` | `#6BA8C8` | 1px `rgba(107,168,200,0.3)` |
| 帝辅 | 武曲、天相 | `purple` | `#7B6FA0` | 1px `rgba(123,111,160,0.3)` |
| 凶煞 | 破军、巨门、擎羊、陀罗、火星、铃星、地空、地劫 | `gray` | `#5D4E37` | 1px `rgba(93,78,55,0.3)` |
| 中性 | 左辅、右弼、禄存、天马、其他 | `white` | `#8B7D6B` | 1px `rgba(139,125,107,0.3)` |

未在表中显式列出的星名 → 默认 `white`。

主星球径 14px，辅星球径 11px。

## 手绘抣动轨道圈

5 个轨道圈用 4 段三次贝塞尔拼出，每段端点和控制点叠加 deterministic offset（基于 r 的 `Math.sin(r * k) * 1.2` 系列），在 ±1.2px 范围内抖动。Bezier κ=0.5522847498。

- `stroke="#C5B8A8"` `stroke-width="0.8"` `opacity="0.35"` `fill="none"`
- 5 圈半径同 `RINGS`（即星曜也落在轨道线上，强化"星在轨"概念）
- 内圈外侧再画一条虚线圆 `stroke-dasharray="2,5"`，半径 `CENTER_VOID + 2`

12 条扇形分隔线：从 `RINGS[0]` 到 `RINGS[4] + 8`，`stroke="#C62828"` `stroke-width="0.5"` `opacity="0.18"`。

水平 + 垂直十字虚线穿过中心：`stroke-dasharray="3,5"` `opacity="0.12"`。

## 动画策略（CSS 驱动）

**所有动画均为 CSS @keyframes**，星曜根元素通过自定义属性配置：

```css
.star-item {
  --twinkle-duration: 5s;       /* 由内联 style 注入，4-7s */
  --twinkle-delay: -2s;         /* 由内联 style 注入，0 ~ -duration */
  --drift-duration: 90s;        /* 60-120s */
  --drift-delay: -30s;
  animation:
    twinkle var(--twinkle-duration) ease-in-out var(--twinkle-delay) infinite,
    drift   var(--drift-duration)   linear        var(--drift-delay)   infinite;
}
@keyframes twinkle {
  0%, 100% { opacity: 0.78 }
  50%      { opacity: 1 }
}
@keyframes drift {
  /* 沿 transform 做 ±3° 微摆 */
  0%   { transform: translate(-50%, -50%) rotate(0deg) }
  50%  { transform: translate(-50%, -50%) rotate(0.6deg) }
  100% { transform: translate(-50%, -50%) rotate(0deg) }
}
```

> 关键决策：星曜的"漂移"用绕**自身**做 0.6° 微摆而非绕图心公转。原因：
> 绕图心公转会让星曜偏离扇区导致归宫错位；微摆只在视觉上有"游离"感
> 但归属不变。同样适用于宫位标签的微微漂浮（更弱：±0.2°）。

入场动画通过 `animation-delay: calc(var(--star-i) * 25ms)` 错开。

中心印章：保留现有 `seal-breathe` + `seal-glow` 两个 4s keyframe。

选中星：球外 `::before` 描 1px 朱砂环 + 一次性 `ring-pulse` 2s 循环。

`prefers-reduced-motion`：

```css
@media (prefers-reduced-motion: reduce) {
  .star-item, .palace-label, .polaris-seal, .polaris::before { animation: none !important }
  .star-item { opacity: 0.92 }
  .st-act::before { animation: none; opacity: 0.4 }
}
```

## 宫位标签

12 个绝对定位 `<button>`，仅文字（无边框、无背景、无 padding）：

- 字体：`font-display`（Ma Shan Zheng） 0.85rem，letter-spacing 0.12em
- 颜色：默认 `var(--ink-light)` opacity 0.6
- 命宫：默认 `var(--cinnabar)` opacity 0.8
- hover：颜色变深 + opacity 0.9
- 选中：`var(--cinnabar)` opacity 0.95
- focus-visible：1px `var(--cinnabar)` 0.4 偏移环（不要 outline 框，要文本下划线 0.5px 朱砂）

地支字（"寅"等）以 0.5rem 字号、opacity 0.25 跟在宫名下方一行。

键盘：默认 tabindex=-1，命宫 tabindex=0，方向键 ←↑ 选前一宫、→↓ 选下一宫，Enter/Space 触发选中。

## 选中态

1. **扇区高亮**：精确的 30° 弧 `<path>`：
   - 内半径 `RINGS[0] - 5` 外半径 `RINGS[3] + 5`
   - 填充 `rgba(198,40,40,0.06)`
   - 描边 `rgba(198,40,40,0.15)` 0.5px
   - SVG `<filter>` 高斯模糊 stdDeviation=4 出柔光
   - 两条扇区边线 `rgba(198,40,40,0.3)` 1.2px

2. **选中宫的所有星**：每颗星 `::before` 描 1px 朱砂环 + 一次 `ring-pulse` 动画
3. **选中宫的标签**：颜色 `cinnabar` opacity 0.95
4. 命宫不论是否选中，标签默认朱砂

## 紫微印章（中央）

直径 52px，圆形：

- 背景：`radial-gradient(circle at 40% 35%, #D44040, #C62828 50%, #8A1B1B)`
- 边框：2px `var(--gold) #D4A84B`
- shadow：双层 `0 0 18px rgba(93,78,55,0.25), 0 0 40px rgba(93,78,55,0.1)`，
  通过 `seal-breathe` 4s 循环放大到 `0 0 24px / 0 0 50px`
- 中心字"紫"：font-display 1.5rem，金色 `#D4A84B`，text-shadow 6px 金色辉光
- 印章下方 18px：`seal-label` 文字"紫微星"，0.65rem，0.6 opacity，0.1em 字距
- 容器 `::before` 86×86 球形 `radial-gradient` 朱砂辉光 + `seal-glow` 4s 缩放循环

## 四化标签

每颗带 `mutagen` 的星，在球右上 +10/-8 位置叠一个小 chip：

| 类型 | bg | 文字色 | border |
|------|----|------|--------|
| 禄（lu） | `rgba(198,40,40,0.15)` | `#C62828` | `0.5px rgba(198,40,40,0.2)` |
| 权（quan） | `rgba(74,140,111,0.15)` | `#4A8C6F` | `0.5px rgba(74,140,111,0.2)` |
| 科（ke） | `rgba(107,168,200,0.15)` | `#6BA8C8` | `0.5px rgba(107,168,200,0.2)` |
| 忌（ji） | `rgba(93,78,55,0.12)` | `#5D4E37` | `0.5px rgba(93,78,55,0.15)` |

字号 0.5rem，padding `1px 4px`，圆角 2px，`pointer-events: none`。

## Tooltip

保留现有逻辑：hover 星曜显示 `${name}：${interpretation}`，
绝对定位、出现在右上、自动避边界、`opacity` 0.18s 淡入。

## 组件接口（保持不变）

```ts
defineProps<{
  palaces: IFunctionalPalace[]
  selectedIndex: number
  mingGongIndex: number
  isVisible?: boolean
}>()
defineEmits<{ select: [index: number] }>()
```

`isVisible=false` 时，`<style>` 不需特殊处理（CSS 动画在元素 `display: none`
后自动暂停），但应避免不必要的 computed 重算——可以用 `shallowRef` 或在
`computed` 内根据 `isVisible` 提前返回（但要注意 selectedIndex 变化时仍要更新）。

实际方案：`computed` 始终计算，依赖纯输入数据稳定即可。无需 isVisible 守卫。

## 改动文件清单

| 文件 | 改动 |
|------|------|
| `components/tools/ziwei/ZiWeiCelestialChart.vue` | 完全重写 |
| `constants/ziwei.ts` | 新增 `STAR_COLOR_MAP` 常量及 `getStarColorClass()` 函数 |

不动其他任何文件。

## 可访问性

- 容器：`role="img"` `aria-label="紫微斗数天星图 — 十二宫星曜分布"`
- 宫位标签 `<button>`：`aria-label="${name} ${branch}宫"`
- 星曜 `<button>`：`aria-label="${star.name}${mutagen ? ' 化' + mutagen : ''}"`
- Tooltip：`role="tooltip"`，`aria-hidden` 同步可见性
- 键盘：宫位标签方向键导航（已具）；星曜 Tab 顺序按 DOM 顺序（按宫遍历）
- `prefers-reduced-motion`：所有装饰动画禁用，保留信息可读性
- 焦点环：`outline: 2px solid rgba(198,40,40,0.4)` `outline-offset: 2px`

## 验证标准

实现完成后须满足：

1. `npm run typecheck` 零错误
2. `npm run build` 成功
3. 现有 `tests/composables/*` 全部通过（本组件无独立测试）
4. 手动验证：
   - 视觉与 demo 接近（同一份测试 profile 数据，对比 demo 与实现的截图）
   - 键盘 Tab/方向键能在 12 宫之间切换
   - hover 星曜出 tooltip
   - 点击宫位/星曜切换选中态
   - DevTools 模拟 `prefers-reduced-motion: reduce`，所有动画停止
   - 移动端 380px 宽下星曜与标签不重叠不溢出
5. `git diff --stat` 仅触及 `ZiWeiCelestialChart.vue` 与 `constants/ziwei.ts`

## 风险与权衡

| 风险 | 缓解 |
|------|------|
| 实际数据星数多于 5 时，会在同半径上落两颗 | `i % 5` 循环已处理，但要在密集宫位测试避免标签重叠 |
| CSS 动画在低端设备仍可能掉帧 | 动画属性仅 transform/opacity，已是 GPU 友好 |
| 字体未加载时排版抖动 | 字体已预加载，沿用项目策略 |
| 颜色映射可能漏星名 | 默认 `white` 兜底，且 `STAR_COLOR_MAP` 写在常量文件便于增补 |

## 实现工作流

由 sub-agent 完成，要求：

1. 阅读本 spec
2. 调用 `frontend-design` 技能完成设计与编码
3. 完成后运行 `npm run typecheck` 与 `npm run build` 自检
4. 修复所有报错
5. 自检通过后**一次性提交**，commit message 引用本 spec
6. 报告变更行数与验证结果

实现 sub-agent 不修改本 spec，不动其他无关文件。
