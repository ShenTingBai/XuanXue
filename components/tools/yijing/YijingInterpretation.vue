<template>
  <div v-if="!result" class="text-center py-12 text-ink-light font-sans text-sm">
    尚无占卜结果，请先起卦。
  </div>

  <div v-else class="fade-in" :style="{ '--delay': '0.25s' }">
    <!-- Score ring -->
    <h2 class="sr-only">卦象评分</h2>
    <InkDivider>卦象评分</InkDivider>
    <div class="flex justify-center mb-8">
      <div class="score-ring-wrapper">
        <svg class="score-ring" viewBox="0 0 120 120" :aria-label="`卦象评分：${score}分`" role="img">
          <!-- Background circle -->
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="#E0D5C0"
            stroke-width="6"
            aria-hidden="true"
            focusable="false"
          />
          <!-- Score circle -->
          <circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke-width="6"
            stroke-linecap="round"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            stroke="#C62828"
            class="score-ring-fill"
            aria-hidden="true"
            focusable="false"
          />
        </svg>
        <div class="score-ring-text" aria-hidden="true">
          <span class="score-number">{{ score }}</span>
          <span class="score-label">分</span>
        </div>
      </div>
    </div>

    <!-- Primary hexagram -->
    <h2 class="sr-only">本卦</h2>
    <InkDivider>本卦</InkDivider>
    <div class="section-card">
      <HexagramDisplay
        :hexagram="{
          name: result.hexagram.name,
          judgment: result.hexagram.judgment,
          lines: result.lines.map(l => l.yao),
          shiPosition: result.hexagram.shiPosition,
          yingPosition: result.hexagram.yingPosition,
        }"
        :judgments="result.lines.map(l => l.judgment)"
        label="本卦"
      />
    </div>

    <!-- Derived hexagram (变卦) -->
    <template v-if="result.derivedHexagram && result.derivedLines">
      <h2 class="sr-only">变卦</h2>
      <InkDivider>变卦</InkDivider>
      <div class="section-card">
        <HexagramDisplay
          :hexagram="{
            name: result.derivedHexagram.name,
            judgment: result.derivedHexagram.judgment,
            lines: result.derivedLines.map(l => l.yao),
            shiPosition: result.derivedHexagram.shiPosition,
            yingPosition: result.derivedHexagram.yingPosition,
          }"
          :judgments="result.derivedLines.map(l => l.judgment)"
          label="变卦"
        />
      </div>
    </template>

    <!-- Mutual hexagram (互卦) -->
    <template v-if="result.huGua && result.huGuaLines">
      <h2 class="sr-only">互卦</h2>
      <InkDivider>互卦</InkDivider>
      <div class="section-card">
        <HexagramDisplay
          :hexagram="{
            name: result.huGua.name,
            judgment: result.huGua.judgment,
            lines: result.huGuaLines.map(l => l.yao),
            shiPosition: result.huGua.shiPosition,
            yingPosition: result.huGua.yingPosition,
          }"
          :judgments="result.huGuaLines.map(l => l.judgment)"
          label="互卦"
        />
      </div>
    </template>

    <!-- Interpretation text -->
    <h2 class="sr-only">卦象解读</h2>
    <InkDivider>卦象解读</InkDivider>
    <div class="section-card">
      <div class="interpretation-text">
        <div
          v-for="(paragraph, idx) in interpretationParagraphs"
          :key="idx"
          class="leading-relaxed interpretation-paragraph"
          :class="{ 'mb-4': idx < interpretationParagraphs.length - 1 }"
        >
          <template v-for="(line, lineIdx) in paragraph.split('\n')" :key="lineIdx">
            <br v-if="lineIdx > 0" />
            {{ line }}
          </template>
        </div>
      </div>
    </div>

    <!-- Line detail table -->
    <h2 class="sr-only">六爻详解</h2>
    <InkDivider>六爻详解</InkDivider>
    <div class="section-card">
      <p class="font-sans text-xs text-ink-light mb-4 leading-relaxed">
        下表列出每根爻的详细信息。<span class="text-ink-medium font-medium">五行</span>表示此爻的地支所属元素，<span class="text-ink-medium font-medium">六亲</span>是爻与日主的关系（如官鬼主事业、妻财主财运），<span class="text-ink-medium font-medium">六神</span>为当日值日之神（青龙主喜、朱雀主口舌等）。
      </p>
      <ZhuangGuaTable :lines="result.lines" />

      <!-- Derived lines table -->
      <template v-if="result.derivedLines && result.derivedLines.length > 0">
        <h3 class="font-display text-lg text-ink-dark mt-8 mb-4">变爻六爻详解</h3>
        <ZhuangGuaTable :lines="result.derivedLines" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { YijingResult } from '~/composables/useYijing'
import HexagramDisplay from '~/components/tools/yijing/HexagramDisplay.vue'
import ZhuangGuaTable from '~/components/tools/yijing/ZhuangGuaTable.vue'
import InkDivider from '~/components/tools/InkDivider.vue'

const props = defineProps<{
  result: YijingResult | null
  score: number
}>()

// Score ring circumference
const radius = 52
const circumference = 2 * Math.PI * radius

const dashOffset = computed(() => {
  const fraction = Math.max(0, Math.min(100, props.score)) / 100
  return circumference - fraction * circumference
})

const interpretationParagraphs = computed(() => {
  if (!props.result) return []
  // Split by double newline to keep sections together
  return props.result.interpretation.split('\n\n').filter(p => p.trim().length > 0)
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
  filter: drop-shadow(0 0 3px rgba(198, 40, 40, 0.3));
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
  margin-top: 2px;
  color: #7A6A5C;
}

.section-card {
  background: rgba(251, 248, 244, 0.95);
  border: 1px solid #E0D5C0;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 12px rgba(44, 24, 16, 0.06);
}

.interpretation-text {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.9375rem;
  line-height: 1.75;
  padding-left: 12px;
  border-left: 3px solid rgba(198, 40, 40, 0.45);
}

.interpretation-paragraph {
  font-size: 0.875rem;
}

@media (min-width: 640px) {
  .interpretation-paragraph {
    font-size: 0.9375rem;
  }
}
</style>
