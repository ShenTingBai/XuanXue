<template>
  <div role="region" aria-label="命盘摘要" class="card-paper-solid rounded-xl p-4 text-xs space-y-2">
    <h4 class="font-display font-semibold text-ink-dark text-sm">命盘信息</h4>
    <div class="space-y-1.5 text-ink-light">
      <!-- Birth info -->
      <div v-if="solarDate.year">
        <span class="block text-ink-dark/50 text-[10px]">公历</span>
        <span>{{ solarDate.year }}年{{ solarDate.month }}月{{ solarDate.day }}日</span>
      </div>
      <div v-if="lunarDateStr">
        <span class="block text-ink-dark/50 text-[10px]">农历</span>
        <span>{{ lunarDateStr }}</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">时辰</span>
        <span>{{ birthHour !== null ? getTimeName(birthHour) : '—' }}</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">性别</span>
        <span>{{ genderLabel }}</span>
      </div>

      <!-- Zodiac -->
      <div>
        <span class="block text-ink-dark/50 text-[10px]">生肖</span>
        <span>{{ zodiacLabel }}</span>
      </div>

      <!-- Ming Palace detail -->
      <div>
        <span class="block text-ink-dark/50 text-[10px]">命宫</span>
        <span class="text-cinnabar font-medium">{{ astrolabe.earthlyBranchOfSoulPalace }}宫</span>
        <span v-if="mingStars.length" class="ml-1 text-ink-light">（{{ mingStars }}）</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">身宫</span>
        <span>{{ astrolabe.earthlyBranchOfBodyPalace }}宫</span>
      </div>
      <div>
        <span class="block text-ink-dark/50 text-[10px]">五行局</span>
        <span>{{ astrolabe.fiveElementsClass }}</span>
      </div>

      <!-- Four transformations summary -->
      <div v-if="transformations.length">
        <span class="block text-ink-dark/50 text-[10px]">四化</span>
        <div class="flex flex-wrap gap-1 mt-0.5">
          <span
            v-for="t in transformations"
            :key="t.star + t.type"
            class="mutagen-tag"
            :class="t.type"
          >{{ t.star }}·{{ t.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import { getTimeName } from '~/constants/ziwei'
import { getAnimal } from '~/constants/bazi'

const props = defineProps<{
  astrolabe: IFunctionalAstrolabe
  birthHour: number | null
}>()

const solarDate = computed(() => {
  if (!props.astrolabe.solarDate) return { year: '', month: '', day: '' }
  const parts = props.astrolabe.solarDate.split('-')
  return {
    year: parts[0] || '',
    month: parts[1] || '',
    day: parts[2] || '',
  }
})

const lunarDateStr = computed(() => {
  return props.astrolabe.lunarDate || ''
})

const genderLabel = computed(() => {
  if (props.astrolabe.gender == null) return '—'
  return props.astrolabe.gender === '男' ? '男' : '女'
})

const zodiacLabel = computed(() => {
  const year = parseInt(solarDate.value.year, 10)
  if (isNaN(year)) return '—'
  return getAnimal(year)
})

const mingStars = computed(() => {
  const branch = props.astrolabe.earthlyBranchOfSoulPalace
  const palace = props.astrolabe.palaces.find(p => p.earthlyBranch === branch)
  if (!palace) return ''
  return palace.majorStars.map(s => s.name).join('、')
})

const transformations = computed(() => {
  const result: Array<{ star: string; type: string; label: string }> = []
  for (const palace of props.astrolabe.palaces) {
    for (const s of [...palace.majorStars, ...(palace.adjectiveStars ?? []), ...palace.minorStars]) {
      if (s.mutagen) {
        result.push({ star: s.name, type: s.mutagen, label: `化${s.mutagen}` })
      }
    }
  }
  return result
})
</script>

<style scoped>
.mutagen-tag {
  font-size: 0.55rem;
  padding: 1px 5px;
  border-radius: 2px;
  letter-spacing: 0.04em;
  font-family: var(--font-sans);
  white-space: nowrap;
}
.mutagen-tag.禄 { background: color-mix(in srgb, var(--color-cinnabar) 10%, transparent); color: var(--color-cinnabar); border: 0.5px solid color-mix(in srgb, var(--color-cinnabar) 15%, transparent); }
.mutagen-tag.权 { background: rgba(74,140,111,0.1); color: #4A8C6F; border: 0.5px solid rgba(74,140,111,0.15); }
.mutagen-tag.科 { background: rgba(107,168,200,0.1); color: #6BA8C8; border: 0.5px solid rgba(107,168,200,0.15); }
.mutagen-tag.忌 { background: color-mix(in srgb, var(--color-ink-muted) 7%, transparent); color: var(--color-ink-muted); border: 0.5px solid color-mix(in srgb, var(--color-ink-muted) 10%, transparent); }
</style>