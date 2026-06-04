<script setup lang="ts">
import type { ProfileWithFlag } from '~/composables/useAuth'
import AvatarCircle from '~/components/tools/AvatarCircle.vue'
import AddProfileModal from '~/components/tools/AddProfileModal.vue'

const { currentProfile, subProfiles, loadSubProfiles, switchProfile, getAuthHeaders } = useAuth()

const showDropdown = ref(false)
const showAddModal = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const router = useRouter()

onMounted(() => {
  loadSubProfiles()
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

const profiles = computed<ProfileWithFlag[]>(() => {
  return subProfiles.value
})

async function handleSwitch(profile: ProfileWithFlag) {
  showDropdown.value = false
  if (profile.id === currentProfile.value?.id) return
  switchProfile(profile)
  // Reload the current page to reflect the new active profile
  router.go(0)
}

async function handleDelete(profile: ProfileWithFlag) {
  if (profile.isMain) return // Cannot delete main profile
  if (!confirm(`确定要删除子档案「${profile.nickname}」吗？此操作不可撤销。`)) return
  try {
    await $fetch(`/api/profiles/${profile.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    await loadSubProfiles()
  } catch {
    // Best-effort
  }
}

function handleProfileAdded() {
  showAddModal.value = false
  loadSubProfiles()
}

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}
</script>

<template>
  <div v-if="currentProfile" ref="dropdownRef" class="relative">
    <button
      @click="toggleDropdown"
      class="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors hover:bg-paper-medium/50"
      aria-haspopup="menu"
      :aria-expanded="showDropdown"
      :aria-label="'档案切换，当前：' + currentProfile.nickname"
    >
      <AvatarCircle :nickname="currentProfile.nickname" size="sm" />
      <svg aria-hidden="true"
        :class="['w-3 h-3 text-ink-light transition-transform', showDropdown && 'rotate-180']"
        viewBox="0 0 12 8"
        fill="none"
      >
        <path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>

    <!-- Dropdown menu -->
    <Transition name="dropdown">
      <div
        v-if="showDropdown"
        role="menu"
        class="dropdown-panel absolute right-0 top-full mt-2 w-56 rounded-lg overflow-hidden z-50"
      >
        <div v-for="profile in profiles" :key="profile.id" class="flex items-center gap-3 px-4 py-2.5">
          <AvatarCircle :nickname="profile.nickname" size="sm" />
          <div class="flex-1 min-w-0">
            <button
              role="menuitem"
              class="text-sm text-ink-medium hover:text-cinnabar transition-colors text-left w-full truncate"
              :class="{ 'font-medium text-cinnabar': profile.id === currentProfile?.id }"
              @click="handleSwitch(profile)"
            >
              {{ profile.nickname }}
              <span v-if="profile.id === currentProfile?.id" class="text-cinnabar text-[0.65rem] ml-1">&#10003;</span>
            </button>
            <p class="text-[0.6rem] text-ink-light/60">
              {{ profile.isMain ? '主档案' : '子档案' }}
            </p>
          </div>
          <button
            v-if="!profile.isMain"
            role="menuitem"
            @click="handleDelete(profile)"
            class="flex-shrink-0 text-ink-light hover:text-cinnabar transition-colors p-1"
            :aria-label="'删除子档案 ' + profile.nickname"
          >
            <svg aria-hidden="true" class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M13 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V4" />
            </svg>
          </button>
        </div>

        <div class="h-px bg-paper-dark mx-3" role="separator" />
        <button
          role="menuitem"
          @click="showAddModal = true; showDropdown = false"
          class="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-ink-medium hover:text-cinnabar hover:bg-cinnabar/5 transition-colors"
        >
          <svg aria-hidden="true" class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          添加档案
        </button>
        <slot name="dropdown-extra" />
      </div>
    </Transition>

    <!-- Add Profile Modal -->
    <AddProfileModal
      :show="showAddModal"
      @close="showAddModal = false"
      @added="handleProfileAdded"
    />
  </div>
</template>
