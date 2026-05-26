<!-- pages/tools/ziwei.vue -->
<script setup lang="ts">
import { calculateZiWei, getDetailedPalaceView, getMingGongIndex, serializeAstrolabe } from '~/composables/useZiwei'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import HistoryModal from '~/components/tools/HistoryModal.vue'

useHead({ title: '紫微斗数 - 玄学' })

const router = useRouter()
const { currentProfile, restoreSession, getAuthHeaders } = useAuth()

const loading = ref(false)
const error = ref('')
const astrolabe = ref<IFunctionalAstrolabe | null>(null)
const selectedPalace = ref<IFunctionalPalace | null>(null)
const selectedIndex = ref(0)
const showHistoryModal = ref(false)
const currentView = ref<'celestial' | 'grid'>('celestial')

// Form state
const birthDate = ref('')
const birthHour = ref<number | null>(null)
const gender = ref<'male' | 'female' | null>(null)

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }

  // Pre-fill from profile if available
  if (currentProfile.value.birth_date) {
    birthDate.value = currentProfile.value.birth_date
  }
  if (currentProfile.value.birth_hour !== null && currentProfile.value.birth_hour !== undefined) {
    const hour = currentProfile.value.birth_hour
    birthHour.value = Math.floor((hour + 1) / 2)
  }
  if (currentProfile.value.gender) {
    gender.value = currentProfile.value.gender === '男' ? 'male' : 'female'
  }
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
  } catch {
    error.value = '排盘计算出错，请检查出生信息'
  }

  loading.value = false
}

function handleSelectPalace(index: number) {
  if (!astrolabe.value) return
  selectedIndex.value = index
  selectedPalace.value = astrolabe.value.palaces[index] || null
}

async function saveDivinationResult(astroData: IFunctionalAstrolabe) {
  try {
    const headers = getAuthHeaders()
    if (headers.Authorization) {
      await $fetch('/api/divinations', {
        method: 'POST',
        headers,
        body: {
          type: 'ziwei',
          input_data: { birthDate: birthDate.value, birthHour: birthHour.value, gender: gender.value },
          result_data: serializeAstrolabe(astroData),
        },
      })
    }
  } catch {
    // Fire-and-forget: silent fail
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
    const record = await $fetch<{ input_data: any; result_data: any }>(
      `/api/divinations/${id}`,
      { headers },
    )
    if (record.input_data?.birthDate) {
      birthDate.value = record.input_data.birthDate
      birthHour.value = record.input_data.birthHour ?? birthHour.value
      gender.value = record.input_data.gender ?? gender.value
      handleCalculate()
    }
  } catch {
    // Silent fail
  }
}
</script>

<template>
  <ToolPageLayout>
    <h1 class="sr-only">紫微斗数</h1>

    <!-- Not logged in -->
    <div v-if="!currentProfile" class="text-center py-16">
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
    <div v-else-if="loading" class="space-y-6" aria-busy="true">
      <SkeletonCard />
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
      <div class="max-w-[620px] mx-auto">

        <!-- Tab Switcher -->
        <ZiWeiTabSwitcher
          :current-view="currentView"
          @update:current-view="currentView = $event"
        />

        <!-- Celestial Chart (天星图) -->
        <ZiWeiCelestialChart
          v-if="currentView === 'celestial'"
          :palaces="astrolabe.palaces"
          :selected-index="selectedIndex"
          :ming-gong-index="getMingGongIndex(astrolabe.palaces)"
          @select="handleSelectPalace"
        />

        <!-- Palace Grid (回宫图) -->
        <ZiWeiPalaceGrid
          v-if="currentView === 'grid'"
          :palaces="astrolabe.palaces"
          :selected-index="selectedIndex"
          :ming-gong-index="getMingGongIndex(astrolabe.palaces)"
          :five-elements-class="astrolabe.fiveElementsClass"
          :on-select-palace="handleSelectPalace"
        />

        <!-- DaXian Timeline -->
        <div class="mt-4">
          <h3 class="text-xs text-ink-light/60 mb-2 text-center">大限</h3>
          <ZiWeiDaXianTimeline
            :periods="astrolabe.palaces.map(p => ({
              startAge: p.decadal?.range[0] ?? 0,
              endAge: p.decadal?.range[1] ?? 0,
              palaceName: p.name,
              stars: p.majorStars.map(s => s.name).join(' '),
            }))"
            :current-age="new Date().getFullYear() - parseInt(astrolabe.solarDate.split('-')[0])"
          />
        </div>

        <!-- History -->
        <div class="flex justify-center mt-6">
          <button
            @click="showHistoryModal = true"
            class="btn-seal"
            aria-haspopup="dialog"
          >
            <span>浏览历史</span>
          </button>
        </div>
      </div>
    </template>

    <!-- nav-right slot: profile info + palace detail -->
    <template v-if="astrolabe" #nav-right>
      <div class="space-y-4">
        <ZiWeiInfoSidebar :astrolabe="astrolabe" :birth-hour="birthHour" />
        <ZiWeiDetailPanel
          v-if="selectedPalace"
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
</template>
