<script setup lang="ts">
import { analyzeCharacter, type CeziResult } from '~/composables/useCezi'
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'
import { ELEMENT_INTERPRETATIONS } from '~/constants/cezi'

const { currentProfile, restoreSession, getAuthHeaders } = useAuth()
const router = useRouter()

import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import EntertainmentDisclaimer from '~/components/tools/EntertainmentDisclaimer.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import HistoryModal from '~/components/tools/HistoryModal.vue'

useHead({ title: '测字 - 玄·道' })

const result = ref<CeziResult | null>(null)
const loading = ref(false)
const error = ref('')
const inputChar = ref('')
const showScrollTop = ref(false)
const saveError = ref('')
const savedDivinationId = ref<number | null>(null)
const showHistoryModal = ref(false)
const restoreError = ref('')

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

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

async function computeCezi() {
  const ch = inputChar.value.trim()
  if (!ch) {
    error.value = '请输入一个汉字'
    return
  }

  loading.value = true
  error.value = ''
  saveError.value = ''

  // Brief delay for UX
  await new Promise(r => setTimeout(r, 300))

  try {
    const res = analyzeCharacter(ch)
    if (!res) {
      error.value = '请输入一个有效的中文汉字'
      return
    }
    result.value = res

    // Auto-save
    saveDivinationResult(res)
  } catch (e) {
    console.error('测字分析失败:', e)
    error.value = '分析失败，请检查输入'
  } finally {
    loading.value = false
  }
}

async function saveDivinationResult(res: CeziResult) {
  try {
    const headers = getAuthHeaders()
    if (headers.Authorization) {
      const inputData = { character: res.character }
      const saveRes = await $fetch<{ id: number; created_at: string }>('/api/divinations', {
        method: 'POST',
        headers,
        body: {
          type: 'cezi',
          input_data: inputData,
          result_data: JSON.parse(JSON.stringify(res)),
        },
      })
      savedDivinationId.value = saveRes.id
      saveError.value = ''
    }
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'statusCode' in e) {
      const code = (e as any).statusCode
      if (code === 429) return
      if (code === 401) return
    }
    console.error('保存测字记录失败:', e)
  }
}

async function onHistoryRestore(id: number) {
  showHistoryModal.value = false
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const record = await $fetch<{ id: number; result_data: any }>(`/api/divinations/${id}`, { headers })
    if (record.result_data && typeof record.result_data === 'object' && record.result_data.character) {
      result.value = record.result_data as CeziResult
      restoreError.value = ''
    } else {
      restoreError.value = '历史记录数据无效'
    }
  } catch {
    restoreError.value = '历史记录加载失败，请稍后重试'
  }
}

function dismissRestoreError() {
  restoreError.value = ''
}

// Helpers for display
function getFortuneBadgeClass(category: string): string {
  if (category === '大吉') return 'fortune-badge--daji'
  if (category === '吉') return 'fortune-badge--ji'
  if (category === '半吉') return 'fortune-badge--banji'
  return 'fortune-badge--xiong'
}

function getFortuneShortLabel(category: string): string {
  if (category === '大吉') return '大吉'
  if (category === '吉') return '吉'
  if (category === '半吉') return '半吉'
  return '凶'
}

function getElementColor(element: string): string {
  return WUXING_COLORS[element] || WUXING_FALLBACK_COLOR
}

function getElementSummary(element: string): string {
  const ei = ELEMENT_INTERPRETATIONS[element]
  if (!ei) return ''
  return `${ei.traits}事业方面，${ei.career}感情方面，${ei.love}`
}

// Computed: interpretation lines split by newline for rendering
const interpretationParagraphs = computed(() => {
  if (!result.value) return []
  return result.value.interpretation.split('\n').filter(line => line.trim().length > 0)
})
</script>

<template>
  <ToolPageLayout>
    <h1 class="sr-only">测字占卜</h1>

    <div role="status" class="sr-only" aria-live="polite">
      {{ loading ? '正在测字...' : result ? '测字结果已就绪' : '' }}
    </div>

    <div class="max-w-[48rem] mx-auto">
      <ToolToolbar
        :show-history="true"
        @history="showHistoryModal = true"
      />

      <!-- ══ Input Area ══ -->
      <div class="fade-in card-paper-solid rounded-xl p-8" :style="{ '--delay': '0.1s' }">
        <div class="section-header">
          <h2>测字占卜</h2>
        </div>
        <p class="text-xs text-ink-light/80 mb-6 tracking-wide">请输入一字，以窥天机。一字一世界，拆解字形探玄机。</p>

        <div class="flex flex-col items-center gap-5">
          <div class="w-full max-w-[12rem]">
            <label for="cezi-input" class="input-label">请输入一个汉字</label>
            <input
              id="cezi-input"
              v-model="inputChar"
              class="input-ink w-full text-center text-2xl py-4"
              maxlength="1"
              placeholder="字"
              @keydown.enter="computeCezi"
            />
          </div>

          <button
            @click="computeCezi"
            @keydown.enter="computeCezi"
            :disabled="loading"
            class="btn-seal"
          >
            <span class="btn-seal__char" aria-hidden="true">测</span>
            <span>{{ loading ? '测字中...' : '开始测字' }}</span>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mt-4 text-center">
        <p class="text-sm text-cinnabar" role="alert">{{ error }}</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="mt-6 space-y-4" aria-busy="true">
        <span class="sr-only">正在测字...</span>
        <SkeletonCard />
      </div>

      <!-- ══ Result ══ -->
      <template v-if="result">
        <!-- Divination Slip Card -->
        <div class="fade-in mt-8 cezi-slip" :style="{ '--delay': '0.15s' }">
          <!-- Top decorative band -->
          <div class="cezi-slip__header">
            <span class="cezi-slip__trigram" aria-hidden="true">☰</span>
            <span class="cezi-slip__seal-mark">玄·道 测字笺</span>
            <span class="cezi-slip__trigram" aria-hidden="true">☷</span>
          </div>

          <div class="cezi-slip__divider" aria-hidden="true"></div>

          <!-- Character Display -->
          <div class="cezi-slip__char-section">
            <div class="cezi-slip__char-ring">
              <span class="cezi-slip__char">{{ result.character }}</span>
            </div>
          </div>

          <!-- Quick Stats Row -->
          <div class="cezi-slip__stats">
            <div class="cezi-slip__stat">
              <span class="cezi-slip__stat-label">笔画</span>
              <span class="cezi-slip__stat-value">
                {{ result.strokeCount }}
                <span v-if="result.strokeSource === 'estimated'" class="text-[0.5rem] text-ink-light/60 ml-0.5">估算</span>
              </span>
            </div>
            <div class="cezi-slip__stat">
              <span class="cezi-slip__stat-label">五行</span>
              <span
                class="cezi-slip__stat-value font-medium"
                :style="{ color: getElementColor(result.primaryElement) }"
              >{{ result.primaryElement }}</span>
            </div>
            <div class="cezi-slip__stat">
              <span class="cezi-slip__stat-label">吉凶</span>
              <span :class="['fortune-badge', getFortuneBadgeClass(result.numberFortune.category)]">
                {{ getFortuneShortLabel(result.numberFortune.category) }}
              </span>
            </div>
            <div class="cezi-slip__stat">
              <span class="cezi-slip__stat-label">结构</span>
              <span class="cezi-slip__stat-value">{{ result.structureName }}</span>
            </div>
          </div>

          <div class="cezi-slip__divider" aria-hidden="true"></div>

          <!-- Number Fortune Detail -->
          <div class="cezi-slip__section">
            <h3 class="cezi-slip__section-title">数理 · 第{{ result.strokeCount }}数</h3>
            <p class="cezi-slip__text">{{ result.numberFortune.desc }}</p>
          </div>

          <!-- Element Detail -->
          <div class="cezi-slip__section">
            <h3 class="cezi-slip__section-title">五行 · 属{{ result.primaryElement }}</h3>
            <div class="flex items-center gap-2 mb-2">
              <span
                class="inline-block w-3 h-3 rounded-sm"
                :style="{ backgroundColor: getElementColor(result.primaryElement) }"
                aria-hidden="true"
              ></span>
              <span class="text-xs text-ink-medium">五行属{{ result.primaryElement }}性</span>
            </div>
            <p class="cezi-slip__text">{{ getElementSummary(result.primaryElement) }}</p>
            <div v-if="result.radicalElement && result.radicalElement !== result.primaryElement" class="mt-2 cezi-slip__note">
              <span class="text-[0.6rem] text-ink-light">偏旁属</span>
              <span
                class="text-[0.6rem] font-medium"
                :style="{ color: getElementColor(result.radicalElement) }"
              >{{ result.radicalElement }}</span>
              <span class="text-[0.6rem] text-ink-light">，与数理五行相异，需综合参详。</span>
            </div>
          </div>

          <!-- Structure Detail -->
          <div class="cezi-slip__section">
            <h3 class="cezi-slip__section-title">字形 · {{ result.structureName }}结构</h3>
            <p class="cezi-slip__text">{{ result.structureDesc }}</p>
          </div>

          <div class="cezi-slip__divider" aria-hidden="true"></div>

          <!-- Full Interpretation -->
          <div class="cezi-slip__section">
            <h3 class="cezi-slip__section-title">详解</h3>
            <div class="space-y-3">
              <p
                v-for="(para, i) in interpretationParagraphs"
                :key="i"
                class="cezi-slip__text"
              >{{ para }}</p>
            </div>
          </div>

          <!-- Bottom seal -->
          <div class="cezi-slip__footer">
            <div class="cezi-slip__footer-line" aria-hidden="true"></div>
            <span class="cezi-slip__footer-seal">玄·道</span>
            <div class="cezi-slip__footer-line" aria-hidden="true"></div>
          </div>
        </div>

        <EntertainmentDisclaimer />
      </template>
    </div>

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

    <HistoryModal
      :show="showHistoryModal"
      type="cezi"
      @close="showHistoryModal = false"
      @restore="onHistoryRestore"
    />

    <ScrollTopButton
      v-if="showScrollTop"
      @click="scrollToTop"
      @keydown.enter="scrollToTop"
    />
  </ToolPageLayout>
</template>

<style scoped>
/* ── Input label ── */
.input-label {
  display: block;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.65rem;
  color: var(--color-ink-medium, #5A4A3A);
  letter-spacing: 0.06em;
  margin-bottom: 0.3rem;
  text-align: center;
}

/* ── Fortune badges ── */
.fortune-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem 0.6rem;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.fortune-badge--daji {
  background: rgba(198, 40, 40, 0.1);
  color: var(--color-cinnabar);
  border: 1px solid rgba(198, 40, 40, 0.2);
}

.fortune-badge--ji {
  background: rgba(61, 107, 75, 0.08);
  color: var(--color-jade);
  border: 1px solid rgba(61, 107, 75, 0.15);
}

.fortune-badge--banji {
  background: rgba(122, 94, 18, 0.08);
  color: var(--color-gold);
  border: 1px solid rgba(122, 94, 18, 0.15);
}

.fortune-badge--xiong {
  background: rgba(94, 94, 94, 0.08);
  color: #5E5E5E;
  border: 1px solid rgba(94, 94, 94, 0.15);
}

/* ════════════════════════════════════════ */
/*  Divination Slip Card — 测字笺        */
/* ════════════════════════════════════════ */

.cezi-slip {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  padding: 2rem 1.5rem;
  background: linear-gradient(175deg, #FDF8F0 0%, #F8F0E0 30%, #F5EBD6 100%);
  border: 1px solid rgba(198, 40, 40, 0.06);
  box-shadow:
    0 1px 3px rgba(44, 26, 14, 0.04),
    0 8px 24px rgba(44, 26, 14, 0.03),
    inset 0 0 80px rgba(198, 40, 40, 0.015);
}

@media (min-width: 640px) {
  .cezi-slip {
    padding: 2.5rem 2rem;
  }
}

.cezi-slip__header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.cezi-slip__trigram {
  font-size: 1rem;
  opacity: 0.2;
  color: var(--color-cinnabar);
}

.cezi-slip__seal-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 1rem;
  border-radius: 3px;
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.85rem;
  color: var(--color-cinnabar);
  letter-spacing: 0.2em;
  background: rgba(198, 40, 40, 0.04);
  border: 1px solid rgba(198, 40, 40, 0.1);
  transform: rotate(-1deg);
}

.cezi-slip__divider {
  width: 100%;
  height: 1px;
  margin: 0.75rem 0;
  background: repeating-linear-gradient(
    90deg,
    rgba(44, 26, 14, 0.06) 0px,
    rgba(44, 26, 14, 0.06) 6px,
    transparent 6px,
    transparent 12px
  );
}

/* Character display */
.cezi-slip__char-section {
  display: flex;
  justify-content: center;
  padding: 1.25rem 0;
}

.cezi-slip__char-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 50%;
  background: rgba(198, 40, 40, 0.03);
  border: 2px solid rgba(198, 40, 40, 0.12);
  box-shadow: 0 0 20px rgba(198, 40, 40, 0.05);
}

.cezi-slip__char {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 2.5rem;
  color: var(--color-ink-darkest);
  line-height: 1;
}

/* Stats row */
.cezi-slip__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
  padding: 0.75rem 0;
}

.cezi-slip__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.cezi-slip__stat-label {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.55rem;
  color: var(--color-ink-light, #8A7A6A);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.cezi-slip__stat-value {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem;
  color: var(--color-ink-dark, #2C1810);
  letter-spacing: 0.05em;
}

/* Sections */
.cezi-slip__section {
  padding: 0.75rem 0;
}

.cezi-slip__section-title {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-ink-dark, #2C1810);
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
  position: relative;
  padding-left: 0.75rem;
}

.cezi-slip__section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0.75rem;
  background: rgba(198, 40, 40, 0.3);
  border-radius: 2px;
}

.cezi-slip__text {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.65rem;
  color: var(--color-ink-medium, #5A4A3A);
  line-height: 1.8;
  letter-spacing: 0.03em;
}

.cezi-slip__note {
  padding: 0.4rem 0.6rem;
  background: rgba(250, 240, 224, 0.5);
  border-radius: 0.375rem;
  border: 1px solid rgba(44, 26, 14, 0.04);
}

/* Footer */
.cezi-slip__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 0.75rem;
}

.cezi-slip__footer-line {
  flex: 1;
  height: 1px;
  background: rgba(44, 26, 14, 0.06);
}

.cezi-slip__footer-seal {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.75rem;
  color: rgba(198, 40, 40, 0.4);
  letter-spacing: 0.3em;
}

/* ── Animation ── */
.fade-in {
  animation: secIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay, 0s);
}

@keyframes secIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
