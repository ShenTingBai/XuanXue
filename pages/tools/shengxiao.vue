<script setup lang="ts">
import { ref, reactive, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { calculateShengXiao } from '~/utils/shengxiao/engine'
import { toIsoDate, compareIsoDates, parseDateString } from '~/utils/shengxiao/date'
import type { ToolResultState } from '~/types/tool-result'
import type { ShengXiaoResult } from '~/types/shengxiao'
import type { RawBirthDate } from '~/types/self-profile'
import { canExportTool } from '~/constants/tool-catalog'
import { SHENGXIAO_RULE_VERSION } from '~/constants/shengxiao-rules'
import { SELF_PROFILE_CONVERSION_VERSION } from '~/constants/self-profile-policy'
import { useSelfProfile } from '~/composables/useSelfProfile'
import { useSelfProfileDraft } from '~/composables/useSelfProfileDraft'
import VerifiedResult from '~/components/tools/shengxiao/VerifiedResult.vue'
import BirthDateInput from '~/components/tools/BirthDateInput.vue'
import VerifiedCulture from '~/components/tools/shengxiao/VerifiedCulture.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import PageHero from '~/components/tools/PageHero.vue'
import SelfProfileSaveDialog from '~/components/profile/SelfProfileSaveDialog.vue'
import AuthDialog from '~/components/auth/AuthDialog.vue'

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

// 输入修订号：任何编辑/带入/撤销/清除都会递增，用于取消 await 期间过期的旧提交。
let draftRevision = 0
// 在途提交锁：防止重复点击产生并发计算。
let submitInFlight = false

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
async function handleSubmit() {
  // 阻止重复在途提交。
  if (submitInFlight) return
  // 第一道门：只有明确确认已满十四周岁才允许提交；unknown 与 underage 均拒绝
  if (ageConfirm.value !== 'confirmed') return
  if (!draftComplete.value) {
    toolState.value = { phase: 'failure', failureCategory: 'invalid_input' }
    errorMessage.value = validateDraft()
    return
  }
  // 捕获提交时的输入修订号、账号/认证代际、年龄声明与来源，await 后逐项重核。
  const revisionAtSubmit = draftRevision
  const accountAtSubmit = currentAccount.value?.id ?? null
  const authAtSubmit = authStatus.value
  const ageAtSubmit = ageConfirm.value
  const sourceAtSubmit = draftBridge.origin.value ? 'self_profile' : 'manual'
  submitInFlight = true
  try {
    // 来源依赖档案时：计算前重查 summary 与来源版本；失败/撤回/版本变化阻止计算。
    if (sourceAtSubmit === 'self_profile') {
      const verify = await draftBridge.verifyBeforeCompute()
      // await 期间：编辑/退出/改未成年/来源失效/卸载 → 取消旧提交。
      if (
        draftRevision !== revisionAtSubmit ||
        accountAtSubmit !== (currentAccount.value?.id ?? null) ||
        authAtSubmit !== authStatus.value ||
        ageAtSubmit !== ageConfirm.value
      ) {
        return
      }
      if (!verify.ok) {
        toolState.value = { phase: 'failure', failureCategory: 'invalid_input' }
        if (verify.reason === 'network' || verify.reason === 'unauthenticated') {
          // 网络失败/会话失效：保留草稿，禁止依赖资料计算。
          errorMessage.value =
            verify.reason === 'unauthenticated'
              ? '登录状态已失效，请重新登录后再计算'
              : '无法确认本人档案状态，请稍后重试'
          return
        }
        // 撤回/删除/版本变化：原子失效（清受影响日期/结果/候选/撤销/来源）。
        draftBridge.invalidateSource()
        errorMessage.value =
          verify.reason === 'revoked'
            ? '本人档案已撤回或删除，请重新带入后再计算'
            : '本人档案已变更，请重新带入后再计算'
        return
      }
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
    // 计算完成后输入已变化：不落旧结果。
    if (draftRevision !== revisionAtSubmit) return
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
  } finally {
    submitInFlight = false
  }
}

// ── 输入修改 → 旧结果标记 stale（治理规范 §7.4）；来源改手动但仍允许明确撤销 ──
function handleInputChange(field: 'year' | 'month' | 'day', value: string) {
  draft[field] = value
  draftRevision++
  draftBridge.onManualEdit()
  if (result.value) {
    toolState.value = {
      phase: 'success',
      successQualifier: result.value.successQualifier,
      freshness: 'stale',
    }
  }
}

// ── 认证状态与本人档案桥接 ──
const { authStatus, currentAccount } = useAuth()
const profileApi = useSelfProfile()

// 档案带入草稿管理：字段复制/来源/撤销（不执行计算或数据库写入）。
// 与页面共享同一 useSelfProfile 实例，确保 summary/profile 状态一致。
const draftBridge = useSelfProfileDraft(
  {
    getDraft: () => ({ year: draft.year, month: draft.month, day: draft.day }),
    applyDraft: values => {
      draft.year = values.year
      draft.month = values.month
      draft.day = values.day
      draftRevision++
    },
    markResultStale: () => {
      if (result.value) {
        toolState.value = {
          phase: 'success',
          successQualifier: result.value.successQualifier,
          freshness: 'stale',
        }
      }
    },
    clearResult: () => {
      result.value = null
      toolState.value = { phase: 'idle' }
      errorMessage.value = ''
    },
    clearImportedDraft: () => {
      // 原子失效：清空来自档案的草稿字段，避免残留已撤回数据。
      draft.year = ''
      draft.month = ''
      draft.day = ''
      draftRevision++
    },
  },
  profileApi,
)

// 已登录且有可用日期才显示「从本人档案带入 1 项」；无档案静默保留手动输入。
const showImportEntry = computed(() => {
  if (authStatus.value !== 'authenticated') return false
  const s = profileApi.summary.value
  return !!s && s.exists && s.hasBirthDate && s.canImport
})

// 元数据读取失败提供重试，不把网络失败当无档案；不自动 GET 完整出生值。
const importError = computed(() => profileApi.error.value)

// 认证状态/账号变化：
// - authenticated A → B：清理旧账号草稿/结果/桥接；
// - authenticated → guest：登出清理；
// - guest → authenticated（页内登录）：保留游客草稿/结果/年龄与显式保存意图，绝不自动保存。
watch(
  [() => authStatus.value, () => currentAccount.value?.id ?? null],
  ([current, accountId], [previous, previousAccountId]) => {
    const authChanged = current !== previous
    const accountChanged = accountId !== previousAccountId
    const wasAuthenticated = previous === 'authenticated'
    if (authChanged && wasAuthenticated && current === 'guest') {
      // 登出：清理全部个人状态。
      clearPersonalState()
    } else if (accountChanged && wasAuthenticated && current === 'authenticated') {
      // 已登录 A → B：清理旧账号草稿/结果/桥接（组合函数内部已失效缓存）。
      clearPersonalState()
    } else if (authChanged && current === 'authenticated' && !wasAuthenticated) {
      // 游客页内登录：保留当次草稿/结果/年龄与保存意图；只取无日期 summary。
      profileApi.loadSummary()
    }
  },
)

/** 清理登出/A→B 时的个人草稿、结果、声明与档案桥接。 */
function clearPersonalState() {
  draft.year = ''
  draft.month = ''
  draft.day = ''
  draftRevision++
  result.value = null
  toolState.value = { phase: 'idle' }
  errorMessage.value = ''
  ageConfirm.value = 'unknown'
  draftBridge.clear()
  clearSaveIntent()
}

// 已登录时进入页面/账号变化：加载无日期 summary。
onMounted(() => {
  if (authStatus.value === 'authenticated') {
    profileApi.loadSummary()
  }
  // focus/visibility 兜底使用组合函数的真实注册与清理。
  profileApi.registerFocusRefresh()
})

// 档案删除/使用撤回通知：清除撤销缓存与未提交的档案带入字段。
profileApi.onRemoteEvent.add(draftBridge.onRemoteEvent)

// ── 保存本人资料（与保存结果分离）──
const showSaveDialog = ref(false)
const showAuthDialog = ref(false)
const saveBusy = ref(false)
const saveError = ref<string | null>(null)
const saveConflict = ref(false)
/** 明确读取成功标记：false=读取失败/过期/会话失效，禁止生成可确认差异。 */
const saveReadiness = ref(false)
/** 弹框意图代际：关闭/退出/取消认证/账号变化后，晚到读取不能重新打开已关闭弹框。 */
let saveIntentSeq = 0
const saveCandidate = computed<{
  raw: RawBirthDate
  solarDate: string
  conversionVersion: string
  confirmedAt: string
} | null>(() => {
  if (!result.value || toolState.value.phase !== 'success' || toolState.value.freshness === 'stale')
    return null
  // 只保存当前草稿对应的规范化公历日期（由服务端重校验）；
  // 「属于本人」与长期保存告知由保存对话框单独勾选确认。
  const year = Number(draft.year)
  const month = Number(draft.month)
  const day = Number(draft.day)
  if (!year || !month || !day) return null
  return {
    raw: { calendar: 'solar' as const, year, month, day, isLeapMonth: null },
    solarDate: toIsoDate(year, month, day),
    conversionVersion: SELF_PROFILE_CONVERSION_VERSION,
    confirmedAt: '',
  }
})

const canShowSaveEntry = computed(() => {
  if (!result.value) return false
  if (toolState.value.phase !== 'success') return false
  if (toolState.value.freshness === 'stale') return false
  return !!saveCandidate.value
})

function clearSaveIntent() {
  saveIntentSeq++
  showSaveDialog.value = false
  showAuthDialog.value = false
  saveBusy.value = false
  saveError.value = null
  saveConflict.value = false
  saveReadiness.value = false
}

/**
 * 保存对话框关闭：作废本次意图代际并撤销可确认状态。
 *
 * 必须是具名函数而不是多语句内联处理器——`.prettierrc` 的 semi:false 会把内联
 * 多语句改写成换行且无分号的形式，Vue 只认「换行+分号」，结果在生产编译期报错。
 */
function onSaveDialogClose() {
  showSaveDialog.value = false
  saveReadiness.value = false
  saveIntentSeq++
}

// 游客点击「保存本人资料」：只保存本次意图并打开真实 AuthDialog。
function handleSaveFromResult() {
  if (!result.value) return
  if (authStatus.value === 'guest') {
    showAuthDialog.value = true
    return
  }
  void openSaveDialog()
}

/** 已登录保存：先强制读取当前档案；只有明确 success 且账号/草稿未变才 readiness=true。 */
async function openSaveDialog() {
  if (!saveCandidate.value) return
  const seq = ++saveIntentSeq
  const accountAtOpen = currentAccount.value?.id ?? null
  const draftAtOpen = `${draft.year}|${draft.month}|${draft.day}`
  saveError.value = null
  saveConflict.value = false
  saveReadiness.value = false
  const result = await profileApi.loadProfile(true)
  // 弹框已关闭/账号变化/草稿已变：晚到读取不得重新打开或应用。
  if (seq !== saveIntentSeq) return
  if (accountAtOpen !== (currentAccount.value?.id ?? null)) return
  if (draftAtOpen !== `${draft.year}|${draft.month}|${draft.day}`) return
  if (result.status === 'unauthenticated') {
    saveError.value = '登录状态已失效，请重新登录后重试'
    showSaveDialog.value = true
    return
  }
  if (result.status !== 'success') {
    // 读取失败/过期：不把失败当无档案，不生成可确认差异。
    saveError.value = profileApi.error.value ?? '无法读取本人档案，请稍后重试'
    showSaveDialog.value = true
    return
  }
  // 成功（含成功无档案）：readiness=true，展示差异对话框。
  saveReadiness.value = true
  showSaveDialog.value = true
}

async function onAuthenticatedFromSave() {
  // authenticated 事件后只进入差异确认，绝不直接保存。
  showAuthDialog.value = false
  void openSaveDialog()
}

function onAuthCancel() {
  // AuthDialog 取消保留本页草稿结果并清除保存意图。
  showAuthDialog.value = false
  clearSaveIntent()
}

/** 409 后显式重新读取：只有明确 success 才清冲突并重建差异快照。 */
async function reloadForConflict() {
  const seq = saveIntentSeq
  const accountAtReload = currentAccount.value?.id ?? null
  saveBusy.value = true
  saveError.value = null
  try {
    const result = await profileApi.loadProfile(true)
    if (seq !== saveIntentSeq) return
    if (accountAtReload !== (currentAccount.value?.id ?? null)) return
    if (result.status === 'success') {
      saveConflict.value = false
      saveReadiness.value = true
    } else {
      // 读取失败/过期/会话失效：保持冲突与禁提交状态。
      saveConflict.value = true
      saveReadiness.value = false
      saveError.value =
        result.status === 'unauthenticated'
          ? '登录状态已失效，请重新登录后重试'
          : (profileApi.error.value ?? '无法重新读取档案，请稍后再试')
    }
  } finally {
    saveBusy.value = false
  }
}

/** 只提交对话框冻结的 payload；提交前核对 accountId 与当前账号；保存期间防重复。 */
async function confirmSave(payload: {
  expected: { profileId: string; version: number } | null
  accountId: number | null
  birthDate: RawBirthDate
  consentPolicyVersion: string
}) {
  if (saveBusy.value || !saveReadiness.value) return
  // 核对冻结 accountId 与当前账号：防止过期流程把旧账号载荷提交到新会话。
  if (payload.accountId !== (currentAccount.value?.id ?? null)) {
    saveError.value = '登录状态已变化，请重新确认后保存'
    return
  }
  saveBusy.value = true
  saveError.value = null
  saveConflict.value = false
  try {
    const result = await profileApi.save({
      expected: payload.expected,
      birthDate: payload.birthDate,
      consentPolicyVersion: payload.consentPolicyVersion,
    })
    if (result) {
      // 成功保存：来源版本由 useSelfProfileDraft 注册的 onLocalWriteCommitted 在
      // summary 发布前同步（不在此 await 后补救式 resync，避免晚于 watcher 而失效）。
      saveIntentSeq++
      showSaveDialog.value = false
      saveReadiness.value = false
    } else if (profileApi.conflict.value) {
      saveConflict.value = true
      saveReadiness.value = false
    } else if (profileApi.error.value) {
      saveError.value = profileApi.error.value
    }
  } finally {
    saveBusy.value = false
  }
}

// ── 卸载时清除（页面内存草稿本就随组件销毁，这里确保不残留引用）──
onBeforeUnmount(() => {
  // focus/visibility 监听由组合函数 onBeforeUnmount 统一清理。
  draftBridge.clear()
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

        <!-- 从本人档案带入（仅已登录且有可用日期） -->
        <div v-if="showImportEntry" class="mt-4">
          <button
            type="button"
            class="btn-ghost"
            :disabled="draftBridge.loadingProfile.value"
            @click="draftBridge.requestImport()"
          >
            {{ draftBridge.loadingProfile.value ? '读取中...' : '从本人档案带入 1 项' }}
          </button>
          <p v-if="importError" class="mt-2 font-sans text-xs text-cinnabar" role="alert">
            {{ importError }}
            <button type="button" class="underline ml-2" @click="profileApi.loadSummary(true)">
              重试
            </button>
          </p>
        </div>

        <!-- 替换确认：非空且不同的草稿替换前展示本次值与拟带入值 -->
        <div
          v-if="draftBridge.pendingReplacement.value"
          class="mt-4 card-warm rounded-xl p-4 border-l-[3px] border-l-cinnabar"
          role="dialog"
          aria-labelledby="import-replace-title"
        >
          <p id="import-replace-title" class="font-display text-base text-ink-dark">
            替换当前输入？
          </p>
          <p class="mt-2 font-sans text-sm text-ink-medium leading-relaxed">
            当前：{{ draftBridge.pendingReplacement.value.current.year || '—' }}年{{
              draftBridge.pendingReplacement.value.current.month || '—'
            }}月{{ draftBridge.pendingReplacement.value.current.day || '—' }}日 → 拟带入：{{
              draftBridge.pendingReplacement.value.incoming.year
            }}年{{ draftBridge.pendingReplacement.value.incoming.month }}月{{
              draftBridge.pendingReplacement.value.incoming.day
            }}日
          </p>
          <div class="mt-3 flex flex-wrap gap-3">
            <button type="button" class="btn-ink" @click="draftBridge.cancelImport()">取消</button>
            <button type="button" class="btn-cin" @click="draftBridge.confirmImport()">
              确认替换
            </button>
          </div>
        </div>

        <!-- 撤销本次档案带入 -->
        <div v-if="draftBridge.canUndo.value" class="mt-4">
          <button type="button" class="btn-ghost" @click="draftBridge.undoImport()">
            撤销本次带入
          </button>
        </div>

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

        <!-- 主动保存本人资料：仅在 current 成功结果且草稿合法时提供；不自动保存 -->
        <div v-if="canShowSaveEntry" class="mt-4">
          <button type="button" class="btn-seal" :disabled="saveBusy" @click="handleSaveFromResult">
            <span>保存本人资料</span>
          </button>
          <p class="mt-2 font-sans text-xs text-ink-light">
            保存到本人档案，需查看差异并单独确认；不会自动保存结果或历史。
          </p>
        </div>
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

    <!-- 保存本人资料差异确认（页内认证后二次确认） -->
    <SelfProfileSaveDialog
      :show="showSaveDialog"
      :current-profile="profileApi.profile.value"
      :candidate="saveCandidate"
      :readiness="saveReadiness"
      :account-id="currentAccount?.id ?? null"
      :busy="saveBusy"
      :error="saveError"
      :conflict="saveConflict"
      @close="onSaveDialogClose"
      @confirm="confirmSave"
      @reload="reloadForConflict"
    />

    <!-- 游客保存意图 → 页内认证：authenticated 事件后只进入差异确认，绝不直接保存 -->
    <AuthDialog
      :show="showAuthDialog"
      initial-mode="login"
      @close="onAuthCancel"
      @authenticated="onAuthenticatedFromSave"
    />
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
