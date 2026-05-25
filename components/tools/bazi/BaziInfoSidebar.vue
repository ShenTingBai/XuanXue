<template>
  <div class="card-paper-solid rounded-xl p-4 sticky top-20">
    <div class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-3">基本信息</div>

    <div class="font-sans text-xs text-ink-medium space-y-1 mb-3">
      <div>{{ birthYear }}年 · {{ birthCalendar === 'solar' ? '阳历' : '农历' }}</div>
      <div>生肖：{{ animal }}</div>
      <div v-if="gender">性别：{{ gender }}</div>
    </div>

    <hr class="border-paper-dark my-3">

    <div class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-2">日主</div>
    <div class="font-display text-xl text-cinnabar font-medium">{{ dayMaster }}{{ dayMasterWuxing }}</div>
    <div class="font-sans text-xs font-medium mb-2" :class="strengthClass">
      {{ dayMasterStrength }}
    </div>

    <hr class="border-paper-dark my-3">

    <div class="space-y-1">
      <div class="font-sans text-xs text-ink-medium tracking-wider">喜用：<span class="font-medium" v-for="el in favorableElements" :key="el" :style="{ color: elementColor(el) }"> {{ el }} </span></div>
      <div class="font-sans text-xs text-ink-medium tracking-wider">忌神：<span v-for="el in unfavorableElements" :key="el" class="opacity-60" :style="{ color: elementColor(el) }"> {{ el }} </span></div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  birthYear: number
  birthCalendar: 'solar' | 'lunar'
  animal: string
  gender: '男' | '女' | null
  dayMaster: string
  dayMasterWuxing: string
  dayMasterStrength: string
  favorableElements: string[]
  unfavorableElements: string[]
}>()

const strengthClass = computed(() => {
  const s = props.dayMasterStrength
  if (s === '强' || s === '偏强') return 'text-cinnabar'
  if (s === '偏弱' || s === '弱') return 'text-wuxing-water'
  return 'text-gold'
})

const ELEMENT_COLORS: Record<string, string> = {
  '木': '#4A7C59', '火': '#C62828', '土': '#B8860B',
  '金': '#8E8E8E', '水': '#2C5F7C',
}
function elementColor(el: string): string { return ELEMENT_COLORS[el] || '#6B5B4F' }
</script>
