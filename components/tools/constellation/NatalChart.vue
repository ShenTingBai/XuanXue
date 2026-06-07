<!-- components/tools/constellation/NatalChart.vue -->
<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import type { NatalChartData, PlanetPosition, AspectLine } from '~/composables/useNatalChart'
import { ZODIACS, MOON_INTERPRETATIONS } from '~/composables/useConstellation'
import { PLANET_META, getPlanetInterpretation } from '~/constants/planet-data'

// ═══════════════════════════════════════════════════════════════
// Props & Emits
// ═══════════════════════════════════════════════════════════════
const props = defineProps<{
  data: NatalChartData
}>()

// ═══════════════════════════════════════════════════════════════
// Geometry Constants
// ═══════════════════════════════════════════════════════════════
const CX = 300
const CY = 300
const INNER_RING = 72
const MID_RING = 115
const OUTER_RING = 155
const HOUSE_LABEL_R = 190
const ASPECT_ZONE_INNER = 210
const SIGN_SYMBOL_R = 265
const OUTER_DECORATION_R = 285

const RING_MAP: Record<string, number> = {
  inner: INNER_RING,
  mid: MID_RING,
  outer: OUTER_RING,
}

// ═══════════════════════════════════════════════════════════════
// Coordinate Helpers
// ═══════════════════════════════════════════════════════════════
const polCache = new Map<string, { x: number; y: number }>()

function pol(angleDeg: number, r: number): { x: number; y: number } {
  const key = `${angleDeg.toFixed(1)},${r}`
  let result = polCache.get(key)
  if (!result) {
    const rad = (angleDeg * Math.PI) / 180
    result = { x: CX + Math.cos(rad) * r, y: CY + Math.sin(rad) * r }
    polCache.set(key, result)
  }
  return result
}

/**
 * Convert ecliptic longitude to SVG angle.
 * Asc at 9 o'clock (SVG 180°), signs run counterclockwise.
 * Formula: svgDeg = 180 - ((lon - ascLon + 360) % 360)
 */
function lonToSvgDeg(lon: number, ascLon: number): number {
  const relative = (((lon - ascLon) % 360) + 360) % 360
  return 180 - relative
}

// ═══════════════════════════════════════════════════════════════
// Reference Asc longitude (default 0° = Aries if no houses)
// ═══════════════════════════════════════════════════════════════
const refAscLongitude = computed(() => props.data.ascLongitude ?? 0)

// ═══════════════════════════════════════════════════════════════
// Planet Ring Assignment (with collision resolution)
// ═══════════════════════════════════════════════════════════════
interface PlanetRenderData {
  planet: PlanetPosition
  svgDeg: number
  radius: number
  pctX: number
  pctY: number
}

const planetRenderData = computed<PlanetRenderData[]>(() => {
  const ascLon = refAscLongitude.value
  const planets = props.data.planets

  const withDefaults = planets.map(p => {
    const svgDeg = lonToSvgDeg(p.longitude, ascLon)
    const meta = PLANET_META[p.id]
    const radius = meta ? RING_MAP[meta.ring] : MID_RING
    return { planet: p, svgDeg, radius, pctX: 0, pctY: 0 }
  })

  // Collision detection: if two planets at same ring within 5°, move one
  for (let i = 0; i < withDefaults.length; i++) {
    for (let j = i + 1; j < withDefaults.length; j++) {
      const a = withDefaults[i]
      const b = withDefaults[j]
      if (a.radius === b.radius) {
        let diff = Math.abs(a.svgDeg - b.svgDeg)
        if (diff > 180) diff = 360 - diff
        if (diff < 5) {
          if (b.radius === INNER_RING) b.radius = MID_RING
          else if (b.radius === MID_RING) b.radius = OUTER_RING
          else b.radius = INNER_RING
        }
      }
    }
  }

  for (const item of withDefaults) {
    const pos = pol(item.svgDeg, item.radius)
    item.pctX = (pos.x / 600) * 100
    item.pctY = (pos.y / 600) * 100
  }

  return withDefaults
})

// ═══════════════════════════════════════════════════════════════
// Sign Data for DOM Rendering
// ═══════════════════════════════════════════════════════════════
interface SignLabelData {
  name: string
  symbol: string
  signIndex: number
  pctX: number
  pctY: number
}

const signLabels = computed<SignLabelData[]>(() => {
  const ascLon = refAscLongitude.value
  return ZODIACS.map((z, i) => {
    const signCenterLon = i * 30 + 15
    const svgDeg = lonToSvgDeg(signCenterLon, ascLon)
    const pos = pol(svgDeg, SIGN_SYMBOL_R)
    return {
      name: z.name,
      symbol: z.symbol,
      signIndex: i,
      pctX: (pos.x / 600) * 100,
      pctY: (pos.y / 600) * 100,
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// House Number Labels
// ═══════════════════════════════════════════════════════════════
interface HouseLabelData {
  number: number
  pctX: number
  pctY: number
}

const houseLabels = computed<HouseLabelData[]>(() => {
  if (!props.data.hasHouses || props.data.ascSignIndex === null) return []
  const ascLon = refAscLongitude.value
  const ascSign = props.data.ascSignIndex

  const labels: HouseLabelData[] = []
  for (let h = 0; h < 12; h++) {
    const signIdx = (ascSign + h) % 12
    const signCenterLon = signIdx * 30 + 15
    const svgDeg = lonToSvgDeg(signCenterLon, ascLon)
    const pos = pol(svgDeg, HOUSE_LABEL_R)
    labels.push({
      number: h + 1,
      pctX: (pos.x / 600) * 100,
      pctY: (pos.y / 600) * 100,
    })
  }
  return labels
})

// ═══════════════════════════════════════════════════════════════
// Sign Sector Dividers (SVG lines)
// ═══════════════════════════════════════════════════════════════
interface DividerLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

const signDividers = computed<DividerLine[]>(() => {
  const ascLon = refAscLongitude.value
  const dividers: DividerLine[] = []
  for (let i = 0; i < 12; i++) {
    const boundaryLon = i * 30
    const svgDeg = lonToSvgDeg(boundaryLon, ascLon)
    const inner = pol(svgDeg, INNER_RING - 10)
    const outer = pol(svgDeg, SIGN_SYMBOL_R + 8)
    dividers.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y })
  }
  return dividers
})

// ═══════════════════════════════════════════════════════════════
// Asc / MC Lines
// ═══════════════════════════════════════════════════════════════
const ascLinePoints = computed(() => {
  if (!props.data.hasHouses || props.data.ascLongitude === null) return null
  const ascLon = refAscLongitude.value
  const svgDeg = lonToSvgDeg(props.data.ascLongitude, ascLon)
  const inner = pol(svgDeg, INNER_RING - 10)
  const outer = pol(svgDeg, OUTER_DECORATION_R)
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y }
})

const mcLinePoints = computed(() => {
  if (!props.data.hasHouses || props.data.mcLongitude === null) return null
  const ascLon = refAscLongitude.value
  const svgDeg = lonToSvgDeg(props.data.mcLongitude, ascLon)
  const inner = pol(svgDeg, INNER_RING - 10)
  const outer = pol(svgDeg, OUTER_DECORATION_R)
  return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y }
})

// ═══════════════════════════════════════════════════════════════
// Aspect Lines (SVG)
// ═══════════════════════════════════════════════════════════════
interface AspectRenderData {
  aspect: AspectLine
  x1: number
  y1: number
  x2: number
  y2: number
  harmonious: boolean
  symbol: string
}

const aspectRenderData = computed<AspectRenderData[]>(() => {
  const ascLon = refAscLongitude.value
  const planetMap: Map<string, PlanetPosition> = new Map(props.data.planets.map(p => [p.id, p]))

  return props.data.aspects.map(aspect => {
    const p1 = planetMap.get(aspect.p1)
    const p2 = planetMap.get(aspect.p2)
    const svgDeg1 = p1 ? lonToSvgDeg(p1.longitude, ascLon) : 0
    const svgDeg2 = p2 ? lonToSvgDeg(p2.longitude, ascLon) : 0

    const r = aspect.type === 'conjunction' ? OUTER_RING + 10 : ASPECT_ZONE_INNER
    const pos1 = pol(svgDeg1, r)
    const pos2 = pol(svgDeg2, r)

    const harmonious = ['conjunction', 'sextile', 'trine'].includes(aspect.type)
    const symbols: Record<string, string> = {
      conjunction: '☌',
      sextile: '⚹',
      square: '□',
      trine: '△',
      opposition: '☍',
    }

    return {
      aspect,
      x1: pos1.x,
      y1: pos1.y,
      x2: pos2.x,
      y2: pos2.y,
      harmonious,
      symbol: symbols[aspect.type] ?? '',
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// Orbit Circles
// ═══════════════════════════════════════════════════════════════
const orbitRadii = [INNER_RING, MID_RING, OUTER_RING, SIGN_SYMBOL_R, OUTER_DECORATION_R]

// ═══════════════════════════════════════════════════════════════
// Tooltip State
// ═══════════════════════════════════════════════════════════════
const tooltipVisible = ref(false)
const tooltipContent = ref<{
  title: string
  signHouse: string
  interpretation: string
  aspects: string
  retrograde: boolean
  boundaryWarning: boolean
} | null>(null)
const tooltipStyle = ref({ left: '0px', top: '0px' })

const chartContainer = ref<HTMLDivElement>()
const tooltipRef = ref<HTMLDivElement>()

function onPlanetEnter(e: MouseEvent | FocusEvent, prd: PlanetRenderData) {
  const p = prd.planet
  // Moon uses MOON_INTERPRETATIONS (from useConstellation), other planets use PLANET_SIGN_INTERPRETATIONS
  const interp =
    p.id === 'moon'
      ? (MOON_INTERPRETATIONS[p.signName] ?? '')
      : getPlanetInterpretation(p.id, p.signName)
  const signHouse =
    props.data.hasHouses && p.houseIndex !== null
      ? `${p.signName} · 第${p.houseIndex}宫`
      : p.signName

  const relatedAspects = props.data.aspects
    .filter(a => a.p1 === p.id || a.p2 === p.id)
    .map(a => {
      const otherId = a.p1 === p.id ? a.p2 : a.p1
      const otherMeta = PLANET_META[otherId]
      const symbols: Record<string, string> = {
        conjunction: '☌',
        sextile: '⚹',
        square: '□',
        trine: '△',
        opposition: '☍',
      }
      return `${symbols[a.type] ?? ''} ${otherMeta?.name ?? otherId}`
    })

  tooltipContent.value = {
    title: `${p.glyph} ${p.name}`,
    signHouse,
    interpretation: interp,
    aspects: relatedAspects.length > 0 ? relatedAspects.join('  ') : '无紧密相位',
    retrograde: p.retrograde,
    boundaryWarning: p.boundaryWarning,
  }

  const container = chartContainer.value
  const tipEl = tooltipRef.value
  if (!container || !tipEl) {
    tooltipStyle.value = { left: '50%', top: '50%' }
    tooltipVisible.value = true
    return
  }

  const target = e.currentTarget as HTMLElement
  const cr = container.getBoundingClientRect()
  const sr = target.getBoundingClientRect()
  const starCx = sr.left + sr.width / 2 - cr.left
  const starCy = sr.top + sr.height / 2 - cr.top

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

  tooltipVisible.value = true
}

function onPlanetLeave() {
  tooltipVisible.value = false
}

// ═══════════════════════════════════════════════════════════════
// Keyboard navigation
// ═══════════════════════════════════════════════════════════════
const focusedPlanetIndex = ref(-1)

function onPlanetKeydown(e: KeyboardEvent, index: number) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    focusedPlanetIndex.value = (index + 1) % 7
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    focusedPlanetIndex.value = (index + 6) % 7
  }
}
</script>

<template>
  <div
    ref="chartContainer"
    class="natal-chart"
    role="img"
    :aria-label="`本命星盘 — 七曜分布图${data.hasHouses ? '，含十二宫位' : ''}`"
  >
    <!-- ═══ SVG 底层 ═══ -->
    <svg
      class="natal-chart__svg"
      viewBox="0 0 600 600"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <!-- Orbit circles -->
      <circle
        v-for="r in orbitRadii"
        :key="`orbit-${r}`"
        :cx="CX"
        :cy="CY"
        :r="r"
        fill="none"
        class="orbit-circle"
        :class="{ 'orbit-circle--outer': r === OUTER_DECORATION_R }"
      />

      <!-- Sign sector dividers -->
      <line
        v-for="(d, i) in signDividers"
        :key="`div-${i}`"
        :x1="d.x1"
        :y1="d.y1"
        :x2="d.x2"
        :y2="d.y2"
        class="sign-divider"
      />

      <!-- Asc line -->
      <line
        v-if="ascLinePoints"
        :x1="ascLinePoints.x1"
        :y1="ascLinePoints.y1"
        :x2="ascLinePoints.x2"
        :y2="ascLinePoints.y2"
        class="asc-line"
      />

      <!-- MC line -->
      <line
        v-if="mcLinePoints"
        :x1="mcLinePoints.x1"
        :y1="mcLinePoints.y1"
        :x2="mcLinePoints.x2"
        :y2="mcLinePoints.y2"
        class="mc-line"
      />

      <!-- Aspect lines -->
      <line
        v-for="(al, i) in aspectRenderData"
        :key="`aspect-${i}`"
        :x1="al.x1"
        :y1="al.y1"
        :x2="al.x2"
        :y2="al.y2"
        class="aspect-line"
        :class="al.harmonious ? 'aspect-line--harmonious' : 'aspect-line--challenging'"
        :stroke-dasharray="al.aspect.type === 'sextile' ? '5,3' : undefined"
      />

      <!-- Planet orbs (SVG circles behind DOM labels) -->
      <circle
        v-for="prd in planetRenderData"
        :key="`orb-${prd.planet.id}`"
        :cx="pol(prd.svgDeg, prd.radius).x"
        :cy="pol(prd.svgDeg, prd.radius).y"
        r="7"
        class="planet-orb"
        :class="`planet-orb--${PLANET_META[prd.planet.id]?.colorClass ?? 'gray'}`"
      />
    </svg>

    <!-- ═══ DOM: 星座符号 ═══ -->
    <div class="signs-layer" aria-hidden="true">
      <span
        v-for="sl in signLabels"
        :key="`sign-${sl.signIndex}`"
        class="sign-symbol"
        :style="{ left: sl.pctX + '%', top: sl.pctY + '%' }"
        >{{ sl.symbol }}</span
      >
    </div>

    <!-- ═══ DOM: 宫位编号 ═══ -->
    <div v-if="houseLabels.length > 0" class="houses-layer" aria-hidden="true">
      <span
        v-for="hl in houseLabels"
        :key="`house-${hl.number}`"
        class="house-number"
        :style="{ left: hl.pctX + '%', top: hl.pctY + '%' }"
        >{{ hl.number }}</span
      >
    </div>

    <!-- ═══ DOM: 行星标签 ═══ -->
    <div class="planets-layer">
      <button
        v-for="(prd, idx) in planetRenderData"
        :key="`planet-${prd.planet.id}`"
        type="button"
        class="planet-btn"
        :class="{
          'planet-btn--retrograde': prd.planet.retrograde,
          'planet-btn--focused': idx === focusedPlanetIndex,
        }"
        :style="{ left: prd.pctX + '%', top: prd.pctY + '%' }"
        :tabindex="idx === 0 ? 0 : -1"
        :aria-label="`${prd.planet.name}${prd.planet.glyph} ${prd.planet.signName}${data.hasHouses && prd.planet.houseIndex ? ' 第' + prd.planet.houseIndex + '宫' : ''}${prd.planet.retrograde ? ' 逆行中' : ''}`"
        @mouseenter="onPlanetEnter($event, prd)"
        @mouseleave="onPlanetLeave"
        @focus="onPlanetEnter($event, prd)"
        @blur="onPlanetLeave"
        @keydown="onPlanetKeydown($event, idx)"
      >
        <span class="planet-glyph">{{ prd.planet.glyph }}</span>
        <span class="planet-name">{{ prd.planet.name }}</span>
        <span v-if="prd.planet.retrograde" class="planet-retrograde" aria-hidden="true">℞</span>
      </button>
    </div>

    <!-- ═══ DOM: 中心印章 ═══ -->
    <div class="center-seal" aria-hidden="true">
      <div class="center-seal__disc">
        <span class="center-seal__char">命</span>
      </div>
    </div>

    <!-- ═══ DOM: Tooltip ═══ -->
    <div
      ref="tooltipRef"
      class="natal-tooltip"
      :class="{ 'natal-tooltip--visible': tooltipVisible }"
      :style="tooltipStyle"
      role="tooltip"
      :aria-hidden="!tooltipVisible"
    >
      <template v-if="tooltipContent">
        <div class="natal-tooltip__title">{{ tooltipContent.title }}</div>
        <div class="natal-tooltip__location">
          落入：{{ tooltipContent.signHouse }}
          <span v-if="tooltipContent.boundaryWarning" class="natal-tooltip__warning"
            >⚠ 靠近星座交界</span
          >
        </div>
        <div v-if="tooltipContent.interpretation" class="natal-tooltip__interp">
          {{ tooltipContent.interpretation }}
        </div>
        <div class="natal-tooltip__aspects">相位：{{ tooltipContent.aspects }}</div>
        <div v-if="tooltipContent.retrograde" class="natal-tooltip__retrograde">逆行中 ℞</div>
      </template>
    </div>

    <!-- Screen reader live region -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
      {{ tooltipContent?.title }} {{ tooltipContent?.signHouse }}
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   Container
   ═══════════════════════════════════════════════════════════════ */
.natal-chart {
  --natal-gold: #d4a84b;
  --natal-ice: #6ba8c8;
  --natal-jade: #4a8c6f;
  --natal-purple: #7b6fa0;
  --natal-cinnabar-highlight: #dd4848;

  position: relative;
  width: 100%;
  max-width: 600px;
  aspect-ratio: 1;
  margin: 0 auto;
  user-select: none;
  overflow: visible;
  isolation: isolate;
}

.natal-chart::before {
  content: '';
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at 50% 48%,
    color-mix(in srgb, var(--color-paper-darker) 16%, transparent) 0%,
    color-mix(in srgb, var(--color-paper-medium) 8%, transparent) 40%,
    transparent 75%
  );
  pointer-events: none;
  z-index: -1;
}

/* ═══════════════════════════════════════════════════════════════
   SVG Layer
   ═══════════════════════════════════════════════════════════════ */
.natal-chart__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.orbit-circle {
  stroke: var(--color-ink-faint);
  stroke-width: 0.6;
  opacity: 0.2;
}

.orbit-circle--outer {
  stroke-width: 1;
  opacity: 0.3;
}

.sign-divider {
  stroke: var(--color-ink-faint);
  stroke-width: 0.4;
  opacity: 0.12;
  stroke-dasharray: 2, 4;
}

.asc-line {
  stroke: var(--color-cinnabar);
  stroke-width: 1.5;
  opacity: 0.5;
}

.mc-line {
  stroke: var(--color-gold);
  stroke-width: 1;
  opacity: 0.35;
}

.aspect-line {
  stroke-width: 1.5;
  opacity: 0.35;
  transition:
    opacity 200ms ease,
    stroke-width 200ms ease;
}

.aspect-line--harmonious {
  stroke: var(--color-jade-light);
}

.aspect-line--challenging {
  stroke: var(--color-cinnabar);
}

/* On hover, all aspect lines become more visible */
.natal-chart:hover .aspect-line {
  opacity: 0.5;
}

.planet-orb {
  stroke-width: 1;
  transition:
    transform 200ms ease,
    opacity 200ms ease;
}

.planet-orb--gold {
  fill: var(--natal-gold);
  stroke: color-mix(in srgb, var(--natal-gold) 50%, transparent);
}
.planet-orb--ice {
  fill: var(--natal-ice);
  stroke: color-mix(in srgb, var(--natal-ice) 50%, transparent);
}
.planet-orb--jade {
  fill: var(--natal-jade);
  stroke: color-mix(in srgb, var(--natal-jade) 50%, transparent);
}
.planet-orb--cinnabar {
  fill: var(--color-cinnabar);
  stroke: color-mix(in srgb, var(--color-cinnabar) 50%, transparent);
}
.planet-orb--purple {
  fill: var(--natal-purple);
  stroke: color-mix(in srgb, var(--natal-purple) 50%, transparent);
}
.planet-orb--gray {
  fill: var(--color-ink-muted);
  stroke: color-mix(in srgb, var(--color-ink-muted) 40%, transparent);
}

/* ═══════════════════════════════════════════════════════════════
   DOM Layers
   ═══════════════════════════════════════════════════════════════ */
.signs-layer,
.houses-layer,
.planets-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.signs-layer {
  z-index: 1;
}
.houses-layer {
  z-index: 1;
}
.planets-layer {
  z-index: 2;
}

/* ═══════════════════════════════════════════════════════════════
   Sign Symbols
   ═══════════════════════════════════════════════════════════════ */
.sign-symbol {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 1.1rem;
  color: var(--color-ink-medium);
  opacity: 0.55;
  line-height: 1;
}

/* ═══════════════════════════════════════════════════════════════
   House Numbers
   ═══════════════════════════════════════════════════════════════ */
.house-number {
  position: absolute;
  transform: translate(-50%, -50%);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-ink-light);
  opacity: 0.45;
  line-height: 1;
}

/* ═══════════════════════════════════════════════════════════════
   Planet Buttons
   ═══════════════════════════════════════════════════════════════ */
.planet-btn {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  background: transparent;
  border: none;
  white-space: nowrap;
  opacity: 0;
  z-index: 2;
  animation: planet-enter 500ms cubic-bezier(0.34, 1.32, 0.64, 1) var(--enter-delay, 0ms) forwards;
}

.planet-btn:hover,
.planet-btn:focus-visible {
  z-index: 10;
}

.planet-glyph {
  font-size: 0.9rem;
  color: var(--color-ink);
  line-height: 1;
  transition: transform 200ms ease;
}

.planet-name {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-muted);
  opacity: 0.7;
  letter-spacing: 0.04em;
  transition:
    opacity 200ms ease,
    color 200ms ease;
}

.planet-btn:hover .planet-glyph {
  transform: scale(1.25);
}

.planet-btn:hover .planet-name {
  opacity: 1;
  color: var(--color-cinnabar);
}

.planet-retrograde {
  font-size: 0.6875rem;
  color: var(--color-cinnabar);
  opacity: 0.8;
  font-weight: 500;
}

.planet-btn--focused .planet-glyph {
  transform: scale(1.2);
}

.planet-btn:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
  border-radius: 3px;
}

/* ═══════════════════════════════════════════════════════════════
   Center Seal
   ═══════════════════════════════════════════════════════════════ */
.center-seal {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
}

.center-seal__disc {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 38% 32%,
    var(--natal-cinnabar-highlight) 0%,
    var(--color-cinnabar) 48%,
    var(--color-cinnabar-dark) 100%
  );
  border: 1.5px solid var(--natal-gold);
  box-shadow:
    0 0 14px color-mix(in srgb, var(--color-ink-muted) 20%, transparent),
    0 0 32px color-mix(in srgb, var(--color-ink-muted) 8%, transparent),
    inset 0 0 4px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-seal__char {
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif;
  font-size: 1.25rem;
  color: var(--natal-gold);
  text-shadow: 0 0 4px color-mix(in srgb, var(--natal-gold) 30%, transparent);
  line-height: 1;
}

/* ═══════════════════════════════════════════════════════════════
   Tooltip
   ═══════════════════════════════════════════════════════════════ */
.natal-tooltip {
  position: absolute;
  z-index: 20;
  pointer-events: none;
  background: color-mix(in srgb, var(--color-paper) 97%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid color-mix(in srgb, var(--color-cinnabar) 15%, transparent);
  border-left: 2.5px solid var(--color-cinnabar);
  border-radius: 4px 8px 8px 4px;
  padding: 0.6rem 0.75rem;
  max-width: 240px;
  min-width: 140px;
  box-shadow:
    0 6px 18px color-mix(in srgb, var(--color-ink-muted) 14%, transparent),
    0 1px 3px color-mix(in srgb, var(--color-ink-muted) 8%, transparent);
  opacity: 0;
  transform: translateY(2px);
  transition:
    opacity 200ms cubic-bezier(0.22, 0.61, 0.36, 1),
    transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1);
  line-height: 1.55;
}

.natal-tooltip--visible {
  opacity: 1;
  transform: translateY(0);
}

.natal-tooltip__title {
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-ink);
  margin-bottom: 2px;
}

.natal-tooltip__location {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-medium);
  margin-bottom: 4px;
}

.natal-tooltip__warning {
  display: inline-block;
  font-size: 0.6875rem;
  color: var(--color-cinnabar);
  opacity: 0.7;
  margin-left: 4px;
}

.natal-tooltip__interp {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-medium);
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-ink-faint) 20%, transparent);
}

.natal-tooltip__aspects {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  margin-bottom: 2px;
}

.natal-tooltip__retrograde {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-cinnabar);
  font-weight: 500;
}

/* ═══════════════════════════════════════════════════════════════
   Keyframes — MUST be outside @layer
   ═══════════════════════════════════════════════════════════════ */
@keyframes planet-enter {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  60% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(1.06);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* ═══════════════════════════════════════════════════════════════
   Reduced Motion
   ═══════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .planet-btn {
    animation: none;
    opacity: 0.92;
    transform: translate(-50%, -50%);
  }
  .natal-tooltip {
    transition: opacity 120ms linear;
    transform: none;
  }
  .natal-tooltip--visible {
    transform: none;
  }
}

/* ═══════════════════════════════════════════════════════════════
   Responsive (≤ 600px)
   ═══════════════════════════════════════════════════════════════ */
@media (max-width: 600px) {
  .sign-symbol {
    font-size: 0.85rem;
  }
  .house-number {
    font-size: 0.625rem;
  }
  .planet-glyph {
    font-size: 0.75rem;
  }
  .planet-name {
    font-size: 0.625rem;
  }
  .planet-retrograde {
    font-size: 0.625rem;
  }
  .center-seal__disc {
    width: 36px;
    height: 36px;
  }
  .center-seal__char {
    font-size: 1rem;
  }
  .natal-tooltip {
    font-size: 0.6875rem;
    max-width: 200px;
    padding: 0.45rem 0.6rem;
  }
  .natal-tooltip__title {
    font-size: 0.75rem;
  }
  .natal-tooltip__interp {
    font-size: 0.6875rem;
  }
}
</style>
