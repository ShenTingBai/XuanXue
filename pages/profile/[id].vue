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
    error.value = (e as any)?.data?.statusMessage || '保存失败，请稍后再试'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen relative ink-wash-bg">
    <!-- ═══ Background trigram corner marks ═══ -->
    <div class="bg-trigrams" aria-hidden="true">
      <span class="bg-trigram bg-trigram--tl">☰</span>
      <span class="bg-trigram bg-trigram--tr">☷</span>
      <span class="bg-trigram bg-trigram--bl">☵</span>
      <span class="bg-trigram bg-trigram--br">☲</span>
    </div>

    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10">

      <!-- ═══ Back link ═══ -->
      <button
        @click="goBack"
        @keydown.enter="goBack"
        @keydown.space.prevent="goBack"
        class="btn-ink mb-12"
      >
        <svg aria-hidden="true" class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M10 12l-4-4 4-4" />
        </svg>
        返回
      </button>

      <!-- ═══ Hero — 命簿如卷 ═══ -->
      <div class="hero-block mb-14 anim-rise">
        <div class="flex items-start gap-6">
          <div class="hero-seal-stack" aria-hidden="true">
            <span class="hero-seal-char">命</span>
            <span class="hero-seal-char">簿</span>
          </div>
          <div class="flex-1 pt-1">
            <h1 class="font-display text-4xl sm:text-5xl text-ink-dark leading-tight mb-2">
              命簿
            </h1>
            <p class="text-sm text-ink-medium tracking-wider leading-relaxed ui">
              完善身世信息，以候天机推演
            </p>
            <div class="hero-underline" aria-hidden="true">
              <span class="line"></span>
              <span class="ornament"></span>
              <span class="line"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ Onboarding hint ═══ -->
      <Transition name="fade">
        <div
          v-if="isOnboarding"
          class="card-warm rounded-xl p-5 mb-10 flex items-start gap-4 anim-rise"
        >
          <span class="seal-icon text-[10px] w-7 h-7 flex-shrink-0" aria-hidden="true">启</span>
          <p class="text-base text-ink leading-relaxed ui">
            填写出生信息后即可开始命理推演
          </p>
        </div>
      </Transition>

      <!-- ═══ Success toast ═══ -->
      <Transition name="fade">
        <div
          v-if="success"
          role="status"
          class="card-warm rounded-xl p-4 mb-8 flex items-center gap-3 border border-jade/20"
        >
          <svg aria-hidden="true" class="w-5 h-5 text-jade flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 8l3 3 7-7" />
          </svg>
          <span class="text-base text-jade ui">命簿已更新</span>
        </div>
      </Transition>

      <!-- ═══ Onboarding / redirect CTAs ═══ -->
      <div v-if="success" class="mb-10 flex gap-4 anim-rise">
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
      <Transition name="fade">
        <div
          v-if="error"
          class="card-warm rounded-xl p-4 mb-8 flex items-center gap-3 border border-cinnabar/15"
          role="alert"
        >
          <svg aria-hidden="true" class="w-5 h-5 text-cinnabar flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v3" /><path d="M8 10.5v.5" />
          </svg>
          <span class="text-base text-cinnabar ui">{{ error }}</span>
        </div>
      </Transition>

      <!-- ═══ Form — two separate document cards ═══ -->
      <form @submit.prevent="saveProfile" novalidate class="space-y-12">

        <!-- ════════════════════════════════════════════════════════
             Document Card 1: 基本信息
             ════════════════════════════════════════════════════════ -->
        <section class="document-card card-warm card-warm--elevated rounded-xl p-8 anim-rise anim-delay-1">
          <!-- Decorative corner brackets -->
          <span class="doc-corner doc-corner--tl" aria-hidden="true"></span>
          <span class="doc-corner doc-corner--tr" aria-hidden="true"></span>
          <span class="doc-corner doc-corner--bl" aria-hidden="true"></span>
          <span class="doc-corner doc-corner--br" aria-hidden="true"></span>

          <!-- Section header -->
          <div class="section-header-custom">
            <span class="bar" aria-hidden="true"></span>
            <span class="inline-flex seal-icon text-xs w-8 h-8" aria-hidden="true">籍</span>
            <h2>基本信息</h2>
            <span class="line" aria-hidden="true"></span>
          </div>

          <div class="space-y-8">
            <!-- ── Nickname (read-only) ── -->
            <div class="field-group">
              <label for="profile-nickname" class="field-label">
                <span class="label-seal" aria-hidden="true">号</span>
                <span class="label-text">号令</span>
              </label>
              <input
                id="profile-nickname"
                :value="nickname"
                type="text"
                class="input-warm"
                readonly
              />
              <p class="field-hint">号令即昵称，注册后不可更改</p>
            </div>

            <!-- ── Gender ── -->
            <div class="field-group">
              <div class="field-label">
                <span class="label-seal" aria-hidden="true">性</span>
                <span class="label-text">性别 <span class="text-ink-faint font-sans font-normal">（推荐）</span></span>
              </div>
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
                  <span :class="['text-base transition-colors ui', !gender ? 'text-cinnabar' : 'text-ink-medium']">未设置</span>
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
                  <span :class="['text-base transition-colors ui', gender === '男' ? 'text-cinnabar' : 'text-ink-medium']">男</span>
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
                  <span :class="['text-base transition-colors ui', gender === '女' ? 'text-cinnabar' : 'text-ink-medium']">女</span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══ Decorative divider ═══ -->
        <div class="divider-custom anim-rise anim-delay-2" aria-hidden="true">
          <span class="line"></span>
          <span class="center">
            <span class="diamond">◇</span>
            <span class="text">天机</span>
            <span class="diamond">◇</span>
          </span>
          <span class="line"></span>
        </div>

        <!-- ════════════════════════════════════════════════════════
             Document Card 2: 出生信息
             ════════════════════════════════════════════════════════ -->
        <section class="document-card card-warm card-warm--elevated rounded-xl p-8 anim-rise anim-delay-2">
          <!-- Decorative corner brackets -->
          <span class="doc-corner doc-corner--tl" aria-hidden="true"></span>
          <span class="doc-corner doc-corner--tr" aria-hidden="true"></span>
          <span class="doc-corner doc-corner--bl" aria-hidden="true"></span>
          <span class="doc-corner doc-corner--br" aria-hidden="true"></span>

          <!-- Section header -->
          <div class="section-header-custom">
            <span class="bar" aria-hidden="true"></span>
            <span class="inline-flex seal-icon text-xs w-8 h-8" aria-hidden="true">辰</span>
            <h2>出生信息</h2>
            <span class="line" aria-hidden="true"></span>
          </div>

          <div class="space-y-8">
            <!-- ── Birth date ── -->
            <div class="field-group">
              <label for="profile-birth-date" class="field-label">
                <span class="label-seal" aria-hidden="true">日</span>
                <span class="label-text">出生日期 <span class="text-cinnabar" aria-hidden="true">*</span></span>
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

            <!-- ── Birth time ── -->
            <div class="field-group">
              <label for="profile-birth-hour" class="field-label">
                <span class="label-seal" aria-hidden="true">辰</span>
                <span class="label-text">出生时辰 <span class="text-ink-faint font-sans font-normal">（推荐）</span></span>
              </label>
              <p class="field-hint mb-3">若不确知时辰，请填大致出生时间</p>
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
                  <label for="profile-birth-minute" class="block text-[0.7rem] text-ink-light tracking-wider mb-1.5 font-sans ui">分钟（选填）</label>
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

        <!-- ═══ Submit buttons ═══ -->
        <div class="flex items-center gap-4 anim-rise anim-delay-3">
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
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   命簿如卷 — Profile Page Decorative Styling
   ═══════════════════════════════════════════════════════════════ */

/* ── Radio focus-visible ring ── */
.sr-only:focus-visible + span {
  outline: 2px solid #C62828;
  outline-offset: 2px;
}

/* ── Background Trigram Corner Marks ── */
.bg-trigrams {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.bg-trigram {
  position: absolute;
  font-size: 6rem;
  color: rgba(156, 26, 28, 0.018);
  font-family: var(--font-display);
  line-height: 1;
  user-select: none;
}
.bg-trigram--tl { top: 24px; left: 24px; }
.bg-trigram--tr { top: 24px; right: 24px; }
.bg-trigram--bl { bottom: 24px; left: 24px; }
.bg-trigram--br { bottom: 24px; right: 24px; }

/* ── Hero Vertical Stacked Seal ── */
.hero-seal-stack {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 72px;
  padding: 14px 0;
  gap: 2px;
  background: var(--color-cinnabar-deeper);
  transform: rotate(-5deg);
  flex-shrink: 0;
  box-shadow:
    0 0 0 4px rgba(156,26,28,0.06),
    0 0 0 10px rgba(156,26,28,0.025),
    0 12px 48px rgba(156,26,28,0.05);
}
.hero-seal-stack::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 2px,
    rgba(232,220,198,0.05) 2px, rgba(232,220,198,0.05) 3px
  );
  pointer-events: none;
}
.hero-seal-char {
  color: var(--color-paper-card);
  font-family: var(--font-display);
  font-size: 1.75rem;
  line-height: 1.2;
  position: relative;
  z-index: 1;
}

/* ── Hero Decorative Underline ── */
.hero-underline {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 20px;
}
.hero-underline .line {
  flex: 1;
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    rgba(156,26,28,0.04) 0px, rgba(156,26,28,0.04) 4px,
    transparent 4px, transparent 8px
  );
}
.hero-underline .ornament {
  width: 5px;
  height: 5px;
  background: var(--color-cinnabar-deeper);
  transform: rotate(45deg);
  opacity: 0.08;
  flex-shrink: 0;
}

/* ── Document Card Corner Brackets ── */
.document-card {
  position: relative;
}
.doc-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  pointer-events: none;
  opacity: 0.12;
}
.doc-corner--tl { top: 10px; left: 10px; border-top: 1px solid #9C1A1C; border-left: 1px solid #9C1A1C; }
.doc-corner--tr { top: 10px; right: 10px; border-top: 1px solid #9C1A1C; border-right: 1px solid #9C1A1C; }
.doc-corner--bl { bottom: 10px; left: 10px; border-bottom: 1px solid #9C1A1C; border-left: 1px solid #9C1A1C; }
.doc-corner--br { bottom: 10px; right: 10px; border-bottom: 1px solid #9C1A1C; border-right: 1px solid #9C1A1C; }

/* ── Custom Section Header ── */
.section-header-custom {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}
.section-header-custom .bar {
  width: 28px;
  height: 2px;
  background: rgba(156,26,28,0.10);
  flex-shrink: 0;
}
.section-header-custom h2 {
  font-family: var(--font-display);
  color: var(--color-ink);
  font-size: 1.375rem;
  letter-spacing: 0.15em;
  white-space: nowrap;
}
.section-header-custom .line {
  flex: 1;
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    rgba(156,26,28,0.025) 0px, rgba(156,26,28,0.025) 3px,
    transparent 3px, transparent 7px
  );
}

/* ── Larger input text inside document cards ── */
.document-card .input-warm {
  font-size: 0.95rem;
  padding: 0.875rem 1rem;
}
.document-card .input-warm option {
  font-size: 0.85rem;
}

/* Larger button text */
.btn-cin,
.btn-ink {
  font-size: 1rem;
  padding: 0.875rem 2.5rem;
}

/* ── Field Labels ── */
.field-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.label-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: rgba(156,26,28,0.04);
  color: var(--color-cinnabar-deeper);
  font-size: 0.75rem;
  font-family: var(--font-display);
  flex-shrink: 0;
  transform: rotate(-3deg);
}
.label-text {
  font-size: 0.875rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.15em;
  font-family: var(--font-sans);
}
.field-hint {
  font-size: 0.7rem;
  color: var(--color-ink-light);
  letter-spacing: 0.04em;
  margin-top: 8px;
  font-family: var(--font-sans);
}

/* ── Enhanced Divider ── */
.divider-custom {
  display: flex;
  align-items: center;
  gap: 16px;
}
.divider-custom .line {
  flex: 1;
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    rgba(156,26,28,0.025) 0px, rgba(156,26,28,0.025) 3px,
    transparent 3px, transparent 7px
  );
}
.divider-custom .center {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}
.divider-custom .center .diamond {
  color: rgba(156,26,28,0.04);
  font-size: 10px;
  line-height: 1;
}
.divider-custom .center .text {
  font-size: 1rem;
  color: rgba(44,26,14,0.08);
  letter-spacing: 0.4em;
  font-family: var(--font-display);
}
</style>
