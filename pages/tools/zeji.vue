<script setup lang="ts">
import { WUXING_COLORS } from '~/constants/bazi'
import { evaluateDates, type ZejiResult, type ZejiDayResult } from '~/composables/useZeJi'
import { EVENT_TYPES } from '~/constants/zeji'

import ToolEditorialShell from '~/components/editorial/ToolEditorialShell.vue'
import SectionHeading from '~/components/editorial/SectionHeading.vue'
import ZejiCalendar from '~/components/tools/zeji/ZejiCalendar.vue'
import ZejiRecommend from '~/components/tools/zeji/ZejiRecommend.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import MethodologyNote, { type ClassicalSource } from '~/components/tools/MethodologyNote.vue'

// ── Methodology data ──
const zejiClassical: ClassicalSource[] = [
  { method: '十二值星', source: '《协纪辨方书》卷五，建除满平定执破危成收开闭十二星' },
  {
    method: '十二天神',
    source: '《星历考原》卷二，青龙明堂天刑朱雀金匮天德白虎玉堂天牢牢狱玄武司命勾陈',
  },
  {
    method: '宜忌事项',
    source: '《增补万全玉匣记》，嫁娶/开业/搬家/出行/修造/安葬/祭祀/会友/求医/入学',
  },
  {
    method: '二十八宿',
    source: '《星经》体系，角亢氐房心尾箕斗牛女虚危室壁奎娄胃昴毕觜参井鬼柳星张翼轸',
  },
  {
    method: '黄黑道',
    source: '建满平收黑、除危定执黄、成开皆可用、破闭不可当（《协纪辨方书》口诀）',
  },
]
const zejiSynthesis: string[] = [
  '评分算法：值星±(20~-15) + 天神±(15~-10) + 宜忌±(15~-5)，阈值：≥85上吉/≥65吉/≥45平/<45凶',
  '事项关键词匹配为工程约定（民间常用但不完整）',
  '评分权重和阈值为开发者校准（无经典原文量化标准）',
]

/**
 * 卷目（Ⅰ–Ⅱ）与脚注。
 *
 * 卷目只列页面**已有**的两段：选择事项与日历/推荐结果，不为凑长度新增段
 * （设计系统：卷目只是既有段序的目录；本页本身就是「输入 → 结果」两段结构）。
 * 脚注写本页真实边界：可查月份范围与评分权重的来源性质。
 */
const indexItems = [
  { num: 'Ⅰ', label: '选择事项', href: '#zeji-event' },
  { num: 'Ⅱ', label: '日历与推荐吉日', href: '#zeji-calendar' },
]

/**
 * 卷目脚注：只写本页可查范围（一行，窄屏隐藏）。
 *
 * 评分权重与阈值的来源性质（工程校准、无经典原文量化标准）由报头 meta 短事实承担，
 * 「注」面板的 zejiSynthesis 提供展开证据；脚注不再复述，避免首屏出现两遍。
 */
const indexFootnote = '本月起三个月内择日'

useSeoMeta({
  title: '择吉日 — 玄·道',
  ogTitle: '择吉日 — 玄·道',
  description: '传统择吉日推荐，根据十二值星、黄黑道和二十八宿为你挑选最佳日期。',
  ogDescription: '传统择吉日推荐，根据十二值星、黄黑道和二十八宿为你挑选最佳日期。',
  ogType: 'website',
})

const { currentProfile, restoreSession } = useAuth()
const router = useRouter()

const showScrollTop = ref(false)
const { exportToImage, isExporting } = useExportImage()
const resultRef = ref<HTMLElement | null>(null)

function handleExport() {
  if (resultRef.value) {
    exportToImage(resultRef.value, '择吉日.png')
  }
}

function handleScroll() {
  showScrollTop.value = window.scrollY > 300
}

function scrollToTop() {
  const prefersReducedMotion = import.meta.client
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  if (!prefersReducedMotion) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0 })
  }
}

onMounted(async () => {
  await restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
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
const result = ref<ZejiResult>(evaluateDates(selectedEvent.value, today, 3))
watch(selectedEvent, () => {
  result.value = evaluateDates(selectedEvent.value, today, 3)
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
// Fallback: if no dates reach the threshold, show top 5 by score anyway
const recommendedForMonth = computed<ZejiDayResult[]>(() => {
  const recommended = daysForMonth.value.filter(d => d.isRecommended)
  if (recommended.length > 0) {
    return recommended.sort((a, b) => b.score - a.score).slice(0, 15)
  }
  // Fallback: show best-scoring days even if below threshold
  return [...daysForMonth.value].sort((a, b) => b.score - a.score).slice(0, 5)
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
  } else if (e.key === 'Home') {
    e.preventDefault()
    selectedMonthIndex.value = 0
  } else if (e.key === 'End') {
    e.preventDefault()
    selectedMonthIndex.value = 2
  }
}
</script>

<template>
  <ToolEditorialShell
    :index-items="indexItems"
    :index-footnote="indexFootnote"
    seal="择"
    edition="工具 · 黄历择吉"
    title="择吉日"
    subtitle="传统择吉日推荐，根据十二值星、黄黑道和二十八宿为你挑选最佳日期。"
    status-text="内部验证中"
    meta-text="依据《协纪辨方书》《星历考原》《增补万全玉匣记》 · 评分权重为工程校准，暂无经典原文量化标准"
  >
    <!-- 顶部工具条：仅保留导出入口（历史记录已下线）；不进入导出区域 -->
    <div class="flex items-center justify-between mb-6">
      <span></span>
      <ExportButton
        :target-ref="resultRef"
        filename="择吉日.png"
        :is-exporting="isExporting"
        @export="handleExport"
      />
    </div>

    <div ref="resultRef">
      <!-- Ⅰ 选择事项：事项类型是本页唯一输入，选择器放正文（左栏只放卷目） -->
      <section
        id="zeji-event"
        class="editorial-section editorial-section--first"
        aria-labelledby="zeji-event-heading"
      >
        <div class="flex items-center justify-between gap-4">
          <SectionHeading num="Ⅰ" title="选择事项" heading-id="zeji-event-heading" />
          <MethodologyNote :classical="zejiClassical" :synthesis="zejiSynthesis" tool="择吉" />
        </div>

        <!-- ══ Event Type Selector ══ -->
        <div class="section-enter card-paper-solid rounded-xl p-8" :style="{ '--delay': '0.1s' }">
          <p class="text-xs text-ink-light mb-5 tracking-wide">
            选择您要择吉的事项类型，系统将根据黄历宜忌为您推荐吉日
          </p>

          <!-- 事项选择：原生 radio + 共享 choice-control。
               此前是 role="radio" 的 button 组，需要手写 aria-checked 与键盘分支；
               改用原生 input 后，Tab 聚焦、方向键切换与 Space 选中由浏览器提供。 -->
          <div class="flex flex-wrap gap-2.5" role="radiogroup" aria-label="择日事项类型">
            <label v-for="(info, key) in EVENT_TYPES" :key="key" class="choice-control event-btn">
              <input
                v-model="selectedEvent"
                type="radio"
                name="zeji-event"
                :value="key"
                class="sr-only"
                @change="selectEvent(key)"
              />
              <span
                class="seal-icon text-[0.6875rem] w-5 h-5 flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
                >{{ info.icon }}</span
              >
              <span class="choice-control__text font-sans tracking-[0.06em]">{{ info.name }}</span>
            </label>
          </div>
        </div>
      </section>

      <!-- Ⅱ 日历与推荐吉日：月份切换 + 日历 + 当日详情 / 推荐 -->
      <section id="zeji-calendar" class="editorial-section" aria-labelledby="zeji-calendar-heading">
        <SectionHeading num="Ⅱ" title="日历与推荐吉日" heading-id="zeji-calendar-heading" />

        <!-- ══ Month Tabs ══ -->
        <div
          class="section-enter"
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
                selectedMonthIndex === idx ? 'month-tab--active' : 'month-tab--idle',
              ]"
              @click="selectedMonthIndex = idx"
              @keydown="handleMonthTabKeydown($event, idx)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- ══ Calendar + Detail Row ══ -->
        <div
          class="section-enter grid lg:grid-cols-[1fr_380px] gap-6"
          :style="{ '--delay': '0.25s' }"
          role="tabpanel"
          :aria-label="`${displayMonth.year}年${displayMonth.month}月日历`"
        >
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
            <div v-if="selectedDayDetail" class="card-warm rounded-xl p-8">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-display text-base text-ink-dark tracking-[0.15em]">日辰详情</h2>
                <button
                  class="text-[0.6875rem] text-ink-light hover:text-cinnabar transition-colors"
                  @click="selectedDate = null"
                  @keydown.enter="selectedDate = null"
                  @keydown.space.prevent="selectedDate = null"
                >
                  关闭
                </button>
              </div>

              <!-- Date header -->
              <div class="mb-4">
                <p class="font-display text-xl text-ink-dark tracking-[0.1em] mb-1">
                  {{ selectedDayDetail.lunarMonthName }}{{ selectedDayDetail.lunarDayName }}
                </p>
                <p class="text-[0.6875rem] text-ink-light tracking-[0.08em]">
                  {{ selectedDayDetail.solarDate }}
                </p>
              </div>

              <!-- 干支 -->
              <div class="flex items-center gap-2 mb-4 text-xs text-ink-medium tracking-[0.08em]">
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
                    >{{ selectedDayDetail.twelveStar }}</span
                  >
                </div>
                <div class="detail-kv">
                  <span class="detail-kv__key">天神</span>
                  <span
                    class="detail-kv__val"
                    :class="{
                      'text-wuxing-wood': selectedDayDetail.tianShenType === '黄道',
                      'text-cinnabar': selectedDayDetail.tianShenType === '黑道',
                    }"
                    >{{ selectedDayDetail.tianShenType || '—' }}·{{
                      selectedDayDetail.tianShen || '—'
                    }}</span
                  >
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
                      'text-wuxing-wood': selectedDayDetail.score >= 65,
                      'text-wuxing-earth':
                        selectedDayDetail.score >= 45 && selectedDayDetail.score < 65,
                      'text-cinnabar': selectedDayDetail.score < 45,
                    }"
                    >{{ selectedDayDetail.score }}
                    {{
                      selectedDayDetail.score >= 85
                        ? '上吉'
                        : selectedDayDetail.score >= 65
                          ? '吉'
                          : selectedDayDetail.score >= 45
                            ? '平'
                            : '凶'
                    }}</span
                  >
                </div>
              </div>

              <!-- 宜 -->
              <div class="mb-3">
                <p class="text-[0.6875rem] text-wuxing-wood font-medium mb-1.5 tracking-[0.06em]">
                  宜
                </p>
                <div class="flex flex-wrap gap-1">
                  <span v-for="(item, i) in selectedDayDetail.yi" :key="i" class="tag-yi">{{
                    item
                  }}</span>
                  <span
                    v-if="selectedDayDetail.yi.length === 0"
                    class="text-[0.6875rem] text-ink-light"
                    >无</span
                  >
                </div>
              </div>

              <!-- 忌 -->
              <div>
                <p class="text-[0.6875rem] text-cinnabar font-medium mb-1.5 tracking-[0.06em]">
                  忌
                </p>
                <div class="flex flex-wrap gap-1">
                  <span v-for="(item, i) in selectedDayDetail.ji" :key="i" class="tag-ji">{{
                    item
                  }}</span>
                  <span
                    v-if="selectedDayDetail.ji.length === 0"
                    class="text-[0.6875rem] text-ink-light"
                    >无</span
                  >
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
      </section>
    </div>
    <!-- /resultRef -->

    <!-- 根级附加区：回到顶部不属于阅读流，放在外壳同级 -->
    <template #after>
      <ScrollTopButton
        v-if="showScrollTop"
        @click="scrollToTop"
        @keydown="
          (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              scrollToTop()
            }
          }
        "
      />
    </template>
  </ToolEditorialShell>
</template>

<style scoped>
/* ── Month tabs ── */
.month-tab {
  color: var(--color-ink-light, #8a7a6a);
  background: transparent;
  border-bottom-color: transparent;
}

.month-tab:hover {
  color: var(--color-ink, #2c1810);
  background: rgba(44, 26, 14, 0.02);
}

.month-tab:focus-visible {
  outline: 2px solid var(--color-cinnabar, #c62828);
  outline-offset: -2px;
  border-radius: 4px;
}

.month-tab--active {
  color: var(--color-cinnabar, #c62828);
  background: rgba(198, 40, 40, 0.04);
  border-bottom-color: var(--color-cinnabar, #c62828);
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
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  letter-spacing: 0.06em;
}

.detail-kv__val {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink, #2c1810);
  letter-spacing: 0.04em;
}

/* ── 宜 tags ── */
.tag-yi {
  display: inline-block;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  padding: 0.15rem 0.5rem;
  border-radius: 3px;
  background: color-mix(in srgb, v-bind('WUXING_COLORS["木"]') 6%, transparent);
  color: v-bind('WUXING_COLORS["木"]');
  letter-spacing: 0.04em;
}

/* ── 忌 tags ── */
.tag-ji {
  display: inline-block;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  padding: 0.15rem 0.5rem;
  border-radius: 3px;
  background: color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 5%, transparent);
  color: v-bind('WUXING_COLORS["火"]');
  letter-spacing: 0.04em;
}

/* ── Animation ── */
.section-enter {
  animation: secIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay, 0s);
}

@keyframes secIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
