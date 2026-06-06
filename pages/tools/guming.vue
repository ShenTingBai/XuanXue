<!-- 称骨算命 / GuMing Bone Weight Fortune -->

<script setup lang="ts">
import { calculateGuMing, type GuMingResult } from '~/composables/useGuMing'
import { HOUR_NAMES } from '~/constants/gu-ming'
import type { Ref } from 'vue'
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
import MethodologyNote from '~/components/tools/MethodologyNote.vue'
import ProfileAutoFillBanner from '~/components/tools/ProfileAutoFillBanner.vue'
import { useProfileAutoFill } from '~/composables/useProfileAutoFill'
useSeoMeta({
  title: '称骨算命 — 玄·道',
  ogTitle: '称骨算命 — 玄·道',
  description: '袁天罡称骨算命，根据出生年月日时推算骨重，解读一生命运走向。',
  ogDescription: '袁天罡称骨算命，根据出生年月日时推算骨重，解读一生命运走向。',
  ogType: 'website',
})
const gumingClassical = [
  { method: '称骨歌断语', source: '袁天罡《称骨歌》，唐代命理文献，公共领域经典' },
  { method: '年柱六十甲子', source: '《六十甲子纳音表》，干支纪年与五行属性对应' },
  { method: '月/日/时权重', source: '袁天罡称骨法，按月令、日数、时辰分定骨重' },
]
const gumingSynthesis = [
  '年柱→六十甲子索引 (年-4) % 60 映射，查 YEAR_WEIGHTS 表',
  '月/日/时权重线性叠加，总骨重 = 四柱之和（精确至 0.1 两）',
  '总骨重 2.1→7.2 两对应 52 条称骨歌断语，等级分五档',
  '骨重等级：≤2.9 下下 / 3.0-3.9 中下 / 4.0-4.9 中 / 5.0-5.9 中上 / ≥6.0 上上',
]
const result = ref(null) as Ref<GuMingResult | null>
const loading = ref(false)
const error = ref('')
const birthYear = ref(new Date().getFullYear())
const birthMonth = ref(1)
const birthDay = ref(1)
const birthHour = ref(0)
const gender = ref('male')
const showScrollTop = ref(false)
const resultRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()
const showHistoryModal = ref(false)
const restoreError = ref<string | null>(null)
const restoreErrorTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const {
  showBanner,
  isFilled,
  birthData,
  missingBirth,
  checkAvailability,
  applyAutoFill,
  revokeAutoFill,
  markEdited,
} = useProfileAutoFill({ calendarNeeded: 'lunar' })

function handleAutoFill() {
  const data = applyAutoFill()
  if (data) {
    birthYear.value = data.year
    birthMonth.value = data.month
    birthDay.value = data.day
    if (data.hour != null) birthHour.value = data.hour
    gender.value = data.gender ?? 'male'
  }
}

function handleRevoke() {
  revokeAutoFill()
  birthYear.value = new Date().getFullYear()
  birthMonth.value = 1
  birthDay.value = 1
  birthHour.value = 0
  gender.value = 'male'
}

watch([birthYear, birthMonth, birthDay, birthHour, gender], () => {
  if (isFilled.value && birthData.value) {
    const d = birthData.value
    if (birthYear.value !== d.year || birthMonth.value !== d.month || birthDay.value !== d.day) {
      markEdited()
    }
  }
})

function handleExport() {
  if (resultRef.value) {
    exportToImage(resultRef.value, '称骨算命.png')
  }
}
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
async function computeGuMing() {
  if (birthMonth.value < 1 || birthMonth.value > 12) {
    error.value = '月份应在 1-12 之间'
    return
  }
  if (birthDay.value < 1 || birthDay.value > 30) {
    error.value = '日数应在 1-30 之间'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const input = {
      birthYear: birthYear.value,
      birthMonth: birthMonth.value,
      birthDay: birthDay.value,
      birthHour: birthHour.value,
      gender: gender.value as 'male' | 'female',
    }
    const res = calculateGuMing(input)
    result.value = res
    saveDivinationResult(res)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e)
    error.value = '计算失败'
  } finally {
    loading.value = false
  }
}
async function saveDivinationResult(res: GuMingResult) {
  try {
    const h = getAuthHeaders()
    if (!h.Authorization) return
    await $fetch('/api/divinations', {
      method: 'POST',
      headers: h,
      body: {
        type: 'guming',
        input_data: {
          birthYear: birthYear.value,
          birthMonth: birthMonth.value,
          birthDay: birthDay.value,
          birthHour: birthHour.value,
          gender: gender.value,
        },
        result_data: JSON.parse(JSON.stringify(res)),
      },
    })
  } catch (e) {
    if ((e as FetchError).statusCode === 429 || (e as FetchError).statusCode === 401) return
    // eslint-disable-next-line no-console
    console.error('save:', e)
  }
}
async function onHistoryRestore(id: number) {
  showHistoryModal.value = false
  try {
    const h = getAuthHeaders()
    if (!h.Authorization) return
    const r = await $fetch<import('~/server/api/divinations/shared').DivinationDetailResponse>(
      '/api/divinations/' + id,
      { headers: h },
    )
    if (
      r.result_data &&
      typeof r.result_data === 'object' &&
      typeof (r.result_data as Record<string, unknown>).totalWeight === 'number'
    ) {
      result.value = r.result_data as GuMingResult
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
function getLevelBadgeClass(l: string) {
  if (l === '上上') return 'level-badge--shangshang'
  if (l === '中上') return 'level-badge--zhongshang'
  if (l === '中') return 'level-badge--zhong'
  if (l === '中下') return 'level-badge--zhongxia'
  return 'level-badge--xiaxia'
}
const scalePercent = computed(function () {
  if (!result.value) return 0
  return Math.min(100, Math.max(0, ((result.value.totalWeight - 2.1) / (7.2 - 2.1)) * 100))
})
</script>
<template>
  <ToolPageLayout>
    <h1 class="sr-only">称骨算命</h1>
    <div role="status" class="sr-only" aria-live="polite">
      {{ loading ? '正在计算...' : result ? '结果已就绪' : '' }}
    </div>
    <div class="max-w-[48rem] mx-auto">
      <ToolToolbar :show-history="true" @history="showHistoryModal = true">
        <template #extra>
          <ExportButton
            v-if="result"
            :target-ref="resultRef"
            filename="称骨算命.png"
            :is-exporting="isExporting"
            @export="handleExport"
          />
        </template>
      </ToolToolbar>
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
      <div class="fade-in card-paper-solid rounded-xl p-8" :style="{ '--delay': '0.1s' }">
        <div class="flex items-center justify-between mb-6">
          <div class="section-header flex-1 min-w-0 !mb-0"><h2>称骨算命</h2></div>
          <MethodologyNote
            :classical="gumingClassical"
            :synthesis="gumingSynthesis"
            tool="称骨算命"
          />
        </div>
        <p class="text-xs text-ink-medium mb-6 tracking-wide">
          输入农历出生年月日时，袁天罡称骨法为你推算命格轻重。
        </p>
        <p class="text-xs text-ink-light mt-1">
          ⚠ 称骨以农历为准。若档案为阳历，填入时将自动转换。
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
          <div>
            <label for="guming-year" class="input-label">出生年（农历）</label
            ><input
              id="guming-year"
              v-model.number="birthYear"
              type="number"
              class="input-ink w-full"
              min="1900"
              :max="new Date().getFullYear()"
              placeholder="如 1990"
            />
          </div>
          <div>
            <label for="guming-month" class="input-label">出生月（农历）</label
            ><input
              id="guming-month"
              v-model.number="birthMonth"
              type="number"
              class="input-ink w-full"
              min="1"
              max="12"
              placeholder="1-12"
            />
          </div>
          <div>
            <label for="guming-day" class="input-label">出生日（农历）</label
            ><input
              id="guming-day"
              v-model.number="birthDay"
              type="number"
              class="input-ink w-full"
              min="1"
              max="30"
              placeholder="1-30"
            />
          </div>
          <div>
            <label for="guming-hour" class="input-label">出生时辰</label
            ><select
              id="guming-hour"
              v-model.number="birthHour"
              class="input-ink w-full appearance-none"
            >
              <option v-for="(name, i) in HOUR_NAMES" :key="i" :value="i">{{ name }}</option>
            </select>
          </div>
        </div>
        <div class="flex items-center justify-center gap-6 mb-6">
          <label class="flex items-center gap-2.5 cursor-pointer group">
            <input v-model="gender" type="radio" name="gender" value="male" class="sr-only" />
            <span
              :class="[
                'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                gender === 'male'
                  ? 'border-cinnabar'
                  : 'border-ink-faint group-hover:border-ink-light',
              ]"
              aria-hidden="true"
            >
              <span
                v-if="gender === 'male'"
                class="w-2 h-2 rounded-full bg-cinnabar transition-all duration-200"
              ></span>
            </span>
            <span
              :class="[
                'text-base transition-colors ui',
                gender === 'male' ? 'text-cinnabar' : 'text-ink-medium',
              ]"
              >男命</span
            >
          </label>
          <label class="flex items-center gap-2.5 cursor-pointer group">
            <input v-model="gender" type="radio" name="gender" value="female" class="sr-only" />
            <span
              :class="[
                'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                gender === 'female'
                  ? 'border-cinnabar'
                  : 'border-ink-faint group-hover:border-ink-light',
              ]"
              aria-hidden="true"
            >
              <span
                v-if="gender === 'female'"
                class="w-2 h-2 rounded-full bg-cinnabar transition-all duration-200"
              ></span>
            </span>
            <span
              :class="[
                'text-base transition-colors ui',
                gender === 'female' ? 'text-cinnabar' : 'text-ink-medium',
              ]"
              >女命</span
            >
          </label>
        </div>
        <div class="flex justify-center items-center gap-4">
          <button
            :disabled="loading"
            class="btn-seal"
            @click="computeGuMing"
            @keydown.enter="computeGuMing"
          >
            <span>{{ loading ? '推命中...' : '开始推算' }}</span>
          </button>
          <button v-if="result" class="btn-ink" @click="resetToForm" @keydown.enter="resetToForm">
            <span>重新推算</span>
          </button>
        </div>
      </div>
      <div v-if="error" class="mt-4 text-center">
        <p class="text-sm text-cinnabar" role="alert">{{ error }}</p>
      </div>
      <div v-if="loading" class="mt-6 space-y-4" aria-busy="true">
        <span class="sr-only">正在计算...</span><SkeletonCard />
      </div>
      <template v-if="result">
        <div ref="resultRef">
          <div class="fade-in mt-8 scale-card" :style="{ '--delay': '0.15s' }">
            <div class="scale-card__header">
              <span class="scale-card__seal">骨重</span
              ><span class="scale-card__weight">{{ result.totalWeightText }}</span
              ><span :class="['scale-card__level', getLevelBadgeClass(result.level)]">{{
                result.level
              }}</span>
            </div>
            <div class="scale-bar-container">
              <div class="scale-bar-track">
                <div class="scale-bar-fill" :style="{ width: scalePercent + '%' }"></div>
                <div class="scale-bar-marker" :style="{ left: scalePercent + '%' }"></div>
              </div>
              <div class="scale-bar-ticks">
                <span
                  v-for="t in [2.1, 3.0, 4.0, 5.0, 6.0, 7.2]"
                  :key="t"
                  class="scale-bar-tick"
                  :style="{ left: ((t - 2.1) / (7.2 - 2.1)) * 100 + '%' }"
                ></span>
              </div>
              <div class="scale-bar-labels"><span>2.1 两</span><span>7.2 两</span></div>
            </div>
          </div>
          <div
            class="fade-in mt-6 card-warm rounded-xl overflow-x-auto"
            :style="{ '--delay': '0.25s' }"
          >
            <div class="section-header px-8 pt-8 pb-4"><h2>骨重详表</h2></div>
            <div class="weight-table">
              <div class="weight-row weight-row--header">
                <span class="w-col w-col--pillar">四柱</span
                ><span class="w-col w-col--info">内容</span
                ><span class="w-col w-col--val">骨重</span>
              </div>
              <div class="weight-row">
                <span class="w-col w-col--pillar">年柱</span
                ><span class="w-col w-col--info">{{ result.yearGanzhi }}</span
                ><span class="w-col w-col--val">{{ result.yearWeight.toFixed(1) }} 两</span>
              </div>
              <div class="weight-row weight-row--alt">
                <span class="w-col w-col--pillar">月柱</span
                ><span class="w-col w-col--info">{{ birthMonth }} 月</span
                ><span class="w-col w-col--val">{{ result.monthWeight.toFixed(1) }} 两</span>
              </div>
              <div class="weight-row">
                <span class="w-col w-col--pillar">日柱</span
                ><span class="w-col w-col--info">{{ birthDay }} 日</span
                ><span class="w-col w-col--val">{{ result.dayWeight.toFixed(1) }} 两</span>
              </div>
              <div class="weight-row weight-row--alt">
                <span class="w-col w-col--pillar">时柱</span
                ><span class="w-col w-col--info">{{ result.hourName }}</span
                ><span class="w-col w-col--val">{{ result.hourWeight.toFixed(1) }} 两</span>
              </div>
              <div class="weight-row weight-row--total">
                <span class="w-col w-col--pillar">总计</span
                ><span class="w-col w-col--info">{{ result.totalWeightText }}</span
                ><span class="w-col w-col--val">{{ result.totalWeight.toFixed(1) }} 两</span>
              </div>
            </div>
          </div>
          <div class="fade-in mt-6 gu-slip" :style="{ '--delay': '0.35s' }">
            <div class="gu-slip__header">
              <span class="gu-slip__trigram">☰</span
              ><span class="gu-slip__seal-mark">袁天罡称骨歌</span
              ><span class="gu-slip__trigram">☷</span>
            </div>
            <div class="gu-slip__divider"></div>
            <div class="gu-slip__poem">
              <p class="gu-slip__poem-text">{{ result.fortune }}</p>
            </div>
            <div class="gu-slip__divider"></div>
            <div class="gu-slip__interpretation">
              <h3 class="gu-slip__section-title">白话解读</h3>
              <p class="gu-slip__text">{{ result.interpretation }}</p>
            </div>
            <div class="gu-slip__footer">
              <div class="gu-slip__footer-line"></div>
              <span class="gu-slip__footer-seal">玄·道</span>
              <div class="gu-slip__footer-line"></div>
            </div>
          </div>
        </div>
      </template>
    </div>
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
      type="guming"
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
.level-badge--shangshang {
  background: color-mix(in oklch, var(--color-cinnabar) 8%, transparent);
  color: var(--color-cinnabar);
  border: 1px solid color-mix(in oklch, var(--color-cinnabar) 20%, transparent);
  border-radius: 3px;
  transform: rotate(-1deg);
}
.level-badge--zhongshang {
  background: color-mix(in oklch, var(--color-jade) 8%, transparent);
  color: var(--color-jade);
  border: 1px solid color-mix(in oklch, var(--color-jade) 20%, transparent);
  border-radius: 3px;
  transform: rotate(-0.5deg);
}
.level-badge--zhong {
  background: color-mix(in oklch, var(--color-ink-light) 8%, transparent);
  color: var(--color-ink-dark);
  border: 1px solid color-mix(in oklch, var(--color-ink-light) 20%, transparent);
  border-radius: 3px;
  transform: none;
}
.level-badge--zhongxia {
  background: color-mix(in oklch, var(--color-gold) 8%, transparent);
  color: var(--color-gold);
  border: 1px solid color-mix(in oklch, var(--color-gold) 20%, transparent);
  border-radius: 3px;
  transform: rotate(0.5deg);
}
.level-badge--xiaxia {
  background: color-mix(in oklch, var(--color-ink-light) 10%, transparent);
  color: var(--color-ink-muted);
  border: 1px solid color-mix(in oklch, var(--color-ink-light) 25%, transparent);
  border-radius: 3px;
  transform: rotate(1deg);
}
.scale-card {
  padding: 1.5rem;
  border-radius: 1rem;
  background: var(--color-paper);
  border: 1px solid color-mix(in oklch, var(--color-ink-darkest) 4%, transparent);
  box-shadow: 0 1px 3px color-mix(in oklch, var(--color-ink-darkest) 4%, transparent);
}
@media (min-width: 640px) {
  .scale-card {
    padding: 2rem;
  }
}
.scale-card__header {
  flex-wrap: wrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.scale-card__seal {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 3px;
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--color-cinnabar);
  letter-spacing: 0.15em;
  background: color-mix(in oklch, var(--color-cinnabar) 4%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-cinnabar) 10%, transparent);
  transform: rotate(-1deg);
}
.scale-card__weight {
  font-family: var(--font-display);
  font-size: 1.75rem;
  color: var(--color-ink-darkest);
  letter-spacing: 0.1em;
}
.scale-card__level {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.6rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
}
.scale-bar-container {
  padding: 0 0.5rem;
}
.scale-bar-track {
  position: relative;
  height: 0.75rem;
  background: color-mix(in oklch, var(--color-ink-darkest) 6%, transparent);
  border-radius: 9999px;
  overflow: visible;
}
.scale-bar-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(
    90deg,
    var(--color-ink-faint) 0%,
    var(--color-cinnabar) 50%,
    var(--color-gold) 100%
  );
  transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
  min-width: 0.75rem;
}
.scale-bar-marker {
  position: absolute;
  top: 50%;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: var(--color-cinnabar);
  border: 2px solid var(--color-paper);
  box-shadow: 0 1px 4px color-mix(in oklch, var(--color-ink-darkest) 20%, transparent);
  transform: translate(-50%, -50%);
  transition: left 0.8s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 1;
}
.scale-bar-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.4rem;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-muted);
}
.scale-bar-ticks {
  position: relative;
  height: 8px;
  margin: 2px 0 4px;
}
.scale-bar-tick {
  position: absolute;
  top: 0;
  width: 1px;
  height: 100%;
  background: color-mix(in oklch, var(--color-ink-darkest) 15%, transparent);
  transform: translateX(-50%);
}
.weight-table {
  width: 100%;
}
.weight-row {
  display: grid;
  grid-template-columns: 4rem 1fr 5rem;
  gap: 0.5rem;
  align-items: center;
  padding: 0.625rem 0.75rem;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink);
}
@media (min-width: 640px) {
  .weight-row {
    padding: 0.625rem 2rem;
    grid-template-columns: 5rem 1fr 6rem;
  }
}
.weight-row--header {
  font-size: 0.6875rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-bottom: 1px solid color-mix(in oklch, var(--color-ink-darkest) 6%, transparent);
}
.weight-row--alt {
  background: color-mix(in oklch, var(--color-ink-darkest) 2%, transparent);
}
.weight-row--total {
  border-top: 1px solid color-mix(in oklch, var(--color-ink-darkest) 8%, transparent);
  font-weight: 600;
  color: var(--color-ink-darkest);
}
.w-col--pillar {
  font-weight: 500;
}
.w-col--val {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.gu-slip {
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
.gu-slip::before {
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
.gu-slip > * {
  position: relative;
  z-index: 1;
}
@media (min-width: 640px) {
  .gu-slip {
    padding: 2.5rem 2rem;
  }
}
.gu-slip__header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.gu-slip__trigram {
  font-size: 1rem;
  color: color-mix(in oklch, var(--color-cinnabar) 20%, transparent);
}
.gu-slip__seal-mark {
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
.gu-slip__divider {
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
.gu-slip__poem {
  padding: 1.25rem 0;
  text-align: center;
}
.gu-slip__poem-text {
  font-family: var(--font-display);
  font-size: 1.1rem;
  line-height: 1.9;
  color: var(--color-ink-darkest);
  letter-spacing: 0.08em;
}
@media (min-width: 640px) {
  .gu-slip__poem-text {
    font-size: 1.25rem;
  }
}
.gu-slip__interpretation {
  padding: 0.75rem 0;
}
.gu-slip__section-title {
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-ink-dark);
  letter-spacing: 0.12em;
  margin-bottom: 0.5rem;
  position: relative;
  padding-left: 0.75rem;
}
.gu-slip__section-title::before {
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
.gu-slip__text {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-medium);
  line-height: 1.8;
  letter-spacing: 0.03em;
  white-space: pre-line;
}
.gu-slip__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 0.75rem;
}
.gu-slip__footer-line {
  flex: 1;
  height: 1px;
  background: color-mix(in oklch, var(--color-ink-darkest) 6%, transparent);
}
.gu-slip__footer-seal {
  font-family: var(--font-display);
  font-size: 0.75rem;
  color: color-mix(in oklch, var(--color-cinnabar) 40%, transparent);
  letter-spacing: 0.3em;
}
</style>
