<script setup lang="ts">
import { evaluateDates, type ZejiResult, type ZejiDayResult } from '~/composables/useZeJi'
import { EVENT_TYPES } from '~/constants/zeji'

import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import EntertainmentDisclaimer from '~/components/tools/EntertainmentDisclaimer.vue'
import ZejiCalendar from '~/components/tools/zeji/ZejiCalendar.vue'
import ZejiRecommend from '~/components/tools/zeji/ZejiRecommend.vue'

useHead({ title: '择吉日 - 玄学' })

const { restoreSession } = useAuth()

onMounted(() => {
  restoreSession()
})

// Event type selection
const selectedEvent = ref<string>(Object.keys(EVENT_TYPES)[0] || 'wedding')

// Month navigation
const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth() + 1

const selectedMonthIndex = ref(0) // 0=current month, 1=next, 2=next+1

// Compute the actual year/month for the selected tab
const displayMonth = computed(() => {
  const rawMonth = currentMonth + selectedMonthIndex.value
  if (rawMonth > 12) {
    return {
      year: currentYear + Math.floor((rawMonth - 1) / 12),
      month: ((rawMonth - 1) % 12) + 1,
    }
  }
  return { year: currentYear, month: rawMonth }
})

// Selected date for detail view
const selectedDate = ref<string | null>(null)

// Build month tab labels
const monthNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
const monthTabs = computed(() => {
  const tabs: { label: string; year: number; month: number }[] = []
  for (let i = 0; i < 3; i++) {
    const rawMonth = currentMonth + i
    let y = currentYear
    let m = rawMonth
    if (rawMonth > 12) {
      y = currentYear + Math.floor((rawMonth - 1) / 12)
      m = ((rawMonth - 1) % 12) + 1
    }
    const prefix = i === 0 ? '本月' : i === 1 ? '下月' : '下下月'
    tabs.push({
      label: `${prefix} · ${y}年${m}月`,
      year: y,
      month: m,
    })
  }
  return tabs
})

// Evaluate dates — reactive on event type change
const result = computed<ZejiResult>(() => {
  return evaluateDates(selectedEvent.value, today, 3)
})

// Get days for the currently displayed month
const daysForMonth = computed<ZejiDayResult[]>(() => {
  const dm = displayMonth.value
  const monthEntry = result.value.months.find(m => m.year === dm.year && m.month === dm.month)
  return monthEntry?.days || []
})

// Get the selected day detail
const selectedDayDetail = computed<ZejiDayResult | null>(() => {
  if (!selectedDate.value) return null
  for (const monthEntry of result.value.months) {
    const found = monthEntry.days.find(d => d.solarDate === selectedDate.value)
    if (found) return found
  }
  return null
})

// Get recommended dates for the displayed month
const recommendedForMonth = computed<ZejiDayResult[]>(() => {
  return daysForMonth.value.filter(d => d.isRecommended).sort((a, b) => b.score - a.score).slice(0, 10)
})

function selectEvent(eventKey: string) {
  selectedEvent.value = eventKey
  selectedDate.value = null // Reset selection on event change
}

function handleSelectDate(dateStr: string) {
  selectedDate.value = dateStr === selectedDate.value ? null : dateStr
}

// Keyboard navigation for month tabs
function handleMonthTabKeydown(e: KeyboardEvent, index: number) {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (index < 2) selectedMonthIndex.value = index + 1
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (index > 0) selectedMonthIndex.value = index - 1
  }
}
</script>

<template>
  <ToolPageLayout>
    <h1 class="sr-only">择吉日</h1>

    <div class="max-w-[56rem] mx-auto">

      <!-- ══ Event Type Selector ══ -->
      <div class="fade-in card-paper-solid rounded-xl p-8" :style="{ '--delay': '0.1s' }">
        <div class="section-header">
          <h2>选择事项</h2>
        </div>
        <p class="text-xs text-ink-light/80 mb-5 tracking-wide">
          选择您要择吉的事项类型，系统将根据黄历宜忌为您推荐吉日
        </p>

        <div class="flex flex-wrap gap-2.5" role="radiogroup" aria-label="择日事项类型">
          <button
            v-for="(info, key) in EVENT_TYPES"
            :key="key"
            role="radio"
            :aria-checked="selectedEvent === key"
            :class="[
              'event-btn flex items-center gap-1.5 px-3.5 py-2 rounded-lg border transition-all text-sm',
              selectedEvent === key
                ? 'event-btn--active'
                : 'event-btn--idle',
            ]"
            @click="selectEvent(key)"
            @keydown.enter="selectEvent(key)"
            @keydown.space.prevent="selectEvent(key)"
          >
            <span
              class="seal-icon text-[0.55rem] w-5 h-5 flex items-center justify-center flex-shrink-0"
              :style="selectedEvent === key ? { background: 'var(--color-cinnabar)' } : {}"
              aria-hidden="true"
            >{{ info.icon }}</span>
            <span class="font-sans tracking-[0.06em]">{{ info.name }}</span>
          </button>
        </div>
      </div>

      <!-- ══ Month Tabs ══ -->
      <div
        class="fade-in mt-6"
        :style="{ '--delay': '0.2s' }"
        role="tablist"
        aria-label="月份选择"
      >
        <div class="flex gap-1">
          <button
            v-for="(tab, idx) in monthTabs"
            :key="idx"
            role="tab"
            :aria-selected="selectedMonthIndex === idx"
            :tabindex="selectedMonthIndex === idx ? 0 : -1"
            :class="[
              'month-tab px-4 py-2.5 rounded-t-lg border-b-2 transition-all text-sm font-sans tracking-[0.06em]',
              selectedMonthIndex === idx
                ? 'month-tab--active'
                : 'month-tab--idle',
            ]"
            @click="selectedMonthIndex = idx"
            @keydown="handleMonthTabKeydown($event, idx)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- ══ Calendar + Detail Row ══ -->
      <div class="fade-in grid lg:grid-cols-[1fr_380px] gap-6" :style="{ '--delay': '0.25s' }">
        <!-- Calendar -->
        <ZejiCalendar
          :year="displayMonth.year"
          :month="displayMonth.month"
          :days="daysForMonth"
          :selected-date="selectedDate"
          :event-type="selectedEvent"
          @select-date="handleSelectDate"
        />

        <!-- Right side: Selected day detail OR recommendations -->
        <div class="space-y-6">
          <!-- Selected day detail -->
          <div v-if="selectedDayDetail" class="card-warm rounded-xl p-6 sm:p-8">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-display text-base text-ink-dark tracking-[0.15em]">日辰详情</h2>
              <button
                class="text-[0.6rem] text-ink-light/60 hover:text-cinnabar transition-colors"
                @click="selectedDate = null"
                @keydown.enter="selectedDate = null"
              >
                关闭
              </button>
            </div>

            <!-- Date header -->
            <div class="mb-4">
              <p class="font-display text-xl text-ink-dark tracking-[0.1em] mb-1">
                {{ selectedDayDetail.lunarMonthName }}{{ selectedDayDetail.lunarDayName }}
              </p>
              <p class="text-[0.65rem] text-ink-light/70 tracking-[0.08em]">
                {{ selectedDayDetail.solarDate }}
              </p>
            </div>

            <!-- 干支 -->
            <div class="flex items-center gap-2 mb-4 text-[0.7rem] text-ink-muted tracking-[0.08em]">
              <span>{{ selectedDayDetail.lunarYearGanZhi }}年</span>
              <span>{{ selectedDayDetail.lunarMonthGanZhi }}月</span>
              <span>{{ selectedDayDetail.lunarDayGanZhi }}日</span>
            </div>

            <!-- 十二值星 + 二十八宿 + 黄黑道 -->
            <div class="grid grid-cols-2 gap-2 mb-4">
              <div class="detail-kv">
                <span class="detail-kv__key">十二值星</span>
                <span
                  class="detail-kv__val font-medium"
                  :class="{
                    'text-wuxing-wood': selectedDayDetail.twelveStarLevel === '吉',
                    'text-cinnabar': selectedDayDetail.twelveStarLevel === '凶',
                    'text-wuxing-earth': selectedDayDetail.twelveStarLevel === '平',
                  }"
                >{{ selectedDayDetail.twelveStar }}</span>
              </div>
              <div class="detail-kv">
                <span class="detail-kv__key">天神</span>
                <span
                  class="detail-kv__val"
                  :class="{
                    'text-wuxing-wood': selectedDayDetail.tianShenType === '黄道',
                    'text-cinnabar': selectedDayDetail.tianShenType === '黑道',
                  }"
                >{{ selectedDayDetail.tianShenType || '—' }}·{{ selectedDayDetail.tianShen || '—' }}</span>
              </div>
              <div class="detail-kv">
                <span class="detail-kv__key">二十八宿</span>
                <span class="detail-kv__val">{{ selectedDayDetail.xiu || '—' }}</span>
              </div>
              <div class="detail-kv">
                <span class="detail-kv__key">评分</span>
                <span
                  class="detail-kv__val font-medium"
                  :class="{
                    'text-wuxing-wood': selectedDayDetail.score >= 70,
                    'text-wuxing-earth': selectedDayDetail.score >= 40 && selectedDayDetail.score < 70,
                    'text-cinnabar': selectedDayDetail.score < 40,
                  }"
                >{{ selectedDayDetail.score }}</span>
              </div>
            </div>

            <!-- 宜 -->
            <div class="mb-3">
              <p class="text-[0.65rem] text-wuxing-wood font-medium mb-1.5 tracking-[0.06em]">宜</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="(item, i) in selectedDayDetail.yi"
                  :key="i"
                  class="tag-yi"
                >{{ item }}</span>
                <span v-if="selectedDayDetail.yi.length === 0" class="text-[0.6rem] text-ink-light/50">无</span>
              </div>
            </div>

            <!-- 忌 -->
            <div>
              <p class="text-[0.65rem] text-cinnabar font-medium mb-1.5 tracking-[0.06em]">忌</p>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="(item, i) in selectedDayDetail.ji"
                  :key="i"
                  class="tag-ji"
                >{{ item }}</span>
                <span v-if="selectedDayDetail.ji.length === 0" class="text-[0.6rem] text-ink-light/50">无</span>
              </div>
            </div>
          </div>

          <!-- Recommendations (when no day selected) -->
          <ZejiRecommend
            v-else
            :recommended-dates="recommendedForMonth"
            :event-type="selectedEvent"
            :event-name="result.eventName"
          />
        </div>
      </div>

      <EntertainmentDisclaimer />

    </div>
  </ToolPageLayout>
</template>

<style scoped>
/* ── Event selector buttons ── */
.event-btn {
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--color-ink-medium, #5A4A3A);
  background: var(--color-paper-lightest, #FBF8F4);
  border-color: rgba(44, 26, 14, 0.06);
}

.event-btn:hover {
  background: rgba(44, 26, 14, 0.03);
  border-color: rgba(44, 26, 14, 0.1);
}

.event-btn:focus-visible {
  outline: 2px solid var(--color-cinnabar, #C62828);
  outline-offset: 1px;
}

.event-btn--active {
  color: var(--color-cinnabar, #C62828);
  background: rgba(198, 40, 40, 0.05);
  border-color: rgba(198, 40, 40, 0.2);
  box-shadow: 0 0 0 1px rgba(198, 40, 40, 0.06);
}

/* ── Month tabs ── */
.month-tab {
  color: var(--color-ink-light, #8A7A6A);
  background: transparent;
  border-bottom-color: transparent;
}

.month-tab:hover {
  color: var(--color-ink, #2C1810);
  background: rgba(44, 26, 14, 0.02);
}

.month-tab:focus-visible {
  outline: 2px solid var(--color-cinnabar, #C62828);
  outline-offset: -2px;
  border-radius: 4px;
}

.month-tab--active {
  color: var(--color-cinnabar, #C62828);
  background: rgba(198, 40, 40, 0.04);
  border-bottom-color: var(--color-cinnabar, #C62828);
}

/* ── Detail key/value pairs ── */
.detail-kv {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem 0.625rem;
  border-radius: 0.375rem;
  background: rgba(44, 26, 14, 0.015);
  border: 1px solid rgba(44, 26, 14, 0.03);
}

.detail-kv__key {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.55rem;
  color: var(--color-ink-light, #8A7A6A);
  letter-spacing: 0.06em;
}

.detail-kv__val {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.7rem;
  color: var(--color-ink, #2C1810);
  letter-spacing: 0.04em;
}

/* ── 宜 tags ── */
.tag-yi {
  display: inline-block;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.55rem;
  padding: 0.15rem 0.5rem;
  border-radius: 3px;
  background: rgba(61, 107, 75, 0.06);
  color: #3D6B4B;
  letter-spacing: 0.04em;
}

/* ── 忌 tags ── */
.tag-ji {
  display: inline-block;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.55rem;
  padding: 0.15rem 0.5rem;
  border-radius: 3px;
  background: rgba(198, 40, 40, 0.05);
  color: #C62828;
  letter-spacing: 0.04em;
}

/* ── Animation ── */
.fade-in {
  animation: secIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay, 0s);
}

@keyframes secIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
