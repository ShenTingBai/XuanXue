<script setup lang="ts">
import { calculateBaZi, type BaZiResult, type BaZiPillar, type DaYunCycle } from '~/composables/useBaZi'
import { calculateShenSha, type ShenSha } from '~/composables/useShenSha'
import { calculateLiuNian, type LiuNianYear } from '~/composables/useLiuNian'
import { getStemIndex, getAnimal, sectionMap } from '~/constants/bazi'
import { parseDate } from '~/utils/date'
import BaziGrid from '~/components/tools/bazi/BaziGrid.vue'

import ElementAnalysis from '~/components/tools/bazi/ElementAnalysis.vue'
import DayMasterCard from '~/components/tools/bazi/DayMasterCard.vue'
import DaYunTimeline from '~/components/tools/bazi/DaYunTimeline.vue'
import BaziInfoSidebar from '~/components/tools/bazi/BaziInfoSidebar.vue'
import ShenShaPanel from '~/components/tools/bazi/ShenShaPanel.vue'
import LiuNianTimeline from '~/components/tools/bazi/LiuNianTimeline.vue'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import SkeletonBars from '~/components/tools/SkeletonBars.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ReadingGuide from '~/components/tools/bazi/ReadingGuide.vue'
import EntertainmentDisclaimer from '~/components/tools/EntertainmentDisclaimer.vue'

import SectionNav from '~/components/tools/bazi/SectionNav.vue'
import CollapsibleSection from '~/components/tools/bazi/CollapsibleSection.vue'
import DayMasterSeal from '~/components/tools/bazi/DayMasterSeal.vue'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import MethodologyNote, { type ClassicalSource } from '~/components/tools/MethodologyNote.vue'

useHead({ title: '八字排盘 — 玄·道' })

// ── Methodology data ──
const baziClassical: ClassicalSource[] = [
  { method: '四柱推命（子平法）', source: '《渊海子平》卷一（宋代徐大升），天干地支、五行属性基础' },
  { method: '六十甲子 & 纳音', source: '干支纪年体系（商周起源，汉代定型），京房纳甲纳音体系' },
  { method: '十神体系', source: '《三命通会》卷三（明代万民英），以日干为中心定十神' },
  { method: '大运起运', source: '标准子平法：阳男阴女顺排、阴男阳女逆排，节气天数 ÷ 3 = 起运岁数' },
  { method: '神煞系统', source: '《三命通会》神煞章，《协纪辨方书》，三合/天乙/禄神/羊刃等' },
]
const baziSynthesis: string[] = [
  '日主强弱判定 → 月令 + 通根 + 生扶 + 克泄四维度加权（工程校准）',
  '喜用神推断 → 扶抑/调候/通关三原则取用（规则引擎，非 AI）',
  '流年评分：基准 50 + 十神喜忌(±30) + 地支关系(±20) + 神煞(±5)，压缩至 0-100',
  '解读文本为规则模板拼接（十神短语 + 五行匹配 + 地支关系 + 神煞），非 AI 生成',
  '节气日期依赖 `lunar-javascript` 库 + `useSolarTerms` 精确计算，不硬编码日期',
]

const router = useRouter()
const { currentProfile, restoreSession, getAuthHeaders } = useAuth()

const result = ref<BaZiResult | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const missingHour = ref(false)
const error = ref('')
const shenShaList = ref<ShenSha[]>([])
const liuNianYears = ref<LiuNianYear[]>([])
const savedDivinationId = ref<number | null>(null)
const saveError = ref('')
const showHistoryModal = ref(false)
const restoreError = ref('')
const restoreErrorTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const restoredFromHistory = ref(false)
const currentYear = new Date().getFullYear()
const showScrollTop = ref(false)
const scrollTopOffset = ref('1rem')
const mainContainer = ref<HTMLElement | null>(null)
const resultRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()
const cachedAge = ref(0)
const activeNavSection = ref('排盘')

// Collapsible section state — ReadingGuide is expanded by default as the entry summary
const expandedSections = ref<Record<string, boolean>>({
  'bazi-grid': false,
  'shensha': false,
  'day-master': false,
  'elements': false,
  'dayun': false,
  'liunian': false,
})

function toggleSection(sectionId: string) {
  expandedSections.value[sectionId] = !expandedSections.value[sectionId]
}

/** Called by SectionNav before scrolling — expand the target section so scroll lands correctly */
async function handleBeforeNavigate(sectionName: string) {
  const sectionId = sectionMap[sectionName]
  // Only handle sections that are actually collapsible (skip ReadingGuide which is always visible)
  if (sectionId && sectionId in expandedSections.value && !expandedSections.value[sectionId]) {
    expandedSections.value[sectionId] = true
    await nextTick()
    // Let the browser calculate layout after grid expansion before scrolling
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }
}

function handleScroll() {
  showScrollTop.value = window.scrollY > 300
}

function updateScrollTopOffset() {
  const el = mainContainer.value || document.querySelector('.max-w-\\[48rem\\]')
  if (el) {
    const rect = el.getBoundingClientRect()
    const gap = window.innerWidth - rect.right + 4
    scrollTopOffset.value = `${Math.max(gap, 4)}px`
  }
}

let sectionObserver: IntersectionObserver | null = null
let observeTimer: ReturnType<typeof setTimeout> | null = null

onUnmounted(() => {
  if (observeTimer) clearTimeout(observeTimer)
  if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
  if (sectionObserver) sectionObserver.disconnect()
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', updateScrollTopOffset)
})

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
  window.addEventListener('resize', updateScrollTopOffset, { passive: true })
  updateScrollTopOffset()
  computeResult()

  // IntersectionObserver for nav section highlighting
  if (import.meta.client) {
    sectionObserver = new IntersectionObserver(
      (entries) => {
        // Find the first visible section that's mostly in view
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          // Pick the one with the highest intersection ratio
          const best = visible.reduce((a, b) => a.intersectionRatio >= b.intersectionRatio ? a : b)
          // Map section id back to nav label
          for (const [label, id] of Object.entries(sectionMap)) {
            if (id === best.target.id) {
              activeNavSection.value = label
              break
            }
          }
        }
      },
      { threshold: [0.3, 0.5, 0.7] },
    )
    // Observe all sections after a short delay to let DOM render
    observeTimer = setTimeout(() => {
      for (const id of Object.values(sectionMap)) {
        const el = document.getElementById(id)
        if (el) sectionObserver!.observe(el)
      }
    }, 100)
  }
})

function getCurrentAge(): number {
  if (!currentProfile.value?.birth_date) return 0
  const parsed = parseDate(currentProfile.value.birth_date)
  if (!parsed) return 0
  const now = new Date()
  let age = now.getFullYear() - parsed.year
  const monthDiff = now.getMonth() + 1 - parsed.month
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.day)) {
    age--
  }
  return Math.max(0, age)
}

const currentDaYunIndex = computed(() => {
  if (!result.value?.daYun.length) return -1
  return result.value.daYun.findIndex(c => cachedAge.value >= c.startAge && cachedAge.value <= c.endAge)
})

function computeResult() {
  // Cache current age once for use throughout the result computation
  cachedAge.value = getCurrentAge()
  if (!currentProfile.value?.birth_date) return

  loading.value = true
  error.value = ''

  // Reset shensha, liunian, and save state
  shenShaList.value = []
  liuNianYears.value = []
  savedDivinationId.value = null
  saveError.value = ''
  restoredFromHistory.value = false
  restoreError.value = ''

  const parsed = parseDate(currentProfile.value.birth_date)
  if (!parsed) { error.value = '出生日期格式无效，请修改个人信息'; loading.value = false; return }
  const { year, month, day } = parsed
  const calendar = currentProfile.value.birth_calendar || 'solar'

  const hour = currentProfile.value.birth_hour ?? null
  const gender = currentProfile.value.gender || null

  if (hour === null) {
    missingHour.value = true
  } else {
    missingHour.value = false
  }

  try {
    const baziResult = calculateBaZi({
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthCalendar: calendar,
      birthHour: hour,
      gender,
    })

    result.value = baziResult

    // Compute shensha
    const dayMasterIndex = getStemIndex(baziResult.dayMaster)
    shenShaList.value = calculateShenSha({
      yearPillar: baziResult.yearPillar,
      monthPillar: baziResult.monthPillar,
      dayPillar: baziResult.dayPillar,
      hourPillar: baziResult.hourPillar,
      dayMaster: baziResult.dayMaster,
      dayMasterIndex,
      yearStemIndex: getStemIndex(baziResult.yearPillar.stem),
      gender,
    })

    // Compute liunian (with birth chart shensha for year-specific lookups)
    liuNianYears.value = calculateLiuNian({
      baZi: baziResult,
      currentYear,
      range: 5,
    })

    // Auto-save divination result (fire-and-forget, does not block result display)
    saveDivinationResult(baziResult, year, month, day, calendar, hour, gender)
  } catch {
    error.value = '排盘计算出错，请检查出生信息'
  }
  loading.value = false
}

async function saveDivinationResult(
  baziResult: BaZiResult,
  year: number, month: number, day: number,
  calendar: string, hour: number | null, gender: string | null,
) {
  try {
    const headers = getAuthHeaders()
    if (headers.Authorization) {
      const inputData = {
        birthYear: year, birthMonth: month, birthDay: day,
        birthCalendar: calendar, birthHour: hour, gender,
      }
      const saveRes = await $fetch<{ id: number; created_at: string }>('/api/divinations', {
        method: 'POST',
        headers,
        body: {
          type: 'bazi',
          input_data: inputData,
          result_data: JSON.parse(JSON.stringify(baziResult)),
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

function dismissRestoreError() {
  restoreError.value = ''
}

function onHistoryRestore(id: number) {
  showHistoryModal.value = false
  restoreFromHistory(id)
}

function isBaZiResult(data: unknown): data is BaZiResult {
  return typeof data === 'object' && data !== null
    && 'dayMaster' in data && 'yearPillar' in data && 'daYun' in data
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
      if (isBaZiResult(data)) {
        const baziResult: BaZiResult = data
        result.value = baziResult
        cachedAge.value = getCurrentAge()

        // Recalculate shensha
        const dayMasterIndex = getStemIndex(baziResult.dayMaster)
        shenShaList.value = calculateShenSha({
          yearPillar: baziResult.yearPillar,
          monthPillar: baziResult.monthPillar,
          dayPillar: baziResult.dayPillar,
          hourPillar: baziResult.hourPillar,
          dayMaster: baziResult.dayMaster,
          dayMasterIndex,
          yearStemIndex: getStemIndex(baziResult.yearPillar.stem),
          gender: baziResult.gender,
        })

        // Recalculate liunian
        liuNianYears.value = calculateLiuNian({
          baZi: baziResult,
          currentYear,
          range: 5,
        })

        restoreError.value = ''
        restoredFromHistory.value = true
        missingHour.value = baziResult.birthHour === null
        return
      }
    }
    restoreError.value = '历史记录数据无效'
    if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
    restoreErrorTimer.value = setTimeout(() => { restoreError.value = '' }, 6000)
  } catch {
    restoreError.value = '历史记录加载失败，请稍后重试'
    if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
    restoreErrorTimer.value = setTimeout(() => { restoreError.value = '' }, 6000)
  }
}

function handleExport() {
  if (resultRef.value) {
    exportToImage(resultRef.value, '八字命盘.png')
  }
}

function scrollToTop() {
  const prefersReducedMotion = import.meta.client ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  if (!prefersReducedMotion) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0 })
  }
}

const pillars = computed<BaZiPillar[]>(() => {
  if (!result.value) return []
  const arr = [result.value.yearPillar, result.value.monthPillar, result.value.dayPillar]
  if (result.value.hourPillar) arr.push(result.value.hourPillar)
  return arr
})

const animalName = computed(() => {
  if (!result.value) return ''
  return getAnimal(result.value.birthYear)
})

/** Key shenshas for the reading guide: prioritize day pillar, favor auspicious, limit to 5 */
const readingGuideShensha = computed(() => {
  const list = shenShaList.value
  if (list.length === 0) return []

  // Sort: day pillar first, then by category (吉 > 中性 > 凶)
  const categoryOrder: Record<ShenSha['category'], number> = { '吉': 0, '中性': 1, '凶': 2 }
  const sorted = [...list].sort((a, b) => {
    // Day pillar first
    const aDay = a.pillar === '日柱' ? 0 : 1
    const bDay = b.pillar === '日柱' ? 0 : 1
    if (aDay !== bDay) return aDay - bDay
    // Then category
    if (a.category !== b.category) return categoryOrder[a.category] - categoryOrder[b.category]
    return 0
  })

  // Deduplicate by name (keep first occurrence which has highest priority pillar)
  const seen = new Set<string>()
  const deduped: typeof sorted = []
  for (const s of sorted) {
    if (seen.has(s.name)) continue
    seen.add(s.name)
    deduped.push(s)
  }

  // Take top 5, but at most 2 凶
  const result2: typeof deduped = []
  let xiongCount = 0
  for (const s of deduped) {
    if (s.category === '凶') {
      if (xiongCount >= 2) continue
      xiongCount++
    }
    result2.push(s)
    if (result2.length >= 5) break
  }
  return result2
})

/** The current year's liunian analysis, if available */
const currentYearLiuNian = computed(() => {
  return liuNianYears.value.find(y => y.year === currentYear) || null
})

/** The current da yun cycle, if available */
const currentDaYun = computed(() => {
  if (currentDaYunIndex.value >= 0 && result.value) {
    return result.value.daYun[currentDaYunIndex.value] || null
  }
  return null
})

/** Immediate visual feedback when user clicks a nav anchor; also auto-expands the section */
function onSectionNavigate(sectionName: string) {
  activeNavSection.value = sectionName
  const sectionId = sectionMap[sectionName]
  // Only auto-expand for collapsible sections (skip ReadingGuide)
  if (sectionId && sectionId in expandedSections.value) {
    expandedSections.value[sectionId] = true
  }
}
</script>

<template>
  <ToolPageLayout>
        <!-- Sidebar: quick reference for basic info on desktop -->
        <template #nav-right>
          <BaziInfoSidebar
            v-if="result"
            :birth-year="result.birthYear"
            :birth-calendar="result.birthCalendar"
            :animal="animalName"
            :gender="result.gender"
            :day-master="result.dayMaster"
            :day-master-wuxing="result.dayMasterWuxing"
            :day-master-strength="result.dayMasterStrength"
            :favorable-elements="result.favorableElements"
            :unfavorable-elements="result.unfavorableElements"
          />
        </template>

        <h1 class="sr-only">八字排盘</h1>
        <!-- Screen reader status -->
        <div role="status" class="sr-only" aria-live="polite">
          {{ loading ? '正在计算...' : result ? '结果已就绪' : '' }}
        </div>

        <!-- Missing birth info -->
        <div v-if="missingBirthInfo" class="text-center py-16">
          <p class="font-sans text-lg text-ink-medium mb-4">请先完善出生信息</p>
          <p class="font-sans text-base text-ink-light mb-6">需要填写出生日期以进行八字排盘</p>
          <NuxtLink
            :to="`/profile/${currentProfile?.id}`"
            class="btn-cin inline-flex"
          >
            <span>前往编辑档案</span>
          </NuxtLink>
        </div>

        <!-- Loading -->
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
          <div ref="mainContainer" class="max-w-[48rem] mx-auto relative">
            <!-- Top toolbar -->
            <ToolToolbar
              :show-history="true"
              @history="showHistoryModal = true"
            >
              <template #extra>
                <ExportButton
                  v-if="result"
                  :target-ref="resultRef"
                  filename="八字命盘.png"
                  :is-exporting="isExporting"
                  @export="handleExport"
                />
              </template>
            </ToolToolbar>

            <!-- Save error toast — auto-save is fire-and-forget, failures are silent -->


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

            <!-- Export target: result content -->
            <div ref="resultRef">
            <!-- 命主签 — Day Master Identity Seal -->
            <DayMasterSeal
              :birth-year="result.birthYear"
              :birth-calendar="result.birthCalendar"
              :animal-name="animalName"
              :gender="result.gender"
              :day-master="result.dayMaster"
              :day-master-wuxing="result.dayMasterWuxing"
              :day-master-strength="result.dayMasterStrength"
              :favorable-elements="result.favorableElements"
              :unfavorable-elements="result.unfavorableElements"
            />

            <!-- Hour missing notice - promoted warning -->
            <div v-if="missingHour" class="mb-6 p-4 rounded-xl bg-cinnabar/10 border-2 border-cinnabar/30 text-center font-sans">
              <p class="text-sm text-ink-dark">
                出生时辰未设置，时柱暂不显示。缺少时柱会影响四柱排盘完整度、神煞匹配、五行统计及流年分析。
                <NuxtLink :to="`/profile/${currentProfile?.id}`" class="inline-block px-3 py-2 text-cinnabar font-medium hover:underline whitespace-nowrap">前往设置</NuxtLink>
              </p>
            </div>

            <!-- Anchor navigation -->
            <SectionNav
              :active-nav-section="activeNavSection"
              :on-before-navigate="handleBeforeNavigate"
              @navigate="onSectionNavigate"
            />

            <!-- Reading Guide (命理速览) -->
            <div class="flex items-center justify-end mb-2">
              <MethodologyNote
                :classical="baziClassical"
                :synthesis="baziSynthesis"
                tool="八字"
              />
            </div>
            <ReadingGuide
              :day-master="result.dayMaster"
              :day-master-wuxing="result.dayMasterWuxing"
              :day-master-strength="result.dayMasterStrength"
              :favorable-elements="result.favorableElements"
              :unfavorable-elements="result.unfavorableElements"
              :reading-guide-shensha="readingGuideShensha"
              :current-year-liu-nian="currentYearLiuNian"
              :current-da-yun="currentDaYun"
            />

            <!-- Four Pillars Grid -->
            <CollapsibleSection
              section-id="bazi-grid"
              title="四柱排盘"
              subtitle="命盘"
              :expanded="expandedSections['bazi-grid']"
              @toggle="toggleSection"
            >
              <BaziGrid :pillars="pillars" />
            </CollapsibleSection>

            <!-- ShenSha Panel — delay 0.15s, shows derived markers after static pillars -->
            <CollapsibleSection
              v-if="shenShaList.length > 0"
              section-id="shensha"
              title="神煞"
              subtitle="吉凶"
              :expanded="expandedSections['shensha']"
              @toggle="toggleSection"
            >
              <ShenShaPanel :shen-sha="shenShaList" />
            </CollapsibleSection>

            <!-- Day Master Card -->
            <CollapsibleSection
              section-id="day-master"
              title="日主分析"
              subtitle="元神"
              :expanded="expandedSections['day-master']"
              @toggle="toggleSection"
            >
              <DayMasterCard
                :day-master="result.dayMaster"
                :day-master-wuxing="result.dayMasterWuxing"
                :day-master-strength="result.dayMasterStrength"
                :favorable-elements="result.favorableElements"
                :unfavorable-elements="result.unfavorableElements"
              />
            </CollapsibleSection>

            <!-- Element Analysis -->
            <CollapsibleSection
              section-id="elements"
              title="五行分析"
              subtitle="强弱"
              :expanded="expandedSections['elements']"
              @toggle="toggleSection"
            >
              <ElementAnalysis
                :element-counts="result.elementCounts"
                :element-percentages="result.elementPercentages"
                :day-master="result.dayMaster"
                :day-master-wuxing="result.dayMasterWuxing"
                :day-master-strength="result.dayMasterStrength"
                :month-branch="result.monthPillar.branch"
              />
            </CollapsibleSection>

            <!-- Da Yun Timeline -->
            <CollapsibleSection
              section-id="dayun"
              title="大运"
              subtitle="十年"
              :expanded="expandedSections['dayun']"
              @toggle="toggleSection"
            >
              <DaYunTimeline :cycles="result.daYun" :current-cycle-idx="currentDaYunIndex" />
            </CollapsibleSection>

            <!-- LiuNian Timeline — delay 0.50s, annual analysis after macro da yun cycles -->
            <CollapsibleSection
              section-id="liunian"
              title="流年"
              subtitle="岁运"
              :expanded="expandedSections['liunian']"
              @toggle="toggleSection"
            >
              <LiuNianTimeline
                v-if="liuNianYears.length > 0"
                :years="liuNianYears"
                :current-year="currentYear"
                :range="5"
              />
            </CollapsibleSection>
            </div>

            <!-- Back to top: floating button, visible after scrolling past 300px -->
            <ScrollTopButton
              v-if="showScrollTop"
              :style="{ right: scrollTopOffset }"
              @click="scrollToTop"
              @keydown.enter="scrollToTop"
            />

            <!-- Restored from history notice -->
            <div v-if="restoredFromHistory" class="flex flex-col items-center gap-2 mt-6">
              <p class="font-sans text-xs text-ink-light">当前显示的是历史记录</p>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-wrap gap-3 justify-center mt-8">
              <!-- Recalculates from profile data -- useful if user updated profile externally -->
              <button
                @click="computeResult"
                @keydown.enter="computeResult"
                @keydown.space.prevent="computeResult"
                class="btn-cin"
              >
                <span>重新排盘</span>
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

            <EntertainmentDisclaimer />
        </div>
        </template>

  </ToolPageLayout>

  <HistoryModal
    :show="showHistoryModal"
    type="bazi"
    @close="showHistoryModal = false"
    @restore="onHistoryRestore"
  />
</template>
