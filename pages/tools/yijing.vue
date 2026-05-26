<template>
  <ToolPageLayout>
      <PageHero
        emoji="☯"
        emoji-label="太极"
        title="六爻占卜"
        subtitle="纳甲装卦 · 周易古法"
      />

      <div class="max-w-[48rem] mx-auto">
        <!-- Casting panel -->
        <YijingCastingPanel
          :mode="castingMode"
          :current-toss="currentToss"
          :coin-results="coinResults"
          @toss="handleToss"
          @cast-number="handleCastNumber"
          @reset="handleReset"
          @update:mode="castingMode = $event"
        />

        <!-- Loading / processing -->
        <div v-if="processing" class="text-center py-8">
          <p class="font-sans text-sm text-ink-light">解卦中...</p>
        </div>

        <div aria-live="polite" class="sr-only">
          <span v-if="processing">解卦中，请稍候</span>
        </div>

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
              @click="handleReset"
              @keydown.enter="handleReset"
              @keydown.space.prevent="handleReset"
            >
              重新占卜
            </button>
          </div>
        </div>
        <button
          v-if="showScrollTop"
          class="fixed bottom-8 right-8 z-40 w-10 h-10 rounded-full bg-ink-dark/80 text-paper-lightest flex items-center justify-center shadow-lg hover:bg-ink-dark transition-all"
          @click="scrollToTop"
          @keydown.enter="scrollToTop"
          aria-label="返回顶部"
        >
          <svg aria-hidden="true" class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M10 16V4M4 10l6-6 6 6" />
          </svg>
        </button>
      </div>
  </ToolPageLayout>
</template>

<script setup lang="ts">
import {
  castByCoin,
  castByNumbers,
  computeYijingResult,
  type YijingResult,
} from '~/composables/useYijing'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import PageHero from '~/components/tools/PageHero.vue'
import YijingCastingPanel from '~/components/tools/yijing/YijingCastingPanel.vue'
import YijingInterpretation from '~/components/tools/yijing/YijingInterpretation.vue'
import InkDivider from '~/components/tools/InkDivider.vue'
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

onMounted(() => {
  const { restoreSession } = useAuth()
  restoreSession()
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

// Coin casting
function handleToss() {
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

  // Small delay for animation to settle
  setTimeout(() => {
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
  castingMode.value = 'number'
  processing.value = true

  setTimeout(() => {
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

// Reset all state
function handleReset() {
  coinResults.value = []
  currentToss.value = 0
  result.value = null
  score.value = 0
  processing.value = false
  saveError.value = ''
}

function handleScroll() {
  showScrollTop.value = window.scrollY > 300
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onUnmounted(() => {
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
