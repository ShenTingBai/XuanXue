<template>
  <ToolEditorialShell
    :index-items="indexItems"
    :index-footnote="indexFootnote"
    seal="易"
    edition="工具 · 六爻起卦（摇卦 / 数字起卦）"
    title="六爻占卜"
    subtitle="按六爻纳甲法起卦，给出卦象、爻辞与解读依据。"
    status-text="功能整理中"
    meta-text="结果只在本页内存 · 不写服务器历史"
  >
    <!-- 顶部工具条：仅保留导出入口（历史记录已下线） -->
    <div class="flex items-center justify-between mb-6">
      <span></span>
      <ExportButton
        v-if="result && !processing"
        :target-ref="exportRef"
        filename="六爻卦象.png"
        :is-exporting="isExporting"
        @export="handleExport"
      />
    </div>

    <!--
      Ⅰ 起卦方式：摇卦或数字起卦。
      面板自身没有可见标题，分节名沿用面板既有的「起卦方式」标签（其 tablist 的 aria-label），
      不为此新增可见标题，卷目锚点只是把已有区块变成可跳转的段落。
    -->
    <section
      id="yijing-casting"
      class="editorial-section editorial-section--first"
      aria-label="起卦方式"
    >
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
    </section>

    <!-- Loading / processing -->
    <div v-if="processing" class="space-y-6" aria-busy="true">
      <span class="sr-only">正在加载...</span>
      <SkeletonCard />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <p class="font-sans text-base text-cinnabar" role="alert">{{ error }}</p>
      <div class="flex justify-center mt-6">
        <button
          class="btn-cin"
          @click="handleReset"
          @keydown.enter="handleReset"
          @keydown.space.prevent="handleReset"
        >
          <span>重新起卦</span>
        </button>
      </div>
    </div>

    <div aria-live="polite" role="status" class="sr-only">
      <span v-if="processing">解卦中，请稍候</span>
      <span v-else-if="result">卦象已就绪</span>
    </div>

    <!-- Ⅱ 占卜结果 -->
    <section
      v-if="result && !processing"
      id="yijing-result"
      class="editorial-section"
      aria-labelledby="yijing-result-heading"
    >
      <div class="flex items-center justify-between">
        <SectionHeading
          num="Ⅱ"
          title="占卜结果"
          heading-id="yijing-result-heading"
          class="flex-1 min-w-0 !mb-0"
        />
        <MethodologyNote :classical="yijingClassical" :synthesis="yijingSynthesis" tool="六爻" />
      </div>

      <!-- Results -->
      <div ref="resultSection" class="mt-8">
        <div ref="exportRef">
          <YijingInterpretation :result="result" :score="score" />
        </div>

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
      </div>
    </section>

    <!-- 重新起卦确认：弹层不属于阅读流，放到外壳的根级附加区 -->
    <template #after>
      <Transition name="confirm-dialog">
        <div
          v-if="showResetConfirm"
          ref="confirmDialogRef"
          class="fixed inset-0 z-50 flex items-center justify-center bg-ink-dark/20 backdrop-blur-sm"
          @click="cancelReset"
          @keydown.tab="handleDialogTab"
        >
          <div
            class="card-warm rounded-xl p-8 max-w-sm mx-4 shadow-xl border border-paper-dark"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-dialog-title"
            @click.stop
            @keydown.escape="cancelReset"
          >
            <p id="reset-dialog-title" class="font-sans text-base text-ink-dark mb-2">
              确定要重新起卦吗？
            </p>
            <p class="font-sans text-sm text-ink-medium mb-6">
              当前已完成 {{ currentToss }}/6 次摇卦，重新起卦将丢失已有结果。
            </p>
            <div class="flex gap-3 justify-end">
              <button
                class="btn-ghost text-sm"
                @click="cancelReset"
                @keydown.enter="cancelReset"
                @keydown.space.prevent="cancelReset"
              >
                继续摇卦
              </button>
              <button
                class="btn-cin"
                @click="confirmReset"
                @keydown.enter="confirmReset"
                @keydown.space.prevent="confirmReset"
              >
                确定重新起卦
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </ToolEditorialShell>

  <ScrollTopButton
    v-if="showScrollTop"
    class="right-8"
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

<script setup lang="ts">
import { castByNumbers, computeYijingResult, type YijingResult } from '~/composables/useYijing'
import ToolEditorialShell from '~/components/editorial/ToolEditorialShell.vue'
import SectionHeading from '~/components/editorial/SectionHeading.vue'
import YijingCastingPanel from '~/components/tools/yijing/YijingCastingPanel.vue'
import YijingInterpretation from '~/components/tools/yijing/YijingInterpretation.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import MethodologyNote, { type ClassicalSource } from '~/components/tools/MethodologyNote.vue'

const { currentProfile, restoreSession } = useAuth()
useSeoMeta({
  title: '六爻占卜 — 玄·道',
  ogTitle: '六爻占卜 — 玄·道',
  description: '通过六爻起卦占卜，针对事业、感情、决策等问题获得卦象指引和爻辞解读。',
  ogDescription: '通过六爻起卦占卜，针对事业、感情、决策等问题获得卦象指引和爻辞解读。',
  ogType: 'website',
})

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

/**
 * 卷目（Ⅰ–Ⅱ）与脚注。
 *
 * 只列页面**已有**的两个段落——起卦方式面板与占卜结果；
 * 不为让索引变长新增段（设计系统：卷目只是既有段序的目录）。
 */
const indexItems = [
  { num: 'Ⅰ', label: '起卦方式', href: '#yijing-casting' },
  { num: 'Ⅱ', label: '占卜结果', href: '#yijing-result' },
]

/**
 * 卷目脚注：只写起卦方式这一条输入口径。
 * 内存结果边界改由报头元信息行承担——脚注 ≤920px 隐藏，隐私提示不能只放这里。
 */
const indexFootnote = '摇卦与数字起卦两种方式'

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

onMounted(async () => {
  await restoreSession()
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
    } catch {
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
    } catch {
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
watch(showResetConfirm, val => {
  if (val) {
    nextTick(() => {
      confirmDialogRef.value?.querySelector<HTMLElement>('button')?.focus()
    })
  }
})

function handleDialogTab(e: KeyboardEvent) {
  const dialog = confirmDialogRef.value
  if (!dialog) return
  const focusable = Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  )
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

onUnmounted(() => {
  clearAllTimers()
  window.removeEventListener('scroll', handleScroll)
})

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
