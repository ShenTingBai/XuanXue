<script lang="ts">
interface NavTool {
  id: string
  name: string
  char: string
  route: string
  available: boolean
}

// 按使用门槛从低到高排列：快速入门 → 核心命理 → 深度推演
const navTools: NavTool[] = [
  { id: 'shengxiao', name: '生肖', char: '肖', route: '/tools/shengxiao', available: true },
  { id: 'constellation', name: '星座', char: '星', route: '/tools/constellation', available: true },
  { id: 'zeji', name: '择日', char: '择', route: '/tools/zeji', available: true },
  { id: 'bazi', name: '八字', char: '命', route: '/tools/bazi', available: true },
  { id: 'name-test', name: '姓名', char: '名', route: '/tools/name-test', available: true },
  { id: 'cezi', name: '测字', char: '测', route: '/tools/cezi', available: true },
  { id: 'guming', name: '称骨', char: '骨', route: '/tools/guming', available: true },
  { id: 'ziwei', name: '紫微斗数', char: '斗', route: '/tools/ziwei', available: true },
  { id: 'yijing', name: '六爻', char: '卦', route: '/tools/yijing', available: true },
  { id: 'hehun', name: '合婚', char: '合', route: '/tools/hehun', available: true },
  { id: 'meihua', name: '梅花', char: '梅', route: '/tools/meihua', available: true },
]
</script>

<script setup lang="ts">
import AvatarCircle from '~/components/tools/AvatarCircle.vue'
const { currentProfile, restoreSession, logout } = useAuth()
const router = useRouter()
const showMobileNav = ref(false)
const mobileNavRef = ref<HTMLElement | null>(null)
const mobileNavCloseRef = ref<HTMLElement | null>(null)
const hamburgerBtnRef = ref<HTMLElement | null>(null)
const mobileDrawerPanelRef = ref<HTMLElement | null>(null)
const route = useRoute()
const showProfileDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showProfileDropdown.value = false
  }
}

onMounted(async () => {
  await restoreSession()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

watch(
  () => route.path,
  () => {
    showMobileNav.value = false
  },
)

watch(showMobileNav, val => {
  if (val) {
    nextTick(() => {
      mobileNavCloseRef.value?.focus()
    })
  } else {
    nextTick(() => {
      hamburgerBtnRef.value?.focus()
    })
  }
})

function trapFocusForward() {
  if (mobileDrawerPanelRef.value) {
    const focusable = mobileDrawerPanelRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus()
      return
    }
  }
  mobileNavCloseRef.value?.focus()
}

function trapFocusBack() {
  mobileNavCloseRef.value?.focus()
}

// Profile dropdown menu keyboard navigation (WAI-ARIA menu pattern)
const menuActiveIndex = ref(0)

watch(showProfileDropdown, open => {
  if (open) {
    menuActiveIndex.value = 0
    nextTick(() => {
      const items = dropdownRef.value?.querySelectorAll<HTMLElement>('[role="menuitem"]')
      items?.[0]?.focus()
    })
  }
})

function handleMenuKeydown(e: KeyboardEvent) {
  const items = dropdownRef.value?.querySelectorAll<HTMLElement>('[role="menuitem"]')
  if (!items || items.length === 0) return

  let newIndex = menuActiveIndex.value

  switch (e.key) {
    case 'ArrowDown':
      newIndex = (menuActiveIndex.value + 1) % items.length
      break
    case 'ArrowUp':
      newIndex = (menuActiveIndex.value - 1 + items.length) % items.length
      break
    case 'Home':
      newIndex = 0
      break
    case 'End':
      newIndex = items.length - 1
      break
    default:
      return
  }

  menuActiveIndex.value = newIndex
  items[newIndex]?.focus()
}

const loggingOut = ref(false)

const handleLogout = async () => {
  if (loggingOut.value) return
  showMobileNav.value = false
  loggingOut.value = true
  try {
    await logout()
    router.push('/login')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="ink-wash-bg full-viewport">
    <!-- Paper texture layer -->
    <div class="relative z-10">
      <!-- Top Bar -->
      <header class="sticky top-0 z-50 backdrop-blur-md site-header border-b border-paper-dark">
        <a
          href="#main-content"
          class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-paper-lightest focus:text-cinnabar focus:rounded focus:border-2 focus:border-cinnabar"
        >
          跳转到主要内容
        </a>
        <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-14 sm:h-16">
            <!-- Logo -->
            <NuxtLink to="/" class="flex items-center gap-2 no-underline flex-shrink-0">
              <img src="/logo.svg" alt="玄·道" class="h-7 sm:h-8 w-auto" loading="eager" />
            </NuxtLink>

            <!-- Tool Navigation (desktop) -->
            <nav class="hidden md:flex items-center gap-1.5" aria-label="命理工具导航">
              <NuxtLink
                v-for="navItem in navTools.filter(t => t.available)"
                :key="navItem.id"
                :to="navItem.route"
                :class="['nav-link', { 'nav-link--active': route.path === navItem.route }]"
                :aria-current="route.path === navItem.route ? 'page' : undefined"
              >
                <span>{{ navItem.name }}</span>
              </NuxtLink>
              <span
                v-for="navItem in navTools.filter(t => !t.available)"
                :key="navItem.id"
                class="nav-link nav-link--locked"
                :aria-label="navItem.name + '（即将上线）'"
              >
                <span>{{ navItem.name }}</span>
                <span class="text-[0.6875rem] text-ink-medium ml-0.5">*</span>
              </span>
            </nav>

            <!-- Mobile Hamburger Button -->
            <button
              ref="hamburgerBtnRef"
              class="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg transition-colors hamburger-btn"
              aria-label="打开导航菜单"
              aria-haspopup="dialog"
              :aria-expanded="showMobileNav"
              @click="showMobileNav = true"
            >
              <svg
                aria-hidden="true"
                class="w-5 h-5"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <path d="M3 5h14" />
                <path d="M3 10h14" />
                <path d="M3 15h14" />
              </svg>
            </button>

            <!-- Profile Section (desktop only — mobile is in the drawer) -->
            <div v-if="currentProfile" class="hidden md:flex items-center gap-3 flex-shrink-0">
              <AvatarCircle :nickname="currentProfile.nickname" size="sm" />
              <span class="font-sans text-sm text-ink-medium">{{ currentProfile.nickname }}</span>
              <div ref="dropdownRef" class="relative">
                <button
                  class="flex items-center gap-1 px-1.5 py-1 rounded-lg dropdown-trigger transition-colors"
                  aria-haspopup="menu"
                  :aria-expanded="showProfileDropdown"
                  @click="showProfileDropdown = !showProfileDropdown"
                  @keydown.escape="showProfileDropdown = false"
                >
                  <svg
                    aria-hidden="true"
                    class="w-3.5 h-3.5 text-ink-light"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </button>
                <Transition name="dropdown">
                  <div
                    v-if="showProfileDropdown"
                    class="absolute right-0 mt-2 w-40 dropdown-panel backdrop-blur-md rounded-xl border border-paper-dark shadow-xl z-50 py-1.5"
                    role="menu"
                    @keydown.escape="showProfileDropdown = false"
                    @keydown.up.prevent="handleMenuKeydown"
                    @keydown.down.prevent="handleMenuKeydown"
                    @keydown.home.prevent="handleMenuKeydown"
                    @keydown.end.prevent="handleMenuKeydown"
                  >
                    <NuxtLink
                      :to="`/profile/${currentProfile.id}`"
                      role="menuitem"
                      :tabindex="menuActiveIndex === 0 ? '0' : '-1'"
                      class="dropdown-menu-item flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-medium hover:text-cinnabar transition-colors no-underline"
                      @click="showProfileDropdown = false"
                    >
                      <svg
                        aria-hidden="true"
                        class="w-4 h-4"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      >
                        <path d="M8 8a3 3 0 100-6 3 3 0 000 6z" />
                        <path d="M13 14c0-2.8-2.2-5-5-5S3 11.2 3 14" />
                      </svg>
                      编辑档案
                    </NuxtLink>
                    <div class="h-px bg-paper-dark mx-3" role="separator" />
                    <button
                      role="menuitem"
                      :tabindex="menuActiveIndex === 1 ? '0' : '-1'"
                      :disabled="loggingOut"
                      class="dropdown-menu-item flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-ink-medium hover:text-cinnabar transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      @click="handleLogout"
                    >
                      <svg
                        aria-hidden="true"
                        class="w-4 h-4"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      >
                        <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" />
                        <path d="M11 11l3-3-3-3" />
                        <path d="M14 8H6" />
                      </svg>
                      {{ loggingOut ? '退出中...' : '退出' }}
                    </button>
                  </div>
                </Transition>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Mobile Navigation Drawer — Scroll-inspired -->
      <Transition name="drawer">
        <div
          v-if="showMobileNav"
          ref="mobileNavRef"
          tabindex="-1"
          class="fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="导航菜单"
          @keydown.escape="showMobileNav = false"
        >
          <!-- Backdrop -->
          <div
            class="fixed inset-0 drawer-backdrop backdrop-blur-sm"
            @click="showMobileNav = false"
          />

          <!-- Top focus trap sentinel — catches Shift+Tab from close button -->
          <div tabindex="0" class="focus-trap-sentinel" @focus="trapFocusForward" />

          <!-- Drawer Panel — scroll binding left border -->
          <div
            ref="mobileDrawerPanelRef"
            class="fixed right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-paper shadow-2xl z-10 flex flex-col overflow-y-auto pb-[env(safe-area-inset-bottom)] drawer-panel"
            style="border-left: 2px solid rgba(198, 40, 40, 0.25)"
          >
            <!-- Decorative header — ink-wash top band + seal -->
            <div class="relative px-5 pt-5 pb-3">
              <!-- Ink wash accent bar -->
              <div
                class="absolute top-0 left-0 right-0 h-16"
                style="
                  background: linear-gradient(
                    180deg,
                    rgba(198, 40, 40, 0.06) 0%,
                    rgba(198, 40, 40, 0.02) 60%,
                    transparent 100%
                  );
                "
              />
              <!-- Close button — top right -->
              <div class="flex items-start justify-between relative">
                <div class="flex items-center gap-3">
                  <span
                    class="seal-mark text-base w-8 h-8 flex items-center justify-center"
                    aria-hidden="true"
                    >玄</span
                  >
                  <span class="font-display text-lg text-ink-dark tracking-[0.15em]">命理</span>
                </div>
                <button
                  ref="mobileNavCloseRef"
                  class="mobile-close-btn flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full transition-all duration-200 active:scale-95"
                  aria-label="关闭菜单"
                  @click="showMobileNav = false"
                >
                  <svg
                    aria-hidden="true"
                    class="w-4 h-4 text-ink-medium"
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
              </div>
              <!-- Subtle divider -->
              <div
                class="mt-3 h-px"
                style="
                  background: linear-gradient(
                    90deg,
                    rgba(198, 40, 40, 0.2) 0%,
                    rgba(198, 40, 40, 0.05) 60%,
                    transparent 100%
                  );
                "
              />
            </div>

            <!-- Tool Navigation -->
            <nav class="flex flex-col px-3 gap-1" aria-label="命理工具导航">
              <p
                class="px-3 pt-1 pb-1 text-xs font-sans text-ink-medium tracking-[0.12em] uppercase"
              >
                工具
              </p>
              <NuxtLink
                v-for="navItem in navTools.filter(t => t.available)"
                :key="navItem.id"
                :to="navItem.route"
                :class="[
                  'mobile-nav-item group',
                  { 'mobile-nav-item--active': route.path === navItem.route },
                ]"
                :aria-current="route.path === navItem.route ? 'page' : undefined"
                @click="showMobileNav = false"
              >
                <span class="font-sans text-sm">{{ navItem.name }}</span>
                <svg
                  aria-hidden="true"
                  class="w-3 h-3 ml-auto nav-arrow transition-colors"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                >
                  <path d="M4 2l4 4-4 4" />
                </svg>
              </NuxtLink>
              <div v-if="navTools.filter(t => !t.available).length > 0" class="mt-2">
                <p
                  class="px-3 pt-2 pb-1 text-xs font-sans text-ink-medium tracking-[0.12em] uppercase"
                >
                  即将上线
                </p>
                <span
                  v-for="navItem in navTools.filter(t => !t.available)"
                  :key="navItem.id"
                  class="mobile-nav-item mobile-nav-item--locked"
                  :aria-label="navItem.name + '（即将上线）'"
                >
                  <span class="font-sans text-sm nav-locked-text">{{ navItem.name }}</span>
                  <span class="text-[0.6875rem] text-ink-medium ml-auto">即将</span>
                </span>
              </div>
            </nav>

            <!-- Spacer -->
            <div class="flex-1" />

            <!-- Profile section — anchored at bottom -->
            <template v-if="currentProfile">
              <div
                class="mx-5 h-px"
                style="
                  background: linear-gradient(
                    90deg,
                    transparent 0%,
                    rgba(0, 0, 0, 0.06) 50%,
                    transparent 100%
                  );
                "
              />
              <div class="flex flex-col px-3 py-3 gap-1">
                <div class="flex items-center gap-3 px-3 py-2">
                  <AvatarCircle :nickname="currentProfile.nickname" size="sm" />
                  <span class="font-sans text-sm text-ink-medium">{{
                    currentProfile.nickname
                  }}</span>
                </div>
                <NuxtLink
                  :to="`/profile/${currentProfile.id}`"
                  class="mobile-nav-item !rounded-lg"
                  @click="showMobileNav = false"
                >
                  <svg
                    aria-hidden="true"
                    class="w-4 h-4 text-ink-light shrink-0"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  >
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6z" />
                    <path d="M13 14c0-2.8-2.2-5-5-5S3 11.2 3 14" />
                  </svg>
                  <span class="font-sans text-sm text-ink-medium">编辑档案</span>
                </NuxtLink>
                <button
                  :disabled="loggingOut"
                  class="mobile-nav-item !rounded-lg"
                  @click="handleLogout"
                >
                  <svg
                    aria-hidden="true"
                    class="w-4 h-4 text-ink-light shrink-0"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  >
                    <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" />
                    <path d="M11 11l3-3-3-3" />
                    <path d="M14 8H6" />
                  </svg>
                  <span class="font-sans text-sm text-ink-medium">{{
                    loggingOut ? '退出中...' : '退出'
                  }}</span>
                </button>
              </div>
            </template>

            <!-- Bottom focus trap sentinel — cycles Tab back to close button -->
            <div tabindex="0" class="focus-trap-sentinel" @focus="trapFocusBack" />
          </div>
        </div>
      </Transition>

      <!-- Page Content -->
      <main id="main-content" tabindex="-1">
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

/* Mobile nav item styles */
.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: all 0.2s ease;
  color: var(--color-ink-medium);
}
.mobile-nav-item:hover {
  background: rgba(198, 40, 40, 0.04);
  color: var(--color-cinnabar);
}
.mobile-nav-item:active {
  transform: scale(0.98);
}
.mobile-nav-item--active {
  background: rgba(198, 40, 40, 0.06);
  color: var(--color-cinnabar);
  font-weight: 500;
}
.mobile-nav-item--locked {
  cursor: default;
  opacity: 0.6;
}
.mobile-nav-item--locked:hover {
  background: transparent;
  color: var(--color-ink-medium);
}

/* Drawer transitions */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-active .drawer-panel {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-leave-active .drawer-panel {
  transition: transform 0.2s ease-in;
}
.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}

/* ── Dropdown menu item hover ── */
.dropdown-menu-item:hover {
  background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
}

/* ── Mobile drawer close button hover ── */
.mobile-close-btn:hover {
  background: color-mix(in srgb, var(--color-cinnabar) 10%, transparent);
}

/* ── Site header ── */
.site-header {
  background: color-mix(in srgb, var(--color-paper-light) 80%, transparent);
}

/* ── Hamburger button ── */
.hamburger-btn:hover {
  background: color-mix(in srgb, var(--color-paper-medium) 50%, transparent);
}

/* ── Dropdown trigger ── */
.dropdown-trigger:hover {
  background: color-mix(in srgb, var(--color-paper-medium) 50%, transparent);
}

/* ── Dropdown panel ── */
.dropdown-panel {
  background: color-mix(in srgb, var(--color-paper-lightest) 95%, transparent);
}

/* ── Mobile drawer backdrop ── */
.drawer-backdrop {
  background: color-mix(in srgb, var(--color-ink-dark) 50%, transparent);
}

/* ── Nav arrow ── */
.nav-arrow {
  color: color-mix(in srgb, var(--color-ink-medium) 80%, transparent);
}
.mobile-nav-item:hover .nav-arrow {
  color: color-mix(in srgb, var(--color-cinnabar) 40%, transparent);
}

/* ── Locked nav text ── */
.nav-locked-text {
  color: color-mix(in srgb, var(--color-ink-light) 50%, transparent);
}
</style>
