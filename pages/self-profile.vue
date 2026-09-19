<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { BirthDateDraft, NormalizedBirthDate } from '~/types/self-profile'
import { normalizeBirthDate } from '~/utils/self-profile/birth-date'
import {
  formatRecordNote,
  formatSolarDisplay,
  formatUpdatedAt,
  rawCalendarLabel,
  resolveStatusKind,
  statusLabel,
} from '~/utils/self-profile/display'
import { SELF_PROFILE_POLICY_VERSION } from '~/constants/self-profile-policy'
import { useSelfProfile } from '~/composables/useSelfProfile'
import PageFooter from '~/components/tools/PageFooter.vue'
import BirthDateGroupInput from '~/components/profile/BirthDateGroupInput.vue'
import SelfProfileSaveDialog from '~/components/profile/SelfProfileSaveDialog.vue'
import IndexNav from '~/components/editorial/IndexNav.vue'
import Masthead from '~/components/editorial/Masthead.vue'
import SectionHeading from '~/components/editorial/SectionHeading.vue'
import ProfileRecordCard from '~/components/profile/ProfileRecordCard.vue'
import ProfileUsageSection from '~/components/profile/ProfileUsageSection.vue'
import ProfileScopeSection from '~/components/profile/ProfileScopeSection.vue'
import ProfileDangerZone from '~/components/profile/ProfileDangerZone.vue'

/**
 * 独立本人档案页（R4，出版版视觉对齐 2026-09-13）。
 *
 * - 客户端复用 restoreSession 三态与账号页的恢复错误/显式重试模式；
 *   确认 guest 且无恢复网络错误才 replace('/login')；
 * - 加载失败不伪装为空档案；仅账号本人访问，SEO noindex；
 * - 版式对齐本人档案出版版原型：卷目索引 + 报头 + 四节（录/授/溯/归）；
 * - 显示无档案、完整日期、日期组已删除三种状态；
 * - 先差异对话框再写 API；提供明确删除出生日期组/删除整份档案的确认；
 *   失败前不移除数据，成功才更新；删除不退出登录；
 * - 提供停止后续档案带入与删除已有资料两个不同操作，撤回后保留日期只读展示
 *   和明确重新允许入口（需重新确认告知）；
 * - 页面离开、换账号、退出时清理编辑值、候选、差异和错误中的敏感数据。
 */

useSeoMeta({ robots: 'noindex, nofollow' })

const { authStatus, currentAccount, restoreSession, restoreError } = useAuth()
const router = useRouter()

const profileApi = useSelfProfile()

const restoring = ref(false)
const actionError = ref('')
const busy = ref(false)

// ── 编辑草稿（页面内存；离开/退出/换账号清除）──
const draft = ref<BirthDateDraft>({
  calendar: 'solar',
  year: '',
  month: '',
  day: '',
  isLeapMonth: null,
})
const draftError = ref('')
const normalized = ref<NormalizedBirthDate | null>(null)
/** 编辑器默认收起：由「录入/修改/重新填写出生日期」显式展开（原型行为）。 */
const editorOpen = ref(false)

// 服务端校验当日（Asia/Shanghai 民用日期，浏览器取，与生肖页一致）。
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
    return ''
  }
}

function confirmGuestRedirect() {
  if (authStatus.value === 'guest' && !restoreError.value) {
    router.replace('/login')
  }
}

onMounted(async () => {
  await restoreSession()
  if (authStatus.value === 'authenticated') {
    // 完整档案用于展示；摘要用于「仍含出生输入的历史条数」——
    // 删除整份档案前必须先显示该条数并提供保留/同删选择（交付规范 §7.5）。
    await profileApi.loadProfile()
    await profileApi.loadSummary()
  }
  confirmGuestRedirect()
})

async function retryRestore() {
  if (restoring.value) return
  restoring.value = true
  try {
    await restoreSession()
    if (authStatus.value === 'authenticated') {
      await profileApi.loadProfile()
      await profileApi.loadSummary()
    }
    confirmGuestRedirect()
  } finally {
    restoring.value = false
  }
}

// ── 草稿更新：输入变化 → 本地规范化预览（不做服务端保存）──
function onDraftCalendar(value: 'solar' | 'lunar') {
  draft.value.calendar = value
  draftError.value = ''
  recomputeNormalized()
}
function onDraftYear(value: string) {
  draft.value.year = value
  draftError.value = ''
  recomputeNormalized()
}
function onDraftMonth(value: string) {
  draft.value.month = value
  draftError.value = ''
  recomputeNormalized()
}
function onDraftDay(value: string) {
  draft.value.day = value
  draftError.value = ''
  recomputeNormalized()
}
function onDraftLeap(value: boolean | null) {
  draft.value.isLeapMonth = value
  draftError.value = ''
  recomputeNormalized()
}

function recomputeNormalized() {
  const d = draft.value
  if (!d.year || !d.month || !d.day) {
    normalized.value = null
    return
  }
  if (d.calendar === 'lunar' && d.isLeapMonth === null) {
    draftError.value = '农历必须明确普通月或闰月'
    normalized.value = null
    return
  }
  const asOf = getShanghaiDate()
  if (!asOf) {
    draftError.value = '无法确定校验当日，请稍后重试'
    normalized.value = null
    return
  }
  const raw =
    d.calendar === 'solar'
      ? {
          calendar: 'solar' as const,
          year: Number(d.year),
          month: Number(d.month),
          day: Number(d.day),
          isLeapMonth: null,
        }
      : {
          calendar: 'lunar' as const,
          year: Number(d.year),
          month: Number(d.month),
          day: Number(d.day),
          isLeapMonth: d.isLeapMonth === true,
        }
  const result = normalizeBirthDate(raw, asOf)
  if (result.ok) {
    draftError.value = ''
    normalized.value = result.birthDate
  } else {
    draftError.value =
      result.error.code === 'UNSUPPORTED_DATE'
        ? '出生日期超出支持范围（1901-01-01 至今日）'
        : '请输入真实存在的出生日期'
    normalized.value = null
  }
}

// ── 编辑器展开/收起 ──
function toggleEditor() {
  editorOpen.value = !editorOpen.value
}

function openEditor() {
  editorOpen.value = true
}

/** 取消：收起编辑器并丢弃本次草稿，档案值不受影响。 */
function closeEditor() {
  editorOpen.value = false
  draft.value = { calendar: 'solar', year: '', month: '', day: '', isLeapMonth: null }
  draftError.value = ''
  normalized.value = null
}

// ── 差异确认对话框 ──
const showSaveDialog = ref(false)
const saveDialogError = ref<string | null>(null)
const saveConflict = ref(false)
/** 明确读取成功标记：false=读取失败/过期/会话失效，禁止生成可确认差异。 */
const saveReadiness = ref(false)
/** 弹框意图代际：关闭/退出/账号变化后，晚到读取不能重新打开已关闭的弹框。 */
let saveIntentSeq = 0

/** 打开前强制读取当前档案；只有明确 success 且账号/草稿未变才 readiness=true。 */
async function openSaveDialog() {
  if (!normalized.value) return
  const seq = ++saveIntentSeq
  const accountAtOpen = currentAccount.value?.id ?? null
  saveDialogError.value = null
  saveConflict.value = false
  saveReadiness.value = false
  const result = await profileApi.loadProfile(true)
  // 弹框已关闭/账号变化/草稿已变：晚到读取不得重新打开或应用。
  if (seq !== saveIntentSeq) return
  if (accountAtOpen !== (currentAccount.value?.id ?? null)) return
  if (result.status === 'unauthenticated') {
    saveDialogError.value = '登录状态已失效，请重新登录后重试'
    showSaveDialog.value = true
    return
  }
  if (result.status !== 'success') {
    // 读取失败/过期：不把失败当无档案，不生成可确认差异（readiness=false）。
    saveDialogError.value = profileApi.error.value ?? '无法读取本人档案，请稍后重试'
    showSaveDialog.value = true
    return
  }
  saveReadiness.value = true
  showSaveDialog.value = true
}

function closeSaveDialog() {
  if (busy.value) return
  saveIntentSeq++
  showSaveDialog.value = false
  saveReadiness.value = false
}

/** 409 后显式重新读取并重做差异：只有明确 success 才解除冲突并重建差异。 */
async function reloadForConflict() {
  if (busy.value) return
  const seq = saveIntentSeq
  const accountAtReload = currentAccount.value?.id ?? null
  busy.value = true
  saveDialogError.value = null
  try {
    const result = await profileApi.loadProfile(true)
    if (seq !== saveIntentSeq) return
    if (accountAtReload !== (currentAccount.value?.id ?? null)) return
    if (result.status === 'success') {
      saveConflict.value = false
      saveReadiness.value = true
      // 对话框随 currentProfile 更新展示最新差异，checkbox 回到未选。
    } else {
      // 读取失败/过期/会话失效：保持冲突与禁提交，不伪装成功。
      saveConflict.value = true
      saveReadiness.value = false
      saveDialogError.value =
        result.status === 'unauthenticated'
          ? '登录状态已失效，请重新登录后重试'
          : (profileApi.error.value ?? '无法重新读取档案，请稍后再试')
    }
  } finally {
    busy.value = false
  }
}

/** 只提交对话框冻结的 payload；提交前核对 accountId 与当前账号一致。 */
async function confirmSave(payload: {
  expected: { profileId: string; version: number } | null
  accountId: number | null
  birthDate: import('~/types/self-profile').RawBirthDate
  consentPolicyVersion: string
}) {
  if (busy.value || !saveReadiness.value) return
  // 核对冻结 accountId 与当前账号：防止过期流程把旧账号载荷提交到新会话。
  if (payload.accountId !== (currentAccount.value?.id ?? null)) {
    saveDialogError.value = '登录状态已变化，请重新确认后保存'
    return
  }
  busy.value = true
  saveDialogError.value = null
  saveConflict.value = false
  try {
    const result = await profileApi.save({
      expected: payload.expected,
      birthDate: payload.birthDate,
      consentPolicyVersion: payload.consentPolicyVersion,
    })
    if (result) {
      saveIntentSeq++
      showSaveDialog.value = false
      saveReadiness.value = false
      // 成功后才更新本地展示，并收起编辑器（记录卡改为展示已保存值）。
      editorOpen.value = false
      normalized.value = null
      draft.value = { calendar: 'solar', year: '', month: '', day: '', isLeapMonth: null }
      draftError.value = ''
      actionError.value = ''
    } else if (profileApi.conflict.value) {
      saveConflict.value = true
      saveReadiness.value = false
    } else if (profileApi.error.value) {
      saveDialogError.value = profileApi.error.value
    }
  } finally {
    busy.value = false
  }
}

// ── 删除出生日期组 / 删除整份档案（分别确认）──
const showDeleteDateDialog = ref(false)
const showDeleteProfileDialog = ref(false)
/**
 * 删除档案时的历史快照处置选择（交付规范 §7.5、数据规范 §13）。
 * '' 表示尚未选择；存在历史条数时**必须显式选择**，不设默认值。
 */
const deleteHistoryMode = ref<'' | 'keep' | 'delete'>('')

/** 打开删除档案弹层：每次重开都重置选择与错误，避免沿用上次的处置方式。 */
function openDeleteProfileDialog() {
  deleteHistoryMode.value = ''
  actionError.value = ''
  showDeleteProfileDialog.value = true
}

// 用户一旦做出选择就撤掉「请先选择…」的守卫提示：选择已经生效，旧错误不该继续挂在弹层里。
watch(deleteHistoryMode, () => {
  if (showDeleteProfileDialog.value) actionError.value = ''
})

async function confirmDeleteBirthDate() {
  const current = profileApi.profile.value
  if (!current?.birthDate) return
  if (busy.value) return
  busy.value = true
  actionError.value = ''
  try {
    const result = await profileApi.deleteBirthDate({
      profileId: current.id,
      version: current.version,
    })
    if (result) {
      showDeleteDateDialog.value = false
      actionError.value = ''
    } else if (profileApi.conflict.value) {
      actionError.value = '档案已在其他页面被修改，请重新读取后再试'
    } else if (profileApi.error.value) {
      actionError.value = profileApi.error.value
    }
  } finally {
    busy.value = false
  }
}

async function confirmDeleteProfile() {
  const current = profileApi.profile.value
  if (!current) return
  if (busy.value) return

  // 存在仍含出生输入的历史时必须先选择处置方式：不设默认值、不静默删历史。
  const historyCount = profileApi.historyWithBirthInputCount.value
  const mode = deleteHistoryMode.value
  if (historyCount > 0 && mode === '') {
    actionError.value = '请先选择历史记录的处置方式'
    return
  }

  busy.value = true
  actionError.value = ''
  try {
    const ok = await profileApi.deleteProfile(
      { profileId: current.id, version: current.version },
      historyCount > 0 && mode !== '' ? mode : undefined,
    )
    if (ok) {
      showDeleteProfileDialog.value = false
      actionError.value = ''
      // 删除不退出登录
    } else if (profileApi.conflict.value) {
      actionError.value = '档案已在其他页面被修改，请重新读取后再试'
    } else if (profileApi.error.value) {
      actionError.value = profileApi.error.value
    }
  } finally {
    busy.value = false
  }
}

// ── 停止后续使用 / 重新允许使用（不同操作）──
const showRevokeDialog = ref(false)
const showAllowDialog = ref(false)
const allowConsent = ref(false)

async function confirmRevokeUse() {
  const current = profileApi.profile.value
  if (!current) return
  if (busy.value) return
  busy.value = true
  actionError.value = ''
  try {
    const result = await profileApi.setUsage(
      { profileId: current.id, version: current.version },
      false,
    )
    if (result) {
      showRevokeDialog.value = false
    } else if (profileApi.conflict.value) {
      actionError.value = '档案已在其他页面被修改，请重新读取后再试'
    } else if (profileApi.error.value) {
      actionError.value = profileApi.error.value
    }
  } finally {
    busy.value = false
  }
}

async function confirmAllowUse() {
  const current = profileApi.profile.value
  if (!current || !allowConsent.value) return
  if (busy.value) return
  busy.value = true
  actionError.value = ''
  try {
    const result = await profileApi.setUsage(
      { profileId: current.id, version: current.version },
      true,
      SELF_PROFILE_POLICY_VERSION,
    )
    if (result) {
      showAllowDialog.value = false
      allowConsent.value = false
    } else if (profileApi.conflict.value) {
      actionError.value = '档案已在其他页面被修改，请重新读取后再试'
    } else if (profileApi.error.value) {
      actionError.value = profileApi.error.value
    }
  } finally {
    busy.value = false
  }
}

// ── 清理敏感状态：离开/退出/换账号 ──
watch(
  () => currentAccount.value?.id,
  (accountId, previous) => {
    if (previous !== undefined && accountId !== previous) {
      // 换账号/退出：清理编辑值、候选、差异与错误中的敏感数据。
      profileApi.clear()
      draft.value = { calendar: 'solar', year: '', month: '', day: '', isLeapMonth: null }
      draftError.value = ''
      normalized.value = null
      editorOpen.value = false
      showSaveDialog.value = false
      showDeleteDateDialog.value = false
      showDeleteProfileDialog.value = false
      showRevokeDialog.value = false
      showAllowDialog.value = false
      actionError.value = ''
    }
  },
  { immediate: true },
)

watch(
  () => authStatus.value,
  (current, previous) => {
    if (previous === 'authenticated' && current === 'guest') {
      profileApi.clear()
      draft.value = { calendar: 'solar', year: '', month: '', day: '', isLeapMonth: null }
      draftError.value = ''
      normalized.value = null
      editorOpen.value = false
      showSaveDialog.value = false
      showDeleteDateDialog.value = false
      showDeleteProfileDialog.value = false
      showRevokeDialog.value = false
      showAllowDialog.value = false
      actionError.value = ''
      router.replace('/login')
    }
  },
)

onBeforeUnmount(() => {
  profileApi.clear()
  draft.value = { calendar: 'solar', year: '', month: '', day: '', isLeapMonth: null }
  draftError.value = ''
  normalized.value = null
})

// 展示辅助
const hasProfile = computed(() => !!profileApi.profile.value)
const hasBirthDate = computed(() => !!profileApi.profile.value?.birthDate)
const displayNormalized = computed(() => profileApi.profile.value?.birthDate ?? null)
const useAllowed = computed(() => profileApi.profile.value?.useAllowed ?? false)
/**
 * 仍含保存时出生输入的历史快照条数（服务端按账号 + 八字工具统计）。
 * 大于 0 时删除整份档案必须先选择历史处置方式，不设默认值。
 */
const historyWithBirthInputCount = computed(() => profileApi.historyWithBirthInputCount.value)
/** 读取失败且没有档案：只显示错误与重试，不用「未建档」冒充状态。 */
const loadFailed = computed(() => !!profileApi.error.value && !hasProfile.value)

const statusKind = computed(() => resolveStatusKind(hasProfile.value, hasBirthDate.value))
const statusLabelText = computed(() => statusLabel(statusKind.value))
const updatedAtText = computed(() =>
  profileApi.profile.value ? formatUpdatedAt(profileApi.profile.value.updatedAt) : '',
)
const solarText = computed(() => formatSolarDisplay(displayNormalized.value?.solarDate ?? ''))
const noteText = computed(() =>
  displayNormalized.value ? formatRecordNote(displayNormalized.value) : '',
)
const confirmedAtText = computed(
  () => formatUpdatedAt(displayNormalized.value?.confirmedAt ?? '') || '—',
)
const rawLabel = computed(() =>
  displayNormalized.value ? rawCalendarLabel(displayNormalized.value.raw) : '',
)

/** 卷目索引：四节锚点，与页面 section id 一一对应。 */
const indexItems = [
  { num: 'Ⅰ', label: '录 · 已录入资料', href: '#sec-record' },
  { num: 'Ⅱ', label: '授 · 授权与用途', href: '#sec-usage' },
  { num: 'Ⅲ', label: '溯 · 溯源与范围', href: '#sec-scope' },
  { num: 'Ⅳ', label: '归 · 归档与删除', href: '#sec-archive' },
]
</script>

<template>
  <div class="profile-page">
    <!-- 恢复中占位 -->
    <p v-if="authStatus === 'restoring'" class="boot" role="status">正在确认登录状态…</p>

    <!-- 游客：恢复网络失败时显示错误与重试；无错误则等待重定向 -->
    <div v-else-if="authStatus === 'guest' && restoreError" class="boot boot--error">
      <p class="boot-text" role="alert">{{ restoreError }}</p>
      <button type="button" class="btn-solid" :disabled="restoring" @click="retryRestore">
        {{ restoring ? '确认中...' : '重新确认登录状态' }}
      </button>
    </div>

    <p v-else-if="authStatus === 'guest'" class="boot" role="status">正在前往登录…</p>

    <!-- 已登录档案页 -->
    <div v-else-if="currentAccount" class="editorial-shell">
      <IndexNav :items="indexItems" />

      <article class="editorial-article">
        <Masthead
          edition="第一阶段 · 出生日期字段组"
          title="本人档案"
          subtitle="账号名下唯一一份 · 仅账号本人可见"
          :status-text="statusLabelText"
          :meta-text="updatedAtText ? `最近更新 ${updatedAtText}` : '最近更新 —'"
        />

        <!-- Ⅰ 录 · 已录入资料 -->
        <section
          id="sec-record"
          class="editorial-section editorial-section--first"
          data-profile-section
        >
          <SectionHeading num="Ⅰ" title="录 · 已录入资料" />

          <!-- 加载失败：不伪装为空档案 -->
          <div v-if="loadFailed" class="load-error" role="alert">
            <p>{{ profileApi.error.value }}</p>
            <button type="button" class="btn-quiet" @click="profileApi.loadProfile(true)">
              重新加载
            </button>
          </div>

          <template v-else>
            <!-- 已录入 -->
            <template v-if="hasBirthDate && displayNormalized">
              <ProfileRecordCard
                :solar-text="solarText"
                :note-text="noteText"
                :conversion-version="displayNormalized.conversionVersion"
                :confirmed-at="confirmedAtText"
                :raw-label="rawLabel"
              />
              <div class="record-actions">
                <button
                  type="button"
                  class="btn-quiet"
                  :aria-expanded="editorOpen"
                  aria-controls="profile-editor"
                  @click="toggleEditor"
                >
                  修改出生日期
                </button>
              </div>
            </template>

            <!-- 日期组已删除：保留档案 -->
            <div v-else-if="hasProfile" class="state-card">
              <p>出生日期已删除。档案仍保留，可随时重新填写；账号、登录与内容偏好都不受影响。</p>
              <button
                type="button"
                class="btn-quiet"
                :aria-expanded="editorOpen"
                aria-controls="profile-editor"
                @click="toggleEditor"
              >
                重新填写出生日期
              </button>
            </div>

            <!-- 无档案 -->
            <div v-else class="state-card state-card--empty">
              <p class="state-title">尚未录入出生资料</p>
              <p>
                本人档案用于在工具里一次性填充你已经确认过的字段。注册不会自动建档，填不填、什么时候填都由你决定。
              </p>
              <button
                type="button"
                class="btn-solid"
                :aria-expanded="editorOpen"
                aria-controls="profile-editor"
                @click="toggleEditor"
              >
                录入出生日期
              </button>
            </div>

            <div v-if="actionError" class="action-error" role="alert">{{ actionError }}</div>

            <!-- 出生日期编辑器：默认收起，由上方三个入口展开 -->
            <div v-if="editorOpen" id="profile-editor" class="editor">
              <div class="editor-head">
                <h3 class="editor-title">出生日期</h3>
                <p class="editor-sub">
                  改动只进入待保存草稿；确认差异后才会更新档案，工具页面上的临时修改不会反向覆盖这里。
                </p>
              </div>

              <BirthDateGroupInput
                :draft="draft"
                :error="draftError || undefined"
                :normalized-solar-date="normalized?.solarDate"
                @update:calendar="onDraftCalendar"
                @update:year="onDraftYear"
                @update:month="onDraftMonth"
                @update:day="onDraftDay"
                @update:leap-month="onDraftLeap"
              />

              <p v-if="normalized" class="editor-live">
                规范化公历 <span class="num">{{ normalized.solarDate }}</span>
              </p>

              <div class="editor-actions">
                <button type="button" class="btn-quiet" :disabled="busy" @click="closeEditor">
                  取消
                </button>
                <button
                  type="button"
                  class="btn-quiet"
                  :disabled="!normalized || busy"
                  :aria-busy="busy"
                  @click="openSaveDialog"
                >
                  查看本次变更
                </button>
              </div>
            </div>
          </template>
        </section>

        <ProfileUsageSection
          v-if="!loadFailed"
          :has-date="hasBirthDate"
          :use-allowed="useAllowed"
          :busy="busy"
          @stop="showRevokeDialog = true"
          @allow="showAllowDialog = true"
          @refill="openEditor"
        />

        <ProfileScopeSection v-if="!loadFailed" :policy-version="SELF_PROFILE_POLICY_VERSION" />

        <ProfileDangerZone
          v-if="!loadFailed"
          :has-profile="hasProfile"
          :has-birth-date="hasBirthDate"
          :busy="busy"
          @delete-date="showDeleteDateDialog = true"
          @delete-profile="openDeleteProfileDialog"
        />

        <p class="back-link">
          <NuxtLink to="/account" class="nav-link no-underline">返回账号设置</NuxtLink>
        </p>
      </article>
    </div>
  </div>

  <!-- 保存差异确认 -->
  <SelfProfileSaveDialog
    :show="showSaveDialog"
    :current-profile="profileApi.profile.value"
    :candidate="normalized"
    :readiness="saveReadiness"
    :account-id="currentAccount?.id ?? null"
    :busy="busy"
    :error="saveDialogError"
    :conflict="saveConflict"
    @close="closeSaveDialog"
    @confirm="confirmSave"
    @reload="reloadForConflict"
  />

  <!-- 删除出生日期确认 -->
  <Teleport to="body">
    <div v-if="showDeleteDateDialog" class="auth-dialog-wrap" role="presentation">
      <div
        class="auth-dialog-backdrop"
        aria-hidden="true"
        @click="!busy && (showDeleteDateDialog = false)"
      />
      <div
        class="auth-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-date-title"
      >
        <h2 id="delete-date-title" class="editorial-dialog-title">删除出生日期</h2>
        <p class="editorial-dialog-text">
          将删除已保存的出生日期字段组，并停止档案带入。档案与账号保留，内容偏好不受影响。此操作不可撤销。
        </p>
        <div class="editorial-dialog-actions">
          <button
            type="button"
            class="btn-quiet"
            :disabled="busy"
            @click="showDeleteDateDialog = false"
          >
            取消
          </button>
          <button type="button" class="btn-solid" :disabled="busy" @click="confirmDeleteBirthDate">
            {{ busy ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 删除整份档案确认 -->
  <Teleport to="body">
    <div v-if="showDeleteProfileDialog" class="auth-dialog-wrap" role="presentation">
      <div
        class="auth-dialog-backdrop"
        aria-hidden="true"
        @click="!busy && (showDeleteProfileDialog = false)"
      />
      <div
        class="auth-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-profile-title"
      >
        <h2 id="delete-profile-title" class="editorial-dialog-title">删除整份本人档案</h2>
        <p class="editorial-dialog-text">
          清除本人档案与使用授权，不删除账号或会话。删除后账号、登录与内容偏好都不受影响。此操作不可撤销。
        </p>

        <!-- 存在仍含出生输入的历史：显示条数并要求明确选择（无默认值） -->
        <fieldset
          v-if="historyWithBirthInputCount > 0"
          class="mb-5 space-y-2 font-sans text-sm leading-relaxed text-ink-medium"
        >
          <legend class="mb-1">
            仍有 {{ historyWithBirthInputCount }} 条历史快照包含保存时的出生输入，请选择处置方式：
          </legend>
          <label class="flex items-start gap-3">
            <input
              v-model="deleteHistoryMode"
              type="radio"
              name="delete-history-mode"
              value="keep"
              class="mt-1"
              :disabled="busy"
            />
            <span>保留这 {{ historyWithBirthInputCount }} 条历史快照</span>
          </label>
          <label class="flex items-start gap-3">
            <input
              v-model="deleteHistoryMode"
              type="radio"
              name="delete-history-mode"
              value="delete"
              class="mt-1"
              :disabled="busy"
            />
            <span>同时删除这 {{ historyWithBirthInputCount }} 条历史快照</span>
          </label>
          <p v-if="deleteHistoryMode === 'keep'" class="text-xs leading-relaxed">
            保留的历史快照中仍包含保存时的出生输入，档案删除不代表这些出生资料已消失。
          </p>
        </fieldset>

        <p v-if="actionError" class="action-error" role="alert">{{ actionError }}</p>
        <div class="editorial-dialog-actions">
          <button
            type="button"
            class="btn-quiet"
            :disabled="busy"
            @click="showDeleteProfileDialog = false"
          >
            取消
          </button>
          <button type="button" class="btn-solid" :disabled="busy" @click="confirmDeleteProfile">
            {{ busy ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 停止后续使用确认 -->
  <Teleport to="body">
    <div v-if="showRevokeDialog" class="auth-dialog-wrap" role="presentation">
      <div
        class="auth-dialog-backdrop"
        aria-hidden="true"
        @click="!busy && (showRevokeDialog = false)"
      />
      <div class="auth-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="revoke-title">
        <h2 id="revoke-title" class="editorial-dialog-title">停止后续档案带入</h2>
        <p class="editorial-dialog-text">
          工具以后不再从本档案填充出生日期。已保存的日期保留，可随时重新允许带入。
        </p>
        <div class="editorial-dialog-actions">
          <button
            type="button"
            class="btn-quiet"
            :disabled="busy"
            @click="showRevokeDialog = false"
          >
            取消
          </button>
          <button type="button" class="btn-solid" :disabled="busy" @click="confirmRevokeUse">
            {{ busy ? '处理中...' : '确认停止' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 重新允许带入确认 -->
  <Teleport to="body">
    <div v-if="showAllowDialog" class="auth-dialog-wrap" role="presentation">
      <div
        class="auth-dialog-backdrop"
        aria-hidden="true"
        @click="!busy && (showAllowDialog = false)"
      />
      <div class="auth-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="allow-title">
        <h2 id="allow-title" class="editorial-dialog-title">重新允许带入</h2>
        <label class="editorial-dialog-consent">
          <input v-model="allowConsent" type="checkbox" class="mt-1" :disabled="busy" />
          <span>
            我同意按当前告知（版本
            {{ SELF_PROFILE_POLICY_VERSION }}）允许从本档案带入出生日期到工具草稿。
          </span>
        </label>
        <div class="editorial-dialog-actions">
          <button type="button" class="btn-quiet" :disabled="busy" @click="showAllowDialog = false">
            取消
          </button>
          <button
            type="button"
            class="btn-solid"
            :disabled="!allowConsent || busy"
            @click="confirmAllowUse"
          >
            {{ busy ? '处理中...' : '确认允许' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <PageFooter />
</template>

<style scoped>
.profile-page {
  min-height: calc(100dvh - 4rem);
  padding-bottom: 64px;
}

/* ── 引导态 ── */
.boot {
  max-width: 72rem;
  margin-inline: auto;
  padding: 120px 24px;
  text-align: center;
  font-size: 0.8125rem;
  letter-spacing: 0.12em;
  color: var(--color-ink-medium);
}

.boot--error {
  max-width: 28rem;
}

.boot-text {
  margin: 0 0 16px;
  line-height: 1.75;
}

/* ── 状态卡 ── */
.state-card {
  padding: 26px 28px;
  border: 1px solid var(--color-ink-faint);
  border-radius: 16px;
  background: var(--color-paper-light);
}

.state-card--empty {
  border-style: dashed;
  padding: 34px 32px;
}

.state-title {
  margin: 0 0 10px;
  font-family: var(--font-display);
  font-size: 1.375rem;
  letter-spacing: 0.05em;
  color: var(--color-ink-dark);
}

.state-card p {
  max-width: 56ch;
  margin: 0 0 20px;
  font-size: 0.9375rem;
  line-height: 1.75;
  color: var(--color-ink-medium);
}

/* ── 记录卡动作 ── */
.record-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 22px;
}

/* ── 编辑器 ── */
.editor {
  margin-top: 24px;
  padding: 26px 28px;
  border: 1px solid var(--color-ink-faint);
  border-radius: 16px;
  background: var(--color-paper-lightest);
}

.editor-head {
  margin-bottom: 22px;
}

.editor-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.125rem;
  letter-spacing: 0.05em;
  color: var(--color-ink-dark);
}

.editor-sub {
  margin: 6px 0 0;
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--color-ink-medium);
}

.editor-live {
  margin: 16px 0 0;
  font-size: 0.8125rem;
  color: var(--color-ink-medium);
}

.editor-live .num {
  color: var(--color-ink-dark);
  font-variant-numeric: tabular-nums;
}

.editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

/* ── 错误与返回 ── */
.load-error {
  padding: 20px 22px;
  border: 1px solid var(--color-cinnabar);
  border-radius: 10px;
  color: var(--color-cinnabar);
  font-size: 0.875rem;
}

.load-error p {
  margin: 0 0 12px;
}

.action-error {
  margin-top: 16px;
  font-size: 0.875rem;
  color: var(--color-cinnabar);
}

.back-link {
  margin: 40px 0 0;
  text-align: center;
}

/* ── 窄屏：外壳与卷目的收窄规则由 .editorial-* 与 IndexNav 自己负责 ── */
@media (max-width: 720px) {
  .state-card,
  .state-card--empty,
  .editor {
    padding: 22px 20px;
  }
}
</style>
