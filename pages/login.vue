<script setup lang="ts">
useHead({ title: '登录 - 玄学' })

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

onMounted(() => {
  restoreSession()
  if (currentProfile.value) {
    router.push('/')
    return
  }
  if (route.query.expired === '1') {
    expiredNote.value = '登录已过期，请重新登录'
    // Clean URL after a moment so refresh doesn't show it again
    setTimeout(() => router.replace('/login'), 100)
  }
})

const switchMode = () => {
  isLogin.value = !isLogin.value
  error.value = ''
}

const handleTabKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft' || e.key === 'Home') {
    e.preventDefault()
    isLogin.value = true
    nextTick(() => document.getElementById('tab-login')?.focus())
  } else if (e.key === 'ArrowRight' || e.key === 'End') {
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
  if (!pin.value.trim() || !/^\d{4}$/.test(pin.value)) {
    error.value = '请输入4位数字PIN'
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
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || '操作失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">
      <!-- Card -->
      <div class="card-warm rounded-xl p-8 relative overflow-hidden">
        <!-- Corner trigrams -->
        <span class="corner-mark absolute top-3 left-3 text-[1.125rem]" aria-hidden="true">☰</span>
        <span class="corner-mark absolute top-3 right-3 text-[1.125rem]" aria-hidden="true">☷</span>
        <span class="corner-mark absolute bottom-3 left-3 text-[1.125rem]" aria-hidden="true">☵</span>
        <span class="corner-mark absolute bottom-3 right-3 text-[1.125rem]" aria-hidden="true">☲</span>

        <!-- Top talisman line -->
        <div class="talisman-line mb-6" />

        <!-- Logo Area -->
        <div class="text-center mb-8">
          <h1 class="sr-only">玄·道 — 登录</h1>
          <div class="inline-flex items-center justify-center mb-4">
            <span class="seal-icon w-14 h-14 text-sm flex items-center justify-center" aria-hidden="true">玄</span>
          </div>
          <div class="section-header justify-center mb-2">
            <span class="text-lg font-display text-ink-dark tracking-[0.15em]">{{ isLogin ? '已有命卷' : '结缘立卷' }}</span>
          </div>
          <p class="font-sans text-ink-medium text-[0.75rem] tracking-[0.25em]">
            {{ isLogin ? '入卷推演 · 以窥天机' : '以道为凭 · 以问天机' }}
          </p>
        </div>

        <!-- Mode Tabs -->
        <div
          class="flex mb-7 rounded-lg bg-paper-medium/40 p-0.5 relative"
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
            aria-controls="tabpanel-auth"
            @click="isLogin = true"
            class="relative z-10 flex-1 py-2 text-sm tracking-wider transition-colors rounded-md"
            :class="isLogin ? 'text-cinnabar font-medium' : 'text-ink-light hover:text-ink-medium'"
          >
            登录
          </button>
          <button
            id="tab-register"
            role="tab"
            :aria-selected="!isLogin"
            :tabindex="!isLogin ? 0 : -1"
            aria-controls="tabpanel-auth"
            @click="isLogin = false"
            class="relative z-10 flex-1 py-2 text-sm tracking-wider transition-colors rounded-md"
            :class="!isLogin ? 'text-cinnabar font-medium' : 'text-ink-light hover:text-ink-medium'"
          >
            注册
          </button>
        </div>

        <!-- Session expired notification -->
        <Transition name="fade">
          <div
            v-if="expiredNote"
            class="mb-6 px-4 py-3 rounded-lg bg-gold/8 border border-gold/20 text-ink-dark text-sm flex items-center gap-2.5"
            role="alert"
          >
            <span class="flex-shrink-0 w-5 h-5 rounded-full bg-gold/25 flex items-center justify-center text-gold text-[10px] font-bold">!</span>
            <span>{{ expiredNote }}</span>
          </div>
        </Transition>

        <!-- Form error -->
        <Transition name="fade">
          <div
            v-if="error"
            id="login-error"
            class="mb-6 px-4 py-2.5 rounded-lg bg-cinnabar/5 border border-cinnabar/15 text-cinnabar text-sm"
            role="alert"
          >
            {{ error }}
          </div>
        </Transition>

        <!-- Form -->
        <div id="tabpanel-auth" role="tabpanel" :aria-labelledby="isLogin ? 'tab-login' : 'tab-register'">
          <form @submit.prevent="submit" novalidate class="space-y-5">
            <div>
              <label for="login-nickname" class="block text-xs text-ink-light tracking-[0.15em] mb-1.5">
                {{ isLogin ? '号令' : '道号' }}<span class="text-cinnabar ml-0.5" aria-hidden="true">*</span>
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
                  placeholder="4位数字密令"
                  maxlength="4"
                  inputmode="numeric"
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

            <button
              type="submit"
              :disabled="loading"
              class="btn-cin w-full mt-2"
              :aria-busy="loading"
            >
              <span>{{ loading ? '请稍候...' : (isLogin ? '入 卷' : '立 卷') }}</span>
            </button>
          </form>
        </div>

        <!-- Switch hint -->
        <div v-if="isLogin" class="mt-6 text-center text-xs text-ink-light/70 tracking-[0.1em]">
          尚未立卷？
          <button @click="switchMode" class="text-cinnabar hover:text-cinnabar-light transition-colors underline-offset-2 hover:underline">结缘注册</button>
        </div>
        <div v-else class="mt-6 text-center text-xs text-ink-light/70 tracking-[0.1em]">
          已有命卷？
          <button @click="switchMode" class="text-cinnabar hover:text-cinnabar-light transition-colors underline-offset-2 hover:underline">入卷登录</button>
        </div>

        <!-- Bottom talisman line -->
        <div class="talisman-line mt-6" />
      </div>
    </div>
  </div>
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
</style>
