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
import { calculateNatalChart } from '~/composables/useNatalChart'
import NatalChart from '~/components/tools/constellation/NatalChart.vue'
import type { NatalChartData } from '~/composables/useNatalChart'

useHead({ title: '星座 - 玄学' })

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
const restoreError = ref('')
const restoredFromHistory = ref(false)
const showScrollTop = ref(false)
const expandedCompatIdx = ref<number | null>(null)

function toggleCompat(idx: number) {
  expandedCompatIdx.value = expandedCompatIdx.value === idx ? null : idx
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
  error.value = ''

  const parsed = parseDate(currentProfile.value.birth_date)
  if (!parsed) { error.value = '出生日期格式无效，请修改个人信息'; loading.value = false; return }
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
      month, day, new Date(), year,
      month, day,
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
      month, day, new Date(), birthYear,
      birthMonth, birthDay,
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
      if (code === 429) return // auto-save is best-effort; rate limit is expected
      if (code === 401) return // global interceptor handles logout + redirect
    }
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

        <!-- Error -->
        <div v-else-if="error" class="text-center py-16">
          <p class="font-sans text-base text-cinnabar" role="alert">{{ error }}</p>
          <div class="flex justify-center mt-6">
            <NuxtLink
              :to="`/profile/${currentProfile?.id}`"
              class="btn-cin inline-flex"
            >
              <span>前往编辑档案</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Result -->
        <template v-else-if="result">
          <div class="max-w-[48rem] mx-auto" aria-live="polite" aria-atomic="true">
            <!-- Top toolbar -->
            <ToolToolbar
              :show-history="true"
              @history="showHistoryModal = true"
            />

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

          <!-- ═══ 三垣 · 星盘 ═══ -->
          <div class="fade-in mt-8 mb-6" role="group" aria-labelledby="sanyuan-heading" :style="{ '--delay': '0.15s' }">
            <div class="section-header">
              <h2 id="sanyuan-heading">三垣 · 星盘</h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <!-- ☀ 太阳 — 外在性格 -->
              <div class="card-warm rounded-xl p-5 min-h-[140px] flex flex-col border-t-2 border-jade/15 fade-in" :style="{ '--delay': '0.2s' }">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="text-xl flex-shrink-0" aria-hidden="true">☀</span>
                  <span class="font-display text-base text-ink tracking-wide">太阳 · {{ result.name }}</span>
                </div>
                <span class="text-xs text-ink-light font-sans tracking-wider mb-2">外在性格 · 你展现给世界的样子</span>
                <p class="text-xs sm:text-sm text-ink-medium font-sans leading-relaxed flex-1">{{ result.personality }}</p>
              </div>

              <!-- ☽ 月亮 — 内在情感（有数据） -->
              <div v-if="result.moonSign" class="card-warm rounded-xl p-5 min-h-[140px] flex flex-col border-t-2 border-cinnabar/15 fade-in" :style="{ '--delay': '0.25s' }">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="text-xl flex-shrink-0" aria-hidden="true">☽</span>
                  <span class="font-display text-base text-ink tracking-wide">月亮 · {{ result.moonSign.name }}</span>
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-sans tracking-wider border border-cinnabar/15 text-cinnabar/55 bg-cinnabar/3 ml-auto">本命盘</span>
                </div>
                <span class="text-xs text-ink-light font-sans tracking-wider mb-2">内在情感 · 你真实的情绪底色</span>
                <p class="text-xs sm:text-sm text-ink-medium font-sans leading-relaxed flex-1">{{ result.moonSign.interpretation }}</p>
                <p class="text-[0.6rem] text-ink-light/50 font-sans mt-1.5 leading-relaxed border-t border-ink-faint/20 pt-1.5">
                  ⓘ 基于月球平黄经（±5°精度），边界日期可能偏移
                </p>
              </div>
              <!-- ☽ 月亮（缺数据） -->
              <div v-else class="card-warm rounded-xl p-5 min-h-[140px] flex flex-col items-center justify-center text-center opacity-55 border-t-2 border-cinnabar/10 fade-in" :style="{ '--delay': '0.25s' }">
                <span class="text-xl mb-1" aria-hidden="true">☽</span>
                <span class="font-display text-sm text-ink-light">月亮 · 缺出生年份</span>
                <NuxtLink :to="`/profile/${currentProfile?.id}`" class="text-xs text-cinnabar font-sans underline underline-offset-2 mt-2">编辑档案 → 填写出生年份及日期</NuxtLink>
              </div>

              <!-- ↑ 上升 — 社交面具（有数据） -->
              <div v-if="result.risingSign" class="card-warm rounded-xl p-5 min-h-[140px] flex flex-col border-t-2 border-gold/20 fade-in" :style="{ '--delay': '0.3s' }">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="text-xl flex-shrink-0" aria-hidden="true">↑</span>
                  <span class="font-display text-base text-ink tracking-wide">上升 · {{ result.risingSign.name }}</span>
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[0.6rem] font-sans tracking-wider border border-gold/15 text-gold/55 bg-gold/3 ml-auto">本命盘</span>
                </div>
                <span class="text-xs text-ink-light font-sans tracking-wider mb-2">社交面具 · 你给别人的第一印象</span>
                <p class="text-xs sm:text-sm text-ink-medium font-sans leading-relaxed flex-1">{{ result.risingSign.interpretation }}</p>
                <p class="text-[0.6rem] text-ink-light/50 font-sans mt-1.5 leading-relaxed border-t border-ink-faint/20 pt-1.5">
                  ⓘ 假定中国时区（UTC+8/北纬35°），结果近似
                </p>
              </div>
              <!-- ↑ 上升（缺数据） -->
              <div v-else class="card-warm rounded-xl p-5 min-h-[140px] flex flex-col items-center justify-center text-center opacity-55 border-t-2 border-gold/15 fade-in" :style="{ '--delay': '0.3s' }">
                <span class="text-xl mb-1" aria-hidden="true">↑</span>
                <span class="font-display text-sm text-ink-light">上升 · 缺出生时辰</span>
                <NuxtLink :to="`/profile/${currentProfile?.id}`" class="text-xs text-cinnabar font-sans underline underline-offset-2 mt-2">编辑档案 → 填写出生时辰（子丑寅卯…）</NuxtLink>
              </div>
            </div>

            <!-- 探索模式脚注 -->
            <div v-if="selectedZodiac !== userZodiacIndex" class="text-center mt-3">
              <p class="text-[0.6rem] text-ink-light/45 font-sans tracking-wider">
                ── 月亮与上升基于您的出生数据，不随探索星座改变 ──
              </p>
            </div>
          </div>


          <!-- ═══ 本命星盘 ═══ -->
          <div v-if="natalChartData" class="fade-in mt-8 mb-6" :style="{ '--delay': '0.3s' }">
            <div class="section-header">
              <h2>本命星盘</h2>
            </div>
            <div class="card-warm rounded-xl p-4 sm:p-6 flex justify-center">
              <NatalChart :data="natalChartData" />
            </div>
            <p class="text-center mt-3">
              <span class="text-[0.6rem] text-ink-light/50 font-sans tracking-wider">
                ── 基于出生日期计算，Astrolog 标准布局（Asc 左侧 9 点钟方向）──
              </span>
            </p>
          </div>

          <!-- 缺少出生年份时的提示 -->
          <div v-else-if="!natalChartData && !loading && !error" class="fade-in mt-8 mb-6" :style="{ '--delay': '0.3s' }">
            <div class="section-header">
              <h2>本命星盘</h2>
            </div>
            <div class="card-warm rounded-xl p-8 text-center opacity-65">
              <p class="font-sans text-sm text-ink-medium mb-3">需要出生年份以计算行星位置</p>
              <NuxtLink
                :to="`/profile/${currentProfile?.id}`"
                class="text-xs text-cinnabar font-sans underline underline-offset-2"
              >编辑档案 → 填写完整出生日期</NuxtLink>
            </div>
          </div>
          <p class="text-xs text-ink-medium/90 text-center mt-2 mb-1 tracking-wide">
            今日运势、宜忌速览及星盘解读
          </p>


          <HoroscopePanel :horoscope="result.todayHoroscope" />

          <YiJiPanel :yi="result.todayYi" :ji="result.todayJi" />

          <!-- Compatibility -->
          <div class="fade-in mt-8 mb-6" :style="{ '--delay': '0.45s' }">
            <div class="section-header">
              <h2>速配星座</h2>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                v-for="(item, idx) in result.compatibility"
                :key="item.name"
                class="card-warm rounded-xl p-3 sm:p-4 text-center transition-all duration-300"
                :class="[compatibilityBorderClass(item.level), expandedCompatIdx === idx ? '' : 'cursor-pointer hover:-translate-y-0.5']"
                @click="toggleCompat(idx)"
                @keydown.enter="toggleCompat(idx)"
                tabindex="0"
                role="button"
                :aria-expanded="expandedCompatIdx === idx"
              >
                <div class="text-2xl sm:text-3xl mb-1" aria-hidden="true">{{ item.symbol }}</div>
                <div class="font-display text-base text-ink-dark">{{ item.name }}</div>
                <span
                  class="inline-block mt-1 px-2 py-0.5 rounded text-[0.625rem] font-sans tracking-wider"
                  :class="compatibilityBadgeClass(item.level)"
                >
                  {{ item.label }}
                </span>

                <!-- Accordion explanation -->
                <Transition name="expand">
                  <div
                    v-if="expandedCompatIdx === idx && item.explanation"
                    class="mt-2 pt-2 border-t border-paper-dark/30"
                  >
                    <p
                      class="text-left font-sans text-[0.6rem] text-ink-light leading-relaxed pl-2 border-l-2"
                      :class="item.level === 'great' ? 'border-wuxing-wood/40' : item.level === 'bad' ? 'border-cinnabar/30' : 'border-ink-faint/40'"
                    >
                      {{ item.explanation }}
                    </p>
                  </div>
                </Transition>
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

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 5rem;
  opacity: 1;
}
</style>
