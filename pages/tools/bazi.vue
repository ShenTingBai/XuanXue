<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BAZI_NOT_OUTPUT, BAZI_TOOL_ID } from '~/constants/bazi-rules'
import { getToolById, canCreateHistory, canReadHistory } from '~/constants/tool-catalog'
import { useBaziDraft } from '~/composables/useBaziDraft'
import { useBaziProfileImport } from '~/composables/useBaziProfileImport'
import { useResultHistory } from '~/composables/useResultHistory'
import { useSelfProfile } from '~/composables/useSelfProfile'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import PageHero from '~/components/tools/PageHero.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import AuthDialog from '~/components/auth/AuthDialog.vue'
import BaziInputForm from '~/components/bazi/BaziInputForm.vue'
import BaziStatusBanner from '~/components/bazi/BaziStatusBanner.vue'
import BaziPillarCard from '~/components/bazi/BaziPillarCard.vue'
import BaziCandidatePanel from '~/components/bazi/BaziCandidatePanel.vue'
import BaziDateComparison from '~/components/bazi/BaziDateComparison.vue'
import BaziReadingGuide from '~/components/bazi/BaziReadingGuide.vue'
import BaziEvidenceScope from '~/components/bazi/BaziEvidenceScope.vue'
import BaziSaveDialog from '~/components/bazi/BaziSaveDialog.vue'
import BaziHistoryPanel from '~/components/bazi/BaziHistoryPanel.vue'
import type { BaziDomainResult, ResultSnapshotRecord } from '~/types/bazi'

/**
 * 八字基础排盘页（R5 首批：日期级三柱）。
 *
 * 结构依据治理规范 §4.1–4.6 的六段顺序，**DOM 阅读顺序即六段顺序**：
 * Ⅰ 工具说明 / Ⅱ 本次操作 / Ⅲ 核心结果摘要 / Ⅳ 通俗解释与详细结果 /
 * Ⅴ 依据与范围 / Ⅵ 本次结果操作。
 *
 * 硬边界（契约 §21、设计文档 §5 措辞红线）：
 * - 本页只输出公历农历对照、年柱/月柱/日柱与日期对照，以及它们的依据、边界与限制；
 *   不输出时柱、大运、流年、流月、神煞、日主强弱、喜用神、忌神、评分、性格判断与现实预测，
 *   也不输出胎元、命宫、身宫；
 * - 不通过补内容填厚度：页面不得新增任何结论型判断；
 * - 页面与组件不引用任何第三方历法库：历法只经 `utils/bazi/*` 领域层（契约 §11）。
 *
 * 草稿与结果都在内存：不写 localStorage / sessionStorage / URL / 日志（数据规范 §15.2）。
 *
 * @author LiXinwen
 */

useSeoMeta({
  title: '八字基础排盘 — 玄·道',
  description:
    '按出生日期排出年、月、日三柱，逐条说明干支依据、节气边界与当前未覆盖的范围。不提供预测、评分或性格判断。',
})

// ── asOfDate（Asia/Shanghai 当日，纯日期）──
// 服务端与客户端都用同一显式时区换算，避免 hydration 时年份列表不一致。
function getShanghaiDate(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')}`
  } catch {
    // 极端环境无法按 Asia/Shanghai 换算：不猜测「今天」，交给生成前置检查处理。
    return ''
  }
}
const asOfDate = ref(getShanghaiDate())
const maxYear = computed(() => {
  const iso = asOfDate.value || getShanghaiDate()
  return iso ? Number(iso.slice(0, 4)) : new Date().getFullYear()
})

/** 当次草稿与结果：asOfDate 由本页在每次生成前刷新（不读系统时钟的职责在页面）。 */
const draft = useBaziDraft({ asOfDate: () => asOfDate.value })
const baziTool = getToolById(BAZI_TOOL_ID)
/** 内部验证态：exposure 为 internal 时明确写出「未公开、仅授权账号可访问」，不承诺发布日期。 */
const internalOnly = computed(() => baziTool?.exposure === 'internal')
/** 历史功能的单一状态来源：工具目录（治理规范 §20.2）。 */
const historyEnabled = computed(
  () => canReadHistory(BAZI_TOOL_ID) && canCreateHistory(BAZI_TOOL_ID),
)

// ── Ⅰ 段：能回答 / 不能回答（不可软化的闭集）──
const canAnswer = [
  '公历与农历怎么换算，以及换算规则版本。',
  '三柱（年、月、日）为什么是这些干支：年柱的干支年锚点、月柱的节气边界与五虎遁、日柱的六十甲子纪日。',
  '跨「节」的日期为什么会出现两种可能结果，以及日柱为什么不受影响。',
  '本版缺少什么、哪些结论因此不能给出。',
]

const notOutputText = BAZI_NOT_OUTPUT.join('、')

// ── 结果投影（模板可读性）：唯一情形、候选情形、日期对照与不确定性 ──
const baziResult = computed(() => draft.result.value)
const uniquePillars = computed(() => baziResult.value?.uniquePillars ?? null)
const scenarios = computed(() => baziResult.value?.scenarios ?? null)
const dateComparison = computed(() => baziResult.value?.dateComparison ?? null)
const uncertainty = computed(() => baziResult.value?.uncertainty ?? null)

/**
 * 输入变化统一入口：先改草稿，再把来源标为手动。
 *
 * 档案带入后若用户又手改日期，来源必须回到「手动填写」，否则保存快照会把
 * 手改结果记成「输入来自本人档案」，provenance 就是错的（R5-B 浏览器验收实测）。
 * 未依赖档案时 `onManualEdit` 是空操作。
 */
function withManualOrigin(apply: () => void) {
  apply()
  draftBridge.onManualEdit()
}

function onDraftCalendar(value: 'solar' | 'lunar') {
  withManualOrigin(() => draft.setCalendar(value))
}
function onDraftYear(value: string) {
  withManualOrigin(() => draft.setYear(value))
}
function onDraftMonth(value: string) {
  withManualOrigin(() => draft.setMonth(value))
}
function onDraftDay(value: string) {
  withManualOrigin(() => draft.setDay(value))
}
function onDraftLeap(value: boolean) {
  withManualOrigin(() => draft.setLeapMonth(value))
}

// ── 主动生成（只有用户点击才计算）──
function handleGenerate() {
  // 每次提交刷新查询当日（治理规范 §8.2 按 Asia/Shanghai）。
  asOfDate.value = getShanghaiDate() || asOfDate.value
  draft.generate()
}

// ── 认证、本人档案带入（Q2）与结果历史 ──
const { authStatus, currentAccount, restoreSession } = useAuth()
const profileApi = useSelfProfile()
const draftBridge = useBaziProfileImport(
  {
    getRaw: () => {
      const built = draft.buildRaw()
      return built.ok ? built.raw : null
    },
    applyRaw: raw => draft.applyRaw(raw),
    setOrigin: origin => draft.setOrigin(origin),
    clearImported: () => draft.clearFields(),
  },
  profileApi,
)
const history = useResultHistory({
  getGeneration: () => draft.generation.value,
  getOrigin: () => draft.origin.value,
  isStale: () => draft.stale.value,
})

const showSaveDialog = ref(false)
const showAuthDialog = ref(false)

/** 保存摘要中的结果内容（与历史面板的快照展示同一口径，不含出生日期）。 */
function resultLines(result: BaziDomainResult | null): string[] {
  if (!result) return []
  const lines: string[] = []
  if (result.uniquePillars) {
    lines.push(
      `年柱 ${result.uniquePillars.year.stem}${result.uniquePillars.year.branch}；月柱 ${result.uniquePillars.month.stem}${result.uniquePillars.month.branch}`,
    )
  }
  if (result.scenarios) {
    for (const scenario of result.scenarios) {
      lines.push(
        `年柱 ${scenario.yearPillar.stem}${scenario.yearPillar.branch}；月柱 ${scenario.monthPillar.stem}${scenario.monthPillar.branch}（${scenario.reason}）`,
      )
    }
  }
  lines.push(`日柱 ${result.dayPillar.stem}${result.dayPillar.branch}（日干 ${result.dayMaster}）`)
  return lines
}

const saveSummaryLines = computed(() => resultLines(baziResult.value))
const saveOriginLabel = computed(() =>
  draft.origin.value === 'profile' ? '从本人档案带入' : '手动填写',
)

/** 点击保存：未登录先做页内认证；认证成功本身不触发保存，只进入摘要与确认。 */
function requestSave() {
  if (!history.canSave.value) return
  if (authStatus.value !== 'authenticated') {
    showAuthDialog.value = true
    return
  }
  showSaveDialog.value = true
}

function onAuthenticatedFromSave() {
  showAuthDialog.value = false
  if (history.canSave.value) showSaveDialog.value = true
}

function onAuthCancel() {
  showAuthDialog.value = false
}

async function confirmSave() {
  const outcome = await history.save()
  if (outcome.status === 'saved') {
    showSaveDialog.value = false
    await history.loadList(true)
  }
}

/** 用历史快照的输入生成当次未保存结果：原记录不变。 */
function handleRecompute(record: ResultSnapshotRecord) {
  draftBridge.forgetSource()
  draft.applyRaw(record.originalInput)
  draft.setOrigin(record.inputOrigin)
  asOfDate.value = getShanghaiDate() || asOfDate.value
  draft.generate()
  history.closeRecord()
}

async function handleRemove(recordId: string) {
  await history.removeRecord(recordId)
}

/** 读取历史列表：未认证时引导页内认证（历史接口一律要求本人会话）。 */
async function handleRefreshHistory() {
  const status = await history.loadList(true)
  if (status === 'unauthenticated') showAuthDialog.value = true
}

// ── Ⅲ 段摘要：唯一情形下的三柱一览（详细卡片在 Ⅳ 段）──
const summaryPillars = computed(() => {
  const result = draft.result.value
  if (!result) return []
  const rows: Array<{ label: string; value: string; note: string }> = []
  if (result.uniquePillars) {
    rows.push({
      label: '年柱',
      value: `${result.uniquePillars.year.stem}${result.uniquePillars.year.branch}`,
      note: `${result.uniquePillars.year.stemElement}·${result.uniquePillars.year.branchElement}`,
    })
    rows.push({
      label: '月柱',
      value: `${result.uniquePillars.month.stem}${result.uniquePillars.month.branch}`,
      note: `${result.uniquePillars.month.stemElement}·${result.uniquePillars.month.branchElement}`,
    })
  }
  rows.push({
    label: '日柱',
    value: `${result.dayPillar.stem}${result.dayPillar.branch}`,
    note: `${result.dayPillar.stemElement}·${result.dayPillar.branchElement}（日干 ${result.dayMaster}）`,
  })
  return rows
})

// ── 回到顶部 ──
const showScrollTop = ref(false)
function handleScroll() {
  showScrollTop.value = window.scrollY > 300
}
function scrollToTop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo(reduceMotion ? { top: 0 } : { top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  await restoreSession()
  if (authStatus.value === 'authenticated') {
    // 只取无日期摘要：用于判断是否显示「从本人档案带入」，不读取完整档案。
    await profileApi.loadSummary()
  }
  // 档案被删除/撤回/变更时使已带入的草稿失效（跨标签页也会收到通知）。
  profileApi.onRemoteEvent.add(draftBridge.onRemoteEvent)
})

// 退出登录或换账号：清空带入、历史与草稿中的出生日期。
watch([() => authStatus.value, () => currentAccount.value?.id ?? null], ([status]) => {
  if (status === 'authenticated') return
  draftBridge.reset()
  history.reset()
  draft.reset()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  profileApi.onRemoteEvent.delete(draftBridge.onRemoteEvent)
  // 离开页面清空草稿、带入来源与已读历史：敏感出生日期不留在组件状态里。
  draftBridge.reset()
  history.reset()
  draft.reset()
})
</script>

<template>
  <ToolPageLayout>
    <PageHero
      emoji="八"
      title="八字基础排盘"
      subtitle="按出生日期排出年、月、日三柱，并说明每一步的依据、边界与限制。"
    />

    <main class="bazi-page max-w-[48rem] mx-auto space-y-6">
      <!-- Ⅰ 工具说明 -->
      <section
        id="bazi-guide"
        data-bazi-section="guide"
        class="card-paper-solid rounded-xl p-6 sm:p-8"
        aria-labelledby="bazi-guide-heading"
      >
        <h2 id="bazi-guide-heading" class="section-header font-display text-xl text-ink-dark">
          <span class="bazi-sec-num" aria-hidden="true">Ⅰ</span>工具说明
        </h2>

        <p class="mt-4 font-sans text-sm sm:text-base text-ink-medium leading-relaxed">
          本页按出生日期排出<strong class="font-medium text-ink-dark">年柱、月柱、日柱</strong
          >，并逐条说明这三柱的依据、边界与限制。它是可追溯的历法与规则整理，不是命运测评。
        </p>

        <h3 class="mt-5 font-sans text-sm text-ink-dark">本页能回答</h3>
        <ul class="mt-2 space-y-1.5 font-sans text-sm text-ink-medium leading-relaxed">
          <li v-for="item in canAnswer" :key="item">· {{ item }}</li>
        </ul>

        <h3 class="mt-5 font-sans text-sm text-ink-dark">本页不能回答</h3>
        <p class="mt-2 font-sans text-sm text-ink-medium leading-relaxed">
          本版不输出以下内容：{{ notOutputText }}。也就是说，本页不给任何性格、事业、财富、健康、
          婚恋或吉凶判断，也不给 0–100 分一类的评分与等级排序。
        </p>

        <p
          v-if="internalOnly"
          class="mt-5 font-sans text-xs text-ink-medium leading-relaxed border-l-[3px] border-l-gold pl-3"
          data-bazi-internal
        >
          状态说明：本页当前处于内部验证阶段，尚未公开，只有被授权的账号可以访问。
          内部验证用于核对历法换算与规则表述，不代表已通过公开验收。
        </p>
      </section>

      <!-- Ⅱ 本次操作（输入） -->
      <section
        id="bazi-input"
        data-bazi-section="input"
        class="card-paper-solid rounded-xl p-6 sm:p-8"
        aria-labelledby="bazi-input-heading"
      >
        <h2 id="bazi-input-heading" class="section-header font-display text-xl text-ink-dark">
          <span class="bazi-sec-num" aria-hidden="true">Ⅱ</span>本次操作
        </h2>

        <p class="mt-4 font-sans text-sm text-ink-medium leading-relaxed">
          填写出生日期后主动生成。本页不使用出生时刻：时柱需要时刻，本版不输出时柱。
        </p>

        <BaziInputForm
          class="mt-4"
          :draft="draft.draft.value"
          :error="draft.inputError.value"
          :max-year="maxYear"
          @update:calendar="onDraftCalendar"
          @update:year="onDraftYear"
          @update:month="onDraftMonth"
          @update:day="onDraftDay"
          @update:leap-month="onDraftLeap"
          @update:age-confirmed="draft.setAgeConfirmed"
        />

        <!-- 从本人档案带入：只复制出生日期到本次草稿，不自动计算、不自动保存 -->
        <div v-if="draftBridge.canImport.value" class="mt-4" data-bazi-import>
          <button
            type="button"
            class="btn-ghost"
            :disabled="draftBridge.loading.value"
            @click="draftBridge.requestImport()"
          >
            {{ draftBridge.loading.value ? '读取中...' : '从本人档案带入出生日期' }}
          </button>
          <p class="mt-2 font-sans text-xs text-ink-light">
            只把出生日期复制到本次输入，不带入档案其他字段，也不会自动生成或保存。
          </p>
        </div>
        <p v-if="draftBridge.error.value" class="mt-2 font-sans text-xs text-cinnabar" role="alert">
          {{ draftBridge.error.value }}
        </p>

        <!-- 替换确认：草稿已有不同日期时，先展示当前值与拟带入值 -->
        <div
          v-if="draftBridge.pending.value"
          class="mt-4 card-warm rounded-xl p-4 border-l-[3px] border-l-cinnabar"
          role="dialog"
          aria-labelledby="bazi-import-replace-title"
        >
          <p id="bazi-import-replace-title" class="font-display text-base text-ink-dark">
            替换当前输入？
          </p>
          <p class="mt-2 font-sans text-sm text-ink-medium leading-relaxed">
            当前：{{ draftBridge.describeRaw(draftBridge.pending.value.current) }} → 拟带入：{{
              draftBridge.describeRaw(draftBridge.pending.value.incoming)
            }}
          </p>
          <div class="mt-3 flex flex-wrap gap-3">
            <button type="button" class="btn-quiet" @click="draftBridge.cancelImport()">
              取消
            </button>
            <button type="button" class="btn-solid" @click="draftBridge.confirmImport()">
              确认替换
            </button>
          </div>
        </div>

        <div v-if="draftBridge.canUndo.value" class="mt-3">
          <button type="button" class="btn-ghost" @click="draftBridge.undoImport()">
            撤销本次带入
          </button>
        </div>

        <div class="mt-4">
          <button
            type="button"
            class="btn-seal"
            :disabled="!draft.canGenerate.value"
            @click="handleGenerate"
          >
            <span>生成三柱结果</span>
          </button>
          <p v-if="!draft.canGenerate.value" class="mt-2 font-sans text-xs text-ink-light">
            请先选择完整日期（农历需明确普通月或闰月）并确认已满十四周岁。
          </p>
          <p v-else class="mt-2 font-sans text-xs text-ink-light">
            生成只使用本页内存中的日期，不会向服务器提交出生日期。
          </p>
        </div>
      </section>

      <!-- Ⅲ 核心结果摘要（状态先于摘要） -->
      <section
        id="bazi-summary"
        data-bazi-section="summary"
        class="space-y-3"
        aria-labelledby="bazi-summary-heading"
      >
        <h2 id="bazi-summary-heading" class="section-header font-display text-xl text-ink-dark">
          <span class="bazi-sec-num" aria-hidden="true">Ⅲ</span>核心结果摘要
        </h2>

        <BaziStatusBanner
          :state="draft.state.value"
          :stale-input-summary="draft.staleInputSummary.value"
          :boundary-term="draft.boundaryTerm.value"
          :save-failed="history.saveError.value !== ''"
        />

        <div
          v-if="summaryPillars.length > 0"
          class="card-warm rounded-xl p-6 sm:p-8"
          data-bazi-summary
        >
          <ul class="space-y-2">
            <li
              v-for="row in summaryPillars"
              :key="row.label"
              class="flex flex-wrap gap-x-3 gap-y-1"
            >
              <span class="font-sans text-sm text-ink-medium w-12">{{ row.label }}</span>
              <span class="font-display text-lg text-ink-dark tracking-[0.15em]">{{
                row.value
              }}</span>
              <span class="font-sans text-xs text-ink-medium self-center">{{ row.note }}</span>
            </li>
          </ul>

          <p v-if="scenarios" class="mt-3 font-sans text-sm text-ink-medium leading-relaxed">
            年柱与月柱各有 2 种可能，已在上方状态中说明，逐项对比见下方「详细结果」。
          </p>

          <h3 class="mt-5 font-sans text-sm text-ink-dark">限制与缺失</h3>
          <ul class="mt-2 space-y-1.5 font-sans text-xs text-ink-medium leading-relaxed">
            <li>· 缺时柱：本版只用出生日期，不生成时柱，也不据此推断任何结论。</li>
            <li>· 不支持 23:00—23:59 的午夜换日与子初换日双候选。</li>
            <li>
              · 节气时刻为分钟级核验：国家标准要求的 1 秒级精度尚未核验，边界日的结果对精度敏感。
            </li>
          </ul>
        </div>
      </section>

      <!-- Ⅳ 通俗解释与详细结果 -->
      <section
        id="bazi-detail"
        data-bazi-section="detail"
        class="space-y-4"
        aria-labelledby="bazi-detail-heading"
      >
        <h2 id="bazi-detail-heading" class="section-header font-display text-xl text-ink-dark">
          <span class="bazi-sec-num" aria-hidden="true">Ⅳ</span>通俗解释与详细结果
        </h2>

        <!-- 唯一情形：三柱并列；候选情形：日柱单列，年/月柱见逐项对比 -->
        <div v-if="baziResult" class="grid gap-4 sm:grid-cols-3">
          <template v-if="uniquePillars">
            <BaziPillarCard label="年柱" :pillar="uniquePillars.year" />
            <BaziPillarCard label="月柱" :pillar="uniquePillars.month" />
          </template>
          <BaziPillarCard label="日柱" :pillar="baziResult.dayPillar" is-day />
        </div>

        <p
          v-if="baziResult && !uniquePillars"
          class="font-sans text-xs text-ink-medium leading-relaxed"
        >
          日柱只由日期决定，因此在跨「节」的情形下依然唯一；年柱与月柱的两种可能在下方逐项列出。
        </p>

        <BaziCandidatePanel
          v-if="scenarios && uncertainty"
          :scenarios="scenarios"
          :boundary-term="uncertainty.boundary.term"
          :near-midnight="uncertainty.nearMidnight"
          :boundary-instant="`${uncertainty.boundary.instant}`"
        />

        <BaziDateComparison v-if="dateComparison" :comparison="dateComparison" />

        <p v-if="!baziResult" class="card-warm rounded-xl p-6 font-sans text-sm text-ink-medium">
          尚未生成结果：在上方填写出生日期并点击「生成三柱结果」后，这里会显示三柱、候选对比与日期对照。
        </p>

        <BaziReadingGuide />
      </section>

      <!-- Ⅴ 依据与范围 -->
      <section
        id="bazi-scope"
        data-bazi-section="scope"
        aria-labelledby="bazi-scope-section-heading"
      >
        <h2
          id="bazi-scope-section-heading"
          class="section-header font-display text-xl text-ink-dark mb-4"
        >
          <span class="bazi-sec-num" aria-hidden="true">Ⅴ</span>依据与范围
        </h2>
        <BaziEvidenceScope
          :result="baziResult"
          :as-of-date="draft.generation.value?.asOfDate || asOfDate"
        />
      </section>

      <!-- Ⅵ 本次结果操作 -->
      <section
        id="bazi-actions"
        data-bazi-section="actions"
        class="space-y-4"
        aria-labelledby="bazi-actions-heading"
      >
        <h2 id="bazi-actions-heading" class="section-header font-display text-xl text-ink-dark">
          <span class="bazi-sec-num" aria-hidden="true">Ⅵ</span>本次结果操作
        </h2>

        <div class="card-warm rounded-xl p-6 sm:p-8" data-bazi-save>
          <h3 class="font-display text-lg text-ink-dark">保存本次结果</h3>

          <p class="mt-2 font-sans text-sm text-ink-medium leading-relaxed">
            生成与保存是两步：本次结果只在你确认保存后才会成为历史快照。本页不提供导出，也不会自动保存。
          </p>

          <div class="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="btn-seal"
              :disabled="!history.canSave.value || history.saving.value"
              data-bazi-save-button
              @click="requestSave"
            >
              <span>{{ history.saving.value ? '保存中...' : '保存本次结果' }}</span>
            </button>
            <span
              v-if="history.saved.value"
              class="font-sans text-xs text-ink-medium"
              role="status"
            >
              本次结果已保存{{
                history.savedAt.value ? `（${history.savedAt.value}）` : ''
              }}，重复保存不会产生第二条记录。
            </span>
          </div>

          <p v-if="!baziResult" class="mt-2 font-sans text-xs text-ink-light" data-bazi-save-hint>
            先生成结果，才能保存。保存前会先展示保存摘要，再由你确认。
          </p>
          <p
            v-else-if="draft.stale.value"
            class="mt-2 font-sans text-xs text-ink-medium"
            data-bazi-save-hint
          >
            输入已修改，结果尚未更新：请先重新生成，再保存与当前输入一致的结果。
          </p>
          <p
            v-else-if="history.saved.value"
            class="mt-2 font-sans text-xs text-ink-light"
            data-bazi-save-hint
          >
            同一次生成只产生一条记录；修改输入并重新生成后可以再保存一条。
          </p>
          <p v-else class="mt-2 font-sans text-xs text-ink-light" data-bazi-save-hint>
            游客点击保存时会先在本页完成登录或注册；认证成功本身不会自动保存。
          </p>

          <p
            v-if="history.saveError.value"
            class="mt-3 font-sans text-sm text-cinnabar"
            role="alert"
            data-bazi-save-feedback
          >
            {{ history.saveError.value }}
          </p>
        </div>

        <BaziHistoryPanel
          :items="history.items.value"
          :loading="history.listLoading.value"
          :error="history.listError.value"
          :selected="history.selected.value"
          :selected-loading="history.selectedLoading.value"
          :selected-error="history.selectedError.value"
          :clear-pending="history.clearPending.value"
          :mutating="history.mutating.value"
          :mutate-error="history.mutateError.value"
          :history-enabled="historyEnabled"
          @refresh="handleRefreshHistory"
          @open="history.openRecord"
          @close-record="history.closeRecord"
          @remove="handleRemove"
          @recompute="handleRecompute"
          @clear-all="history.requestClearAll"
          @confirm-clear="history.confirmClearAll"
          @cancel-clear="history.cancelClearAll"
        />
      </section>
    </main>

    <ScrollTopButton v-if="showScrollTop" @click="scrollToTop" @keydown.enter="scrollToTop" />

    <!-- 保存确认：先展示摘要，再由用户确认（认证成功不触发保存） -->
    <BaziSaveDialog
      :show="showSaveDialog"
      :original-expression="baziResult?.dateComparison.originalExpression ?? ''"
      :origin-label="saveOriginLabel"
      :result-lines="saveSummaryLines"
      :rule-version="baziResult?.ruleVersion ?? ''"
      :source-set-version="baziResult?.sourceSetVersion ?? ''"
      :engine-label="`${baziResult?.engineName ?? ''} ${baziResult?.engineVersion ?? ''}`.trim()"
      :as-of-date="draft.generation.value?.asOfDate ?? ''"
      :busy="history.saving.value"
      :error="history.saveError.value"
      :saved-at="history.savedAt.value"
      @close="showSaveDialog = false"
      @confirm="confirmSave"
    />

    <!-- 游客保存意图 → 页内认证（复用统一认证弹层，不新增表单） -->
    <AuthDialog
      :show="showAuthDialog"
      initial-mode="login"
      @close="onAuthCancel"
      @authenticated="onAuthenticatedFromSave"
    />
  </ToolPageLayout>
</template>

<style scoped>
/* 时区与版本串在窄屏与放大字体下也必须留在正常阅读流中。 */
.bazi-page {
  overflow-wrap: anywhere;
}
.bazi-sec-num {
  margin-right: 0.5em;
  font-size: 0.875em;
  color: var(--color-ink-medium);
}
</style>
