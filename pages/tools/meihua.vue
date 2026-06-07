<!-- 梅花易数 / Plum Blossom Yi Jing Divination -->

<script setup lang="ts">
import {
  calculateMeiHua,
  calculateMeiHuaFromDate,
  type MeiHuaResult,
  type MeiHuaInput,
  type InputMethod,
} from '~/composables/useMeiHua'
import { TRIGRAMS } from '~/constants/meihua'
import type { FetchError } from '~/types/errors'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import ProfileAutoFillBanner from '~/components/tools/ProfileAutoFillBanner.vue'
import { useProfileAutoFill } from '~/composables/useProfileAutoFill'
import MethodologyNote, { type ClassicalSource } from '~/components/tools/MethodologyNote.vue'

const { currentProfile, restoreSession, getAuthHeaders } = useAuth()
const router = useRouter()
useSeoMeta({
  title: '梅花易数 — 玄·道',
  ogTitle: '梅花易数 — 玄·道',
  description: '梅花易数占卜，通过数字起卦推演本卦互卦变卦，体用生克断吉凶。',
  ogDescription: '梅花易数占卜，通过数字起卦推演本卦互卦变卦，体用生克断吉凶。',
  ogType: 'website',
})

// ── Methodology data ──
const meihuaClassical: ClassicalSource[] = [
  { method: '梅花易数起卦法', source: '邵雍《梅花易数》（北宋），先天八卦数起卦体系' },
  { method: '体用生克判读', source: '邵雍《梅花易数》卷三，体用生克理论' },
  { method: '六十四卦卦辞·爻辞', source: '《周易》原文，《彖传》《象传》释义' },
]
const meihuaSynthesis: string[] = [
  '起卦：年月日时之和/8/6取余定上卦/下卦/动爻；随机数与手动数同理',
  '解卦三步骤：本卦（当前）/ 互卦（过程）/ 变卦（结果）',
  '体用生克：无动爻之卦为体（主体），有动爻之卦为用（客体）',
  '解读文本为规则模板 + 卦辞原文 + 白话解读，非 AI 生成',
]

// ── State ──
const result = ref<MeiHuaResult | null>(null)
const loading = ref(false)
const error = ref('')
const showScrollTop = ref(false)
const exportRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()
const showHistoryModal = ref(false)
const restoreError = ref<string | null>(null)
const restoreErrorTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Input state
const inputMethod = ref<InputMethod>('time')
const questionText = ref('')
const manualUpper = ref(3)
const manualLower = ref(5)
const manualMoving = ref(1)
const dateYear = ref(new Date().getFullYear())
const dateMonth = ref(new Date().getMonth() + 1)
const dateDay = ref(new Date().getDate())
const dateHour = ref(0)

const {
  showBanner,
  isFilled,
  birthData,
  missingBirth,
  checkAvailability,
  applyAutoFill,
  revokeAutoFill,
  markEdited,
} = useProfileAutoFill({ calendarNeeded: 'both' })

function handleAutoFill() {
  const data = applyAutoFill()
  if (data) {
    dateYear.value = data.year
    dateMonth.value = data.month
    dateDay.value = data.day
    if (data.hour != null) dateHour.value = data.hour
  }
}

function handleRevoke() {
  revokeAutoFill()
  const now = new Date()
  dateYear.value = now.getFullYear()
  dateMonth.value = now.getMonth() + 1
  dateDay.value = now.getDate()
  dateHour.value = 0
}

watch([dateYear, dateMonth, dateDay, dateHour], () => {
  if (isFilled.value && birthData.value) {
    const d = birthData.value
    if (dateYear.value !== d.year || dateMonth.value !== d.month || dateDay.value !== d.day) {
      markEdited()
    }
  }
})

function selectTab(method: InputMethod) {
  inputMethod.value = method
  result.value = null
  error.value = ''
}

// Hour name mapping
const HOUR_LABELS = [
  '子时 (23-01)',
  '丑时 (01-03)',
  '寅时 (03-05)',
  '卯时 (05-07)',
  '辰时 (07-09)',
  '巳时 (09-11)',
  '午时 (11-13)',
  '未时 (13-15)',
  '申时 (15-17)',
  '酉时 (17-19)',
  '戌时 (19-21)',
  '亥时 (21-23)',
]

// ── Unified compute ──
function compute() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    let input: MeiHuaInput
    if (inputMethod.value === 'time') {
      if (dateMonth.value < 1 || dateMonth.value > 12) {
        throw new Error('月份应在 1-12 之间')
      }
      if (dateDay.value < 1 || dateDay.value > 31) {
        throw new Error('日期应在 1-31 之间')
      }
      const res = calculateMeiHuaFromDate(
        dateYear.value,
        dateMonth.value,
        dateDay.value,
        dateHour.value,
      )
      result.value = res
      tryAutoSave(res)
    } else if (inputMethod.value === 'manual') {
      if (manualUpper.value < 1 || manualUpper.value > 999) {
        throw new Error('上卦数应在 1-999 之间')
      }
      if (manualLower.value < 1 || manualLower.value > 999) {
        throw new Error('下卦数应在 1-999 之间')
      }
      if (manualMoving.value < 1 || manualMoving.value > 999) {
        throw new Error('动爻数应在 1-999 之间')
      }
      input = {
        upperNumber: manualUpper.value,
        lowerNumber: manualLower.value,
        movingNumber: manualMoving.value,
        method: 'manual',
        question: questionText.value || undefined,
      }
      const res = calculateMeiHua(input)
      result.value = res
      tryAutoSave(res)
    } else {
      const upperNum = Math.floor(Math.random() * 999) + 1
      const lowerNum = Math.floor(Math.random() * 999) + 1
      const movingNum = Math.floor(Math.random() * 999) + 1
      manualUpper.value = upperNum
      manualLower.value = lowerNum
      manualMoving.value = movingNum
      input = {
        upperNumber: upperNum,
        lowerNumber: lowerNum,
        movingNumber: movingNum,
        method: 'random',
        question: questionText.value || undefined,
      }
      const res = calculateMeiHua(input)
      result.value = res
      tryAutoSave(res)
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '起卦出错，请重试'
  } finally {
    loading.value = false
  }
}

// ── Auto-save ──
async function tryAutoSave(res: MeiHuaResult) {
  try {
    const h = getAuthHeaders()
    if (!h.Authorization) return
    await $fetch('/api/divinations', {
      method: 'POST',
      headers: h,
      body: {
        type: 'meihua',
        input_data: {
          method: res.input.method,
          upperNumber: res.input.upperNumber,
          lowerNumber: res.input.lowerNumber,
          movingNumber: res.input.movingNumber,
          question: res.input.question,
        },
        result_data: JSON.parse(JSON.stringify(res)),
      },
    })
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'statusCode' in e) {
      const code = (e as FetchError).statusCode
      if (code === 401 || code === 429) return
    }
    // eslint-disable-next-line no-console
    console.error('保存历史记录失败:', e)
  }
}

// ── History restore ──
async function onHistoryRestore(id: number) {
  showHistoryModal.value = false
  try {
    const h = getAuthHeaders()
    if (!h.Authorization) return
    const record = await $fetch<import('~/server/api/divinations/shared').DivinationDetailResponse>(
      '/api/divinations/' + id,
      { headers: h },
    )
    if (
      record.result_data &&
      typeof record.result_data === 'object' &&
      'benGua' in (record.result_data as Record<string, unknown>)
    ) {
      result.value = record.result_data as MeiHuaResult
      restoreError.value = ''
    } else {
      restoreError.value = '数据无效'
      if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
      restoreErrorTimer.value = setTimeout(() => {
        restoreError.value = ''
      }, 6000)
    }
  } catch {
    restoreError.value = '加载失败'
    if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
    restoreErrorTimer.value = setTimeout(() => {
      restoreError.value = ''
    }, 6000)
  }
}

function dismissRestoreError() {
  restoreError.value = ''
}
function resetToForm() {
  result.value = null
  error.value = ''
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ── Trigram display helpers ──
function getTrigramSymbol(num: number): string {
  const t = TRIGRAMS[num]
  return t ? t.symbol : ''
}

function getTiYongColor(r: string): string {
  if (r === '吉') return 'var(--color-cinnabar)'
  if (r === '凶') return 'var(--color-ink-muted)'
  return 'var(--color-gold)'
}

const tiYongResultLabel: Record<string, string> = {
  比和: '比和 — 吉',
  用生体: '用生体 — 吉',
  体克用: '体克用 — 吉',
  体生用: '体生用 — 平',
  用克体: '用克体 — 凶',
}

const tiyongRelationArrow = computed(() => {
  if (!result.value) return ''
  const r = result.value.tiYong.relation
  if (r === '体生用') return '→' // ti generates yong
  if (r === '用生体') return '←' // yong generates ti
  if (r === '体克用') return '⇢' // ti controls yong
  if (r === '用克体') return '⇠' // yong controls ti
  return '↔' // bi he
})

// ── Scroll handling ──
function handleScroll() {
  showScrollTop.value = window.scrollY > 300
}
function scrollToTop() {
  const p = import.meta.client
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  if (!p) window.scrollTo({ top: 0, behavior: 'smooth' })
  else window.scrollTo({ top: 0 })
}
function handleExport() {
  if (exportRef.value) exportToImage(exportRef.value, '梅花易数.png')
}

onMounted(async () => {
  await restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }
  checkAvailability()
  window.addEventListener('scroll', handleScroll, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
})
</script>

<template>
  <ToolPageLayout>
    <h1 class="sr-only">梅花易数</h1>
    <div role="status" class="sr-only" aria-live="polite">
      {{ loading ? '正在起卦...' : result ? '卦象已就绪' : '' }}
    </div>
    <div class="max-w-[48rem] mx-auto">
      <ToolToolbar v-if="!missingBirth" :show-history="true" @history="showHistoryModal = true">
        <template #extra>
          <ExportButton
            v-if="result"
            :target-ref="exportRef"
            filename="梅花易数.png"
            :is-exporting="isExporting"
            @export="handleExport"
          />
        </template>
      </ToolToolbar>

      <!-- Input card -->

      <ProfileAutoFillBanner
        v-if="showBanner || missingBirth"
        :profile-name="birthData?.profileName || ''"
        :is-filled="isFilled"
        :missing-birth="missingBirth"
        :profile-id="currentProfile?.id"
        :conversion-note="birthData?.conversionNote"
        @fill="handleAutoFill"
        @revoke="handleRevoke"
      />

      <div
        v-if="!missingBirth"
        class="fade-in card-paper-solid rounded-xl p-8"
        :style="{ '--delay': '0.1s' }"
      >
        <div class="flex items-center justify-between mb-6">
          <div class="section-header flex-1 min-w-0 !mb-0"><h2>梅花易数</h2></div>
          <MethodologyNote
            :classical="meihuaClassical"
            :synthesis="meihuaSynthesis"
            tool="梅花易数"
          />
        </div>
        <p class="text-xs text-ink-medium mb-6 tracking-wide">
          选择起卦方式，依先天八卦数推算吉凶悔吝。
        </p>

        <!-- Method tabs -->
        <div class="flex flex-wrap gap-2 mb-6 border-b border-ink-darkest/6 pb-3">
          <button
            v-for="tab in [
              { value: 'time' as InputMethod, label: '时间起卦' },
              { value: 'manual' as InputMethod, label: '数字起卦' },
              { value: 'random' as InputMethod, label: '随机起卦' },
            ]"
            :key="tab.value"
            class="meihua-tab"
            :class="inputMethod === tab.value ? 'meihua-tab--active' : ''"
            @click="selectTab(tab.value)"
            @keydown.enter="selectTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Time input -->
        <div
          v-if="inputMethod === 'time'"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6"
        >
          <div>
            <label for="mh-year" class="input-label">年</label
            ><input
              id="mh-year"
              v-model.number="dateYear"
              type="number"
              class="input-ink w-full"
              min="1900"
              :max="new Date().getFullYear()"
            />
          </div>
          <div>
            <label for="mh-month" class="input-label">月</label
            ><input
              id="mh-month"
              v-model.number="dateMonth"
              type="number"
              class="input-ink w-full"
              min="1"
              max="12"
            />
          </div>
          <div>
            <label for="mh-day" class="input-label">日</label
            ><input
              id="mh-day"
              v-model.number="dateDay"
              type="number"
              class="input-ink w-full"
              min="1"
              max="31"
            />
          </div>
          <div>
            <label for="mh-hour" class="input-label">时辰</label
            ><select
              id="mh-hour"
              v-model.number="dateHour"
              class="input-ink w-full appearance-none"
            >
              <option v-for="(label, i) in HOUR_LABELS" :key="i" :value="i">{{ label }}</option>
            </select>
          </div>
        </div>

        <!-- Manual input -->
        <div v-if="inputMethod === 'manual'" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label for="mh-upper" class="input-label">上卦数 (1-999)</label
            ><input
              id="mh-upper"
              v-model.number="manualUpper"
              type="number"
              class="input-ink w-full"
              min="1"
              max="999"
            />
          </div>
          <div>
            <label for="mh-lower" class="input-label">下卦数 (1-999)</label
            ><input
              id="mh-lower"
              v-model.number="manualLower"
              type="number"
              class="input-ink w-full"
              min="1"
              max="999"
            />
          </div>
          <div>
            <label for="mh-moving" class="input-label">动爻数 (1-999)</label
            ><input
              id="mh-moving"
              v-model.number="manualMoving"
              type="number"
              class="input-ink w-full"
              min="1"
              max="999"
            />
          </div>
        </div>

        <!-- Random description -->
        <div v-if="inputMethod === 'random'" class="mb-6 text-xs text-ink-medium">
          <p>随机起卦将自动生成三个随机数作为上卦数、下卦数和动爻数，依梅花易数法则推演卦象。</p>
        </div>

        <!-- Question input -->
        <div class="mb-6">
          <label for="mh-question" class="input-label">所求之事（可选）</label
          ><input
            id="mh-question"
            v-model="questionText"
            type="text"
            class="input-ink w-full"
            placeholder="如：事业发展如何？"
            maxlength="100"
          />
        </div>

        <!-- Buttons -->
        <div class="flex justify-center items-center gap-4">
          <button :disabled="loading" class="btn-seal" @click="compute" @keydown.enter="compute">
            <span>{{ loading ? '推演中...' : '开始起卦' }}</span>
          </button>
          <button v-if="result" class="btn-ink" @click="resetToForm" @keydown.enter="resetToForm">
            <span>重新起卦</span>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mt-4 text-center">
        <p class="text-sm text-cinnabar" role="alert">{{ error }}</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="mt-6 space-y-4" aria-busy="true">
        <span class="sr-only">正在计算...</span><SkeletonCard />
      </div>

      <!-- Results -->
      <template v-if="result">
        <div ref="exportRef" class="mt-8 space-y-6">
          <!-- Hexagram trio -->
          <div class="meihua-hexagrams">
            <div class="fade-in hexagram-card" :style="{ '--delay': '0.15s' }">
              <div class="hexagram-card__label">本卦</div>
              <div class="hexagram-card__subtitle">当前状态</div>
              <div class="hexagram-card__symbols">
                <div class="hexagram-card__trigram">
                  {{ getTrigramSymbol(result.benGua.upperTrigram) }}
                </div>
                <div class="hexagram-card__trigram">
                  {{ getTrigramSymbol(result.benGua.lowerTrigram) }}
                </div>
              </div>
              <div class="hexagram-card__name">{{ result.benGua.hexagramName }}</div>
            </div>
            <div class="hexagram-arrow">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </div>
            <div class="fade-in hexagram-card" :style="{ '--delay': '0.25s' }">
              <div class="hexagram-card__label">互卦</div>
              <div class="hexagram-card__subtitle">发展过程</div>
              <div class="hexagram-card__symbols">
                <div class="hexagram-card__trigram">
                  {{ getTrigramSymbol(result.huGua.upperTrigram) }}
                </div>
                <div class="hexagram-card__trigram">
                  {{ getTrigramSymbol(result.huGua.lowerTrigram) }}
                </div>
              </div>
              <div class="hexagram-card__name">{{ result.huGua.hexagramName }}</div>
            </div>
            <div class="hexagram-arrow">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </div>
            <div
              class="fade-in hexagram-card hexagram-card--changing"
              :style="{ '--delay': '0.35s' }"
            >
              <div class="hexagram-card__label">变卦</div>
              <div class="hexagram-card__subtitle">发展趋势</div>
              <div class="hexagram-card__symbols">
                <div class="hexagram-card__trigram">
                  {{ getTrigramSymbol(result.bianGua.upperTrigram) }}
                </div>
                <div class="hexagram-card__trigram">
                  {{ getTrigramSymbol(result.bianGua.lowerTrigram) }}
                </div>
              </div>
              <div class="hexagram-card__name">{{ result.bianGua.hexagramName }}</div>
              <div class="hexagram-card__line">第{{ result.bianGua.movingLine }}爻动</div>
            </div>
          </div>

          <!-- Ti-Yong analysis -->
          <div class="fade-in card-warm rounded-xl p-6" :style="{ '--delay': '0.4s' }">
            <div class="section-header !mb-4"><h2>体用生克分析</h2></div>
            <div class="tiyong-grid">
              <div class="tiyong-card">
                <span class="tiyong-card__label">体卦 (体)</span
                ><span class="tiyong-card__symbol">{{ getTrigramSymbol(result.tiYong.tiGua) }}</span
                ><span class="tiyong-card__name">{{
                  TRIGRAMS[result.tiYong.tiGua]?.name || ''
                }}</span
                ><span class="tiyong-card__wx">{{
                  TRIGRAMS[result.tiYong.tiGua]?.wuxing || ''
                }}</span>
              </div>
              <div class="tiyong-relation">
                <div class="tiyong-relation__arrow">{{ tiyongRelationArrow }}</div>
                <div class="tiyong-relation__label">{{ result.tiYong.relation }}</div>
                <div
                  class="tiyong-relation__result"
                  :style="{ color: getTiYongColor(result.tiYong.result) }"
                >
                  {{ tiYongResultLabel[result.tiYong.relation] || result.tiYong.relation }}
                </div>
              </div>
              <div class="tiyong-card">
                <span class="tiyong-card__label">用卦 (用)</span
                ><span class="tiyong-card__symbol">{{
                  getTrigramSymbol(result.tiYong.yongGua)
                }}</span
                ><span class="tiyong-card__name">{{
                  TRIGRAMS[result.tiYong.yongGua]?.name || ''
                }}</span
                ><span class="tiyong-card__wx">{{
                  TRIGRAMS[result.tiYong.yongGua]?.wuxing || ''
                }}</span>
              </div>
            </div>
            <p class="mt-4 text-xs text-ink-medium leading-relaxed">
              {{ result.tiYong.description }}
            </p>
          </div>

          <!-- 白话解读 — 符纸叙事卷 -->
          <div class="fade-in mt-6 meihua-slip" :style="{ '--delay': '0.5s' }">
            <!-- Header: trigram + title + trigram -->
            <div class="meihua-slip__header">
              <span class="meihua-slip__trigram">☰</span>
              <span class="meihua-slip__seal-mark">白 话 解 读</span>
              <span class="meihua-slip__trigram">☷</span>
            </div>

            <div class="meihua-slip__divider"></div>

            <!-- Section 1: 本卦 -->
            <div class="meihua-slip__section">
              <h3 class="meihua-slip__section-title">{{ result.benGua.hexagramName }}</h3>
              <p class="meihua-slip__poem-text">{{ result.benGua.judgment }}</p>
              <p class="meihua-slip__text">{{ result.benGua.interpretation }}</p>
            </div>

            <div class="meihua-slip__divider"></div>

            <!-- Section 2: 动爻 -->
            <div class="meihua-slip__section">
              <h3 class="meihua-slip__section-title">动爻 · 第{{ result.bianGua.movingLine }}爻</h3>
              <p class="meihua-slip__poem-text">
                {{ result.bianGua.lineStatement || '（无爻辞）' }}
              </p>
            </div>

            <div class="meihua-slip__divider"></div>

            <!-- Section 3: 综合解卦 -->
            <div class="meihua-slip__section">
              <h3 class="meihua-slip__section-title">综合解卦</h3>
              <p class="meihua-slip__text">
                {{ result.benGua.hexagramName }}之卦，{{ result.benGua.interpretation }}
              </p>
              <p class="meihua-slip__text mt-2">
                互卦{{
                  result.huGua.hexagramName
                }}，由本卦中间四爻演化而来，表示事物发展过程中的内在变化。
              </p>
              <p class="meihua-slip__text mt-2">
                变卦{{ result.bianGua.hexagramName }}，因第{{
                  result.bianGua.movingLine
                }}爻动而变。{{ result.bianGua.lineStatement || '' }}
              </p>
              <p class="meihua-slip__text mt-2">
                体用关系：{{ result.tiYong.relation }}。{{ result.tiYong.description }}
              </p>
            </div>

            <!-- Footer seal -->
            <div class="meihua-slip__footer">
              <div class="meihua-slip__footer-line"></div>
              <span class="meihua-slip__footer-seal">玄·道</span>
              <div class="meihua-slip__footer-line"></div>
            </div>
          </div>

          <!-- Reset -->
          <div class="text-center mt-6 pb-8">
            <button class="btn-ink" @click="resetToForm" @keydown.enter="resetToForm">
              <span>⟲ 重新起卦</span>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="restoreError" class="toast-notification" role="alert">
        <span class="toast-notification__mark">!</span>
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

    <HistoryModal
      :show="showHistoryModal"
      type="meihua"
      @close="showHistoryModal = false"
      @restore="onHistoryRestore"
    />
    <ScrollTopButton
      v-if="showScrollTop"
      @click="scrollToTop"
      @keydown.enter="scrollToTop"
      @keydown.space.prevent="scrollToTop"
    />
  </ToolPageLayout>
</template>

<style scoped>
.meihua-tab {
  padding: 0.375rem 1rem;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-medium);
  border: 1px solid transparent;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
}
.meihua-tab:hover {
  color: var(--color-ink-dark);
  background: color-mix(in oklch, var(--color-ink-darkest) 3%, transparent);
}
.meihua-tab--active {
  color: var(--color-cinnabar);
  border-color: color-mix(in oklch, var(--color-cinnabar) 20%, transparent);
  background: color-mix(in oklch, var(--color-cinnabar) 5%, transparent);
}
.meihua-hexagrams {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;
}
.meihua-hexagrams::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: color-mix(in oklch, var(--color-cinnabar) 12%, transparent);
  z-index: 0;
}
@media (max-width: 640px) {
  .meihua-hexagrams {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .meihua-hexagrams::before {
    top: 0;
    bottom: 0;
    left: 50%;
    right: auto;
    width: 1px;
    height: auto;
  }
  .hexagram-arrow {
    transform: rotate(90deg);
  }
}
.hexagram-card {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 1.25rem 0.75rem;
  border-radius: 0.75rem;
  background: var(--color-paper);
  border: 1px solid color-mix(in oklch, var(--color-ink-darkest) 6%, transparent);
  box-shadow: 0 1px 3px color-mix(in oklch, var(--color-ink-darkest) 4%, transparent);
}
.hexagram-card--changing {
  border-color: color-mix(in oklch, var(--color-cinnabar) 15%, transparent);
  background: color-mix(in oklch, var(--color-cinnabar) 2%, var(--color-paper));
}
.hexagram-card__label {
  font-family: var(--font-display);
  font-size: 0.8125rem;
  color: var(--color-cinnabar);
  letter-spacing: 0.15em;
  margin-bottom: 0.15rem;
}
.hexagram-card__subtitle {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  margin-bottom: 0.75rem;
}
.hexagram-card__symbols {
  font-size: 2.5rem;
  line-height: 1.2;
  color: var(--color-ink-darkest);
}
@media (max-width: 640px) {
  .hexagram-card__symbols {
    font-size: 1.75rem;
  }
}
.hexagram-card__trigram {
  display: block;
}
.hexagram-card__name {
  font-family: var(--font-display);
  font-size: 1rem;
  color: var(--color-ink-dark);
  margin-top: 0.5rem;
  letter-spacing: 0.08em;
}
.hexagram-card__line {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-cinnabar);
  margin-top: 0.25rem;
}
.hexagram-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-light);
}
.tiyong-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
}
@media (max-width: 640px) {
  .tiyong-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}
.tiyong-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: color-mix(in oklch, var(--color-ink-darkest) 4%, transparent);
}
.tiyong-relation__arrow {
  font-size: 1.5rem;
  line-height: 1;
  color: var(--color-cinnabar);
  animation: pulse-arrow 2s ease-in-out infinite;
}
@keyframes pulse-arrow {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}
.tiyong-card__label {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  letter-spacing: 0.1em;
}
.tiyong-card__symbol {
  font-size: 1.5rem;
  line-height: 1;
}
.tiyong-card__name {
  font-family: var(--font-display);
  font-size: 0.875rem;
  color: var(--color-ink-dark);
}
.tiyong-card__wx {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-medium);
}
.tiyong-relation {
  text-align: center;
}
.tiyong-relation__label {
  font-family: var(--font-display);
  font-size: 1.125rem;
  color: var(--color-ink-darkest);
  letter-spacing: 0.15em;
  margin-bottom: 0.25rem;
}
.tiyong-relation__result {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}
/* ── 梅花符纸叙事卷 ── */
.meihua-slip {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  padding: 2rem 1.5rem;
  background: linear-gradient(
    175deg,
    var(--color-scroll-light) 0%,
    var(--color-scroll) 30%,
    var(--color-scroll-dark) 100%
  );
  border: 1px solid color-mix(in oklch, var(--color-cinnabar) 6%, transparent);
  box-shadow:
    0 1px 3px color-mix(in oklch, var(--color-ink-darkest) 4%, transparent),
    0 8px 24px color-mix(in oklch, var(--color-ink-darkest) 3%, transparent),
    inset 0 0 80px color-mix(in oklch, var(--color-cinnabar) 1.5%, transparent);
}
.meihua-slip::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      ellipse at 15% 85%,
      color-mix(in oklch, var(--color-ink-darkest) 1.5%, transparent) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse at 85% 20%,
      color-mix(in oklch, var(--color-cinnabar) 1%, transparent) 0%,
      transparent 50%
    );
  opacity: 0.5;
  z-index: 0;
}
.meihua-slip > * {
  position: relative;
  z-index: 1;
}
@media (min-width: 640px) {
  .meihua-slip {
    padding: 2.5rem 2rem;
  }
}
.meihua-slip__header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.meihua-slip__trigram {
  font-size: 1rem;
  color: color-mix(in oklch, var(--color-cinnabar) 20%, transparent);
}
.meihua-slip__seal-mark {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 1rem;
  border-radius: 3px;
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--color-cinnabar);
  letter-spacing: 0.2em;
  background: color-mix(in oklch, var(--color-cinnabar) 4%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-cinnabar) 10%, transparent);
  transform: rotate(-1deg);
}
.meihua-slip__divider {
  width: 100%;
  height: 1px;
  margin: 0.75rem 0;
  background: repeating-linear-gradient(
    90deg,
    color-mix(in oklch, var(--color-ink-darkest) 6%, transparent) 0px,
    color-mix(in oklch, var(--color-ink-darkest) 6%, transparent) 6px,
    transparent 6px,
    transparent 12px
  );
}
.meihua-slip__section {
  padding: 0.75rem 0;
}
.meihua-slip__poem-text {
  font-family: var(--font-display);
  font-size: 1.1rem;
  line-height: 1.9;
  color: var(--color-ink-darkest);
  letter-spacing: 0.08em;
}
@media (min-width: 640px) {
  .meihua-slip__poem-text {
    font-size: 1.25rem;
  }
}
.meihua-slip__section-title {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink-dark);
  letter-spacing: 0.12em;
  margin-bottom: 0.5rem;
  position: relative;
  padding-left: 0.75rem;
}
.meihua-slip__section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0.75rem;
  background: color-mix(in oklch, var(--color-cinnabar) 30%, transparent);
  border-radius: 2px;
}
.meihua-slip__text {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-medium);
  line-height: 1.8;
  letter-spacing: 0.03em;
  white-space: pre-line;
}
.meihua-slip__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 0.75rem;
}
.meihua-slip__footer-line {
  flex: 1;
  height: 1px;
  background: color-mix(in oklch, var(--color-ink-darkest) 6%, transparent);
}
.meihua-slip__footer-seal {
  font-family: var(--font-display);
  font-size: 0.75rem;
  color: color-mix(in oklch, var(--color-cinnabar) 40%, transparent);
  letter-spacing: 0.3em;
}
</style>
