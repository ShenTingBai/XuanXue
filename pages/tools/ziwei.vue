<!-- pages/tools/ziwei.vue -->
<script setup lang="ts">
import { calculateZiWei, getMingGongIndex, serializeAstrolabe, deserializeAstrolabe } from '~/composables/useZiwei'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import { getTimeIndex } from '~/constants/ziwei'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import ZiWeiInputForm from '~/components/tools/ziwei/ZiWeiInputForm.vue'
import ZiWeiTabSwitcher from '~/components/tools/ziwei/ZiWeiTabSwitcher.vue'
import ZiWeiCelestialChart from '~/components/tools/ziwei/ZiWeiCelestialChart.vue'
import ZiWeiPalaceGrid from '~/components/tools/ziwei/ZiWeiPalaceGrid.vue'
import ZiWeiDaXianTimeline from '~/components/tools/ziwei/ZiWeiDaXianTimeline.vue'
import ZiWeiDetailPanel from '~/components/tools/ziwei/ZiWeiDetailPanel.vue'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import ZiWeiInfoSidebar from '~/components/tools/ziwei/ZiWeiInfoSidebar.vue'
import ZiWeiDetailSheet from '~/components/tools/ziwei/ZiWeiDetailSheet.vue'
import EntertainmentDisclaimer from '~/components/tools/EntertainmentDisclaimer.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'

useHead({ title: '紫微斗数 - 玄学' })

const router = useRouter()
const { currentProfile, restoreSession, getAuthHeaders } = useAuth()

const loading = ref(false)
const error = ref('')
const saveError = ref('')
const showSaveErrorToast = ref(false)
const astrolabe = ref<IFunctionalAstrolabe | null>(null)
const selectedPalace = ref<IFunctionalPalace | null>(null)
const selectedIndex = ref(0)
const currentView = ref<'celestial' | 'grid'>('celestial')
const showHistoryModal = ref(false)
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

// Form state
const birthDate = ref('')
const birthHour = ref<number | null>(null)
const gender = ref<'male' | 'female' | null>(null)
const ready = ref(false)

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }
  ready.value = true

  // Pre-fill from profile if available
  if (currentProfile.value.birth_date) {
    birthDate.value = currentProfile.value.birth_date
  }
  if (currentProfile.value.birth_hour !== null && currentProfile.value.birth_hour !== undefined) {
    birthHour.value = getTimeIndex(currentProfile.value.birth_hour)
  }
  if (currentProfile.value.gender) {
    gender.value = currentProfile.value.gender === '男' ? 'male' : 'female'
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

function handleCalculate() {
  if (!birthDate.value || birthHour.value === null || !gender.value) return

  const parts = birthDate.value.split('-')
  if (parts.length !== 3) return
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return

  loading.value = true
  error.value = ''

  try {
    const ziweiResult = calculateZiWei({
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthHour: birthHour.value,
      gender: gender.value,
    })

    if (!ziweiResult) {
      error.value = '排盘计算出错，请检查出生信息'
      loading.value = false
      return
    }

    astrolabe.value = ziweiResult
    selectedIndex.value = getMingGongIndex(ziweiResult.palaces)
    selectedPalace.value = ziweiResult.palaces[selectedIndex.value] || null
    saveDivinationResult(ziweiResult)
  } catch (err) {
    console.error('Ziwei calculation failed:', err)
    error.value = '排盘计算出错，请检查出生信息'
  }

  loading.value = false
}

function handleSelectPalace(index: number) {
  if (!astrolabe.value) return
  selectedIndex.value = index
  selectedPalace.value = astrolabe.value.palaces[index] || null
}

const currentAge = computed(() => {
  if (!astrolabe.value) return 0
  const parts = astrolabe.value.solarDate.split('-')
  const birthYear = parseInt(parts[0], 10)
  return new Date().getFullYear() - birthYear + 1
})

const sortedPeriods = computed(() => {
  if (!astrolabe.value) return []
  return astrolabe.value.palaces
    .map(p => ({
      startAge: p.decadal?.range[0] ?? 0,
      endAge: p.decadal?.range[1] ?? 0,
      palaceName: p.name,
      palaceIndex: p.index,
      stars: p.majorStars.map(s => s.name).join(' '),
    }))
    .sort((a, b) => a.startAge - b.startAge)
})

async function saveDivinationResult(astroData: IFunctionalAstrolabe) {
  const headers = getAuthHeaders()
  if (!headers.Authorization) return
  // Build a rich label for the history list so entries are distinguishable
  const mingGongIdx = getMingGongIndex(astroData.palaces)
  const mingGong = astroData.palaces[mingGongIdx]
  const mingStars = mingGong?.majorStars.map(s => s.name).join('、') || '无主星'
  const mingLabel = `命${mingGong?.earthlyBranch ?? ''}宫(${mingStars})`
  const hourLabel = birthHour.value !== null ? `第${birthHour.value + 1}时` : ''
  const genderLabel = gender.value === 'male' ? '男' : '女'
  const historyLabel = `${birthDate.value} ${hourLabel} ${genderLabel} | ${mingLabel} | ${astroData.fiveElementsClass}`
  try {
    await $fetch<{ id: number; created_at: string }>('/api/divinations', {
      method: 'POST',
      headers,
      body: {
        type: 'ziwei',
        input_data: {
          birthYear: parseInt(birthDate.value.split('-')[0], 10),
          birthMonth: parseInt(birthDate.value.split('-')[1], 10),
          birthDay: parseInt(birthDate.value.split('-')[2], 10),
          birthHour: birthHour.value,
          gender: gender.value,
          historyLabel,
        },
        result_data: serializeAstrolabe(astroData),
      },
    })
  } catch (e: unknown) {
    // 401/429: stale session or rate-limited, suppress
    if (e && typeof e === 'object' && 'statusCode' in e) {
      const code = (e as any).statusCode
      if (code === 401 || code === 429) {
        if (code === 401) console.warn('[ziwei] Save failed: session expired')
        return
      }
    }
    saveError.value = '保存失败，历史记录可能不完整'
    showSaveErrorToast.value = true
  }
}

function dismissSaveToast() {
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

    // Restore form fields from input_data
    if (record.input_data) {
      const input = record.input_data as { birthYear: number; birthMonth: number; birthDay: number; birthHour: number | null; gender: 'male' | 'female' | null }
      birthDate.value = `${input.birthYear}-${String(input.birthMonth).padStart(2, '0')}-${String(input.birthDay).padStart(2, '0')}`
      birthHour.value = input.birthHour ?? null
      gender.value = input.gender ?? null
    }

    // Try snapshot restore from result_data
    if (record.result_data) {
      const deserialized = deserializeAstrolabe(record.result_data as Record<string, unknown>)
      if (deserialized) {
        astrolabe.value = deserialized
        selectedIndex.value = getMingGongIndex(deserialized.palaces)
        selectedPalace.value = deserialized.palaces[selectedIndex.value] || null
        return
      }
    }

    // Fallback: re-calculate from input_data
    handleCalculate()
  } catch {
    error.value = '历史记录加载失败，请稍后重试'
  }
}
</script>

<template>
  <ToolPageLayout>
    <h1 class="sr-only">紫微斗数</h1>

    <!-- Initial loading / auth guard -->
    <div v-if="!ready" class="flex items-center justify-center py-20" role="status" aria-live="polite">
      <div class="w-8 h-8 rounded-full border-2 border-ink-faint/30 border-t-cinnabar/60 animate-spin" />
      <span class="sr-only">正在加载命盘...</span>
    </div>

    <!-- Not logged in -->
    <div v-else-if="!currentProfile" class="text-center py-16">
      <p class="font-sans text-lg text-ink-medium mb-4">请先登录</p>
      <NuxtLink to="/login" class="btn-seal inline-flex">
        <span>前往登录</span>
      </NuxtLink>
    </div>

    <!-- Input form (shown before first calculation) -->
    <div v-else-if="!astrolabe && !loading">
      <ZiWeiInputForm
        :birth-date="birthDate"
        :birth-hour="birthHour"
        :gender="gender"
        :loading="false"
        :on-calculate="handleCalculate"
        :on-date-change="(val: string) => birthDate = val"
        :on-hour-change="(val: number | null) => birthHour = val"
        :on-gender-change="(val: 'male' | 'female') => gender = val"
      />
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="flex flex-col items-center justify-center py-20" aria-busy="true">
      <div class="w-8 h-8 mb-4 rounded-full border-2 border-ink-faint/30 border-t-cinnabar/60 animate-spin" />
      <p class="font-display text-sm text-ink-light/60 tracking-[0.1em]">正在排盘...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <p class="text-base text-cinnabar" role="alert">{{ error }}</p>
      <div class="flex justify-center mt-6">
        <button @click="handleCalculate" class="btn-seal">
          <span>重新排盘</span>
        </button>
      </div>
    </div>

    <!-- Result with dual views -->
    <template v-else-if="astrolabe">
      <div class="w-full max-w-[620px] mx-auto">

        <!-- Save error toast -->
        <Transition name="toast">
          <div
            v-if="showSaveErrorToast"
            class="mb-4 px-4 py-2.5 rounded-lg bg-cinnabar/5 border border-cinnabar/15 text-cinnabar text-sm flex items-center justify-between"
            role="alert"
          >
            <span>{{ saveError }}</span>
            <button
              @click="dismissSaveToast"
              @keydown.enter="dismissSaveToast"
              @keydown.space.prevent="dismissSaveToast"
              class="ml-3 px-2 py-2 text-cinnabar/60 hover:text-cinnabar transition-colors text-lg leading-none"
              aria-label="关闭提示"
            >&times;</button>
          </div>
        </Transition>

        <!-- Tab Switcher -->
        <ZiWeiTabSwitcher
          :current-view="currentView"
          @update:current-view="currentView = $event"
        />

        <!-- View Transition -->
        <Transition name="view-fade" mode="out-in">
          <div
            v-if="currentView === 'celestial'"
            id="panel-celestial"
            role="tabpanel"
            :aria-labelledby="'tab-celestial'"
            :key="'celestial'"
          >
            <ZiWeiCelestialChart
              :palaces="astrolabe.palaces"
              :selected-index="selectedIndex"
              :ming-gong-index="getMingGongIndex(astrolabe.palaces)"
              :is-visible="currentView === 'celestial'"
              @select="handleSelectPalace"
            />
          </div>
          <div
            v-else
            id="panel-grid"
            role="tabpanel"
            :aria-labelledby="'tab-grid'"
            :key="'grid'"
          >
            <ZiWeiPalaceGrid
              :palaces="astrolabe.palaces"
              :selected-index="selectedIndex"
              :ming-gong-index="getMingGongIndex(astrolabe.palaces)"
              :five-elements-class="astrolabe.fiveElementsClass"
              :soul="astrolabe.soul"
              :body="astrolabe.body"
              :ming-gong-branch="astrolabe.palaces[getMingGongIndex(astrolabe.palaces)]?.earthlyBranch ?? ''"
              :on-select-palace="handleSelectPalace"
            />
          </div>
        </Transition>

        <!-- DaXian Timeline -->
        <div class="mt-4">
          
          <ZiWeiDaXianTimeline
            :periods="sortedPeriods"
            :current-age="currentAge"
            @select="handleSelectPalace"
          />
        </div>

        <!-- Action buttons -->
        <div class="flex flex-wrap gap-3 justify-center mt-8">
          <button
            @click="handleCalculate"
            @keydown.space.prevent="handleCalculate"
            class="btn-seal"
          >
            <span>重新排盘</span>
          </button>
          <button
            @click="showHistoryModal = true"
            @keydown.enter="showHistoryModal = true"
            @keydown.space.prevent="showHistoryModal = true"
            class="btn-seal"
            aria-haspopup="dialog"
          >
            <span>浏览历史</span>
          </button>
        </div>

        <EntertainmentDisclaimer />

      </div>

      <ScrollTopButton
        v-if="showScrollTop"
        @click="scrollToTop"
        @keydown.enter="scrollToTop"
      />
    </template>

    <!-- nav-right slot: palace detail panel -->
    <template v-if="astrolabe" #nav-right>
      <div class="space-y-4">
        <ZiWeiInfoSidebar
          :astrolabe="astrolabe"
          :birth-hour="birthHour"
        />
        <ZiWeiDetailPanel
          :palace="selectedPalace"
        />
      </div>
    </template>
  </ToolPageLayout>

  <HistoryModal
    :show="showHistoryModal"
    type="ziwei"
    @close="showHistoryModal = false"
    @restore="onHistoryRestore"
  />

  <ZiWeiDetailSheet
    :show="selectedPalace !== null"
    :palace="selectedPalace"
    @close="selectedPalace = null"
  />
</template>

<style scoped>
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 0.25s ease;
}
.view-fade-enter-from,
.view-fade-leave-to {
  opacity: 0;
}

.toast-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-leave-active {
  transition: opacity 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.toast-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
  .toast-enter-from {
    transform: none;
  }
}
</style>
