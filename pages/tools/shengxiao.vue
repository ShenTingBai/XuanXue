<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { calculateShengXiao } from '~/utils/shengxiao/engine'
import { toIsoDate, compareIsoDates, parseDateString } from '~/utils/shengxiao/date'
import type { ToolResultState } from '~/types/tool-result'
import type { ShengXiaoResult } from '~/types/shengxiao'
import { canExportTool } from '~/constants/tool-catalog'
import { SHENGXIAO_RULE_VERSION } from '~/constants/shengxiao-rules'
import VerifiedResult from '~/components/tools/shengxiao/VerifiedResult.vue'
import BirthDateInput from '~/components/tools/BirthDateInput.vue'
import VerifiedCulture from '~/components/tools/shengxiao/VerifiedCulture.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import PageHero from '~/components/tools/PageHero.vue'

/**
 * R3「查我的生肖」与「认识十二生肖」游客页面。
 *
 * 生命周期（契约 §6、foundation §5）：
 * - 草稿只存在于本页组件 ref/reactive 内存，不写 localStorage/sessionStorage/URL/日志；
 * - 刷新、离页、卸载清除草稿与结果；
 * - 登录不自动导入，authenticated → guest 时清除草稿/结果/声明；
 * - 未声明已满十四岁或明确未满时不提交个人计算，公共浏览始终可用；
 * - asOfDate 仅在浏览器用 Intl.DateTimeFormat 按 Asia/Shanghai 取，每次提交刷新；
 * - 不强制登录、不 restoreSession、不读 currentProfile、不自动填充。
 */

// ── 工具目录状态（shengxiao 当前 in_review/internal/blocked/disabled）──
const toolPublic = canExportTool('shengxiao')

// ── 当次草稿（页面内存）──
const draft = reactive<{ year: string; month: string; day: string }>({
  year: '',
  month: '',
  day: '',
})

// ── 十四周岁确认（仅页面状态）──
type AgeConfirm = 'unknown' | 'confirmed' | 'underage'
const ageConfirm = ref<AgeConfirm>('unknown')

// ── 结果与统一状态（契约 §7）──
const result = ref<ShengXiaoResult | null>(null)
const toolState = ref<ToolResultState>({ phase: 'idle' })
const errorMessage = ref('')

// ── asOfDate（浏览器 Asia/Shanghai 当日，纯日期）──
function getShanghaiDate(): string {
  if (typeof document === 'undefined') return ''
  try {
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now)
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')}`
  } catch {
    // 极端环境回退：不读时钟由页面保证，这里仅兜底
    return ''
  }
}
const asOfDate = ref('')

// ── 计算输入是否完整、是否可提交 ──
const draftComplete = computed(() => {
  return draft.year !== '' && draft.month !== '' && draft.day !== ''
})

const canSubmit = computed(() => {
  return draftComplete.value && ageConfirm.value === 'confirmed'
})

const ageBlocked = computed(() => ageConfirm.value === 'underage')

// ── 输入校验（真实日期 + 范围）──
function validateDraft(): string {
  if (draft.year === '' || draft.month === '' || draft.day === '') {
    return '请填写完整的公历出生日期'
  }
  const iso = toIsoDate(Number(draft.year), Number(draft.month), Number(draft.day))
  const parsed = parseDateString(iso)
  if (!parsed) {
    return '请输入真实存在的公历日期（注意闰年二月二十九日）'
  }
  if (compareIsoDates(iso, '1901-01-01') < 0) {
    return '暂不支持 1901 年之前的日期'
  }
  if (asOfDate.value && compareIsoDates(iso, asOfDate.value) > 0) {
    return '暂不支持查询未来日期'
  }
  return ''
}

// ── 主动生成（只有用户点击才计算）──
function handleSubmit() {
  // 第一道门：只有明确确认已满十四周岁才允许提交；unknown 与 underage 均拒绝
  if (ageConfirm.value !== 'confirmed') return
  if (!draftComplete.value) {
    toolState.value = { phase: 'failure', failureCategory: 'invalid_input' }
    errorMessage.value = validateDraft()
    return
  }
  // 每次提交刷新当天值（治理规范 §8.2 按 Asia/Shanghai）
  const today = getShanghaiDate()
  if (!today) {
    toolState.value = { phase: 'failure', failureCategory: 'engine_error' }
    errorMessage.value = '无法确定查询当日日期，请稍后重试。'
    return
  }
  asOfDate.value = today

  const iso = toIsoDate(Number(draft.year), Number(draft.month), Number(draft.day))
  const error = validateDraft()
  if (error) {
    toolState.value = { phase: 'failure', failureCategory: 'invalid_input' }
    errorMessage.value = error
    return
  }

  toolState.value = { phase: 'processing' }
  const outcome = calculateShengXiao(iso, asOfDate.value)
  if (outcome.phase === 'success') {
    result.value = outcome
    toolState.value = {
      phase: 'success',
      successQualifier: outcome.successQualifier,
      freshness: 'current',
    }
    errorMessage.value = ''
  } else {
    result.value = null
    if (outcome.failureCategory === 'unsupported_input') {
      toolState.value = {
        phase: 'failure',
        failureCategory: 'unsupported_input',
        failureDetailCode: outcome.failureDetailCode,
      }
      errorMessage.value = '该日期超出当前支持范围（1901-01-01 至查询当日），未进行近似计算。'
    } else if (outcome.failureCategory === 'engine_error') {
      toolState.value = { phase: 'failure', failureCategory: 'engine_error' }
      errorMessage.value = '农历换算未能完成，请稍后重试。'
    } else {
      toolState.value = { phase: 'failure', failureCategory: 'invalid_input' }
      errorMessage.value = '请输入真实存在的公历日期。'
    }
  }
}

// ── 输入修改 → 旧结果标记 stale（治理规范 §7.4）──
function handleInputChange(field: 'year' | 'month' | 'day', value: string) {
  draft[field] = value
  if (result.value) {
    toolState.value = {
      phase: 'success',
      successQualifier: result.value.successQualifier,
      freshness: 'stale',
    }
  }
}

// ── 认证状态变化：authenticated → guest 清除草稿/结果/声明 ──
const { authStatus } = useAuth()
watch(
  () => authStatus.value,
  (current, previous) => {
    if (previous === 'authenticated' && current === 'guest') {
      draft.year = ''
      draft.month = ''
      draft.day = ''
      result.value = null
      toolState.value = { phase: 'idle' }
      errorMessage.value = ''
      ageConfirm.value = 'unknown'
    }
  },
)

// ── 卸载时清除（页面内存草稿本就随组件销毁，这里确保不残留引用）──
onBeforeUnmount(() => {
  draft.year = ''
  draft.month = ''
  draft.day = ''
  result.value = null
  errorMessage.value = ''
})

// ── 隐私文化卡片导出（单独 DOM，不含出生日期）──
const verifiedResultRef = ref<InstanceType<typeof VerifiedResult> | null>(null)
const { exportToImage, isExporting, exportError } = useExportImage()

const exportCardEl = computed<HTMLElement | null>(
  () => verifiedResultRef.value?.privacyCardEl ?? null,
)

const canExportCard = computed(() => {
  if (!toolPublic) return false
  if (!result.value) return false
  if (toolState.value.phase !== 'success') return false
  return toolState.value.freshness !== 'stale'
})

function handleExportCard() {
  if (!canExportCard.value) return
  const cardEl = verifiedResultRef.value?.privacyCardEl
  if (!cardEl) return
  exportToImage(cardEl, '生肖文化卡片.png')
}

// ── SEO（中性生肖查询/文化说明）──
useSeoMeta({
  title: '生肖文化 — 玄·道',
  ogTitle: '生肖文化 — 玄·道',
  description:
    '根据公历出生日期按农历正月初一查询民俗生肖，并认识十二生肖次序、地支对应与干支循环基础。',
  ogDescription:
    '根据公历出生日期按农历正月初一查询民俗生肖，并认识十二生肖次序、地支对应与干支循环基础。',
  ogType: 'website',
})
</script>

<template>
  <ToolPageLayout>
    <template #nav>
      <div class="space-y-1">
        <a href="#shengxiao-query" class="nav-link no-underline">
          <span>查我的生肖</span>
        </a>
        <a href="#shengxiao-culture" class="nav-link no-underline">
          <span>认识十二生肖</span>
        </a>
      </div>
    </template>

    <h1 class="sr-only">生肖文化</h1>

    <PageHero
      emoji="🐀"
      title="生肖文化"
      subtitle="按农历正月初一查询民俗生肖，并了解十二生肖的文化分类基础。"
    />

    <main class="shengxiao-page max-w-[48rem] mx-auto space-y-6">
      <!-- 查我的生肖：输入与当次操作 -->
      <section
        id="shengxiao-query"
        class="card-paper-solid rounded-xl p-6 sm:p-8"
        aria-labelledby="shengxiao-query-heading"
      >
        <h2 id="shengxiao-query-heading" class="font-display text-xl text-ink-dark">查我的生肖</h2>
        <p class="mt-2 font-sans text-sm text-ink-medium leading-relaxed">
          填写公历出生日期后主动生成。日期只在本页内存中使用，不提交服务器、不保存历史。
        </p>

        <BirthDateInput
          class="mt-4"
          :year="draft.year"
          :month="draft.month"
          :day="draft.day"
          :error="errorMessage"
          @update:year="handleInputChange('year', $event)"
          @update:month="handleInputChange('month', $event)"
          @update:day="handleInputChange('day', $event)"
        />

        <!-- 十四周岁确认（仅页面状态） -->
        <div class="mt-4" role="group" aria-labelledby="age-confirm-label">
          <p id="age-confirm-label" class="font-sans text-sm text-ink-medium">年龄确认</p>
          <div class="mt-2 flex flex-wrap gap-3">
            <label class="inline-flex items-center gap-2 font-sans text-sm text-ink-medium">
              <input
                v-model="ageConfirm"
                type="radio"
                name="age-confirm"
                value="confirmed"
                class="sr-only"
              />
              <span class="age-radio age-radio--confirmed" aria-hidden="true" />
              <span>已满十四周岁</span>
            </label>
            <label class="inline-flex items-center gap-2 font-sans text-sm text-ink-medium">
              <input
                v-model="ageConfirm"
                type="radio"
                name="age-confirm"
                value="underage"
                class="sr-only"
              />
              <span class="age-radio age-radio--underage" aria-hidden="true" />
              <span>未满十四周岁</span>
            </label>
          </div>
        </div>

        <div v-if="ageBlocked" class="mt-3 font-sans text-sm text-ink-medium" role="status">
          未满十四周岁时不能提交个人日期计算，但仍可浏览下方「认识十二生肖」公共文化内容。
        </div>
        <div v-else-if="!canSubmit" class="mt-3 font-sans text-sm text-ink-light">
          请先填写完整日期并确认已满十四周岁。
        </div>

        <div class="mt-4">
          <button class="btn-seal" type="button" :disabled="!canSubmit" @click="handleSubmit">
            <span>生成生肖结果</span>
          </button>
        </div>
      </section>

      <!-- 统一状态区（处理中/失败/stale） -->
      <section aria-live="polite" aria-atomic="true">
        <!-- 处理中 -->
        <div
          v-if="toolState.phase === 'processing'"
          class="card-warm rounded-xl p-6 sm:p-8"
          role="status"
        >
          <p class="font-sans text-sm text-ink-medium">正在生成…</p>
        </div>

        <!-- 失败 -->
        <div
          v-else-if="toolState.phase === 'failure'"
          class="card-warm rounded-xl p-6 sm:p-8 border-l-[3px] border-l-cinnabar"
          role="alert"
        >
          <h2 class="font-display text-lg text-ink-dark">未能生成结果</h2>
          <p class="mt-2 font-sans text-sm text-ink-medium">{{ errorMessage }}</p>
          <p class="mt-1 font-sans text-xs text-ink-medium">输入已保留，可直接修改后重新生成。</p>
        </div>

        <!-- stale 提示 -->
        <div
          v-else-if="result && toolState.phase === 'success' && toolState.freshness === 'stale'"
          class="card-warm rounded-xl p-6 sm:p-8"
          role="status"
        >
          <p class="font-sans text-sm text-ink-medium">
            输入已修改，结果尚未更新。主动点击「生成生肖结果」后才会重新计算。
          </p>
        </div>
      </section>

      <!-- 结果 -->
      <div v-if="result && toolState.phase === 'success' && toolState.freshness !== 'stale'">
        <div class="flex items-center justify-between mb-4">
          <span></span>
          <ExportButton
            v-if="canExportCard"
            :target-ref="exportCardEl"
            filename="生肖文化卡片.png"
            :is-exporting="isExporting"
            :export-error="exportError"
            @export="handleExportCard"
          />
        </div>
        <VerifiedResult ref="verifiedResultRef" :result="result" />
      </div>

      <!-- 认识十二生肖：公共文化浏览 -->
      <section id="shengxiao-culture" class="mt-10">
        <VerifiedCulture />
      </section>

      <!-- 依据与范围（正常阅读流） -->
      <section class="card-warm rounded-xl p-6 sm:p-8" aria-labelledby="shengxiao-scope-heading">
        <h2 id="shengxiao-scope-heading" class="section-header font-display text-xl text-ink-dark">
          依据与范围
        </h2>
        <ul class="mt-3 space-y-2 font-sans text-sm text-ink-medium leading-relaxed">
          <li>生肖按中国农历正月初一为年界；八字年柱按精确立春，两者用途不同，结果可能不同。</li>
          <li>支持范围：公历 1901-01-01 至查询当日（Asia/Shanghai）。</li>
          <li>
            规则版本：{{ SHENGXIAO_RULE_VERSION }}。传统分类不代表个人整体五行强弱或现实预测。
          </li>
          <li>未核验的地支关系、扩展文化形象等不在此页展示。</li>
        </ul>
      </section>
    </main>
  </ToolPageLayout>
</template>

<style scoped>
/* 时区、来源标识在窄屏和放大字体下也必须留在正常阅读流中。 */
.shengxiao-page {
  overflow-wrap: anywhere;
}
.age-radio {
  display: inline-block;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  border: 1px solid var(--color-ink-faint);
  background: transparent;
}
.age-radio--confirmed {
  border-color: var(--color-jade);
}
.age-radio--underage {
  border-color: var(--color-cinnabar);
}
.sr-only:focus-visible + .age-radio {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}
</style>
