<template>
  <div class="card-paper-solid rounded-xl p-4">
    <div class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-3">基本信息</div>

    <div class="font-sans text-xs text-ink-medium space-y-1 mb-3">
      <div>{{ birthYear }}年 · {{ birthCalendar === 'solar' ? '阳历' : '农历' }}</div>
      <div>生肖：{{ animal }}</div>
      <div v-if="gender">性别：{{ gender }}</div>
    </div>

    <hr class="border-paper-dark my-3">

    <div class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-1.5">本命日主</div>
    <div class="flex items-baseline gap-1.5 mb-2">
      <span class="font-display text-xl text-cinnabar font-medium">{{ dayMaster }}{{ dayMasterWuxing }}</span>
      <span class="font-sans text-xs font-medium" :class="strengthClass">{{ dayMasterStrength }}</span>
    </div>

    <hr class="border-paper-dark my-3">

    <div class="space-y-1">
      <div class="font-sans text-xs text-ink-medium tracking-wider">助你：<span class="font-medium" v-for="el in favorableElements" :key="el" :style="{ color: elementColor(el) }"> {{ el }} </span></div>
      <div class="font-sans text-xs text-ink-medium tracking-wider">忌神：<span v-for="el in unfavorableElements" :key="el" :style="{ color: elementColor(el) }"> {{ el }} </span></div>
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

import { WUXING_COLORS, WUXING_FALLBACK_COLOR, strengthColorClass } from '~/constants/bazi'

const strengthClass = computed(() => strengthColorClass(props.dayMasterStrength))

function elementColor(el: string): string { return WUXING_COLORS[el] || WUXING_FALLBACK_COLOR }
</script>
