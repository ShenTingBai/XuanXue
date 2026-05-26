<!-- components/tools/ziwei/ZiWeiCelestialChart.vue -->
<script setup lang="ts">
import { getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import { BRANCH_TO_ANGLE } from '~/constants/ziwei'

// Vue scoped style ID — dynamically created DOM elements need this attribute
// for scoped CSS to apply (e.g. position:absolute, colors, fonts).
const scopeId = (getCurrentInstance()?.type as any)?.__scopeId as string | undefined

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

const props = defineProps<{
  palaces: IFunctionalPalace[]
  selectedIndex: number
  mingGongIndex: number
}>()

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

// Apply Vue scoped style attribute to dynamically created DOM elements
function scope(el: HTMLElement) {
  if (scopeId) el.setAttribute(scopeId, '')
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

// ── Wobbly (hand-drawn) circle path SVG ──
function createWobblyCircle(cx: number, cy: number, r: number, wobble: number): string {
  const s = wobble || 1.5
  const o = (i: number) => Math.sin(r * (1.3 + i * 1.4)) * s
  const c = (i: number) => Math.cos(r * (2.7 + i * 2.2)) * s
  const k = 0.5522847498
  return 'M ' + (cx) + ',' + (cy - r + o(0)) +
    ' C ' + (cx + k * r + o(1)) + ',' + (cy - r + o(0)) +
    ' ' + (cx + r + c(1)) + ',' + (cy - k * r + c(2)) +
    ' ' + (cx + r + c(1)) + ',' + (cy) +
    ' C ' + (cx + r + c(1)) + ',' + (cy + k * r + c(3)) +
    ' ' + (cx + k * r + o(1)) + ',' + (cy + r + o(4)) +
    ' ' + (cx) + ',' + (cy + r + o(4)) +
    ' C ' + (cx - k * r + o(5)) + ',' + (cy + r + o(4)) +
    ' ' + (cx - r + c(6)) + ',' + (cy + k * r + c(3)) +
    ' ' + (cx - r + c(6)) + ',' + (cy) +
    ' C ' + (cx - r + c(6)) + ',' + (cy - k * r + c(2)) +
    ' ' + (cx - k * r + o(5)) + ',' + (cy - r + o(0)) +
    ' ' + (cx) + ',' + (cy - r + o(0)) + ' Z'
}

// ── Build celestial star data from iztro palaces ──
function buildCelestialStars() {
  celestialStars = []
  const starRadii = [RINGS[0].r, RINGS[2].r, RINGS[4].r, RINGS[1].r, RINGS[3].r]

  props.palaces.forEach((palace, pIdx) => {
    const baseAngle = BRANCH_TO_ANGLE[palace.earthlyBranch] || 0
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

    allStars.forEach((star, i) => {
      const angleOffset = (i - (allStars.length - 1) / 2) * 4
      celestialStars.push({
        name: star.name,
        color: getStarColor(star.name),
        major: star.major,
        palaceIdx: pIdx,
        angleDeg: baseAngle + 15 + angleOffset,
        radius: starRadii[i % starRadii.length] || RINGS[2].r,
        speed: 0.003 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        mutagen: (i === lastMajorIdx && palaceMutagens.length > 0) ? palaceMutagens.join(',') : null,
      })
    })
  })
}

// ── SVG orbit rings with sector dividers ──
function renderOrbitRings() {
  const svg = orbitSvg.value
  if (!svg) return
  svg.innerHTML = ''

  const ns = 'http://www.w3.org/2000/svg'

  // Wobbly orbit rings
  RINGS.forEach(ring => {
    const pathData = createWobblyCircle(CX, CY, ring.r, 1.2)
    const el = document.createElementNS(ns, 'path')
    el.setAttribute('d', pathData)
    el.setAttribute('fill', 'none')
    el.setAttribute('stroke', '#C5B8A8')
    el.setAttribute('stroke-width', '0.8')
    el.setAttribute('opacity', '0.35')
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
    const line = document.createElementNS(ns, 'line')
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
    const line = document.createElementNS(ns, 'line')
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
    line.setAttribute('stroke', '#C5B8A8')
    line.setAttribute('stroke-width', '0.4')
    line.setAttribute('opacity', '0.12')
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

  props.palaces.forEach((palace, i) => {
    const rawAngle = BRANCH_TO_ANGLE[palace.earthlyBranch] || 0
    const angleRad = ((rawAngle + 15) - 90) * Math.PI / 180
    const x = (CX + Math.cos(angleRad) * LABEL_R) * chartScale
    const y = (CY + Math.sin(angleRad) * LABEL_R) * chartScale

    const label = document.createElement('div')
    scope(label)
    label.className = 'sector-label' + (palace.index === props.mingGongIndex ? ' ming-gong' : '')
    label.textContent = palace.name
    label.style.left = x + 'px'
    label.style.top = y + 'px'
    label.dataset.index = String(i)
    label.addEventListener('click', () => emit('select', i))
    container.appendChild(label)
  })
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

    // Orb element
    const orb = document.createElement('div')
    scope(orb)
    orb.className = 'star-orb cls-' + star.color
    el.appendChild(orb)

    // Label below orb
    const label = document.createElement('div')
    scope(label)
    label.className = 'star-label'
    label.textContent = star.name
    el.appendChild(label)

    el.addEventListener('click', () => emit('select', star.palaceIdx))

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
  if (index < 0 || !props.palaces[index]) {
    el.classList.remove('visible')
    return
  }
  const rawAngle = BRANCH_TO_ANGLE[props.palaces[index].earthlyBranch] || 0
  el.style.background =
    `conic-gradient(from ${rawAngle - 15}deg, transparent 0deg, rgba(198,40,40,0.08) 0deg, rgba(198,40,40,0.16) 30deg, transparent 30deg, transparent 360deg)`
  el.classList.add('visible')
}

// ── Animation loop (orbital drift + twinkle) ──
function animateCelestial(timestamp: number) {
  if (chartScale === 0) {
    animFrameId = requestAnimationFrame(animateCelestial)
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
          chip.style.left = (sx + 10) + 'px'
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
</script>

<template>
  <div ref="chartContainer" class="celestial-chart relative w-full aspect-square max-w-[620px] mx-auto">
    <svg
      ref="orbitSvg"
      class="absolute inset-0 w-full h-full z-0 pointer-events-none"
      :viewBox="`0 0 ${BASE} ${BASE}`"
      preserveAspectRatio="xMidYMid meet"
    ></svg>
    <div ref="sectorLabelsContainer" class="absolute inset-0 z-[1] pointer-events-none"></div>
    <div ref="starsContainer" class="absolute inset-0 z-[3] pointer-events-none"></div>

    <!-- Center seal -->
    <div
      class="center-seal absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[52px] h-[52px] z-10 pointer-events-none"
    >
      <div
        class="seal-body w-full h-full rounded-full border-2 border-[#D4A84B] flex items-center justify-center"
        style="background: radial-gradient(circle at 40% 35%, #D44040, #C62828 50%, #8A1B1B); box-shadow: 0 0 18px rgba(93,78,55,0.25), 0 0 40px rgba(93,78,55,0.1); animation: seal-breathe 4s ease-in-out infinite;"
      >
        <span
          class="font-display text-[1.5rem] text-[#D4A84B]"
          style="text-shadow: 0 0 6px rgba(212,168,75,0.3);"
        >紫</span>
      </div>
      <div
        class="absolute -bottom-[18px] left-1/2 -translate-x-1/2 font-display text-[0.65rem] text-ink-light whitespace-nowrap tracking-[0.1em] opacity-60"
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
.sector-label {
  position: absolute;
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', serif;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: #8B7D6B;
  opacity: 0.6;
  transition: opacity 0.3s, color 0.3s;
  white-space: nowrap;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
}
.sector-label:hover {
  opacity: 0.9;
  color: #5D4E37;
}
.sector-label.ming-gong {
  color: #C62828;
  opacity: 0.8;
}
.sector-label.selected {
  opacity: 0.9;
  color: #6B5B4F;
}

.chart-star {
  position: absolute;
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  z-index: 3;
  transition: z-index 0.2s;
}
.chart-star:hover { z-index: 20; }
.star-orb { border-radius: 50%; transition: transform 0.3s; }
.chart-star:hover .star-orb { transform: scale(1.25); }

/* Star color orbs */
.star-orb.cls-gold { width: 14px; height: 14px; background: #C62828; border: 1.5px solid #D4A84B; box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.star-orb.cls-cinnabar { width: 14px; height: 14px; background: #A02020; border: 1px solid rgba(198,40,40,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.star-orb.cls-jade { width: 14px; height: 14px; background: #4A8C6F; border: 1px solid rgba(74,140,111,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.star-orb.cls-ice { width: 14px; height: 14px; background: #6BA8C8; border: 1px solid rgba(107,168,200,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.star-orb.cls-purple { width: 14px; height: 14px; background: #7B6FA0; border: 1px solid rgba(123,111,160,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.star-orb.cls-gray { width: 14px; height: 14px; background: #5D4E37; border: 1px solid rgba(93,78,55,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.2); }
.star-orb.cls-white { width: 14px; height: 14px; background: #8B7D6B; border: 1px solid rgba(139,125,107,0.3); box-shadow: 0 0 6px rgba(93,78,55,0.15); }
.chart-star.minor .star-orb.cls-gold { width: 11px; height: 11px; }
.chart-star.minor .star-orb.cls-cinnabar { width: 11px; height: 11px; }
.chart-star.minor .star-orb.cls-jade { width: 11px; height: 11px; }
.chart-star.minor .star-orb.cls-ice { width: 11px; height: 11px; }
.chart-star.minor .star-orb.cls-purple { width: 11px; height: 11px; }
.chart-star.minor .star-orb.cls-gray { width: 11px; height: 11px; }
.chart-star.minor .star-orb.cls-white { width: 11px; height: 11px; }

.star-label {
  margin-top: 2px;
  font-size: 0.55rem;
  color: #5D4E37;
  letter-spacing: 0.04em;
  white-space: nowrap;
  opacity: 0.5;
  transition: opacity 0.3s;
  pointer-events: none;
  font-family: 'Noto Serif SC', 'STSong', 'SimSun', 'Songti SC', serif;
}
.chart-star:hover .star-label { opacity: 0.9; }
.chart-star.active .star-label { opacity: 0.9; color: #C62828; }

.chart-star.active::before {
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

.mutagen-chip-tx {
  position: absolute;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 0.5rem;
  letter-spacing: 0.04em;
  pointer-events: none;
  z-index: 5;
  white-space: nowrap;
  line-height: 1.2;
  font-family: 'Noto Serif SC', 'STSong', 'SimSun', 'Songti SC', serif;
  transition: opacity 0.3s;
}
.mutagen-chip-tx.lu { background: rgba(198,40,40,0.15); color: #C62828; border: 0.5px solid rgba(198,40,40,0.2); }
.mutagen-chip-tx.quan { background: rgba(74,140,111,0.15); color: #4A8C6F; border: 0.5px solid rgba(74,140,111,0.2); }
.mutagen-chip-tx.ke { background: rgba(107,168,200,0.15); color: #6BA8C8; border: 0.5px solid rgba(107,168,200,0.2); }
.mutagen-chip-tx.ji { background: rgba(93,78,55,0.12); color: #5D4E37; border: 0.5px solid rgba(93,78,55,0.15); }

.palace-arc.visible { opacity: 1 !important; }

@keyframes ring-pulse {
  0% { width: 20px; height: 20px; opacity: 0.4; }
  100% { width: 44px; height: 44px; opacity: 0; }
}

@keyframes seal-breathe {
  0%, 100% { box-shadow: 0 0 18px rgba(93,78,55,0.25), 0 0 40px rgba(93,78,55,0.1); }
  50% { box-shadow: 0 0 24px rgba(93,78,55,0.35), 0 0 50px rgba(93,78,55,0.15); }
}
</style>
