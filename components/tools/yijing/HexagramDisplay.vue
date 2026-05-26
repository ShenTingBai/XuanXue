<template>
  <div v-if="!hexagram" class="text-center py-8 text-ink-light font-sans text-sm">
    暂无卦象
  </div>

  <div v-else class="hexagram-container fade-in" :style="{ '--delay': '0.15s' }">
    <!-- Label + name header -->
    <div class="text-center mb-5">
      <span v-if="label" class="font-sans text-[0.625rem] tracking-[0.2em] text-ink-light uppercase">{{ label }}</span>
      <h3 class="font-display text-3xl sm:text-4xl text-ink-dark leading-tight mt-1">
        {{ hexagram.name }}
      </h3>
      <!-- Decorative accent -->
      <div class="flex items-center justify-center gap-2 mt-2" aria-hidden="true">
        <span class="block w-8 h-px bg-paper-dark"></span>
        <span class="block w-1.5 h-1.5 rounded-full bg-cinnabar/60"></span>
        <span class="block w-8 h-px bg-paper-dark"></span>
      </div>
    </div>

    <!-- Main body: yao lines + judgment -->
    <div class="flex gap-5 sm:gap-8">
      <!-- Yao lines column -->
      <div class="flex-shrink-0">
        <div class="bg-paper-medium/40 rounded-lg px-3 sm:px-4 py-3 inline-flex flex-col-reverse gap-1.5" role="group" :aria-label="`${hexagram.name}卦象`">
          <div
            v-for="(yao, idx) in hexagram.lines"
            :key="idx"
            class="yao-line"
            :class="{
              'yao-line--yang': yao.isYang,
              'yao-line--yin': !yao.isYang,
              'yao-line--changing': yao.isChanging,
              'yao-line--shi': hexagram.shiPosition === (idx + 1),
              'yao-line--ying': hexagram.yingPosition === (idx + 1),
            }"
            :aria-label="getYaoLabel(yao, idx, hexagram)"
          >
            <!-- Yao bar(s) -->
            <template v-if="yao.isYang">
              <span class="yao-bar yao-bar--solid"></span>
            </template>
            <template v-else>
              <span class="yao-bar yao-bar--left"></span>
              <span class="yao-gap"></span>
              <span class="yao-bar yao-bar--right"></span>
            </template>

            <!-- Position + shi/ying label (always visible) -->
            <span class="yao-label" aria-hidden="true">
              <template v-if="hexagram.shiPosition === (idx + 1)">世</template>
              <template v-else-if="hexagram.yingPosition === (idx + 1)">应</template>
              <template v-else>{{ ['初', '二', '三', '四', '五', '上'][idx] }}</template>
            </span>
          </div>
        </div>
      </div>

      <!-- Judgment + metadata column -->
      <div class="min-w-0 flex-1 flex flex-col justify-between">
        <!-- Hexagram judgment -->
        <div>
          <p v-if="hexagram.judgment" class="font-sans text-sm sm:text-base text-ink leading-relaxed !border-l-[3px] !border-cinnabar/50 pl-4">
            {{ hexagram.judgment }}
          </p>
        </div>

        <!-- Metadata footer -->
        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          <span class="inline-flex items-center gap-1 font-sans text-[0.625rem] text-ink-light tracking-wider">
            <span>上</span>
            <span class="font-medium text-ink-medium">{{ upperTrigramName }}</span>
            <span v-if="upperWuxing">({{ upperWuxing }})</span>
          </span>
          <span class="inline-flex items-center gap-1 font-sans text-[0.625rem] text-ink-light tracking-wider">
            <span>下</span>
            <span class="font-medium text-ink-medium">{{ lowerTrigramName }}</span>
            <span v-if="lowerWuxing">({{ lowerWuxing }})</span>
          </span>
          <span class="inline-flex items-center gap-1 font-sans text-[0.625rem] text-ink-light tracking-wider">
            <span>属</span>
            <span class="font-medium text-ink-medium">{{ palaceDisplay }}</span>
          </span>
          <span v-if="changingCount > 0" class="inline-flex items-center gap-1 font-sans text-[0.625rem] text-ink-light tracking-wider">
            <span>动</span>
            <span class="font-medium text-cinnabar">{{ changingDisplay }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { YaoResult } from '~/composables/useYijing'
import { TRIGRAM_NAMES, TRIGRAM_WUXING } from '~/constants/yijing'

interface HexagramProp {
  name: string
  judgment: string
  lines: YaoResult[]
  shiPosition?: number
  yingPosition?: number
}

const props = defineProps<{
  hexagram: HexagramProp | null
  label?: string
}>()

function trigramIndex(lines: YaoResult[], start: number): number {
  const bits = [lines[start], lines[start + 1], lines[start + 2]]
  return (bits[2].isYang ? 4 : 0) | (bits[1].isYang ? 2 : 0) | (bits[0].isYang ? 1 : 0)
}

const lowerIdx = computed(() => props.hexagram ? trigramIndex(props.hexagram.lines, 0) : -1)
const upperIdx = computed(() => props.hexagram ? trigramIndex(props.hexagram.lines, 3) : -1)

const upperTrigramName = computed(() => upperIdx.value >= 0 ? TRIGRAM_NAMES[upperIdx.value] : '')
const lowerTrigramName = computed(() => lowerIdx.value >= 0 ? TRIGRAM_NAMES[lowerIdx.value] : '')
const upperWuxing = computed(() => upperIdx.value >= 0 ? TRIGRAM_WUXING[upperIdx.value] : '')
const lowerWuxing = computed(() => lowerIdx.value >= 0 ? TRIGRAM_WUXING[lowerIdx.value] : '')

const palaceDisplay = computed(() => '')

const changingCount = computed(() => props.hexagram?.lines.filter(l => l.isChanging).length ?? 0)
const changingDisplay = computed(() => {
  if (!props.hexagram || changingCount.value === 0) return ''
  const posLabels = ['初', '二', '三', '四', '五', '上']
  return props.hexagram.lines
    .map((l, i) => l.isChanging ? posLabels[i] : null)
    .filter(Boolean)
    .join('、')
})

function getYaoLabel(yao: YaoResult, idx: number, hex: HexagramProp): string {
  const posLabels = ['初', '二', '三', '四', '五', '上']
  const type = yao.isYang ? '阳爻' : '阴爻'
  const changing = yao.isChanging ? '动爻' : ''
  const shiYing = hex.shiPosition === (idx + 1) ? '世' : hex.yingPosition === (idx + 1) ? '应' : ''
  return `${posLabels[idx]}爻 ${type} ${changing} ${shiYing}`.trim()
}
</script>

<style scoped>
.yao-line {
  display: flex;
  align-items: center;
  gap: 0;
  height: 14px;
  position: relative;
}

.yao-bar {
  display: block;
  height: 5px;
  border-radius: 2px;
  @apply bg-ink-dark;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.yao-bar--solid {
  width: 56px;
}

.yao-bar--left,
.yao-bar--right {
  width: 24px;
}

.yao-gap {
  width: 8px;
  flex-shrink: 0;
}

.yao-bar--left {
  border-radius: 2px 0 0 2px;
}

.yao-bar--right {
  border-radius: 0 2px 2px 0;
}

.yao-label {
  margin-left: 6px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.6rem;
  @apply text-ink-light;
  line-height: 1;
  white-space: nowrap;
}

.yao-line--changing .yao-bar {
  @apply bg-cinnabar;
  animation: pulseGlow 2s ease-in-out infinite;
}

.yao-line--shi .yao-label {
  @apply text-cinnabar;
  font-weight: 500;
}

.yao-line--ying .yao-label {
  @apply text-gold;
  font-weight: 500;
}

@media (min-width: 640px) {
  .yao-line {
    height: 16px;
  }
  .yao-bar--solid {
    width: 68px;
  }
  .yao-bar--left,
  .yao-bar--right {
    width: 29px;
  }
  .yao-gap {
    width: 10px;
  }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0px #C62828; }
  50% { box-shadow: 0 0 8px #C62828; }
}
</style>
