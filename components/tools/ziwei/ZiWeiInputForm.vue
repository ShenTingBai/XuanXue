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
  <div class="bg-paper/80 backdrop-blur-sm rounded-xl border border-paper-dark/30 p-6 mb-6 max-w-md mx-auto">
    <h2 class="font-serif text-lg font-bold text-ink-dark mb-4 text-center">紫微斗数排盘</h2>

    <div class="space-y-4">
      <!-- Birth date -->
      <div>
        <label for="ziwei-birth-date" class="block text-sm text-ink-dark/70 mb-1">出生日期</label>
        <input
          id="ziwei-birth-date"
          type="date"
          :value="birthDate"
          @input="onDateChange($event.target.value)"
          class="input-ink w-full"
        />
      </div>

      <!-- Birth hour -->
      <div>
        <label for="ziwei-birth-hour" class="block text-sm text-ink-dark/70 mb-1">出生时辰</label>
        <select
          id="ziwei-birth-hour"
          :value="birthHour ?? ''"
          @change="onHourChange($event.target.value ? Number($event.target.value) : null)"
          class="input-ink w-full"
        >
          <option value="">— 选择时辰 —</option>
          <option v-for="(name, idx) in TIME_NAMES" :key="idx" :value="idx">
            {{ name }}
          </option>
        </select>
      </div>

      <!-- Gender -->
      <div>
        <label class="block text-sm text-ink-dark/70 mb-1">性别</label>
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
              class="px-4 py-2 text-sm rounded-lg border transition-colors"
              :class="gender === opt.value
                ? 'border-cinnabar bg-cinnabar/5 text-cinnabar font-medium'
                : 'border-paper-dark/30 text-ink-light hover:border-ink-dark/30'"
            >{{ opt.label }}</span>
          </label>
        </div>
      </div>

      <!-- Calculate button -->
      <button
        @click="onCalculate"
        @keydown.enter="onCalculate"
        @keydown.space.prevent="onCalculate"
        :disabled="loading || !birthDate || birthHour === null || !gender"
        class="btn-seal w-full justify-center"
      >
        <span>{{ loading ? '排盘中...' : '开始排盘' }}</span>
      </button>
    </div>
  </div>
</template>
