<!-- components/tools/ziwei/ZiWeiDaXianTimeline.vue -->
<script setup lang="ts">
interface DaXianPeriod {
  startAge: number
  endAge: number
  palaceName: string
  stars: string
}

const props = defineProps<{
  periods: DaXianPeriod[]
  currentAge: number
}>()
</script>

<template>
  <div v-if="periods.length > 0" class="overflow-x-auto py-4">
    <div class="flex gap-2 min-w-max px-2">
      <div
        v-for="(period, i) in periods"
        :key="i"
        class="flex flex-col items-center min-w-[80px]"
      >
        <div
          class="w-full px-3 py-2 rounded-lg text-center text-xs transition-colors cursor-default"
          :class="currentAge >= period.startAge && currentAge <= period.endAge
            ? 'bg-cinnabar/10 ring-1 ring-cinnabar/30 text-ink-dark font-medium'
            : 'bg-ink-dark/5 text-ink-light'"
        >
          <div class="font-semibold">{{ period.startAge }}-{{ period.endAge }}岁</div>
          <div class="text-[10px] mt-0.5 opacity-70">{{ period.palaceName }}</div>
          <div class="text-[9px] opacity-50 truncate max-w-[72px]">{{ period.stars }}</div>
        </div>
        <!-- Connector -->
        <div v-if="i < periods.length - 1" class="w-4 h-0.5 bg-ink-dark/10 -mt-0.5" />
      </div>
    </div>
  </div>
</template>
