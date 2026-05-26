<!-- pages/tools/ziwei.vue -->
<script setup lang="ts">
import { calculateZiWei, getMingGongIndex } from '~/composables/useZiwei'
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

useHead({ title: '紫微斗数 - 玄学' })

const router = useRouter()
const { currentProfile, restoreSession } = useAuth()

const loading = ref(false)
const error = ref('')
const astrolabe = ref<IFunctionalAstrolabe | null>(null)
const selectedPalace = ref<IFunctionalPalace | null>(null)
const selectedIndex = ref(0)
const currentView = ref<'celestial' | 'grid'>('celestial')

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

const CLOCKWISE_BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']

const sortedPeriods = computed(() => {
  if (!astrolabe.value) return []
  const palaces = [...astrolabe.value.palaces]
  const mingIdx = getMingGongIndex(palaces)

  const branchOrder = Object.fromEntries(CLOCKWISE_BRANCHES.map((b, i) => [b, i]))
  palaces.sort((a, b) => {
    const orderA = branchOrder[a.earthlyBranch] ?? 999
    const orderB = branchOrder[b.earthlyBranch] ?? 999
    return orderA - orderB
  })

  const rotateIdx = palaces.findIndex(p => p.index === mingIdx)
  const ordered = rotateIdx > 0
    ? palaces.slice(rotateIdx).concat(palaces.slice(0, rotateIdx))
    : palaces

  return ordered.map(p => ({
    startAge: p.decadal?.range[0] ?? 0,
    endAge: p.decadal?.range[1] ?? 0,
    palaceName: p.name,
    palaceIndex: p.index,
    stars: p.majorStars.map(s => s.name).join(' '),
  }))
})
</script>

<template>
  <ToolPageLayout>
    <h1 class="sr-only">紫微斗数</h1>

    <!-- Initial loading / auth guard -->
    <div v-if="!ready" class="flex items-center justify-center py-20">
      <div class="w-8 h-8 rounded-full border-2 border-ink-faint/30 border-t-cinnabar/60 animate-spin" />
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

        <!-- Tab Switcher -->
        <ZiWeiTabSwitcher
          :current-view="currentView"
          @update:current-view="currentView = $event"
        />

        <!-- View Transition -->
        <Transition name="view-fade" mode="out-in">
          <ZiWeiCelestialChart
            v-if="currentView === 'celestial'"
            :key="'celestial'"
            :palaces="astrolabe.palaces"
            :selected-index="selectedIndex"
            :ming-gong-index="getMingGongIndex(astrolabe.palaces)"
            :is-visible="currentView === 'celestial'"
            @select="handleSelectPalace"
          />
          <ZiWeiPalaceGrid
            v-else
            :key="'grid'"
            :palaces="astrolabe.palaces"
            :selected-index="selectedIndex"
            :ming-gong-index="getMingGongIndex(astrolabe.palaces)"
            :five-elements-class="astrolabe.fiveElementsClass"
            :soul="astrolabe.soul"
            :body="astrolabe.body"
            :ming-gong-branch="astrolabe.palaces[getMingGongIndex(astrolabe.palaces)]?.earthlyBranch ?? ''"
            :on-select-palace="handleSelectPalace"
          />
        </Transition>

        <!-- DaXian Timeline -->
        <div class="mt-4">
          
          <ZiWeiDaXianTimeline
            :periods="sortedPeriods"
            :current-age="currentAge"
            @select="handleSelectPalace"
          />
        </div>

      </div>
    </template>

    <!-- nav-right slot: palace detail panel -->
    <template v-if="astrolabe" #nav-right>
      <ZiWeiDetailPanel
        :palace="selectedPalace"
      />
    </template>
  </ToolPageLayout>

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
</style>
