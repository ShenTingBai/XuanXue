<template>
  <div class="fade-in" :style="{ '--delay': '0.15s' }">
    <InkDivider>神煞</InkDivider>

    <p class="font-sans text-base text-ink-light mb-3 leading-relaxed">
      神煞是命局中的特殊标记，吉神代表先天福分，凶煞提示需留意之处。
    </p>

    <div class="card-paper-solid rounded-xl p-4 sm:p-5 space-y-4">
      <!-- Empty state: no shenshas at all -->
      <p v-if="auspicious.length === 0 && neutral.length === 0 && inauspicious.length === 0"
        class="font-sans text-sm text-ink-faint">
        该命局无特殊神煞标记
      </p>

      <!-- 吉神 -->
      <div v-if="auspicious.length > 0" role="group" aria-labelledby="shensha-ji">
        <h4 id="shensha-ji" class="font-sans text-xs font-medium text-ink-light tracking-wider mb-2">吉神</h4>
        <ul class="flex flex-wrap gap-1.5 list-none p-0" @keydown="handleRovingKeydown" :aria-label="'吉神清单'">
          <li
            v-for="(ss, ssIdx) in auspicious"
            :key="ss.name + ss.pillar + ss.position"
            class="relative group"
          >
            <button
              class="inline-flex items-center px-2 py-0.5 rounded text-sm font-sans transition-colors border-none bg-transparent cursor-pointer"
              :style="buttonStyle('吉')"
              :title="ss.description + ' — ' + ss.source + ' · ' + ss.pillar + ss.position"
              :tabindex="ssIdx === 0 ? 0 : -1"
              @click="toggleShen(ss.name + ss.pillar + ss.position)"
            >
              {{ ss.name }}
            </button>
            <!-- Tooltip -->
            <span
              class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg text-xs font-sans transition-opacity pointer-events-none z-20"
              :class="[
                'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                expandedShen === (ss.name + ss.pillar + ss.position) ? 'opacity-100' : '',
              ]"
              :style="tooltipStyle"
            >
              {{ ss.description }}
              <span class="block mt-0.5 opacity-60 text-[0.65rem]">{{ ss.source }} · {{ ss.pillar }}{{ ss.position }}</span>
            </span>
          </li>
        </ul>
      </div>

      <!-- 中性 -->
      <div v-if="neutral.length > 0" role="group" aria-labelledby="shensha-zhongxing">
        <h4 id="shensha-zhongxing" class="font-sans text-xs font-medium text-ink-light tracking-wider mb-2">中性</h4>
        <ul class="flex flex-wrap gap-1.5 list-none p-0" @keydown="handleRovingKeydown" :aria-label="'中性神煞清单'">
          <li
            v-for="(ss, ssIdx) in neutral"
            :key="ss.name + ss.pillar + ss.position"
            class="relative group"
          >
            <button
              class="inline-flex items-center px-2 py-0.5 rounded text-sm font-sans transition-colors border-none bg-transparent cursor-pointer"
              :style="buttonStyle('中性')"
              :title="ss.description + ' — ' + ss.source + ' · ' + ss.pillar + ss.position"
              :tabindex="ssIdx === 0 ? 0 : -1"
              @click="toggleShen(ss.name + ss.pillar + ss.position)"
            >
              {{ ss.name }}
            </button>
            <span
              class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg text-xs font-sans transition-opacity pointer-events-none z-20"
              :class="[
                'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                expandedShen === (ss.name + ss.pillar + ss.position) ? 'opacity-100' : '',
              ]"
              :style="tooltipStyle"
            >
              {{ ss.description }}
              <span class="block mt-0.5 opacity-60 text-[0.65rem]">{{ ss.source }} · {{ ss.pillar }}{{ ss.position }}</span>
            </span>
          </li>
        </ul>
      </div>

      <!-- 凶煞 -->
      <div v-if="inauspicious.length > 0" role="group" aria-labelledby="shensha-xiong">
        <h4 id="shensha-xiong" class="font-sans text-xs font-medium text-ink-light tracking-wider mb-2">凶煞</h4>
        <ul class="flex flex-wrap gap-1.5 list-none p-0" @keydown="handleRovingKeydown" :aria-label="'凶煞清单'">
          <li
            v-for="(ss, ssIdx) in inauspicious"
            :key="ss.name + ss.pillar + ss.position"
            class="relative group"
          >
            <button
              class="inline-flex items-center px-2 py-0.5 rounded text-sm font-sans transition-colors border-none bg-transparent cursor-pointer"
              :style="buttonStyle('凶')"
              :title="ss.description + ' — ' + ss.source + ' · ' + ss.pillar + ss.position"
              :tabindex="ssIdx === 0 ? 0 : -1"
              @click="toggleShen(ss.name + ss.pillar + ss.position)"
            >
              {{ ss.name }}
            </button>
            <span
              class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg text-xs font-sans transition-opacity pointer-events-none z-20"
              :class="[
                'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                expandedShen === (ss.name + ss.pillar + ss.position) ? 'opacity-100' : '',
              ]"
              :style="tooltipStyle"
            >
              {{ ss.description }}
              <span class="block mt-0.5 opacity-60 text-[0.65rem]">{{ ss.source }} · {{ ss.pillar }}{{ ss.position }}</span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShenSha } from '~/composables/useShenSha'
import InkDivider from '~/components/tools/InkDivider.vue'
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`
}

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

const tooltipStyle = {
  background: '#1A0F0A',
  color: '#EDE4D3',
  border: `1px solid ${WUXING_FALLBACK_COLOR}`,
  maxWidth: '16rem',
  whiteSpace: 'normal' as const,
}

const props = defineProps<{
  shenSha: ShenSha[]
}>()

const auspicious = computed(() => props.shenSha.filter(s => s.category === '吉'))
const neutral = computed(() => props.shenSha.filter(s => s.category === '中性'))
const inauspicious = computed(() => props.shenSha.filter(s => s.category === '凶'))

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
