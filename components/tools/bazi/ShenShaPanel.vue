<template>
  <div class="fade-in" :style="{ '--delay': '0.15s' }">
    <InkDivider>神煞</InkDivider>

    <p class="font-sans text-base text-ink-light mb-3 leading-relaxed">
      神煞是命局中的特殊标记，吉神代表先天福分，凶煞提示需留意之处。
    </p>

    <div class="card-paper-solid rounded-xl p-4 sm:p-5 space-y-4">
      <!-- Empty state: no shenshas at all -->
      <p v-if="groupedShenSha.auspicious.length === 0 && groupedShenSha.neutral.length === 0 && groupedShenSha.inauspicious.length === 0"
        class="font-sans text-sm text-ink-muted">
        该命局无特殊神煞标记
      </p>

      <!-- Category groups: 吉神 / 中性 / 凶煞 -->
      <template v-for="group in shenShaGroups" :key="group.id">
        <div v-if="group.items.length > 0"
          role="group" :aria-labelledby="group.id"
        >
        <h4 :id="group.id" class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-2">{{ group.label }}</h4>
        <ul class="flex flex-wrap gap-1.5 list-none p-0" @keydown="handleRovingKeydown" :aria-label="group.ariaLabel">
          <li
            v-for="(ss, ssIdx) in group.items"
            :key="ss.name + ss.pillar + ss.position"
            class="relative group"
          >
            <button
              class="inline-flex items-center px-3 py-2.5 rounded text-sm font-sans transition-colors border-none bg-transparent cursor-pointer"
              :style="buttonStyle(group.category)"
              :title="ss.description + ' — ' + ss.source + ' · ' + ss.pillar + ss.position"
              :tabindex="ssIdx === 0 ? 0 : -1"
              @click="toggleShen(ss.name + ss.pillar + ss.position)"
            >
              {{ ss.name }}
            </button>
            <!-- Tooltip -->
            <span
              class="tooltip-anchor px-2.5 py-1.5 rounded-lg text-xs font-sans transition-opacity pointer-events-none z-50 bg-ink-darkest text-paper-medium border border-ink-medium shadow-lg"
              :class="[
                'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                expandedShen === (ss.name + ss.pillar + ss.position) ? 'opacity-100' : '',
              ]"
            >
              {{ ss.description }}
              <span class="block mt-0.5 opacity-75 text-[0.7rem]">{{ ss.source }} · {{ ss.pillar }}{{ ss.position }}</span>
            </span>
          </li>
        </ul>
          </div>
        </template>
      </div>
  </div>
</template>

<script setup lang="ts">
import type { ShenSha } from '~/composables/useShenSha'
import InkDivider from '~/components/tools/InkDivider.vue'
import { WUXING_COLORS, WUXING_FALLBACK_COLOR, hexToRgba } from '~/constants/bazi'

function buttonStyle(category: '吉' | '凶' | '中性'): Record<string, string> {
  const wood = WUXING_COLORS['木']
  const fire = WUXING_COLORS['火']
  const fb = WUXING_FALLBACK_COLOR
  switch (category) {
    case '吉':
      return { background: hexToRgba(wood, 24 / 255), color: wood, border: `1px solid ${hexToRgba(wood, 48 / 255)}` }
    case '凶':
      return { background: hexToRgba(fire, 14 / 255), color: fire, border: `1px solid ${hexToRgba(fire, 32 / 255)}` }
    case '中性':
      return { background: hexToRgba(fb, 18 / 255), color: fb, border: `1px solid ${hexToRgba(fb, 40 / 255)}` }
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

const expandedShen = ref('')
function toggleShen(key: string) {
  expandedShen.value = expandedShen.value === key ? '' : key
}

function handleRovingKeydown(e: KeyboardEvent) {
  const ul = e.currentTarget as HTMLElement
  const buttons = ul.querySelectorAll<HTMLElement>('button')
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
  // Dynamically switch tabindex: set current button to 0, all others to -1
  buttons.forEach((b, i) => { b.tabIndex = i === nextIdx ? 0 : -1 })
  buttons[nextIdx].focus()
}
</script>

<style scoped>
/* Desktop: tooltip anchored above the badge */
.tooltip-anchor {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.375rem;
}

/* Mobile: fixed tooltip centered in viewport to avoid overflow */
@media (max-width: 640px) {
  .tooltip-anchor {
    position: fixed;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    margin-bottom: 0;
    z-index: 100;
  }
}
</style>
