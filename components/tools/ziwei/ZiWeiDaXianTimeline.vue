<!-- components/tools/ziwei/ZiWeiDaXianTimeline.vue -->
<script setup lang="ts">
import { computed } from 'vue'

interface DaXianPeriod {
  startAge: number
  endAge: number
  palaceName: string
  palaceIndex: number
  stars: string
}

const props = defineProps<{
  periods: DaXianPeriod[]
  currentAge: number
}>()

const emit = defineEmits<{
  select: [index: number]
}>()

const fillPercent = computed(() => {
  if (props.periods.length === 0) return 0
  const activeIdx = props.periods.findIndex(
    (p) => props.currentAge >= p.startAge && props.currentAge <= p.endAge
  )
  if (activeIdx === -1) {
    if (props.currentAge < props.periods[0].startAge) return 0
    return 100
  }
  return ((activeIdx + 0.5) / props.periods.length) * 100
})

function isActive(period: DaXianPeriod): boolean {
  return props.currentAge >= period.startAge && props.currentAge <= period.endAge
}

function isPast(period: DaXianPeriod): boolean {
  return props.currentAge > period.endAge
}
</script>

<template>
  <div v-if="periods.length > 0" class="max-w-[620px] mx-auto px-2 py-3">
    <!-- Header: title left, current age right -->
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-display text-base tracking-[0.15em]" style="color: #5D4E37;">大限 · 十年运程</h3>
      <span class="text-[11px] text-cinnabar tracking-[0.04em]">当前：{{ currentAge }}岁</span>
    </div>

    <!-- Horizontal track with cinnabar fill -->
    <div class="relative h-0.5 bg-ink-faint/40 rounded-sm mb-1 mt-5">
      <div
        class="absolute inset-y-0 left-0 bg-cinnabar rounded-sm transition-all duration-500 ease-out"
        :style="{ width: fillPercent + '%' }"
      ></div>
    </div>

    <!-- Timeline nodes distributed along the track -->
    <div class="flex justify-between relative -mt-[7px]">
      <div
        v-for="(period, i) in periods"
        :key="i"
        class="flex flex-col items-center gap-[0.2rem] cursor-pointer"
        role="button"
        tabindex="0"
        :aria-label="`${period.palaceName} ${period.startAge}-${period.endAge}岁`"
        @click="emit('select', period.palaceIndex)"
        @keydown.enter.prevent="emit('select', period.palaceIndex)"
        @keydown.space.prevent="emit('select', period.palaceIndex)"
      >
        <!-- Dot -->
        <div
          class="w-2 h-2 rounded-full border-2 transition-all duration-300"
          :class="{
            'border-cinnabar bg-cinnabar shadow-[0_0_6px_rgba(198,40,40,0.2)]': isActive(period),
            'border-ink-light bg-ink-light/50': isPast(period),
            'border-ink-faint bg-paper': !isActive(period) && !isPast(period),
          }"
        ></div>
        <!-- Palace name -->
        <span
          class="text-[0.55rem] text-ink-light whitespace-nowrap tracking-[0.04em]"
          :class="{ 'text-cinnabar': isActive(period) }"
        >{{ period.palaceName }}</span>
        <!-- Age range -->
        <span class="text-[8px] text-ink-light">{{ period.startAge }}-{{ period.endAge }}</span>
      </div>
    </div>
  </div>
</template>
