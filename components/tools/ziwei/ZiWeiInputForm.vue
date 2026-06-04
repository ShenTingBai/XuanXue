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
  <div class="ziwei-form card-warm rounded-xl p-8 mb-6 max-w-md mx-auto relative overflow-hidden">
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
        <div class="relative">
          <select
            id="ziwei-birth-hour"
            :value="birthHour ?? ''"
            @change="onHourChange(($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
            class="input-ink w-full select-appearance"
          >
            <option value="">— 选择时辰 —</option>
            <option v-for="(name, idx) in TIME_NAMES" :key="idx" :value="idx">
              {{ name }}
            </option>
          </select>
        </div>
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
      <p id="ziwei-form-hint" class="sr-only">请填写所有必填项（出生日期、时辰、性别）以启用排盘</p>
      <button
        @click="onCalculate"
        :disabled="loading || !birthDate || birthHour === null || !gender"
        class="btn-cin w-full justify-center mt-2"
        aria-describedby="ziwei-form-hint"
      >
        <span>{{ loading ? '排盘中...' : '开始排盘' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sr-only:focus-visible + span {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}

.select-appearance {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%237A6A5C' fill-opacity='0.6' d='M2 4.5l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 0.85rem;
  padding-right: 2rem;
  cursor: pointer;
}
</style>
