<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { BirthDateDraft, NormalizedBirthDate } from '~/types/self-profile'
import { normalizeBirthDate } from '~/utils/self-profile/birth-date'
import { SELF_PROFILE_POLICY_VERSION } from '~/constants/self-profile-policy'
import { useSelfProfile } from '~/composables/useSelfProfile'
import BirthDateGroupInput from '~/components/profile/BirthDateGroupInput.vue'
import SelfProfileSaveDialog from '~/components/profile/SelfProfileSaveDialog.vue'

/**
 * 独立本人档案页（R4）。
 *
 * - 客户端复用 restoreSession 三态与账号页的恢复错误/显式重试模式；
 *   确认 guest 且无恢复网络错误才 replace('/login')；
 * - 加载失败不伪装为空档案；仅账号本人访问，SEO noindex；
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
    await profileApi.loadProfile()
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
      // 成功后才更新本地展示
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
  busy.value = true
  actionError.value = ''
  try {
    const ok = await profileApi.deleteProfile({
      profileId: current.id,
      version: current.version,
    })
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
</script>

<template>
  <div
    class="self-profile-page min-h-[calc(100dvh-4rem)] flex items-start justify-center px-4 py-12"
  >
    <!-- 恢复中占位 -->
    <div v-if="authStatus === 'restoring'" class="text-center">
      <p class="font-sans text-sm text-ink-medium tracking-[0.1em]">正在确认登录状态…</p>
    </div>

    <!-- 游客：恢复网络失败时显示错误与重试；无错误则等待重定向 -->
    <div v-else-if="authStatus === 'guest' && restoreError" class="text-center max-w-sm px-4">
      <p class="font-sans text-sm text-ink-medium leading-relaxed mb-4" role="alert">
        {{ restoreError }}
      </p>
      <button type="button" class="btn-cin inline-flex" :disabled="restoring" @click="retryRestore">
        {{ restoring ? '确认中...' : '重新确认登录状态' }}
      </button>
    </div>

    <div v-else-if="authStatus === 'guest'" class="text-center">
      <p class="font-sans text-sm text-ink-medium tracking-[0.1em]">正在前往登录…</p>
    </div>

    <!-- 已登录档案页 -->
    <div v-else-if="currentAccount" class="w-full max-w-2xl">
      <div class="self-profile-card card-warm rounded-xl p-8 relative overflow-hidden">
        <h1 class="sr-only">本人档案</h1>
        <header class="self-profile-header mb-8">
          <span
            class="seal-icon w-16 h-16 text-base flex items-center justify-center mx-auto mb-4"
            aria-hidden="true"
            >玄</span
          >
          <h2 class="font-display text-3xl text-ink-dark tracking-[0.12em]">
            {{ currentAccount.nickname }} 的本人档案
          </h2>
          <p class="font-sans text-xs text-ink-light tracking-[0.1em] mt-1">
            仅账号本人可查看与编辑
          </p>
        </header>

        <!-- 加载失败：不伪装为空档案 -->
        <div
          v-if="profileApi.error.value && !hasProfile"
          class="mb-6 text-cinnabar text-sm"
          role="alert"
        >
          {{ profileApi.error.value }}
          <button type="button" class="btn-ghost mt-3" @click="profileApi.loadProfile(true)">
            重新加载
          </button>
        </div>

        <!-- 无档案 -->
        <section
          v-else-if="!hasProfile"
          aria-labelledby="no-profile-heading"
          class="self-profile-section space-y-5"
        >
          <h3 id="no-profile-heading" class="font-display text-lg text-ink-dark">还没有本人档案</h3>
          <p class="font-sans text-sm text-ink-medium leading-relaxed">
            填写出生日期后，查看差异并决定是否长期保存。不强制建档，随时可以填写。
          </p>

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

          <div v-if="actionError" class="text-cinnabar text-sm" role="alert">{{ actionError }}</div>

          <button
            type="button"
            class="btn-seal self-profile-primary-action"
            :disabled="!normalized || busy"
            :aria-busy="busy"
            @click="openSaveDialog"
          >
            <span>查看差异并保存</span>
          </button>
        </section>

        <!-- 有档案：完整日期 / 日期组已删除 -->
        <section v-else aria-label="本人档案内容" class="self-profile-section space-y-6">
          <!-- 完整日期 -->
          <div v-if="hasBirthDate && displayNormalized" class="space-y-3">
            <div class="self-profile-date-card">
              <p class="self-profile-date-label">当前出生日期</p>
              <p class="self-profile-date-value">
                {{ displayNormalized.raw.year }}年{{ displayNormalized.raw.month }}月{{
                  displayNormalized.raw.day
                }}日
              </p>
              <p>
                {{ displayNormalized.raw.calendar === 'lunar' ? '农历' : '公历' }}
                <span v-if="displayNormalized.raw.calendar === 'lunar'">
                  （{{ displayNormalized.raw.isLeapMonth ? '闰月' : '普通月' }}）
                </span>
                · 规范化公历 {{ displayNormalized.solarDate }}
              </p>
              <details class="self-profile-technical-details">
                <summary>查看转换与确认详情</summary>
                <div class="self-profile-technical-content">
                  <p>转换规则：{{ displayNormalized.conversionVersion }}</p>
                  <p>最后确认：{{ displayNormalized.confirmedAt }}</p>
                </div>
              </details>
            </div>

            <div v-if="actionError" class="text-cinnabar text-sm" role="alert">
              {{ actionError }}
            </div>

            <div class="self-profile-action-group">
              <p class="self-profile-section-label">档案带入</p>
              <div class="flex flex-wrap gap-3">
                <button
                  type="button"
                  class="btn-ink"
                  :disabled="busy"
                  @click="showRevokeDialog = true"
                >
                  停止后续档案带入
                </button>
                <button
                  type="button"
                  class="btn-ink self-profile-delete-action"
                  :disabled="busy"
                  @click="showDeleteDateDialog = true"
                >
                  删除出生日期
                </button>
              </div>
            </div>

            <!-- 编辑已有日期 -->
            <div class="self-profile-edit border-t border-paper-dark pt-6 space-y-4">
              <div>
                <p class="font-display text-xl text-ink-dark">修改出生日期</p>
                <p class="font-sans text-sm text-ink-medium mt-1">
                  修改只会影响待保存草稿，确认差异后才会更新档案。
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
              <button
                type="button"
                class="btn-seal"
                :disabled="!normalized || busy"
                :aria-busy="busy"
                @click="openSaveDialog"
              >
                <span>查看差异并保存</span>
              </button>
            </div>
          </div>

          <!-- 日期组已删除：保留档案 -->
          <div v-else class="space-y-3">
            <p class="font-sans text-sm text-ink-medium leading-relaxed">
              出生日期已删除。档案仍保留，可重新填写；账号与登录不受影响。
            </p>
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
            <button
              type="button"
              class="btn-seal"
              :disabled="!normalized || busy"
              :aria-busy="busy"
              @click="openSaveDialog"
            >
              <span>查看差异并保存</span>
            </button>
          </div>

          <!-- 撤回后保留日期只读展示 + 明确重新允许入口 -->
          <div
            v-if="hasBirthDate && !profileApi.profile.value?.useAllowed"
            class="border-t border-paper-dark pt-4"
          >
            <p class="font-sans text-sm text-ink-medium leading-relaxed">
              已停止从档案带入工具。日期仍保存在档案中，可随时重新允许带入。
            </p>
            <button
              type="button"
              class="btn-ink mt-3"
              :disabled="busy"
              @click="showAllowDialog = true"
            >
              重新允许带入
            </button>
          </div>

          <!-- 删除整份档案（保留账号/会话） -->
          <div class="self-profile-danger-zone border-t border-paper-dark pt-5">
            <p class="self-profile-section-label">档案管理</p>
            <p class="font-sans text-sm text-ink-medium mb-3">
              删除整份档案会清除保存的出生日期与使用授权，不删除账号或会话。
            </p>
            <button
              type="button"
              class="btn-ghost"
              :disabled="busy"
              @click="showDeleteProfileDialog = true"
            >
              删除整份档案
            </button>
          </div>
        </section>

        <p class="mt-8 text-center">
          <NuxtLink to="/account" class="nav-link no-underline">返回账号设置</NuxtLink>
        </p>
      </div>
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
        <h2
          id="delete-date-title"
          class="font-display text-xl text-ink-dark tracking-[0.15em] mb-4 text-center"
        >
          删除出生日期
        </h2>
        <p class="font-sans text-sm text-ink-medium leading-relaxed mb-5">
          将删除已保存的出生日期字段组并停止档案带入，档案与账号保留。此操作不可撤销。
        </p>
        <div class="flex gap-3">
          <button
            type="button"
            class="btn-ink flex-1"
            :disabled="busy"
            @click="showDeleteDateDialog = false"
          >
            取消
          </button>
          <button
            type="button"
            class="btn-cin flex-1"
            :disabled="busy"
            @click="confirmDeleteBirthDate"
          >
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
        <h2
          id="delete-profile-title"
          class="font-display text-xl text-ink-dark tracking-[0.15em] mb-4 text-center"
        >
          删除整份档案
        </h2>
        <p class="font-sans text-sm text-ink-medium leading-relaxed mb-5">
          将删除本人档案（含保存的出生日期与使用授权），并保留最小操作记录。此操作不会删除账号或使会话失效。
        </p>
        <div class="flex gap-3">
          <button
            type="button"
            class="btn-ink flex-1"
            :disabled="busy"
            @click="showDeleteProfileDialog = false"
          >
            取消
          </button>
          <button
            type="button"
            class="btn-cin flex-1"
            :disabled="busy"
            @click="confirmDeleteProfile"
          >
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
        <h2
          id="revoke-title"
          class="font-display text-xl text-ink-dark tracking-[0.15em] mb-4 text-center"
        >
          停止后续档案带入
        </h2>
        <p class="font-sans text-sm text-ink-medium leading-relaxed mb-5">
          工具以后不再从本档案填充出生日期。已保存的日期保留，可随时重新允许带入。
        </p>
        <div class="flex gap-3">
          <button
            type="button"
            class="btn-ink flex-1"
            :disabled="busy"
            @click="showRevokeDialog = false"
          >
            取消
          </button>
          <button type="button" class="btn-cin flex-1" :disabled="busy" @click="confirmRevokeUse">
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
        <h2
          id="allow-title"
          class="font-display text-xl text-ink-dark tracking-[0.15em] mb-4 text-center"
        >
          重新允许带入
        </h2>
        <label
          class="flex items-start gap-3 font-sans text-sm text-ink-medium leading-relaxed mb-5"
        >
          <input v-model="allowConsent" type="checkbox" class="mt-1" :disabled="busy" />
          <span>
            我同意按当前告知（版本
            {{ SELF_PROFILE_POLICY_VERSION }}）允许从本档案带入出生日期到工具草稿。
          </span>
        </label>
        <div class="flex gap-3">
          <button
            type="button"
            class="btn-ink flex-1"
            :disabled="busy"
            @click="showAllowDialog = false"
          >
            取消
          </button>
          <button
            type="button"
            class="btn-cin flex-1"
            :disabled="!allowConsent || busy"
            @click="confirmAllowUse"
          >
            {{ busy ? '处理中...' : '确认允许' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.self-profile-card {
  border: 1px solid var(--color-paper-dark);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--color-ink-dark) 7%, transparent);
}
.self-profile-section {
  min-width: 0;
}
.self-profile-section-label {
  margin-bottom: 0.65rem;
  color: var(--color-ink-light);
  font: 500 0.75rem/1.4 var(--font-sans);
  letter-spacing: 0.12em;
}
.self-profile-action-group {
  padding-top: 0.35rem;
}
.self-profile-delete-action {
  color: var(--color-cinnabar-deepest);
  border-color: color-mix(in srgb, var(--color-cinnabar) 28%, var(--color-paper-dark));
}
.self-profile-edit {
  padding-inline: 1rem;
  background: color-mix(in srgb, var(--color-paper-light) 48%, transparent);
}
.self-profile-danger-zone {
  margin-top: 0.5rem;
}
.self-profile-header {
  border-bottom: 1px solid var(--color-paper-dark);
  padding-bottom: 1.5rem;
}
.self-profile-header h2 {
  line-height: 1.15;
}
.self-profile-seal {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-cinnabar);
  color: var(--color-cinnabar);
  font-family: var(--font-display);
  font-size: 1.15rem;
}
.self-profile-kicker {
  margin-bottom: 0.25rem;
  color: var(--color-ink-light);
  font: 500 0.75rem/1 var(--font-sans);
  letter-spacing: 0.08em;
}
.self-profile-date-card {
  border-left: 3px solid var(--color-cinnabar);
  background: color-mix(in srgb, var(--color-paper-medium) 45%, transparent);
  padding: 1.25rem 1.25rem 1rem;
}
.self-profile-date-label {
  color: var(--color-ink-medium);
  font: 500 0.8rem/1.4 var(--font-sans);
  letter-spacing: 0.08em;
}
.self-profile-date-value {
  margin-top: 0.45rem;
  color: var(--color-ink-dark);
  font: 2rem/1.25 var(--font-display);
}
.self-profile-technical-details {
  margin-top: 1rem;
  color: var(--color-ink-medium);
  font: 0.75rem/1.6 var(--font-sans);
}
.self-profile-technical-details summary {
  width: fit-content;
  cursor: pointer;
  color: var(--color-ink-medium);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.self-profile-technical-details summary:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 3px;
}
.self-profile-technical-content {
  display: grid;
  gap: 0.2rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-paper-dark);
}
.self-profile-primary-action {
  width: 100%;
  justify-content: center;
}
.self-profile-empty-state {
  padding: 1rem 0 0.25rem;
}
.self-profile-danger-zone {
  color: var(--color-ink-medium);
}
@media (min-width: 760px) {
  .self-profile-card {
    padding: 2.5rem;
  }
  .self-profile-date-card {
    padding: 1.5rem;
  }
}
@media (max-width: 480px) {
  .self-profile-card {
    padding: 1.25rem;
  }
  .self-profile-date-value {
    font-size: 1.65rem;
  }
  .self-profile-actions > button,
  .self-profile-action-group button {
    width: 100%;
    justify-content: center;
  }
  .self-profile-edit {
    padding-inline: 0.75rem;
  }
}
/* 窄屏文字放大时限制留白，保留正文与按钮可用宽度。 */
@media (max-width: 480px) {
  .self-profile-page {
    padding-inline: 8px;
  }
  .self-profile-card {
    padding-inline: 16px;
  }
  .self-profile-card button {
    padding-inline: 12px;
    max-width: 100%;
  }
}
.auth-dialog-wrap {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.auth-dialog-backdrop {
  position: absolute;
  inset: 0;
  background: color-mix(in srgb, var(--color-ink-dark) 50%, transparent);
  backdrop-filter: blur(2px);
}
.auth-dialog-panel {
  position: relative;
  width: 100%;
  max-width: 24rem;
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  background: var(--color-paper-lightest);
  border: 1px solid var(--color-paper-dark);
  border-radius: 1rem;
  padding: 2rem 1.5rem 1.5rem;
  box-shadow:
    0 8px 32px color-mix(in srgb, #2c1a0e 12%, transparent),
    0 2px 8px color-mix(in srgb, #2c1a0e 8%, transparent);
}
@media (max-width: 480px) {
  .auth-dialog-wrap {
    padding: 0;
  }
  .auth-dialog-panel {
    max-width: none;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
    border: none;
  }
}
</style>
