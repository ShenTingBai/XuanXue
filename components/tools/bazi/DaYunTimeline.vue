<template>
  <div class="fade-in" :style="{ '--delay': '0.4s' }">
    <InkDivider>大运</InkDivider>

    <div class="card-paper-solid rounded-xl p-4 sm:p-5">
    <!-- Desktop: horizontal cards -->
    <div class="hidden sm:flex gap-3 overflow-x-auto pb-2">
      <div v-for="(cycle, idx) in cycles" :key="cycle.startAge"
        class="flex-shrink-0 w-[110px] rounded-lg p-3 text-center transition-all duration-300"
        :class="idx === currentCycleIdx
          ? 'border-2 border-cinnabar bg-cinnabar/3 shadow-sm'
          : 'border border-paper-dark bg-paper-lightest/80 hover:border-ink-faint'"
      >
        <div class="font-sans text-[0.6rem] text-ink-light tracking-wider mb-1">
          {{ cycle.startAge }}-{{ cycle.endAge }}岁
        </div>
        <div class="font-display text-lg font-medium text-ink-dark mb-1">
          {{ cycle.stemBranch }}
        </div>
        <div class="font-sans text-[0.65rem] text-ink-medium leading-tight">
          {{ cycle.description }}
        </div>
      </div>
    </div>

    <!-- Mobile: smaller horizontal scroll -->
    <div class="sm:hidden overflow-x-auto -mx-4 px-4 pb-2">
      <div class="inline-flex gap-2">
        <div v-for="(cycle, idx) in cycles" :key="cycle.startAge"
          class="inline-flex flex-col w-[64px] rounded-lg py-1.5 px-1 text-center flex-shrink-0"
          :class="idx === currentCycleIdx
            ? 'border border-cinnabar bg-cinnabar/3'
            : 'border border-paper-dark'"
        >
          <div class="font-sans text-[0.5rem] text-ink-light">{{ cycle.startAge }}-{{ cycle.endAge }}岁</div>
          <div class="font-display text-sm font-medium text-ink-dark">{{ cycle.stemBranch }}</div>
          <div class="font-sans text-[0.5rem] text-ink-medium">{{ cycle.description.slice(0, 3) }}</div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import type { DaYunCycle } from '~/composables/useBaZi'

const props = defineProps<{
  cycles: DaYunCycle[]
  currentCycleIdx?: number
}>()

const currentCycleIdx = computed(() => {
  return props.currentCycleIdx ?? -1
})
</script>
