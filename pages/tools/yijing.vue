<template>
  <ToolPageLayout>
      <h1 class="sr-only">六爻占卜</h1>

      <div class="max-w-[48rem] mx-auto">
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
        <div v-if="processing" class="text-center py-8">
          <p class="font-sans text-sm text-ink-light">解卦中...</p>
        </div>

        <div aria-live="polite" role="status" class="sr-only">
          <span v-if="processing">解卦中，请稍候</span>
          <span v-else-if="result">卦象已就绪</span>
        </div>

        <!-- Reset confirmation dialog -->
        <Transition name="confirm-dialog">
          <div
            v-if="showResetConfirm"
            class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/20 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="确认重新起卦"
            @keydown.escape="cancelReset"
          >
            <div class="card-paper-solid rounded-xl p-6 sm:p-8 max-w-sm mx-4 shadow-xl border border-paper-dark">
              <p class="font-sans text-base text-ink-dark mb-2">确定要重新起卦吗？</p>
              <p class="font-sans text-sm text-ink-medium mb-6">当前已完成 {{ currentToss }}/6 次摇卦，重新起卦将丢失已有结果。</p>
              <div class="flex gap-3 justify-end">
                <button
                  class="btn-ghost text-sm"
                  @click="cancelReset"
                  @keydown.enter="cancelReset"
                >继续摇卦</button>
                <button
                  class="btn-seal"
                  @click="confirmReset"
                  @keydown.enter="confirmReset"
                >确定重新起卦</button>
              </div>
            </div>
          </div>
        </Transition>

        <InkDivider v-if="result && !processing" />

        <!-- Results -->
        <div v-if="result && !processing" class="mt-8">
          <YijingInterpretation :result="result" :score="score" />

          <!-- Auto-save placeholder -->
          <div v-if="saveError" role="alert" class="mt-4 text-center">
            <p class="font-sans text-xs text-ink-light">
              {{ saveError }}
            </p>
          </div>

          <!-- Reset -->
          <div class="text-center mt-6 pb-8">
            <button
              class="btn-seal"
              @click="requestReset"
              @keydown.enter="requestReset"
              @keydown.space.prevent="requestReset"
            >
              重新占卜
            </button>
          </div>
        </div>
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
import InkDivider from '~/components/tools/InkDivider.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
useHead({ title: '六爻占卜 - 玄学' })

// State
const castingMode = ref<'coin' | 'number'>('coin')
const coinResults = ref<number[][]>([])
const currentToss = ref(0)
const result = ref<YijingResult | null>(null)
const score = ref(0)
const processing = ref(false)
const saveError = ref('')
const showScrollTop = ref(false)
const showResetConfirm = ref(false)

// Timer refs for setTimeout cleanup
const coinTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const numberTimer = ref<ReturnType<typeof setTimeout> | null>(null)

onMounted(() => {
  const { restoreSession } = useAuth()
  restoreSession()
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
      saveError.value = '解卦出错，请重新尝试。'
    } finally {
      processing.value = false
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
      saveError.value = '解卦出错，请检查输入后重新尝试。'
    } finally {
      processing.value = false
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
  saveError.value = ''
  showResetConfirm.value = false
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

// Silent auto-save (fire-and-forget)
async function tryAutoSave(values: number[], yijingResult: YijingResult) {
  try {
    const { currentProfile, getAuthHeaders } = useAuth()

    if (!currentProfile?.value?.id) return

    await $fetch('/api/divinations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: {
        type: 'yijing',
        input_data: { yaoValues: values, castingMode: castingMode.value },
        result_data: yijingResult,
      },
    })
  } catch {
    // Silent failure — user experience not blocked by save
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
.confirm-dialog-enter-active > :deep(.card-paper-solid),
.confirm-dialog-leave-active > :deep(.card-paper-solid) {
  transition: transform 0.2s ease;
}
.confirm-dialog-enter-from,
.confirm-dialog-leave-to {
  opacity: 0;
}
.confirm-dialog-enter-from > :deep(.card-paper-solid) {
  transform: scale(0.95);
}
.confirm-dialog-leave-to > :deep(.card-paper-solid) {
  transform: scale(0.95);
}
</style>
