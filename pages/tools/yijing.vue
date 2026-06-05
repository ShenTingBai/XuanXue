<template>
  <ToolPageLayout>
      <h1 class="sr-only">六爻占卜</h1>

      <div class="max-w-[48rem] mx-auto">
        <!-- Toolbar: always visible for back navigation -->
        <ToolToolbar :show-history="true" @history="showHistoryModal = true">
          <template #extra>
            <ExportButton
              v-if="result && !processing"
              :target-ref="exportRef"
              filename="六爻卦象.png"
              :is-exporting="isExporting"
              @export="handleExport"
            />
          </template>
        </ToolToolbar>

        <!-- Casting panel -->
        <YijingCastingPanel
          :mode="castingMode"
          :current-toss="currentToss"
          :coin-results="coinResults"
          :processing="processing"
          @toss="handleToss"
          @cast-number="handleCastNumber"
          @reset="requestReset"
          @update:mode="castingMode = $event"
        />

        <!-- Loading / processing -->
        <div v-if="processing" class="space-y-6" aria-busy="true">
          <span class="sr-only">正在加载...</span>
          <SkeletonCard />
        </div>

        <!-- Error -->
        <div v-else-if="error" class="text-center py-16">
          <p class="font-sans text-base text-cinnabar" role="alert">{{ error }}</p>
          <div class="flex justify-center mt-6">
            <button @click="handleReset" class="btn-cin">
              <span>重新起卦</span>
            </button>
          </div>
        </div>

        <div aria-live="polite" role="status" class="sr-only">
          <span v-if="processing">解卦中，请稍候</span>
          <span v-else-if="result">卦象已就绪</span>
        </div>

        <!-- Reset confirmation dialog -->
        <Transition name="confirm-dialog">
          <div
            ref="confirmDialogRef"
            v-if="showResetConfirm"
            class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/20 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="确认重新起卦"
            @keydown.escape="cancelReset"
            @keydown.tab="handleDialogTab"
          >
            <div class="card-warm rounded-xl p-8 max-w-sm mx-4 shadow-xl border border-paper-dark">
              <p class="font-sans text-base text-ink-dark mb-2">确定要重新起卦吗？</p>
              <p class="font-sans text-sm text-ink-medium mb-6">当前已完成 {{ currentToss }}/6 次摇卦，重新起卦将丢失已有结果。</p>
              <div class="flex gap-3 justify-end">
                <button
                  class="btn-ghost text-sm"
                  @click="cancelReset"
                  @keydown.enter="cancelReset"
                >继续摇卦</button>
                <button
                  class="btn-cin"
                  @click="confirmReset"
                  @keydown.enter="confirmReset"
                >确定重新起卦</button>
              </div>
            </div>
          </div>
        </Transition>

        <div v-if="result && !processing" class="flex items-center justify-between">
          <div class="section-header">
            <h2>占卜结果</h2>
          </div>
          <MethodologyNote
            :classical="yijingClassical"
            :synthesis="yijingSynthesis"
            tool="六爻"
          />
        </div>

        <!-- Results -->
        <div ref="resultSection" v-if="result && !processing" class="mt-8">
          <div ref="exportRef">
          <YijingInterpretation :result="result" :score="score" />
          </div>

          <!-- Auto-save is fire-and-forget, failures are silent -->

          <!-- Reset -->
          <div class="text-center mt-6 pb-8">
            <button
              class="btn-ink"
              @click="requestReset"
              @keydown.enter="requestReset"
              @keydown.space.prevent="requestReset"
            >
              ⟲ 重新占卜
            </button>
          </div>

          <EntertainmentDisclaimer />
        </div>

          <HistoryModal
            :show="showHistoryModal"
            type="yijing"
            @close="showHistoryModal = false"
            @restore="onHistoryRestore"
          />
        <ScrollTopButton
          v-if="showScrollTop"
          class="right-8"
          @click="scrollToTop"
          @keydown.enter="scrollToTop"
        />
      </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import {
  castByNumbers,
  computeYijingResult,
  type YijingResult,
} from '~/composables/useYijing'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import YijingCastingPanel from '~/components/tools/yijing/YijingCastingPanel.vue'
import YijingInterpretation from '~/components/tools/yijing/YijingInterpretation.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import EntertainmentDisclaimer from '~/components/tools/EntertainmentDisclaimer.vue'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import MethodologyNote, { type ClassicalSource } from '~/components/tools/MethodologyNote.vue'

const { currentProfile, restoreSession, getAuthHeaders } = useAuth()
useHead({ title: '六爻占卜 — 玄·道' })

// ── Methodology data ──
const yijingClassical: ClassicalSource[] = [
  { method: '六爻纳甲法', source: '京房《京氏易传》（西汉），八宫卦变法 + 世应定位' },
  { method: '六十四卦卦序·卦辞·爻辞', source: '《周易》原文，《彖传》《象传》释义' },
  { method: '六亲配法', source: '京房纳甲六亲体系，以宫卦五行为我，定父母/兄弟/官鬼/妻财/子孙' },
  { method: '六神配法', source: '《卜筮正宗》《增删卜易》，以日干定青龙/朱雀/勾陈/螣蛇/白虎/玄武' },
]
const yijingSynthesis: string[] = [
  '世应定位算法（八宫卦序→世爻规律：6,1,2,3,4,5,4,3）',
  '评分模型：基础 50 + 卦辞吉凶(±20) + 爻动吉凶(±15) + 世应关系(±15)，压缩至 0-100',
  '解读文本为规则模板拼接（卦辞 + 爻辞 + 世应 + 六亲动向 + 综合建议），非 AI 生成',
  '互卦由本卦 2-3-4 爻为下卦、3-4-5 爻为上卦组成',
  '变卦（之卦）由本卦动爻阴阳反转生成',
]

// State
const castingMode = ref<'coin' | 'number'>('coin')
const coinResults = ref<number[][]>([])
const currentToss = ref(0)
const result = ref<YijingResult | null>(null)
const score = ref(0)
const processing = ref(false)
const error = ref('')
const showScrollTop = ref(false)
const showResetConfirm = ref(false)
const showHistoryModal = ref(false)
const resultSection = ref<HTMLElement | null>(null)
const exportRef = ref<HTMLElement | null>(null)
const confirmDialogRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()

function handleExport() {
  if (exportRef.value) {
    exportToImage(exportRef.value, '六爻卦象.png')
  }
}

// Timer refs for setTimeout cleanup
const coinTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const numberTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const router = useRouter()

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

// Coin casting
function handleToss() {
  if (processing.value) return
  // Cast once
  const singleToss: number[] = []
  for (let j = 0; j < 3; j++) {
    singleToss.push(Math.random() < 0.5 ? 2 : 3)
  }

  // Store individual coin values for display
  const newResults = [...coinResults.value, singleToss]
  coinResults.value = newResults
  currentToss.value++

  // When 6 tosses complete, auto-compute result
  if (currentToss.value === 6) {
    handleCoinAutoResult()
  }
}

function handleCoinAutoResult() {
  processing.value = true

  // Store timer ref for cleanup
  coinTimer.value = setTimeout(() => {
    coinTimer.value = null
    try {
      // Build 6 values from toss results (sum of each toss = line value)
      const values = coinResults.value.map(toss => toss[0] + toss[1] + toss[2])

      // Compute full Yijing result
      const yijingResult = computeYijingResult(values)
      result.value = yijingResult
      score.value = yijingResult.score

      // Silent auto-save placeholder
      tryAutoSave(values, yijingResult)
    } catch (err) {
      error.value = '解卦出错，请重新尝试。'
    } finally {
      processing.value = false
      nextTick(() => {
        resultSection.value?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, 400)
}

// Number casting
function handleCastNumber(data: { first: number; second: number; third: number }) {
  if (processing.value) return
  castingMode.value = 'number'
  processing.value = true

  numberTimer.value = setTimeout(() => {
    numberTimer.value = null
    try {
      const { values } = castByNumbers(data.first, data.second, data.third)

      // Set coin results to empty (not used in number mode)
      coinResults.value = []
      currentToss.value = 6 // Mark as complete

      const yijingResult = computeYijingResult(values)
      result.value = yijingResult
      score.value = yijingResult.score

      tryAutoSave(values, yijingResult)
    } catch (err) {
      error.value = '解卦出错，请检查输入后重新尝试。'
    } finally {
      processing.value = false
      nextTick(() => {
        resultSection.value?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, 400)
}

// Clear all timers
function clearAllTimers() {
  if (coinTimer.value) {
    clearTimeout(coinTimer.value)
    coinTimer.value = null
  }
  if (numberTimer.value) {
    clearTimeout(numberTimer.value)
    numberTimer.value = null
  }
}

// Reset confirmation dialog focus management
watch(showResetConfirm, (val) => {
  if (val) {
    nextTick(() => {
      confirmDialogRef.value?.querySelector<HTMLElement>('button')?.focus()
    })
  }
})

function handleDialogTab(e: KeyboardEvent) {
  const dialog = confirmDialogRef.value
  if (!dialog) return
  const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  ))
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

// Request reset — show confirmation if mid-casting
function requestReset() {
  if (currentToss.value > 0 && currentToss.value < 6) {
    showResetConfirm.value = true
  } else {
    handleReset()
  }
}

function confirmReset() {
  showResetConfirm.value = false
  handleReset()
}

function cancelReset() {
  showResetConfirm.value = false
}

// Reset all state
function handleReset() {
  clearAllTimers()
  coinResults.value = []
  currentToss.value = 0
  result.value = null
  score.value = 0
  processing.value = false
  error.value = ''
  showResetConfirm.value = false
}

function onHistoryRestore(id: number) {
  showHistoryModal.value = false
  restoreFromHistory(id)
}

async function restoreFromHistory(id: number) {
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const record = await $fetch<import('~/server/api/divinations/shared').DivinationDetailResponse>(
      `/api/divinations/${id}`,
      { headers },
    )

    // Restore from result_data
    if (record.result_data) {
      const data = record.result_data as any
      if (data.hexagram && data.lines) {
        result.value = data as YijingResult
        score.value = data.score ?? 0
      }
    }

    // Restore casting mode from input_data
    if (record.input_data) {
      const input = record.input_data as { yaoValues?: number[]; castingMode?: 'coin' | 'number'; hexagramName?: string }
      if (input.castingMode) {
        castingMode.value = input.castingMode
      }
      // Set coin results to simulate completed tosses
      if (input.yaoValues && input.yaoValues.length === 6) {
        coinResults.value = input.yaoValues.map(v => {
          // Reconstruct individual coin tosses from line value
          // 6=老阴(222), 7=少阳(322), 8=少阴(332), 9=老阳(333)
          if (v === 6) return [2, 2, 2]
          if (v === 7) return [3, 2, 2]
          if (v === 8) return [3, 3, 2]
          if (v === 9) return [3, 3, 3]
          return [3, 2, 2]
        })
        currentToss.value = 6
      }
    }
  } catch {
    // silent fail — keep current result if history restore failed
  }
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

onUnmounted(() => {
  clearAllTimers()
  window.removeEventListener('scroll', handleScroll)
})

async function tryAutoSave(values: number[], yijingResult: YijingResult) {
  try {
    const { currentProfile, getAuthHeaders } = useAuth()

    if (!currentProfile?.value?.id) return

    await $fetch<{ id: number; created_at: string }>('/api/divinations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        type: 'yijing',
        input_data: { yaoValues: values, castingMode: castingMode.value, hexagramName: yijingResult.hexagram.name },
        result_data: yijingResult,
      },
    })
  } catch (e: unknown) {
    // 401/429: global interceptor handles 401 logout + redirect
    if (e && typeof e === 'object' && 'statusCode' in e) {
      const code = (e as any).statusCode
      if (code === 401) return
      if (code === 429) return // auto-save is best-effort; rate limit is expected
    }
    console.error('保存历史记录失败:', e)
  }
}

// Reset casting mode when mode changes (clear state)
watch(castingMode, () => {
  if (result.value) {
    // Only reset state if there's an existing result
    handleReset()
  }
})
</script>

<style scoped>
.confirm-dialog-enter-active,
.confirm-dialog-leave-active {
  transition: opacity 0.2s ease;
}
.confirm-dialog-enter-active > :deep(.card-warm),
.confirm-dialog-leave-active > :deep(.card-warm) {
  transition: transform 0.2s ease;
}
.confirm-dialog-enter-from,
.confirm-dialog-leave-to {
  opacity: 0;
}
.confirm-dialog-enter-from > :deep(.card-warm) {
  transform: scale(0.95);
}
.confirm-dialog-leave-to > :deep(.card-warm) {
  transform: scale(0.95);
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
