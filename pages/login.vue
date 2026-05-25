<script setup lang="ts">
useHead({ title: '登录 - 玄学' })

const { login, register, restoreSession, currentProfile } = useAuth()
const router = useRouter()

const nickname = ref('')
const pin = ref('')
const error = ref('')
const loading = ref(false)
const isLogin = ref(true)

onMounted(() => {
  restoreSession()
  if (currentProfile.value) {
    router.push('/')
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
    } else {
      await register(nickname.value.trim(), pin.value.trim())
    }
    router.push('/')
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || '操作失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-sm">
      <!-- Card -->
      <div class="card-paper-solid rounded-2xl p-8 sm:p-10">
        <!-- Logo Area -->
        <div class="text-center mb-8">
          <h1 class="sr-only">玄学 - 登录</h1>
          <div class="inline-flex items-center gap-3 mb-3">
            <span class="font-display text-4xl sm:text-5xl text-ink-dark">玄学</span>
            <span class="seal-mark w-8 h-8 text-xs">印</span>
          </div>
          <p class="font-sans text-ink-medium text-[0.8125rem] tracking-[0.2em]">
            {{ isLogin ? '命理推演 · 知己知天' : '结缘立卷 · 以窥天机' }}
          </p>
        </div>

        <!-- Mode Tabs -->
        <div
          class="flex mb-7 border-b border-paper-dark relative"
          role="tablist"
          aria-label="登录或注册"
          @keydown="handleTabKeydown"
        >
          <button
            id="tab-login"
            role="tab"
            :aria-selected="isLogin"
            :tabindex="isLogin ? 0 : -1"
            aria-controls="tabpanel-auth"
            @click="isLogin = true"
            :class="[
              'flex-1 pb-2.5 text-sm tracking-wider transition-colors',
              isLogin
                ? 'text-cinnabar font-medium'
                : 'text-ink-medium hover:text-ink-dark'
            ]"
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
            :class="[
              'flex-1 pb-2.5 text-sm tracking-wider transition-colors',
              !isLogin
                ? 'text-cinnabar font-medium'
                : 'text-ink-medium hover:text-ink-dark'
            ]"
          >
            注册
          </button>
          <!-- Sliding indicator -->
          <span
            class="absolute bottom-0 w-1/2 h-0.5 bg-cinnabar rounded-full transition-all duration-200 ease-out"
            :class="isLogin ? 'translate-x-0' : 'translate-x-full'"
          />
        </div>

        <!-- Error -->
        <Transition name="fade">
          <div
            v-if="error"
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
              <label for="login-nickname" class="block text-xs text-ink-medium tracking-wider mb-1.5">昵称</label>
              <input
                id="login-nickname"
                v-model="nickname"
                type="text"
                class="input-ink"
                placeholder="输入你的昵称"
                maxlength="20"
                autocomplete="off"
                :disabled="loading"
              />
            </div>

            <div>
              <label for="login-pin" class="block text-xs text-ink-medium tracking-wider mb-1.5">PIN 码</label>
              <input
                id="login-pin"
                v-model="pin"
                type="password"
                class="input-ink"
                placeholder="4位数字密码"
                maxlength="4"
                inputmode="numeric"
                autocomplete="off"
                :disabled="loading"
              />
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="btn-seal w-full mt-2"
              :aria-busy="loading"
            >
              <span>{{ loading ? '请稍候...' : (isLogin ? '登 录' : '创 建') }}</span>
            </button>
          </form>
        </div>

        <!-- Switch hint -->
        <div v-if="isLogin" class="mt-6 text-center text-xs text-ink-medium">
          还没有档案？
          <button @click="switchMode" class="text-cinnabar hover:underline">创建新档案</button>
        </div>
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
