<!-- components/tools/ziwei/ZiWeiDaXianTimeline.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'

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

const activeIdx = computed(() => {
  if (props.periods.length === 0) return -1
  const idx = props.periods.findIndex(
    (p) => props.currentAge >= p.startAge && props.currentAge <= p.endAge
  )
  if (idx === -1) {
    if (props.currentAge < props.periods[0].startAge) return -1
    return props.periods.length - 1
  }
  return idx
})

const fillPercent = computed(() => {
  if (props.periods.length === 0) return 0
  if (activeIdx.value === -1) return 0
  return ((activeIdx.value + 0.5) / props.periods.length) * 100
})

function isActive(period: DaXianPeriod): boolean {
  return props.currentAge >= period.startAge && props.currentAge <= period.endAge
}

function isPast(period: DaXianPeriod): boolean {
  return props.currentAge > period.endAge
}

// Template refs for timeline nodes
const nodeRefs = ref<(HTMLElement | null)[]>([])

function setNodeRef(idx: number) {
  return (el: unknown) => { nodeRefs.value[idx] = el as HTMLElement | null }
}

function focusNode(idx: number): void {
  const el = nodeRefs.value[idx]
  if (el) el.focus()
}
</script>

<template>
  <div v-if="periods.length > 0" class="max-w-[620px] mx-auto px-2 py-3">
    <!-- Header -->
    <div class="flex justify-between items-end mb-4">
      <h3 class="font-display text-sm tracking-[0.15em] text-ink-medium">大限 · 十年运程</h3>
      <span class="text-[11px] text-cinnabar tracking-[0.06em] font-medium">当前 {{ currentAge }} 岁</span>
    </div>

    <!-- Timeline track -->
    <div class="relative mb-1 mt-5">
      <!-- Background track -->
      <div class="absolute inset-x-0 h-px top-1/2 -translate-y-1/2 bg-ink-faint/25 rounded-sm" />
      <!-- Progress fill -->
      <div
        class="absolute left-0 h-px top-1/2 -translate-y-1/2 rounded-sm transition-all duration-700 ease-out"
        style="background: linear-gradient(90deg, rgba(198,40,40,0.15), rgba(198,40,40,0.4));"
        :style="{ width: fillPercent + '%' }"
      />
    </div>

    <!-- Timeline nodes -->
    <div class="flex justify-between relative -mt-[7px]">
      <div
        v-for="(period, i) in periods"
        :key="i"
        :ref="setNodeRef(i)"
        class="timeline-node flex flex-col items-center gap-0.5 cursor-pointer group"
        :class="{ 'node-future': !isActive(period) && !isPast(period) }"
        role="button"
        :tabindex="isActive(period) ? 0 : -1"
        :aria-label="`${period.palaceName} ${period.startAge}-${period.endAge}岁`"
        :aria-current="isActive(period) ? 'true' : undefined"
        @click="emit('select', period.palaceIndex)"
        @keydown.enter.prevent="emit('select', period.palaceIndex)"
        @keydown.space.prevent="emit('select', period.palaceIndex)"
        @keydown.left.prevent="focusNode((i - 1 + periods.length) % periods.length)"
        @keydown.right.prevent="focusNode((i + 1) % periods.length)"
      >
        <!-- Dot -->
        <div
          class="w-2.5 h-2.5 rounded-full transition-all duration-300"
          :class="{
            'bg-cinnabar shadow-[0_0_8px_rgba(198,40,40,0.25)] scale-110': isActive(period),
            'bg-ink-light/35': isPast(period),
            'bg-ink-faint/40': !isActive(period) && !isPast(period),
          }"
        />
        <!-- Palace name -->
        <span
          class="text-[0.65rem] whitespace-nowrap tracking-[0.05em] transition-colors duration-300 font-display"
          :class="{
            'text-cinnabar font-medium': isActive(period),
            'text-ink-medium/70': isPast(period),
            'text-ink-medium/50': !isActive(period) && !isPast(period),
          }"
        >{{ period.palaceName }}</span>
        <!-- Age range -->
        <span
          class="text-[10px] transition-colors duration-300 font-sans tracking-[0.04em]"
          :class="{
            'text-cinnabar/70': isActive(period),
            'text-ink-light/35': isPast(period),
            'text-ink-medium/50': !isActive(period) && !isPast(period),
          }"
        >{{ period.startAge }}-{{ period.endAge }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-node:focus-visible {
  outline: 2px solid #C62828;
  outline-offset: 2px;
  border-radius: 4px;
}

.node-future:hover {
  opacity: 0.8;
}
</style>
