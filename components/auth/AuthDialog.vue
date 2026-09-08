<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import AuthForm from './AuthForm.vue'

const props = defineProps<{
  show: boolean
  initialMode?: 'login' | 'register'
}>()

const emit = defineEmits<{
  close: []
  authenticated: []
}>()

const mode = ref<'login' | 'register'>(props.initialMode ?? 'login')
const dialogRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

// 记录打开前的触发按钮，关闭后焦点返回。初始 show=true 时没有真实的外部触发按钮，记录为空即可。
// 用 typeof document 判断而非 import.meta.client：普通 Vite 测试环境不注入该标志，
// 但同样需要真实执行焦点记录；SSR 期 document 不存在时保持 null，语义与原判断一致。
function rememberTrigger() {
  triggerRef.value =
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
}

watch(
  () => props.show,
  open => {
    if (open) {
      mode.value = props.initialMode ?? 'login'
      rememberTrigger()
      nextTick(() => {
        titleRef.value?.focus()
      })
    } else {
      // 关闭后仅在存在已记录触发元素时返回焦点
      nextTick(() => {
        triggerRef.value?.focus()
      })
    }
  },
  { immediate: true },
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }
  if (e.key !== 'Tab') return
  // Tab/Shift+Tab 约束在弹层内
  if (!dialogRef.value) return
  const focusable = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(el => !el.hasAttribute('disabled'))
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  // 初始焦点在 tabindex=-1 的标题上：Shift+Tab 回到最后一个可聚焦元素，Tab 进入第一个。
  if (document.activeElement === titleRef.value) {
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

function onAuthenticated() {
  emit('authenticated')
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="auth-dialog-wrap" role="presentation" @keydown="onKeydown">
      <!-- 背板 -->
      <div class="auth-dialog-backdrop" aria-hidden="true" @click="emit('close')" />

      <!-- 弹层 -->
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        class="auth-dialog-panel"
      >
        <h2
          id="auth-dialog-title"
          ref="titleRef"
          tabindex="-1"
          class="font-display text-xl text-ink-dark tracking-[0.15em] mb-6 text-center"
        >
          {{ mode === 'login' ? '登录' : '注册' }}
        </h2>
        <button
          type="button"
          class="absolute top-3 right-3 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full text-ink-medium hover:text-cinnabar transition-colors"
          aria-label="关闭"
          @click="emit('close')"
        >
          <svg
            aria-hidden="true"
            class="w-4 h-4"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          >
            <path d="M5 5l10 10" />
            <path d="M15 5l-10 10" />
          </svg>
        </button>
        <AuthForm
          :mode="mode"
          @authenticated="onAuthenticated"
          @switch-mode="mode = mode === 'login' ? 'register' : 'login'"
        />
      </div>
    </div>
  </Teleport>
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
