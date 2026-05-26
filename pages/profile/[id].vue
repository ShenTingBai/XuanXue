<script setup lang="ts">
import type { Profile } from '~/composables/useAuth'
import InkDivider from '~/components/tools/InkDivider.vue'

interface ProfileUpdateBody {
  gender: string | null
  birth_date: string | null
  birth_calendar: 'solar' | 'lunar' | null
  birth_hour: number | null
  birth_minute: number | null
}

useHead({ title: '编辑档案 - 玄学' })

const { restoreSession, currentProfile, getAuthHeaders, updateProfile } = useAuth()
const router = useRouter()
const route = useRoute()

const nickname = ref('')
const gender = ref<string | null>(null)
const birthDate = ref('')
const birthCalendar = ref<'solar' | 'lunar' | null>(null)
const birthHour = ref<number | null>(null)
const birthMinuteStr = ref('')
const saving = ref(false)
const success = ref(false)
const error = ref('')
const maxDate = computed(() => new Date().toISOString().split('T')[0])
const minYear = 1920
const isOnboarding = computed(() => route.query.onboarding === 'true')
let successTimeout: ReturnType<typeof setTimeout> | null = null

// Initial values for dirty detection
const initialValues = ref({
  gender: null as string | null,
  birthDate: '',
  birthCalendar: null as 'solar' | 'lunar' | null,
  birthHour: null as number | null,
  birthMinuteStr: '',
})

const isDirty = computed(() => {
  return (
    gender.value !== initialValues.value.gender ||
    birthDate.value !== initialValues.value.birthDate ||
    birthCalendar.value !== initialValues.value.birthCalendar ||
    birthHour.value !== initialValues.value.birthHour ||
    birthMinuteStr.value !== initialValues.value.birthMinuteStr
  )
})

// Unsaved changes warning
function beforeUnloadHandler(e: BeforeUnloadEvent) {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave((_to, _from, next) => {
  if (isDirty.value) {
    const leave = window.confirm('你有未保存的更改，确定要离开吗？')
    if (!leave) {
      next(false)
      return
    }
  }
  next()
})

onUnmounted(() => {
  if (successTimeout) clearTimeout(successTimeout)
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})

// Hour period options (时辰)
const hourOptions = [
  { label: '子时 (23:00-00:59)', value: 23 },
  { label: '丑时 (01:00-02:59)', value: 1 },
  { label: '寅时 (03:00-04:59)', value: 3 },
  { label: '卯时 (05:00-06:59)', value: 5 },
  { label: '辰时 (07:00-08:59)', value: 7 },
  { label: '巳时 (09:00-10:59)', value: 9 },
  { label: '午时 (11:00-12:59)', value: 11 },
  { label: '未时 (13:00-14:59)', value: 13 },
  { label: '申时 (15:00-16:59)', value: 15 },
  { label: '酉时 (17:00-18:59)', value: 17 },
  { label: '戌时 (19:00-20:59)', value: 19 },
  { label: '亥时 (21:00-22:59)', value: 21 },
]

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }
  // Verify route param matches current profile
  const profileId = Number(route.params.id)
  if (isNaN(profileId) || profileId !== currentProfile.value.id) {
    router.push('/')
    return
  }
  // Populate form
  const p = currentProfile.value
  nickname.value = p.nickname
  gender.value = p.gender ?? null
  birthDate.value = p.birth_date ?? ''
  birthCalendar.value = p.birth_calendar ?? null
  birthHour.value = p.birth_hour ?? null
  const bm = p.birth_minute
  birthMinuteStr.value = bm != null && !isNaN(bm) ? String(bm) : ''

  // Store initial values for dirty detection
  initialValues.value = {
    gender: gender.value,
    birthDate: birthDate.value,
    birthCalendar: birthCalendar.value,
    birthHour: birthHour.value,
    birthMinuteStr: birthMinuteStr.value,
  }

  window.addEventListener('beforeunload', beforeUnloadHandler)

  // Clear onboarding query param to prevent banner on refresh
  if (isOnboarding.value) {
    const { onboarding, ...rest } = route.query
    router.replace({ query: rest })
  }
})

function goBack() {
  const redirect = route.query.redirect as string | undefined
  if (redirect) {
    router.push(redirect)
  } else if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const saveProfile = async () => {
  if (!currentProfile.value) {
    error.value = '未登录，无法保存'
    return
  }
  if (saving.value) return
  error.value = ''
  success.value = false
  saving.value = true

  // Validate birth date year range
  if (birthDate.value) {
    const yearMatch = birthDate.value.match(/^(\d{4})-/)
    if (yearMatch) {
      const year = Number(yearMatch[1])
      const currentYear = new Date().getFullYear()
      if (year < minYear || year > currentYear) {
        error.value = `出生年份应在 ${minYear} 年至 ${currentYear} 年之间`
        saving.value = false
        return
      }
    }
  }

  try {
    const body: ProfileUpdateBody = {
      gender: null,
      birth_date: null,
      birth_calendar: null,
      birth_hour: null,
      birth_minute: null,
    }
    body.gender = gender.value ?? null
    body.birth_date = birthDate.value || null
    body.birth_calendar = birthCalendar.value
    body.birth_hour = birthHour.value ?? null
    if (birthMinuteStr.value !== '') {
      const num = Number(birthMinuteStr.value)
      if (!isNaN(num) && Number.isInteger(num) && num >= 0 && num <= 59) {
        body.birth_minute = num
      } else {
        error.value = '分钟值必须在 0-59 之间'
        saving.value = false
        return
      }
    } else {
      body.birth_minute = null
    }

    const updated = await $fetch<Profile>(`/api/profiles/${currentProfile.value.id}`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body,
    })

    // Sync session & shared state
    updateProfile(updated)
    // Rebind form refs from fresh response
    nickname.value = updated.nickname
    gender.value = updated.gender ?? null
    birthDate.value = updated.birth_date ?? ''
    birthCalendar.value = updated.birth_calendar ?? null
    birthHour.value = updated.birth_hour ?? null
    const min = updated.birth_minute
    birthMinuteStr.value = min != null && !isNaN(min) ? String(min) : ''

    // Reset dirty state after save
    initialValues.value = {
      gender: gender.value,
      birthDate: birthDate.value,
      birthCalendar: birthCalendar.value,
      birthHour: birthHour.value,
      birthMinuteStr: birthMinuteStr.value,
    }

    success.value = true
    if (successTimeout) clearTimeout(successTimeout)
    successTimeout = setTimeout(() => { success.value = false }, 2500)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || e?.message || '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
    <!-- Back link -->
    <button
      @click="goBack"
      @keydown.enter="goBack"
      @keydown.space.prevent="goBack"
      class="inline-flex items-center gap-1.5 text-sm text-ink-medium hover:text-cinnabar transition-colors mb-8"
    >
      <svg aria-hidden="true" class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <path d="M10 12l-4-4 4-4" />
      </svg>
      返回
    </button>

    <!-- Onboarding hint -->
    <div
      v-if="isOnboarding"
      class="mb-6 px-4 py-3 rounded-lg bg-cinnabar/5 border border-cinnabar/20"
    >
      <p class="font-sans text-sm text-cinnabar">
        填写出生信息后即可开始命理推演
      </p>
    </div>

    <!-- Title -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-2">
        <h1 class="font-display text-3xl text-ink-dark">编辑档案</h1>
        <span class="seal-mark w-7 h-7 text-[9px]" aria-hidden="true">编</span>
      </div>
      <p class="text-sm text-ink-medium tracking-wider">完善个人信息，解锁更多命理推演</p>
    </div>

    <!-- Success toast -->
    <Transition name="toast">
      <div
        v-if="success"
        role="status"
        class="mb-6 px-4 py-2.5 rounded-lg bg-jade/10 border border-jade/20 text-jade text-sm flex items-center gap-2"
      >
        <svg aria-hidden="true" class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M3 8l3 3 7-7" />
        </svg>
        档案已更新
      </div>
    </Transition>

    <!-- Onboarding CTA -->
    <NuxtLink
      v-if="isOnboarding && success"
      to="/tools/bazi"
      class="btn-seal inline-flex mb-6"
    >
      <span>开始体验</span>
    </NuxtLink>

    <!-- Error -->
    <Transition name="toast">
      <div
        v-if="error"
        class="mb-6 px-4 py-2.5 rounded-lg bg-cinnabar/5 border border-cinnabar/15 text-cinnabar text-sm"
        role="alert"
      >
        {{ error }}
      </div>
    </Transition>

    <!-- Form -->
    <div class="card-paper-solid rounded-xl p-8">
      <form @submit.prevent="saveProfile" novalidate class="space-y-7">

        <!-- Section: 基本信息 -->
        <section>
          <InkDivider class="mb-5">基本信息</InkDivider>
          <div class="space-y-5">
            <!-- Nickname (read-only) -->
            <div>
              <label for="profile-nickname" class="block text-xs text-ink-medium tracking-wider mb-1.5">昵称</label>
              <input
                id="profile-nickname"
                :value="nickname"
                type="text"
                class="input-ink input-ink--readonly"
                readonly
              />
            </div>

            <!-- Gender -->
            <div>
              <label class="block text-xs text-ink-medium tracking-wider mb-2">性别</label>
              <div class="flex gap-4" role="radiogroup" aria-label="性别">
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input v-model="gender" type="radio" :value="''" class="sr-only" />
                  <span class="w-4 h-4 rounded-full border-2 border-ink-faint flex items-center justify-center transition-colors duration-200 group-hover:border-cinnabar"><span v-if="!gender" class="w-2 h-2 rounded-full bg-ink-faint transition-colors duration-200"></span></span>
                  <span class="text-sm text-ink-medium">未设置</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input
                    v-model="gender"
                    type="radio"
                    value="男"
                    class="sr-only"
                  />
                  <span
                    :class="[
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                      gender === '男' ? 'border-cinnabar' : 'border-ink-faint group-hover:border-ink-light'
                    ]"
                    aria-hidden="true"
                  >
                    <span v-if="gender === '男'" class="w-2 h-2 rounded-full bg-cinnabar" />
                  </span>
                  <span class="text-sm text-ink-medium">男</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input
                    v-model="gender"
                    type="radio"
                    value="女"
                    class="sr-only"
                  />
                  <span
                    :class="[
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                      gender === '女' ? 'border-cinnabar' : 'border-ink-faint group-hover:border-ink-light'
                    ]"
                    aria-hidden="true"
                  >
                    <span v-if="gender === '女'" class="w-2 h-2 rounded-full bg-cinnabar" />
                  </span>
                  <span class="text-sm text-ink-medium">女</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- Section: 出生信息 -->
        <section>
          <InkDivider class="mb-5">出生信息</InkDivider>
          <div class="space-y-5">
            <!-- Birth date -->
            <div>
              <label for="profile-birth-date" class="block text-xs text-ink-medium tracking-wider mb-1.5">出生日期</label>
              <div class="flex flex-col sm:flex-row gap-3">
                <input
                  id="profile-birth-date"
                  v-model="birthDate"
                  type="date"
                  min="1920-01-01"
                  :max="maxDate"
                  class="input-ink flex-1"
                />
                <label for="profile-birth-calendar" class="sr-only">历法</label>
                <select
                  id="profile-birth-calendar"
                  v-model="birthCalendar"
                  class="select-ink sm:w-24 text-center"
                >
                  <option :value="null">— 未知 —</option>
                  <option value="solar">阳历</option>
                  <option value="lunar">农历</option>
                </select>
              </div>
            </div>

            <!-- Birth time -->
            <div>
              <label for="profile-birth-hour" class="block text-xs text-ink-medium tracking-wider mb-1.5">出生时辰</label>
              <p class="text-xs text-ink-light mb-2">如果不确定时辰，请输入大致出生时间</p>
              <div class="flex flex-col sm:flex-row gap-3">
                <select
                  id="profile-birth-hour"
                  v-model="birthHour"
                  class="select-ink flex-1"
                >
                  <option :value="null">— 未知 —</option>
                  <option v-for="opt in hourOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <label for="profile-birth-minute" class="sr-only">分钟</label>
                <input
                  id="profile-birth-minute"
                  v-model="birthMinuteStr"
                  type="number"
                  min="0"
                  max="59"
                  class="input-ink input-ink--no-spinner sm:w-20 text-center"
                  placeholder="分"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Submit -->
        <div class="flex items-center gap-4 pt-2">
          <button
            type="submit"
            :disabled="saving"
            class="btn-seal px-10"
            :aria-busy="saving"
          >
            <span>{{ saving ? '保存中...' : '保存' }}</span>
          </button>
          <button
            type="button"
            @click="goBack"
            @keydown.enter="goBack"
            @keydown.space.prevent="goBack"
            class="btn-ghost"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
