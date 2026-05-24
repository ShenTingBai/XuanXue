<script setup lang="ts">
const { currentProfile, restoreSession, logout } = useAuth()
const router = useRouter()
const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const dropdownInnerRef = ref<HTMLElement | null>(null)
const toggleRef = ref<HTMLElement | null>(null)

onMounted(() => {
  restoreSession()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    showDropdown.value = false
  }
}

const handleMenuKeydown = (e: KeyboardEvent) => {
  const items = dropdownInnerRef.value?.querySelectorAll<HTMLElement>('[role="menuitem"]')
  if (!items || items.length === 0) return
  const currentIdx = Array.from(items).findIndex(item => item === document.activeElement)
  let nextIdx: number
  if (e.key === 'ArrowDown') {
    nextIdx = (currentIdx + 1) % items.length
  } else if (e.key === 'ArrowUp') {
    nextIdx = (currentIdx - 1 + items.length) % items.length
  } else {
    return
  }
  e.preventDefault()
  items[nextIdx].focus()
}

const handleMenuEscape = () => {
  showDropdown.value = false
  toggleRef.value?.focus()
}

const handleLogout = async () => {
  showDropdown.value = false
  await logout()
  router.push('/login')
}

const closeDropdown = (e: FocusEvent) => {
  const el = dropdownRef.value
  if (!el) return
  if (!el.contains(e.relatedTarget as Node)) {
    showDropdown.value = false
    // Do NOT force focus back — handleClickOutside and handleMenuEscape cover the other cases
  }
}
</script>

<template>
  <div class="ink-wash-bg min-h-screen">
    <!-- Paper texture layer -->
    <div class="relative z-10">
      <!-- Top Bar -->
      <header class="sticky top-0 z-50 backdrop-blur-md bg-paper-light/80 border-b border-paper-dark">
        <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-14 sm:h-16">
            <!-- Logo -->
            <NuxtLink to="/" class="flex items-center gap-2 no-underline">
              <span class="font-display text-2xl sm:text-3xl text-ink-dark">玄学</span>
              <span class="seal-mark text-[10px] hidden sm:flex" aria-hidden="true">玄</span>
            </NuxtLink>

            <!-- Profile Section -->
            <div v-if="currentProfile" ref="dropdownRef" class="relative" @focusout="closeDropdown">
              <button
                ref="toggleRef"
                @click="showDropdown = !showDropdown"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-paper-medium/50"
                aria-haspopup="menu"
                :aria-expanded="showDropdown.toString()"
                :aria-label="'打开 ' + currentProfile.nickname + ' 的菜单'"
              >
                <span class="font-sans text-sm text-ink-medium">{{ currentProfile.nickname }}</span>
                <svg aria-hidden="true"
                  :class="['w-3.5 h-3.5 text-ink-light transition-transform', showDropdown && 'rotate-180']"
                  viewBox="0 0 12 8"
                  fill="none"
                >
                  <path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </button>

              <!-- Dropdown -->
              <Transition name="dropdown">
                <div
                  v-if="showDropdown"
                  ref="dropdownInnerRef"
                  role="menu"
                  @keydown.escape="handleMenuEscape"
                  @keydown="handleMenuKeydown"
                  class="dropdown-panel absolute right-0 top-full mt-2 w-44 rounded-lg overflow-hidden z-50"
                >
                  <NuxtLink
                    :to="`/profile/${currentProfile.id}`"
                    @click="showDropdown = false"
                    role="menuitem"
                    class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-medium hover:text-cinnabar hover:bg-cinnabar/5 transition-colors no-underline"
                  >
                    <svg aria-hidden="true" class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                      <path d="M8 8a3 3 0 100-6 3 3 0 000 6z" />
                      <path d="M13 14c0-2.8-2.2-5-5-5S3 11.2 3 14" />
                    </svg>
                    编辑档案
                  </NuxtLink>
                  <div class="h-px bg-paper-dark mx-3" role="separator" />
                  <button
                    @click="handleLogout"
                    role="menuitem"
                    class="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-ink-medium hover:text-cinnabar hover:bg-cinnabar/5 transition-colors"
                  >
                    <svg aria-hidden="true" class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                      <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" />
                      <path d="M11 11l3-3-3-3" />
                      <path d="M14 8H6" />
                    </svg>
                    退出
                  </button>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
