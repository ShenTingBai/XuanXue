<template>
  <div v-if="!hexagram" class="text-center py-8 text-ink-light font-sans text-sm">暂无卦象</div>

  <div v-else class="hexagram-container" :style="{ '--delay': '0.15s' }">
    <!-- Hexagram name header -->
    <div class="text-center mb-5">
      <span
        v-if="label"
        class="font-sans text-[0.6875rem] tracking-[0.2em] text-ink-muted uppercase"
        >{{ label }}</span
      >
      <div class="flex items-center justify-center gap-2 mt-1">
        <span class="font-display text-3xl sm:text-4xl text-ink-dark leading-tight">
          {{ hexagram.name }}
        </span>
      </div>
      <!-- Decorative ink-wash accent -->
      <div class="flex items-center justify-center gap-2 mt-2" aria-hidden="true">
        <span
          class="block w-8 h-px bg-gradient-to-r from-transparent via-paper-dark to-transparent"
        ></span>
        <span
          class="block w-1.5 h-1.5 rotate-45"
          :style="{ backgroundColor: `color-mix(in srgb, var(--color-cinnabar) 60%, transparent)` }"
        ></span>
        <span
          class="block w-8 h-px bg-gradient-to-r from-transparent via-paper-dark to-transparent"
        ></span>
      </div>
    </div>

    <!-- Main body: yao lines + content -->
    <div class="flex flex-col sm:flex-row gap-4 sm:gap-8">
      <!-- Yao lines column -->
      <div class="flex-shrink-0 mx-auto sm:mx-0">
        <div class="yao-container" role="group" :aria-label="`${hexagram.name}卦象`">
          <div
            v-for="(yao, idx) in hexagram.lines"
            :key="idx"
            class="yao-line"
            :class="{
              'yao-line--yang': yao.isYang,
              'yao-line--yin': !yao.isYang,
              'yao-line--changing': yao.isChanging,
              'yao-line--shi': hexagram.shiPosition === idx + 1,
              'yao-line--ying': hexagram.yingPosition === idx + 1,
            }"
          >
            <!-- Position + shi/ying label on the left of bar -->
            <span class="yao-pos" aria-hidden="true">
              <template v-if="hexagram.shiPosition === idx + 1">世</template>
              <template v-else-if="hexagram.yingPosition === idx + 1">应</template>
              <template v-else>{{ ['初', '二', '三', '四', '五', '上'][idx] }}</template>
            </span>

            <!-- Yao bar(s) -->
            <span class="yao-bars" :aria-label="getYaoLabel(yao, idx, hexagram)">
              <template v-if="yao.isYang">
                <span class="yao-bar yao-bar--solid"></span>
              </template>
              <template v-else>
                <span class="yao-bar yao-bar--left"></span>
                <span class="yao-gap"></span>
                <span class="yao-bar yao-bar--right"></span>
              </template>
            </span>

            <!-- Changing indicator dot -->
            <span v-if="yao.isChanging" class="yao-changing-dot" aria-hidden="true"></span>

            <!-- Per-line judgment (fills rightwards space) -->
            <span v-if="judgments && judgments[idx]" class="yao-judgment">
              {{ judgments[idx] }}
            </span>
          </div>
        </div>
      </div>

      <!-- Hexagram judgment + metadata column -->
      <div class="min-w-0 flex-1 flex flex-col justify-center">
        <div v-if="hexagram.judgment" class="hexagram-judgment">
          <p class="judgment-text">{{ hexagram.judgment }}</p>
        </div>

        <!-- Bottom metadata -->
        <div class="hexagram-meta">
          <span class="meta-item">
            <span class="meta-label">上</span>
            <span class="meta-value">{{ upperTrigramName }}</span>
            <span
              v-if="upperWuxing"
              class="meta-badge"
              :style="{
                color: wuxingColor(upperWuxing),
                borderColor: wuxingColor(upperWuxing) + '40',
              }"
              >{{ upperWuxing }}</span
            >
          </span>
          <span class="meta-divider" aria-hidden="true">·</span>
          <span class="meta-item">
            <span class="meta-label">下</span>
            <span class="meta-value">{{ lowerTrigramName }}</span>
            <span
              v-if="lowerWuxing"
              class="meta-badge"
              :style="{
                color: wuxingColor(lowerWuxing),
                borderColor: wuxingColor(lowerWuxing) + '40',
              }"
              >{{ lowerWuxing }}</span
            >
          </span>
          <template v-if="hexagram?.palaceName">
            <span class="meta-divider" aria-hidden="true">·</span>
            <span class="meta-item">
              <span class="meta-label">属</span>
              <span class="meta-value">{{ palaceDisplay }}</span>
            </span>
          </template>
          <span v-if="changingCount > 0" class="meta-divider" aria-hidden="true">·</span>
          <span v-if="changingCount > 0" class="meta-item meta-item--changing">
            <span class="meta-label">动</span>
            <span class="meta-value meta-value--changing">{{ changingDisplay }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { YaoResult } from '~/composables/useYijing'
import { TRIGRAM_NAMES, TRIGRAM_WUXING } from '~/constants/yijing'
import { wuxingColor } from '~/constants/bazi'

interface HexagramProp {
  name: string
  judgment: string
  lines: YaoResult[]
  shiPosition?: number
  yingPosition?: number
  palaceName?: string
  palaceWuxing?: string
}

const props = defineProps<{
  hexagram: HexagramProp | null
  label?: string
  judgments?: string[]
}>()

function trigramIndex(lines: YaoResult[], start: number): number {
  const bits = [lines[start], lines[start + 1], lines[start + 2]]
  return (bits[2].isYang ? 4 : 0) | (bits[1].isYang ? 2 : 0) | (bits[0].isYang ? 1 : 0)
}

const lowerIdx = computed(() => (props.hexagram ? trigramIndex(props.hexagram.lines, 0) : -1))
const upperIdx = computed(() => (props.hexagram ? trigramIndex(props.hexagram.lines, 3) : -1))

const upperTrigramName = computed(() => (upperIdx.value >= 0 ? TRIGRAM_NAMES[upperIdx.value] : ''))
const lowerTrigramName = computed(() => (lowerIdx.value >= 0 ? TRIGRAM_NAMES[lowerIdx.value] : ''))
const upperWuxing = computed(() => (upperIdx.value >= 0 ? TRIGRAM_WUXING[upperIdx.value] : ''))
const lowerWuxing = computed(() => (lowerIdx.value >= 0 ? TRIGRAM_WUXING[lowerIdx.value] : ''))

const palaceDisplay = computed(() => {
  if (!props.hexagram?.palaceName) return ''
  let display = props.hexagram.palaceName
  if (props.hexagram.palaceWuxing) display += `·${props.hexagram.palaceWuxing}`
  return display
})

const changingCount = computed(() => props.hexagram?.lines.filter(l => l.isChanging).length ?? 0)
const changingDisplay = computed(() => {
  if (!props.hexagram || changingCount.value === 0) return ''
  const posLabels = ['初', '二', '三', '四', '五', '上']
  return props.hexagram.lines
    .map((l, i) => (l.isChanging ? posLabels[i] : null))
    .filter(Boolean)
    .join('、')
})

function getYaoLabel(yao: YaoResult, idx: number, hex: HexagramProp): string {
  const posLabels = ['初', '二', '三', '四', '五', '上']
  const type = yao.isYang ? '阳爻' : '阴爻'
  const changing = yao.isChanging ? '动爻' : ''
  const shiYing = hex.shiPosition === idx + 1 ? '世' : hex.yingPosition === idx + 1 ? '应' : ''
  return `${posLabels[idx]}爻 ${type} ${changing} ${shiYing}`.trim()
}
</script>

<style scoped>
/* ── Yao lines container ── */
.yao-container {
  display: inline-flex;
  flex-direction: column-reverse;
  gap: 5px;
  padding: 14px 16px 14px 10px;
  background: color-mix(in srgb, var(--color-ink) 3.5%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-ink) 8%, transparent);
  border-radius: 10px;
}

.yao-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 20px;
  height: auto;
  position: relative;
}

/* Position label on the left */
.yao-pos {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  line-height: 1;
  color: var(--color-ink-muted);
  letter-spacing: 0;
}

/* Yao bars */
.yao-bars {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.yao-bar {
  display: block;
  height: 6px;
  border-radius: 3px;
  background: var(--color-ink-dark);
  transition:
    background 0.3s ease,
    box-shadow 0.3s ease;
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
  border-radius: 3px 0 0 3px;
}

.yao-bar--right {
  border-radius: 0 3px 3px 0;
}

/* Per-line judgment text */
.yao-judgment {
  font-family: var(--font-sans);
  font-size: 0.7rem;
  color: var(--color-ink-medium);
  white-space: normal;
  overflow: visible;
  text-overflow: ellipsis;
  line-height: 1;
  padding-left: 2px;
}

/* Changing dot indicator */
.yao-changing-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-cinnabar);
  flex-shrink: 0;
  animation: pulseDot 2s ease-in-out infinite;
}

/* ── Changing line glow ── */
.yao-line--changing .yao-bar {
  background: var(--color-cinnabar);
  animation: pulseGlow 2s ease-in-out infinite;
}

.yao-line--changing .yao-pos {
  color: var(--color-cinnabar);
}

.yao-line--changing .yao-judgment {
  color: var(--color-cinnabar);
}

/* Shi/Ying styling */
.yao-line--shi .yao-pos {
  color: var(--color-cinnabar);
  font-weight: 600;
}

.yao-line--ying .yao-pos {
  color: var(--color-gold);
  font-weight: 600;
}

/* ── Judgment text ── */
.hexagram-judgment {
  margin-bottom: 10px;
}

.judgment-text {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  line-height: 1.7;
  color: var(--color-ink);
  padding-left: 12px;
  border-left: 3px solid color-mix(in srgb, var(--color-cinnabar) 45%, transparent);
}

/* ── Metadata ── */
.hexagram-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 0;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--color-ink-medium);
}

.meta-label {
  color: color-mix(in srgb, var(--color-ink-medium) 80%, transparent);
}

.meta-value {
  color: var(--color-ink-medium);
  font-weight: 500;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 4px;
  border: 1px solid;
  border-radius: 3px;
  font-size: 0.6875rem;
  line-height: 1.3;
  font-weight: 500;
}

.meta-divider {
  color: var(--color-ink-faint);
  margin: 0 6px;
  font-weight: 300;
}

.meta-item--changing .meta-value {
  color: var(--color-cinnabar);
}

/* ── Responsive ── */
@media (min-width: 640px) {
  .yao-container {
    gap: 6px;
    padding: 16px 20px 16px 12px;
  }
  .yao-line {
    height: 24px;
    gap: 8px;
    min-height: unset;
  }
  .yao-pos {
    width: 22px;
    font-size: 0.6875rem;
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
  .yao-bar {
    height: 7px;
    border-radius: 3.5px;
  }
  .yao-judgment {
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .judgment-text {
    font-size: 0.925rem;
  }
  .hexagram-meta {
    font-size: 0.75rem;
  }
}

@keyframes pulseGlow {
  0%,
  100% {
    box-shadow: 0 0 0px var(--color-cinnabar);
  }
  50% {
    box-shadow: 0 0 8px var(--color-cinnabar);
  }
}

@keyframes pulseDot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
</style>

<style>
.hexagram-container {
  animation: fadeIn 0.5s ease-out forwards;
  animation-delay: var(--delay, 0s);
  opacity: 0;
}
</style>
