<script setup lang="ts">
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import { BRANCH_GRID_POSITIONS } from '~/constants/ziwei'

defineProps<{
  palaces: IFunctionalPalace[]
  selectedIndex: number
  mingGongIndex: number
  fiveElementsClass: string
  onSelectPalace: (index: number) => void
}>()
</script>

<template>
  <div
    class="grid grid-cols-4 gap-px bg-paper-dark/20 rounded-lg overflow-hidden max-w-[520px] mx-auto"
    style="grid-template-rows: auto auto auto auto;"
    role="grid"
    aria-label="紫微斗数命盘"
  >
    <div
      v-for="palace in palaces"
      :key="palace.index"
      class="bg-paper"
      :style="{
        gridRow: BRANCH_GRID_POSITIONS[palace.earthlyBranch]?.row,
        gridColumn: BRANCH_GRID_POSITIONS[palace.earthlyBranch]?.col,
      }"
    >
      <ZiWeiPalaceCell
        :palace="palace"
        :is-selected="palace.index === selectedIndex"
        :is-ming-gong="palace.index === mingGongIndex"
        :on-click="() => onSelectPalace(palace.index)"
      />
    </div>
    <!-- Center area: 五行局 -->
    <div
      class="col-start-2 col-end-4 row-start-2 row-end-4 flex items-center justify-center bg-paper/50 text-ink-light/40 text-[11px] select-none"
    >
      {{ fiveElementsClass }}
    </div>
  </div>
</template>
