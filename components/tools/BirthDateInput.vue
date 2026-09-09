<script setup lang="ts">
import { computed } from 'vue'

/**
 * 受控公历出生日期输入（年月日三字段）。
 *
 * 约束（契约 §6.2、治理规范 §19.1）：
 * - 初始均空，不以今天/当前年/示例预填；
 * - 只提交真实存在的公历日期（含闰年 2/29）；
 * - 不支持未来日期（由父组件按 asOfDate 校验，本组件不做时钟读取）；
 * - 输入修改由父组件显式接收（v-model:year/month/day）。
 */
const props = defineProps<{
  year: string
  month: string
  day: string
  /** 可选的输入校验错误文案（父组件传入）。 */
  error?: string
  /** 每个字段的 aria-label 前缀。 */
  labelPrefix?: string
}>()

const emit = defineEmits<{
  'update:year': [value: string]
  'update:month': [value: string]
  'update:day': [value: string]
}>()

const baseId = 'birth-date-input'
const yearId = `${baseId}-year`
const monthId = `${baseId}-month`
const dayId = `${baseId}-day`
const errorId = `${baseId}-error`

const yearLabel = computed(() => (props.labelPrefix ? `${props.labelPrefix}年` : '公历年份'))
const monthLabel = computed(() => (props.labelPrefix ? `${props.labelPrefix}月` : '公历月份'))
const dayLabel = computed(() => (props.labelPrefix ? `${props.labelPrefix}日` : '公历日期'))

function onYearInput(event: Event) {
  emit('update:year', (event.target as HTMLInputElement).value)
}
function onMonthInput(event: Event) {
  emit('update:month', (event.target as HTMLInputElement).value)
}
function onDayInput(event: Event) {
  emit('update:day', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <fieldset class="birth-date-input" :aria-describedby="error ? errorId : undefined">
    <legend class="sr-only">公历出生日期</legend>
    <div class="birth-date-input__fields">
      <div class="birth-date-input__field">
        <label :for="yearId" class="birth-date-input__label">{{ yearLabel }}</label>
        <input
          :id="yearId"
          class="input-ink birth-date-input__control"
          type="number"
          inputmode="numeric"
          min="1901"
          :value="year"
          :aria-describedby="error ? errorId : undefined"
          :aria-invalid="error ? 'true' : undefined"
          placeholder="1990"
          @input="onYearInput"
        />
      </div>
      <div class="birth-date-input__field">
        <label :for="monthId" class="birth-date-input__label">{{ monthLabel }}</label>
        <input
          :id="monthId"
          class="input-ink birth-date-input__control"
          type="number"
          inputmode="numeric"
          min="1"
          max="12"
          :value="month"
          :aria-describedby="error ? errorId : undefined"
          :aria-invalid="error ? 'true' : undefined"
          placeholder="6"
          @input="onMonthInput"
        />
      </div>
      <div class="birth-date-input__field">
        <label :for="dayId" class="birth-date-input__label">{{ dayLabel }}</label>
        <input
          :id="dayId"
          class="input-ink birth-date-input__control"
          type="number"
          inputmode="numeric"
          min="1"
          max="31"
          :value="day"
          :aria-describedby="error ? errorId : undefined"
          :aria-invalid="error ? 'true' : undefined"
          placeholder="15"
          @input="onDayInput"
        />
      </div>
    </div>
    <p v-if="error" :id="errorId" class="birth-date-input__error" role="alert">
      {{ error }}
    </p>
  </fieldset>
</template>

<style scoped>
.birth-date-input__fields {
  display: grid;
  /* 留出年份可读宽度，字体放大时自动改为多行。 */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 6ch), 1fr));
  gap: 0.75rem;
}
.birth-date-input__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}
.birth-date-input__label {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--color-ink-medium);
}
.birth-date-input__control {
  width: 100%;
  min-height: 44px;
}
.birth-date-input__error {
  margin-top: 0.5rem;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--color-cinnabar);
}
@media (max-width: 360px) {
  .birth-date-input__fields {
    gap: 0.5rem;
  }
}
</style>
