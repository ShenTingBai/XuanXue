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
        <ul class="flex flex-wrap gap-1.5 list-none p-0" tabindex="0" @keydown="handleRovingKeydown" @focus="handleUlFocus" :aria-label="'吉神清单'">
          <li
            v-for="ss in auspicious"
            :key="ss.name + ss.pillar + ss.position"
            class="relative group"
          >
            <button
              class="inline-flex items-center px-2 py-0.5 rounded text-sm font-sans transition-colors border-none bg-transparent cursor-pointer"
              :style="{ background: '#4A7C5918', color: '#4A7C59', border: '1px solid #4A7C5930' }"
              :title="ss.description + ' — ' + ss.source + ' · ' + ss.pillar + ss.position"
              tabindex="-1"
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
              style="background: #2C2C2C; color: #D4C9B8; max-width: 16rem; white-space: normal;"
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
        <ul class="flex flex-wrap gap-1.5 list-none p-0" tabindex="0" @keydown="handleRovingKeydown" @focus="handleUlFocus" :aria-label="'中性神煞清单'">
          <li
            v-for="ss in neutral"
            :key="ss.name + ss.pillar + ss.position"
            class="relative group"
          >
            <button
              class="inline-flex items-center px-2 py-0.5 rounded text-sm font-sans transition-colors border-none bg-transparent cursor-pointer"
              :style="{ background: '#6B5B4F12', color: '#6B5B4F', border: '1px solid #6B5B4F28' }"
              :title="ss.description + ' — ' + ss.source + ' · ' + ss.pillar + ss.position"
              tabindex="-1"
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
              style="background: #2C2C2C; color: #D4C9B8; max-width: 16rem; white-space: normal;"
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
        <ul class="flex flex-wrap gap-1.5 list-none p-0" tabindex="0" @keydown="handleRovingKeydown" @focus="handleUlFocus" :aria-label="'凶煞清单'">
          <li
            v-for="ss in inauspicious"
            :key="ss.name + ss.pillar + ss.position"
            class="relative group"
          >
            <button
              class="inline-flex items-center px-2 py-0.5 rounded text-sm font-sans transition-colors border-none bg-transparent cursor-pointer"
              :style="{ background: '#C628280E', color: '#C6282890', border: '1px solid #C6282820' }"
              :title="ss.description + ' — ' + ss.source + ' · ' + ss.pillar + ss.position"
              tabindex="-1"
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
              style="background: #2C2C2C; color: #D4C9B8; max-width: 16rem; white-space: normal;"
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
  buttons[nextIdx].focus()
}

function handleUlFocus(e: FocusEvent) {
  const ul = e.currentTarget as HTMLElement
  const buttons = ul.querySelectorAll<HTMLElement>('button')
  if (buttons.length > 0 && !ul.contains(document.activeElement)) {
    buttons[0].focus()
  }
}
</script>
