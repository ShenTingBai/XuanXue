<script setup lang="ts">
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import { BRANCH_GRID_POSITIONS } from '~/constants/ziwei'
import ZiWeiPalaceCell from '~/components/tools/ziwei/ZiWeiPalaceCell.vue'

defineProps<{
  palaces: IFunctionalPalace[]
  selectedIndex: number
  mingGongIndex: number
  fiveElementsClass: string
  soul: string
  body: string
  mingGongBranch: string
  onSelectPalace: (index: number) => void
}>()
</script>

<template>
  <div
    class="grid grid-cols-4 grid-rows-4 aspect-square max-w-[620px] mx-auto"
    role="grid"
    aria-label="紫微斗数命盘"
    style="border: 1px solid rgba(93,78,55,0.15)"
  >
    <div
      v-for="palace in palaces"
      :key="palace.index"
      class="bg-paper"
      style="border: 1px solid rgba(93,78,55,0.08)"
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
    <!-- Center area: 4 info cells -->
    <div class="col-start-2 col-end-4 row-start-2 row-end-4 grid grid-cols-2 grid-rows-2">
      <div
        v-for="(item, i) in [
          { label: '五行局', value: fiveElementsClass },
          { label: '命主', value: soul },
          { label: '身主', value: body },
          { label: '命宫', value: mingGongBranch + '宫' },
        ]"
        :key="i"
        class="flex flex-col items-center justify-center text-center gap-0"
        :class="[
          i < 2 ? 'border-b' : '',
          i % 2 === 0 ? 'border-r' : '',
        ]"
        style="background: #EDE4D6; border-color: rgba(93,78,55,0.12)"
      >
        <div class="text-[0.55rem] tracking-[0.05em] text-ink-light/60 font-sans">{{ item.label }}</div>
        <div class="text-[12px] font-display tracking-[0.08em]" style="color: #5D4E37">{{ item.value }}</div>
      </div>
    </div>
  </div>
</template>
