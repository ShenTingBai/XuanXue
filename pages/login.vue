<script setup lang="ts">
import PageFooter from '~/components/tools/PageFooter.vue'
useSeoMeta({
  title: '登录 — 玄·道',
  ogTitle: '登录 — 玄·道',
  description: '登录玄·道平台，创建你的个人命簿，记录和回顾每一次命理推演。',
  ogDescription: '登录玄·道平台，创建你的个人命簿，记录和回顾每一次命理推演。',
  ogType: 'website',
})

const { login, register, restoreSession, currentProfile } = useAuth()
const router = useRouter()
const route = useRoute()

const nickname = ref('')
const pin = ref('')
const error = ref('')
const expiredNote = ref('')
const loading = ref(false)
const isLogin = ref(true)
const showPin = ref(false)
const privacyConsent = ref(false)
const expiredTimer = ref<ReturnType<typeof setTimeout> | null>(null)

onMounted(async () => {
  await restoreSession()
  if (currentProfile.value) {
    router.push('/')
    return
  }
  if (route.query.expired === '1') {
    expiredNote.value = '登录已过期，请重新登录'
    // Clean URL after a moment so refresh doesn't show it again
    expiredTimer.value = setTimeout(() => router.replace('/login'), 100)
  }
})

onUnmounted(() => {
  if (expiredTimer.value) clearTimeout(expiredTimer.value)
})

const switchMode = () => {
  isLogin.value = !isLogin.value
  error.value = ''
  privacyConsent.value = false
}

const handleTabKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (isLogin.value) {
      // Wrap: login → register
      isLogin.value = false
      nextTick(() => document.getElementById('tab-register')?.focus())
    } else {
      isLogin.value = true
      nextTick(() => document.getElementById('tab-login')?.focus())
    }
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (!isLogin.value) {
      // Wrap: register → login
      isLogin.value = true
      nextTick(() => document.getElementById('tab-login')?.focus())
    } else {
      isLogin.value = false
      nextTick(() => document.getElementById('tab-register')?.focus())
    }
  } else if (e.key === 'Home') {
    e.preventDefault()
    isLogin.value = true
    nextTick(() => document.getElementById('tab-login')?.focus())
  } else if (e.key === 'End') {
    e.preventDefault()
    isLogin.value = false
    nextTick(() => document.getElementById('tab-register')?.focus())
  }
}

const submit = async () => {
  if (loading.value) return
  error.value = ''
  if (!nickname.value.trim()) {
    error.value = '请输入昵称'
    return
  }
  if (!pin.value.trim()) {
    error.value = '请输入密令'
    return
  }
  if (pin.value.trim().length < 4) {
    error.value = '密令至少需要4位'
    return
  }
  if (pin.value.trim().length > 20) {
    error.value = '密令不能超过20位'
    return
  }
  if (!isLogin.value && !/^[a-zA-Z0-9]{6,}$/.test(pin.value)) {
    error.value = '注册密令需6位以上字母或数字'
    return
  }
  if (!isLogin.value && !privacyConsent.value) {
    error.value = '请先阅读并同意隐私政策'
    return
  }

  loading.value = true
  try {
    if (isLogin.value) {
      await login(nickname.value.trim(), pin.value.trim())
      router.push('/')
    } else {
      await register(nickname.value.trim(), pin.value.trim())
      router.push(`/profile/${currentProfile.value?.id}?onboarding=true`)
    }
  } catch (e: unknown) {
    error.value =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      '登录失败，请检查网络连接后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">
      <!-- Card -->
      <div class="card-warm rounded-xl p-8 relative overflow-hidden login-card">
        <!-- Corner trigrams -->
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

        <!-- Top talisman line -->
        <div class="talisman-line mb-6" />

        <!-- Logo Area -->
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
            {{ isLogin ? '已有命卷' : '结缘立卷' }}
          </h2>
          <p class="font-sans text-ink-medium text-xs tracking-[0.25em]">
            {{ isLogin ? '入卷推演 · 以窥天机' : '以道为凭 · 以问天机' }}
          </p>
        </div>

        <!-- Mode Tabs -->
        <div
          class="flex mb-7 rounded-lg p-0.5 relative"
          :style="{ background: 'color-mix(in srgb, var(--color-paper-medium) 40%, transparent)' }"
          role="tablist"
          aria-label="登录或注册"
          @keydown="handleTabKeydown"
        >
          <span
            class="absolute top-0.5 bottom-0.5 w-1/2 rounded-md bg-paper-lightest/90 shadow-sm transition-all duration-200 ease-out"
            :class="isLogin ? 'left-0.5' : 'left-[calc(50%-0.125rem)]'"
          />
          <button
            id="tab-login"
            role="tab"
            :aria-selected="isLogin"
            :tabindex="isLogin ? 0 : -1"
            aria-controls="panel-login"
            class="relative z-10 flex-1 py-2 text-sm tracking-wider transition-colors rounded-md"
            :class="isLogin ? 'text-cinnabar font-medium' : 'text-ink-light hover:text-ink-medium'"
            @click="isLogin = true"
          >
            登录
          </button>
          <button
            id="tab-register"
            role="tab"
            :aria-selected="!isLogin"
            :tabindex="!isLogin ? 0 : -1"
            aria-controls="panel-register"
            class="relative z-10 flex-1 py-2 text-sm tracking-wider transition-colors rounded-md"
            :class="!isLogin ? 'text-cinnabar font-medium' : 'text-ink-light hover:text-ink-medium'"
            @click="isLogin = false"
          >
            注册
          </button>
        </div>

        <!-- Session expired notification -->
        <Transition name="fade">
          <div
            v-if="expiredNote"
            class="mb-6 px-4 py-3 rounded-lg border text-ink-dark text-sm flex items-center gap-2.5"
            :style="{
              background: 'color-mix(in srgb, var(--color-gold) 8%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-gold) 20%, transparent)',
            }"
            role="alert"
          >
            <span
              class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-gold text-xs font-bold"
              :style="{ background: 'color-mix(in srgb, var(--color-gold) 25%, transparent)' }"
              >!</span
            >
            <span>{{ expiredNote }}</span>
          </div>
        </Transition>

        <!-- Form error -->
        <Transition name="fade">
          <div
            v-if="error"
            id="login-error"
            class="mb-6 px-4 py-2.5 rounded-lg border text-cinnabar text-sm"
            :style="{
              background: 'color-mix(in srgb, var(--color-cinnabar) 5%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-cinnabar) 15%, transparent)',
            }"
            role="alert"
          >
            {{ error }}
          </div>
        </Transition>

        <!-- Form -->
        <div
          :id="isLogin ? 'panel-login' : 'panel-register'"
          role="tabpanel"
          :aria-labelledby="isLogin ? 'tab-login' : 'tab-register'"
        >
          <form novalidate class="space-y-5" @submit.prevent="submit">
            <div>
              <label
                for="login-nickname"
                class="block text-xs text-ink-light tracking-[0.15em] mb-1.5"
              >
                {{ isLogin ? '号令' : '道号'
                }}<span class="text-cinnabar ml-0.5" aria-hidden="true">*</span>
              </label>
              <input
                id="login-nickname"
                v-model="nickname"
                type="text"
                class="input-warm"
                :placeholder="isLogin ? '输入你的道号' : '取一道号（昵称）'"
                maxlength="20"
                autocomplete="off"
                required
                aria-required="true"
                :aria-describedby="error ? 'login-error' : undefined"
                :disabled="loading"
              />
            </div>

            <div>
              <label for="login-pin" class="block text-xs text-ink-light tracking-[0.15em] mb-1.5">
                密令<span class="text-cinnabar ml-0.5" aria-hidden="true">*</span>
              </label>
              <div class="relative">
                <input
                  id="login-pin"
                  v-model="pin"
                  :type="showPin ? 'text' : 'password'"
                  class="input-warm pr-10"
                  :placeholder="isLogin ? '输入密令' : '6位以上字母或数字'"
                  minlength="4"
                  maxlength="20"
                  autocomplete="off"
                  required
                  aria-required="true"
                  :aria-describedby="error ? 'login-error' : undefined"
                  :disabled="loading"
                />
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-2 text-xs text-ink-light hover:text-ink-medium transition-colors"
                  :aria-label="showPin ? '隐藏密令' : '显示密令'"
                  :aria-pressed="showPin"
                  @click="showPin = !showPin"
                >
                  <span v-if="showPin">隐藏</span>
                  <span v-else>显示</span>
                </button>
              </div>
            </div>

            <!-- Privacy consent (register only) -->
            <div v-if="!isLogin" class="flex items-start gap-2">
              <label class="relative flex items-start gap-2 cursor-pointer select-none">
                <input
                  v-model="privacyConsent"
                  type="checkbox"
                  class="sr-only peer"
                  required
                  aria-required="true"
                  :disabled="loading"
                />
                <span
                  class="flex-shrink-0 mt-0.5 w-4 h-4 rounded border border-ink-lighter bg-paper-lightest/80 transition-all peer-checked:bg-cinnabar peer-checked:border-cinnabar peer-focus-visible:ring-2 peer-focus-visible:ring-cinnabar/40"
                  aria-hidden="true"
                >
                  <svg
                    class="w-4 h-4 text-white opacity-0 transition-opacity"
                    :class="privacyConsent ? 'opacity-100' : 'opacity-0'"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span class="text-xs text-ink-medium leading-relaxed">
                  我已阅读并同意<NuxtLink
                    to="/privacy"
                    class="text-cinnabar hover:text-cinnabar-light underline-offset-2 hover:underline"
                    target="_blank"
                    @click.stop
                    >《隐私政策》</NuxtLink
                  >
                </span>
              </label>
            </div>

            <button
              type="submit"
              :disabled="loading || (!isLogin && !privacyConsent)"
              class="btn-cin w-full mt-2"
              :aria-busy="loading"
            >
              <span>{{ loading ? '请稍候...' : isLogin ? '入 卷' : '立 卷' }}</span>
            </button>
          </form>
        </div>

        <!-- Switch hint -->
        <div v-if="isLogin" class="mt-6 text-center text-xs text-ink-medium tracking-[0.1em]">
          尚未立卷？
          <button
            class="text-cinnabar hover:text-cinnabar-light transition-colors underline-offset-2 hover:underline"
            @click="switchMode"
            @keydown.enter="switchMode"
            @keydown.space.prevent="switchMode"
          >
            结缘注册
          </button>
        </div>
        <div v-else class="mt-6 text-center text-xs text-ink-medium tracking-[0.1em]">
          已有命卷？
          <button
            class="text-cinnabar hover:text-cinnabar-light transition-colors underline-offset-2 hover:underline"
            @click="switchMode"
            @keydown.enter="switchMode"
            @keydown.space.prevent="switchMode"
          >
            入卷登录
          </button>
        </div>
      </div>
    </div>
  </div>
  <PageFooter />
</template>

<style scoped>
/* ── Notification fade ── */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Card depth: scroll resting on desk ── */
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

/* ── Staggered entrance ── */
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

/* ── Disabled input ── */
.input-warm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-bottom-style: dashed;
}
</style>
