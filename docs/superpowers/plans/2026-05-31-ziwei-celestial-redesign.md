# 紫微斗数 · 天星图重设计 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **The implementation sub-agent MUST invoke the `frontend-design` skill before producing code** — see Task 0.

**Goal:** 完全重写 `components/tools/ziwei/ZiWeiCelestialChart.vue`，使天星图视觉与
`demos/ziwei-visual-reference.html` 接近一致：手绘抣动轨道、5 半径星河交错、7 色五行映射、CSS 驱动漂移闪烁、贤净文字宫位标签。

**Architecture:** 单一 Vue 3 SFC + 一个常量文件改动。SVG 底层（轨道/分隔/选中弧）+ 3 层 DOM（标签/星曜/中央印章）。所有派生数据走单一 `computed`，所有动画用 CSS @keyframes 驱动（无 RAF）。组件接口与现状完全兼容，父页面零改动。

**Tech Stack:** Vue 3 Composition API + TypeScript + 项目现有 `墨韵 · Ink Resonance` 设计令牌（`var(--cinnabar)` 等）。无新增依赖。

**Spec:** [`docs/superpowers/specs/2026-05-31-ziwei-celestial-redesign-design.md`](../specs/2026-05-31-ziwei-celestial-redesign-design.md)

---

## File Structure

| 文件 | 角色 | 改动方式 |
|------|------|----------|
| `constants/ziwei.ts` | 星色查表 + 颜色映射函数 | 追加导出，不动现有 |
| `components/tools/ziwei/ZiWeiCelestialChart.vue` | 天星图组件本体（SFC） | **完全重写** |
| `tests/composables/*` | 全部 composables 测试 | 不动；运行通过即合格 |
| `pages/tools/ziwei.vue` 等 | 调用方 | 不动 |

---

## Task 0: 准备 — 触发 frontend-design 技能

**目的：** 实现 sub-agent 在写代码前必须调用 `frontend-design` 技能，
该技能会强制注入精致排版、间距、视觉打磨等约束，是整个 plan 的前置条件。

- [ ] **Step 0.1：阅读 spec**

读取 `docs/superpowers/specs/2026-05-31-ziwei-celestial-redesign-design.md` 全文。

- [ ] **Step 0.2：调用 `frontend-design` 技能**

通过 `Skill` 工具调用 `frontend-design`（或其在当前仓库下的命名空间形式，
根据 `Skill` 工具识别到的可用名称）。读取完技能内容后，再开始后续任何代码任务。

- [ ] **Step 0.3：确认当前工作分支**

运行：

```bash
git status
git branch --show-current
```

确认在干净的工作分支上（不可在 `main` 上直接开发）。
若当前分支是 `main`，新建分支：

```bash
git checkout -b feat/ziwei-celestial-redesign
```

---

## Task 1: 在 `constants/ziwei.ts` 中新增星色映射

**Files:**
- Modify: `constants/ziwei.ts`（在文件末尾追加）

**说明：** 不动现有任何导出，仅追加 `STAR_COLOR_CLASSES`、`STAR_COLOR_MAP`、
`getStarColorClass()`。

- [ ] **Step 1.1：追加常量与函数**

在 `constants/ziwei.ts` **文件末尾** 追加（保留文件原有所有内容）：

```ts
/** 天星图星曜配色类（对应 .cls-* CSS 类） */
export type StarColorClass = 'gold' | 'cinnabar' | 'jade' | 'ice' | 'purple' | 'gray' | 'white'

/** 星名 → 配色类映射（demo 7 色五行 + 君臣体系）
 *  未列出的星名默认 'white'。 */
export const STAR_COLOR_MAP: Record<string, StarColorClass> = {
  // 帝/府 — 金边朱砂
  '紫微': 'gold', '天府': 'gold',
  // 火/血 — 深朱砂
  '太阳': 'cinnabar', '廉贞': 'cinnabar', '贪狼': 'cinnabar', '七杀': 'cinnabar',
  // 木/智 — 翡翠
  '天机': 'jade', '天梁': 'jade', '天同': 'jade',
  // 水/月 — 冰青
  '太阴': 'ice', '文昌': 'ice', '文曲': 'ice', '天魁': 'ice', '天钺': 'ice',
  // 帝辅 — 紫
  '武曲': 'purple', '天相': 'purple',
  // 凶煞 — 墨灰
  '破军': 'gray', '巨门': 'gray',
  '擎羊': 'gray', '陀罗': 'gray', '火星': 'gray', '铃星': 'gray',
  '地空': 'gray', '地劫': 'gray',
  // 中性辅 — 浅灰白（亦为兜底）
  '左辅': 'white', '右弼': 'white', '禄存': 'white', '天马': 'white',
}

/** 取星曜配色类，未知星名兜底 'white' */
export function getStarColorClass(starName: string): StarColorClass {
  return STAR_COLOR_MAP[starName] ?? 'white'
}
```

- [ ] **Step 1.2：类型检查**

```bash
npm run typecheck
```

期望：零错误。

- [ ] **Step 1.3：提交**

```bash
git add constants/ziwei.ts
git commit -m "feat(ziwei): add STAR_COLOR_MAP and getStarColorClass for celestial chart"
```

---

## Task 2: 重写 `ZiWeiCelestialChart.vue` — 脚本骨架

**Files:**
- Modify: `components/tools/ziwei/ZiWeiCelestialChart.vue`（完全替换）

**说明：** 这一步只完成 `<script setup>` 部分（不含 template/style）。
使用 `Write` 工具一次性覆盖整个文件——template/style 留作 Task 3、Task 4 在
原地编辑追加。Task 2 完成后文件可能没有可见 UI，但 typecheck 必须通过。

- [ ] **Step 2.1：用以下内容覆盖整个文件**

写入 `components/tools/ziwei/ZiWeiCelestialChart.vue`：

```vue
<!--
  ZiWeiCelestialChart — 天星图重设计版

  Architecture:
    SVG 底层  → 5 条手绘抣动轨道圈、12 条扇形分隔虚线、十字虚线、选中扇形弧
    DOM 标签层 → 12 个宫位文字标签（无边框）
    DOM 星曜层 → 主星 + 辅星圆球 + 标签 + 四化 chip + tooltip
    DOM 中央  → 紫微印章 + "紫微星" 文字

  数据流：palaces (props) → computed → 模板渲染
  动画：纯 CSS @keyframes（无 RAF）
-->
<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import { BRANCH_TO_ANGLE, getStarInterpretation, getStarColorClass } from '~/constants/ziwei'
import type { StarColorClass } from '~/constants/ziwei'

// ═══════════════════════════════════════════════════════════════
// Geometry
// ═══════════════════════════════════════════════════════════════
const CX = 300
const CY = 300
const PALACE_SECTOR_DEG = 30
const SECTOR_CENTER_OFFSET = 15
const ANGLE_OFFSET_PER_STAR = 4
const RINGS = [110, 150, 190, 225, 258] as const
const LABEL_R = 282
const CENTER_VOID = 76

const BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'] as const

// ═══════════════════════════════════════════════════════════════
// Props & Emits
// ═══════════════════════════════════════════════════════════════
const props = withDefaults(
  defineProps<{
    palaces: IFunctionalPalace[]
    selectedIndex: number
    mingGongIndex: number
    isVisible?: boolean
  }>(),
  { isVisible: true },
)

const emit = defineEmits<{ select: [index: number] }>()

// ═══════════════════════════════════════════════════════════════
// Refs
// ═══════════════════════════════════════════════════════════════
const chartContainer = ref<HTMLDivElement>()
const tooltipRef = ref<HTMLDivElement>()

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
function pol(angleDeg: number, r: number) {
  // SVG y-down convention; angles consistent with constants/ziwei.ts BRANCH_TO_ANGLE
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + Math.cos(rad) * r, y: CY + Math.sin(rad) * r }
}

/** Deterministic [0,1) pseudo-random based on integer seed. */
function seedRand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

const MUTAGEN_CSS: Record<string, string> = { 禄: 'lu', 权: 'quan', 科: 'ke', 忌: 'ji' }
function mutagenCss(m: string): string {
  return MUTAGEN_CSS[m] ?? 'ji'
}

// ═══════════════════════════════════════════════════════════════
// Star data — single computed, no watchers, no RAF
// ═══════════════════════════════════════════════════════════════
export interface CelestialStar {
  id: string
  name: string
  pctX: number
  pctY: number
  isMajor: boolean
  palaceIdx: number
  colorClass: StarColorClass
  mutagen: string | null
  labelOnLeft: boolean
  starIndexInPalace: number
  twinkleDuration: number
  twinkleDelay: number
  driftDuration: number
  driftDelay: number
}

const renderedStars = computed<CelestialStar[]>(() => {
  const stars: CelestialStar[] = []
  let globalIdx = 0

  for (const palace of props.palaces) {
    const baseAngle = BRANCH_TO_ANGLE[palace.earthlyBranch] ?? 0

    type Entry = { name: string; mutagen: string | null; isMajor: boolean }
    const entries: Entry[] = [
      ...palace.majorStars.map((s) => ({ name: s.name, mutagen: s.mutagen ?? null, isMajor: true })),
      ...palace.minorStars.map((s) => ({ name: s.name, mutagen: s.mutagen ?? null, isMajor: false })),
    ]
    const n = entries.length
    if (n === 0) continue

    entries.forEach((e, i) => {
      const angleOffset = (i - (n - 1) / 2) * ANGLE_OFFSET_PER_STAR
      const radius = RINGS[i % RINGS.length]
      const angleDeg = baseAngle + SECTOR_CENTER_OFFSET + angleOffset
      const pos = pol(angleDeg, radius)

      const seed = palace.index * 31 + i
      const twinkleDuration = 4 + seedRand(seed) * 3 // 4-7s
      const twinkleDelay = -seedRand(seed + 1) * twinkleDuration
      const driftDuration = 60 + seedRand(seed + 2) * 60 // 60-120s
      const driftDelay = -seedRand(seed + 3) * driftDuration

      stars.push({
        id: `${palace.index}-${i}-${e.name}`,
        name: e.name,
        pctX: (pos.x / 600) * 100,
        pctY: (pos.y / 600) * 100,
        isMajor: e.isMajor,
        palaceIdx: palace.index,
        colorClass: getStarColorClass(e.name),
        mutagen: e.mutagen,
        labelOnLeft: pos.x < CX,
        starIndexInPalace: globalIdx++,
        twinkleDuration,
        twinkleDelay,
        driftDuration,
        driftDelay,
      })
    })
  }

  return stars
})

// ═══════════════════════════════════════════════════════════════
// Palace labels
// ═══════════════════════════════════════════════════════════════
const palaceLabels = computed(() =>
  props.palaces.map((p, i) => {
    const angle = (BRANCH_TO_ANGLE[p.earthlyBranch] ?? 0) + SECTOR_CENTER_OFFSET
    const pos = pol(angle, LABEL_R)
    return {
      idx: i,
      name: p.name,
      branch: p.earthlyBranch,
      pctX: (pos.x / 600) * 100,
      pctY: (pos.y / 600) * 100,
      isMing: p.index === props.mingGongIndex,
    }
  }),
)

// ═══════════════════════════════════════════════════════════════
// SVG: orbit rings (hand-drawn wobbly bezier)
// ═══════════════════════════════════════════════════════════════
const KAPPA = 0.5522847498

function wobblyCirclePath(r: number, wobble = 1.2): string {
  const o = (k: number) => Math.sin(r * k) * wobble
  const c = (k: number) => Math.cos(r * k) * wobble
  const oA = o(1.3), oB = c(2.7), oC = o(3.1), oD = c(4.9)
  const oE = o(5.7), oF = c(6.3), oG = o(7.1), oH = c(8.5)

  const top    = { x: CX,         y: CY - r + oA }
  const right  = { x: CX + r + oB, y: CY }
  const bottom = { x: CX,         y: CY + r + oC }
  const left   = { x: CX - r + oD, y: CY }

  const k = KAPPA * r
  const c01 = { x: CX + k + oE, y: CY - r + oA }
  const c02 = { x: CX + r + oB, y: CY - k + oF }
  const c11 = { x: CX + r + oB, y: CY + k + oG }
  const c12 = { x: CX + k + oE, y: CY + r + oC }
  const c21 = { x: CX - k + oH, y: CY + r + oC }
  const c22 = { x: CX - r + oD, y: CY + k + oG }
  const c31 = { x: CX - r + oD, y: CY - k + oF }
  const c32 = { x: CX - k + oH, y: CY - r + oA }

  return [
    `M ${top.x} ${top.y}`,
    `C ${c01.x} ${c01.y} ${c02.x} ${c02.y} ${right.x} ${right.y}`,
    `C ${c11.x} ${c11.y} ${c12.x} ${c12.y} ${bottom.x} ${bottom.y}`,
    `C ${c21.x} ${c21.y} ${c22.x} ${c22.y} ${left.x} ${left.y}`,
    `C ${c31.x} ${c31.y} ${c32.x} ${c32.y} ${top.x} ${top.y}`,
    'Z',
  ].join(' ')
}

const orbitPaths = computed(() => RINGS.map((r) => wobblyCirclePath(r)))

const innerDashedPath = computed(() => wobblyCirclePath(CENTER_VOID + 2, 0.6))

// ═══════════════════════════════════════════════════════════════
// SVG: sector dividers
// ═══════════════════════════════════════════════════════════════
const dividers = computed(() =>
  BRANCHES.map((br) => {
    const angle = BRANCH_TO_ANGLE[br] ?? 0
    const p1 = pol(angle, RINGS[0])
    const p2 = pol(angle, RINGS[RINGS.length - 1] + 8)
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, key: br }
  }),
)

// ═══════════════════════════════════════════════════════════════
// SVG: 30° selection arc
// ═══════════════════════════════════════════════════════════════
const highlight = computed(() => {
  const idx = props.selectedIndex
  const palace = props.palaces[idx]
  if (!palace) return null

  const startAngle = BRANCH_TO_ANGLE[palace.earthlyBranch] ?? 0
  const endAngle = startAngle + PALACE_SECTOR_DEG
  const innerR = RINGS[0] - 5
  const outerR = RINGS[3] + 5

  const si = pol(startAngle, innerR)
  const so = pol(startAngle, outerR)
  const ei = pol(endAngle, innerR)
  const eo = pol(endAngle, outerR)

  const path = [
    `M ${si.x} ${si.y}`,
    `L ${so.x} ${so.y}`,
    `A ${outerR} ${outerR} 0 0 1 ${eo.x} ${eo.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${innerR} ${innerR} 0 0 0 ${si.x} ${si.y}`,
    'Z',
  ].join(' ')

  return { path, innerR, outerR, startAngle, endAngle }
})

function arcEdgePoint(angle: number, r: number) {
  return pol(angle, r)
}

// ═══════════════════════════════════════════════════════════════
// Tooltip
// ═══════════════════════════════════════════════════════════════
const tooltipVisible = ref(false)
const tooltipText = ref('')
const tooltipStyle = ref({ left: '0px', top: '0px' })

function onStarEnter(e: MouseEvent, star: CelestialStar) {
  const container = chartContainer.value
  const tipEl = tooltipRef.value
  if (!container || !tipEl) return

  const interp = getStarInterpretation(star.name)
  tooltipText.value = interp ? `${star.name}：${interp}` : star.name

  const target = e.currentTarget as HTMLElement
  const cr = container.getBoundingClientRect()
  const sr = target.getBoundingClientRect()
  const starCx = sr.left + sr.width / 2 - cr.left
  const starCy = sr.top + sr.height / 2 - cr.top

  tooltipVisible.value = true

  nextTick(() => {
    if (!tooltipRef.value || !chartContainer.value) return
    const tw = tipEl.offsetWidth
    const th = tipEl.offsetHeight
    const cw = container.offsetWidth
    const ch = container.offsetHeight

    let tx = starCx + 14
    let ty = starCy - th - 8
    if (ty < 6) ty = starCy + 14
    if (tx + tw > cw - 6) tx = starCx - tw - 14
    if (ty + th > ch - 6) ty = ch - th - 6
    if (tx < 6) tx = 6

    tooltipStyle.value = { left: `${tx}px`, top: `${ty}px` }
  })
}

function onStarLeave() {
  tooltipVisible.value = false
}

// ═══════════════════════════════════════════════════════════════
// Keyboard navigation
// ═══════════════════════════════════════════════════════════════
function onLabelKeydown(e: KeyboardEvent, i: number) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('select', i)
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    emit('select', (i + 1) % 12)
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    emit('select', (i + 11) % 12)
  }
}
</script>

<template>
  <div ref="chartContainer" />
</template>

<style scoped>
/* placeholder — Task 4 will replace */
</style>
```

- [ ] **Step 2.2：类型检查**

```bash
npm run typecheck
```

期望：零错误。若报错，根据错误信息修正（最常见：iztro 类型路径或
`mutagen` 字段名差异）。

- [ ] **Step 2.3：构建快速冒烟**

```bash
npm run build
```

期望：成功（页面短暂会渲染空 div，但不报错）。

- [ ] **Step 2.4：提交**

```bash
git add components/tools/ziwei/ZiWeiCelestialChart.vue
git commit -m "refactor(ziwei): rewrite celestial chart script — geometry & data"
```

---

## Task 3: 编写 `<template>` — DOM 结构

**Files:**
- Modify: `components/tools/ziwei/ZiWeiCelestialChart.vue`（替换 `<template>` 块）

- [ ] **Step 3.1：替换 template**

将 `<template>...</template>` 块整体替换为：

```vue
<template>
  <div
    ref="chartContainer"
    class="celestial-chart"
    :class="{ 'is-hidden': !isVisible }"
    role="img"
    aria-label="紫微斗数天星图 — 十二宫星曜分布"
  >
    <!-- ── SVG 底层：轨道 + 分隔 + 选中弧 ── -->
    <svg
      class="orbit-svg"
      viewBox="0 0 600 600"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <filter id="sel-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- 5 条手绘轨道圈 -->
      <path
        v-for="(d, i) in orbitPaths"
        :key="`ring-${i}`"
        :d="d"
        fill="none"
        stroke="#C5B8A8"
        stroke-width="0.8"
        opacity="0.35"
      />

      <!-- 内圈虚线（紧贴印章） -->
      <path
        :d="innerDashedPath"
        fill="none"
        stroke="#C5B8A8"
        stroke-width="0.5"
        opacity="0.18"
        stroke-dasharray="2,5"
      />

      <!-- 十字参考虚线 -->
      <line
        :x1="CX - 268" :y1="CY" :x2="CX + 268" :y2="CY"
        stroke="#C5B8A8" stroke-width="0.4" opacity="0.12" stroke-dasharray="3,5"
      />
      <line
        :x1="CX" :y1="CY - 268" :x2="CX" :y2="CY + 268"
        stroke="#C5B8A8" stroke-width="0.4" opacity="0.12" stroke-dasharray="3,5"
      />

      <!-- 12 条扇形分隔 -->
      <line
        v-for="d in dividers"
        :key="`div-${d.key}`"
        :x1="d.x1" :y1="d.y1" :x2="d.x2" :y2="d.y2"
        stroke="#C62828" stroke-width="0.5" opacity="0.18"
      />

      <!-- 选中扇区高亮 -->
      <g v-if="highlight">
        <path
          :d="highlight.path"
          fill="rgba(198,40,40,0.06)"
          stroke="rgba(198,40,40,0.15)"
          stroke-width="0.5"
          filter="url(#sel-glow)"
        />
        <line
          :x1="arcEdgePoint(highlight.startAngle, highlight.innerR).x"
          :y1="arcEdgePoint(highlight.startAngle, highlight.innerR).y"
          :x2="arcEdgePoint(highlight.startAngle, highlight.outerR).x"
          :y2="arcEdgePoint(highlight.startAngle, highlight.outerR).y"
          stroke="rgba(198,40,40,0.3)" stroke-width="1.2"
        />
        <line
          :x1="arcEdgePoint(highlight.endAngle, highlight.innerR).x"
          :y1="arcEdgePoint(highlight.endAngle, highlight.innerR).y"
          :x2="arcEdgePoint(highlight.endAngle, highlight.outerR).x"
          :y2="arcEdgePoint(highlight.endAngle, highlight.outerR).y"
          stroke="rgba(198,40,40,0.3)" stroke-width="1.2"
        />
      </g>
    </svg>

    <!-- ── 宫位标签层 ── -->
    <div class="labels-layer">
      <button
        v-for="label in palaceLabels"
        :key="`label-${label.idx}`"
        type="button"
        class="palace-label"
        :class="{ 'pl-ming': label.isMing, 'pl-sel': label.idx === selectedIndex }"
        :style="{ left: label.pctX + '%', top: label.pctY + '%' }"
        :tabindex="label.idx === mingGongIndex ? 0 : -1"
        :aria-label="`${label.name} ${label.branch}宫`"
        @click="emit('select', label.idx)"
        @keydown="onLabelKeydown($event, label.idx)"
      >
        <span class="pl-name">{{ label.name }}</span>
        <span class="pl-branch">{{ label.branch }}</span>
      </button>
    </div>

    <!-- ── 星曜层 ── -->
    <div class="stars-layer">
      <button
        v-for="star in renderedStars"
        :key="star.id"
        type="button"
        class="star-item"
        :class="{
          'st-major': star.isMajor,
          'st-act': star.palaceIdx === selectedIndex,
          'st-label-left': star.labelOnLeft,
        }"
        :style="{
          left: star.pctX + '%',
          top: star.pctY + '%',
          '--twinkle-dur': star.twinkleDuration + 's',
          '--twinkle-delay': star.twinkleDelay + 's',
          '--drift-dur': star.driftDuration + 's',
          '--drift-delay': star.driftDelay + 's',
          '--enter-delay': (star.starIndexInPalace * 25) + 'ms',
        }"
        :aria-label="star.name + (star.mutagen ? ' 化' + star.mutagen : '')"
        @click="emit('select', star.palaceIdx)"
        @mouseenter="onStarEnter($event, star)"
        @mouseleave="onStarLeave"
      >
        <span class="st-orb" :class="`cls-${star.colorClass}`" />
        <span class="st-label">{{ star.name }}</span>
        <span
          v-if="star.mutagen"
          class="st-mutagen"
          :class="mutagenCss(star.mutagen)"
        >化{{ star.mutagen }}</span>
      </button>
    </div>

    <!-- ── 中央紫微印章 ── -->
    <div class="polaris" aria-hidden="true">
      <div class="polaris-seal">
        <span class="polaris-char">紫</span>
      </div>
      <span class="polaris-label">紫微星</span>
    </div>

    <!-- ── Tooltip ── -->
    <div
      ref="tooltipRef"
      class="star-tooltip"
      :class="{ 'tp-vis': tooltipVisible }"
      :style="tooltipStyle"
      role="tooltip"
      :aria-hidden="!tooltipVisible"
    >
      {{ tooltipText }}
    </div>
  </div>
</template>
```

- [ ] **Step 3.2：让 `CX`/`CY` 在模板中可用**

模板里用到 `CX`、`CY`，但当前 `<script setup>` 中它们仅是模块级常量。
`<script setup>` 模块级 `const` 默认对模板可见，无需额外 expose——
确保 Step 2.1 中的 `const CX = 300` 没有被改成 `let` 或加 `export`。

- [ ] **Step 3.3：类型检查与构建**

```bash
npm run typecheck && npm run build
```

期望：均通过。

- [ ] **Step 3.4：提交**

```bash
git add components/tools/ziwei/ZiWeiCelestialChart.vue
git commit -m "feat(ziwei): celestial chart template — SVG + DOM layers"
```

---

## Task 4: 编写 `<style scoped>` — 全部样式与动画

**Files:**
- Modify: `components/tools/ziwei/ZiWeiCelestialChart.vue`（替换 `<style>` 块）

- [ ] **Step 4.1：替换 style**

将文件末尾的 `<style scoped>...</style>` 整体替换为：

```vue
<style scoped>
/* ═══════════════════════════════════════════════════════════════
   Container & layers
   ═══════════════════════════════════════════════════════════════ */
.celestial-chart {
  position: relative;
  width: 100%;
  max-width: 620px;
  aspect-ratio: 1;
  margin: 0 auto;
  user-select: none;
  overflow: visible;
}

.celestial-chart.is-hidden { display: none; }

.celestial-chart::before {
  content: '';
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  background: radial-gradient(ellipse at center,
    rgba(232, 222, 208, 0.18) 0%,
    rgba(238, 229, 216, 0.08) 55%,
    transparent 75%);
  pointer-events: none;
  z-index: -1;
}

.orbit-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.labels-layer,
.stars-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.labels-layer { z-index: 1; }
.stars-layer  { z-index: 2; }

/* ═══════════════════════════════════════════════════════════════
   Palace labels — 贤净文字（无边框无背景）
   ═══════════════════════════════════════════════════════════════ */
.palace-label {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  background: transparent;
  border: none;
  white-space: nowrap;
  transition: transform 0.4s ease, color 0.3s ease, opacity 0.3s ease;
  animation: label-drift 24s ease-in-out infinite;
}

.pl-name {
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  color: #8B7D6B;
  opacity: 0.6;
  line-height: 1.1;
  transition: color 0.3s, opacity 0.3s;
}

.pl-branch {
  font-family: 'Noto Serif SC', 'STSong', serif;
  font-size: 0.5rem;
  color: #8B7D6B;
  opacity: 0.25;
  letter-spacing: 0.04em;
  line-height: 1;
}

.palace-label:hover .pl-name {
  color: #5D4E37;
  opacity: 0.9;
}

.palace-label.pl-ming .pl-name {
  color: #C62828;
  opacity: 0.8;
}

.palace-label.pl-sel .pl-name {
  color: #C62828;
  opacity: 0.95;
}

.palace-label:focus-visible {
  outline: none;
}
.palace-label:focus-visible .pl-name {
  text-decoration: underline 0.5px #C62828;
  text-underline-offset: 3px;
}

/* ═══════════════════════════════════════════════════════════════
   Stars
   ═══════════════════════════════════════════════════════════════ */
.star-item {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: transparent;
  border: none;
  white-space: nowrap;
  z-index: 2;
  opacity: 0;
  animation:
    star-enter 0.5s ease-out var(--enter-delay, 0ms) forwards,
    twinkle var(--twinkle-dur, 5s) ease-in-out var(--twinkle-delay, 0s) infinite,
    drift var(--drift-dur, 90s) linear var(--drift-delay, 0s) infinite;
}

.star-item:hover { z-index: 10; }

.st-label-left {
  flex-direction: row-reverse;
}

/* Orb base */
.st-orb {
  flex-shrink: 0;
  border-radius: 50%;
  position: relative;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.star-item .st-orb {
  width: 11px;
  height: 11px;
}

.st-major .st-orb {
  width: 14px;
  height: 14px;
}

/* 7 colour classes */
.st-orb.cls-gold {
  background: #C62828;
  border: 1.5px solid #D4A84B;
  box-shadow: 0 0 6px rgba(93,78,55,0.2);
}
.st-orb.cls-cinnabar {
  background: #A02020;
  border: 1px solid rgba(198,40,40,0.3);
  box-shadow: 0 0 6px rgba(93,78,55,0.18);
}
.st-orb.cls-jade {
  background: #4A8C6F;
  border: 1px solid rgba(74,140,111,0.3);
  box-shadow: 0 0 6px rgba(93,78,55,0.18);
}
.st-orb.cls-ice {
  background: #6BA8C8;
  border: 1px solid rgba(107,168,200,0.3);
  box-shadow: 0 0 6px rgba(93,78,55,0.18);
}
.st-orb.cls-purple {
  background: #7B6FA0;
  border: 1px solid rgba(123,111,160,0.3);
  box-shadow: 0 0 6px rgba(93,78,55,0.18);
}
.st-orb.cls-gray {
  background: #5D4E37;
  border: 1px solid rgba(93,78,55,0.3);
  box-shadow: 0 0 6px rgba(93,78,55,0.18);
}
.st-orb.cls-white {
  background: #8B7D6B;
  border: 1px solid rgba(139,125,107,0.3);
  box-shadow: 0 0 6px rgba(93,78,55,0.15);
}

.star-item:hover .st-orb {
  transform: scale(1.25);
  box-shadow: 0 0 10px rgba(198,40,40,0.3), 0 0 18px rgba(198,40,40,0.08);
}

/* Star label */
.st-label {
  font-family: 'Noto Serif SC', 'STSong', serif;
  font-size: 0.6rem;
  letter-spacing: 0.04em;
  color: #5D4E37;
  opacity: 0.55;
  line-height: 1;
  transition: opacity 0.3s, color 0.3s;
  pointer-events: none;
}

.st-major .st-label {
  font-size: 0.7rem;
  font-weight: 500;
  opacity: 0.7;
}

.star-item:hover .st-label,
.st-act .st-label {
  opacity: 0.95;
  color: #C62828;
}

/* Active selection ring */
.star-item.st-act .st-orb::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1px solid rgba(198,40,40,0.45);
  pointer-events: none;
  animation: ring-pulse 2s ease-out infinite;
}

.star-item:focus-visible {
  outline: none;
}
.star-item:focus-visible .st-orb {
  box-shadow: 0 0 0 2px rgba(198,40,40,0.4), 0 0 8px rgba(198,40,40,0.25);
}

/* Four-Hua chip */
.st-mutagen {
  pointer-events: none;
  font-family: 'Noto Serif SC', 'STSong', serif;
  font-size: 0.5rem;
  padding: 1px 4px;
  border-radius: 2px;
  line-height: 1.2;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.st-mutagen.lu   { background: rgba(198,40,40,0.15); color: #C62828; border: 0.5px solid rgba(198,40,40,0.2); }
.st-mutagen.quan { background: rgba(74,140,111,0.15); color: #4A8C6F; border: 0.5px solid rgba(74,140,111,0.2); }
.st-mutagen.ke   { background: rgba(107,168,200,0.15); color: #6BA8C8; border: 0.5px solid rgba(107,168,200,0.2); }
.st-mutagen.ji   { background: rgba(93,78,55,0.12); color: #5D4E37; border: 0.5px solid rgba(93,78,55,0.15); }

/* ═══════════════════════════════════════════════════════════════
   Polaris (centre seal)
   ═══════════════════════════════════════════════════════════════ */
.polaris {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.polaris::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(198,40,40,0.08) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: seal-glow 4s ease-in-out infinite;
}

.polaris-seal {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #D44040, #C62828 50%, #8A1B1B);
  border: 2px solid #D4A84B;
  box-shadow: 0 0 18px rgba(93,78,55,0.25), 0 0 40px rgba(93,78,55,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: seal-breathe 4s ease-in-out infinite;
}

.polaris-char {
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif;
  font-size: 1.5rem;
  color: #D4A84B;
  text-shadow: 0 0 6px rgba(212,168,75,0.3);
  line-height: 1;
}

.polaris-label {
  position: absolute;
  bottom: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif;
  font-size: 0.65rem;
  color: #8B7D6B;
  letter-spacing: 0.1em;
  opacity: 0.6;
  white-space: nowrap;
}

/* ═══════════════════════════════════════════════════════════════
   Tooltip
   ═══════════════════════════════════════════════════════════════ */
.star-tooltip {
  position: absolute;
  z-index: 20;
  pointer-events: none;
  background: rgba(245, 240, 232, 0.97);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(198,40,40,0.15);
  border-left: 2.5px solid #C62828;
  border-radius: 6px;
  padding: 0.45rem 0.7rem;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.68rem;
  color: #5D4E37;
  max-width: 200px;
  min-width: 110px;
  box-shadow: 0 4px 16px rgba(93,78,55,0.12);
  opacity: 0;
  transition: opacity 0.18s;
  line-height: 1.5;
}

.star-tooltip.tp-vis { opacity: 1; }

/* ═══════════════════════════════════════════════════════════════
   Keyframes (must live OUTSIDE @layer per project convention)
   ═══════════════════════════════════════════════════════════════ */
@keyframes star-enter {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes twinkle {
  0%, 100% { filter: brightness(0.92); }
  50%      { filter: brightness(1.1); }
}

@keyframes drift {
  0%   { transform: translate(-50%, -50%) rotate(0deg); }
  50%  { transform: translate(-50%, -50%) rotate(0.6deg); }
  100% { transform: translate(-50%, -50%) rotate(0deg); }
}

@keyframes label-drift {
  0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
  50%      { transform: translate(-50%, -50%) rotate(0.2deg); }
}

@keyframes ring-pulse {
  0%   { opacity: 0.5; transform: scale(0.9); }
  100% { opacity: 0;   transform: scale(1.6); }
}

@keyframes seal-breathe {
  0%, 100% {
    box-shadow: 0 0 18px rgba(93,78,55,0.25), 0 0 40px rgba(93,78,55,0.1);
  }
  50% {
    box-shadow: 0 0 24px rgba(93,78,55,0.35), 0 0 50px rgba(93,78,55,0.15);
  }
}

@keyframes seal-glow {
  0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.6; }
  50%      { transform: translate(-50%, -50%) scale(1.12); opacity: 1; }
}

/* ═══════════════════════════════════════════════════════════════
   Reduced motion
   ═══════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .star-item,
  .palace-label,
  .polaris-seal,
  .polaris::before {
    animation: none !important;
  }
  .star-item { opacity: 0.92; transform: translate(-50%, -50%); }
  .star-item.st-act .st-orb::after { animation: none; opacity: 0.4; }
}

/* ═══════════════════════════════════════════════════════════════
   Responsive
   ═══════════════════════════════════════════════════════════════ */
@media (max-width: 600px) {
  .pl-name { font-size: 0.72rem; }
  .pl-branch { font-size: 0.45rem; }
  .star-item .st-orb { width: 9px; height: 9px; }
  .st-major .st-orb { width: 12px; height: 12px; }
  .st-label { font-size: 0.52rem; }
  .st-major .st-label { font-size: 0.6rem; }
  .polaris-seal { width: 44px; height: 44px; }
  .polaris-char { font-size: 1.25rem; }
}
</style>
```

- [ ] **Step 4.2：类型检查与构建**

```bash
npm run typecheck && npm run build
```

期望：均通过。

- [ ] **Step 4.3：跑测试套件**

```bash
npm test
```

期望：现有 `tests/composables/*` 全部通过（不应受组件改动影响）。

- [ ] **Step 4.4：提交**

```bash
git add components/tools/ziwei/ZiWeiCelestialChart.vue
git commit -m "feat(ziwei): celestial chart styles & animations (ink resonance)"
```

---

## Task 5: 手动验证（视觉对比）

**Files:** 无

**说明：** 启动 dev server，浏览器对照 demo 验证。

- [ ] **Step 5.1：启动 dev server**

```bash
npm run dev
```

确认监听端口（默认 3000）。

- [ ] **Step 5.2：访问 ziwei 工具页**

浏览器打开 `http://localhost:3000/tools/ziwei`。

登录（如未登录）→ 输入测试信息（如 1990-01-01 子时 男）→ 点击排盘。

- [ ] **Step 5.3：对照 demo 检查项**

检查清单（逐项截图记录）：

- [ ] 5 条轨道圈轻微抣动（非完美正圆）
- [ ] 12 个宫位文字标签无边框无背景，命宫朱砂色
- [ ] 星曜按 5 半径交错分布（不是三档分圈）
- [ ] 主星球 14px 带金边（如紫微/天府），辅星球 11px
- [ ] 7 种颜色显著区分（紫微=金/朱砂、太阳=深朱砂、天机=翡翠等）
- [ ] 星曜有微微闪烁（亮度变化）
- [ ] 中央紫微印章呼吸光晕循环
- [ ] 点击宫位 → 朱砂扇区高亮 + 该宫所有星附近出现脉动环
- [ ] 选中宫位的标签变朱砂
- [ ] hover 星曜出 tooltip
- [ ] 键盘 Tab → 焦点到命宫标签 → 方向键切换宫位

- [ ] **Step 5.4：响应式验证**

DevTools 设备模拟：

- iPhone SE（375px）：星曜不重叠，标签可读
- iPad（768px）：布局居中
- 桌面（1280px+）：图占据 max-w 620px

- [ ] **Step 5.5：reduced-motion 验证**

DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`：

- 星曜停止漂移与闪烁
- 中央印章停止呼吸
- 选中环停止脉冲
- 信息仍可读

- [ ] **Step 5.6：发现问题处理**

若发现视觉/功能问题，在 commit 前修复。复杂问题登记到 `findings.md` 末尾以便后续 PR。

- [ ] **Step 5.7：关闭 dev server**

按 `Ctrl+C`。

- [ ] **Step 5.8：（如有修复）提交**

```bash
git add -p   # 只挑改动文件
git commit -m "fix(ziwei): celestial chart polish from manual QA"
```

若无修复，跳过本步。

---

## Task 6: 收尾

- [ ] **Step 6.1：最终全量验证**

```bash
npm run typecheck && npm run build && npm test
```

三个全部通过。

- [ ] **Step 6.2：检查 `git diff --stat`**

```bash
git log main..HEAD --stat
```

预期改动文件仅：

- `constants/ziwei.ts`（追加，约 +35 行）
- `components/tools/ziwei/ZiWeiCelestialChart.vue`（重写，原 973 行 → 新版可能 600-750 行）
- `docs/superpowers/specs/2026-05-31-ziwei-celestial-redesign-design.md`（已在前置 commit 落盘，不算本任务）
- `docs/superpowers/plans/2026-05-31-ziwei-celestial-redesign.md`（同上）

不应触及任何其他文件。若有意外文件改动，回滚或质疑。

- [ ] **Step 6.3：生成总结**

输出：

- 改动文件列表与行数
- typecheck/build/test 结果
- 手动验证结论（哪些项目通过，是否有遗留问题）

---

## Self-review notes

- ✅ 每个 task 都有具体代码块或具体命令
- ✅ 改动文件清单明确
- ✅ 类型一致性：`StarColorClass` 在 Task 1 定义，Task 2 引用同名
- ✅ 函数命名：`getStarColorClass`、`wobblyCirclePath`、`pol`、`seedRand`、`mutagenCss`、`onLabelKeydown`、`onStarEnter`、`onStarLeave`、`arcEdgePoint` 全部在脚本中显式定义后才在模板使用
- ✅ Task 0 显式要求实现者调用 `frontend-design` 技能
- ✅ Spec 中"组件接口（保持不变）"被 Task 2 props/emits 完整覆盖
- ✅ Spec 中"几何参数"全部在 Task 2 常量中落地
- ✅ Spec 中"动画策略"全部在 Task 4 keyframes 中落地
- ✅ Spec 中"颜色映射"全部在 Task 1 + Task 4 落地
- ✅ Spec 中"可访问性"由 Task 3 的 ARIA 属性 + Task 4 的 focus-visible + reduced-motion 媒体查询共同实现
- ✅ Spec 中"验证标准"由 Task 5 + Task 6 实现
