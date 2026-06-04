<script setup lang="ts">
import { calculateHeHun, createPersonInfoFromProfile, type HeHunResult, type PersonInfo } from '~/composables/useHeHun'
import { parseDate } from '~/utils/date'

const { currentProfile, restoreSession, getAuthHeaders } = useAuth()
const router = useRouter()

import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import HeHunScoreCard from '~/components/tools/hehun/HeHunScoreCard.vue'
import HeHunDimensionCard from '~/components/tools/hehun/HeHunDimensionCard.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import EntertainmentDisclaimer from '~/components/tools/EntertainmentDisclaimer.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import type { HeHunGrade } from '~/constants/hehun'
import BaziSmallDisplay from '~/components/tools/bazi/BaziSmallDisplay.vue'

useHead({ title: '八字合婚 - 玄学' })

const result = ref<HeHunResult | null>(null)
const loading = ref(false)
const missingBirthInfo = ref(false)
const error = ref('')

// ── Person B input ──
const bYear = ref(new Date().getFullYear() - 28)
const bMonth = ref(6)
const bDay = ref(15)
const bHour = ref<number | null>(12)
const bGender = ref<'男' | '女'>('男')
const bCalendar = ref<'solar' | 'lunar'>('solar')
const bNickname = ref('')

const showScrollTop = ref(false)
const resultRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()

function handleExport() {
  if (resultRef.value) {
    exportToImage(resultRef.value, '八字合婚.png')
  }
}

function handleScroll() {
  showScrollTop.value = window.scrollY > 300
}

function scrollToTop() {
  const prefersReducedMotion = import.meta.client ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  if (!prefersReducedMotion) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0 })
  }
}

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }
  if (!currentProfile.value.birth_date) {
    missingBirthInfo.value = true
    return
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// ── Person A (from profile) ──
const personA = computed<PersonInfo | null>(() => {
  const p = currentProfile.value
  if (!p?.birth_date) return null
  return createPersonInfoFromProfile({
    birth_date: p.birth_date,
    birth_calendar: p.birth_calendar ?? 'solar',
    birth_hour: p.birth_hour,
    gender: p.gender,
    nickname: p.nickname,
  })
})

function validateDate(year: number, month: number, day: number): boolean {
  if (!year || year < 1900 || year > 2100) return false
  if (!month || month < 1 || month > 12) return false
  if (!day || day < 1 || day > 31) return false
  const d = new Date(year, month - 1, day)
  return d.getMonth() === month - 1 && d.getDate() === day
}

function computeHeHun() {
  if (!personA.value) {
    error.value = '请先完善个人信息中的出生日期'
    return
  }

  if (!validateDate(bYear.value, bMonth.value, bDay.value)) {
    error.value = '请输入有效的对方出生日期'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const personB: PersonInfo = {
      year: bYear.value,
      month: bMonth.value,
      day: bDay.value,
      hour: bHour.value,
      gender: bGender.value,
      calendar: bCalendar.value,
      nickname: bNickname.value.trim() || '对方',
    }

    result.value = calculateHeHun({ personA: personA.value, personB })
  } catch (e) {
    console.error('合婚计算失败:', e)
    error.value = '合婚计算失败，请检查输入信息'
  } finally {
    loading.value = false
  }
}

// ── Grade presentation ──
const computedGrade = computed<HeHunGrade | null>(() => {
  return result.value?.grade || null
})
</script>

<template>
  <ToolPageLayout>
    <template #nav>
      <div class="hehun-sidebar fade-in" :style="{ '--delay': '0s' }">
        <div class="sidebar-header">
          <div class="sidebar-seal" aria-hidden="true">合</div>
          <h3 class="sidebar-title">本人信息</h3>
        </div>
        <div v-if="personA" class="sidebar-info">
          <p class="sidebar-name">{{ currentProfile?.nickname || '我' }}</p>
          <p class="sidebar-dob">{{ personA.year }}年{{ personA.month }}月{{ personA.day }}日</p>
          <p class="sidebar-dob">{{ personA.gender }} · {{ personA.calendar === 'solar' ? '公历' : '农历' }}</p>
        </div>
        <div v-else class="sidebar-empty">
          <p class="text-xs text-ink-light">请先完善<a href="/profile" class="text-cinnabar">个人档案</a>中的出生信息</p>
        </div>
      </div>
    </template>

    <h1 class="sr-only">八字合婚</h1>

    <div role="status" class="sr-only" aria-live="polite">
      {{ loading ? '正在计算...' : result ? '结果已就绪' : '' }}
    </div>

    <!-- Missing birth info -->
    <div v-if="missingBirthInfo" class="text-center py-16">
      <p class="font-sans text-lg text-ink-medium mb-4">请先完善个人出生信息</p>
      <p class="font-sans text-sm text-ink-light mb-6">需要填写您的出生日期以参与合婚</p>
      <NuxtLink :to="`/profile/${currentProfile?.id}`" class="btn-cin inline-flex">
        <span>前往编辑档案</span>
      </NuxtLink>
    </div>

    <!-- Main content -->
    <template v-else>
      <div class="max-w-[48rem] mx-auto">
        <ToolToolbar>
          <template #extra>
            <ExportButton
              v-if="result"
              :target-ref="resultRef"
              filename="八字合婚.png"
              :is-exporting="isExporting"
              @export="handleExport"
            />
          </template>
        </ToolToolbar>

        <!-- ══ 输入区 ══ -->
        <div class="fade-in card-paper-solid rounded-xl p-8" :style="{ '--delay': '0.1s' }">
          <div class="section-header">
            <h2>对方信息</h2>
          </div>
          <p class="text-xs text-ink-light/80 mb-6 tracking-wide">输入对方的出生信息进行合婚分析</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <!-- Year -->
            <div>
              <label for="b-year" class="input-label">出生年份</label>
              <input
                id="b-year"
                v-model.number="bYear"
                type="number"
                min="1900" max="2100"
                class="input-ink w-full"
                placeholder="如 1990"
              />
            </div>
            <!-- Month -->
            <div>
              <label for="b-month" class="input-label">出生月份</label>
              <input
                id="b-month"
                v-model.number="bMonth"
                type="number"
                min="1" max="12"
                class="input-ink w-full"
              />
            </div>
            <!-- Day -->
            <div>
              <label for="b-day" class="input-label">出生日期</label>
              <input
                id="b-day"
                v-model.number="bDay"
                type="number"
                min="1" max="31"
                class="input-ink w-full"
              />
            </div>
            <!-- Hour -->
            <div>
              <label for="b-hour" class="input-label">出生时辰</label>
              <select
                id="b-hour"
                v-model.number="bHour"
                class="input-ink w-full"
              >
                <option :value="null">未知</option>
                <option v-for="h in 12" :key="h" :value="(h * 2 - 2)">
                  {{ '子丑寅卯辰巳午未申酉戌亥'[h - 1] }}时（{{ String(h * 2 - 2).padStart(2, '0') }}:00-{{ String(h * 2).padStart(2, '0') }}:00）
                </option>
              </select>
            </div>
            <!-- Gender -->
            <div>
              <label class="input-label block mb-2">性别</label>
              <div class="flex gap-4">
                <label class="radio-inline">
                  <input type="radio" v-model="bGender" value="男" class="sr-only" />
                  <span class="radio-custom">男</span>
                </label>
                <label class="radio-inline">
                  <input type="radio" v-model="bGender" value="女" class="sr-only" />
                  <span class="radio-custom">女</span>
                </label>
              </div>
            </div>
            <!-- Calendar -->
            <div>
              <label class="input-label block mb-2">历法</label>
              <div class="flex gap-4">
                <label class="radio-inline">
                  <input type="radio" v-model="bCalendar" value="solar" class="sr-only" />
                  <span class="radio-custom">公历</span>
                </label>
                <label class="radio-inline">
                  <input type="radio" v-model="bCalendar" value="lunar" class="sr-only" />
                  <span class="radio-custom">农历</span>
                </label>
              </div>
            </div>
            <!-- Nickname -->
            <div class="sm:col-span-2">
              <label for="b-nickname" class="input-label">对方称呼（可选）</label>
              <input
                id="b-nickname"
                v-model="bNickname"
                class="input-ink w-full"
                placeholder="如 张三"
                maxlength="20"
              />
            </div>
          </div>

          <div class="flex justify-center mt-8">
            <button
              @click="computeHeHun"
              @keydown.enter="computeHeHun"
              :disabled="loading"
              class="btn-seal"
            >
              <span class="btn-seal__char" aria-hidden="true">合</span>
              <span>{{ loading ? '正在合婚...' : '开始合婚' }}</span>
            </button>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="mt-4 text-center">
          <p class="text-sm text-cinnabar" role="alert">{{ error }}</p>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="mt-6 space-y-4" aria-busy="true">
          <span class="sr-only">正在计算...</span>
          <SkeletonCard />
        </div>

        <!-- ══ Result ══ -->
        <template v-if="result">
          <div ref="resultRef">
          <!-- Score -->
          <div class="mt-8">
            <HeHunScoreCard
              :total-score="result.totalScore"
              :grade="computedGrade"
              delay="0.15s"
            />
          </div>

          <!-- Summary -->
          <div class="fade-in mt-6 card-warm rounded-xl p-6" :style="{ '--delay': '0.25s' }">
            <div class="section-header">
              <h2>合婚综论</h2>
            </div>
            <p class="font-sans text-sm text-ink-medium leading-relaxed mb-4">{{ result.summary }}</p>

            <!-- Warnings -->
            <div v-if="result.warnings.length > 0" class="space-y-1.5 mb-4">
              <p class="font-sans text-xs font-medium text-cinnabar/80 mb-1">⚠ 注意事项</p>
              <p
                v-for="(w, i) in result.warnings"
                :key="i"
                class="font-sans text-xs text-ink-light pl-3 border-l-2 border-cinnabar/30"
              >{{ w }}</p>
            </div>

            <!-- Suggestions -->
            <div class="space-y-1">
              <p class="font-sans text-xs font-medium text-wuxing-wood/80 mb-1">✦ 建议</p>
              <p
                v-for="(s, i) in result.suggestions"
                :key="i"
                class="font-sans text-xs text-ink-light pl-3 border-l-2 border-wuxing-wood/30"
              >{{ s }}</p>
            </div>
          </div>

          <!-- Dimensions -->
          <div class="mt-6 space-y-4">
            <p class="font-sans text-xs text-ink-light/80 tracking-wide text-center">维度分析</p>
            <HeHunDimensionCard
              v-for="(dim, i) in result.dimensions"
              :key="dim.name"
              :dim="dim"
              :delay="`${0.3 + i * 0.07}s`"
            />
          </div>

          <!-- 八字对比 -->
          <div class="fade-in mt-6 card-warm rounded-xl p-6" :style="{ '--delay': '0.7s' }">
            <div class="section-header">
              <h2>八字对照</h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
              <div>
                <p class="font-sans text-xs text-ink-medium mb-3">{{ currentProfile?.nickname || '本人' }}</p>
                <BaziSmallDisplay :result="result.baziA" />
              </div>
              <div>
                <p class="font-sans text-xs text-ink-medium mb-3">{{ bNickname.trim() || '对方' }}</p>
                <BaziSmallDisplay :result="result.baziB" />
              </div>
            </div>
          </div>
          </div>
        </template>

        <EntertainmentDisclaimer />
      </div>

      <ScrollTopButton
        v-if="showScrollTop"
        @click="scrollToTop"
        @keydown.enter="scrollToTop"
      />
    </template>
  </ToolPageLayout>
</template>

<style scoped>
.hehun-sidebar {
  padding: 0.75rem;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.sidebar-seal {
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-cinnabar, #C62828);
  color: #FAF0E0;
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.55rem;
  transform: rotate(-3deg);
  border-radius: 2px;
  flex-shrink: 0;
}

.sidebar-title {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.9rem;
  color: var(--color-ink-dark, #2C1810);
  letter-spacing: 0.15em;
}

.sidebar-info {
  padding-left: 0.25rem;
}

.sidebar-name {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.85rem;
  color: var(--color-ink-dark, #2C1810);
  letter-spacing: 0.1em;
  margin-bottom: 0.25rem;
}

.sidebar-dob {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.6rem;
  color: var(--color-ink-light, #8A7A6A);
  line-height: 1.6;
}

/* ── Radio inline ── */
.radio-inline {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.radio-custom {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  padding: 0.3rem 0.75rem;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.72rem;
  color: var(--color-ink-medium, #5A4A3A);
  border: 1px solid rgba(44, 26, 14, 0.08);
  border-radius: 0.375rem;
  background: rgba(250, 240, 224, 0.4);
  transition: all 0.2s;
}

.sr-only:focus-visible + .radio-custom {
  outline: 2px solid var(--color-cinnabar, #C62828);
  outline-offset: 2px;
}

.sr-only:checked + .radio-custom {
  border-color: var(--color-cinnabar, #C62828);
  background: rgba(198, 40, 40, 0.06);
  color: var(--color-cinnabar, #C62828);
}

/* ── Input overrides ── */
.input-label {
  display: block;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.65rem;
  color: var(--color-ink-medium, #5A4A3A);
  letter-spacing: 0.06em;
  margin-bottom: 0.3rem;
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
