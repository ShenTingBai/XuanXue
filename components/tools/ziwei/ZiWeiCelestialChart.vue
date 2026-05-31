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
import type { ComponentPublicInstance } from 'vue'
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
const labelButtonRefs = ref<HTMLButtonElement[]>([])

function assignLabelRef(el: Element | ComponentPublicInstance | null, idx: number) {
  if (el) labelButtonRefs.value[idx] = el as HTMLButtonElement
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
function pol(angleDeg: number, r: number) {
  // angleDeg uses constants/ziwei.ts BRANCH_TO_ANGLE convention — already in SVG
  // y-down angle space (午=255°, 午+15°=270° SVG → top). No additional offset.
  const rad = (angleDeg * Math.PI) / 180
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

function onStarEnter(e: MouseEvent | FocusEvent, star: CelestialStar) {
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
    const next = (i + 1) % 12
    emit('select', next)
    focusLabel(next)
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    const next = (i + 11) % 12
    emit('select', next)
    focusLabel(next)
  }
}

function focusLabel(idx: number) {
  nextTick(() => {
    labelButtonRefs.value[idx]?.focus()
  })
}
</script>

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
        :ref="(el) => assignLabelRef(el, label.idx)"
        type="button"
        class="palace-label"
        :class="{ 'pl-ming': label.isMing, 'pl-sel': label.idx === selectedIndex }"
        :style="{ left: label.pctX + '%', top: label.pctY + '%' }"
        :tabindex="label.idx === selectedIndex ? 0 : -1"
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
        :aria-describedby="tooltipVisible && tooltipText.startsWith(star.name) ? 'ziwei-star-tooltip' : undefined"
        @click="emit('select', star.palaceIdx)"
        @mouseenter="onStarEnter($event, star)"
        @mouseleave="onStarLeave"
        @focus="onStarEnter($event, star)"
        @blur="onStarLeave"
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
      id="ziwei-star-tooltip"
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

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   Container & layers — 纸面 · 玄空
   ═══════════════════════════════════════════════════════════════ */
.celestial-chart {
  position: relative;
  width: 100%;
  max-width: 620px;
  aspect-ratio: 1;
  margin: 0 auto;
  user-select: none;
  overflow: visible;
  /* Subtle isolation so absolute layers paint cleanly */
  isolation: isolate;
}

.celestial-chart.is-hidden { display: none; }

/* Soft paper-glow: warm ink wash bleeding from the centre outward.
   Layered radial gradient gives a more atmospheric falloff than
   a single stop, evoking light through xuan paper. */
.celestial-chart::before {
  content: '';
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 50% 48%,
      rgba(232, 222, 208, 0.22) 0%,
      rgba(238, 229, 216, 0.12) 38%,
      rgba(238, 229, 216, 0.04) 62%,
      transparent 78%),
    radial-gradient(ellipse at 50% 70%,
      rgba(198, 40, 40, 0.025) 0%,
      transparent 55%);
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
  gap: 3px;
  padding: 3px 6px;
  background: transparent;
  border: none;
  white-space: nowrap;
  /* Refined cubic-bezier — calligraphic deceleration, no rubber-band */
  transition:
    color 320ms cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 320ms cubic-bezier(0.22, 0.61, 0.36, 1),
    letter-spacing 420ms cubic-bezier(0.22, 0.61, 0.36, 1);
  animation: label-drift 24s ease-in-out infinite;
}

.pl-name {
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  color: #8B7D6B;
  opacity: 0.62;
  line-height: 1.1;
  transition:
    color 320ms cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 320ms cubic-bezier(0.22, 0.61, 0.36, 1),
    text-shadow 320ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.pl-branch {
  font-family: 'Noto Serif SC', 'STSong', serif;
  font-size: 0.5rem;
  color: #8B7D6B;
  opacity: 0.28;
  letter-spacing: 0.08em;
  line-height: 1;
  font-weight: 500;
  transition: opacity 320ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.palace-label:hover .pl-name {
  color: #5D4E37;
  opacity: 0.95;
  text-shadow: 0 0 8px rgba(93, 78, 55, 0.08);
}

.palace-label:hover .pl-branch { opacity: 0.5; }

.palace-label.pl-ming .pl-name {
  color: #C62828;
  opacity: 0.85;
  text-shadow: 0 0 6px rgba(198, 40, 40, 0.12);
}

.palace-label.pl-sel .pl-name {
  color: #C62828;
  opacity: 1;
  letter-spacing: 0.16em;
  text-shadow: 0 0 10px rgba(198, 40, 40, 0.18);
}
.palace-label.pl-sel .pl-branch { opacity: 0.55; color: #C62828; }

.palace-label:focus-visible {
  outline: none;
}
.palace-label:focus-visible .pl-name {
  text-decoration: underline 0.5px #C62828;
  text-underline-offset: 4px;
  text-decoration-thickness: 0.5px;
}

/* ═══════════════════════════════════════════════════════════════
   Stars — 星曜
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
  /* star-enter: refined deceleration with a hint of overshoot.
     twinkle/drift run on top once the entrance settles. */
  animation:
    star-enter 600ms cubic-bezier(0.34, 1.32, 0.64, 1) var(--enter-delay, 0ms) forwards,
    twinkle var(--twinkle-dur, 5s) ease-in-out var(--twinkle-delay, 0s) infinite,
    drift var(--drift-dur, 90s) linear var(--drift-delay, 0s) infinite;
}

.star-item:hover { z-index: 10; }

.st-label-left {
  flex-direction: row-reverse;
}

/* Orb base — ink-droplet feel */
.st-orb {
  flex-shrink: 0;
  border-radius: 50%;
  position: relative;
  transition:
    transform 240ms cubic-bezier(0.34, 1.45, 0.64, 1),
    box-shadow 280ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.star-item .st-orb {
  width: 11px;
  height: 11px;
}

.st-major .st-orb {
  width: 14px;
  height: 14px;
}

/* 7 colour classes — each orb carries a soft top-light highlight via
   radial-gradient overlay, lending dimension without busy detailing. */
.st-orb.cls-gold {
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 235, 200, 0.55), transparent 55%),
    #C62828;
  border: 1.5px solid #D4A84B;
  box-shadow:
    0 0 6px rgba(93, 78, 55, 0.22),
    0 0 0 0.5px rgba(212, 168, 75, 0.4) inset;
}
.st-orb.cls-cinnabar {
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 220, 215, 0.42), transparent 55%),
    #A02020;
  border: 1px solid rgba(198, 40, 40, 0.35);
  box-shadow: 0 0 6px rgba(93, 78, 55, 0.18);
}
.st-orb.cls-jade {
  background:
    radial-gradient(circle at 35% 30%, rgba(220, 240, 230, 0.42), transparent 55%),
    #4A8C6F;
  border: 1px solid rgba(74, 140, 111, 0.35);
  box-shadow: 0 0 6px rgba(93, 78, 55, 0.18);
}
.st-orb.cls-ice {
  background:
    radial-gradient(circle at 35% 30%, rgba(225, 240, 250, 0.5), transparent 55%),
    #6BA8C8;
  border: 1px solid rgba(107, 168, 200, 0.35);
  box-shadow: 0 0 6px rgba(93, 78, 55, 0.18);
}
.st-orb.cls-purple {
  background:
    radial-gradient(circle at 35% 30%, rgba(230, 225, 245, 0.45), transparent 55%),
    #7B6FA0;
  border: 1px solid rgba(123, 111, 160, 0.35);
  box-shadow: 0 0 6px rgba(93, 78, 55, 0.18);
}
.st-orb.cls-gray {
  background:
    radial-gradient(circle at 35% 30%, rgba(220, 210, 195, 0.4), transparent 55%),
    #5D4E37;
  border: 1px solid rgba(93, 78, 55, 0.35);
  box-shadow: 0 0 6px rgba(93, 78, 55, 0.18);
}
.st-orb.cls-white {
  background:
    radial-gradient(circle at 35% 30%, rgba(245, 240, 232, 0.55), transparent 55%),
    #8B7D6B;
  border: 1px solid rgba(139, 125, 107, 0.35);
  box-shadow: 0 0 6px rgba(93, 78, 55, 0.15);
}

.star-item:hover .st-orb {
  transform: scale(1.28);
  box-shadow:
    0 0 12px rgba(198, 40, 40, 0.32),
    0 0 22px rgba(198, 40, 40, 0.1),
    0 0 0 0.5px rgba(198, 40, 40, 0.25) inset;
}

/* Star label — 篆書小字 */
.st-label {
  font-family: 'Noto Serif SC', 'STSong', serif;
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  color: #5D4E37;
  opacity: 0.58;
  line-height: 1;
  transition:
    opacity 280ms cubic-bezier(0.22, 0.61, 0.36, 1),
    color 280ms cubic-bezier(0.22, 0.61, 0.36, 1),
    text-shadow 280ms cubic-bezier(0.22, 0.61, 0.36, 1);
  pointer-events: none;
}

.st-major .st-label {
  font-size: 0.7rem;
  font-weight: 500;
  opacity: 0.74;
  letter-spacing: 0.08em;
}

.star-item:hover .st-label,
.st-act .st-label {
  opacity: 1;
  color: #C62828;
  text-shadow: 0 0 6px rgba(198, 40, 40, 0.12);
}

/* Active selection ring — gentle ripple, evokes ink dropped on paper */
.star-item.st-act .st-orb::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1px solid rgba(198, 40, 40, 0.45);
  pointer-events: none;
  animation: ring-pulse 2.2s cubic-bezier(0.16, 0.84, 0.44, 1) infinite;
}

.star-item:focus-visible {
  outline: none;
}
.star-item:focus-visible .st-orb {
  box-shadow:
    0 0 0 2px rgba(198, 40, 40, 0.45),
    0 0 10px rgba(198, 40, 40, 0.28);
}

/* Four-Hua chip — small impressed-seal feel */
.st-mutagen {
  pointer-events: none;
  font-family: 'Noto Serif SC', 'STSong', serif;
  font-size: 0.5rem;
  font-weight: 500;
  padding: 1px 4px;
  border-radius: 2px;
  line-height: 1.2;
  letter-spacing: 0.04em;
  white-space: nowrap;
  /* 印章感：内嵌微阴影模拟盖印 */
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.04);
}

.st-mutagen.lu   { background: rgba(198, 40, 40, 0.16); color: #C62828; border: 0.5px solid rgba(198, 40, 40, 0.22); }
.st-mutagen.quan { background: rgba(74, 140, 111, 0.16); color: #4A8C6F; border: 0.5px solid rgba(74, 140, 111, 0.22); }
.st-mutagen.ke   { background: rgba(107, 168, 200, 0.16); color: #6BA8C8; border: 0.5px solid rgba(107, 168, 200, 0.22); }
.st-mutagen.ji   { background: rgba(93, 78, 55, 0.13); color: #5D4E37; border: 0.5px solid rgba(93, 78, 55, 0.18); }

/* ═══════════════════════════════════════════════════════════════
   Polaris (centre seal) — 紫微印
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

/* Aura behind the seal — slow exhale */
.polaris::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(198, 40, 40, 0.10) 0%,
    rgba(212, 168, 75, 0.05) 45%,
    transparent 72%);
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: seal-glow 4.2s ease-in-out infinite;
}

.polaris-seal {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  /* Lacquer-red disc with subtle off-centre highlight */
  background: radial-gradient(circle at 38% 32%,
    #DD4848 0%,
    #C62828 48%,
    #8A1B1B 100%);
  border: 2px solid #D4A84B;
  box-shadow:
    0 0 18px rgba(93, 78, 55, 0.25),
    0 0 40px rgba(93, 78, 55, 0.10),
    inset 0 0 6px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: seal-breathe 4.2s ease-in-out infinite;
}

.polaris-char {
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif;
  font-size: 1.5rem;
  color: #D4A84B;
  text-shadow:
    0 0 6px rgba(212, 168, 75, 0.35),
    0 1px 0 rgba(0, 0, 0, 0.18);
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
  letter-spacing: 0.12em;
  opacity: 0.65;
  white-space: nowrap;
}

/* ═══════════════════════════════════════════════════════════════
   Tooltip — 注解卡
   ═══════════════════════════════════════════════════════════════ */
.star-tooltip {
  position: absolute;
  z-index: 20;
  pointer-events: none;
  background: rgba(245, 240, 232, 0.97);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(198, 40, 40, 0.15);
  border-left: 2.5px solid #C62828;
  border-radius: 4px 8px 8px 4px;
  padding: 0.5rem 0.75rem;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.68rem;
  color: #5D4E37;
  max-width: 220px;
  min-width: 110px;
  box-shadow:
    0 6px 18px rgba(93, 78, 55, 0.14),
    0 1px 3px rgba(93, 78, 55, 0.08);
  opacity: 0;
  transform: translateY(2px);
  transition:
    opacity 200ms cubic-bezier(0.22, 0.61, 0.36, 1),
    transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1);
  line-height: 1.55;
  letter-spacing: 0.01em;
}

.star-tooltip.tp-vis {
  opacity: 1;
  transform: translateY(0);
}

/* ═══════════════════════════════════════════════════════════════
   Keyframes — MUST live OUTSIDE @layer per project convention
   ═══════════════════════════════════════════════════════════════ */
@keyframes star-enter {
  0%   { opacity: 0;    transform: translate(-50%, -50%) scale(0.55); }
  60%  { opacity: 0.92; transform: translate(-50%, -50%) scale(1.06); }
  100% { opacity: 1;    transform: translate(-50%, -50%) scale(1); }
}

@keyframes twinkle {
  0%, 100% { filter: brightness(0.9)  saturate(0.96); }
  50%      { filter: brightness(1.12) saturate(1.04); }
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
  0%   { opacity: 0.55; transform: scale(0.88); }
  60%  { opacity: 0.18; transform: scale(1.35); }
  100% { opacity: 0;    transform: scale(1.65); }
}

@keyframes seal-breathe {
  0%, 100% {
    box-shadow:
      0 0 18px rgba(93, 78, 55, 0.25),
      0 0 40px rgba(93, 78, 55, 0.10),
      inset 0 0 6px rgba(0, 0, 0, 0.18);
  }
  50% {
    box-shadow:
      0 0 26px rgba(93, 78, 55, 0.36),
      0 0 54px rgba(93, 78, 55, 0.16),
      inset 0 0 8px rgba(0, 0, 0, 0.22);
  }
}

@keyframes seal-glow {
  0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.55; }
  50%      { transform: translate(-50%, -50%) scale(1.14); opacity: 1; }
}

/* ═══════════════════════════════════════════════════════════════
   Reduced motion — respect user preference
   ═══════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .star-item,
  .palace-label,
  .polaris-seal,
  .polaris::before {
    animation: none !important;
  }
  .star-item {
    opacity: 0.92;
    transform: translate(-50%, -50%);
  }
  .star-item.st-act .st-orb::after {
    animation: none;
    opacity: 0.4;
  }
  .star-tooltip {
    transition: opacity 120ms linear;
    transform: none;
  }
  .star-tooltip.tp-vis { transform: none; }
}

/* ═══════════════════════════════════════════════════════════════
   Responsive — 小屏调适
   ═══════════════════════════════════════════════════════════════ */
@media (max-width: 600px) {
  .pl-name { font-size: 0.72rem; letter-spacing: 0.10em; }
  .pl-branch { font-size: 0.45rem; }
  .palace-label.pl-sel .pl-name { letter-spacing: 0.13em; }
  .star-item .st-orb { width: 9px; height: 9px; }
  .st-major .st-orb { width: 12px; height: 12px; }
  .st-label { font-size: 0.52rem; }
  .st-major .st-label { font-size: 0.6rem; }
  .st-mutagen { font-size: 0.46rem; padding: 1px 3px; }
  .polaris-seal { width: 44px; height: 44px; }
  .polaris-char { font-size: 1.25rem; }
  .polaris::before { width: 72px; height: 72px; }
  .polaris-label { font-size: 0.6rem; bottom: -19px; }
  .star-tooltip { font-size: 0.62rem; max-width: 180px; padding: 0.4rem 0.6rem; }
}
</style>
