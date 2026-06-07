<template>
  <div role="region" aria-label="命盘摘要" class="card-warm rounded-xl px-5 py-4">
    <!-- Title -->
    <div class="flex items-center gap-2 mb-3">
      <span class="w-1.5 h-1.5 rounded-full sidebar-dot flex-shrink-0" aria-hidden="true" />
      <h4 class="font-display text-base tracking-[0.1em] text-ink-dark">命盘</h4>
    </div>

    <!-- Section 1: Basic Info -->
    <div class="mb-3">
      <p class="text-[0.6875rem] text-ink-muted tracking-[0.1em] mb-2 font-sans">基本信息</p>
      <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <!-- Row 1: 公历 + 农历 -->
        <div v-if="solarDate.year">
          <span class="text-[0.6875rem] text-ink-muted">公历</span>
          <span class="text-ink-medium ml-1.5"
            >{{ solarDate.year }}-{{ solarDate.month }}-{{ solarDate.day }}</span
          >
        </div>
        <div v-if="lunarDateStr">
          <span class="text-[0.6875rem] text-ink-muted">农历</span>
          <span class="text-ink-medium ml-1.5">{{ lunarDateStr }}</span>
        </div>
        <!-- Row 2: 时辰 + 性别 -->
        <div>
          <span class="text-[0.6875rem] text-ink-muted">时辰</span>
          <span class="text-ink-medium ml-1.5">{{
            birthHour !== null ? getTimeName(birthHour) : '—'
          }}</span>
        </div>
        <div>
          <span class="text-[0.6875rem] text-ink-muted">性别</span>
          <span class="text-ink-medium ml-1.5">{{ genderLabel }}</span>
          <span class="text-[0.6875rem] text-ink-muted ml-2">生肖</span>
          <span class="text-ink-medium ml-1">{{ zodiacLabel }}</span>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="h-px sidebar-divider my-3" aria-hidden="true" />

    <!-- Section 2: Ming Palace — Hero -->
    <div class="mb-3">
      <p class="text-[0.6875rem] text-ink-muted tracking-[0.1em] mb-1.5 font-sans">命宫格局</p>
      <div class="text-cinnabar font-display text-xl tracking-[0.08em] leading-tight">
        {{ astrolabe.earthlyBranchOfSoulPalace }}宫
      </div>
      <p
        v-if="mingStars.length"
        class="text-cinnabar font-semibold text-sm tracking-[0.06em] mt-0.5"
      >
        {{ mingStars }}
      </p>
      <p v-else class="text-ink-muted italic text-[0.6875rem] mt-0.5">空宫</p>
    </div>

    <!-- Section 3: Body + Five Elements — compact row -->
    <div class="flex gap-5 text-xs mb-3">
      <div>
        <span class="text-[0.6875rem] text-ink-muted">身宫</span>
        <span class="text-ink-medium ml-1.5">{{ astrolabe.earthlyBranchOfBodyPalace }}宫</span>
      </div>
      <div>
        <span class="text-[0.6875rem] text-ink-muted">五行局</span>
        <span class="text-ink-medium ml-1.5">{{ astrolabe.fiveElementsClass }}</span>
      </div>
    </div>

    <!-- Divider -->
    <div v-if="transformations.length" class="h-px sidebar-divider my-3" aria-hidden="true" />

    <!-- Section 4: Transformations -->
    <div v-if="transformations.length">
      <p class="text-[0.6875rem] text-ink-muted tracking-[0.1em] mb-2 font-sans">四化</p>
      <div class="flex flex-wrap gap-1.5">
        <div
          v-for="t in transformations"
          :key="t.star + t.type"
          class="mutagen-item"
          :class="t.type"
        >
          <span class="mutagen-star">{{ t.star }}</span>
          <span class="mutagen-tag">{{ t.label }}</span>
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
  return palace.majorStars.map(s => s.name).join(' · ')
})

const transformations = computed(() => {
  const result: Array<{ star: string; type: string; label: string }> = []
  for (const palace of props.astrolabe.palaces) {
    for (const s of [
      ...palace.majorStars,
      ...(palace.adjectiveStars ?? []),
      ...palace.minorStars,
    ]) {
      if (s.mutagen) {
        result.push({ star: s.name, type: s.mutagen, label: `化${s.mutagen}` })
      }
    }
  }
  return result
})
</script>

<style scoped>
/* ── Mutagen items: star name + chip pair ── */
.mutagen-item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.mutagen-star {
  font-weight: 500;
  color: var(--color-ink);
  letter-spacing: 0.04em;
}

.mutagen-tag {
  font-size: 0.6875rem;
  padding: 1px 5px;
  border-radius: 2px;
  letter-spacing: 0.04em;
  font-family: var(--font-sans);
  white-space: nowrap;
  font-weight: 500;
}

.mutagen-tag.禄 {
  background: color-mix(in srgb, var(--color-cinnabar) 12%, transparent);
  color: var(--color-cinnabar);
  border: 0.5px solid color-mix(in srgb, var(--color-cinnabar) 18%, transparent);
}
.mutagen-tag.权 {
  background: color-mix(in srgb, var(--color-jade) 12%, transparent);
  color: var(--color-jade);
  border: 0.5px solid color-mix(in srgb, var(--color-jade) 18%, transparent);
}
.mutagen-tag.科 {
  background: color-mix(in srgb, #6ba8c8 12%, transparent);
  color: #6ba8c8;
  border: 0.5px solid color-mix(in srgb, #6ba8c8 18%, transparent);
}
.mutagen-tag.忌 {
  background: color-mix(in srgb, var(--color-ink-muted) 8%, transparent);
  color: var(--color-ink-muted);
  border: 0.5px solid color-mix(in srgb, var(--color-ink-muted) 12%, transparent);
}

/* ── Sidebar title dot ── */
.sidebar-dot {
  background: color-mix(in srgb, var(--color-cinnabar) 50%, transparent);
}

/* ── Sidebar divider ── */
.sidebar-divider {
  background: color-mix(in srgb, var(--color-ink-faint) 20%, transparent);
}
</style>
