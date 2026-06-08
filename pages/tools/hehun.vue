<script setup lang="ts">
import {
  calculateHeHun,
  createPersonInfoFromProfile,
  type HeHunResult,
  type PersonInfo,
} from '~/composables/useHeHun'
import type { FetchError } from '~/types/errors'

const { currentProfile, restoreSession } = useAuth()
const router = useRouter()

import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import HeHunScoreCard from '~/components/tools/hehun/HeHunScoreCard.vue'
import HeHunDimensionCard from '~/components/tools/hehun/HeHunDimensionCard.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import type { HeHunGrade } from '~/constants/hehun'
import BaziSmallDisplay from '~/components/tools/bazi/BaziSmallDisplay.vue'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import MethodologyNote from '~/components/tools/MethodologyNote.vue'
import type { ClassicalSource } from '~/components/tools/MethodologyNote.vue'
import ProfileAutoFillBanner from '~/components/tools/ProfileAutoFillBanner.vue'
const hehunClassical: ClassicalSource[] = [
  { method: '年柱/日柱法', source: '《三命通会》卷七' },
  { method: '纳音五行', source: '《六十甲子纳音表》' },
  { method: '神煞', source: '《协纪辨方书》卷十' },
  { method: '十神规则', source: '《渊海子平》卷二' },
]
const hehunSynthesis = ['维度权重配比', '加减分值', '等级阈值']

useSeoMeta({
  title: '八字合婚 — 玄·道',
  ogTitle: '八字合婚 — 玄·道',
  description: '八字合婚配对分析，从八个维度综合评估双方婚姻匹配度和相处之道。',
  ogDescription: '八字合婚配对分析，从八个维度综合评估双方婚姻匹配度和相处之道。',
  ogType: 'website',
})

const result = ref<HeHunResult | null>(null)
const loading = ref(false)
const missingBirthInfo = ref(false)
const error = ref('')

// ── Person B input ──
const defaultYear = new Date().getFullYear() - 28
const bYear = ref(defaultYear)
const bMonth = ref(6)
const bDay = ref(15)
const bDateStr = ref(`${defaultYear}-06-15`)
const hourOptions = [
  { label: '子时 (23:00-00:59)', value: 23 },
  { label: '丑时 (01:00-02:59)', value: 1 },
  { label: '寅时 (03:00-04:59)', value: 3 },
  { label: '卯时 (05:00-06:59)', value: 5 },
  { label: '辰时 (07:00-08:59)', value: 7 },
  { label: '巳时 (09:00-10:59)', value: 9 },
  { label: '午时 (11:00-12:59)', value: 11 },
  { label: '未时 (13:00-14:59)', value: 13 },
  { label: '申时 (15:00-16:59)', value: 15 },
  { label: '酉时 (17:00-18:59)', value: 17 },
  { label: '戌时 (19:00-20:59)', value: 19 },
  { label: '亥时 (21:00-22:59)', value: 21 },
]
const bHour = ref<number | null>(null)
const bGender = ref<'男' | '女'>('男')
const bCalendar = ref<'solar' | 'lunar'>('solar')
const bNickname = ref('')

// Sync date string ↔ year/month/day
watch(bDateStr, val => {
  const parts = val.split('-')
  if (parts.length === 3) {
    bYear.value = parseInt(parts[0], 10)
    bMonth.value = parseInt(parts[1], 10)
    bDay.value = parseInt(parts[2], 10)
  }
})

const showScrollTop = ref(false)
const resultRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()
const showHistoryModal = ref(false)
const savedDivinationId = ref<number | null>(null)
const saveError = ref<string | null>(null)
const restoreError = ref<string | null>(null)
const restoreErrorTimer = ref<ReturnType<typeof setTimeout> | null>(null)

function handleExport() {
  if (resultRef.value) {
    exportToImage(resultRef.value, '八字合婚.png')
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
  if (!currentProfile.value.birth_date) {
    missingBirthInfo.value = true
    return
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
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
      hour: bHour.value === null ? null : bHour.value,
      gender: bGender.value,
      calendar: bCalendar.value,
      nickname: bNickname.value.trim() || '对方',
    }

    result.value = calculateHeHun({ personA: personA.value, personB })
    saveDivinationResult(result.value)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('合婚计算失败:', e)
    error.value = '合婚计算失败，请检查输入信息'
  } finally {
    loading.value = false
  }
}

async function saveDivinationResult(res: HeHunResult) {
  try {
    const inputData = {
      personB_year: bYear.value,
      personB_month: bMonth.value,
      personB_day: bDay.value,
      personB_nickname: bNickname.value.trim() || '对方',
    }
    const saveRes = await $fetch<{ id: number; created_at: string }>('/api/divinations', {
      method: 'POST',
      body: {
        type: 'hehun',
        input_data: inputData,
        result_data: JSON.parse(JSON.stringify(res)),
      },
    })
    savedDivinationId.value = saveRes.id
    saveError.value = ''
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'statusCode' in e) {
      const code = (e as FetchError).statusCode
      if (code === 429) return
      if (code === 401) return
    }
    // eslint-disable-next-line no-console
    console.error('保存合婚记录失败:', e)
  }
}

async function onHistoryRestore(id: number) {
  showHistoryModal.value = false
  try {
    const record = await $fetch<import('~/server/api/divinations/shared').DivinationDetailResponse>(
      `/api/divinations/${id}`,
    )
    if (
      record.result_data &&
      typeof record.result_data === 'object' &&
      (record.result_data as Record<string, unknown>).totalScore !== undefined
    ) {
      result.value = record.result_data as HeHunResult
      restoreError.value = ''
    } else {
      restoreError.value = '历史记录数据无效'
      if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
      restoreErrorTimer.value = setTimeout(() => {
        restoreError.value = ''
      }, 6000)
    }
  } catch {
    restoreError.value = '历史记录加载失败，请稍后重试'
    if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
    restoreErrorTimer.value = setTimeout(() => {
      restoreError.value = ''
    }, 6000)
  }
}

function dismissRestoreError() {
  restoreError.value = ''
}

// ── Grade presentation ──
const computedGrade = computed<HeHunGrade | null>(() => {
  return result.value?.grade || null
})
</script>

<template>
  <ToolPageLayout>
    <template v-if="!missingBirthInfo" #nav>
      <div class="hehun-sidebar fade-in" :style="{ '--delay': '0s' }">
        <div class="sidebar-header">
          <div class="sidebar-seal" aria-hidden="true">合</div>
          <h3 class="sidebar-title">本人信息</h3>
        </div>
        <div v-if="personA" class="sidebar-info">
          <p class="sidebar-name">{{ currentProfile?.nickname || '我' }}</p>
          <p class="sidebar-dob">{{ personA.year }}年{{ personA.month }}月{{ personA.day }}日</p>
          <p class="sidebar-dob">
            {{ personA.gender }} · {{ personA.calendar === 'solar' ? '公历' : '农历' }}
          </p>
        </div>
        <div v-else class="sidebar-empty">
          <p class="text-xs text-ink-light">
            请先完善<a href="/profile" class="text-cinnabar">个人档案</a>中的出生信息
          </p>
        </div>
      </div>
    </template>

    <h1 class="sr-only">八字合婚</h1>

    <div role="status" class="sr-only" aria-live="polite">
      {{ loading ? '正在计算...' : result ? '结果已就绪' : '' }}
    </div>

    <!-- Missing birth info -->
    <div v-if="missingBirthInfo" class="max-w-[48rem] mx-auto">
      <ProfileAutoFillBanner
        :profile-name="currentProfile?.nickname || ''"
        :is-filled="false"
        :missing-birth="true"
        :profile-id="currentProfile?.id"
      />
    </div>

    <!-- Main content -->
    <template v-else>
      <div class="max-w-[48rem] mx-auto">
        <ToolToolbar :show-history="true" @history="showHistoryModal = true">
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
          <div class="flex items-center justify-between mb-6">
            <div class="section-header !mb-0 flex-1 min-w-0">
              <h2>对方信息</h2>
            </div>
            <MethodologyNote
              tool="八字合婚"
              :classical="hehunClassical"
              :synthesis="hehunSynthesis"
            />
          </div>
          <p class="text-xs text-ink-muted mb-6 tracking-wide">输入对方的出生信息进行合婚分析</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <!-- Date: solar = date picker, lunar = 3 number fields -->
            <template v-if="bCalendar === 'solar'">
              <div class="sm:col-span-2">
                <label for="b-date" class="input-label">出生日期</label>
                <input id="b-date" v-model="bDateStr" type="date" class="input-ink w-full" />
              </div>
            </template>
            <template v-else>
              <div>
                <label for="b-year" class="input-label">出生年份</label>
                <input
                  id="b-year"
                  v-model.number="bYear"
                  type="number"
                  min="1900"
                  max="2100"
                  class="input-ink w-full"
                  placeholder="如 1990"
                />
              </div>
              <div>
                <label for="b-month" class="input-label">出生月份</label>
                <input
                  id="b-month"
                  v-model.number="bMonth"
                  type="number"
                  min="1"
                  max="12"
                  class="input-ink w-full"
                />
              </div>
              <div>
                <label for="b-day" class="input-label">出生日期</label>
                <input
                  id="b-day"
                  v-model.number="bDay"
                  type="number"
                  min="1"
                  max="31"
                  class="input-ink w-full"
                />
              </div>
            </template>
            <!-- Hour -->
            <div>
              <label for="b-hour" class="input-label">出生时辰</label>
              <select id="b-hour" v-model="bHour" class="input-ink w-full">
                <option :value="null">未知</option>
                <option v-for="opt in hourOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <!-- Gender -->
            <div>
              <label class="input-label block mb-2">性别</label>
              <div class="flex gap-4">
                <label class="radio-inline">
                  <input v-model="bGender" type="radio" value="男" class="sr-only" />
                  <span class="radio-custom">男</span>
                </label>
                <label class="radio-inline">
                  <input v-model="bGender" type="radio" value="女" class="sr-only" />
                  <span class="radio-custom">女</span>
                </label>
              </div>
            </div>
            <!-- Calendar -->
            <div>
              <label class="input-label block mb-2">历法</label>
              <div class="flex gap-4">
                <label class="radio-inline">
                  <input v-model="bCalendar" type="radio" value="solar" class="sr-only" />
                  <span class="radio-custom">公历</span>
                </label>
                <label class="radio-inline">
                  <input v-model="bCalendar" type="radio" value="lunar" class="sr-only" />
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
              :disabled="loading"
              class="btn-seal"
              @click="computeHeHun"
              @keydown.enter="computeHeHun"
            >
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

            <div
              class="fade-in mt-6 card-warm rounded-xl p-8 result-summary"
              :style="{
                '--delay': '0.25s',
                borderLeft: '3px solid color-mix(in srgb, var(--color-cinnabar) 30%, transparent)',
                background: 'color-mix(in srgb, var(--color-cinnabar) 4%, var(--color-paper-card))',
              }"
            >
              <div class="section-header">
                <h2>合婚综论</h2>
              </div>
              <p class="font-sans text-sm text-ink-medium leading-relaxed mb-4">
                {{ result.summary }}
              </p>

              <!-- Warnings -->
              <div v-if="result.warnings.length > 0" class="space-y-1.5 mb-4">
                <p class="font-sans text-xs font-medium text-cinnabar mb-1">注意事项</p>
                <p
                  v-for="(w, i) in result.warnings"
                  :key="i"
                  class="font-sans text-xs text-ink-light pl-3 warning-accent"
                >
                  {{ w }}
                </p>
              </div>

              <!-- Suggestions -->
              <div class="space-y-1">
                <p class="font-sans text-xs font-medium mb-1" style="color: var(--color-jade)">
                  建议
                </p>
                <p
                  v-for="(s, i) in result.suggestions"
                  :key="i"
                  class="font-sans text-xs text-ink-light pl-3"
                  style="
                    border-left: 2px solid color-mix(in srgb, var(--color-jade) 30%, transparent);
                  "
                >
                  {{ s }}
                </p>
              </div>
            </div>

            <!-- Dimensions -->
            <div class="mt-6 space-y-4">
              <p class="font-sans text-xs text-ink-muted tracking-wide text-center">维度分析</p>
              <HeHunDimensionCard
                v-for="(dim, i) in result.dimensions"
                :key="dim.name"
                :dim="dim"
                :delay="`${0.3 + i * 0.07}s`"
              />
            </div>

            <!-- 八字对比 -->
            <div class="fade-in mt-6 card-warm rounded-xl p-8" :style="{ '--delay': '0.7s' }">
              <div class="section-header">
                <h2>八字对照</h2>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                <div>
                  <p class="font-sans text-xs text-ink-medium mb-3">
                    {{ currentProfile?.nickname || '本人' }}
                  </p>
                  <BaziSmallDisplay :result="result.baziA" />
                </div>
                <div>
                  <p class="font-sans text-xs text-ink-medium mb-3">
                    {{ bNickname.trim() || '对方' }}
                  </p>
                  <BaziSmallDisplay :result="result.baziB" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Restore error toast -->
      <Transition name="toast">
        <div v-if="restoreError" class="toast-notification" role="alert">
          <span class="toast-notification__mark" aria-hidden="true">!</span>
          <span class="toast-notification__text">{{ restoreError }}</span>
          <button
            class="toast-notification__close"
            aria-label="关闭提示"
            @click="dismissRestoreError"
            @keydown.enter="dismissRestoreError"
            @keydown.space.prevent="dismissRestoreError"
          >
            &times;
          </button>
        </div>
      </Transition>

      <HistoryModal
        :show="showHistoryModal"
        type="hehun"
        @close="showHistoryModal = false"
        @restore="onHistoryRestore"
      />

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
  background: var(--color-cinnabar);
  color: var(--color-paper-lightest);
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.6875rem;
  transform: rotate(-3deg);
  border-radius: 2px;
  flex-shrink: 0;
}

.sidebar-title {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.9rem;
  color: var(--color-ink-dark);
  letter-spacing: 0.15em;
}

.sidebar-info {
  padding-left: 0.25rem;
}

.sidebar-name {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.85rem;
  color: var(--color-ink-dark);
  letter-spacing: 0.1em;
  margin-bottom: 0.25rem;
}

.sidebar-dob {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-light);
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
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-medium);
  border: 1px solid color-mix(in srgb, var(--color-ink-faint) 30%, transparent);
  border-radius: 0.375rem;
  background: color-mix(in srgb, var(--color-paper-lightest) 80%, transparent);
  transition: all 0.2s;
}

.sr-only:focus-visible + .radio-custom {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}

.sr-only:checked + .radio-custom {
  border-color: var(--color-cinnabar);
  background: color-mix(in srgb, var(--color-cinnabar) 6%, transparent);
  color: var(--color-cinnabar);
}

/* ── Input overrides ── */
.input-label {
  display: block;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.06em;
  margin-bottom: 0.3rem;
}

/* ── Animation ── */
.fade-in {
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

.warning-accent {
  border-color: color-mix(in srgb, var(--color-cinnabar) 30%, transparent);
}
</style>
