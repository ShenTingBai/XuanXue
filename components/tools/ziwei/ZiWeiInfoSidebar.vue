<template>
  <div class="bg-paper/80 backdrop-blur-sm rounded-xl border border-paper-dark/30 p-4 text-xs space-y-2">
    <h4 class="font-display font-semibold text-ink-dark text-sm">命盘信息</h4>
    <div class="space-y-1.5 text-ink-light">
      <div>
        <span class="block text-ink-dark/50 text-[10px]">出生</span>
        <span>{{ solarDate.year }}年{{ solarDate.month }}月{{ solarDate.day }}日</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">时辰</span>
        <span>{{ birthHour !== null ? getTimeName(birthHour) : '—' }}</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">性别</span>
        <span>{{ genderLabel }}</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">命宫</span>
        <span class="text-cinnabar font-medium">{{ astrolabe.earthlyBranchOfSoulPalace }}宫</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">身宫</span>
        <span>{{ astrolabe.earthlyBranchOfBodyPalace }}宫</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">五行局</span>
        <span>{{ astrolabe.fiveElementsClass }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import { getTimeName } from '~/constants/ziwei'

const props = defineProps<{
  astrolabe: IFunctionalAstrolabe
  birthHour: number | null
}>()

const solarDate = computed(() => {
  const parts = props.astrolabe.solarDate.split('-')
  return {
    year: parts[0] || '',
    month: parts[1] || '',
    day: parts[2] || '',
  }
})

const genderLabel = computed(() => {
  return props.astrolabe.gender === 'male' ? '男' : '女'
})
</script>
