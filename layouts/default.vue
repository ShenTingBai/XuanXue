<script setup lang="ts">
const { currentProfile, restoreSession, logout } = useAuth()
const router = useRouter()
const showDropdown = ref(false)
const route = useRoute()

interface NavTool {
  id: string
  name: string
  emoji: string
  route: string
  available: boolean
}

const navTools: NavTool[] = [
  { id: 'shengxiao', name: '生肖', emoji: '🐯', route: '/tools/shengxiao', available: true },
  { id: 'constellation', name: '星座', emoji: '♈', route: '/tools/constellation', available: true },
  { id: 'bazi', name: '八字', emoji: '☯', route: '/tools/bazi', available: true },
  { id: 'yijing', name: '六爻', emoji: '📜', route: '/tools/yijing', available: false },
  { id: 'ziwei', name: '紫微斗数', emoji: '⭐', route: '/tools/ziwei', available: false },
]
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

watch(() => route.path, () => {
  showDropdown.value = false
})

const handleMenuKeydown = (e: KeyboardEvent) => {
  const items = dropdownInnerRef.value?.querySelectorAll<HTMLElement>('[role="menuitem"]')
  if (!items || items.length === 0) return
  const currentIdx = Array.from(items).findIndex(item => item === document.activeElement)
  let nextIdx: number
  switch (e.key) {
    case 'ArrowDown': nextIdx = (currentIdx + 1) % items.length; break
    case 'ArrowUp': nextIdx = (currentIdx - 1 + items.length) % items.length; break
    case 'Home': nextIdx = 0; break
    case 'End': nextIdx = items.length - 1; break
    default: return
  }
  e.preventDefault()
  items.forEach((item, i) => item.setAttribute('tabindex', i === nextIdx ? '0' : '-1'))
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
        <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-paper-lightest focus:text-cinnabar focus:rounded focus:border-2 focus:border-cinnabar">
          跳转到主要内容
        </a>
        <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-14 sm:h-16">
            <!-- Logo -->
            <NuxtLink to="/" class="flex items-center gap-2 no-underline flex-shrink-0">
              <span class="font-display text-2xl sm:text-3xl text-ink-dark">玄学</span>
              <span class="seal-mark text-[10px] hidden sm:flex" aria-hidden="true">玄</span>
            </NuxtLink>

            <!-- Tool Navigation (desktop) -->
            <nav class="hidden md:flex items-center gap-0.5" aria-label="命理工具导航">
              <NuxtLink
                v-for="navItem in navTools"
                :key="navItem.id"
                :to="navItem.route"
                :class="[
                  'nav-link',
                  { 'nav-link--active': route.path === navItem.route },
                  { 'nav-link--locked': !navItem.available },
                ]"
                :tabindex="navItem.available ? 0 : -1"
                :aria-disabled="!navItem.available"
              >
                <span class="text-base" aria-hidden="true">{{ navItem.emoji }}</span>
                <span>{{ navItem.name }}</span>
                <span v-if="!navItem.available" class="text-[0.625rem] text-ink-light ml-0.5">*</span>
              </NuxtLink>
            </nav>

            <!-- Profile Section -->
            <div v-if="currentProfile" ref="dropdownRef" class="relative flex-shrink-0" @focusout="closeDropdown">
              <button
                ref="toggleRef"
                @click="showDropdown = !showDropdown"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-paper-medium/50"
                aria-haspopup="menu"
                :aria-expanded="showDropdown"
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
                    tabindex="0"
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
                    tabindex="-1"
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
      <main id="main-content">
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
