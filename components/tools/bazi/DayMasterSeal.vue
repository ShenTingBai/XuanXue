<template>
  <div class="mb-8 flex flex-col items-center text-center fade-in" :style="{ '--delay': '0.02s' }">
    <!-- Birth notation: marginal annotation -->
    <p class="font-sans text-xs text-ink-muted tracking-wide mb-3">
      {{ birthYear }}年{{ birthCalendar === 'solar' ? '阳历' : '农历' }} · 生肖{{ animalName
      }}<template v-if="gender"> · {{ gender }}</template>
    </p>

    <!-- Day Master: seal impression -->
    <div class="flex items-center gap-3">
      <span class="inline-flex items-baseline gap-1.5 px-4 py-1.5 rounded-sm bg-cinnabar shadow-sm">
        <span class="font-display text-2xl sm:text-3xl text-paper-lightest leading-none">{{
          dayMaster
        }}</span>
        <span class="font-sans text-sm sm:text-base text-paper-lightest font-medium">{{
          dayMasterWuxing
        }}</span>
      </span>
      <span
        class="flex-shrink-0 px-2 py-0.5 rounded-sm font-sans text-[0.6875rem] text-ink-muted tracking-wider"
        :style="{ background: 'color-mix(in srgb, var(--color-ink-dark) 10%, transparent)' }"
        :class="strengthClass"
      >
        {{ dayMasterStrength }}
      </span>
    </div>

    <span class="mt-1 font-sans text-[0.6875rem] text-ink-muted tracking-widest select-none"
      >日 主</span
    >

    <!-- Element affinities -->
    <p class="mt-3 font-sans text-sm tracking-wide">
      <span class="text-ink-muted text-xs">喜</span>
      <span
        v-for="el in favorableElements"
        :key="el"
        :style="{ color: elementColor(el) }"
        class="font-medium mx-0.5"
        >{{ el }}</span
      >
      <span class="text-ink-muted mx-2 select-none">|</span>
      <span class="text-ink-muted text-xs">忌</span>
      <span
        v-for="el in unfavorableElements"
        :key="el"
        :style="{ color: elementColor(el) }"
        class="font-medium mx-0.5"
        >{{ el }}</span
      >
    </p>

    <!-- Ink-wash divider: fades at edges -->
    <div
      class="mt-5 w-32 h-px bg-gradient-to-r from-transparent via-cinnabar/25 to-transparent"
      aria-hidden="true"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { wuxingColor, strengthColorClass } from '~/constants/bazi'

const props = defineProps<{
  birthYear: number
  birthCalendar: string
  animalName: string
  gender: string | null
  dayMaster: string
  dayMasterWuxing: string
  dayMasterStrength: string
  favorableElements: string[]
  unfavorableElements: string[]
}>()

const strengthClass = computed(() => strengthColorClass(props.dayMasterStrength))

function elementColor(el: string): string {
  return wuxingColor(el)
}
</script>
