<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import PageFooter from '~/components/tools/PageFooter.vue'
import ProfileIndexNav from '~/components/profile/ProfileIndexNav.vue'
import ProfileMasthead from '~/components/profile/ProfileMasthead.vue'
import ProfileSectionHeading from '~/components/profile/ProfileSectionHeading.vue'
import ProfileDangerSection from '~/components/profile/ProfileDangerSection.vue'
import ProfileNote from '~/components/profile/ProfileNote.vue'
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_SERVICE_TERMS_VERSION,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  SESSION_DURATION_DAYS,
} from '~/constants/account-policy'
import { useSelfProfile } from '~/composables/useSelfProfile'

/**
 * 账号与安全（出版版）。
 *
 * - 「账号」是身份验证、会话管理与访问本人数据的入口，**不等于本人档案**
 *   （数据生命周期规范 §3.1/§3.2），因此本页与本人档案页分工不同：
 *   本页管身份与会话，档案页管出生资料与授权；
 * - 账号级销毁（注销）只在本页，且与档案页的「删除整份档案」分开，
 *   避免两个爆炸半径不同的操作相邻（§13 删除矩阵）；
 * - 登录、注册与会话恢复的落脚点是本人档案页；本页不再是落脚点；
 * - 退出当前设备只终止当前会话；退出所有设备终止该账号全部会话；注销使全部会话失效。
 *   三条动作的既有逻辑（含注销的昵称 + 密码复核与焦点约束）保持不变。
 */

useSeoMeta({
  title: '账号与安全 — 玄·道',
  ogTitle: '账号与安全 — 玄·道',
  description: '账号身份、会话管理与账号注销。',
  ogDescription: '账号身份、会话管理与账号注销。',
  ogType: 'website',
})

const {
  authStatus,
  currentAccount,
  restoreSession,
  restoreError,
  logout,
  logoutAll,
  deleteAccount,
} = useAuth()
const profileApi = useSelfProfile()
const router = useRouter()

const actionError = ref('')
const actionLoading = ref<'logout' | 'logout-all' | null>(null)
const restoring = ref(false)

// 注销对话框
const showDeleteDialog = ref(false)
const deleteNickname = ref('')
const deletePassword = ref('')
const deleteError = ref('')
const deleting = ref(false)
const deleteDialogRef = ref<HTMLElement | null>(null)
const deleteTitleRef = ref<HTMLElement | null>(null)
const deleteTriggerRef = ref<HTMLElement | null>(null)

// 确认游客态的统一跳转：只有无恢复网络错误的 guest 才 replace /login；
// 恢复网络失败保留错误与重试入口，已认证保留本页。
function redirectIfConfirmedGuest() {
  if (authStatus.value === 'guest' && !restoreError.value) {
    router.replace('/login')
  }
}

onMounted(async () => {
  await restoreSession()
  if (authStatus.value === 'authenticated') {
    // 只取无出生值的最小摘要，用于「数据与告知」一节展示档案状态。
    await profileApi.loadSummary()
  }
  redirectIfConfirmedGuest()
})

onBeforeUnmount(() => {
  profileApi.clear()
})

// 网络恢复失败：显式重试；成功后进入本页，确认游客态跳转登录，仍失败停留在当前页。
async function retryRestore() {
  if (restoring.value) return
  restoring.value = true
  try {
    await restoreSession()
    if (authStatus.value === 'authenticated') {
      await profileApi.loadSummary()
    }
    redirectIfConfirmedGuest()
  } finally {
    restoring.value = false
  }
}

// ── 展示派生（全部来自真实数据）──
const nickname = computed(() => currentAccount.value?.nickname ?? '')

const createdAtText = computed(() => {
  const value = currentAccount.value?.createdAt
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')}`
  } catch {
    return value
  }
})

/** 档案状态：读取失败不伪装成「未建档」。 */
const profileStateText = computed(() => {
  const summary = profileApi.summary.value
  if (summary) {
    if (!summary.exists) return '尚未建档'
    return summary.hasBirthDate ? '已保存出生日期' : '档案已保留 · 出生日期已删除'
  }
  if (profileApi.error.value) return '暂时无法读取档案状态'
  return '正在读取档案状态…'
})

/** 卷目索引：四节锚点。 */
const indexItems = [
  { num: 'Ⅰ', label: '账 · 账号身份', href: '#sec-account' },
  { num: 'Ⅱ', label: '话 · 会话与设备', href: '#sec-session' },
  { num: 'Ⅲ', label: '数 · 数据与告知', href: '#sec-data' },
  { num: 'Ⅳ', label: '销 · 注销账号', href: '#sec-close' },
]

// ── 当前设备退出：失败保留登录状态并明确提示 ──
async function handleLogout() {
  if (actionLoading.value) return
  actionError.value = ''
  actionLoading.value = 'logout'
  try {
    await logout()
    router.replace('/')
  } catch (e: unknown) {
    actionError.value = (e as Error)?.message || '退出失败，请稍后再试'
  } finally {
    actionLoading.value = null
  }
}

// ── 退出所有设备 ──
async function handleLogoutAll() {
  if (actionLoading.value) return
  actionError.value = ''
  actionLoading.value = 'logout-all'
  try {
    await logoutAll()
    router.replace('/')
  } catch (e: unknown) {
    actionError.value = (e as Error)?.message || '退出所有设备失败，请稍后再试'
  } finally {
    actionLoading.value = null
  }
}

function openDeleteDialog() {
  deleteNickname.value = ''
  deletePassword.value = ''
  deleteError.value = ''
  // 记录打开前的触发按钮，关闭后焦点返回
  if (import.meta.client && document.activeElement instanceof HTMLElement) {
    deleteTriggerRef.value = document.activeElement
  }
  showDeleteDialog.value = true
  nextTick(() => {
    deleteTitleRef.value?.focus()
  })
}

function closeDeleteDialog() {
  // 删除进行中不得通过 Escape、背板或取消按钮关闭
  if (deleting.value) return
  showDeleteDialog.value = false
  nextTick(() => {
    deleteTriggerRef.value?.focus()
  })
}

// 注销弹层焦点循环：Tab/Shift+Tab 约束在弹层内，标题作为初始焦点边界
function onDeleteDialogKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    closeDeleteDialog()
    return
  }
  if (e.key !== 'Tab') return
  if (!deleteDialogRef.value) return
  const focusable = Array.from(
    deleteDialogRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(el => !el.hasAttribute('disabled'))
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (document.activeElement === deleteTitleRef.value) {
    e.preventDefault()
    if (e.shiftKey) last.focus()
    else first.focus()
    return
  }

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

// ── 注销：需要当前昵称与密码二次确认 ──
async function confirmDelete() {
  if (deleting.value) return
  deleteError.value = ''
  if (deleteNickname.value.trim() !== currentAccount.value?.nickname) {
    deleteError.value = '昵称与当前账号不一致'
    return
  }
  if (deletePassword.value.length === 0) {
    deleteError.value = '请输入当前密码'
    return
  }
  deleting.value = true
  try {
    await deleteAccount(deleteNickname.value.trim(), deletePassword.value)
    showDeleteDialog.value = false
    router.replace('/')
  } catch (e: unknown) {
    // 失败不提前离开或清状态
    deleteError.value = (e as Error)?.message || '注销失败，请稍后再试'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="account-page">
    <!-- 恢复中占位 -->
    <p v-if="authStatus === 'restoring'" class="editorial-boot" role="status">正在确认登录状态…</p>

    <!-- 游客：恢复网络失败时显示错误与重试；无错误则等待重定向 -->
    <div
      v-else-if="authStatus === 'guest' && restoreError"
      class="editorial-boot editorial-boot--error"
    >
      <p class="editorial-boot-text" role="alert">{{ restoreError }}</p>
      <button type="button" class="btn-solid" :disabled="restoring" @click="retryRestore">
        {{ restoring ? '确认中...' : '重新确认登录状态' }}
      </button>
    </div>

    <p v-else-if="authStatus === 'guest'" class="editorial-boot" role="status">正在前往登录…</p>

    <!-- 已登录 -->
    <div v-else-if="currentAccount" class="editorial-shell">
      <ProfileIndexNav :items="indexItems" footnote="昵称不可修改&#10;每台设备独立会话" />

      <article class="editorial-article">
        <ProfileMasthead
          edition="账号与会话"
          :title="nickname"
          subtitle="昵称注册后不可修改 · 仅账号本人可见"
          status-text="账号状态：正常"
          :meta-text="`创建于 ${createdAtText}`"
        />

        <!-- Ⅰ 账号身份 -->
        <section
          id="sec-account"
          class="editorial-section editorial-section--first"
          data-account-section
        >
          <ProfileSectionHeading num="Ⅰ" title="账 · 账号身份" />

          <div class="editorial-facts">
            <div class="editorial-fact">
              <span class="editorial-fact-key">昵称</span>
              <p>{{ nickname }}</p>
            </div>
            <div class="editorial-fact">
              <span class="editorial-fact-key">昵称规则</span>
              <p>
                {{ NICKNAME_MIN_LENGTH }}–{{ NICKNAME_MAX_LENGTH }}
                个字符，只允许中文、字母、数字、下划线和连字符；注册后不可修改；不是实名，也不参与任何计算。
              </p>
            </div>
            <div class="editorial-fact">
              <span class="editorial-fact-key">创建时间</span>
              <p class="editorial-num">{{ createdAtText }}</p>
            </div>
            <div class="editorial-fact">
              <span class="editorial-fact-key">账号状态</span>
              <p>正常</p>
            </div>
          </div>
        </section>

        <!-- Ⅱ 会话与设备 -->
        <section id="sec-session" class="editorial-section" data-account-section>
          <ProfileSectionHeading num="Ⅱ" title="话 · 会话与设备" />

          <div class="session-card">
            <div class="session-item">
              <div>
                <p class="session-title">退出当前设备</p>
                <p class="session-desc">只终止本机登录，其他设备保持登录。</p>
              </div>
              <button
                type="button"
                class="btn-solid"
                :disabled="actionLoading !== null"
                :aria-busy="actionLoading === 'logout'"
                @click="handleLogout"
              >
                {{ actionLoading === 'logout' ? '退出中...' : '退出当前设备' }}
              </button>
            </div>

            <div class="session-item">
              <div>
                <p class="session-title">退出所有设备</p>
                <p class="session-desc">终止该账号的全部会话，其他设备需要重新登录。</p>
              </div>
              <button
                type="button"
                class="btn-quiet"
                :disabled="actionLoading !== null"
                :aria-busy="actionLoading === 'logout-all'"
                @click="handleLogoutAll"
              >
                {{ actionLoading === 'logout-all' ? '退出中...' : '退出所有设备' }}
              </button>
            </div>
          </div>

          <div v-if="actionError" class="action-error" role="alert">{{ actionError }}</div>

          <ProfileNote>
            每台设备拥有独立会话，新登录不会让其他设备自动退出；会话有效期为
            {{ SESSION_DURATION_DAYS }} 天。第一版不提供设备列表与凭证找回。
          </ProfileNote>
        </section>

        <!-- Ⅲ 数据与告知 -->
        <section id="sec-data" class="editorial-section" data-account-section>
          <ProfileSectionHeading num="Ⅲ" title="数 · 数据与告知" />

          <div class="editorial-facts">
            <div class="editorial-fact">
              <span class="editorial-fact-key">本人档案</span>
              <p>
                {{ profileStateText }}
                <NuxtLink to="/self-profile" class="editorial-link">进入本人档案</NuxtLink>
              </p>
            </div>
            <div class="editorial-fact">
              <span class="editorial-fact-key">档案授权与用途</span>
              <p>
                档案带入的开关与四类用途说明，在本人档案页的「授 · 授权与用途」「溯 ·
                溯源与范围」两节。
              </p>
            </div>
            <div class="editorial-fact">
              <span class="editorial-fact-key">隐私政策</span>
              <p>
                <NuxtLink to="/privacy" class="editorial-link">查看全文</NuxtLink>
                · 当前版本
                <span class="editorial-num">{{ CURRENT_PRIVACY_POLICY_VERSION }}</span>
              </p>
            </div>
            <div class="editorial-fact">
              <span class="editorial-fact-key">服务规则</span>
              <p>
                <NuxtLink to="/terms" class="editorial-link">查看全文</NuxtLink>
                · 当前版本
                <span class="editorial-num">{{ CURRENT_SERVICE_TERMS_VERSION }}</span>
              </p>
            </div>
          </div>

          <ProfileNote>
            账号用于身份验证和会话管理，与本人档案是两件事：删除本人档案不会注销账号，注销账号会连同档案与授权一起删除。
          </ProfileNote>
        </section>

        <!-- Ⅳ 注销账号 -->
        <section id="sec-close" class="editorial-section" data-account-section>
          <ProfileSectionHeading num="Ⅳ" title="销 · 注销账号" />

          <ProfileDangerSection body-id="account-danger-body">
            <div class="danger-item">
              <div>
                <p class="danger-title">注销账号</p>
                <p>
                  删除账号及其本人档案、内容偏好与可识别授权凭证，并使全部会话失效。此操作不可撤销，需要昵称与密码复核。
                </p>
              </div>
              <button
                type="button"
                class="btn-quiet"
                :disabled="actionLoading !== null"
                @click="openDeleteDialog"
              >
                注销账号
              </button>
            </div>
          </ProfileDangerSection>
        </section>
      </article>
    </div>
  </div>

  <!-- 注销确认对话框（逻辑与 R2 一致） -->
  <Teleport to="body">
    <div
      v-if="showDeleteDialog"
      class="auth-dialog-wrap"
      role="presentation"
      @keydown="onDeleteDialogKeydown"
    >
      <div class="auth-dialog-backdrop" aria-hidden="true" @click="closeDeleteDialog" />
      <div
        ref="deleteDialogRef"
        class="auth-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <h2
          id="delete-dialog-title"
          ref="deleteTitleRef"
          tabindex="-1"
          class="editorial-dialog-title"
        >
          注销账号
        </h2>
        <p class="editorial-dialog-text">
          注销将删除当前账号及其本人档案、内容偏好与可识别授权凭证，并使全部会话失效，此操作不可撤销。请输入当前昵称和密码确认。
        </p>
        <div v-if="deleteError" class="dialog-error" role="alert">{{ deleteError }}</div>
        <form class="space-y-4" @submit.prevent="confirmDelete">
          <div>
            <label for="delete-nickname" class="dialog-label">当前昵称</label>
            <input
              id="delete-nickname"
              v-model="deleteNickname"
              type="text"
              class="input-warm"
              autocomplete="off"
              :disabled="deleting"
              required
            />
          </div>
          <div>
            <label for="delete-password" class="dialog-label">当前密码</label>
            <input
              id="delete-password"
              v-model="deletePassword"
              type="password"
              class="input-warm"
              autocomplete="current-password"
              :disabled="deleting"
              required
            />
          </div>
          <div class="editorial-dialog-actions pt-2">
            <button type="button" class="btn-quiet" :disabled="deleting" @click="closeDeleteDialog">
              取消
            </button>
            <button type="submit" class="btn-solid" :disabled="deleting" :aria-busy="deleting">
              {{ deleting ? '注销中...' : '确认注销' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <PageFooter />
</template>

<style scoped>
.account-page {
  min-height: calc(100dvh - 4rem);
  padding-bottom: 64px;
}

.session-card {
  padding: 22px 24px;
  border: 1px solid var(--color-ink-faint);
  border-radius: 16px;
  background: var(--color-paper-light);
}

.session-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
}

.session-item + .session-item {
  margin-top: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--color-ink-faint);
}

.session-title {
  margin: 0 0 5px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-ink-dark);
}

.session-desc {
  max-width: 60ch;
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-ink-medium);
}

.action-error {
  margin-top: 16px;
  font-size: 0.875rem;
  color: var(--color-cinnabar);
}

.dialog-error {
  margin-bottom: 16px;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--color-cinnabar) 15%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
  font-size: 0.875rem;
  color: var(--color-cinnabar);
}

.dialog-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  color: var(--color-ink-light);
}
</style>
