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
    class="palace-grid grid grid-cols-4 grid-rows-4 aspect-square max-w-[620px] mx-auto relative"
    role="list"
    aria-label="紫微斗数命盘十二宫"
  >
    <!-- Outer decorative border -->
    <div
      class="absolute -inset-px pointer-events-none z-10"
      style="border: 1px solid color-mix(in srgb, var(--color-ink-medium) 15%, transparent);"
    />

    <div
      v-for="palace in palaces"
      :key="palace.index"
      class="bg-paper relative"
      role="listitem"
      style="border: 1px solid color-mix(in srgb, var(--color-ink-medium) 10%, transparent);"
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

    <!-- Center info area -->
    <div class="col-start-2 col-end-4 row-start-2 row-end-4 grid grid-cols-2 grid-rows-2 relative z-[1]" style="box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-ink-medium) 6%, transparent);">
      <div
        v-for="(item, i) in [
          { label: '五行局', value: fiveElementsClass },
          { label: '命主', value: soul },
          { label: '身主', value: body },
          { label: '命宫', value: mingGongBranch + '宫' },
        ]"
        :key="i"
        class="flex flex-col items-center justify-center text-center"
        :class="[
          'bg-paper-medium',
          i < 2 ? 'border-b' : '',
          i % 2 === 0 ? 'border-r' : '',
        ]"
        style="border-color: color-mix(in srgb, var(--color-ink-medium) 10%, transparent);"
      >
        <div class="text-[0.68rem] tracking-[0.08em] text-ink-light/55 font-sans mb-0.5 font-medium">{{ item.label }}</div>
        <div class="text-[14px] font-display tracking-[0.08em] font-semibold" style="color: var(--color-ink);">{{ item.value }}</div>
      </div>
    </div>
  </div>
</template>
