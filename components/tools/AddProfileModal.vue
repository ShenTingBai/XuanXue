<script setup lang="ts">
import type { Profile } from '~/composables/useAuth'
import type { FetchError } from '~/types/errors'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: []; added: [] }>()

const nickname = ref('')
const gender = ref<string | null>(null)
const birthDate = ref('')
const birthCalendar = ref<'solar' | 'lunar' | null>(null)
const birthHour = ref<number | null>(null)
const birthMinuteStr = ref('')
const birthPlace = ref('')
const birthLongitudeStr = ref('')
const saving = ref(false)
const error = ref('')

const maxDate = computed(() => new Date().toISOString().split('T')[0])

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

watch(
  () => props.show,
  val => {
    if (val) {
      resetForm()
    }
  },
)

function resetForm() {
  nickname.value = ''
  gender.value = null
  birthDate.value = ''
  birthCalendar.value = null
  birthHour.value = null
  birthMinuteStr.value = ''
  birthPlace.value = ''
  birthLongitudeStr.value = ''
  error.value = ''
}

async function handleSubmit() {
  if (!nickname.value.trim()) {
    error.value = '请输入昵称'
    return
  }
  if (nickname.value.trim().length < 2) {
    error.value = '昵称至少需要2个字符'
    return
  }
  if (saving.value) return
  error.value = ''
  saving.value = true

  try {
    const body: Record<string, unknown> = {
      nickname: nickname.value.trim(),
    }
    body.gender = gender.value || null
    body.birth_date = birthDate.value || null
    body.birth_calendar = birthCalendar.value
    body.birth_hour = birthHour.value ?? null
    if (birthMinuteStr.value !== '') {
      const num = Number(birthMinuteStr.value)
      if (!isNaN(num) && Number.isInteger(num) && num >= 0 && num <= 59) {
        body.birth_minute = num
      }
    }
    body.birth_place = birthPlace.value || null
    if (birthLongitudeStr.value !== '') {
      const lon = Number(birthLongitudeStr.value)
      if (!isNaN(lon) && lon >= -180 && lon <= 180) {
        body.birth_longitude = lon
      }
    }

    await $fetch<Profile>('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    emit('added')
  } catch (e: unknown) {
    error.value = (e as FetchError)?.data?.statusMessage || '创建失败，请稍后再试'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[70] flex items-center justify-center p-4"
        @click.self="emit('close')"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-ink-dark/50 backdrop-blur-sm" />

        <!-- Modal -->
        <div
          role="dialog"
          aria-modal="true"
          aria-label="添加子档案"
          class="relative z-10 card-warm card-warm--elevated rounded-xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <div class="flex items-center justify-between mb-6">
            <h2 class="font-display text-xl text-ink-dark tracking-[0.15em]">添加档案</h2>
            <button
              class="flex items-center justify-center w-8 h-8 rounded-full hover:bg-cinnabar/10 transition-all"
              aria-label="关闭"
              @click="emit('close')"
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
                <path d="M5 5l10 10M15 5l-10 10" />
              </svg>
            </button>
          </div>

          <form class="space-y-6" @submit.prevent="handleSubmit">
            <!-- Error -->
            <div
              v-if="error"
              class="card-warm rounded-lg p-3 border border-cinnabar/15"
              role="alert"
            >
              <p class="text-sm text-cinnabar">{{ error }}</p>
            </div>

            <!-- Nickname (required) -->
            <div>
              <label for="add-profile-nickname" class="block text-sm text-ink-medium mb-2">
                昵称 <span class="text-cinnabar">*</span>
              </label>
              <input
                id="add-profile-nickname"
                v-model="nickname"
                type="text"
                maxlength="20"
                class="input-warm w-full"
                placeholder="输入子档案昵称（2-20字）"
                required
              />
            </div>

            <!-- Gender -->
            <div>
              <span class="block text-sm text-ink-medium mb-2">性别</span>
              <div class="flex gap-5" role="radiogroup" aria-label="性别">
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input
                    v-model="gender"
                    type="radio"
                    name="add-gender"
                    :value="null"
                    class="sr-only"
                  />
                  <span
                    class="radio-custom"
                    :class="{ 'radio-custom--checked': !gender }"
                    aria-hidden="true"
                  />
                  <span :class="['text-sm', !gender ? 'text-cinnabar' : 'text-ink-medium']"
                    >未设置</span
                  >
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input
                    v-model="gender"
                    type="radio"
                    name="add-gender"
                    value="男"
                    class="sr-only"
                  />
                  <span
                    class="radio-custom"
                    :class="{ 'radio-custom--checked': gender === '男' }"
                    aria-hidden="true"
                  />
                  <span :class="['text-sm', gender === '男' ? 'text-cinnabar' : 'text-ink-medium']"
                    >男</span
                  >
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input
                    v-model="gender"
                    type="radio"
                    name="add-gender"
                    value="女"
                    class="sr-only"
                  />
                  <span
                    class="radio-custom"
                    :class="{ 'radio-custom--checked': gender === '女' }"
                    aria-hidden="true"
                  />
                  <span :class="['text-sm', gender === '女' ? 'text-cinnabar' : 'text-ink-medium']"
                    >女</span
                  >
                </label>
              </div>
            </div>

            <!-- Birth date -->
            <div>
              <label for="add-profile-birth-date" class="block text-sm text-ink-medium mb-2"
                >出生日期</label
              >
              <div class="flex gap-3">
                <input
                  id="add-profile-birth-date"
                  v-model="birthDate"
                  type="date"
                  min="1920-01-01"
                  :max="maxDate"
                  class="input-warm flex-1"
                />
                <label for="add-profile-birth-calendar" class="sr-only">历法</label>
                <select
                  id="add-profile-birth-calendar"
                  v-model="birthCalendar"
                  class="input-warm w-20 text-center"
                >
                  <option :value="null">—</option>
                  <option value="solar">阳历</option>
                  <option value="lunar">农历</option>
                </select>
              </div>
            </div>

            <!-- Birth time -->
            <div>
              <label for="add-profile-birth-hour" class="block text-sm text-ink-medium mb-2"
                >出生时辰</label
              >
              <div class="flex gap-3">
                <select id="add-profile-birth-hour" v-model="birthHour" class="input-warm flex-1">
                  <option :value="null">— 未知 —</option>
                  <option v-for="opt in hourOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <input
                  id="add-profile-birth-minute"
                  v-model="birthMinuteStr"
                  type="number"
                  min="0"
                  max="59"
                  class="input-warm w-20 text-center"
                  placeholder="分"
                />
              </div>
            </div>

            <!-- Buttons -->
            <div class="flex items-center gap-4 pt-2">
              <button type="submit" :disabled="saving" class="btn-cin text-sm px-6 py-2.5">
                {{ saving ? '创建中…' : '创建档案' }}
              </button>
              <button type="button" class="btn-ink text-sm px-6 py-2.5" @click="emit('close')">
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.radio-custom {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-ink-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.radio-custom--checked {
  border-color: var(--color-cinnabar);
}
.radio-custom--checked::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-cinnabar);
}
.sr-only:focus-visible + span {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: 2px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
