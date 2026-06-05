<template>
  <div class="fade-in" :style="{ '--delay': '0.15s' }">
    <p class="font-sans text-base text-ink-light mb-3 leading-relaxed">
      神煞是命局中的特殊标记，吉神代表先天福分，凶煞提示需留意之处。
    </p>

    <div class="card-warm rounded-xl p-8 space-y-4">
      <!-- Empty state -->
      <p v-if="groupedShenSha.auspicious.length === 0 && groupedShenSha.neutral.length === 0 && groupedShenSha.inauspicious.length === 0"
        class="font-sans text-sm text-ink-muted">
        该命局无特殊神煞标记
      </p>

      <!-- Category groups -->
      <template v-for="group in shenShaGroups" :key="group.id">
        <div v-if="group.items.length > 0"
          role="group" :aria-labelledby="group.id"
        >
        <h4 :id="group.id" class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-2">{{ group.label }}</h4>
        <ul class="flex flex-wrap gap-1.5 list-none p-0" @keydown="handleRovingKeydown" :aria-label="group.ariaLabel">
          <li
            v-for="(ss, ssIdx) in group.items"
            :key="ss.name + ss.pillar + ss.position"
          >
            <button
              class="shensha-btn inline-flex items-center px-3 py-3 rounded text-sm font-sans cursor-pointer whitespace-nowrap"
              :style="buttonCustomProps(group.category)"
              :title="ss.description + ' — ' + ss.source + ' · ' + ss.pillar + ss.position"
              :tabindex="ssIdx === 0 ? 0 : -1"
              :data-shensha-key="ss.name + ss.pillar + ss.position"
              @mouseenter="onTooltipEnter($event, ss)"
              @mouseleave="onTooltipLeave"
              @focus="onTooltipEnter($event, ss)"
              @blur="onTooltipLeave"
              @click="toggleShen(ss)"
            >
              {{ ss.name }}
            </button>
          </li>
        </ul>
          </div>
        </template>
      </div>

    <!-- Single teleported tooltip — immune to ancestor containing blocks -->
    <Teleport to="body">
      <div
        v-if="activeTooltip"
        class="tooltip-fixed rounded-lg text-xs font-sans z-[9999] bg-ink-darkest text-paper-medium border border-ink-medium shadow-lg"
        :class="{ 'opacity-100': !!activeTooltip, 'opacity-0': !activeTooltip }"
        :style="tooltipPos"
      >
        <div class="px-2.5 py-1.5">
          <p class="leading-relaxed tooltip-desc">{{ activeTooltip.shensha.description }}</p>
          <p class="mt-2 text-[0.75rem]" :style="{ color: 'color-mix(in srgb, var(--color-paper-medium) 75%, transparent)' }">{{ activeTooltip.shensha.source }} · {{ activeTooltip.shensha.pillar }}{{ activeTooltip.shensha.position }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { ShenSha } from '~/composables/useShenSha'
import { shenShaBadgeStyle } from '~/constants/bazi'

function buttonCustomProps(category: '吉' | '凶' | '中性'): Record<string, string> {
  const s = shenShaBadgeStyle(category)
  // Darker hover background — bump from 8% to 14% (吉/凶) or 12% (中性)
  const hoverPct = category === '吉' || category === '凶' ? '14%' : '12%'
  const shadowAlpha = category === '吉' ? '15%' : category === '凶' ? '12%' : '10%'
  return {
    '--badge-bg': s.bg,
    '--badge-text': s.text,
    '--badge-border': s.border,
    '--badge-bg-hover': s.bg.replace(/8%/, hoverPct),
    '--badge-shadow': `color-mix(in srgb, ${s.text} ${shadowAlpha}, transparent)`,
  }
}

const props = defineProps<{
  shenSha: ShenSha[]
}>()

type ShenShaGroup = { auspicious: ShenSha[], neutral: ShenSha[], inauspicious: ShenSha[] }
const groupedShenSha = computed<ShenShaGroup>(() => {
  const groups: ShenShaGroup = { auspicious: [], neutral: [], inauspicious: [] }
  for (const s of props.shenSha) {
    if (s.category === '吉') groups.auspicious.push(s)
    else if (s.category === '中性') groups.neutral.push(s)
    else groups.inauspicious.push(s)
  }
  return groups
})

const shenShaGroups = computed(() => [
  { id: 'shensha-ji', label: '吉神', ariaLabel: '吉神清单', items: groupedShenSha.value.auspicious, category: '吉' as const },
  { id: 'shensha-zhongxing', label: '中性', ariaLabel: '中性神煞清单', items: groupedShenSha.value.neutral, category: '中性' as const },
  { id: 'shensha-xiong', label: '凶煞', ariaLabel: '凶煞清单', items: groupedShenSha.value.inauspicious, category: '凶' as const },
])

// ── Tooltip state (teleported to <body>) ──

interface TooltipState {
  shensha: ShenSha
  key: string
}

const activeTooltip = ref<TooltipState | null>(null)
const expandedKey = ref<string | null>(null)

function toggleShen(ss: ShenSha) {
  const key = ss.name + ss.pillar + ss.position
  expandedKey.value = expandedKey.value === key ? null : key
  if (expandedKey.value) {
    // Re-show tooltip for the expanded item (position already computed)
    activeTooltip.value = { shensha: ss, key }
  } else {
    activeTooltip.value = null
  }
}

// ── JS-driven tooltip positioning ──

const MOBILE_BP = 640
const GAP = 8
const VIEW_PADDING = 8

function isDesktop(): boolean {
  return window.innerWidth >= MOBILE_BP
}

/** Approximate tooltip pixel height — used for viewport clamping before layout. */
const TOOLTIP_EST_HEIGHT = 72

const tooltipPos = ref<Record<string, string>>({})

function computePosition(key: string, rect: DOMRect) {
  const desktop = isDesktop()

  let top: number
  let left: number
  let transform = 'none'

  if (desktop) {
    // Position ABOVE the button, horizontally centered
    top = rect.top - GAP
    left = rect.left + rect.width / 2
    transform = 'translate(-50%, -100%)'

    // If too close to top edge, flip below
    if (top - TOOLTIP_EST_HEIGHT < VIEW_PADDING) {
      top = rect.bottom + GAP
      transform = 'translate(-50%, 0)'
    }
  } else {
    // Mobile: BELOW the button, left-aligned
    top = rect.bottom + GAP
    left = rect.left

    // If too close to bottom edge, flip above
    if (top + TOOLTIP_EST_HEIGHT > window.innerHeight - VIEW_PADDING) {
      top = rect.top - GAP
      transform = 'translate(0, -100%)'
    }

    // Clamp horizontal edges — use a conservative min estimate since
    // tooltip width is now content-driven (no hard min-width).
    const maxLeft = window.innerWidth - 120 - VIEW_PADDING
    if (left > maxLeft) left = maxLeft
    left = Math.max(VIEW_PADDING, left)
  }

  tooltipPos.value = {
    top: top + 'px',
    left: left + 'px',
    transform,
    maxWidth: desktop ? '20rem' : 'calc(100vw - 16px)',
  }
}

let hideTimer: ReturnType<typeof setTimeout> | null = null

function onTooltipEnter(event: MouseEvent | FocusEvent, ss: ShenSha) {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }

  const key = ss.name + ss.pillar + ss.position
  const btn = event.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()

  computePosition(key, rect)
  activeTooltip.value = { shensha: ss, key }
}

function onTooltipLeave() {
  hideTimer = setTimeout(() => {
    // Only hide if not click-expanded
    if (!expandedKey.value) {
      activeTooltip.value = null
    }
  }, 80)
}

// ── Roving tabindex keyboard nav ──

function handleRovingKeydown(e: KeyboardEvent) {
  const ul = e.currentTarget as HTMLElement
  const buttons = ul.querySelectorAll<HTMLElement>('button.shensha-btn')
  if (buttons.length === 0) return

  const currentIdx = Array.from(buttons).findIndex(b => b === document.activeElement)
  let nextIdx: number

  switch (e.key) {
    case 'ArrowRight': nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, buttons.length - 1); break
    case 'ArrowLeft': nextIdx = currentIdx < 0 ? buttons.length - 1 : Math.max(currentIdx - 1, 0); break
    case 'Home': nextIdx = 0; break
    case 'End': nextIdx = buttons.length - 1; break
    default: return
  }
  e.preventDefault()
  buttons.forEach((b, i) => { b.tabIndex = i === nextIdx ? 0 : -1 })
  buttons[nextIdx].focus()
  // Trigger tooltip for keyboard-focused button
  const dataKey = buttons[nextIdx].getAttribute('data-shensha-key')
  if (dataKey) {
    // Look up ShenSha from all groups
    for (const g of shenShaGroups.value) {
      const found = g.items.find(s => (s.name + s.pillar + s.position) === dataKey)
      if (found) {
        onTooltipEnter({ currentTarget: buttons[nextIdx] } as unknown as MouseEvent, found)
        break
      }
    }
  }
}

onUnmounted(() => {
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<style scoped>
/* ── ShenSha button with CSS-custom-property hover ── */
.shensha-btn {
  background: var(--badge-bg);
  color: var(--badge-text);
  border: 1px solid var(--badge-border);
  transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.shensha-btn:hover,
.shensha-btn:focus-visible {
  background: var(--badge-bg-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px var(--badge-shadow);
}

.shensha-btn:active {
  transform: scale(0.97);
}

/* ── Teleported tooltip (immune to containing blocks) ── */
.tooltip-fixed {
  position: fixed;
  white-space: normal;
  pointer-events: none;
  transition: opacity 0.12s ease;
  width: auto;
}

.tooltip-fixed p {
  margin: 0;
}

/* Prevent ugly mid-phrase breaks for CJK descriptions */
.tooltip-desc {
  word-break: normal;
  overflow-wrap: break-word;
}
</style>
