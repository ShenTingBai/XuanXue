<script setup lang="ts">
import { ANIMALS } from '~/constants/bazi'
import {
  calculateShengXiao,
  getAnimalIndex,
  type ShengXiaoResult,
} from '~/composables/useShengXiao'
import { calculateMonthlyFortune, type MonthlyFortuneResult } from '~/composables/useMonthlyFortune'
import { parseDate } from '~/utils/date'
import type { FetchError } from '~/types/errors'

const { currentProfile, restoreSession, getAuthHeaders } = useAuth()
const router = useRouter()

import ShengXiaoHero from '~/components/tools/shengxiao/Hero.vue'
import WuXingGrid from '~/components/tools/shengxiao/WuXingGrid.vue'
import PersonalityCard from '~/components/tools/shengxiao/Personality.vue'
import CompatibilityGrid from '~/components/tools/shengxiao/CompatibilityGrid.vue'
import AnimalNav from '~/components/tools/shengxiao/AnimalNav.vue'
import MonthlyFortune from '~/components/tools/shengxiao/MonthlyFortune.vue'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'

import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import SkeletonBars from '~/components/tools/SkeletonBars.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import FortuneBars from '~/components/tools/FortuneBars.vue'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import TaiSuiMitigation from '~/components/tools/shengxiao/TaiSuiMitigation.vue'
import GuardianBuddha from '~/components/tools/shengxiao/GuardianBuddha.vue'
import InkDivider from '~/components/tools/InkDivider.vue'
import MethodologyNote, { type ClassicalSource } from '~/components/tools/MethodologyNote.vue'
import ProfileAutoFillBanner from '~/components/tools/ProfileAutoFillBanner.vue'
import type { TaiSuiRelation } from '~/constants/tai-sui'
import { getGuardianBuddha } from '~/constants/guardian-buddha'

// ── Methodology data ──
const shengxiaoClassical: ClassicalSource[] = [
  { method: '生肖体系', source: '《三命通会》卷三·论生肖，《论衡·物势篇》十二生肖起源' },
  {
    method: '三合六合六冲六害',
    source: '地支合冲害体系（《三命通会》卷二·地支会合），三合局/六合/六冲/六害/六破',
  },
  { method: '五行属性', source: '《三命通会》卷一·地支藏干，十二地支五行归属' },
  { method: '太岁关系', source: '《协纪辨方书》太岁章，值/冲/刑/害/破五种关系' },
  { method: '本命佛', source: '佛教《佛说大乘无量寿庄严清净平等觉经》，八佛护佑八生肖' },
]
const shengxiaoSynthesis: string[] = [
  '运势评分：基准 65 + 太岁关系(±15~20) + 维度浮动(±8)，压缩至 0-100',
  '解释文本为现代白话转述（非经典原文）',
  '配对评分体现为工程校准值（非《三命通会》直接输出）',
]

useSeoMeta({
  title: '生肖运势 — 玄·道',
  ogTitle: '生肖运势 — 玄·道',
  description: '查看你的生肖性格、五行属性、年度运势和生肖配对，了解你的生肖守护神。',
  ogDescription: '查看你的生肖性格、五行属性、年度运势和生肖配对，了解你的生肖守护神。',
  ogType: 'website',
})

const result = ref<ShengXiaoResult | null>(null)
const monthlyFortune = ref<MonthlyFortuneResult | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const error = ref('')
const selectedAnimal = ref<number | null>(null)
const savedDivinationId = ref<number | null>(null)
const saveError = ref('')
const showHistoryModal = ref(false)
const restoreError = ref('')
const restoreErrorTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const restoredFromHistory = ref(false)
const showScrollTop = ref(false)
const resultRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()

function handleExport() {
  if (resultRef.value) {
    exportToImage(resultRef.value, '生肖运势.png')
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
    loading.value = false
    return
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  computeResult()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
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
  const year = parsed.year
  const calendar = currentProfile.value.birth_calendar || 'solar'

  savedDivinationId.value = null
  saveError.value = ''
  restoredFromHistory.value = false
  restoreError.value = ''

  result.value = calculateShengXiao(year, new Date())
  selectedAnimal.value = getAnimalIndex(year)
  monthlyFortune.value = calculateMonthlyFortune(
    year,
    currentYear.value,
    result.value.earthlyBranch,
    result.value.wuXing,
  )
  saveDivinationResult(result.value, year, calendar)
  loading.value = false
}

function selectAnimal(index: number) {
  if (!currentProfile.value?.birth_date) return
  selectedAnimal.value = index
  loading.value = true
  error.value = ''

  const currentAnimalIdx = getAnimalIndex(currentYear.value)
  const diff = (((currentAnimalIdx - index) % 12) + 12) % 12
  const representativeYear = currentYear.value - diff
  const calendar = currentProfile.value?.birth_calendar || 'solar'

  savedDivinationId.value = null
  saveError.value = ''
  restoredFromHistory.value = false
  restoreError.value = ''

  result.value = calculateShengXiao(representativeYear, new Date())
  monthlyFortune.value = calculateMonthlyFortune(
    representativeYear,
    currentYear.value,
    result.value.earthlyBranch,
    result.value.wuXing,
  )
  saveDivinationResult(result.value, representativeYear, calendar)
  loading.value = false
}

const currentYear = computed(() => new Date().getFullYear())

const primaryRelation = computed<TaiSuiRelation>(() => {
  if (!result.value) return '平'
  const { negative, positive } = result.value.taiSuiRelationships
  return (negative !== '平' ? negative : positive) as TaiSuiRelation
})

const guardianBuddha = computed(() => {
  if (!result.value || selectedAnimal.value === null) return null
  return getGuardianBuddha(selectedAnimal.value) || null
})

const taiSuiLabel = computed(() => {
  if (!result.value) return ''
  const { positive, negative } = result.value.taiSuiRelationships
  if (negative !== '平') return `（${negative}，${positive !== '平' ? positive + '叠加' : ''}）`
  if (positive !== '平') return `（${positive}）`
  return '（平）'
})

const fortuneItems = computed(() => {
  if (!result.value) return []
  const f = result.value.fortune
  return [
    { label: '事业', score: f.career.score },
    { label: '财运', score: f.wealth.score },
    { label: '感情', score: f.love.score },
    { label: '健康', score: f.health.score },
  ]
})

function scrollToAnimalNav() {
  const el = document.querySelector('[data-animal-nav]')
  el?.scrollIntoView({ behavior: 'smooth' })
}

// ── Auto-save ────────────────────────────────────────

async function saveDivinationResult(
  result: ShengXiaoResult,
  representativeYear: number,
  calendar: string,
) {
  try {
    const headers = getAuthHeaders()
    if (headers.Authorization) {
      const inputData = { representativeYear, calendar }
      const saveRes = await $fetch<{ id: number; created_at: string }>('/api/divinations', {
        method: 'POST',
        headers,
        body: {
          type: 'shengxiao',
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

function dismissRestoreError() {
  restoreError.value = ''
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
      if (
        data &&
        typeof data === 'object' &&
        'animal' in data &&
        'wuXing' in data &&
        'fortune' in data
      ) {
        const typedData = data as ShengXiaoResult
        result.value = typedData
        selectedAnimal.value = getAnimalIndex(typedData.year)
        monthlyFortune.value = calculateMonthlyFortune(
          typedData.year,
          currentYear.value,
          typedData.earthlyBranch,
          typedData.wuXing,
        )
        restoreError.value = ''
        restoredFromHistory.value = true
        return
      }
    }
    restoreError.value = '历史记录数据无效'
    if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
    restoreErrorTimer.value = setTimeout(() => {
      restoreError.value = ''
    }, 6000)
  } catch {
    restoreError.value = '历史记录加载失败，请稍后重试'
    if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
    restoreErrorTimer.value = setTimeout(() => {
      restoreError.value = ''
    }, 6000)
  }
}
</script>

<template>
  <ToolPageLayout>
    <template v-if="!missingBirthInfo" #nav>
      <AnimalNav
        v-if="selectedAnimal !== null"
        :current-index="selectedAnimal"
        @select="selectAnimal"
      />
    </template>
    <template #mobile-nav>
      <div data-animal-nav class="flex gap-2 overflow-x-auto px-4 py-2 scroll-hint-x">
        <button
          v-for="(animal, idx) in ANIMALS"
          :key="idx"
          :aria-current="idx === selectedAnimal ? 'true' : undefined"
          :class="[
            'flex-shrink-0 px-3 py-2.5 min-h-[44px] rounded-lg text-sm transition-colors',
            idx === selectedAnimal
              ? 'bg-cinnabar/10 text-cinnabar'
              : 'text-ink-medium hover:bg-paper-medium/50',
          ]"
          @click="selectAnimal(idx)"
          @keydown.enter="selectAnimal(idx)"
          @keydown.space.prevent="selectAnimal(idx)"
        >
          {{ animal }}
        </button>
      </div>
    </template>

    <h1 class="sr-only">生肖排盘</h1>

    <!-- Screen reader status -->
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
      <div class="max-w-[48rem] mx-auto" aria-live="polite" aria-atomic="true">
        <!-- Top toolbar -->
        <ToolToolbar :show-history="true" @history="showHistoryModal = true">
          <template #extra>
            <ExportButton
              v-if="result"
              :target-ref="resultRef"
              filename="生肖运势.png"
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
              <h2>生肖排盘</h2>
            </div>
            <MethodologyNote
              :classical="shengxiaoClassical"
              :synthesis="shengxiaoSynthesis"
              tool="生肖"
            />
          </div>
          <ShengXiaoHero :result="result" />

          <WuXingGrid :result="result" />

          <!-- Four-dimension fortune bars -->
          <div class="fade-in card-warm rounded-xl mt-6 p-8" :style="{ '--delay': '0.2s' }">
            <div class="section-header">
              <h2>{{ result.animal }}年运势总览</h2>
            </div>
            <FortuneBars :items="fortuneItems" />
            <!-- Scoring basis note -->
            <p
              class="mt-4 pt-3 border-t border-ink-faint/15 font-sans text-[0.72rem] text-ink-medium leading-relaxed"
            >
              评分依据：本年太岁关系<span class="font-medium text-ink-dark">{{ taiSuiLabel }}</span
              >，结合命理维度调节。基准 65 分，吉凶关系 ±15~20 分，维度浮动 ±8 分，压缩至 0-100
              区间。
            </p>
          </div>

          <PersonalityCard :result="result" />

          <MonthlyFortune
            v-if="monthlyFortune"
            :result="monthlyFortune"
            :current-year="currentYear"
          />

          <!-- ═══ Scroll-to-Talisman transition ═══ -->
          <InkDivider>敕</InkDivider>

          <!-- 化太岁 -->
          <TaiSuiMitigation
            v-if="result"
            :birth-year="result.year"
            :current-year="currentYear"
            :relation="primaryRelation"
            :positive="result.taiSuiRelationships.positive"
            :negative="result.taiSuiRelationships.negative"
          />

          <CompatibilityGrid :items="result.compatibility" />

          <!-- ═══ Transition to Buddhist section ═══ -->
          <InkDivider>佛</InkDivider>

          <!-- 本命佛 -->
          <div v-if="guardianBuddha" class="mt-2 mb-6">
            <div class="section-header">
              <h2>本命佛</h2>
            </div>
            <GuardianBuddha :buddha="guardianBuddha" />
          </div>
        </div>

        <!-- Restored from history notice -->
        <div v-if="restoredFromHistory" class="flex flex-col items-center gap-2 mt-8">
          <p class="font-sans text-xs text-ink-light">当前显示的是历史记录</p>
          <button
            class="btn-cin"
            @click="computeResult"
            @keydown.enter="computeResult"
            @keydown.space.prevent="computeResult"
          >
            <span>刷新结果</span>
          </button>
        </div>

        <div class="flex flex-wrap gap-3 justify-center mt-8">
          <button
            class="btn-cin"
            @click="scrollToAnimalNav"
            @keydown.enter="scrollToAnimalNav"
            @keydown.space.prevent="scrollToAnimalNav"
          >
            <span>切换生肖</span>
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
      </div>

      <ScrollTopButton v-if="showScrollTop" @click="scrollToTop" @keydown.enter="scrollToTop" />
    </template>
  </ToolPageLayout>

  <HistoryModal
    :show="showHistoryModal"
    type="shengxiao"
    @close="showHistoryModal = false"
    @restore="onHistoryRestore"
  />
</template>
