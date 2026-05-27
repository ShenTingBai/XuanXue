<!-- components/tools/ziwei/ZiWeiInputForm.vue -->
<script setup lang="ts">
import { TIME_NAMES, GENDER_OPTIONS } from '~/constants/ziwei'

defineProps<{
  birthDate: string
  birthHour: number | null
  gender: 'male' | 'female' | null
  loading: boolean
  onCalculate: () => void
  onDateChange: (val: string) => void
  onHourChange: (val: number | null) => void
  onGenderChange: (val: 'male' | 'female') => void
}>()
</script>

<template>
  <div class="ziwei-form bg-paper/70 backdrop-blur-sm rounded-xl border border-ink-faint/20 p-6 mb-6 max-w-md mx-auto relative overflow-hidden">
    <!-- Decorative top ornament -->
    <div class="absolute top-0 left-0 right-0 h-px" style="background: linear-gradient(90deg, transparent, rgba(198,40,40,0.2) 20%, rgba(198,40,40,0.35) 50%, rgba(198,40,40,0.2) 80%, transparent);" />

    <h2 class="font-display text-xl tracking-[0.12em] mb-6 text-center text-ink-darkest">紫微斗数排盘</h2>

    <div class="space-y-6">
      <!-- Birth date -->
      <div>
        <label for="ziwei-birth-date" class="block text-xs text-ink-light tracking-[0.08em] mb-1.5 font-sans">出生日期</label>
        <input
          id="ziwei-birth-date"
          type="date"
          :value="birthDate"
          @input="onDateChange(($event.target as HTMLInputElement).value)"
          class="input-ink w-full"
        />
      </div>

      <!-- Birth hour -->
      <div>
        <label for="ziwei-birth-hour" class="block text-xs text-ink-light tracking-[0.08em] mb-1.5 font-sans">出生时辰</label>
        <select
          id="ziwei-birth-hour"
          :value="birthHour ?? ''"
          @change="onHourChange(($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
          class="input-ink w-full"
        >
          <option value="">— 选择时辰 —</option>
          <option v-for="(name, idx) in TIME_NAMES" :key="idx" :value="idx">
            {{ name }}
          </option>
        </select>
      </div>

      <!-- Gender -->
      <fieldset>
        <legend class="block text-xs text-ink-light tracking-[0.08em] mb-1.5 font-sans">性别</legend>
        <div class="flex gap-3">
          <label
            v-for="opt in GENDER_OPTIONS"
            :key="opt.value"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name="ziwei-gender"
              :value="opt.value"
              :checked="gender === opt.value"
              @change="onGenderChange(opt.value)"
              class="sr-only"
            />
            <span
              class="px-4 py-2 text-sm rounded-lg border transition-all duration-300"
              :class="gender === opt.value
                ? 'border-cinnabar/40 bg-cinnabar/5 text-cinnabar font-medium shadow-[0_0_8px_rgba(198,40,40,0.06)]'
                : 'border-ink-faint/20 text-ink-light hover:border-ink-faint/40 hover:text-ink-dark'"
            >{{ opt.label }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Calculate button -->
      <button
        @click="onCalculate"
        :disabled="loading || !birthDate || birthHour === null || !gender"
        class="btn-seal w-full justify-center mt-2"
      >
        <span>{{ loading ? '排盘中...' : '开始排盘' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sr-only:focus-visible + span {
  outline: 2px solid #C62828;
  outline-offset: 2px;
}
</style>
