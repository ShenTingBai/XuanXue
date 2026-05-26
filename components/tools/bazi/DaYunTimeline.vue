<template>
  <div class="fade-in" :style="{ '--delay': '0.4s' }">
    <InkDivider>大运</InkDivider>

    <p class="font-sans text-base text-ink-light mb-3 leading-relaxed">
      大运是你人生每十年一段的运势走向。高亮的卡片对应你当前的年龄段。
    </p>

    <p v-if="cycles.length === 0" class="font-sans text-sm text-ink-muted">暂无大运数据</p>

    <div v-else class="card-paper-solid rounded-xl p-8">
    <!-- Desktop: horizontal cards -->
    <div class="hidden sm:flex gap-3 overflow-x-auto pb-2">
      <div v-for="(cycle, idx) in cycles" :key="cycle.startAge"
        class="flex-shrink-0 w-[110px] rounded-lg p-3 text-center transition-all duration-300"
        :class="idx === currentCycleIdx
          ? 'border-2 border-cinnabar bg-cinnabar/5 shadow-sm'
          : 'border border-paper-dark bg-paper-lightest/80 hover:border-ink-faint transition-colors'"
      >
        <div class="font-sans text-xs text-ink-light tracking-wider mb-1">
          {{ cycle.startAge }}-{{ cycle.endAge }}岁
        </div>
        <div class="font-display text-lg font-medium text-ink-dark mb-1">
          {{ cycle.stemBranch }}
        </div>
        <div class="font-sans text-xs text-ink-medium leading-tight">
          {{ cycle.description }}
        </div>
      </div>
    </div>

    <!-- Mobile: smaller horizontal scroll -->
    <div class="sm:hidden overflow-x-auto -mx-4 px-4 pb-2">
      <div class="inline-flex gap-2">
        <div v-for="(cycle, idx) in cycles" :key="cycle.startAge"
          class="inline-flex flex-col w-[72px] rounded-lg py-1.5 px-1 text-center flex-shrink-0"
          :class="idx === currentCycleIdx
            ? 'border border-cinnabar bg-cinnabar/5'
            : 'border border-paper-dark bg-paper-lightest/80 hover:border-ink-faint transition-colors'"
        >
          <div class="font-sans text-xs text-ink-light">{{ cycle.startAge }}-{{ cycle.endAge }}岁</div>
          <div class="font-display text-sm font-medium text-ink-dark">{{ cycle.stemBranch }}</div>
          <div class="font-sans text-xs text-ink-medium">{{ cycle.description }}</div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import type { DaYunCycle } from '~/composables/useBaZi'
import InkDivider from '~/components/tools/InkDivider.vue'

const props = defineProps<{
  cycles: DaYunCycle[]
  currentCycleIdx?: number
}>()

const currentCycleIdx = computed(() => {
  return props.currentCycleIdx ?? -1
})
</script>
