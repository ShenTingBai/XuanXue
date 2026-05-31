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
