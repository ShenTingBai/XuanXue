<script setup lang="ts">
import PageFooter from '~/components/tools/PageFooter.vue'

useSeoMeta({
  title: '账号设置 — 玄·道',
  ogTitle: '账号设置 — 玄·道',
  description: '账号设置',
  ogDescription: '账号设置',
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
// 恢复网络失败保留错误与重试入口，已认证保留账号页。
function redirectIfConfirmedGuest() {
  if (authStatus.value === 'guest' && !restoreError.value) {
    router.replace('/login')
  }
}

onMounted(async () => {
  await restoreSession()
  redirectIfConfirmedGuest()
})

// 网络恢复失败：显式重试；成功后进入账号页，确认游客态跳转登录，仍失败停留在当前页。
async function retryRestore() {
  if (restoring.value) return
  restoring.value = true
  try {
    await restoreSession()
    redirectIfConfirmedGuest()
  } finally {
    restoring.value = false
  }
}

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
  <div class="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-12">
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

    <!-- 已登录账号页 -->
    <div v-else-if="currentAccount" class="w-full max-w-lg">
      <div class="card-warm rounded-xl p-8 relative overflow-hidden">
        <h1 class="sr-only">账号设置</h1>
        <header class="text-center mb-8">
          <span
            class="seal-icon w-16 h-16 text-base flex items-center justify-center mx-auto mb-4"
            aria-hidden="true"
            >玄</span
          >
          <h2 class="font-display text-2xl text-ink-dark tracking-[0.15em]">
            {{ currentAccount.nickname }}
          </h2>
          <p class="font-sans text-xs text-ink-light tracking-[0.1em] mt-1">账号状态：正常</p>
        </header>

        <!-- 账号信息 -->
        <section class="mb-8 space-y-2 font-sans text-sm text-ink-medium">
          <p>昵称不可修改：{{ currentAccount.nickname }}</p>
          <p>创建时间：{{ new Date(currentAccount.createdAt).toLocaleDateString('zh-CN') }}</p>
          <p class="text-ink-light mt-4">本人档案将在后续阶段开放。</p>
        </section>

        <!-- 错误提示 -->
        <div
          v-if="actionError"
          class="mb-6 px-4 py-2.5 rounded-lg border text-cinnabar text-sm"
          style="
            background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
            border-color: color-mix(in srgb, var(--color-cinnabar) 15%, transparent);
          "
          role="alert"
        >
          {{ actionError }}
        </div>

        <!-- 三类动作 -->
        <div class="space-y-3">
          <button
            class="btn-cin w-full"
            :disabled="actionLoading !== null"
            :aria-busy="actionLoading === 'logout'"
            @click="handleLogout"
          >
            {{ actionLoading === 'logout' ? '退出中...' : '退出当前设备' }}
          </button>
          <button
            class="btn-ink w-full"
            :disabled="actionLoading !== null"
            :aria-busy="actionLoading === 'logout-all'"
            @click="handleLogoutAll"
          >
            {{ actionLoading === 'logout-all' ? '退出中...' : '退出所有设备' }}
          </button>
          <button
            class="btn-ghost w-full"
            :disabled="actionLoading !== null"
            @click="openDeleteDialog"
          >
            注销账号
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 注销确认对话框 -->
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
          class="font-display text-xl text-ink-dark tracking-[0.15em] mb-4 text-center"
        >
          注销账号
        </h2>
        <p class="font-sans text-sm text-ink-medium leading-relaxed mb-4">
          注销将删除当前账号并使其全部会话失效，此操作不可撤销。请输入当前昵称和密码确认。
        </p>
        <div
          v-if="deleteError"
          class="mb-4 px-4 py-2.5 rounded-lg border text-cinnabar text-sm"
          style="
            background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
            border-color: color-mix(in srgb, var(--color-cinnabar) 15%, transparent);
          "
          role="alert"
        >
          {{ deleteError }}
        </div>
        <form class="space-y-4" @submit.prevent="confirmDelete">
          <div>
            <label
              for="delete-nickname"
              class="block text-xs text-ink-light tracking-[0.15em] mb-1.5"
              >当前昵称</label
            >
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
            <label
              for="delete-password"
              class="block text-xs text-ink-light tracking-[0.15em] mb-1.5"
              >当前密码</label
            >
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
          <div class="flex gap-3 pt-2">
            <button
              type="button"
              class="btn-ink flex-1"
              :disabled="deleting"
              @click="closeDeleteDialog"
            >
              取消
            </button>
            <button type="submit" class="btn-cin flex-1" :disabled="deleting" :aria-busy="deleting">
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
