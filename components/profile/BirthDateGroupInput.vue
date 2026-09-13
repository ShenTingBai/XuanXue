<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BirthDateDraft } from '~/types/self-profile'

/**
 * 公历/农历可切换的受控年月日输入组（本人档案专用）。
 *
 * 约束（数据生命周期规范 §6.2、交付规范 §6.2）：
 * - 初始为空，公历控件可默认展示；选择农历必须额外明确普通月/闰月，
 *   isLeapMonth 初始 null 不能默认否；
 * - 切换历法不把同一组数字静默解释为另一历法：清空并提示重新填写；
 * - 原始历法表达与本地规范化结果同时可见（规范化由父组件或本组件计算）；
 * - 非法日期给字段关联错误，不自动滚动到其他月份；
 * - 使用现有墨韵表单样式、语义 label/fieldset、键盘可达和窄屏换行。
 */

const props = defineProps<{
  draft: BirthDateDraft
  /** 输入组错误文案（父组件传入，定位到字段）。 */
  error?: string
  /** 展示用规范化公历日期（YYYY-MM-DD），由父组件传入。 */
  normalizedSolarDate?: string
}>()

const emit = defineEmits<{
  'update:calendar': [value: 'solar' | 'lunar']
  'update:year': [value: string]
  'update:month': [value: string]
  'update:day': [value: string]
  'update:leap-month': [value: boolean | null]
}>()

const baseId = 'birth-date-group'
const yearId = `${baseId}-year`
const monthId = `${baseId}-month`
const dayId = `${baseId}-day`
const leapId = `${baseId}-leap`
const errorId = `${baseId}-error`

const yearOptions = computed(() => Array.from({ length: 201 }, (_, index) => 1900 + index))
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const dayOptions = computed(() =>
  Array.from({ length: calendar.value === 'solar' ? 31 : 30 }, (_, index) => index + 1),
)

const calendar = ref(props.draft.calendar)

function setCalendar(value: 'solar' | 'lunar') {
  // 切换历法不把同一组数字静默解释为另一历法：清空并提示重新填写。
  if (calendar.value !== value) {
    calendar.value = value
    emit('update:calendar', value)
    emit('update:year', '')
    emit('update:month', '')
    emit('update:day', '')
    emit('update:leap-month', null)
  }
}

function onYear(event: Event) {
  emit('update:year', (event.target as HTMLInputElement).value)
}
function onMonth(event: Event) {
  emit('update:month', (event.target as HTMLInputElement).value)
}
function onDay(event: Event) {
  emit('update:day', (event.target as HTMLInputElement).value)
}
function onLeap(value: boolean) {
  emit('update:leap-month', value)
}
</script>

<template>
  <fieldset class="birth-date-group" :aria-describedby="error ? errorId : undefined">
    <legend class="sr-only">出生日期（公历或农历）</legend>

    <!-- 历法切换：切换即清空并提示 -->
    <div class="birth-date-group__calendars" role="radiogroup" aria-label="历法选择">
      <label class="calendar-choice" :class="{ 'calendar-choice--selected': calendar === 'solar' }">
        <input
          type="radio"
          name="birth-calendar"
          value="solar"
          class="sr-only"
          :checked="calendar === 'solar'"
          @change="setCalendar('solar')"
        />
        <span class="calendar-dot" aria-hidden="true" />
        <span>公历</span>
      </label>
      <label class="calendar-choice" :class="{ 'calendar-choice--selected': calendar === 'lunar' }">
        <input
          type="radio"
          name="birth-calendar"
          value="lunar"
          class="sr-only"
          :checked="calendar === 'lunar'"
          @change="setCalendar('lunar')"
        />
        <span class="calendar-dot calendar-dot--lunar" aria-hidden="true" />
        <span>农历</span>
      </label>
    </div>

    <div class="birth-date-group__fields">
      <div class="birth-date-group__field">
        <label :for="yearId" class="birth-date-group__label">
          {{ calendar === 'solar' ? '公历年份' : '农历年份' }}
        </label>
        <select
          :id="yearId"
          class="input-ink birth-date-group__control"
          :value="draft.year"
          :aria-describedby="error ? errorId : undefined"
          :aria-invalid="error ? 'true' : undefined"
          @change="onYear"
        >
          <option value="" disabled>选择年份</option>
          <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
      <div class="birth-date-group__field">
        <label :for="monthId" class="birth-date-group__label">
          {{ calendar === 'solar' ? '公历月份' : '农历月份' }}
        </label>
        <select
          :id="monthId"
          class="input-ink birth-date-group__control"
          :value="draft.month"
          :aria-describedby="error ? errorId : undefined"
          :aria-invalid="error ? 'true' : undefined"
          @change="onMonth"
        >
          <option value="" disabled>选择月份</option>
          <option v-for="month in monthOptions" :key="month" :value="month">{{ month }}月</option>
        </select>
      </div>
      <div class="birth-date-group__field">
        <label :for="dayId" class="birth-date-group__label">
          {{ calendar === 'solar' ? '公历日期' : '农历日期' }}
        </label>
        <select
          :id="dayId"
          class="input-ink birth-date-group__control"
          :value="draft.day"
          :aria-describedby="error ? errorId : undefined"
          :aria-invalid="error ? 'true' : undefined"
          @change="onDay"
        >
          <option value="" disabled>选择日期</option>
          <option v-for="day in dayOptions" :key="day" :value="day">{{ day }}日</option>
        </select>
      </div>
    </div>

    <!-- 农历必须明确普通月/闰月；公历不显示闰月控件 -->
    <div
      v-if="calendar === 'lunar'"
      class="birth-date-group__leap"
      role="group"
      aria-labelledby="leap-label"
    >
      <p id="leap-label" class="birth-date-group__leap-label">是否闰月</p>
      <label
        class="calendar-choice"
        :class="{ 'calendar-choice--selected': draft.isLeapMonth === false }"
      >
        <input
          type="radio"
          name="birth-leap"
          value="regular"
          class="sr-only"
          :checked="draft.isLeapMonth === false"
          @change="onLeap(false)"
        />
        <span class="leap-dot" aria-hidden="true" />
        <span>普通月</span>
      </label>
      <label
        class="calendar-choice"
        :class="{ 'calendar-choice--selected': draft.isLeapMonth === true }"
      >
        <input
          type="radio"
          name="birth-leap"
          value="leap"
          class="sr-only"
          :checked="draft.isLeapMonth === true"
          @change="onLeap(true)"
        />
        <span class="leap-dot leap-dot--leap" aria-hidden="true" />
        <span>闰月</span>
      </label>
    </div>

    <p v-if="error" :id="errorId" class="birth-date-group__error" role="alert">
      {{ error }}
    </p>

    <!-- 原始历法表达与本地规范化结果同时可见 -->
    <p v-if="normalizedSolarDate" class="birth-date-group__normalized" role="note">
      规范化公历日期：{{ normalizedSolarDate }}
    </p>
  </fieldset>
</template>

<style scoped>
.birth-date-group__calendars {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.calendar-choice {
  display: inline-flex;
  min-height: 44px;
  min-width: 88px;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-paper-dark);
  border-radius: 0.35rem;
  color: var(--color-ink-medium);
  background: var(--color-paper-lightest);
  font: 0.875rem/1.2 var(--font-sans);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}
.calendar-choice--selected {
  border-color: var(--color-cinnabar);
  color: var(--color-cinnabar-deepest);
  background: color-mix(in srgb, var(--color-cinnabar) 8%, var(--color-paper-lightest));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-cinnabar) 20%, transparent);
}
.birth-date-group__fields {
  display: grid;
  /* 留出年份可读宽度，字体放大时自动改为多行。 */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 6ch), 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.birth-date-group__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}
.birth-date-group__label {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--color-ink-medium);
}
.birth-date-group__control {
  width: 100%;
  min-height: 44px;
  appearance: auto;
  padding-inline: 0.75rem;
  background: var(--color-paper-lightest);
}
.birth-date-group__leap {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.birth-date-group__leap-label {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--color-ink-medium);
}
.calendar-dot,
.leap-dot {
  display: inline-block;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  border: 1px solid var(--color-ink-faint);
  background: transparent;
}
.calendar-dot--lunar {
  border-color: var(--color-jade);
}
.leap-dot--leap {
  border-color: var(--color-cinnabar);
}
.birth-date-group__leap .calendar-choice {
  min-width: 92px;
}
.sr-only:focus-visible + .calendar-dot,
.sr-only:focus-visible + .leap-dot {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}
.birth-date-group__error {
  margin-top: 0.5rem;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--color-cinnabar);
}
.birth-date-group__normalized {
  margin-top: 0.75rem;
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--color-ink-medium);
}
@media (max-width: 360px) {
  .birth-date-group__fields {
    gap: 0.5rem;
  }
}
</style>
