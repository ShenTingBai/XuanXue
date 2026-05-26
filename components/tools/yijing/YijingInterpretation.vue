<template>
  <div v-if="!result" class="text-center py-12 text-ink-light font-sans text-sm">
    尚无占卜结果，请先起卦。
  </div>

  <div v-else class="fade-in" :style="{ '--delay': '0.25s' }">
    <!-- Score ring -->
    <InkDivider>卦象评分</InkDivider>
    <div class="flex justify-center mb-8">
      <div class="score-ring-wrapper">
        <svg class="score-ring" viewBox="0 0 120 120" aria-label="卦象评分：{{ score }}分">
          <!-- Background circle -->
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="#E0D5C0"
            stroke-width="6"
          />
          <!-- Score circle -->
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="#C62828"
            stroke-width="6"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            class="score-ring-fill"
          />
        </svg>
        <div class="score-ring-text">
          <span class="score-number">{{ score }}</span>
          <span class="score-label">分</span>
        </div>
      </div>
    </div>

    <!-- Primary hexagram -->
    <InkDivider>本卦</InkDivider>
    <div class="card-paper-solid rounded-xl p-4 sm:p-6 mb-6">
      <HexagramDisplay
        :hexagram="{
          name: result.hexagram.name,
          judgment: result.hexagram.judgment,
          lines: result.lines.map(l => l.yao),
          shiPosition: result.hexagram.shiPosition,
          yingPosition: result.hexagram.yingPosition,
        }"
        label="本卦"
      />
    </div>

    <!-- Derived hexagram (变卦) -->
    <template v-if="result.derivedHexagram && result.derivedLines">
      <InkDivider>变卦</InkDivider>
      <div class="card-paper-solid rounded-xl p-4 sm:p-6 mb-6">
        <HexagramDisplay
          :hexagram="{
            name: result.derivedHexagram.name,
            judgment: result.derivedHexagram.judgment,
            lines: result.derivedLines.map(l => l.yao),
            shiPosition: result.derivedHexagram.shiPosition,
            yingPosition: result.derivedHexagram.yingPosition,
          }"
          label="变卦"
        />
      </div>
    </template>

    <!-- Mutual hexagram (互卦) — collapsible -->
    <template v-if="result.huGua && result.huGuaLines">
      <InkDivider>互卦</InkDivider>
      <div class="card-paper-solid rounded-xl p-4 sm:p-6 mb-6">
        <button
          class="flex items-center gap-2 w-full text-left mb-3"
          @click="showHuGua = !showHuGua"
          @keydown.enter="showHuGua = !showHuGua"
          :aria-expanded="showHuGua"
          aria-controls="hu-gua-content"
        >
          <span
            class="inline-block transition-transform duration-200"
            :class="{ 'rotate-90': showHuGua }"
            aria-hidden="true"
          >&#9654;</span>
          <span class="font-sans text-sm text-ink-medium tracking-wider">查看互卦</span>
        </button>

        <div v-show="showHuGua" id="hu-gua-content">
          <HexagramDisplay
            :hexagram="{
              name: result.huGua.name,
              judgment: result.huGua.judgment,
              lines: result.huGuaLines.map(l => l.yao),
              shiPosition: result.huGua.shiPosition,
              yingPosition: result.huGua.yingPosition,
            }"
            label="互卦"
          />
        </div>
      </div>
    </template>

    <!-- Interpretation text -->
    <InkDivider>卦象解读</InkDivider>
    <div class="card-paper-solid rounded-xl p-4 sm:p-6 mb-6">
      <div class="interpretation-text">
        <p
          v-for="(paragraph, idx) in interpretationParagraphs"
          :key="idx"
          class="leading-relaxed"
          :class="{ 'mb-3': idx < interpretationParagraphs.length - 1 }"
        >
          {{ paragraph }}
        </p>
      </div>
    </div>

    <!-- Line detail table -->
    <InkDivider>纳甲装卦</InkDivider>
    <div class="card-paper-solid rounded-xl p-4 sm:p-6 mb-6">
      <h3 class="font-display text-lg text-ink-dark mb-4">六爻详表</h3>
      <ZhuangGuaTable :lines="result.lines" />

      <!-- Derived lines table -->
      <template v-if="result.derivedLines && result.derivedLines.length > 0">
        <h3 class="font-display text-lg text-ink-dark mt-8 mb-4">变爻详表</h3>
        <ZhuangGuaTable :lines="result.derivedLines" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { YijingResult } from '~/composables/useYijing'
import HexagramDisplay from '~/components/tools/yijing/HexagramDisplay.vue'
import ZhuangGuaTable from '~/components/tools/yijing/ZhuangGuaTable.vue'
import InkDivider from '~/components/tools/InkDivider.vue'

const props = defineProps<{
  result: YijingResult | null
  score: number
}>()

const showHuGua = ref(false)

// Score ring circumference
const radius = 52
const circumference = 2 * Math.PI * radius

const dashOffset = computed(() => {
  const fraction = Math.max(0, Math.min(100, props.score)) / 100
  return circumference - fraction * circumference
})

const interpretationParagraphs = computed(() => {
  if (!props.result) return []
  return props.result.interpretation.split('\n').filter(p => p.trim().length > 0)
})
</script>

<style scoped>
.score-ring-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
}

.score-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-ring-fill {
  transition: stroke-dashoffset 1s ease-out;
}

.score-ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.score-number {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 2.25rem;
  line-height: 1;
  color: #2C1810;
}

.score-label {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem;
  color: #7A6A5C;
  margin-top: 2px;
}

.interpretation-text {
  border-left: 3px solid #C62828;
  padding-left: 1rem;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.9375rem;
  color: #2C1810;
  line-height: 1.75;
}
</style>
