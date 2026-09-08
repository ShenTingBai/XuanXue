<script setup lang="ts">
import { ref } from 'vue'
import {
  CURRENT_PRIVACY_POLICY_VERSION,
  CURRENT_SERVICE_TERMS_VERSION,
} from '~/constants/account-policy'

const props = defineProps<{
  mode: 'login' | 'register'
}>()

const emit = defineEmits<{
  authenticated: []
  switchMode: []
}>()

const { login, register } = useAuth()

const nickname = ref('')
const password = ref('')
const confirmPassword = ref('')
const ageConfirmed = ref(false)
const privacyConfirmed = ref(false)
const termsConfirmed = ref(false)
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

// 密码首尾字符保留：确认密码只用于注册，不回显明文
function validatePassword(value: string): string | null {
  if (value.length < 8) return '密码至少需要8个字符'
  if (value.length > 64) return '密码不能超过64个字符'
  return null
}

const submit = async () => {
  if (loading.value) return
  error.value = ''

  const nicknameValue = nickname.value.trim()
  if (nicknameValue.length < 2 || nicknameValue.length > 20) {
    error.value = '昵称长度需为2-20个字符'
    return
  }
  const passwordError = validatePassword(password.value)
  if (passwordError) {
    error.value = passwordError
    return
  }
  if (props.mode === 'register') {
    if (password.value !== confirmPassword.value) {
      error.value = '两次输入的密码不一致'
      return
    }
    if (!ageConfirmed.value) {
      error.value = '请确认已满十四周岁'
      return
    }
    if (!privacyConfirmed.value || !termsConfirmed.value) {
      error.value = '请阅读并同意隐私政策与服务规则'
      return
    }
  }

  loading.value = true
  try {
    if (props.mode === 'login') {
      await login(nicknameValue, password.value)
    } else {
      await register(
        nicknameValue,
        password.value,
        true,
        CURRENT_PRIVACY_POLICY_VERSION,
        CURRENT_SERVICE_TERMS_VERSION,
      )
    }
    emit('authenticated')
  } catch (e: unknown) {
    error.value =
      (e as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      (props.mode === 'login' ? '登录失败，请检查网络连接后重试' : '注册失败，请稍后再试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form novalidate class="space-y-5" @submit.prevent="submit">
    <!-- 昵称 -->
    <div>
      <label for="auth-nickname" class="block text-xs text-ink-light tracking-[0.15em] mb-1.5">
        昵称<span class="text-cinnabar ml-0.5" aria-hidden="true">*</span>
      </label>
      <input
        id="auth-nickname"
        v-model="nickname"
        type="text"
        class="input-warm"
        :placeholder="mode === 'login' ? '输入你的昵称' : '取一个昵称（2-20字）'"
        maxlength="20"
        autocomplete="username"
        required
        aria-required="true"
        :aria-describedby="error ? 'auth-error' : undefined"
        :disabled="loading"
      />
    </div>

    <!-- 密码 -->
    <div>
      <label for="auth-password" class="block text-xs text-ink-light tracking-[0.15em] mb-1.5">
        密码<span class="text-cinnabar ml-0.5" aria-hidden="true">*</span>
      </label>
      <div class="relative">
        <input
          id="auth-password"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          class="input-warm pr-10"
          :placeholder="mode === 'login' ? '输入密码' : '8-64个字符'"
          :minlength="8"
          :maxlength="64"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          required
          aria-required="true"
          :aria-describedby="error ? 'auth-error' : undefined"
          :disabled="loading"
        />
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-2 text-xs text-ink-light hover:text-ink-medium transition-colors"
          :aria-label="showPassword ? '隐藏密码' : '显示密码'"
          :aria-pressed="showPassword"
          @click="showPassword = !showPassword"
        >
          <span>{{ showPassword ? '隐藏' : '显示' }}</span>
        </button>
      </div>
    </div>

    <!-- 密码确认（仅注册） -->
    <div v-if="mode === 'register'">
      <label
        for="auth-confirm-password"
        class="block text-xs text-ink-light tracking-[0.15em] mb-1.5"
      >
        确认密码<span class="text-cinnabar ml-0.5" aria-hidden="true">*</span>
      </label>
      <input
        id="auth-confirm-password"
        v-model="confirmPassword"
        type="password"
        class="input-warm"
        :minlength="8"
        :maxlength="64"
        autocomplete="new-password"
        required
        aria-required="true"
        :disabled="loading"
      />
    </div>

    <!-- 注册：年龄与规则确认 -->
    <div v-if="mode === 'register'" class="space-y-3">
      <label class="flex items-start gap-2 cursor-pointer select-none">
        <input
          v-model="ageConfirmed"
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
            :class="ageConfirmed ? 'opacity-100' : 'opacity-0'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="3"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span class="text-xs text-ink-medium leading-relaxed">我已年满十四周岁</span>
      </label>

      <label class="flex items-start gap-2 cursor-pointer select-none">
        <input
          v-model="privacyConfirmed"
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
            :class="privacyConfirmed ? 'opacity-100' : 'opacity-0'"
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

      <label class="flex items-start gap-2 cursor-pointer select-none">
        <input
          v-model="termsConfirmed"
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
            :class="termsConfirmed ? 'opacity-100' : 'opacity-0'"
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
            to="/terms"
            class="text-cinnabar hover:text-cinnabar-light underline-offset-2 hover:underline"
            target="_blank"
            @click.stop
            >《服务规则》</NuxtLink
          >
        </span>
      </label>
    </div>

    <!-- 错误提示 -->
    <Transition name="fade">
      <div
        v-if="error"
        id="auth-error"
        class="px-4 py-2.5 rounded-lg border text-cinnabar text-sm"
        style="
          background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
          border-color: color-mix(in srgb, var(--color-cinnabar) 15%, transparent);
        "
        role="alert"
      >
        {{ error }}
      </div>
    </Transition>

    <!-- 提交 -->
    <button type="submit" :disabled="loading" class="btn-cin w-full mt-2" :aria-busy="loading">
      <span>{{ loading ? '请稍候...' : mode === 'login' ? '登 录' : '注 册' }}</span>
    </button>

    <!-- 切换模式 -->
    <div class="mt-4 text-center text-xs text-ink-medium tracking-[0.1em]">
      <span>{{ mode === 'login' ? '尚未有账号？' : '已有账号？' }}</span>
      <button
        type="button"
        class="ml-1 text-cinnabar hover:text-cinnabar-light transition-colors underline-offset-2 hover:underline"
        @click="emit('switchMode')"
      >
        {{ mode === 'login' ? '立即注册' : '返回登录' }}
      </button>
    </div>
  </form>
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
.input-warm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-bottom-style: dashed;
}
</style>
