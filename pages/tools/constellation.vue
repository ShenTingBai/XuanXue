<script setup lang="ts">

import { calculateConstellation, getZodiacIndex, ZODIACS, type ConstellationResult } from '~/composables/useConstellation'
import { parseDate } from '~/utils/date'

const { currentProfile, restoreSession, getAuthHeaders } = useAuth()
const router = useRouter()

import ConstellationHero from '~/components/tools/constellation/Hero.vue'
import HoroscopePanel from '~/components/tools/constellation/HoroscopePanel.vue'
import YiJiPanel from '~/components/tools/constellation/YiJiPanel.vue'
import ConstellationNav from '~/components/tools/constellation/Nav.vue'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import EntertainmentDisclaimer from '~/components/tools/EntertainmentDisclaimer.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import SkeletonBars from '~/components/tools/SkeletonBars.vue'

useHead({ title: '星座 - 玄学' })

const result = ref<ConstellationResult | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const selectedZodiac = ref(0)
const savedDivinationId = ref<number | null>(null)
const showHistoryModal = ref(false)
const saveError = ref('')
const showSaveErrorToast = ref(false)
const restoreError = ref('')
const restoredFromHistory = ref(false)
const showScrollTop = ref(false)

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
    loading.value = false
    return
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  computeResult()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

function computeResult() {
  if (!currentProfile.value?.birth_date) return
  loading.value = true

  const parsed = parseDate(currentProfile.value.birth_date)
  if (!parsed) { loading.value = false; return }
  const { month, day } = parsed

  savedDivinationId.value = null
  saveError.value = ''
  showSaveErrorToast.value = false
  restoreError.value = ''
  restoredFromHistory.value = false

  result.value = calculateConstellation(month, day, new Date())
  selectedZodiac.value = getZodiacIndex(month, day)
  saveDivinationResult(result.value, month, day)
  loading.value = false
}

function selectZodiac(index: number) {
  selectedZodiac.value = index
  loading.value = true

  const month = ZODIACS[index].startMonth
  const day = ZODIACS[index].startDay

  savedDivinationId.value = null
  saveError.value = ''
  showSaveErrorToast.value = false
  restoreError.value = ''
  restoredFromHistory.value = false

  result.value = calculateConstellation(month, day, new Date())
  saveDivinationResult(result.value, month, day)
  loading.value = false
}

const zodiacShortNames = ZODIACS.map(z => z.name.slice(0, 2))

function compatibilityBadgeClass(level: string): string {
  return level === 'great'
    ? 'bg-wuxing-wood/10 text-wuxing-wood'
    : level === 'good'
      ? 'bg-gold/10 text-gold'
      : 'bg-cinnabar/5 text-cinnabar/80'
}

function compatibilityBorderClass(level: string): string {
  return level === 'great'
    ? 'hover:border-jade'
    : level === 'good'
      ? 'hover:border-gold'
      : 'hover:border-cinnabar/30'
}

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
      const code = (e as any).statusCode
      if (code === 429) {
        saveError.value = '操作太频繁了，歇一会儿再试试吧'
        showSaveErrorToast.value = true
        return
      }
      if (code === 401) return // global interceptor handles logout + redirect
    }
    saveError.value = '保存失败，请稍后再试'
    showSaveErrorToast.value = true
  }
}

function dismissSaveErrorToast() {
  showSaveErrorToast.value = false
}


function onHistoryRestore(id: number) {
  showHistoryModal.value = false
  restoreFromHistory(id)
}

async function restoreFromHistory(id: number) {
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const record = await $fetch<import('~/types/api/divination').DivinationDetailResponse>(
      `/api/divinations/${id}`,
      { headers },
    )
    if (record.result_data) {
      const data = record.result_data
      if (data && typeof data === 'object' && 'todayHoroscope' in data && 'symbol' in data) {
        result.value = data as ConstellationResult
      } else {
        restoreError.value = '历史记录数据无效'
        return
      }
    }
    restoreError.value = ''
    restoredFromHistory.value = true
  } catch {
    restoreError.value = '历史记录加载失败，请稍后重试'
  }
}

function dismissRestoreError() {
  restoreError.value = ''
}
</script>

<template>
      <ToolPageLayout>
        <template #nav>
          <ConstellationNav
            :currentIndex="selectedZodiac"
            @select="selectZodiac"
          />
        </template>
        <template #mobile-nav>
          <button
            v-for="(name, idx) in zodiacShortNames"
            :key="idx"
            @click="selectZodiac(idx)"
            @keydown.space.prevent="selectZodiac(idx)"
            :aria-current="idx === selectedZodiac ? 'true' : undefined"
            :class="[
              'flex-shrink-0 px-3 py-2.5 min-h-[44px] rounded-lg text-sm transition-colors',
              idx === selectedZodiac ? 'bg-cinnabar/10 text-cinnabar' : 'text-ink-medium hover:bg-paper-medium/50',
            ]"
          >
            {{ name }}
          </button>
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
          <NuxtLink
            :to="`/profile/${currentProfile?.id}`"
            class="btn-cin inline-flex"
          >
            <span>前往编辑档案</span>
          </NuxtLink>
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="loading" class="space-y-6" aria-busy="true" aria-live="polite">
          <span class="sr-only">正在加载...</span>
          <SkeletonCard />
          <SkeletonBars />
        </div>

        <!-- Result -->
        <template v-else-if="result">
          <div class="max-w-[48rem] mx-auto" aria-live="polite" aria-atomic="true">
            <!-- Top toolbar -->
            <ToolToolbar
              :show-history="true"
              @history="showHistoryModal = true"
            />

            <!-- Save error toast -->
            <Transition name="toast">
              <div
                v-if="showSaveErrorToast"
                class="toast-notification"
                role="alert"
              >
                <span class="toast-notification__mark" aria-hidden="true">!</span>
                <span class="toast-notification__text">{{ saveError }}</span>
                <button
                  @click="dismissSaveErrorToast"
                  @keydown.enter="dismissSaveErrorToast"
                  @keydown.space.prevent="dismissSaveErrorToast"
                  class="toast-notification__close"
                  aria-label="关闭提示"
                >&times;</button>
              </div>
            </Transition>

            <!-- Restore error toast -->
            <Transition name="toast">
              <div
                v-if="restoreError"
                class="toast-notification"
                role="alert"
              >
                <span class="toast-notification__mark" aria-hidden="true">!</span>
                <span class="toast-notification__text">{{ restoreError }}</span>
                <button
                  @click="dismissRestoreError"
                  @keydown.enter="dismissRestoreError"
                  @keydown.space.prevent="dismissRestoreError"
                  class="toast-notification__close"
                  aria-label="关闭提示"
                >&times;</button>
              </div>
            </Transition>
          <ConstellationHero :result="result" />

          <p class="text-xs text-ink-light/80 text-center mt-2 mb-1 tracking-wide">
            今日运势、宜忌速览及星座性格特征
          </p>


          <HoroscopePanel :horoscope="result.todayHoroscope" />

          <YiJiPanel :yi="result.todayYi" :ji="result.todayJi" />

          <!-- Personality -->
          <div class="fade-in mt-8 mb-6" :style="{ '--delay': '0.35s' }">
            <div class="section-header">
              <h2>性格特征</h2>
            </div>
            <div class="card-warm rounded-xl p-5">
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                {{ result.personality }}
              </p>
            </div>
          </div>

          <!-- Compatibility -->
          <div class="fade-in mt-8 mb-6" :style="{ '--delay': '0.45s' }">
            <div class="section-header">
              <h2>速配星座</h2>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                v-for="item in result.compatibility"
                :key="item.name"
                class="card-warm rounded-xl p-3 sm:p-4 text-center transition-all duration-300 cursor-default hover:-translate-y-0.5"
                :class="compatibilityBorderClass(item.level)"
                :title="item.label"
              >
                <div class="text-2xl sm:text-3xl mb-1" aria-hidden="true">{{ item.symbol }}</div>
                <div class="font-display text-base text-ink-dark">{{ item.name }}</div>
                <span
                  class="inline-block mt-1 px-2 py-0.5 rounded text-[0.625rem] font-sans tracking-wider"
                  :class="compatibilityBadgeClass(item.level)"
                >
                  {{ item.label }}
                </span>
              </div>
            </div>
          </div>

          <!-- Restored from history -->
          <div v-if="restoredFromHistory" class="flex flex-col items-center gap-2 mt-8">
            <p class="font-sans text-xs text-ink-light">当前显示的是历史记录</p>
            <button
              @click="computeResult"
              @keydown.enter="computeResult"
              @keydown.space.prevent="computeResult"
              class="btn-cin"
            >
              <span>刷新运势</span>
            </button>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-wrap gap-3 justify-center my-8">
            <button
              @click="showHistoryModal = true"
              @keydown.enter="showHistoryModal = true"
              @keydown.space.prevent="showHistoryModal = true"
              class="btn-cin"
              aria-haspopup="dialog"
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
