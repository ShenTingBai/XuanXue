<template>
  <div v-if="!result" class="text-center py-12 text-ink-light font-sans text-sm">
    尚无占卜结果，请先起卦。
  </div>

  <div v-else class="fade-in" :style="{ '--delay': '0.25s' }">
    <!-- Score ring -->
    <h2 class="sr-only">卦象评分</h2>
    <div class="section-header">
      <h2>卦象评分</h2>
    </div>
    <div class="flex justify-center mb-8">
      <ScoreRing :score="score" />
    </div>

    <!-- Primary hexagram -->
    <h2 class="sr-only">本卦</h2>
    <div class="section-header">
      <h2>本卦</h2>
    </div>
    <div class="card-warm rounded-xl p-8 mb-6">
      <HexagramDisplay
        :hexagram="{
          name: result.hexagram.name,
          judgment: result.hexagram.judgment,
          lines: result.lines.map(l => l.yao),
          shiPosition: result.hexagram.shiPosition,
          yingPosition: result.hexagram.yingPosition,
          palaceName: result.hexagram.palaceName,
          palaceWuxing: result.hexagram.palaceWuxing,
        }"
        :judgments="result.lines.map(l => l.judgment)"
        label="本卦"
      />
    </div>

    <!-- Derived hexagram (变卦) -->
    <template v-if="result.derivedHexagram && result.derivedLines">
      <div class="section-header">
        <h2>变卦</h2>
      </div>
      <div class="card-warm rounded-xl p-8 mb-6">
        <HexagramDisplay
          :hexagram="{
            name: result.derivedHexagram.name,
            judgment: result.derivedHexagram.judgment,
            lines: result.derivedLines.map(l => l.yao),
            shiPosition: result.derivedHexagram.shiPosition,
            yingPosition: result.derivedHexagram.yingPosition,
            palaceName: result.derivedHexagram.palaceName,
            palaceWuxing: result.derivedHexagram.palaceWuxing,
          }"
          :judgments="result.derivedLines.map(l => l.judgment)"
          label="变卦"
        />
      </div>
    </template>

    <!-- Mutual hexagram (互卦) -->
    <template v-if="result.huGua && result.huGuaLines">
      <div class="section-header">
        <h2>互卦</h2>
      </div>
      <div class="card-warm rounded-xl p-8 mb-6">
        <HexagramDisplay
          :hexagram="{
            name: result.huGua.name,
            judgment: result.huGua.judgment,
            lines: result.huGuaLines.map(l => l.yao),
            shiPosition: result.huGua.shiPosition,
            yingPosition: result.huGua.yingPosition,
            palaceName: result.huGua.palaceName,
            palaceWuxing: result.huGua.palaceWuxing,
          }"
          :judgments="result.huGuaLines.map(l => l.judgment)"
          label="互卦"
        />
      </div>
    </template>

    <!-- Interpretation text -->
    <div class="section-header">
      <h2>卦象解读</h2>
    </div>
    <div class="card-warm rounded-xl p-8 mb-6">
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
    <div class="section-header">
      <h2>六爻详解</h2>
    </div>
    <div class="card-warm rounded-xl p-8 mb-6">
      <p class="font-sans text-xs text-ink-medium mb-4 leading-relaxed">
        下表列出每根爻的详细信息。<span class="text-ink-medium font-medium">五行</span
        >表示此爻的地支所属元素，<span class="text-ink-medium font-medium">六亲</span
        >是爻与日主的关系（如官鬼主事业、妻财主财运），<span class="text-ink-medium font-medium"
          >六神</span
        >为当日值日之神（青龙主喜、朱雀主口舌等）。
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
import type { YijingResult } from '~/composables/useYijing'
import HexagramDisplay from '~/components/tools/yijing/HexagramDisplay.vue'
import ZhuangGuaTable from '~/components/tools/yijing/ZhuangGuaTable.vue'
import ScoreRing from '~/components/tools/ScoreRing.vue'

const props = defineProps<{
  result: YijingResult | null
  score: number
}>()

const interpretationParagraphs = computed(() => {
  if (!props.result) return []
  // Split by double newline to keep sections together
  return props.result.interpretation.split('\n\n').filter(p => p.trim().length > 0)
})
</script>

<style scoped>
.interpretation-text {
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  line-height: 1.75;
  padding-left: 12px;
  border-left: 3px solid color-mix(in srgb, var(--color-cinnabar) 45%, transparent);
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
