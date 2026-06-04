<script setup lang="ts">
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'
import { calculateNameTest, type NameTestResult } from '~/composables/useNameTest'

const { currentProfile, restoreSession, getAuthHeaders } = useAuth()
const router = useRouter()

import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import EntertainmentDisclaimer from '~/components/tools/EntertainmentDisclaimer.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import ScoreRing from '~/components/tools/ScoreRing.vue'

useHead({ title: '姓名测试 — 玄·道' })

const result = ref<NameTestResult | null>(null)
const loading = ref(false)
const error = ref('')

const surname = ref('')
const givenName = ref('')

const showScrollTop = ref(false)
const resultRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()
const showHistoryModal = ref(false)
const savedDivinationId = ref<number | null>(null)
const saveError = ref<string | null>(null)
const restoreError = ref<string | null>(null)

function handleExport() {
  if (resultRef.value) {
    exportToImage(resultRef.value, '姓名分析.png')
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

async function computeNameTest() {
  const s = surname.value.trim()
  const g = givenName.value.trim()
  if (!s || !g) {
    error.value = '请输入姓名'
    return
  }

  loading.value = true
  error.value = ''

  // 延迟模拟（让用户看到 loading 状态）
  await new Promise(r => setTimeout(r, 300))

  try {
    const res = calculateNameTest(s, g)
    if (!res) {
      error.value = '包含无法识别的汉字，请使用简体或繁体中文'
      return
    }
    result.value = res
    saveDivinationResult(res)
  } catch (e) {
    console.error('姓名测试失败:', e)
    error.value = '计算失败，请检查输入'
  } finally {
    loading.value = false
  }
}

async function saveDivinationResult(res: NameTestResult) {
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const inputData = { surname: surname.value, givenName: givenName.value }
    const saveRes = await $fetch<{ id: number; created_at: string }>('/api/divinations', {
      method: 'POST',
      headers,
      body: {
        type: 'name-test',
        input_data: inputData,
        result_data: JSON.parse(JSON.stringify(res)),
      },
    })
    savedDivinationId.value = saveRes.id
    saveError.value = ''
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'statusCode' in e) {
      const code = (e as any).statusCode
      if (code === 429) return
      if (code === 401) return
    }
    console.error('保存姓名测试记录失败:', e)
  }
}

async function onHistoryRestore(id: number) {
  showHistoryModal.value = false
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const record = await $fetch<{ id: number; result_data: any }>(`/api/divinations/${id}`, { headers })
    if (record.result_data && typeof record.result_data === 'object' && record.result_data.fullName) {
      result.value = record.result_data as NameTestResult
      restoreError.value = ''
    } else {
      restoreError.value = '历史记录数据无效'
      setTimeout(() => { restoreError.value = '' }, 6000)
    }
  } catch {
    restoreError.value = '历史记录加载失败，请稍后重试'
    setTimeout(() => { restoreError.value = '' }, 6000)
  }
}

function dismissRestoreError() {
  restoreError.value = ''
}

const scoreItems = computed(() => {
  if (!result.value) return []
  return [
    { label: '人格', score: result.value.grids.ren.fortune === '吉' ? 90 : result.value.grids.ren.fortune === '半吉' ? 60 : 30 },
    { label: '总格', score: result.value.grids.total.fortune === '吉' ? 90 : result.value.grids.total.fortune === '半吉' ? 60 : 30 },
    { label: '三才', score: result.value.sanCai.fortune === '吉' ? 90 : result.value.sanCai.fortune === '半吉' ? 60 : 30 },
    { label: '综合', score: result.value.totalScore },
  ]
})
</script>

<template>
  <ToolPageLayout>
    <h1 class="sr-only">姓名测试</h1>

    <div role="status" class="sr-only" aria-live="polite">
      {{ loading ? '正在计算...' : result ? '结果已就绪' : '' }}
    </div>

    <div class="max-w-[48rem] mx-auto">
      <ToolToolbar
        :show-history="true"
        @history="showHistoryModal = true"
      >
        <template #extra>
          <ExportButton
            v-if="result"
            :target-ref="resultRef"
            filename="姓名分析.png"
            :is-exporting="isExporting"
            @export="handleExport"
          />
        </template>
      </ToolToolbar>

      <!-- ══ 输入区 ══ -->
      <div class="fade-in card-paper-solid rounded-xl p-8" :style="{ '--delay': '0.1s' }">
        <div class="section-header">
          <h2>输入姓名</h2>
        </div>
        <p class="text-xs text-ink-light/80 mb-6 tracking-wide">请输入您的姓名进行五格剖象分析</p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label for="name-surname" class="input-label">姓氏</label>
            <input
              id="name-surname"
              v-model="surname"
              class="input-ink w-full"
              placeholder="如 李"
              maxlength="4"
            />
          </div>
          <div>
            <label for="name-given" class="input-label">名字</label>
            <input
              id="name-given"
              v-model="givenName"
              class="input-ink w-full"
              placeholder="如 世民"
              maxlength="8"
            />
          </div>
        </div>

        <div class="flex justify-center mt-8">
          <button
            @click="computeNameTest"
            @keydown.enter="computeNameTest"
            :disabled="loading"
            class="btn-seal"
          >
            <span class="btn-seal__char" aria-hidden="true">名</span>
            <span>{{ loading ? '分析中...' : '开始分析' }}</span>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="error" class="mt-4 text-center">
        <p class="text-sm text-cinnabar" role="alert">{{ error }}</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="mt-6 space-y-4" aria-busy="true">
        <span class="sr-only">正在计算...</span>
        <SkeletonCard />
      </div>

      <!-- ══ Result ══ -->
      <template v-if="result">
        <div ref="resultRef">
        <!-- 总分横幅 -->
        <div class="fade-in mt-8 score-banner" :style="{ '--delay': '0.15s' }">
          <div class="score-banner__left">
            <div class="score-banner__grade">
              {{ result.totalScore >= 80 ? '大吉' : result.totalScore >= 60 ? '中吉' : result.totalScore >= 40 ? '末吉' : '凶' }}
            </div>
            <div class="score-banner__name">{{ result.fullName }}</div>
          </div>
          <div class="score-banner__center">
            <div class="score-ring-inline">
              <ScoreRing :score="result.totalScore" />
            </div>
          </div>
          <div class="score-banner__right">
            <p class="score-banner__summary">{{ result.summary.slice(0, 60) }}...</p>
          </div>
        </div>

        <!-- 五格一览表 -->
        <div class="fade-in mt-6 card-warm rounded-xl overflow-hidden" :style="{ '--delay': '0.25s' }">
          <div class="section-header px-6 pt-6">
            <h2>五格剖象</h2>
          </div>
          <div class="grid-table">
            <!-- Header -->
            <div class="grid-table__row grid-table__header">
              <span>格位</span>
              <span>笔画</span>
              <span>五行</span>
              <span>数理</span>
              <span>吉凶</span>
              <span class="hidden sm:block">含义</span>
            </div>
            <!-- 天格 -->
            <div class="grid-table__row">
              <span class="grid-table__label">天格</span>
              <span>{{ result.grids.tian.strokes }}</span>
              <span class="wx-badge" :class="`wx-${result.grids.tian.wuxing}`">{{ result.grids.tian.wuxing }}</span>
              <span>{{ result.grids.tian.name }}</span>
              <span :class="result.grids.tian.fortune === '吉' ? 'text-wuxing-wood' : result.grids.tian.fortune === '半吉' ? 'text-wuxing-earth' : 'text-cinnabar'">
                {{ result.grids.tian.fortune === '吉' ? '吉' : result.grids.tian.fortune === '半吉' ? '平' : '凶' }}
              </span>
              <span class="hidden sm:block text-ink-light text-[0.6rem]">{{ result.grids.tian.meaning }}</span>
            </div>
            <!-- 人格 -->
            <div class="grid-table__row grid-table__row--hl">
              <span class="grid-table__label">人格 · 主运</span>
              <span>{{ result.grids.ren.strokes }}</span>
              <span class="wx-badge" :class="`wx-${result.grids.ren.wuxing}`">{{ result.grids.ren.wuxing }}</span>
              <span>{{ result.grids.ren.name }}</span>
              <span :class="result.grids.ren.fortune === '吉' ? 'text-wuxing-wood' : result.grids.ren.fortune === '半吉' ? 'text-wuxing-earth' : 'text-cinnabar'">
                {{ result.grids.ren.fortune === '吉' ? '吉' : result.grids.ren.fortune === '半吉' ? '平' : '凶' }}
              </span>
              <span class="hidden sm:block text-ink-light text-[0.6rem]">{{ result.grids.ren.meaning }}</span>
            </div>
            <!-- 地格 -->
            <div class="grid-table__row">
              <span class="grid-table__label">地格 · 前运</span>
              <span>{{ result.grids.di.strokes }}</span>
              <span class="wx-badge" :class="`wx-${result.grids.di.wuxing}`">{{ result.grids.di.wuxing }}</span>
              <span>{{ result.grids.di.name }}</span>
              <span :class="result.grids.di.fortune === '吉' ? 'text-wuxing-wood' : result.grids.di.fortune === '半吉' ? 'text-wuxing-earth' : 'text-cinnabar'">
                {{ result.grids.di.fortune === '吉' ? '吉' : result.grids.di.fortune === '半吉' ? '平' : '凶' }}
              </span>
              <span class="hidden sm:block text-ink-light text-[0.6rem]">{{ result.grids.di.meaning }}</span>
            </div>
            <!-- 总格 -->
            <div class="grid-table__row">
              <span class="grid-table__label">总格 · 后运</span>
              <span>{{ result.grids.total.strokes }}</span>
              <span class="wx-badge" :class="`wx-${result.grids.total.wuxing}`">{{ result.grids.total.wuxing }}</span>
              <span>{{ result.grids.total.name }}</span>
              <span :class="result.grids.total.fortune === '吉' ? 'text-wuxing-wood' : result.grids.total.fortune === '半吉' ? 'text-wuxing-earth' : 'text-cinnabar'">
                {{ result.grids.total.fortune === '吉' ? '吉' : result.grids.total.fortune === '半吉' ? '平' : '凶' }}
              </span>
              <span class="hidden sm:block text-ink-light text-[0.6rem]">{{ result.grids.total.meaning }}</span>
            </div>
            <!-- 外格 -->
            <div class="grid-table__row">
              <span class="grid-table__label">外格 · 副运</span>
              <span>{{ result.grids.wai.strokes }}</span>
              <span class="wx-badge" :class="`wx-${result.grids.wai.wuxing}`">{{ result.grids.wai.wuxing }}</span>
              <span>{{ result.grids.wai.name }}</span>
              <span :class="result.grids.wai.fortune === '吉' ? 'text-wuxing-wood' : result.grids.wai.fortune === '半吉' ? 'text-wuxing-earth' : 'text-cinnabar'">
                {{ result.grids.wai.fortune === '吉' ? '吉' : result.grids.wai.fortune === '半吉' ? '平' : '凶' }}
              </span>
              <span class="hidden sm:block text-ink-light text-[0.6rem]">{{ result.grids.wai.meaning }}</span>
            </div>
          </div>

          <!-- 三才配置 -->
          <div class="px-6 pb-6 pt-4 border-t border-ink-dark/4 mt-2">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-sans text-xs text-ink-medium">三才配置</span>
              <span class="text-xs text-ink-light">天格{{ result.sanCai.tian }} → 人格{{ result.sanCai.ren }} → 地格{{ result.sanCai.di }}</span>
              <span :class="result.sanCai.fortune === '吉' ? 'text-wuxing-wood' : result.sanCai.fortune === '凶' ? 'text-cinnabar' : 'text-wuxing-earth'" class="text-xs font-medium">
                · {{ result.sanCai.fortune === '吉' ? '相生大吉' : result.sanCai.fortune === '半吉' ? '半吉' : '相克大凶' }}
              </span>
            </div>
            <div v-if="result.categories.length > 0" class="flex flex-wrap gap-1.5">
              <span v-for="cat in result.categories" :key="cat" class="nayin-tag">{{ cat }}</span>
            </div>
          </div>
        </div>

        <!-- 详解 -->
        <div class="fade-in mt-6 card-warm rounded-xl p-6" :style="{ '--delay': '0.4s' }">
          <div class="section-header">
            <h2>详解</h2>
          </div>
          <div class="space-y-3 text-sm text-ink-medium leading-relaxed">
            <p>{{ result.summary }}</p>
          </div>
        </div>

        <!-- 各格详解 -->
        <div class="fade-in mt-6 space-y-3" :style="{ '--delay': '0.5s' }">
          <p class="text-xs text-ink-light/80 tracking-wide text-center">各格详情</p>
          <div
            v-for="detail in result.details"
            :key="detail.label"
            class="detail-line"
          >
            <span class="detail-line__label">{{ detail.label }}</span>
            <span class="detail-line__text">{{ detail.text }}</span>
          </div>
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
      v-if="showHistoryModal"
      :show="showHistoryModal"
      type="name-test"
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
/* ── Score banner ── */
.score-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, #FBF4E6 0%, #F5EBD6 100%);
  border-radius: 0.75rem;
  border: 1px solid rgba(44, 26, 14, 0.04);
}

@media (max-width: 639px) {
  .score-banner {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
}

.score-banner__left {
  flex-shrink: 0;
  text-align: center;
  min-width: 4rem;
}

.score-banner__grade {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 1.5rem;
  color: var(--color-cinnabar, #C62828);
  letter-spacing: 0.2em;
  line-height: 1.2;
}

.score-banner__name {
  font-family: var(--font-sans);
  font-size: 0.65rem;
  color: var(--color-ink-medium, #5A4A3A);
  letter-spacing: 0.15em;
}

.score-banner__center {
  flex-shrink: 0;
}

.score-ring-inline {
  width: 3.5rem;
  height: 3.5rem;
}

.score-banner__right {
  flex: 1;
  min-width: 0;
}

.score-banner__summary {
  font-family: var(--font-sans);
  font-size: 0.65rem;
  color: var(--color-ink-medium, #5A4A3A);
  line-height: 1.55;
  letter-spacing: 0.02em;
}

/* ── Grid table ── */
.grid-table {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid rgba(44, 26, 14, 0.03);
}

.grid-table__row {
  display: grid;
  grid-template-columns: 1.5fr 0.6fr 0.8fr 1.2fr 0.6fr 2fr;
  align-items: center;
  gap: 0.375rem;
  padding: 0.45rem 1.25rem;
  font-family: var(--font-sans);
  font-size: 0.65rem;
  border-bottom: 1px solid rgba(44, 26, 14, 0.02);
  color: var(--color-ink-medium, #5A4A3A);
}

@media (max-width: 639px) {
  .grid-table__row {
    grid-template-columns: 1.2fr 0.6fr 0.7fr 1.2fr 0.6fr;
  }
}

.grid-table__header {
  font-size: 0.55rem;
  font-weight: 600;
  color: var(--color-ink-light, #8A7A6A);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: rgba(44, 26, 14, 0.02);
}

.grid-table__row--hl {
  background: rgba(198, 40, 40, 0.04);
  font-weight: 500;
}

.grid-table__label {
  color: var(--color-ink-dark, #2C1810);
}

/* ── Wuxing badges ── */
.wx-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.1rem;
  border-radius: 2px;
  font-size: 0.5rem;
  font-weight: 500;
}
.wx-木 {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["木"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["木"]');
}
.wx-火 {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["火"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["火"]');
}
.wx-土 {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["土"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["土"]');
}
.wx-金 {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["金"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["金"]');
}
.wx-水 {
  background: color-mix(in srgb, v-bind('WUXING_COLORS["水"]') 8%, transparent);
  color: v-bind('WUXING_COLORS["水"]');
}

/* ── Detail lines ── */
.detail-line {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(250, 240, 224, 0.3);
  border-radius: 0.375rem;
  border: 1px solid rgba(44, 26, 14, 0.02);
}

.detail-line__label {
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--color-ink-dark, #2C1810);
  min-width: 5rem;
  letter-spacing: 0.03em;
}

.detail-line__text {
  font-family: var(--font-sans);
  font-size: 0.6rem;
  color: var(--color-ink-medium, #5A4A3A);
  line-height: 1.6;
  letter-spacing: 0.02em;
}

.nayin-tag {
  display: inline-block;
  font-family: var(--font-sans);
  font-size: 0.5rem;
  color: var(--color-cinnabar, #C62828);
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: rgba(198, 40, 40, 0.04);
  border: 1px solid rgba(198, 40, 40, 0.08);
  letter-spacing: 0.06em;
}

/* ── Input label ── */
.input-label {
  display: block;
  font-family: var(--font-sans);
  font-size: 0.65rem;
  color: var(--color-ink-medium, #5A4A3A);
  letter-spacing: 0.06em;
  margin-bottom: 0.3rem;
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
