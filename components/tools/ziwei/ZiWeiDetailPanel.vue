<template>
  <div
    class="bg-paper/80 backdrop-blur-sm rounded-xl border border-paper-dark/30 p-4"
    role="region"
    aria-label="宫位解读"
  >
    <!-- Palace header -->
    <div v-if="detailView" class="space-y-3">
      <div class="flex items-center gap-2">
        <h3 class="font-serif text-lg font-bold text-ink-dark">{{ detailView.name }}</h3>
        <span class="text-xs text-ink-light bg-ink-dark/5 px-2 py-0.5 rounded">{{ detailView.stem }}{{ detailView.branch }}</span>
      </div>

      <!-- 大限 -->
      <div v-if="detailView.decadalRange && detailView.decadalRange[0] > 0" class="text-xs text-ink-light">
        大限：{{ detailView.decadalRange[0] }}~{{ detailView.decadalRange[1] }}
      </div>

      <!-- 主星 -->
      <div v-if="detailView.majorStars.length > 0">
        <h4 class="text-xs font-semibold text-ink-dark/60 mb-1 uppercase tracking-wider">主星</h4>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="star in detailView.majorStars"
            :key="star.name"
            class="px-2 py-0.5 text-sm rounded bg-ink-dark/5 text-ink-dark font-medium"
          >
            {{ star.name }}<span v-if="star.brightness" class="text-[10px] text-ink-light ml-0.5">{{ star.brightness }}</span>
          </span>
        </div>
      </div>

      <!-- 辅星 -->
      <div v-if="detailView.minorStars.length > 0">
        <h4 class="text-xs font-semibold text-ink-dark/60 mb-1 uppercase tracking-wider">辅星</h4>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="star in detailView.minorStars"
            :key="star.name"
            class="px-1.5 py-0.5 text-xs text-ink-light bg-ink-dark/[0.04] rounded"
          >{{ star.name }}</span>
        </div>
      </div>

      <!-- 四化 -->
      <div v-if="detailView.transformations.length > 0">
        <h4 class="text-xs font-semibold text-ink-dark/60 mb-1 uppercase tracking-wider">四化</h4>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="t in detailView.transformations"
            :key="t.star + t.transformation"
            class="px-1.5 py-0.5 text-xs rounded font-medium"
            :class="{
              'bg-red-50 text-red-700': t.transformation === '禄',
              'bg-blue-50 text-blue-700': t.transformation === '权',
              'bg-green-50 text-green-700': t.transformation === '科',
              'bg-gray-100 text-gray-500': t.transformation === '忌',
            }"
          >{{ t.star }}化{{ t.transformation }}</span>
        </div>
      </div>

      <!-- 解读 -->
      <div class="space-y-2 pt-2 border-t border-paper-dark/20">
        <p v-if="detailView.interpretation.palaceSummary" class="text-xs text-ink-dark leading-relaxed">
          {{ detailView.interpretation.palaceSummary }}
        </p>
        <div v-if="detailView.interpretation.starReadings.length > 0" class="space-y-1">
          <p
            v-for="(reading, i) in detailView.interpretation.starReadings"
            :key="i"
            class="text-xs text-ink-dark leading-relaxed"
          >{{ reading }}</p>
        </div>
        <p v-if="detailView.interpretation.combinationNote" class="text-xs text-cinnabar leading-relaxed font-medium">
          {{ detailView.interpretation.combinationNote }}
        </p>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-8 text-ink-light/50 text-sm">
      选择一个宫位查看详细解读
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import { getDetailedPalaceView } from '~/composables/useZiwei'

const props = defineProps<{
  palace: IFunctionalPalace | null
}>()

const detailView = computed(() => {
  if (!props.palace) return null
  return getDetailedPalaceView(props.palace)
})
</script>
