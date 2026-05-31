<script setup lang="ts">

import { calculateShengXiao, getAnimalIndex, type ShengXiaoResult } from '~/composables/useShengXiao'
import { parseDate } from '~/utils/date'

const { currentProfile, restoreSession, getAuthHeaders } = useAuth()
const router = useRouter()

import ShengXiaoHero from '~/components/tools/shengxiao/Hero.vue'
import WuXingGrid from '~/components/tools/shengxiao/WuXingGrid.vue'
import PersonalityCard from '~/components/tools/shengxiao/Personality.vue'
import CompatibilityGrid from '~/components/tools/shengxiao/CompatibilityGrid.vue'
import AnimalNav from '~/components/tools/shengxiao/AnimalNav.vue'
import FortuneBars from '~/components/tools/FortuneBars.vue'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'

import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import SkeletonBars from '~/components/tools/SkeletonBars.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import EntertainmentDisclaimer from '~/components/tools/EntertainmentDisclaimer.vue'

useHead({ title: '生肖 - 玄学' })

const result = ref<ShengXiaoResult | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const selectedAnimal = ref<number | null>(null)
const savedDivinationId = ref<number | null>(null)
const saveError = ref('')
const showSaveErrorToast = ref(false)
const showHistoryModal = ref(false)
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
  const year = parsed.year
  const calendar = currentProfile.value.birth_calendar || 'solar'

  savedDivinationId.value = null
  saveError.value = ''
  showSaveErrorToast.value = false

  result.value = calculateShengXiao(year, new Date())
  selectedAnimal.value = getAnimalIndex(year)
  saveDivinationResult(result.value, year, calendar)
  loading.value = false
}

function selectAnimal(index: number) {
  if (!currentProfile.value?.birth_date) return
  selectedAnimal.value = index
  loading.value = true

  const currentYear = new Date().getFullYear()
  const currentAnimalIdx = getAnimalIndex(currentYear)
  const diff = ((currentAnimalIdx - index) % 12 + 12) % 12
  const representativeYear = currentYear - diff
  const calendar = currentProfile.value?.birth_calendar || 'solar'

  savedDivinationId.value = null
  saveError.value = ''
  showSaveErrorToast.value = false

  result.value = calculateShengXiao(representativeYear, new Date())
  saveDivinationResult(result.value, representativeYear, calendar)
  loading.value = false
}

const currentYear = computed(() => new Date().getFullYear())

function scrollToAnimalNav() {
  const el = document.querySelector('[data-animal-nav]')
  el?.scrollIntoView({ behavior: 'smooth' })
}

// ── Auto-save ────────────────────────────────────────

async function saveDivinationResult(result: ShengXiaoResult, representativeYear: number, calendar: string) {
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
    saveError.value = e instanceof Error ? e.message : '保存失败'
    savedDivinationId.value = null
    showSaveErrorToast.value = true
  }
}

function dismissSaveErrorToast() {
  showSaveErrorToast.value = false
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
    const record = await $fetch<import('~/types/api/divination').DivinationDetailResponse>(
      `/api/divinations/${id}`,
      { headers },
    )
    if (record.result_data) {
      const data = record.result_data
      if (data && typeof data === 'object' && 'animal' in data && 'wuXing' in data && 'fortune' in data) {
        const typedData = data as ShengXiaoResult
        result.value = typedData
        selectedAnimal.value = getAnimalIndex(typedData.year)
        restoreError.value = ''
        restoredFromHistory.value = true
        return
      }
    }
    restoreError.value = '历史记录数据无效'
  } catch {
    restoreError.value = '历史记录加载失败，请稍后重试'
  }
}

</script>

<template>
      <ToolPageLayout>
        <template #nav>
          <AnimalNav
            v-if="selectedAnimal !== null"
            :currentIndex="selectedAnimal"
            @select="selectAnimal"
          />
        </template>
        <template #mobile-nav>
          <div data-animal-nav class="flex gap-2 overflow-x-auto px-4 py-2">
            <button
              v-for="(animal, idx) in ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']"
              :key="idx"
              @click="selectAnimal(idx)"
              @keydown.space.prevent="selectAnimal(idx)"
              :aria-current="idx === selectedAnimal ? 'true' : undefined"
              :class="[
                'flex-shrink-0 px-3 py-2.5 min-h-[44px] rounded-lg text-sm transition-colors',
                idx === selectedAnimal ? 'bg-cinnabar/10 text-cinnabar' : 'text-ink-medium hover:bg-paper-medium/50',
              ]"
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
        <div v-if="missingBirthInfo" class="text-center py-16">
          <p class="font-sans text-lg text-ink-medium mb-4">请先完善出生信息</p>
          <p class="font-sans text-sm text-ink-light mb-6">需要填写出生日期以计算生肖排盘</p>
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
                class="mb-4 px-4 py-2.5 rounded-lg bg-cinnabar/5 border border-cinnabar/15 text-cinnabar text-sm flex items-center justify-between"
                role="alert"
              >
                <span>{{ saveError }}</span>
                <button
                  @click="dismissSaveErrorToast"
                  @keydown.enter="dismissSaveErrorToast"
                  @keydown.space.prevent="dismissSaveErrorToast"
                  class="ml-3 px-2 py-2 text-cinnabar/60 hover:text-cinnabar transition-colors text-lg leading-none"
                  aria-label="关闭提示"
                >&times;</button>
              </div>
            </Transition>

            <!-- Restore error toast -->
            <Transition name="toast">
              <div
                v-if="restoreError"
                class="mb-4 px-4 py-2.5 rounded-lg bg-cinnabar/5 border border-cinnabar/15 text-cinnabar text-sm flex items-center justify-between"
                role="alert"
              >
                <span>{{ restoreError }}</span>
                <button
                  @click="dismissRestoreError"
                  @keydown.enter="dismissRestoreError"
                  @keydown.space.prevent="dismissRestoreError"
                  class="ml-3 px-2 py-2 text-cinnabar/60 hover:text-cinnabar transition-colors text-lg leading-none"
                  aria-label="关闭提示"
                >&times;</button>
              </div>
            </Transition>

          <ShengXiaoHero :result="result" />

          <p class="text-xs text-ink-light/60 text-center mt-2 mb-1 tracking-wide">
            下方依次为五行属性、性格特征、幸运信息、流年运势和相性配对
          </p>

          <WuXingGrid :result="result" />

          <!-- Lucky information -->
          <div class="fade-in card-warm rounded-xl mt-6" :style="{ '--delay': '0.25s' }">
            <div class="section-header section-header--tool">
              <span class="bar" aria-hidden="true"></span>
              <span class="seal-icon text-[9px] w-7 h-7" aria-hidden="true">幸</span>
              <h2>幸运信息</h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-8">
              <div>
                <h4 class="font-sans text-ink-medium text-sm mb-2">幸运数字</h4>
                <p class="font-sans text-ink-dark text-lg">{{ result.lucky.numbers.join('、') }}</p>
              </div>
              <div>
                <h4 class="font-sans text-ink-medium text-sm mb-2">幸运颜色</h4>
                <p class="font-sans text-ink-dark text-lg">{{ result.lucky.colors.join('、') }}</p>
              </div>
              <div>
                <h4 class="font-sans text-ink-medium text-sm mb-2">幸运方位</h4>
                <p class="font-sans text-ink-dark text-lg">{{ result.lucky.direction }}</p>
              </div>
            </div>
          </div>

          <PersonalityCard :result="result" />

          <div class="fade-in card-warm rounded-xl mt-6" :style="{ '--delay': '0.35s' }">
            <div class="section-header section-header--tool">
              <span class="bar" aria-hidden="true"></span>
              <span class="seal-icon text-[9px] w-7 h-7" aria-hidden="true">年</span>
              <h2>{{ currentYear }}年流年运势</h2>
            </div>
            <div class="p-8">
              <FortuneBars
                :items="[
                  { label: '事业', score: result.fortune.career.score },
                  { label: '财运', score: result.fortune.wealth.score },
                  { label: '感情', score: result.fortune.love.score },
                  { label: '健康', score: result.fortune.health.score },
                ]"
              />
            </div>
          </div>

          <CompatibilityGrid :items="result.compatibility" />

          <!-- Restored from history notice -->
          <div v-if="restoredFromHistory" class="flex flex-col items-center gap-2 mt-8">
            <p class="font-sans text-xs text-ink-light">当前显示的是历史记录</p>
            <button
              @click="computeResult"
              @keydown.enter="computeResult"
              @keydown.space.prevent="computeResult"
              class="btn-cin"
            >
              <span>刷新结果</span>
            </button>
          </div>

          <div class="flex flex-wrap gap-3 justify-center mt-8">
            <button
              @click="scrollToAnimalNav"
              @keydown.space.prevent="scrollToAnimalNav"
              class="btn-cin"
            >
              <span>切换生肖</span>
            </button>
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

          </div>

          <EntertainmentDisclaimer />

          <ScrollTopButton
            v-if="showScrollTop"
            @click="scrollToTop"
            @keydown.enter="scrollToTop"
          />
        </template>
      </ToolPageLayout>

  <HistoryModal
    :show="showHistoryModal"
    type="shengxiao"
    @close="showHistoryModal = false"
    @restore="onHistoryRestore"
  />
</template>
