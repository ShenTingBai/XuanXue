<script setup lang="ts">
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'
import type { ZejiDayResult } from '~/composables/useZeJi'
import { TWELVE_STAR_LEVEL } from '~/constants/zeji'

const props = defineProps<{
  year: number
  month: number           // solar month (1-12)
  days: ZejiDayResult[]
  selectedDate: string | null  // 'YYYY-MM-DD'
  eventType: string
}>()

const emit = defineEmits<{
  selectDate: [date: string]  // emits 'YYYY-MM-DD'
}>()

// Weekday headers (Monday to Sunday)
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

// Calendar grid computation
const calendarGrid = computed(() => {
  const firstDayOfMonth = new Date(props.year, props.month - 1, 1)
  let startDayOfWeek = firstDayOfMonth.getDay() // 0=Sunday, 1=Monday, ...
  // Convert to Monday-based: 0=Monday, ..., 6=Sunday
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

  const daysInMonth = new Date(props.year, props.month, 0).getDate()
  const daysInPrevMonth = new Date(props.year, props.month - 1, 0).getDate()

  const grid: { day: number; isCurrentMonth: boolean; dateStr: string }[] = []

  let prevYear = props.year
  let prevMonth = props.month - 1
  if (prevMonth < 1) {
    prevMonth = 12
    prevYear = props.year - 1
  }

  let nextYear = props.year
  let nextMonth = props.month + 1
  if (nextMonth > 12) {
    nextMonth = 1
    nextYear = props.year + 1
  }

  // Previous month days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    grid.push({
      day: d,
      isCurrentMonth: false,
      dateStr: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({
      day: d,
      isCurrentMonth: true,
      dateStr: `${props.year}-${String(props.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }

  // Next month days to fill remaining cells
  const remaining = 7 - (grid.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      grid.push({
        day: d,
        isCurrentMonth: false,
        dateStr: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      })
    }
  }

  return grid
})

// Build a lookup map for quick access
const dayMap = computed(() => {
  const map = new Map<string, ZejiDayResult>()
  for (const d of props.days) {
    map.set(d.solarDate, d)
  }
  return map
})

// Today for highlighting
const todayStr = computed(() => {
  if (!import.meta.client) return ''
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
})

function isToday(dateStr: string): boolean {
  return dateStr === todayStr.value
}

function isSelected(dateStr: string): boolean {
  return dateStr === props.selectedDate
}

function getDayLevel(dateStr: string): string | null {
  const day = dayMap.value.get(dateStr)
  if (!day) return null
  return day.twelveStarLevel
}

function getDayScoreColor(dateStr: string): string | null {
  const day = dayMap.value.get(dateStr)
  if (!day) return null
  if (day.score >= 70) return WUXING_COLORS['木']
  if (day.score < 40) return WUXING_COLORS['火']
  return null
}

function handleSelect(dateStr: string) {
  emit('selectDate', dateStr)
}

// Keyboard navigation within the calendar grid
const tableRef = ref<HTMLTableElement | null>(null)

function getCellIndex(dateStr: string): number {
  return calendarGrid.value.findIndex(c => c.dateStr === dateStr)
}

function handleKeydown(e: KeyboardEvent, dateStr: string) {
  const idx = getCellIndex(dateStr)
  if (idx < 0) return

  let targetIdx = idx

  switch (e.key) {
    case 'ArrowRight':
      targetIdx = Math.min(idx + 1, calendarGrid.value.length - 1)
      break
    case 'ArrowLeft':
      targetIdx = Math.max(idx - 1, 0)
      break
    case 'ArrowDown':
      targetIdx = Math.min(idx + 7, calendarGrid.value.length - 1)
      break
    case 'ArrowUp':
      targetIdx = Math.max(idx - 7, 0)
      break
    default:
      return
  }

  e.preventDefault()
  const target = calendarGrid.value[targetIdx]
  // Focus the target cell
  const cells = tableRef.value?.querySelectorAll<HTMLElement>('[role="button"]')
  cells?.[targetIdx]?.focus()
}

function getAriaLabel(cell: { day: number; isCurrentMonth: boolean; dateStr: string }): string {
  const day = dayMap.value.get(cell.dateStr)
  if (!cell.isCurrentMonth) return ''
  if (!day) return `${props.year}年${props.month}月${cell.day}日`
  const starInfo = TWELVE_STAR_LEVEL[day.twelveStar]
  const starDesc = starInfo ? day.twelveStar + starInfo.desc : ''
  return `${props.year}年${props.month}月${cell.day}日，${starDesc}，${day.tianShenType || ''}，宜:${day.yi.slice(0, 5).join('、') || '无'}`
}

// Month name in Chinese
const monthNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
</script>

<template>
  <div class="card-warm rounded-xl p-8">
    <!-- Month header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-display text-lg sm:text-xl text-ink-dark tracking-[0.2em]">
        {{ year }}年 {{ monthNames[month - 1] }}月
      </h2>
    </div>

    <!-- Calendar table -->
    <div class="overflow-x-auto">
      <table
        ref="tableRef"
        class="w-full border-collapse"
        role="grid"
        :aria-label="`${year}年${month}月择日日历`"
      >
        <caption class="sr-only">
          {{ year }}年{{ month }}月 择吉日历，使用方向键在日期间导航
        </caption>
        <thead>
          <tr>
            <th
              v-for="w in WEEKDAYS"
              :key="w"
              scope="col"
              class="text-center py-2 text-[0.6875rem] text-ink-light font-medium tracking-[0.08em]"
            >
              周{{ w }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in Math.ceil(calendarGrid.length / 7)" :key="ri">
            <td
              v-for="(cell, ci) in calendarGrid.slice(ri * 7, (ri + 1) * 7)"
              :key="ci"
              class="text-center align-top p-0.5 sm:p-1"
            >
              <button
                v-if="cell.isCurrentMonth"
                :tabindex="isSelected(cell.dateStr) ? 0 : -1"
                :aria-label="getAriaLabel(cell)"
                :aria-pressed="isSelected(cell.dateStr)"
                :class="[
                  'day-cell w-full min-w-[2.5rem] sm:min-w-[3rem] aspect-square rounded-lg flex flex-col items-center justify-center transition-colors relative',
                  {
                    'day-cell--today': isToday(cell.dateStr),
                    'day-cell--selected': isSelected(cell.dateStr),
                    'day-cell--non-interactive': false,
                    'day-cell--ji': getDayLevel(cell.dateStr) === '吉',
                    'day-cell--xiong': getDayLevel(cell.dateStr) === '凶',
                  },
                ]"
                @click="handleSelect(cell.dateStr)"
                @keydown.enter="handleSelect(cell.dateStr)"
                @keydown.space.prevent="handleSelect(cell.dateStr)"
                @keydown="handleKeydown($event, cell.dateStr)"
              >
                <!-- Solar day number -->
                <span class="text-sm font-medium leading-none" :style="{ color: getDayScoreColor(cell.dateStr) || 'var(--color-ink)' }">
                  {{ cell.day }}
                </span>

                <!-- Lunar day number (small, below) -->
                <span
                  v-if="dayMap.get(cell.dateStr)"
                  class="text-[0.6875rem] leading-none mt-0.5 text-ink-light"
                >
                  {{ dayMap.get(cell.dateStr)?.lunarDayName }}
                </span>

                <!-- Auspiciousness indicator — shape + color dual encoding (a11y) -->
                <!-- 吉: circle ● -->
                <span
                  v-if="getDayLevel(cell.dateStr) === '吉'"
                  class="indicator-dot indicator-dot--ji absolute top-0.5 right-0.5"
                  aria-hidden="true"
                />
                <!-- 凶: diamond ◆ (distinct shape from circle, not color-dependent) -->
                <span
                  v-if="getDayLevel(cell.dateStr) === '凶'"
                  class="indicator-dot indicator-dot--xiong absolute top-0.5 right-0.5"
                  aria-hidden="true"
                />
              </button>

              <!-- Non-current-month cell (empty, non-interactive) -->
              <div
                v-else
                class="day-cell w-full min-w-[2.5rem] sm:min-w-[3rem] aspect-square rounded-lg flex items-center justify-center opacity-20"
              >
                <span class="text-sm text-ink-faint">{{ cell.day }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-4 mt-4 pt-3 border-t border-paper-dark/20">
      <div class="flex items-center gap-1.5">
        <span class="indicator-dot indicator-dot--ji inline-block relative" style="position:static" aria-hidden="true" />
        <span class="text-[0.6875rem] text-ink-light">吉 · 圆点</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="indicator-dot indicator-dot--xiong inline-block relative" style="position:static" aria-hidden="true" />
        <span class="text-[0.6875rem] text-ink-light">凶 · 菱形</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-full border" :style="{ borderColor: WUXING_COLORS['土'], opacity: 0.5 }" aria-hidden="true" />
        <span class="text-[0.6875rem] text-ink-light">平 · 空心</span>
      </div>
      <div class="flex items-center gap-1.5 ml-auto">
        <span class="w-3 h-3 rounded" :style="{ background: 'rgba(198,40,40,0.12)', border: '1.5px solid ' + 'var(--color-cinnabar)' }" aria-hidden="true" />
        <span class="text-[0.6875rem] text-ink-light">红底为选中</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.day-cell {
  background: transparent;
  border: 1.5px solid transparent;
  cursor: pointer;
  outline: none;
}

.day-cell:hover {
  background: rgba(44, 26, 14, 0.03);
  border-color: rgba(44, 26, 14, 0.05);
}

.day-cell:focus-visible {
  outline: 2px solid var(--color-cinnabar, #C62828);
  outline-offset: -2px;
}

.day-cell--today {
  background: rgba(198, 40, 40, 0.04);
}

.day-cell--selected {
  border-color: var(--color-cinnabar, #C62828) !important;
  background: rgba(198, 40, 40, 0.1);
  box-shadow: 0 0 0 2px rgba(198, 40, 40, 0.12), 0 1px 6px rgba(198, 40, 40, 0.08);
}

/* ── Accessibility: shape-distinct indicators (not color-only) ── */
.indicator-dot {
  display: block;
  width: 0.5rem;
  height: 0.5rem;
}

/* 吉: filled circle */
.indicator-dot--ji {
  border-radius: 50%;
  background: v-bind('WUXING_COLORS["木"]');
}

/* 凶: diamond — visually distinct from circle for colorblind users */
.indicator-dot--xiong {
  border-radius: 1px;
  background: v-bind('WUXING_COLORS["火"]');
  transform: rotate(45deg);
  width: 0.4rem;
  height: 0.4rem;
  margin-top: 0.075rem;
  margin-right: 0.075rem;
}

.day-cell--ji {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["木"]') 4%, transparent);
}
.day-cell--ji:hover {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["木"]') 8%, transparent);
  border-color: color-mix(in srgb, v-bind('WUXING_COLORS["木"]') 15%, transparent);
}

.day-cell--xiong {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 3%, transparent);
}
.day-cell--xiong:hover {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 7%, transparent);
  border-color: color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 12%, transparent);
}
</style>
