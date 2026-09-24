<!-- pages/tools/ziwei.vue -->
<script setup lang="ts">
import { calculateZiWei, getMingGongIndex } from '~/composables/useZiwei'
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe'
import { getTimeIndex } from '~/constants/ziwei'
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'
import ToolEditorialShell from '~/components/editorial/ToolEditorialShell.vue'
import SectionHeading from '~/components/editorial/SectionHeading.vue'
import ZiWeiInputForm from '~/components/tools/ziwei/ZiWeiInputForm.vue'
import ZiWeiTabSwitcher from '~/components/tools/ziwei/ZiWeiTabSwitcher.vue'
import ZiWeiCelestialChart from '~/components/tools/ziwei/ZiWeiCelestialChart.vue'
import ZiWeiPalaceGrid from '~/components/tools/ziwei/ZiWeiPalaceGrid.vue'
import ZiWeiDaXianTimeline from '~/components/tools/ziwei/ZiWeiDaXianTimeline.vue'
import ZiWeiDetailPanel from '~/components/tools/ziwei/ZiWeiDetailPanel.vue'
import ZiWeiInfoSidebar from '~/components/tools/ziwei/ZiWeiInfoSidebar.vue'
import ZiWeiDetailSheet from '~/components/tools/ziwei/ZiWeiDetailSheet.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import MethodologyNote, { type ClassicalSource } from '~/components/tools/MethodologyNote.vue'
import ProfileAutoFillBanner from '~/components/tools/ProfileAutoFillBanner.vue'
import { useProfileAutoFill } from '~/composables/useProfileAutoFill'

// ── Methodology data ──
const ziweiClassical: ClassicalSource[] = [
  {
    method: '紫微斗数体系',
    source: '《紫微斗数全书》（宋代陈希夷撰），十四主星/十二宫位/四化曜完整体系',
  },
  { method: '星盘排盘', source: 'iztro v2.4.8（npm 包），基于《紫微斗数全书》排盘算法实现' },
  { method: '十二宫位', source: '《紫微斗数全书》卷一·十二宫论（命宫-父母宫）' },
  { method: '四化（禄权科忌）', source: '《紫微斗数全书》卷三·四化曜，天干引动主星化气' },
  { method: '星曜特性', source: '同上，主星 14 + 辅星 14 + 杂曜 38，各星入命宫/各宫解读' },
]
const ziweiSynthesis: string[] = [
  '星曜配色分类（gold/jade/cinnabar/ice/purple/gray/white）为前端数据可视化设计，非经典分类体系',
  '双星组合解读为规则模板拼接（按排序后的星名做 key lookup）',
  '解释文本为现代白话转述（非《紫微斗数全书》原文）',
  '天星图地支→角度映射为工程定义（经典紫微无"天星图"可视化传统）',
]

useSeoMeta({
  title: '紫微斗数 — 玄·道',
  ogTitle: '紫微斗数 — 玄·道',
  description: '紫微斗数命盘推演，查看你的十二宫星曜、四化飞星和大限流年运势。',
  ogDescription: '紫微斗数命盘推演，查看你的十二宫星曜、四化飞星和大限流年运势。',
  ogType: 'website',
})

/**
 * 紫微斗数页卷目（Ⅰ–Ⅱ）与脚注。
 *
 * 本页主体是「输入 → 命盘」的单条阅读流，只有两段：Ⅰ 排盘（前置状态、输入与命盘）
 * 与 Ⅱ 命盘与宫位解读（原工具页外壳右侧栏）。卷目只列这两段，不拆段凑数。
 * 输出范围（十二宫 / 四化 / 大限）只在副题与眉题各出现一次；脚注只写输入口径，
 * 隐私边界（本地计算、不留记录）放报头元信息行，窄屏也始终可见。
 */
const indexItems = [
  { num: 'Ⅰ', label: '排盘', href: '#ziwei-chart' },
  { num: 'Ⅱ', label: '命盘与宫位解读', href: '#ziwei-info' },
]

/** 卷目脚注：只写输入口径；窄屏隐藏，不放必须常驻可见的边界说明。 */
const indexFootnote = '出生日期 · 时辰 · 性别'

const router = useRouter()
const { currentProfile, restoreSession } = useAuth()

const loading = ref(false)
const error = ref('')
const astrolabe = ref<IFunctionalAstrolabe | null>(null)
const selectedPalace = ref<IFunctionalPalace | null>(null)
const selectedIndex = ref(0)
const currentView = ref<'celestial' | 'grid'>('celestial')
const showScrollTop = ref(false)
const resultRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()
const { missingBirth: profileMissingBirth, checkAvailability } = useProfileAutoFill()

function handleExport() {
  if (resultRef.value) {
    exportToImage(resultRef.value, '紫微斗数.png')
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

// Form state
const birthDate = ref('')
const birthHour = ref<number | null>(null)
const gender = ref<'male' | 'female' | null>(null)

const ready = ref(false)

onMounted(async () => {
  await restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }
  ready.value = true
  checkAvailability()

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
  if (profileMissingBirth.value) return

  // Auto-calculate if profile has complete birth info
  if (birthDate.value && birthHour.value !== null && gender.value) {
    nextTick(() => handleCalculate())
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
</script>

<template>
  <ToolEditorialShell
    :index-items="indexItems"
    :index-footnote="indexFootnote"
    seal="紫"
    edition="工具 · 紫微斗数（十二宫 · 四化 · 大限）"
    title="紫微斗数"
    subtitle="紫微斗数命盘推演，查看你的十二宫星曜、四化飞星和大限流年运势。"
    status-text="内部验证中"
    meta-text="计算在浏览器本地 · 不保存记录"
  >
    <!-- Ⅰ 排盘：登录与档案前置状态、输入表单与命盘 -->
    <section
      id="ziwei-chart"
      class="editorial-section editorial-section--first"
      aria-labelledby="ziwei-chart-heading"
    >
      <SectionHeading num="Ⅰ" title="排盘" heading-id="ziwei-chart-heading" />

      <!-- Initial loading / auth guard -->
      <div
        v-if="!ready"
        class="flex items-center justify-center py-20"
        role="status"
        aria-live="polite"
      >
        <div
          class="w-8 h-8 rounded-full border-2 border-ink-faint/30 border-t-cinnabar/60 animate-spin"
        />
        <span class="sr-only">正在加载命盘...</span>
      </div>

      <!-- Not logged in -->
      <div v-else-if="!currentProfile" class="text-center py-16">
        <p class="font-sans text-lg text-ink-medium mb-4">请先登录</p>
        <NuxtLink to="/login" class="btn-cin inline-flex">
          <span>前往登录</span>
        </NuxtLink>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-16">
        <p class="text-base text-cinnabar" role="alert">{{ error }}</p>
        <div class="flex justify-center mt-6">
          <button class="btn-cin" @click="handleCalculate">
            <span>重新排盘</span>
          </button>
        </div>
      </div>

      <!-- Missing birth info -->
      <div v-else-if="profileMissingBirth" class="max-w-[48rem] mx-auto">
        <ProfileAutoFillBanner
          :profile-name="currentProfile?.nickname || ''"
          :is-filled="false"
          :missing-birth="true"
          :profile-id="currentProfile?.id"
        />
      </div>

      <!-- Input form (shown before first calculation) -->
      <div v-else-if="!astrolabe && !loading">
        <ZiWeiInputForm
          :birth-date="birthDate"
          :birth-hour="birthHour"
          :gender="gender"
          :loading="false"
          :on-calculate="handleCalculate"
          :on-date-change="(val: string) => (birthDate = val)"
          :on-hour-change="(val: number | null) => (birthHour = val)"
          :on-gender-change="(val: 'male' | 'female') => (gender = val)"
        />
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="space-y-6" aria-busy="true">
        <span class="sr-only">正在排盘...</span>
        <SkeletonCard />
      </div>

      <!-- Result with dual views -->
      <template v-else-if="astrolabe">
        <div class="w-full max-w-full sm:max-w-[48rem] mx-auto">
          <!-- 顶部工具条：仅保留导出入口（历史记录已下线） -->
          <div class="flex items-center justify-between mb-6">
            <span></span>
            <ExportButton
              v-if="astrolabe"
              :target-ref="resultRef"
              filename="紫微斗数.png"
              :is-exporting="isExporting"
              @export="handleExport"
            />
          </div>

          <div ref="resultRef">
            <!-- ── 方法论溯源（保留在导出目标内，导出图与改版前一致） ── -->
            <div class="flex items-center justify-end mb-6">
              <MethodologyNote
                :classical="ziweiClassical"
                :synthesis="ziweiSynthesis"
                tool="紫微斗数"
              />
            </div>
            <ZiWeiTabSwitcher
              :current-view="currentView"
              @update:current-view="currentView = $event"
            />

            <p class="text-xs text-ink-muted text-center mt-2 mb-1 tracking-wide">
              点击宫位或星曜可查看详细解读 · 命宫以朱砂色标注
            </p>

            <!-- View Transition -->
            <Transition name="view-fade" mode="out-in">
              <div
                v-if="currentView === 'celestial'"
                id="panel-celestial"
                :key="'celestial'"
                role="tabpanel"
                :aria-labelledby="'tab-celestial'"
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
                :key="'grid'"
                role="tabpanel"
                :aria-labelledby="'tab-grid'"
              >
                <ZiWeiPalaceGrid
                  :palaces="astrolabe.palaces"
                  :selected-index="selectedIndex"
                  :ming-gong-index="getMingGongIndex(astrolabe.palaces)"
                  :five-elements-class="astrolabe.fiveElementsClass"
                  :soul="astrolabe.soul"
                  :body="astrolabe.body"
                  :ming-gong-branch="
                    astrolabe.palaces[getMingGongIndex(astrolabe.palaces)]?.earthlyBranch ?? ''
                  "
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
          </div>

          <!-- Action buttons -->
          <div class="flex flex-wrap gap-3 justify-center mt-8">
            <button
              class="btn-cin"
              @click="handleCalculate"
              @keydown.enter="handleCalculate"
              @keydown.space.prevent="handleCalculate"
            >
              <span>重新排盘</span>
            </button>
          </div>
        </div>

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
    </section>

    <!-- Ⅱ 命盘与宫位解读：原工具页外壳右侧栏进入正文流 -->
    <section
      v-if="astrolabe"
      id="ziwei-info"
      class="editorial-section space-y-4"
      aria-labelledby="ziwei-info-heading"
    >
      <SectionHeading num="Ⅱ" title="命盘与宫位解读" heading-id="ziwei-info-heading" />
      <ZiWeiInfoSidebar :astrolabe="astrolabe" :birth-hour="birthHour" />
      <ZiWeiDetailPanel :palace="selectedPalace" />
    </section>

    <!-- 窄屏宫位详情页：根级弹层，与外壳同级 -->
    <template #after>
      <ZiWeiDetailSheet
        :show="selectedPalace !== null"
        :palace="selectedPalace"
        @close="selectedPalace = null"
      />
    </template>
  </ToolEditorialShell>
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
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
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
