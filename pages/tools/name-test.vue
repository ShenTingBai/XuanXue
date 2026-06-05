<script setup lang="ts">
import { WUXING_COLORS } from '~/constants/bazi'
import { calculateNameTest, type NameTestResult } from '~/composables/useNameTest'
import type { FetchError } from '~/types/errors'

const { currentProfile, restoreSession, getAuthHeaders } = useAuth()
const router = useRouter()

import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ToolToolbar from '~/components/tools/ToolToolbar.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import HistoryModal from '~/components/tools/HistoryModal.vue'
import ScoreRing from '~/components/tools/ScoreRing.vue'
import MethodologyNote, { type ClassicalSource } from '~/components/tools/MethodologyNote.vue'

useHead({ title: '姓名测试 — 玄·道' })

// ── 方法论溯源数据 ──
const nameTestClassical: ClassicalSource[] = [
  { method: '五格剖象法', source: '熊崎健翁《姓名学の極意》（1934），融合易学五行与日本姓名学' },
  { method: '81 数理吉凶表', source: '同上，熊崎健翁《姓名学》，数理 1-81 吉凶分类与命名' },
  { method: '三才五行生克', source: '《易经》五行生克原理，天/人/地三才配置吉凶' },
  { method: '汉字笔画', source: '康熙字典笔画规范，makemeahanzi 开源数据库（~9565 字）' },
]

const nameTestSynthesis: string[] = [
  '五格各 20 分 + 人格双倍权重 + 三才 20 分（共 140→压缩至 0-100）',
  '评分阈值：≥80 大吉 / ≥60 中吉 / ≥40 末吉（工程校准）',
  '数理分类标签（首领运/财富运等）为现代实用分类整理',
]

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
const restoreErrorTimer = ref<ReturnType<typeof setTimeout> | null>(null)

function handleExport() {
  if (resultRef.value) {
    exportToImage(resultRef.value, '姓名分析.png')
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
  if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
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
    // eslint-disable-next-line no-console
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
      const code = (e as FetchError).statusCode
      if (code === 429) return
      if (code === 401) return
    }
    // eslint-disable-next-line no-console
    console.error('保存姓名测试记录失败:', e)
  }
}

async function onHistoryRestore(id: number) {
  showHistoryModal.value = false
  try {
    const headers = getAuthHeaders()
    if (!headers.Authorization) return
    const record = await $fetch<import('~/server/api/divinations/shared').DivinationDetailResponse>(
      `/api/divinations/${id}`,
      {
        headers,
      },
    )
    if (
      record.result_data &&
      typeof record.result_data === 'object' &&
      (record.result_data as Record<string, unknown>).fullName
    ) {
      result.value = record.result_data as NameTestResult
      restoreError.value = ''
    } else {
      restoreError.value = '历史记录数据无效'
      if (restoreErrorTimer.value) clearTimeout(restoreErrorTimer.value)
      restoreErrorTimer.value = setTimeout(() => {
        restoreError.value = ''
      }, 6000)
    }
  } catch {
    restoreError.value = '历史记录加载失败，请稍后重试'
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
  // 留输入内容，不清空——用户可能想微调
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function fortuneColor(f: '吉' | '凶' | '半吉'): string {
  if (f === '吉') return 'var(--color-jade)'
  if (f === '凶') return 'var(--color-cinnabar)'
  return 'var(--color-ink-muted)'
}
</script>

<template>
  <ToolPageLayout>
    <h1 class="sr-only">姓名测试</h1>

    <div role="status" class="sr-only" aria-live="polite">
      {{ loading ? '正在计算...' : result ? '结果已就绪' : '' }}
    </div>

    <div class="max-w-[48rem] mx-auto">
      <ToolToolbar :show-history="true" @history="showHistoryModal = true">
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
        <div class="flex items-center justify-between">
          <div class="section-header !mb-0 flex-1 min-w-0">
            <h2>输入姓名</h2>
          </div>
          <MethodologyNote
            :classical="nameTestClassical"
            :synthesis="nameTestSynthesis"
            tool="姓名测试"
          />
        </div>
        <p class="text-xs text-ink-medium mb-6 tracking-wide">请输入您的姓名进行五格剖象分析</p>

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

        <div class="flex justify-center items-center gap-4 mt-8">
          <button
            :disabled="loading"
            class="btn-seal"
            @click="computeNameTest"
            @keydown.enter="computeNameTest"
          >
            <span>{{ loading ? '分析中...' : '开始分析' }}</span>
          </button>
          <button
            v-if="result"
            class="btn-ink"
            @click="resetToForm"
            @keydown.enter="resetToForm"
            @keydown.space.prevent="resetToForm"
          >
            <span>⟲ 重新测算</span>
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
                {{
                  result.totalScore >= 80
                    ? '大吉'
                    : result.totalScore >= 60
                      ? '中吉'
                      : result.totalScore >= 40
                        ? '末吉'
                        : '凶'
                }}
              </div>
              <div class="score-banner__name">{{ result.fullName }}</div>
            </div>
            <div class="score-banner__center">
              <ScoreRing :score="result.totalScore" :size="64" />
            </div>
            <div class="score-banner__right">
              <p class="score-banner__summary">{{ result.summary }}</p>
            </div>
          </div>

          <!-- 五格一览表 -->
          <div
            class="fade-in mt-6 card-warm rounded-xl overflow-hidden"
            :style="{ '--delay': '0.25s' }"
          >
            <div class="section-header px-8 pt-8 pb-4">
              <h2>五格剖象</h2>
            </div>
            <div class="grid-table">
              <!-- 天格 -->
              <div class="grid-row" :class="{ 'grid-row--alt': true }">
                <div class="grid-row__top">
                  <span class="grid-row__label">天格</span>
                  <span
                    class="grid-row__fortune"
                    :style="{ color: fortuneColor(result.grids.tian.fortune) }"
                  >
                    {{
                      result.grids.tian.fortune === '吉'
                        ? '吉'
                        : result.grids.tian.fortune === '半吉'
                          ? '平'
                          : '凶'
                    }}
                  </span>
                </div>
                <div class="grid-row__mid">
                  <span class="grid-row__strokes">{{ result.grids.tian.strokes }} 画</span>
                  <span class="sept" aria-hidden="true">·</span>
                  <span class="wx-badge" :class="`wx-${result.grids.tian.wuxing}`">{{
                    result.grids.tian.wuxing
                  }}</span>
                  <span class="sept" aria-hidden="true">·</span>
                  <span class="grid-row__number-name">{{ result.grids.tian.name }}</span>
                </div>
                <p class="grid-row__meaning">{{ result.grids.tian.meaning }}</p>
              </div>
              <!-- 人格（主运） -->
              <div class="grid-row grid-row--primary">
                <div class="grid-row__accent" aria-hidden="true"></div>
                <div class="grid-row__top">
                  <span class="grid-row__label"
                    >人格<span class="grid-row__subtitle">主运</span></span
                  >
                  <span
                    class="grid-row__fortune"
                    :style="{ color: fortuneColor(result.grids.ren.fortune) }"
                  >
                    {{
                      result.grids.ren.fortune === '吉'
                        ? '吉'
                        : result.grids.ren.fortune === '半吉'
                          ? '平'
                          : '凶'
                    }}
                  </span>
                </div>
                <div class="grid-row__mid">
                  <span class="grid-row__strokes">{{ result.grids.ren.strokes }} 画</span>
                  <span class="sept" aria-hidden="true">·</span>
                  <span class="wx-badge" :class="`wx-${result.grids.ren.wuxing}`">{{
                    result.grids.ren.wuxing
                  }}</span>
                  <span class="sept" aria-hidden="true">·</span>
                  <span class="grid-row__number-name">{{ result.grids.ren.name }}</span>
                </div>
                <p class="grid-row__meaning">{{ result.grids.ren.meaning }}</p>
              </div>
              <!-- 地格（前运） -->
              <div class="grid-row grid-row--alt">
                <div class="grid-row__top">
                  <span class="grid-row__label"
                    >地格<span class="grid-row__subtitle">前运</span></span
                  >
                  <span
                    class="grid-row__fortune"
                    :style="{ color: fortuneColor(result.grids.di.fortune) }"
                  >
                    {{
                      result.grids.di.fortune === '吉'
                        ? '吉'
                        : result.grids.di.fortune === '半吉'
                          ? '平'
                          : '凶'
                    }}
                  </span>
                </div>
                <div class="grid-row__mid">
                  <span class="grid-row__strokes">{{ result.grids.di.strokes }} 画</span>
                  <span class="sept" aria-hidden="true">·</span>
                  <span class="wx-badge" :class="`wx-${result.grids.di.wuxing}`">{{
                    result.grids.di.wuxing
                  }}</span>
                  <span class="sept" aria-hidden="true">·</span>
                  <span class="grid-row__number-name">{{ result.grids.di.name }}</span>
                </div>
                <p class="grid-row__meaning">{{ result.grids.di.meaning }}</p>
              </div>
              <!-- 总格（后运） -->
              <div class="grid-row">
                <div class="grid-row__top">
                  <span class="grid-row__label"
                    >总格<span class="grid-row__subtitle">后运</span></span
                  >
                  <span
                    class="grid-row__fortune"
                    :style="{ color: fortuneColor(result.grids.total.fortune) }"
                  >
                    {{
                      result.grids.total.fortune === '吉'
                        ? '吉'
                        : result.grids.total.fortune === '半吉'
                          ? '平'
                          : '凶'
                    }}
                  </span>
                </div>
                <div class="grid-row__mid">
                  <span class="grid-row__strokes">{{ result.grids.total.strokes }} 画</span>
                  <span class="sept" aria-hidden="true">·</span>
                  <span class="wx-badge" :class="`wx-${result.grids.total.wuxing}`">{{
                    result.grids.total.wuxing
                  }}</span>
                  <span class="sept" aria-hidden="true">·</span>
                  <span class="grid-row__number-name">{{ result.grids.total.name }}</span>
                </div>
                <p class="grid-row__meaning">{{ result.grids.total.meaning }}</p>
              </div>
              <!-- 外格（副运） -->
              <div class="grid-row grid-row--alt">
                <div class="grid-row__top">
                  <span class="grid-row__label"
                    >外格<span class="grid-row__subtitle">副运</span></span
                  >
                  <span
                    class="grid-row__fortune"
                    :style="{ color: fortuneColor(result.grids.wai.fortune) }"
                  >
                    {{
                      result.grids.wai.fortune === '吉'
                        ? '吉'
                        : result.grids.wai.fortune === '半吉'
                          ? '平'
                          : '凶'
                    }}
                  </span>
                </div>
                <div class="grid-row__mid">
                  <span class="grid-row__strokes">{{ result.grids.wai.strokes }} 画</span>
                  <span class="sept" aria-hidden="true">·</span>
                  <span class="wx-badge" :class="`wx-${result.grids.wai.wuxing}`">{{
                    result.grids.wai.wuxing
                  }}</span>
                  <span class="sept" aria-hidden="true">·</span>
                  <span class="grid-row__number-name">{{ result.grids.wai.name }}</span>
                </div>
                <p class="grid-row__meaning">{{ result.grids.wai.meaning }}</p>
              </div>
            </div>

            <!-- 三才配置 -->
            <div
              class="px-8 pb-8 pt-4 border-t"
              style="border-color: color-mix(in srgb, var(--color-ink-faint) 16%, transparent)"
            >
              <div class="flex items-center gap-2 mb-2">
                <span class="font-sans text-xs text-ink-medium">三才配置</span>
                <span class="text-xs text-ink-light"
                  >天格{{ result.sanCai.tian }} → 人格{{ result.sanCai.ren }} → 地格{{
                    result.sanCai.di
                  }}</span
                >
                <span
                  class="text-xs font-medium"
                  :style="{ color: fortuneColor(result.sanCai.fortune) }"
                >
                  ·
                  {{
                    result.sanCai.fortune === '吉'
                      ? '相生大吉'
                      : result.sanCai.fortune === '半吉'
                        ? '半吉'
                        : '相克大凶'
                  }}
                </span>
              </div>
              <div v-if="result.categories.length > 0" class="flex flex-wrap gap-1.5">
                <span v-for="cat in result.categories" :key="cat" class="nayin-tag">{{ cat }}</span>
              </div>
            </div>
          </div>

          <!-- 各格详解 -->
          <div class="fade-in mt-6 space-y-3" :style="{ '--delay': '0.5s' }">
            <p class="text-xs text-ink-medium tracking-wide text-center">各格详情</p>
            <div v-for="detail in result.details" :key="detail.label" class="detail-line">
              <span class="detail-line__label">{{ detail.label }}</span>
              <span class="detail-line__text">{{ detail.text }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Restore error toast -->
    <Transition name="toast">
      <div v-if="restoreError" class="toast-notification" role="alert">
        <span class="toast-notification__mark" aria-hidden="true">!</span>
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
      type="name-test"
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
/* ── Score banner ── */
.score-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(
    135deg,
    var(--color-paper-lightest) 0%,
    var(--color-paper-light) 100%
  );
  border-radius: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--color-ink-faint) 12%, transparent);
  border-left: 3px solid var(--color-cinnabar);
}

@media (max-width: 639px) {
  .score-banner {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
    border-left: 1px solid color-mix(in srgb, var(--color-ink-faint) 12%, transparent);
    border-top: 3px solid var(--color-cinnabar);
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
  color: var(--color-cinnabar);
  letter-spacing: 0.2em;
  line-height: 1.2;
}

.score-banner__name {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.15em;
}

.score-banner__center {
  flex-shrink: 0;
}

.score-banner__right {
  flex: 1;
  min-width: 0;
}

.score-banner__summary {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-medium);
  line-height: 1.55;
  letter-spacing: 0.02em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Grid table (redesigned — rows without header) ── */
.grid-table {
  display: flex;
  flex-direction: column;
}

.grid-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.625rem 2rem;
  position: relative;
}

.grid-row--alt {
  background: color-mix(in srgb, var(--color-paper-lightest) 40%, transparent);
}

/* 人格主运 — cinnabar accent + tint */
.grid-row--primary {
  background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
  padding-left: calc(2rem + 3px);
}

.grid-row__accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-cinnabar);
  border-radius: 0 1.5px 1.5px 0;
}

.grid-row__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.grid-row__label {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-ink-dark);
  letter-spacing: 0.04em;
}

.grid-row__subtitle {
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--color-ink-muted);
  margin-left: 0.4em;
  letter-spacing: 0.02em;
}

.grid-row__fortune {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  flex-shrink: 0;
}

.grid-row__mid {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-medium);
}

.grid-row__strokes {
  color: var(--color-ink-medium);
}

.grid-row__number-name {
  color: var(--color-ink-light);
}

.sept {
  color: var(--color-ink-faint);
  font-size: 0.6875rem;
  user-select: none;
}

.grid-row__meaning {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  line-height: 1.55;
  letter-spacing: 0.02em;
  margin: 0;
}

/* ── Wuxing badges ── */
.wx-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.25rem;
  border-radius: 2px;
  font-size: 0.6875rem;
  font-weight: 500;
  flex-shrink: 0;
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
  background: color-mix(in srgb, var(--color-paper-lightest) 30%, transparent);
  border-radius: 0.375rem;
  border: 1px solid color-mix(in srgb, var(--color-ink-faint) 6%, transparent);
}

.detail-line__label {
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-ink-dark);
  min-width: 5.5rem;
  letter-spacing: 0.03em;
}

.detail-line__text {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-medium);
  line-height: 1.6;
  letter-spacing: 0.02em;
}

.nayin-tag {
  display: inline-block;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-cinnabar);
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-cinnabar) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-cinnabar) 8%, transparent);
  letter-spacing: 0.06em;
}

/* ── Input label ── */
.input-label {
  display: block;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.06em;
  margin-bottom: 0.3rem;
}

/* ── Animation ── */
.fade-in {
  animation: secIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay, 0s);
}

@keyframes secIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
