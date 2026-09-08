<script setup lang="ts">
import PageFooter from '~/components/tools/PageFooter.vue'
import AuthForm from '~/components/auth/AuthForm.vue'

useSeoMeta({
  title: '登录 — 玄·道',
  ogTitle: '登录 — 玄·道',
  description: '传统文化自我探索。',
  ogDescription: '传统文化自我探索。',
  ogType: 'website',
})

const { authStatus, currentAccount, restoreSession, restoreError } = useAuth()
const router = useRouter()
const route = useRoute()

const expiredNote = ref('')
const mode = ref<'login' | 'register'>('login')
const expiredTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const restoring = ref(false)

onMounted(async () => {
  await restoreSession()
  if (authStatus.value === 'authenticated' && currentAccount.value) {
    router.replace('/account')
    return
  }
  if (route.query.expired === '1') {
    expiredNote.value = '登录已过期，请重新登录'
    expiredTimer.value = setTimeout(() => router.replace('/login'), 100)
  }
})

onUnmounted(() => {
  if (expiredTimer.value) clearTimeout(expiredTimer.value)
})

function onAuthenticated() {
  router.replace('/account')
}

// 网络恢复失败：显式重试；成功 replace /account，仍失败留在登录页。
async function retryRestore() {
  if (restoring.value) return
  restoring.value = true
  try {
    await restoreSession()
    if (authStatus.value === 'authenticated' && currentAccount.value) {
      router.replace('/account')
    }
  } finally {
    restoring.value = false
  }
}
</script>

<template>
  <div
    class="min-h-[calc(100dvh-4rem)] min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12"
  >
    <!-- 恢复中稳定占位 -->
    <div v-if="authStatus === 'restoring'" class="text-center">
      <p class="font-sans text-sm text-ink-medium tracking-[0.1em]">正在确认登录状态…</p>
    </div>

    <div v-else class="w-full max-w-sm">
      <div class="card-warm rounded-xl p-8 relative overflow-hidden login-card">
        <!-- 角标与顶部符线，沿用墨韵视觉 -->
        <span class="corner-mark absolute top-3 left-3 text-[1.125rem]" aria-hidden="true">☰</span>
        <span class="corner-mark absolute top-3 right-3 text-[1.125rem]" aria-hidden="true"
          >☷</span
        >
        <span class="corner-mark absolute bottom-3 left-3 text-[1.125rem]" aria-hidden="true"
          >☵</span
        >
        <span class="corner-mark absolute bottom-3 right-3 text-[1.125rem]" aria-hidden="true"
          >☲</span
        >
        <div class="talisman-line mb-6" />

        <div class="text-center mb-8">
          <h1 class="sr-only">玄·道 — 登录</h1>
          <div class="inline-flex items-center justify-center mb-4">
            <span
              class="seal-icon w-16 h-16 text-base flex items-center justify-center"
              aria-hidden="true"
              >玄</span
            >
          </div>
          <h2 class="text-xl font-display text-ink-dark tracking-[0.15em] mb-2">
            {{ mode === 'login' ? '登录' : '注册' }}
          </h2>
          <p class="font-sans text-xs text-ink-medium tracking-[0.25em]">传统文化自我探索</p>
        </div>

        <!-- 会话过期提示 -->
        <Transition name="fade">
          <div
            v-if="expiredNote"
            class="mb-6 px-4 py-3 rounded-lg border text-ink-dark text-sm flex items-center gap-2.5"
            style="
              background: color-mix(in srgb, var(--color-gold) 8%, transparent);
              border-color: color-mix(in srgb, var(--color-gold) 20%, transparent);
            "
            role="alert"
          >
            <span
              class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-gold text-xs font-bold"
              style="background: color-mix(in srgb, var(--color-gold) 25%, transparent)"
              >!</span
            >
            <span>{{ expiredNote }}</span>
          </div>
        </Transition>

        <!-- 网络恢复失败：可见错误 + 重试入口（401 正常游客态不显示） -->
        <Transition name="fade">
          <div
            v-if="restoreError"
            class="mb-6 px-4 py-3 rounded-lg border text-cinnabar text-sm flex items-center gap-2.5"
            style="
              background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
              border-color: color-mix(in srgb, var(--color-cinnabar) 15%, transparent);
            "
            role="alert"
          >
            <span
              class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-cinnabar text-xs font-bold"
              style="background: color-mix(in srgb, var(--color-cinnabar) 15%, transparent)"
              >!</span
            >
            <span class="flex-1">{{ restoreError }}</span>
            <button
              type="button"
              class="text-cinnabar hover:text-cinnabar-light transition-colors underline-offset-2 hover:underline flex-shrink-0"
              :disabled="restoring"
              @click="retryRestore"
            >
              {{ restoring ? '确认中...' : '重新确认登录状态' }}
            </button>
          </div>
        </Transition>

        <AuthForm
          :mode="mode"
          @authenticated="onAuthenticated"
          @switch-mode="mode = mode === 'login' ? 'register' : 'login'"
        />
      </div>
    </div>
  </div>
  <PageFooter />
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.login-card {
  box-shadow:
    0 2px 8px color-mix(in srgb, #2c1a0e 6%, transparent),
    0 8px 32px color-mix(in srgb, #2c1a0e 8%, transparent),
    0 1px 0 color-mix(in srgb, #2c1a0e 4%, transparent) inset;
  animation: card-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.login-card .talisman-line {
  animation: rule-extend 0.6s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.login-card .seal-icon {
  animation: seal-stamp 0.5s 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes rule-extend {
  from {
    transform: scaleX(0);
    opacity: 0;
  }
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}
@keyframes seal-stamp {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .login-card,
  .login-card .talisman-line,
  .login-card .seal-icon {
    animation: none;
  }
}
</style>
