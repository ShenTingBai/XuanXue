<!-- components/tools/ziwei/ZiWeiCelestialChart.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import { BRANCH_TO_ANGLE, getStarInterpretation } from '~/constants/ziwei'

// Styling attribute for dynamically created DOM elements
const STYLE_ATTR = 'data-v-ziwei-chart'

// ── Geometry constants (BASE 600 viewBox) ──
const BASE = 600
const CX = 300
const CY = 300

const RINGS = [
  { r: 100, label: '内垣' },
  { r: 145, label: '' },
  { r: 185, label: '' },
  { r: 225, label: '' },
  { r: 255, label: '外垣' },
] as const

const LABEL_R = 282

const props = withDefaults(defineProps<{
  palaces: IFunctionalPalace[]
  selectedIndex: number
  mingGongIndex: number
  isVisible?: boolean
}>(), {
  isVisible: true,
})

const emit = defineEmits<{
  select: [index: number]
}>()

// ── Template refs ──
const chartContainer = ref<HTMLDivElement>()
const orbitSvg = ref<SVGSVGElement>()
const sectorLabelsContainer = ref<HTMLDivElement>()
const starsContainer = ref<HTMLDivElement>()
const palaceArcEl = ref<HTMLDivElement>()

// ── Non-reactive mutable state (performance-critical animation) ──
interface CelestialStar {
  name: string
  color: string
  major: boolean
  palaceIdx: number
  angleDeg: number
  radius: number
  speed: number
  phase: number
  mutagen: string | null
}

let chartScale = 1
let celestialStars: CelestialStar[] = []
let starElements: HTMLElement[] = []
let animFrameId: number | null = null
let chartAnimStart = 0
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let focusedSectorIndex = -1
let palaceBoundaryGroup: SVGElement | null = null
const SVG_NS = 'http://www.w3.org/2000/svg'

// Apply style attribute to dynamically created DOM elements
function scope(el: HTMLElement) {
  el.setAttribute(STYLE_ATTR, '')
}

// ── Tooltip ──
let tooltipEl: HTMLDivElement | null = null
function getTooltip(): HTMLDivElement {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.className = 'star-tooltip'
    scope(tooltipEl)
    chartContainer.value?.appendChild(tooltipEl)
  }
  return tooltipEl
}

// ── Star category Sets (classified by type, not individual name) ──
const MAJOR_STARS = new Set(['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'])
const MALEFIC_STARS = new Set(['陀罗', '擎羊', '火星', '铃星'])
const AUSPICIOUS_STARS = new Set(['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '天马'])

const MUTAGEN_CLS: Record<string, string> = {
  '禄': 'lu', '权': 'quan', '科': 'ke', '忌': 'ji',
}


function getStarColor(name: string): string {
  if (MAJOR_STARS.has(name)) return 'gold'
  if (MALEFIC_STARS.has(name)) return 'gray'
  if (AUSPICIOUS_STARS.has(name)) return 'jade'
  return 'ice'
}

// ── Build celestial star data from iztro palaces ──
function buildCelestialStars() {
  celestialStars = []
  const innerR = RINGS[0].r  // 100
  const outerR = RINGS[4].r  // 255

  props.palaces.forEach((palace, pIdx) => {
    const baseAngle = BRANCH_TO_ANGLE[palace.earthlyBranch] || 0
    const centerAngle = baseAngle + 15
    const allStars: { name: string; major: boolean; mutagen: string | null }[] = [
      ...palace.majorStars.map(s => ({ name: s.name, major: true, mutagen: s.mutagen || null })),
      ...palace.minorStars.map(s => ({ name: s.name, major: false, mutagen: s.mutagen || null })),
      ...palace.adjectiveStars.map(s => ({ name: s.name, major: false, mutagen: s.mutagen || null })),
    ]

    // Find last major star index for mutagen chip attachment
    let lastMajorIdx = -1
    allStars.forEach((s, idx) => { if (s.major) lastMajorIdx = idx })
    // Collect all mutagens for this palace
    const palaceMutagens = allStars.filter(s => s.mutagen).map(s => s.mutagen)

    // Spread stars evenly from inner to outer ring along the same radial line
    const n = allStars.length
    const radiusStep = n > 1 ? (outerR - innerR) / (n - 1) : 0

    allStars.forEach((star, i) => {
      celestialStars.push({
        name: star.name,
        color: getStarColor(star.name),
        major: star.major,
        palaceIdx: pIdx,
        angleDeg: centerAngle,
        radius: innerR + radiusStep * i,
        speed: 0.003 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        mutagen: (palaceMutagens.length > 0 &&
          (i === lastMajorIdx || (lastMajorIdx === -1 && i === 0)))
          ? palaceMutagens.join(',') : null,
      })
    })
  })
}

// ── SVG orbit rings with sector dividers ──
function renderOrbitRings() {
  const svg = orbitSvg.value
  if (!svg) return
  svg.innerHTML = ''

  // Orbit rings — perfect circles so stars travel exactly on them
  RINGS.forEach((ring, idx) => {
    const el = document.createElementNS(SVG_NS, "circle")
    el.setAttribute("cx", String(CX))
    el.setAttribute("cy", String(CY))
    el.setAttribute("r", String(ring.r))
    el.setAttribute("fill", "none")
    const isOuter = idx >= 3
    const isInner = idx <= 1
    el.setAttribute("stroke", isOuter ? "#A89888" : isInner ? "#C8B8A8" : "#B8A898")
    el.setAttribute("stroke-width", "0.8")
    el.setAttribute("opacity", isOuter ? "0.40" : isInner ? "0.30" : "0.35")
    svg.appendChild(el)
  })

  // Sector divider lines (cinnabar ruler marks)
  const branches = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']
  branches.forEach(br => {
    const rawAngle = BRANCH_TO_ANGLE[br] || 0
    const angleRad = (rawAngle - 90) * Math.PI / 180
    const x1 = CX + Math.cos(angleRad) * RINGS[0].r
    const y1 = CY + Math.sin(angleRad) * RINGS[0].r
    const x2 = CX + Math.cos(angleRad) * (RINGS[4].r + 8)
    const y2 = CY + Math.sin(angleRad) * (RINGS[4].r + 8)
    const line = document.createElementNS(SVG_NS, 'line')
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
    line.setAttribute('stroke', '#C62828')
    line.setAttribute('stroke-width', '0.5')
    line.setAttribute('opacity', '0.2')
    svg.appendChild(line)
  })

  // Faint reference cross lines (dashed)
  ;[
    { x1: CX - RINGS[4].r - 10, y1: CY, x2: CX + RINGS[4].r + 10, y2: CY },
    { x1: CX, y1: CY - RINGS[4].r - 10, x2: CX, y2: CY + RINGS[4].r + 10 },
  ].forEach(({ x1, y1, x2, y2 }) => {
    const line = document.createElementNS(SVG_NS, 'line')
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
    line.setAttribute('stroke', '#B8A898')
    line.setAttribute('stroke-width', '0.4')
    line.setAttribute('opacity', '0.16')
    line.setAttribute('stroke-dasharray', '3,5')
    svg.appendChild(line)
  })
}

// ── Sector labels around chart edge ──
function renderSectorLabels() {
  if (chartScale === 0) return
  const container = sectorLabelsContainer.value
  if (!container) return
  container.innerHTML = ''

  focusedSectorIndex = -1

  props.palaces.forEach((palace, i) => {
    const rawAngle = BRANCH_TO_ANGLE[palace.earthlyBranch] || 0
    const angleRad = ((rawAngle + 15) - 90) * Math.PI / 180
    const x = (CX + Math.cos(angleRad) * LABEL_R) * chartScale
    const y = (CY + Math.sin(angleRad) * LABEL_R) * chartScale

    const isMingGong = palace.index === props.mingGongIndex

    const label = document.createElement('div')
    scope(label)
    label.className = 'sector-label' + (isMingGong ? ' ming-gong' : '')
    label.textContent = palace.name
    label.style.left = x + 'px'
    label.style.top = y + 'px'
    label.dataset.index = String(i)
    label.setAttribute('tabindex', '0')
    label.setAttribute('role', 'button')
    label.setAttribute('aria-label', `${palace.name} ${palace.earthlyBranch}宫`)
    label.addEventListener('click', () => emit('select', i))
    label.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        emit('select', i)
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        focusSector((i + 1) % 12)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        focusSector((i + 11) % 12)
      }
    })
    container.appendChild(label)
  })
}

function focusSector(index: number) {
  const container = sectorLabelsContainer.value
  if (!container) return
  const labels = container.querySelectorAll('.sector-label')
  if (focusedSectorIndex >= 0 && labels[focusedSectorIndex]) {
    (labels[focusedSectorIndex] as HTMLElement).tabIndex = -1
  }
  focusedSectorIndex = index
  const target = labels[index] as HTMLElement | undefined
  if (target) {
    target.tabIndex = 0
    target.focus()
  }
}

// ── Star DOM elements positioned on chart ──
function createStarElements() {
  const container = starsContainer.value
  if (!container) return
  container.innerHTML = ''
  starElements = []

  // Container for mutagen chips (layered above stars)
  const chipsContainer = document.createElement('div')
  scope(chipsContainer)
  chipsContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:4;'
  container.appendChild(chipsContainer)

  celestialStars.forEach((star, i) => {
    const el = document.createElement('div')
    scope(el)
    el.className = 'chart-star' + (star.major ? '' : ' minor')
    el.dataset.index = String(i)

    // Label position: right of orb by default, left for right-half stars (60°-240°)
    const normAngle = ((star.angleDeg % 360) + 360) % 360
    if (normAngle >= 60 && normAngle <= 240) {
      el.classList.add('label-left')
    }

    // Orb element
    const orb = document.createElement('div')
    scope(orb)
    orb.className = 'star-orb cls-' + star.color
    el.appendChild(orb)

    // Label beside orb (absolutely positioned via CSS)
    const label = document.createElement('div')
    scope(label)
    label.className = 'star-label'
    label.textContent = star.name
    el.appendChild(label)

    el.setAttribute('tabindex', '0')
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', star.name + (star.mutagen ? ' 化' + star.mutagen : ''))
    el.addEventListener('click', () => emit('select', star.palaceIdx))
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        emit('select', star.palaceIdx)
      }
    })

    // Tooltip handlers
    el.addEventListener('mouseenter', (e) => {
      const tip = getTooltip()
      const interpretation = getStarInterpretation(star.name)
      if (interpretation) {
        tip.textContent = star.name + ': ' + interpretation
        tip.classList.add('visible')
      }
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const containerRect = chartContainer.value!.getBoundingClientRect()
      tip.style.left = (rect.left - containerRect.left + rect.width + 8) + 'px'
      tip.style.top = (rect.top - containerRect.top) + 'px'
    })
    el.addEventListener('mouseleave', () => {
      const tip = tooltipEl
      if (tip) tip.classList.remove('visible')
    })

    container.appendChild(el)
    starElements.push(el)

    // 四化 chip for stars with mutagen
    if (star.mutagen) {
      const mutagens = star.mutagen.split(',')
      mutagens.forEach(m => {
        const chip = document.createElement('div')
        scope(chip)
        chip.className = 'mutagen-chip-tx ' + (MUTAGEN_CLS[m] || 'ji')
        chip.textContent = '化' + m
        chip.dataset.starIdx = String(i)
        chipsContainer.appendChild(chip)
      })
    }
  })

}

// ── Palace arc highlight ──
function drawPalaceArc(index: number) {
  const el = palaceArcEl.value
  if (!el) return

  // Remove old boundary lines
  const svg = orbitSvg.value
  if (svg && palaceBoundaryGroup) {
    palaceBoundaryGroup.remove()
    palaceBoundaryGroup = null
  }

  if (index < 0 || !props.palaces[index]) {
    el.classList.remove('visible')
    return
  }
  const rawAngle = BRANCH_TO_ANGLE[props.palaces[index].earthlyBranch] || 0
  el.style.background =
    `conic-gradient(from ${rawAngle - 15}deg, transparent 0deg, rgba(198,40,40,0.12) 0deg, rgba(198,40,40,0.20) 30deg, transparent 30deg, transparent 360deg)`
  el.classList.add('visible')

  // Draw boundary lines at sector edges
  if (svg) {
    const startAngleRad = (rawAngle - 15 - 90) * Math.PI / 180
    const endAngleRad = (rawAngle + 15 - 90) * Math.PI / 180
    const innerR = RINGS[0].r - 10
    const outerR = RINGS[2].r + 15

    const g = document.createElementNS(SVG_NS, 'g')
    ;[startAngleRad, endAngleRad].forEach(angleRad => {
      const line = document.createElementNS(SVG_NS, 'line')
      line.setAttribute('x1', String(CX + Math.cos(angleRad) * innerR))
      line.setAttribute('y1', String(CY + Math.sin(angleRad) * innerR))
      line.setAttribute('x2', String(CX + Math.cos(angleRad) * outerR))
      line.setAttribute('y2', String(CY + Math.sin(angleRad) * outerR))
      line.setAttribute('stroke', 'rgba(198,40,40,0.4)')
      line.setAttribute('stroke-width', '1.5')
      g.appendChild(line)
    })
    palaceBoundaryGroup = g
    svg.appendChild(g)
  }
}

// ── Animation loop (orbital drift + twinkle) ──
function animateCelestial(timestamp: number) {
  if (!props.isVisible || chartScale === 0) {
    animFrameId = requestAnimationFrame(animateCelestial)
    return
  }

  if (reducedMotion) {
    // Render stars once at their initial positions
    for (let i = 0; i < celestialStars.length; i++) {
      const star = celestialStars[i]
      const el = starElements[i]
      if (!el) continue

      const angleRad = (star.angleDeg - 90) * Math.PI / 180
      const x = (CX + Math.cos(angleRad) * star.radius) * chartScale
      const y = (CY + Math.sin(angleRad) * star.radius) * chartScale

      el.style.left = x + 'px'
      el.style.top = y + 'px'
      el.style.opacity = '0.95'
    }
    return
  }
  const t = (timestamp - chartAnimStart) / 1000

  for (let i = 0; i < celestialStars.length; i++) {
    const star = celestialStars[i]
    const el = starElements[i]
    if (!el) continue

    const angleRad = ((star.angleDeg + t * star.speed * 15) - 90) * Math.PI / 180
    const x = (CX + Math.cos(angleRad) * star.radius) * chartScale
    const y = (CY + Math.sin(angleRad) * star.radius) * chartScale

    el.style.left = x + 'px'
    el.style.top = y + 'px'

    const twinkle = 0.82 + 0.18 * Math.sin(t * 1.5 + star.phase)
    el.style.opacity = String(twinkle)
  }

  // Update 四化 chip positions to follow parent stars
  const container = starsContainer.value
  if (container) {
    const chips = container.querySelectorAll('.mutagen-chip-tx')
    for (let ci = 0; ci < chips.length; ci++) {
      const chip = chips[ci] as HTMLElement
      const sIdx = parseInt(chip.dataset.starIdx || '-1', 10)
      const parentEl = starElements[sIdx]
      if (parentEl) {
        const sx = parseFloat(parentEl.style.left)
        const sy = parseFloat(parentEl.style.top)
        if (!isNaN(sx)) {
          chip.style.left = (sx + 12) + 'px'
          chip.style.top = (sy - 8) + 'px'
        }
      }
    }
  }

  animFrameId = requestAnimationFrame(animateCelestial)
}

// ── Responsive scaling ──
function updateChartScale() {
  if (chartContainer.value) {
    chartScale = chartContainer.value.offsetWidth / BASE
  }
  return chartScale
}

function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    const newScale = updateChartScale()
    if (newScale > 0) {
      if (celestialStars.length === 0) {
        // First render was deferred — do full init now
        doRender()
      } else {
        renderSectorLabels()
      }
    }
  }, 200)
}

// ── Exposed update for parent to trigger on selection change ──
function updateSelection() {
  if (sectorLabelsContainer.value) {
    const labels = sectorLabelsContainer.value.querySelectorAll('.sector-label')
    labels.forEach((label, i) => {
      label.classList.toggle('selected', i === props.selectedIndex)
    })
  }
  starElements.forEach((el, i) => {
    const star = celestialStars[i]
    if (!star) return
    el.classList.toggle('active', star.palaceIdx === props.selectedIndex)
  })
  drawPalaceArc(props.selectedIndex)
}

// ── Init ──
function init() {
  if (updateChartScale() === 0) {
    // Container has no width yet — wait for layout
    if (chartContainer.value) {
      const observer = new ResizeObserver((entries) => {
        if (entries[0] && entries[0].contentRect.width > 0) {
          observer.disconnect()
          updateChartScale()
          doRender()
        }
      })
      observer.observe(chartContainer.value)
    }
    return
  }
  doRender()
}

function doRender() {
  buildCelestialStars()
  renderOrbitRings()
  renderSectorLabels()
  createStarElements()
  updateSelection()
  chartAnimStart = performance.now()
  animFrameId = requestAnimationFrame(animateCelestial)
}

// ── Lifecycle ──
onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  init()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (resizeTimer) clearTimeout(resizeTimer)
  window.removeEventListener('resize', handleResize)
})

// Watch selectedIndex prop for selection changes
watch(() => props.selectedIndex, () => {
  updateSelection()
})

// Pause/resume animation when visibility changes
let reducedMotion = false
watch(() => props.isVisible, (visible) => {
  if (visible) {
    if (!animFrameId && chartScale > 0) {
      chartAnimStart = performance.now()
      animFrameId = requestAnimationFrame(animateCelestial)
    }
  } else {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId)
      animFrameId = null
    }
  }
})
</script>

<template>
  <div ref="chartContainer" class="celestial-chart relative w-full aspect-square max-w-[620px] mx-auto">
    <svg
      ref="orbitSvg"
      class="absolute inset-0 w-full h-full z-0 pointer-events-none"
      :viewBox="`0 0 ${BASE} ${BASE}`"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="紫微斗数天星图 — 十二宫星曜分布"
    ></svg>
    <div ref="sectorLabelsContainer" class="absolute inset-0 z-[1] pointer-events-none"></div>
    <div ref="starsContainer" class="absolute inset-0 z-[3] pointer-events-none"></div>

    <!-- Center seal -->
    <div
      class="center-seal absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[52px] h-[52px] z-10 pointer-events-none"
      aria-label="命宫"
    >
      <div
        class="seal-body w-full h-full rounded-full border-[1.5px] border-[#D4A84B] flex items-center justify-center relative"
        style="background: radial-gradient(circle at 40% 35%, #D44040, #C62828 50%, #8A1B1B); box-shadow: 0 0 20px rgba(93,78,55,0.2), 0 0 44px rgba(93,78,55,0.08), inset 0 1px 2px rgba(255,255,255,0.1); animation: seal-breathe 4s ease-in-out infinite;"
      >
        <span
          class="font-display text-[1.5rem] text-[#D4A84B]"
          style="text-shadow: 0 0 8px rgba(212,168,75,0.3), 0 0 8px rgba(198,40,40,0.3), 0 0 16px rgba(198,40,40,0.1);"
        >紫</span>
      </div>
      <div
        class="absolute -bottom-[18px] left-1/2 -translate-x-1/2 font-display text-[0.7rem] text-ink-light whitespace-nowrap tracking-[0.12em] opacity-50"
      >紫微星</div>
    </div>

    <!-- Palace arc highlight overlay -->
    <div
      ref="palaceArcEl"
      class="palace-arc absolute -inset-1 rounded-full pointer-events-none z-[1] opacity-0 transition-opacity duration-500"
    ></div>
  </div>
</template>

<style scoped>
/* ── Sector Labels ── */
.celestial-chart :deep(.sector-label) {
  position: absolute;
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: #5D4E37;
  opacity: 0.75;
  transition: opacity 0.3s, color 0.3s, text-shadow 0.3s;
  white-space: nowrap;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
  text-shadow: 0 1px 0 rgba(245,240,232,0.6);
}
.celestial-chart :deep(.sector-label:hover) {
  opacity: 0.9;
  color: #5D4E37;
  text-shadow: 0 1px 2px rgba(245,240,232,0.8);
}
.celestial-chart :deep(.sector-label.ming-gong) {
  color: #C62828;
  opacity: 0.75;
}
.celestial-chart :deep(.sector-label.selected) {
  opacity: 0.9;
  color: #5D4E37;
  text-shadow: 0 0 6px rgba(198,40,40,0.15);
}
.celestial-chart :deep(.sector-label:focus-visible) {
  outline: 2px solid rgba(198,40,40,0.4);
  outline-offset: 2px;
  border-radius: 2px;
}

/* ── Chart Stars ── */
.celestial-chart :deep(.chart-star) {
  position: absolute;
  pointer-events: auto;
  cursor: pointer;
  transform: translate(-50%, -50%);
  z-index: 3;
  transition: z-index 0.2s;
}
.celestial-chart :deep(.chart-star:hover) { z-index: 20; }
.celestial-chart :deep(.chart-star:focus-visible) {
  outline: 2px solid rgba(198,40,40,0.4);
  outline-offset: 2px;
  border-radius: 4px;
}
.celestial-chart :deep(.star-orb) { border-radius: 50%; transition: transform 0.3s; }
.celestial-chart :deep(.chart-star:hover .star-orb) { transform: scale(1.25); }

/* Star color orbs */
.celestial-chart :deep(.star-orb.cls-gold) { width: 16px; height: 16px; background: #C62828; border: 1.5px solid #D4A84B; box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.celestial-chart :deep(.star-orb.cls-cinnabar) { width: 16px; height: 16px; background: #A02020; border: 1px solid rgba(198,40,40,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.celestial-chart :deep(.star-orb.cls-jade) { width: 16px; height: 16px; background: #4A8C6F; border: 1px solid rgba(74,140,111,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.celestial-chart :deep(.star-orb.cls-ice) { width: 16px; height: 16px; background: #6BA8C8; border: 1px solid rgba(107,168,200,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.celestial-chart :deep(.star-orb.cls-purple) { width: 16px; height: 16px; background: #7B6FA0; border: 1px solid rgba(123,111,160,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.celestial-chart :deep(.star-orb.cls-gray) { width: 16px; height: 16px; background: #5D4E37; border: 1px solid rgba(93,78,55,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.celestial-chart :deep(.star-orb.cls-white) { width: 16px; height: 16px; background: #8B7D6B; border: 1px solid rgba(139,125,107,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.15); }
.celestial-chart :deep(.chart-star.minor .star-orb.cls-gold) { width: 12px; height: 12px; }
.celestial-chart :deep(.chart-star.minor .star-orb.cls-cinnabar) { width: 12px; height: 12px; }
.celestial-chart :deep(.chart-star.minor .star-orb.cls-jade) { width: 12px; height: 12px; }
.celestial-chart :deep(.chart-star.minor .star-orb.cls-ice) { width: 12px; height: 12px; }
.celestial-chart :deep(.chart-star.minor .star-orb.cls-purple) { width: 12px; height: 12px; }
.celestial-chart :deep(.chart-star.minor .star-orb.cls-gray) { width: 12px; height: 12px; }
.celestial-chart :deep(.chart-star.minor .star-orb.cls-white) { width: 12px; height: 12px; }

/* ── Star Labels ── */
.celestial-chart :deep(.star-label) {
  position: absolute;
  top: 50%;
  left: calc(100% + 4px);
  transform: translateY(-50%);
  color: #4A3828;
  letter-spacing: 0.04em;
  white-space: nowrap;
  opacity: 0.72;
  transition: opacity 0.3s, color 0.3s;
  pointer-events: none;
  font-family: 'Noto Sans SC', sans-serif;
  text-shadow: 0 1px 0 rgba(245,240,232,0.5);
}
.celestial-chart :deep(.chart-star.label-left .star-label) {
  left: auto;
  right: calc(100% + 4px);
}
.celestial-chart :deep(.chart-star:not(.minor) .star-label) {
  font-size: 0.78rem;
  font-weight: 600;
}
.celestial-chart :deep(.chart-star.minor .star-label) {
  font-size: 0.65rem;
  font-weight: 400;
}
.celestial-chart :deep(.chart-star:hover .star-label) { opacity: 0.95; color: #C62828; }
.celestial-chart :deep(.chart-star.active .star-label) { opacity: 0.95; color: #C62828; text-shadow: 0 0 4px rgba(198,40,40,0.15); }

.celestial-chart :deep(.chart-star.active::before) {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 24px; height: 24px;
  border-radius: 50%;
  border: 1px solid #C62828;
  transform: translate(-50%, -50%);
  animation: ring-pulse 2s ease-out infinite;
  pointer-events: none;
  opacity: 0.5;
}

/* ── Mutagen Chips ── */
.celestial-chart :deep(.mutagen-chip-tx) {
  position: absolute;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 0.6rem;
  letter-spacing: 0.04em;
  pointer-events: none;
  z-index: 5;
  white-space: nowrap;
  line-height: 1.2;
  font-family: 'Noto Sans SC', sans-serif;
  transition: opacity 0.3s;
}
.celestial-chart :deep(.mutagen-chip-tx.lu) { background: rgba(198,40,40,0.12); color: #C62828; border: 0.5px solid rgba(198,40,40,0.2); }
.celestial-chart :deep(.mutagen-chip-tx.quan) { background: rgba(74,140,111,0.12); color: #4A8C6F; border: 0.5px solid rgba(74,140,111,0.2); }
.celestial-chart :deep(.mutagen-chip-tx.ke) { background: rgba(107,168,200,0.12); color: #6BA8C8; border: 0.5px solid rgba(107,168,200,0.2); }
.celestial-chart :deep(.mutagen-chip-tx.ji) { background: rgba(93,78,55,0.12); color: #5D4E37; border: 0.5px solid rgba(93,78,55,0.15); }

/* ── Star Tooltip ── */
.celestial-chart :deep(.star-tooltip) {
  position: absolute;
  z-index: 30;
  pointer-events: none;
  background: rgba(245,240,232,0.95);
  border: 1px solid rgba(198,40,40,0.2);
  border-left: 2px solid #C62828;
  border-radius: 8px;
  padding: 0.5rem 0.7rem;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.72rem;
  color: #5D4E37;
  max-width: 160px;
  box-shadow: 0 2px 8px rgba(93,78,55,0.12);
  opacity: 0;
  transition: opacity 0.2s;
  line-height: 1.4;
}
.celestial-chart :deep(.star-tooltip.visible) {
  opacity: 1;
}

/* ── Palace Arc ── */
.palace-arc.visible { opacity: 1 !important; }

/* ── Animations ── */
@keyframes ring-pulse {
  0% { width: 20px; height: 20px; opacity: 0.4; }
  100% { width: 44px; height: 44px; opacity: 0; }
}

@keyframes seal-breathe {
  0%, 100% { box-shadow: 0 0 20px rgba(93,78,55,0.2), 0 0 44px rgba(93,78,55,0.08), inset 0 1px 2px rgba(255,255,255,0.1); }
  50% { box-shadow: 0 0 28px rgba(93,78,55,0.28), 0 0 52px rgba(93,78,55,0.12), inset 0 1px 2px rgba(255,255,255,0.08); }
}

/* ── Reduced Motion ── */
@media (prefers-reduced-motion: reduce) {
  .celestial-chart :deep(.star-orb) { transition: none !important; }
  .celestial-chart :deep(.sector-label) { transition: none !important; }
  .celestial-chart :deep(.chart-star:hover .star-orb) { transform: none; }
}
</style>
