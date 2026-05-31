<script setup lang="ts">
import type { Profile } from '~/composables/useAuth'

interface ProfileUpdateBody {
  gender: string | null
  birth_date: string | null
  birth_calendar: 'solar' | 'lunar' | null
  birth_hour: number | null
  birth_minute: number | null
}

useHead({ title: '命簿 - 玄·道' })

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
const redirectPath = computed(() => (route.query.redirect as string) || (route.query.from as string) || '')
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
    const leave = window.confirm('命簿尚未保存，确定要离开吗？')
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
    const normalizedGender = gender.value === '' ? null : gender.value
    body.gender = normalizedGender
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
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen relative ink-wash-bg">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10">

      <!-- ═══ Back link ═══ -->
      <button
        @click="goBack"
        @keydown.enter="goBack"
        @keydown.space.prevent="goBack"
        class="btn-ink mb-10"
      >
        <svg aria-hidden="true" class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M10 12l-4-4 4-4" />
        </svg>
        返回
      </button>

      <!-- ═══ Hero ═══ -->
      <div class="flex items-start gap-5 mb-12 anim-rise">
        <span class="seal-icon seal-icon--lg flex-shrink-0 mt-1" aria-hidden="true">簿</span>
        <div>
          <h1 class="font-display text-4xl sm:text-5xl text-ink-dark leading-tight mb-3">
            命簿
          </h1>
          <p class="text-sm text-ink-medium tracking-wider leading-relaxed">
            完善身世信息，以候天机推演
          </p>
        </div>
      </div>

      <!-- ═══ Onboarding hint ═══ -->
      <Transition name="toast">
        <div
          v-if="isOnboarding"
          class="card-warm rounded-xl p-5 mb-8 flex items-start gap-4 anim-rise"
        >
          <span class="seal-icon text-[10px] w-7 h-7 flex-shrink-0" aria-hidden="true">启</span>
          <p class="text-sm text-ink leading-relaxed">
            填写出生信息后即可开始命理推演
          </p>
        </div>
      </Transition>

      <!-- ═══ Success toast ═══ -->
      <Transition name="toast">
        <div
          v-if="success"
          role="status"
          class="card-warm rounded-xl p-4 mb-8 flex items-center gap-3 border border-jade/20"
        >
          <svg aria-hidden="true" class="w-5 h-5 text-jade flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 8l3 3 7-7" />
          </svg>
          <span class="text-sm text-jade">命簿已更新</span>
        </div>
      </Transition>

      <!-- ═══ Onboarding / redirect CTAs ═══ -->
      <div v-if="success" class="mb-8 flex gap-4 anim-rise">
        <NuxtLink
          v-if="isOnboarding"
          to="/tools/bazi"
          class="btn-cin"
        >
          开始体验
        </NuxtLink>
        <NuxtLink
          v-if="redirectPath && success && !isOnboarding"
          :to="redirectPath"
          class="btn-cin"
        >
          返回命理工具
        </NuxtLink>
      </div>

      <!-- ═══ Error alert ═══ -->
      <Transition name="toast">
        <div
          v-if="error"
          class="card-warm rounded-xl p-4 mb-8 flex items-center gap-3 border border-cinnabar/15"
          role="alert"
        >
          <svg aria-hidden="true" class="w-5 h-5 text-cinnabar flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3" /><path d="M8 10.5v.5" />
          </svg>
          <span class="text-sm text-cinnabar">{{ error }}</span>
        </div>
      </Transition>

      <!-- ═══ Form card ═══ -->
      <div class="card-warm card-warm--elevated rounded-xl p-6 sm:p-8 anim-rise anim-delay-1">
        <form @submit.prevent="saveProfile" novalidate class="space-y-10">

          <!-- ──── Section: 基本信息 ──── -->
          <section>
            <div class="section-header section-header--tool-light">
              <span class="bar" aria-hidden="true"></span>
              <span class="seal-icon text-[9px] w-7 h-7" aria-hidden="true">籍</span>
              <h2>基本信息</h2>
            </div>

            <div class="space-y-6">
              <!-- Nickname (read-only) -->
              <div>
                <label for="profile-nickname" class="block text-xs text-ink-medium tracking-wider mb-2">
                  号令
                </label>
                <input
                  id="profile-nickname"
                  :value="nickname"
                  type="text"
                  class="input-warm"
                  readonly
                />
                <p class="text-[0.65rem] text-ink-light tracking-wider mt-1.5">号令即昵称，注册后不可更改</p>
              </div>

              <!-- Gender -->
              <div>
                <label class="block text-xs text-ink-medium tracking-wider mb-3">
                  性别 <span class="text-ink-light font-sans font-normal">（推荐）</span>
                </label>
                <div class="flex gap-5" role="radiogroup" aria-label="性别">
                  <label class="flex items-center gap-2.5 cursor-pointer group">
                    <input v-model="gender" type="radio" name="gender" :value="''" class="sr-only" />
                    <span
                      :class="[
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                        !gender ? 'border-cinnabar' : 'border-ink-faint group-hover:border-ink-light'
                      ]"
                      aria-hidden="true"
                    >
                      <span v-if="!gender" class="w-2 h-2 rounded-full bg-cinnabar transition-all duration-200" />
                    </span>
                    <span :class="['text-sm transition-colors', !gender ? 'text-cinnabar' : 'text-ink-medium']">未设置</span>
                  </label>
                  <label class="flex items-center gap-2.5 cursor-pointer group">
                    <input v-model="gender" type="radio" name="gender" value="男" class="sr-only" />
                    <span
                      :class="[
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                        gender === '男' ? 'border-cinnabar' : 'border-ink-faint group-hover:border-ink-light'
                      ]"
                      aria-hidden="true"
                    >
                      <span v-if="gender === '男'" class="w-2 h-2 rounded-full bg-cinnabar transition-all duration-200" />
                    </span>
                    <span :class="['text-sm transition-colors', gender === '男' ? 'text-cinnabar' : 'text-ink-medium']">男</span>
                  </label>
                  <label class="flex items-center gap-2.5 cursor-pointer group">
                    <input v-model="gender" type="radio" name="gender" value="女" class="sr-only" />
                    <span
                      :class="[
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                        gender === '女' ? 'border-cinnabar' : 'border-ink-faint group-hover:border-ink-light'
                      ]"
                      aria-hidden="true"
                    >
                      <span v-if="gender === '女'" class="w-2 h-2 rounded-full bg-cinnabar transition-all duration-200" />
                    </span>
                    <span :class="['text-sm transition-colors', gender === '女' ? 'text-cinnabar' : 'text-ink-medium']">女</span>
                  </label>
                </div>
              </div>
            </div>
          </section>

          <!-- ──── Decorative divider ──── -->
          <div class="divider-seal">
            <span class="divider-seal__line" aria-hidden="true"></span>
            <span class="divider-seal__word" aria-hidden="true">天机</span>
            <span class="divider-seal__line" aria-hidden="true"></span>
          </div>

          <!-- ──── Section: 出生信息 ──── -->
          <section>
            <div class="section-header section-header--tool-light">
              <span class="bar" aria-hidden="true"></span>
              <span class="seal-icon text-[9px] w-7 h-7" aria-hidden="true">辰</span>
              <h2>出生信息</h2>
            </div>

            <div class="space-y-6">
              <!-- Birth date -->
              <div>
                <label for="profile-birth-date" class="block text-xs text-ink-medium tracking-wider mb-2">
                  出生日期 <span class="text-cinnabar" aria-hidden="true">*</span>
                </label>
                <div class="flex flex-col sm:flex-row gap-3">
                  <input
                    id="profile-birth-date"
                    v-model="birthDate"
                    type="date"
                    min="1920-01-01"
                    :max="maxDate"
                    class="input-warm flex-1"
                  />
                  <label for="profile-birth-calendar" class="sr-only">历法</label>
                  <select
                    id="profile-birth-calendar"
                    v-model="birthCalendar"
                    class="input-warm sm:w-24 text-center"
                  >
                    <option :value="null">— 未知 —</option>
                    <option value="solar">阳历</option>
                    <option value="lunar">农历</option>
                  </select>
                </div>
              </div>

              <!-- Birth time -->
              <div>
                <label for="profile-birth-hour" class="block text-xs text-ink-medium tracking-wider mb-2">
                  出生时辰 <span class="text-ink-light font-sans font-normal">（推荐）</span>
                </label>
                <p class="text-xs text-ink-light/70 mb-3 font-sans">若不确知时辰，请填大致出生时间</p>
                <div class="flex flex-col sm:flex-row gap-3">
                  <select
                    id="profile-birth-hour"
                    v-model="birthHour"
                    class="input-warm flex-1"
                  >
                    <option :value="null">— 未知 —</option>
                    <option v-for="opt in hourOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <div class="sm:w-28">
                    <label for="profile-birth-minute" class="block text-[0.65rem] text-ink-light tracking-wider mb-1.5 font-sans">分钟（选填）</label>
                    <input
                      id="profile-birth-minute"
                      v-model="birthMinuteStr"
                      type="number"
                      min="0"
                      max="59"
                      class="input-warm text-center"
                      placeholder="分"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ──── Submit ──── -->
          <div class="flex items-center gap-4 pt-2">
            <button
              type="submit"
              :disabled="saving"
              class="btn-cin"
              :aria-busy="saving"
            >
              {{ saving ? '保存中…' : '保存命簿' }}
            </button>
            <button
              type="button"
              @click="goBack"
              @keydown.enter="goBack"
              @keydown.space.prevent="goBack"
              class="btn-ink"
            >
              取消
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>
</template>
