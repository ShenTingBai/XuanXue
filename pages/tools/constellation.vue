<script setup lang="ts">
import {
  calculateConstellation,
  getZodiacIndex,
  ZODIACS,
  type ConstellationResult,
} from '~/composables/useConstellation'
import { parseDate } from '~/utils/date'
import type { FetchError } from '~/types/errors'

const { currentProfile, restoreSession, getAuthHeaders } = useAuth()
const router = useRouter()

import ConstellationHero from '~/components/tools/constellation/Hero.vue'
import ConstellationAttributes from '~/components/tools/constellation/ConstellationAttributes.vue'
import ThreeLuminaries from '~/components/tools/constellation/ThreeLuminaries.vue'
import ConstellationCompatibility from '~/components/tools/constellation/ConstellationCompatibility.vue'
import HoroscopePanel from '~/components/tools/constellation/HoroscopePanel.vue'
import YiJiPanel from '~/components/tools/constellation/YiJiPanel.vue'
import ConstellationNav from '~/components/tools/constellation/Nav.vue'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import SkeletonBars from '~/components/tools/SkeletonBars.vue'
import { calculateNatalChart, serializeNatalChart } from '~/composables/useNatalChart'
import NatalChart from '~/components/tools/constellation/NatalChart.vue'
import NatalChartGuide from '~/components/tools/constellation/NatalChartGuide.vue'
import type { NatalChartData } from '~/composables/useNatalChart'
import MethodologyNote, { type ClassicalSource } from '~/components/tools/MethodologyNote.vue'

// ── Methodology data ──
const constellationClassical: ClassicalSource[] = [
  { method: '黄道十二宫', source: 'Ptolemy《Tetrabiblos》（公元2世纪），现代西方占星学基础体系' },
  { method: '四元素分类', source: '古希腊元素体系（Empedocles），火土风水四元素与星座性格关联' },
  {
    method: '守护星体系',
    source: '传统占星学行星守护体系，日/月/金/水/火/木/土/天/海/冥十星配十二宫',
  },
  {
    method: '三光（日月上升）',
    source: 'Astrolog 标准布局，Asc 左侧 9 点钟方向，日月上升三光解读',
  },
  { method: '星盘计算', source: 'astronomy-engine v2.1.19 计算行星真实位置（VSOP87 理论）' },
]
const constellationSynthesis: string[] = [
  '配对相容性为元素相容理论工程简化（great/good/bad 三级）',
  '今日运势 + 宜忌为模板拼接（非占星学日月运行实时推演）',
  '解释文本为现代白话转述（非 Ptolemy 原文）',
]

useSeoMeta({
  title: '星座星盘 — 玄·道',
  ogTitle: '星座星盘 — 玄·道',
  description: '探索你的星座特征、今日运势、星盘轨迹和缘分匹配，发现星空下的你。',
  ogDescription: '探索你的星座特征、今日运势、星盘轨迹和缘分匹配，发现星空下的你。',
  ogType: 'website',
})

const result = ref<ConstellationResult | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const error = ref('')
const selectedZodiac = ref(0)
/** The user's actual birth zodiac index — immutable by exploration */
const userZodiacIndex = ref(0)
const savedDivinationId = ref<number | null>(null)
const showHistoryModal = ref(false)
const saveError = ref('')
const natalChartData = ref<NatalChartData | null>(null)
const chartTextCopied = ref(false)
const chartTextTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const restoreError = ref('')
const restoreErrorTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const restoredFromHistory = ref(false)
const showScrollTop = ref(false)
const resultRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()

async function copyChartText() {
  if (!natalChartData.value) return
  const text = serializeNatalChart(natalChartData.value)
  await navigator.clipboard.writeText(text)
  chartTextCopied.value = true
  if (chartTextTimer.value) clearTimeout(chartTextTimer.value)
  chartTextTimer.value = setTimeout(() => {
    chartTextCopied.value = false
  }, 2000)
}

function handleExport() {
  if (resultRef.value) {
    exportToImage(resultRef.value, '星座星盘.png')
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

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }

  if (!currentProfile.value.birth_date) {
    missingBirthInfo.value = true
    loading.value = false
    return
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  computeResult()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
  if (chartTextTimer.value) clearTimeout(chartTextTimer.value)
})

function computeResult() {
  if (!currentProfile.value?.birth_date) return
  loading.value = true
  error.value = ''

  const parsed = parseDate(currentProfile.value.birth_date)
  if (!parsed) {
    error.value = '出生日期格式无效，请修改个人信息'
    loading.value = false
    return
  }
  const { year, month, day } = parsed

  savedDivinationId.value = null
  saveError.value = ''

  // 计算本命星盘（仅在首次加载时，使用真实出生数据）
  if (!natalChartData.value && currentProfile.value?.birth_date) {
    const parsedBirth = parseDate(currentProfile.value.birth_date)
    if (parsedBirth) {
      natalChartData.value = calculateNatalChart(
        parsedBirth.year,
        parsedBirth.month,
        parsedBirth.day,
        currentProfile.value?.birth_hour ?? null,
        currentProfile.value?.birth_minute ?? null,
      )
    }
  }
  restoreError.value = ''
  restoredFromHistory.value = false

  try {
    result.value = calculateConstellation(
      month,
      day,
      new Date(),
      year,
      month,
      day,
      currentProfile.value?.birth_hour,
      currentProfile.value?.birth_minute,
    )
    userZodiacIndex.value = getZodiacIndex(month, day)
    selectedZodiac.value = userZodiacIndex.value
    saveDivinationResult(result.value, month, day)
  } catch {
    error.value = '计算星座出错，请稍后重试'
  }
  loading.value = false
}

function selectZodiac(index: number) {
  selectedZodiac.value = index
  loading.value = true
  error.value = ''

  const month = ZODIACS[index].startMonth
  const day = ZODIACS[index].startDay
  // Parse actual birth date for natal moon/rising sign (never re-derive from exploration date)
  const parsedBirth = currentProfile.value?.birth_date
    ? parseDate(currentProfile.value.birth_date)
    : undefined
  const birthYear = parsedBirth?.year
  const birthMonth = parsedBirth?.month
  const birthDay = parsedBirth?.day

  savedDivinationId.value = null
  saveError.value = ''
  restoreError.value = ''
  restoredFromHistory.value = false

  try {
    result.value = calculateConstellation(
      month,
      day,
      new Date(),
      birthYear,
      birthMonth,
      birthDay,
      currentProfile.value?.birth_hour,
      currentProfile.value?.birth_minute,
    )
    saveDivinationResult(result.value, month, day)
  } catch {
    error.value = '计算星座出错，请稍后重试'
  }
  loading.value = false
}

const zodiacShortNames = ZODIACS.map(z => z.name.slice(0, 2))

// ── Auto-save & History ────────────────────────────────────────

async function saveDivinationResult(result: ConstellationResult, month: number, day: number) {
  try {
    const headers = getAuthHeaders()
    if (headers.Authorization) {
      const inputData = { month, day }
      const saveRes = await $fetch<{ id: number; created_at: string }>('/api/divinations', {
        method: 'POST',
        headers,
        body: {
          type: 'constellation',
          input_data: inputData,
          result_data: JSON.parse(JSON.stringify(result)),
        },
      })
      savedDivinationId.value = saveRes.id
      saveError.value = ''
    }
  } catch (e: unknown) {
    // 429 handled globally by auth-interceptor; 401 redirects there too
    if (e && typeof e === 'object' && 'statusCode' in e) {
      const code = (e as FetchError).statusCode
      if (code === 429) return // auto-save is best-effort; rate limit is expected
      if (code === 401) return // global interceptor handles logout + redirect
    }
    // eslint-disable-next-line no-console
    console.error('保存历史记录失败:', e)
  }
}

function onHistoryRestore(id: number) {
  showHistoryModal.value = false
  restoreFromHistory(id)
}

async function restoreFromHistory(id: number) {
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const record = await $fetch<import('~/server/api/divinations/shared').DivinationDetailResponse>(
      `/api/divinations/${id}`,
      { headers },
    )
    if (record.result_data) {
      const data = record.result_data
      if (data && typeof data === 'object' && 'todayHoroscope' in data && 'symbol' in data) {
        result.value = data as ConstellationResult
      } else {
        restoreError.value = '历史记录数据无效'
        if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
        restoreErrorTimer.value = setTimeout(() => {
          restoreError.value = ''
        }, 6000)
        return
      }
    }
    restoreError.value = ''
    restoredFromHistory.value = true
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

function scrollToConstellationNav() {
  const el = document.querySelector('[data-constellation-nav]')
  el?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <ToolPageLayout>
    <template #nav>
      <ConstellationNav :current-index="selectedZodiac" @select="selectZodiac" />
    </template>
    <template #mobile-nav>
      <div data-constellation-nav class="flex gap-2 overflow-x-auto pb-2 scroll-hint-x">
        <button
          v-for="(name, idx) in zodiacShortNames"
          :key="idx"
          :aria-current="idx === selectedZodiac ? 'true' : undefined"
          :class="[
            'flex-shrink-0 px-3 py-2.5 min-h-[44px] rounded-lg text-sm transition-colors',
            idx === selectedZodiac
              ? 'bg-cinnabar/10 text-cinnabar'
              : 'text-ink-medium hover:bg-paper-medium/50',
          ]"
          @click="selectZodiac(idx)"
          @keydown.space.prevent="selectZodiac(idx)"
        >
          {{ name }}
        </button>
      </div>
    </template>

    <h1 class="sr-only">星座分析</h1>

    <!-- Screen reader status -->
    <div role="status" class="sr-only" aria-live="polite">
      {{ loading ? '正在计算...' : result ? '结果已就绪' : '' }}
    </div>

    <!-- Missing birth info -->
    <div v-if="missingBirthInfo" class="text-center py-16">
      <p class="font-sans text-lg text-ink-medium mb-4">请先完善出生信息</p>
      <p class="font-sans text-sm text-ink-light mb-6">需要填写出生日期以计算星座运势</p>
      <NuxtLink :to="`/profile/${currentProfile?.id}`" class="btn-cin inline-flex">
        <span>前往编辑档案</span>
      </NuxtLink>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="space-y-6" aria-busy="true" aria-live="polite">
      <span class="sr-only">正在加载...</span>
      <SkeletonCard />
      <SkeletonBars />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <p class="font-sans text-base text-cinnabar" role="alert">{{ error }}</p>
      <div class="flex justify-center mt-6">
        <NuxtLink :to="`/profile/${currentProfile?.id}`" class="btn-cin inline-flex">
          <span>前往编辑档案</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Result -->
    <template v-else-if="result">
      <Transition name="content-fade" mode="out-in">
        <div
          :key="selectedZodiac"
          class="max-w-[48rem] mx-auto"
          aria-live="polite"
          aria-atomic="true"
        >
          <!-- Top toolbar -->
          <ToolToolbar :show-history="true" @history="showHistoryModal = true">
            <template #extra>
              <ExportButton
                v-if="result"
                :target-ref="resultRef"
                filename="星座星盘.png"
                :is-exporting="isExporting"
                @export="handleExport"
              />
            </template>
          </ToolToolbar>

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
          <div ref="resultRef">
            <!-- ── 方法论溯源 ── -->
            <div class="flex items-center justify-between mb-6">
              <div class="section-header !mb-0 flex-1 min-w-0">
                <h2>星座分析</h2>
              </div>
              <MethodologyNote
                :classical="constellationClassical"
                :synthesis="constellationSynthesis"
                tool="星座"
              />
            </div>
            <ConstellationHero :result="result" />

            <ConstellationAttributes :result="result" />

            <ThreeLuminaries
              :result="result"
              :selected-zodiac="selectedZodiac"
              :user-zodiac-index="userZodiacIndex"
            />

            <!-- ═══ 本命星盘 ═══ -->
            <div v-if="natalChartData" class="fade-in mt-8 mb-6" :style="{ '--delay': '0.3s' }">
              <div class="section-header">
                <h2>本命星盘</h2>
              </div>
              <div class="card-warm rounded-xl p-4 sm:p-6 flex justify-center">
                <NatalChart :data="natalChartData" />
              </div>
              <p class="text-center mt-3">
                <span class="text-xs text-ink-medium font-sans tracking-wider">
                  ── 基于出生日期计算，Astrolog 标准布局（Asc 左侧 9 点钟方向）──
                </span>
              </p>
              <div class="flex justify-center mt-2">
                <button
                  class="text-sm text-ink-medium border border-ink-faint/20 rounded px-3 py-1.5 hover:border-cinnabar/30 hover:text-cinnabar transition-colors"
                  :aria-label="chartTextCopied ? '已复制' : '复制星盘文本，可粘贴给 AI 解读'"
                  @click="copyChartText"
                  @keydown.enter="copyChartText"
                >
                  <span v-if="chartTextCopied">✓ 已复制</span>
                  <span v-else>📋 复制星盘文本</span>
                </button>
              </div>

              <NatalChartGuide v-if="result" :data="natalChartData" :result="result" />
            </div>

            <!-- 缺少出生年份时的提示 -->
            <div
              v-else-if="!natalChartData && !loading && !error"
              class="fade-in mt-8 mb-6"
              :style="{ '--delay': '0.3s' }"
            >
              <div class="section-header">
                <h2>本命星盘</h2>
              </div>
              <div class="card-warm rounded-xl p-8 text-center opacity-65">
                <p class="font-sans text-sm text-ink-medium mb-3">需要出生年份以计算行星位置</p>
                <NuxtLink
                  :to="`/profile/${currentProfile?.id}`"
                  class="text-xs text-cinnabar font-sans underline underline-offset-2"
                >
                  编辑档案 → 填写完整出生日期
                </NuxtLink>
              </div>
            </div>
            <div class="divider-ink mt-8 mb-6" role="separator" />

            <HoroscopePanel :horoscope="result.todayHoroscope" />

            <YiJiPanel :yi="result.todayYi" :ji="result.todayJi" />

            <ConstellationCompatibility :items="result.compatibility" />
          </div>

          <!-- Restored from history -->
          <div v-if="restoredFromHistory" class="flex flex-col items-center gap-2 mt-8">
            <p class="font-sans text-xs text-ink-light">当前显示的是历史记录</p>
            <button
              class="btn-cin"
              @click="computeResult"
              @keydown.enter="computeResult"
              @keydown.space.prevent="computeResult"
            >
              <span>刷新运势</span>
            </button>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-wrap gap-3 justify-center my-8">
            <button
              class="btn-cin"
              @click="scrollToConstellationNav"
              @keydown.space.prevent="scrollToConstellationNav"
            >
              <span>切换星座</span>
            </button>
            <button
              class="btn-cin"
              aria-haspopup="dialog"
              @click="showHistoryModal = true"
              @keydown.enter="showHistoryModal = true"
              @keydown.space.prevent="showHistoryModal = true"
            >
              <span>浏览历史</span>
            </button>
          </div>

          <HistoryModal
            :show="showHistoryModal"
            type="constellation"
            @close="showHistoryModal = false"
            @restore="onHistoryRestore"
          />
        </div>
      </Transition>

      <ScrollTopButton v-if="showScrollTop" @click="scrollToTop" @keydown.enter="scrollToTop" />
    </template>
  </ToolPageLayout>
</template>

<style scoped>
.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.25s ease;
}
.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}
</style>
