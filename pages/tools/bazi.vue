<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { calculateBaZi, type BaZiResult, type BaZiPillar } from '~/composables/useBaZi'
import { calculateShenSha, type ShenSha } from '~/composables/useShenSha'
import { calculateLiuNian, type LiuNianYear } from '~/composables/useLiuNian'
import { WUXING_COLORS as ELEMENT_COLORS, getStemIndex } from '~/constants/bazi'
import { parseDate } from '~/utils/date'
import BaziGrid from '~/components/tools/bazi/BaziGrid.vue'
import BaziInfoSidebar from '~/components/tools/bazi/BaziInfoSidebar.vue'
import ElementAnalysis from '~/components/tools/bazi/ElementAnalysis.vue'
import DayMasterCard from '~/components/tools/bazi/DayMasterCard.vue'
import DaYunTimeline from '~/components/tools/bazi/DaYunTimeline.vue'
import ShenShaPanel from '~/components/tools/bazi/ShenShaPanel.vue'
import LiuNianTimeline from '~/components/tools/bazi/LiuNianTimeline.vue'
import InkDivider from '~/components/tools/InkDivider.vue'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import SkeletonBars from '~/components/tools/SkeletonBars.vue'

useHead({ title: '八字排盘 - 玄学' })

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
const showSaveErrorToast = ref(false)
const restoreError = ref('')
const restoredFromHistory = ref(false)
const historyRecords = ref<Array<{ id: number; type: string; input_data: any; created_at: string }>>([])
const showHistoryDropdown = ref(false)
const historyDropdownRef = ref<HTMLElement | null>(null)
const currentYear = new Date().getFullYear()

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})

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

  document.addEventListener('click', onClickOutside)
  computeResult()
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
  const age = getCurrentAge()
  return result.value.daYun.findIndex(c => age >= c.startAge && age <= c.endAge)
})

function computeResult() {
  if (!currentProfile.value?.birth_date) return

  loading.value = true
  error.value = ''

  // Reset shensha, liunian, and save state
  shenShaList.value = []
  liuNianYears.value = []
  savedDivinationId.value = null
  saveError.value = ''
  showHistoryDropdown.value = false
  showSaveErrorToast.value = false
  restoreError.value = ''
  restoredFromHistory.value = false

  const parsed = parseDate(currentProfile.value.birth_date)
  if (!parsed) { loading.value = false; return }
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
      gender,
    })

    // Compute liunian (with birth chart shensha for year-specific lookups)
    liuNianYears.value = calculateLiuNian({
      baZi: baziResult,
      shenSha: shenShaList.value,
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
          result_data: structuredClone(baziResult),
        },
      })
      savedDivinationId.value = saveRes.id
      saveError.value = ''
    }
  } catch (e: any) {
    saveError.value = e?.statusMessage || '保存失败'
    savedDivinationId.value = null
    showSaveErrorToast.value = true
  }
}

function dismissSaveErrorToast() {
  showSaveErrorToast.value = false
}

async function fetchHistory() {
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const records = await $fetch<Array<{ id: number; type: string; input_data: any; created_at: string }>>(
      '/api/divinations?type=bazi',
      { headers },
    )
    historyRecords.value = records.slice(0, 5)
  } catch {
    historyRecords.value = []
  }
}

async function restoreFromHistory(id: number) {
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const record = await $fetch<{ id: number; type: string; input_data: any; result_data: any; created_at: string }>(
      `/api/divinations/${id}`,
      { headers },
    )
    if (record.result_data) {
      result.value = record.result_data as BaZiResult

      // Re-compute shensha and liunian from restored result
      const dayMasterIndex = getStemIndex(result.value.dayMaster)
      shenShaList.value = calculateShenSha({
        yearPillar: result.value.yearPillar,
        monthPillar: result.value.monthPillar,
        dayPillar: result.value.dayPillar,
        hourPillar: result.value.hourPillar,
        dayMaster: result.value.dayMaster,
        dayMasterIndex,
        gender: result.value.gender,
      })
      liuNianYears.value = calculateLiuNian({
        baZi: result.value,
        shenSha: shenShaList.value,
        currentYear,
        range: 5,
      })
    }
    showHistoryDropdown.value = false
    restoreError.value = ''
    restoredFromHistory.value = true
  } catch {
    restoreError.value = '历史记录加载失败，请稍后重试'
  }
}

function dismissRestoreError() {
  restoreError.value = ''
}

function toggleHistoryDropdown() {
  showHistoryDropdown.value = !showHistoryDropdown.value
  if (showHistoryDropdown.value) {
    fetchHistory()
  }
}

function closeHistoryDropdown() {
  showHistoryDropdown.value = false
}

function onDropdownKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeHistoryDropdown()
    return
  }
  const menu = e.currentTarget as HTMLElement
  const items = menu.querySelectorAll<HTMLElement>('[role="menuitem"]')
  if (items.length === 0) return
  const currentIdx = Array.from(items).indexOf(document.activeElement as HTMLElement)

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    let nextIdx: number
    if (e.key === 'ArrowDown') {
      nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % items.length
    } else {
      nextIdx = currentIdx < 0 ? items.length - 1 : (currentIdx - 1 + items.length) % items.length
    }
    items[nextIdx].focus()
    return
  }

  if (e.key === 'Tab') {
    if (currentIdx < 0) return
    e.preventDefault()
    const nextIdx = e.shiftKey
      ? (currentIdx - 1 + items.length) % items.length
      : (currentIdx + 1) % items.length
    items[nextIdx].focus()
  }
}

function onClickOutside(e: MouseEvent) {
  if (historyDropdownRef.value && !historyDropdownRef.value.contains(e.target as Node)) {
    closeHistoryDropdown()
  }
}

function formatHistoryDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

function formatHistoryLabel(inputData: any): string {
  if (!inputData) return ''
  const { birthYear, birthMonth, birthDay, gender } = inputData
  let label = `${birthYear}-${String(birthMonth || '').padStart(2, '0')}-${String(birthDay || '').padStart(2, '0')}`
  if (gender) label += ` ${gender}`
  return label
}

const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const getAnimal = (year: number) => ANIMALS[((year - 4) % 12 + 12) % 12]

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
  const result: typeof deduped = []
  let xiongCount = 0
  for (const s of deduped) {
    if (s.category === '凶') {
      if (xiongCount >= 2) continue
      xiongCount++
    }
    result.push(s)
    if (result.length >= 5) break
  }
  return result
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

/** Element-to-life-area mapping from standard five element theory */
const ELEMENT_LIFE_AREA: Record<string, string> = {
  '木': '成长、学习、创造',
  '火': '行动、社交、热情',
  '土': '稳定、储蓄、规划',
  '金': '纪律、决策、果断',
  '水': '沟通、智慧、灵活',
}

/** Rule-based da yun meaning from the stem's ten god type */
function getDaYunMeaning(tenGod: string): string {
  const map: Record<string, string> = {
    '正官': '正官大运，事业运旺，利于建立规范与秩序',
    '偏官': '七杀大运，挑战与机遇并存，宜果断突破',
    '正财': '正财大运，财运稳定，利于积累与储蓄',
    '偏财': '偏财大运，偏财运佳，但需注意风险把控',
    '正印': '正印大运，学习运强，有贵人长辈提携',
    '偏印': '偏印大运，思维敏锐，适合钻研与内省',
    '食神': '食神大运，创造力旺盛，生活轻松愉悦',
    '伤官': '伤官大运，才华得以施展，但需注意言行分寸',
    '比肩': '比肩大运，竞争与协作并存，宜借助团队力量',
    '劫财': '劫财大运，需防范破财损耗，宜守不宜攻',
  }
  return map[tenGod] || `${tenGod}大运，宜顺势而为`
}
</script>

<template>
  <div class="ink-wash-bg min-h-screen">
    <div class="relative z-10">
      <ToolPageLayout>
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
            class="btn-seal inline-flex"
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
            <button
              @click="computeResult"
              @keydown.enter="computeResult"
              @keydown.space.prevent="computeResult"
              class="btn-seal"
            >
              <span>重新排盘</span>
            </button>
          </div>
        </div>

        <!-- Result -->
        <template v-else-if="result">
          <div class="max-w-2xl mx-auto" aria-live="polite" aria-atomic="true">
            <!-- Save error toast -->
            <Transition name="toast">
              <div
                v-if="showSaveErrorToast"
                class="mb-4 px-4 py-2.5 rounded-lg bg-cinnabar/5 border border-cinnabar/15 text-cinnabar text-sm flex items-center justify-between"
                role="alert"
              >
                <span>结果保存失败，稍后重试</span>
                <button
                  @click="dismissSaveErrorToast"
                  @keydown.enter="dismissSaveErrorToast"
                  @keydown.space.prevent="dismissSaveErrorToast"
                  class="ml-3 text-cinnabar/60 hover:text-cinnabar transition-colors text-lg leading-none"
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
                  class="ml-3 text-cinnabar/60 hover:text-cinnabar transition-colors text-lg leading-none"
                  aria-label="关闭提示"
                >&times;</button>
              </div>
            </Transition>

            <!-- Personal info summary (mobile/tablet only, desktop uses right sidebar) -->
            <div class="xl:hidden mb-6 p-4 sm:p-5 rounded-xl bg-cinnabar/3 border border-cinnabar/15">
              <div class="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-base">
                <div>
                  <span class="text-ink-light">出生</span>
                  <strong class="text-ink-dark ml-1">{{ result.birthYear }}年</strong>
                  <span class="text-ink-light ml-2">{{ result.birthCalendar === 'solar' ? '阳历' : '农历' }}</span>
                </div>
                <div>
                  <span class="text-ink-light">生肖</span>
                  <strong class="text-ink-dark ml-1">{{ animalName }}</strong>
                </div>
                <div v-if="result.gender">
                  <span class="text-ink-light">性别</span>
                  <strong class="text-ink-dark ml-1">{{ result.gender }}</strong>
                </div>
                <div>
                  <span class="text-ink-light">本命</span>
                  <strong class="text-cinnabar ml-1 font-display text-lg">{{ result.dayMaster }}{{ result.dayMasterWuxing }}</strong>
                </div>
                <div>
                  <span class="text-ink-light">力量</span>
                  <strong class="ml-1" :class="result.dayMasterStrength === '强' || result.dayMasterStrength === '偏强' ? 'text-cinnabar' : result.dayMasterStrength === '偏弱' || result.dayMasterStrength === '弱' ? 'text-wuxing-water' : 'text-gold'">{{ result.dayMasterStrength }}</strong>
                </div>
                <div>
                  <span class="text-ink-light">喜用神</span>
                  <span v-for="el in result.favorableElements" :key="el" class="ml-1 font-medium" :style="{ color: ELEMENT_COLORS[el] }">{{ el }}</span>
                </div>
                <div v-if="result.unfavorableElements.length">
                  <span class="text-ink-light">忌神</span>
                  <span v-for="el in result.unfavorableElements" :key="el" class="ml-1 opacity-60" :style="{ color: ELEMENT_COLORS[el] }">{{ el }}</span>
                </div>
              </div>
            </div>

            <!-- End: Personal info summary -->

            <!-- Anchor navigation -->
            <nav
              class="mb-6 flex flex-wrap gap-1.5 justify-center"
              aria-label="结果区块导航"
            >
              <a
                v-for="anchor in ['解读', '排盘', '神煞', '五行', '日主', '大运', '流年']"
                :key="anchor"
                :href="`#${({ '解读': 'reading-guide', '排盘': 'bazi-grid', '神煞': 'shensha', '五行': 'elements', '日主': 'day-master', '大运': 'dayun', '流年': 'liunian' })[anchor]}`"
                class="px-3 py-1 text-xs rounded-full font-sans border border-paper-dark/40 text-ink-medium hover:text-cinnabar hover:border-cinnabar/30 transition-colors no-underline"
                style="scroll-behavior: smooth"
              >{{ anchor }}</a>
            </nav>

            <!-- Reading Guide -->
            <div id="reading-guide" class="mb-8 p-5 sm:p-6 rounded-xl card-paper-solid border border-cinnabar/15 scroll-mt-20">
              <h3 class="font-display text-xl text-cinnabar mb-5 flex items-center gap-2">
                <span class="inline-block w-1.5 h-5 bg-cinnabar rounded-sm" aria-hidden="true"></span>
                你的八字解读
              </h3>

              <div class="space-y-5 font-sans text-base text-ink-medium leading-relaxed">
                <!-- Section 1: 命局总览 -->
                <div>
                  <h4 class="font-sans text-sm font-medium text-cinnabar/80 mb-2">命局总览</h4>
                  <p>
                    <strong class="text-ink-dark">你是{{ result.dayMaster }}{{ result.dayMasterWuxing }}命。</strong>
                    日主代表你自己——你出生那天的天干是「{{ result.dayMaster }}」，五行属「{{ result.dayMasterWuxing }}」。
                    命局整体力量<strong class="text-ink-dark">{{ result.dayMasterStrength }}</strong>。
                  </p>
                  <p class="mt-2">
                    五行之中，对你最有帮助的能量是
                    <strong class="text-cinnabar">{{ result.favorableElements.join('、') }}</strong>，
                    生活中可多接触这些元素相关的事物。
                    <template v-if="result.unfavorableElements.length > 0">
                      而<strong class="text-ink-dark">{{ result.unfavorableElements.join('、') }}</strong>与你相克，
                      适当平衡即可，不必刻意回避。
                    </template>
                  </p>
                </div>

                <!-- Section 2: 神煞精要 -->
                <div v-if="readingGuideShensha.length > 0">
                  <h4 class="font-sans text-sm font-medium text-cinnabar/80 mb-2">神煞精要</h4>
                  <div class="flex flex-wrap gap-2 mb-2">
                    <span
                      v-for="shen in readingGuideShensha"
                      :key="shen.name + shen.pillar"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      :class="{
                        'bg-wuxing-wood/10 text-wuxing-wood border border-wuxing-wood/25': shen.category === '吉',
                        'bg-cinnabar/5 text-cinnabar/80 border border-cinnabar/20': shen.category === '凶',
                        'bg-paper-dark/30 text-ink-medium border border-paper-dark/50': shen.category === '中性',
                      }"
                    >
                      <span class="font-display text-sm">{{ shen.name }}</span>
                      <span class="opacity-60 text-[0.65rem]">{{ shen.pillar }}</span>
                    </span>
                  </div>
                  <p class="text-sm">
                    <template v-for="(shen, i) in readingGuideShensha" :key="shen.name + shen.pillar">
                      <strong :class="shen.category === '吉' ? 'text-wuxing-wood' : shen.category === '凶' ? 'text-cinnabar/80' : 'text-ink-medium'">{{ shen.name }}</strong>（{{ shen.pillar }}）：{{ shen.description }}<template v-if="i < readingGuideShensha.length - 1">；</template>
                    </template>
                  </p>
                </div>

                <!-- Section 3: 今年运势 -->
                <div v-if="currentYearLiuNian">
                  <h4 class="font-sans text-sm font-medium text-cinnabar/80 mb-2">今年运势（{{ currentYearLiuNian.year }}年）</h4>
                  <div class="flex items-center gap-3 mb-2">
                    <span class="font-display text-lg text-ink-dark">{{ currentYearLiuNian.stem }}{{ currentYearLiuNian.branch }}</span>
                    <span class="px-2 py-0.5 rounded text-xs font-medium bg-paper-dark/30 text-ink-medium">{{ currentYearLiuNian.tenGod }}</span>
                    <span class="text-xs" :class="currentYearLiuNian.isFavorable ? 'text-wuxing-wood' : currentYearLiuNian.isUnfavorable ? 'text-cinnabar/80' : 'text-ink-light'">
                      {{ currentYearLiuNian.isFavorable ? '喜用' : currentYearLiuNian.isUnfavorable ? '忌神' : '中性' }}
                    </span>
                    <span class="ml-auto font-sans text-xs text-ink-light">运势评分 {{ currentYearLiuNian.score }}/100</span>
                  </div>
                  <p class="text-sm">{{ currentYearLiuNian.summary }}</p>
                  <div v-if="currentYearLiuNian.earthRelations.length > 0" class="mt-1.5">
                    <p class="text-xs text-ink-light">流年地支与命局关系：</p>
                    <ul class="mt-0.5 space-y-0.5 text-xs text-ink-medium">
                      <li v-for="(rel, i) in currentYearLiuNian.earthRelations" :key="i">
                        <span class="font-medium">{{ rel.targetPillar }}{{ rel.type }}</span>：{{ rel.description }}
                      </li>
                    </ul>
                  </div>
                  <p v-if="currentYearLiuNian.detail?.daYunInteraction" class="mt-1.5 text-xs text-ink-light">{{ currentYearLiuNian.detail.daYunInteraction }}</p>
                </div>

                <!-- Section 4: 当前大运 -->
                <div v-if="currentDaYun">
                  <h4 class="font-sans text-sm font-medium text-cinnabar/80 mb-2">当前大运</h4>
                  <div class="flex items-center gap-3 mb-1">
                    <span class="font-display text-lg text-ink-dark">{{ currentDaYun.stemBranch }}</span>
                    <span class="text-xs text-ink-light">{{ currentDaYun.startAge }}岁 - {{ currentDaYun.endAge }}岁</span>
                  </div>
                  <p class="text-sm">{{ currentDaYun.description }}，{{ getDaYunMeaning(currentDaYun.stemTenGod) }}</p>
                </div>

                <!-- Section 5: 五行建议 -->
                <div>
                  <h4 class="font-sans text-sm font-medium text-cinnabar/80 mb-2">五行建议</h4>
                  <p class="text-sm mb-2">
                    你的喜用神为<strong class="text-cinnabar">{{ result.favorableElements.join('、') }}</strong>，
                    生活中多接触与这些元素相关的事物有助于运势提升。
                  </p>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div v-for="el in result.favorableElements" :key="el" class="p-2 rounded-lg border" :style="{ borderColor: ELEMENT_COLORS[el] + '40', backgroundColor: ELEMENT_COLORS[el] + '08' }">
                      <span class="font-medium" :style="{ color: ELEMENT_COLORS[el] }">{{ el }}</span>
                      <span class="text-ink-light ml-1">{{ ELEMENT_LIFE_AREA[el] }}</span>
                    </div>
                  </div>
                  <template v-if="result.unfavorableElements.length > 0">
                    <p class="text-xs text-ink-light mt-2 mb-1">以下元素适度即可，不必刻意回避：</p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div v-for="el in result.unfavorableElements" :key="el" class="p-2 rounded-lg border border-paper-dark/40 bg-paper-dark/10">
                        <span class="font-medium text-ink-light">{{ el }}</span>
                        <span class="text-ink-faint ml-1">{{ ELEMENT_LIFE_AREA[el] }}</span>
                        <span class="text-ink-faint ml-1">（适度）</span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- Four Pillars Grid -->
            <div id="bazi-grid" class="scroll-mt-20">
            <BaziGrid :pillars="pillars" />
            </div>

            <!-- Hour missing notice -->
            <div v-if="missingHour" class="mt-4 p-4 rounded-lg bg-ink-faint/10 border border-ink-faint/30 text-center">
              <p class="font-sans text-base text-ink-medium">
                出生时辰未设置，时柱暂不显示。
                <NuxtLink :to="`/profile/${currentProfile?.id}`" class="text-cinnabar hover:underline">前往设置</NuxtLink>
              </p>
            </div>

            <!-- ShenSha Panel — delay 0.15s, shows derived markers after static pillars -->
            <div id="shensha" class="scroll-mt-20">
            <ShenShaPanel v-if="shenShaList.length > 0" :shen-sha="shenShaList" />
            </div>

            <!-- Element Analysis -->
            <div id="elements" class="scroll-mt-20">
            <ElementAnalysis
              :element-counts="result.elementCounts"
              :element-percentages="result.elementPercentages"
              :day-master="result.dayMaster"
              :day-master-wuxing="result.dayMasterWuxing"
              :day-master-strength="result.dayMasterStrength"
              :month-branch="result.monthPillar.branch"
            />
            </div>

            <!-- Day Master Card -->
            <div id="day-master" class="scroll-mt-20">
            <DayMasterCard
              :day-master="result.dayMaster"
              :day-master-wuxing="result.dayMasterWuxing"
              :day-master-strength="result.dayMasterStrength"
              :favorable-elements="result.favorableElements"
              :unfavorable-elements="result.unfavorableElements"
            />
            </div>

            <!-- Da Yun Timeline -->
            <div id="dayun" class="scroll-mt-20">
            <DaYunTimeline :cycles="result.daYun" :current-cycle-idx="currentDaYunIndex" />
            </div>

            <!-- LiuNian Timeline — delay 0.50s, annual analysis after macro da yun cycles -->
            <div id="liunian" class="scroll-mt-20">
            <LiuNianTimeline
              v-if="liuNianYears.length > 0"
              :years="liuNianYears"
              :current-year="currentYear"
              :range="5"
            />
            </div>

            <!-- Recalculate — only shown after history restore -->
            <div v-if="restoredFromHistory" class="flex flex-col items-center gap-2 mt-8">
              <p class="font-sans text-xs text-ink-light">当前显示的是历史记录</p>
              <button
                @click="computeResult"
                @keydown.enter="computeResult"
                @keydown.space.prevent="computeResult"
                class="btn-seal"
              >
                <span>重新排盘</span>
              </button>
            </div>

            <!-- Save status & History dropdown -->
            <div class="relative mt-6">
              <div class="flex items-center justify-center gap-3">
                <!-- Save status -->
                <span v-if="savedDivinationId" class="font-sans text-xs text-wuxing-wood">
                  已保存
                </span>

                <!-- History button -->
                <div class="relative">
                  <button
                    @click="toggleHistoryDropdown"
                    @keydown.enter="toggleHistoryDropdown"
                    @keydown.space.prevent="toggleHistoryDropdown"
                    class="font-sans text-xs text-ink-light hover:text-ink-medium transition-colors underline underline-offset-2"
                    aria-haspopup="menu"
                    :aria-expanded="showHistoryDropdown"
                  >
                    历史记录
                  </button>

                  <!-- Dropdown menu -->
                  <div
                    v-if="showHistoryDropdown"
                    ref="historyDropdownRef"
                    class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 rounded-lg border border-paper-dark bg-paper shadow-lg z-30"
                    role="menu"
                    @keydown="onDropdownKeydown"
                  >
                    <div class="p-2">
                      <p class="font-sans text-xs text-ink-light px-2 py-1">最近测算记录</p>
                      <div v-if="historyRecords.length === 0" class="px-2 py-3 text-center">
                        <p class="font-sans text-xs text-ink-faint">暂无记录</p>
                      </div>
                      <div v-else class="space-y-0.5">
                        <button
                          v-for="rec in historyRecords"
                          :key="rec.id"
                          class="w-full text-left px-2 py-1.5 rounded hover:bg-paper-lightest transition-colors"
                          role="menuitem"
                          @click="restoreFromHistory(rec.id)"
                          @keydown.enter="restoreFromHistory(rec.id)"
                          @keydown.space.prevent="restoreFromHistory(rec.id)"
                        >
                          <div class="font-sans text-xs text-ink-dark">
                            {{ formatHistoryDate(rec.created_at) }}
                          </div>
                          <div class="font-sans text-[0.65rem] text-ink-faint truncate">
                            {{ formatHistoryLabel(rec.input_data) }}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop fixed sidebar: positioned to the right of the centered content -->
          <BaziInfoSidebar
            class="hidden xl:block fixed top-20"
            style="left: calc(50% + 23rem); width: 14rem;"
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
      </ToolPageLayout>
    </div>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
