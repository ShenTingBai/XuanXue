<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BAZI_SUPPORT_START } from '~/constants/bazi-rules'
import type { BaziCalendar, BaziDraftState } from '~/types/bazi'

/**
 * 八字输入区（页面 Ⅱ 段「一张清晰的案头」）。
 *
 * 设计基线：docs/design/2026-09-15-bazi-ui-spec.md §2 Ⅱ 段 + §4 响应式与可访问性。
 * 约束（契约 §7.2、治理规范 §7.3、数据规范 §5.4/§10.2）：
 * - 默认公历三件；「我只知道农历出生日期」切换为农历三件 + 闰月**显式**选择，
 *   闰月初始为未选，不得默认普通月；
 * - **无任何默认值**：不预填今天、不预填示例日期、不预填零点（本页不涉及时刻）；
 * - 每个输入组都有可见 label 与就地说明（为什么需要、是否必填、不提供会怎样、
 *   仅本次使用、哪些输出会读取它）；
 * - 错误就近显示在输入区，并说明输入是否保留；
 * - 触控目标 ≥44px；窄屏与 200% 文本缩放不产生横向滚动；颜色不是唯一区分手段。
 *
 * 与设计规格的一处差异（已在验证记录登记）：规格示意把闰月写成「是 / 否 / 未确认」三选，
 * 但「未确认」需要把草稿置回 null，而本轮为纯 UI 阶段（`composables/useBaziDraft.ts`
 * 不在 allowed_paths）。这里保持「普通月 / 闰月」两选 + 未选态就地提示，
 * 行为等价：未选前生成入口禁用并写明原因，绝不默认普通月。
 */

const props = defineProps<{
  draft: BaziDraftState
  /** 输入区就近错误文案（父组件传入）。 */
  error?: string
  /** 可选年份上界（查询当日的年份）。 */
  maxYear: number
}>()

const emit = defineEmits<{
  'update:calendar': [value: BaziCalendar]
  'update:year': [value: string]
  'update:month': [value: string]
  'update:day': [value: string]
  'update:leap-month': [value: boolean]
  'update:age-confirmed': [value: boolean]
}>()

const baseId = 'bazi-input'
const yearId = `${baseId}-year`
const monthId = `${baseId}-month`
const dayId = `${baseId}-day`
const errorId = `${baseId}-error`

const startYear = Number(BAZI_SUPPORT_START.slice(0, 4))
const yearOptions = computed(() => {
  const end = Math.max(props.maxYear, startYear)
  return Array.from({ length: end - startYear + 1 }, (_, index) => end - index)
})
const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1)
const dayOptions = computed(() =>
  Array.from({ length: props.draft.calendar === 'solar' ? 31 : 30 }, (_, index) => index + 1),
)

/**
 * 历法只作本地展示副本：切换时由父组件清空并重置闰月，
 * 本组件不自行改写草稿（避免出现「显示已切换、草稿未切换」的中间态）。
 */
const calendar = ref<BaziCalendar>(props.draft.calendar)
watch(
  () => props.draft.calendar,
  value => {
    calendar.value = value
  },
)

function onYear(event: Event) {
  emit('update:year', (event.target as HTMLSelectElement).value)
}
function onMonth(event: Event) {
  emit('update:month', (event.target as HTMLSelectElement).value)
}
function onDay(event: Event) {
  emit('update:day', (event.target as HTMLSelectElement).value)
}
function onAge(event: Event) {
  emit('update:age-confirmed', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <fieldset :aria-describedby="error ? errorId : undefined">
    <legend class="font-sans text-sm text-ink-dark">出生日期</legend>

    <!-- 历法选择：切换即清空年月日并要求重新填写 -->
    <div class="mt-3" role="radiogroup" aria-label="历法选择">
      <div class="flex flex-wrap gap-2">
        <label
          class="bazi-choice"
          :class="{ 'bazi-choice--selected': calendar === 'solar' }"
          data-bazi-calendar="solar"
        >
          <input
            type="radio"
            name="bazi-calendar"
            value="solar"
            class="sr-only"
            :checked="calendar === 'solar'"
            @change="emit('update:calendar', 'solar')"
          />
          <span class="bazi-dot" aria-hidden="true" />
          <span>公历出生日期</span>
        </label>
        <label
          class="bazi-choice"
          :class="{ 'bazi-choice--selected': calendar === 'lunar' }"
          data-bazi-calendar="lunar"
        >
          <input
            type="radio"
            name="bazi-calendar"
            value="lunar"
            class="sr-only"
            :checked="calendar === 'lunar'"
            @change="emit('update:calendar', 'lunar')"
          />
          <span class="bazi-dot bazi-dot--lunar" aria-hidden="true" />
          <span>我只知道农历出生日期</span>
        </label>
      </div>
      <p class="bazi-note">
        两种历法不互相套用同一组数字：切换会清空已填的年月日，需要按新历法重新选择。
      </p>
    </div>

    <div class="bazi-fields">
      <div class="bazi-field">
        <label :for="yearId" class="bazi-label">
          {{ calendar === 'solar' ? '公历年份' : '农历年份' }}
        </label>
        <select
          :id="yearId"
          class="input-ink bazi-control editorial-num"
          :value="draft.year"
          :aria-describedby="error ? errorId : undefined"
          :aria-invalid="error ? 'true' : undefined"
          @change="onYear"
        >
          <option value="" disabled>选择年份</option>
          <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
      <div class="bazi-field">
        <label :for="monthId" class="bazi-label">
          {{ calendar === 'solar' ? '公历月份' : '农历月份' }}
        </label>
        <select
          :id="monthId"
          class="input-ink bazi-control editorial-num"
          :value="draft.month"
          :aria-describedby="error ? errorId : undefined"
          :aria-invalid="error ? 'true' : undefined"
          @change="onMonth"
        >
          <option value="" disabled>选择月份</option>
          <option v-for="month in monthOptions" :key="month" :value="month">{{ month }}月</option>
        </select>
      </div>
      <div class="bazi-field">
        <label :for="dayId" class="bazi-label">
          {{ calendar === 'solar' ? '公历日期' : '农历日期' }}
        </label>
        <select
          :id="dayId"
          class="input-ink bazi-control editorial-num"
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

    <!-- 农历必须显式选择普通月/闰月：默认两者都不选中 -->
    <div
      v-if="calendar === 'lunar'"
      class="mt-4"
      role="radiogroup"
      aria-labelledby="bazi-leap-label"
    >
      <p id="bazi-leap-label" class="bazi-label">该月是闰月吗（必选）</p>
      <div class="mt-1 flex flex-wrap gap-2">
        <label
          class="bazi-choice"
          :class="{ 'bazi-choice--selected': draft.isLeapMonth === false }"
        >
          <input
            type="radio"
            name="bazi-leap"
            value="regular"
            class="sr-only"
            :checked="draft.isLeapMonth === false"
            @change="emit('update:leap-month', false)"
          />
          <span class="bazi-dot" aria-hidden="true" />
          <span>普通月</span>
        </label>
        <label class="bazi-choice" :class="{ 'bazi-choice--selected': draft.isLeapMonth === true }">
          <input
            type="radio"
            name="bazi-leap"
            value="leap"
            class="sr-only"
            :checked="draft.isLeapMonth === true"
            @change="emit('update:leap-month', true)"
          />
          <span class="bazi-dot bazi-dot--leap" aria-hidden="true" />
          <span>闰月</span>
        </label>
      </div>
      <p v-if="draft.isLeapMonth === null" class="bazi-note">
        闰月与普通月是两个月，请按出生时的历书选择；未选择时不会计算。
      </p>
    </div>

    <!-- 就地说明：为什么需要、是否必填、不提供会怎样、仅本次使用、哪些输出读取它 -->
    <p class="bazi-note bazi-note--block">
      出生日期是必填项：本页用它换算公历与农历，并据此排出年柱、月柱、日柱。
      不提供日期就不会产生任何结果。日期只在本页内存中使用，不提交服务器、不保存历史、
      不写入浏览器存储，刷新或离开页面即清除。年柱、月柱、日柱与「日期对照」都读取它。
    </p>

    <!-- 十四周岁声明（数据规范 §5.4） -->
    <label class="bazi-age">
      <input
        type="checkbox"
        class="mt-1"
        :checked="draft.ageConfirmed"
        data-bazi-age
        @change="onAge"
      />
      <span>
        我已满十四周岁。未满十四周岁时不提供个人出生日期的排盘计算，但仍可阅读本页的规则与来源说明。
      </span>
    </label>

    <p v-if="error" :id="errorId" class="bazi-error" role="alert">{{ error }}</p>
  </fieldset>
</template>

<style scoped>
/* 选项 chip：≥44px 触控目标；选中态靠边框 + 底纹 + 文字色，不只靠颜色。 */
.bazi-choice {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-paper-dark);
  border-radius: 0.35rem;
  background: var(--color-paper-lightest);
  color: var(--color-ink-medium);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.2;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}
.bazi-choice--selected {
  border-color: var(--color-cinnabar);
  background: color-mix(in srgb, var(--color-cinnabar) 8%, var(--color-paper-lightest));
  color: var(--color-cinnabar-deepest);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-cinnabar) 20%, transparent);
}

/* 字段：手机三列同行，窄屏自动换行 */
.bazi-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 6ch), 1fr));
  gap: 1rem;
  margin-top: 1rem;
}
.bazi-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}
.bazi-label {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: var(--color-ink-medium);
}
.bazi-control {
  width: 100%;
  min-height: 44px;
  appearance: auto;
  padding-inline: 0.75rem;
  background: var(--color-paper-lightest);
}

/* 辅助说明：正文下限之上，不用 ink-light */
.bazi-note {
  margin: 0.5rem 0 0;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  line-height: 1.65;
  color: var(--color-ink-medium);
}
.bazi-note--block {
  margin-top: 1rem;
}

.bazi-age {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 1rem;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.65;
  color: var(--color-ink-medium);
  cursor: pointer;
}

.bazi-error {
  margin: 0.75rem 0 0;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-cinnabar);
}

.bazi-dot {
  display: inline-block;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  border: 1px solid var(--color-ink-faint);
  background: transparent;
  flex-shrink: 0;
}
.bazi-dot--lunar {
  border-color: var(--color-jade);
}
.bazi-dot--leap {
  border-color: var(--color-cinnabar);
}
.sr-only:focus-visible + .bazi-dot {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}

@media (max-width: 389px) {
  .bazi-fields {
    gap: 0.75rem;
  }
}
</style>
