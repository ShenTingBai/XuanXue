<template>
  <div class="fade-in" :style="{ '--delay': '0.2s' }">
    <InkDivider>五行旺衰</InkDivider>

    <p class="font-sans text-xs text-ink-light/70 mb-3 leading-relaxed">
      五行（金木水火土）在你八字中的分布。柱条越长，该能量越强，对你影响越大。
    </p>

    <div class="card-paper-solid rounded-xl p-4 sm:p-5">
    <div v-if="summary" class="font-sans text-sm text-ink-medium mb-4">
      {{ summary }}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <div v-for="el in elements" :key="el.name" class="flex items-center gap-2.5">
        <span class="w-5 text-sm font-sans font-medium flex-shrink-0" :style="{ color: el.color }">
          {{ el.name }}
        </span>
        <div class="flex-1 h-2.5 sm:h-3 rounded-full bg-paper-dark/40 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-700 ease-out"
            :style="{ width: el.percent + '%', background: el.color }"
          />
        </div>
        <span class="w-6 text-xs text-ink-light text-right font-sans flex-shrink-0">
          {{ el.count }}
        </span>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  elementCounts: Record<string, number>
  elementPercentages: Record<string, number>
  dayMaster: string
  dayMasterWuxing: string
  dayMasterStrength: string
  monthBranch: string
}>()

const ELEMENT_COLORS: Record<string, string> = {
  '木': '#4A7C59', '火': '#C62828', '土': '#B8860B',
  '金': '#8E8E8E', '水': '#2C5F7C',
}

const elements = computed(() =>
  Object.entries(props.elementCounts)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => ({
      name,
      count,
      percent: props.elementPercentages[name] || 0,
      color: ELEMENT_COLORS[name] || '#A69586',
    }))
)

// Strength description
const strengthMap: Record<string, string> = {
  '强': '力量很强', '偏强': '力量偏强', '中和': '力量平衡', '偏弱': '力量偏弱', '弱': '力量较弱',
}

const summary = computed(() => {
  const strength = props.dayMasterStrength
  const desc = strengthMap[strength] || ''
  return `日主${props.dayMaster}（${props.dayMasterWuxing}），生于${props.monthBranch}月，${props.dayMasterWuxing}${desc}`
})
</script>
