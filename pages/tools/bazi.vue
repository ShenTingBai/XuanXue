<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { calculateBaZi, type BaZiResult, type BaZiPillar } from '~/composables/useBaZi'
import BaziGrid from '~/components/tools/bazi/BaziGrid.vue'
import BaziInfoSidebar from '~/components/tools/bazi/BaziInfoSidebar.vue'
import ElementAnalysis from '~/components/tools/bazi/ElementAnalysis.vue'
import DayMasterCard from '~/components/tools/bazi/DayMasterCard.vue'
import DaYunTimeline from '~/components/tools/bazi/DaYunTimeline.vue'

const router = useRouter()
const { currentProfile, restoreSession } = useAuth()

const result = ref<BaZiResult | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const missingHour = ref(false)
const error = ref('')
const loadingTimer = ref<ReturnType<typeof setTimeout> | null>(null)

onUnmounted(() => {
  if (loadingTimer.value) clearTimeout(loadingTimer.value)
})

onMounted(async () => {
  await restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }

  if (!currentProfile.value.birth_date) {
    missingBirthInfo.value = true
    loading.value = false
    return
  }

  computeResult()
})

function computeResult() {
  if (!currentProfile.value?.birth_date) return

  loading.value = true
  error.value = ''

  // Clear previous timeout
  if (loadingTimer.value) clearTimeout(loadingTimer.value)

  const birthDate = new Date(currentProfile.value.birth_date)
  const year = birthDate.getFullYear()
  const month = birthDate.getMonth() + 1
  const day = birthDate.getDate()
  const calendar = currentProfile.value.birth_calendar || 'solar'

  const hour = currentProfile.value.birth_hour ?? null
  const gender = currentProfile.value.gender || null

  if (hour === null) {
    missingHour.value = true
  } else {
    missingHour.value = false
  }

  loadingTimer.value = setTimeout(() => {
    try {
      result.value = calculateBaZi({
        birthYear: year,
        birthMonth: month,
        birthDay: day,
        birthCalendar: calendar,
        birthHour: hour,
        gender,
      })
    } catch {
      error.value = '排盘计算出错，请检查出生信息'
    }
    loading.value = false
    loadingTimer.value = null
  }, 200)
}

const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
const getAnimal = (year: number) => ANIMALS[((year - 4) % 12 + 12) % 12]

const pillars = computed<BaZiPillar[]>(() => {
  if (!result.value) return []
  const arr = [result.value.yearPillar, result.value.monthPillar, result.value.dayPillar]
  if (result.value.hourPillar) arr.push(result.value.hourPillar)
  return arr
})

const animalName = computed(() => {
  if (!result.value) return ''
  return getAnimal(result.value.birthYear)
})
</script>

<template>
  <div class="ink-wash-bg min-h-screen">
    <div class="relative z-10">
      <ToolPageLayout>
        <template #nav>
          <div class="card-paper-solid rounded-xl p-3">
            <div class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-2">命理工具</div>
            <NuxtLink to="/tools/shengxiao" class="nav-link w-full">
              <span aria-hidden="true">🐯</span> 生肖
            </NuxtLink>
            <NuxtLink to="/tools/constellation" class="nav-link w-full">
              <span aria-hidden="true">♈</span> 星座
            </NuxtLink>
            <NuxtLink to="/tools/bazi" class="nav-link nav-link--active w-full">
              <span aria-hidden="true">☯</span> 八字
            </NuxtLink>
          </div>
        </template>

        <template #nav-right>
          <BaziInfoSidebar
            v-if="result"
            :birth-year="result.birthYear"
            :birth-calendar="result.birthCalendar"
            :animal="animalName"
            :gender="result.gender"
            :day-master="result.dayMaster"
            :day-master-wuxing="result.dayMasterWuxing"
            :day-master-strength="result.dayMasterStrength"
            :favorable-elements="result.favorableElements"
            :unfavorable-elements="result.unfavorableElements"
          />
        </template>

        <!-- Missing birth info -->
        <div v-if="missingBirthInfo" class="text-center py-16">
          <p class="font-sans text-lg text-ink-medium mb-4">请先完善出生信息</p>
          <p class="font-sans text-sm text-ink-light mb-6">需要填写出生日期以进行八字排盘</p>
          <NuxtLink
            :to="`/profile/${currentProfile?.id}`"
            class="btn-seal inline-flex"
          >
            <span>前往编辑档案</span>
          </NuxtLink>
        </div>

        <!-- Loading -->
        <div v-else-if="loading" class="space-y-6">
          <SkeletonCard />
          <SkeletonBars />
        </div>

        <!-- Error -->
        <div v-else-if="error" class="text-center py-16">
          <p class="font-sans text-sm text-cinnabar" role="alert">{{ error }}</p>
          <div class="flex justify-center mt-6">
            <button @click="computeResult" class="btn-seal">
              <span>📜 重新排盘</span>
            </button>
          </div>
        </div>

        <!-- Result -->
        <template v-else-if="result">
          <div class="max-w-2xl mx-auto">
            <!-- Mobile info bar -->
            <div class="sm:hidden flex items-center gap-2 mb-4 p-3 bg-cinnabar/3 rounded-lg">
              <div class="flex-1 font-sans text-xs text-ink-medium">
                <span class="text-[0.55rem] text-ink-light">本命：</span>
                <strong class="text-cinnabar">{{ result.dayMaster }}</strong>（{{ result.dayMasterWuxing }}）
                <span class="text-[0.55rem] text-ink-light ml-1">力量：</span>{{ result.dayMasterStrength }}
                <span class="text-[0.55rem] text-ink-light ml-1">助你：</span>
                {{ result.favorableElements.join('') }}
              </div>
              <div class="font-sans text-[0.6rem] text-ink-light">
                {{ result.birthYear }} · {{ animalName }}
              </div>
            </div>

            <!-- Overview intro card -->
            <div class="mb-6 p-4 sm:p-5 rounded-lg bg-paper-lightest/70 border border-paper-dark/40">
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                八字由你的出生时间推算而来，包含年、月、日、时四个时间柱，
                每柱一干一支，共八个字。红色标注的"日主"代表你自己。
              </p>
            </div>

            <!-- Four Pillars Grid -->
            <BaziGrid :pillars="pillars" />

            <!-- Element Analysis -->
            <ElementAnalysis
              :element-counts="result.elementCounts"
              :element-percentages="result.elementPercentages"
              :day-master="result.dayMaster"
              :day-master-wuxing="result.dayMasterWuxing"
              :day-master-strength="result.dayMasterStrength"
              :month-branch="result.monthPillar.branch"
            />

            <!-- Day Master Card -->
            <DayMasterCard
              :day-master="result.dayMaster"
              :day-master-wuxing="result.dayMasterWuxing"
              :day-master-strength="result.dayMasterStrength"
              :favorable-elements="result.favorableElements"
              :unfavorable-elements="result.unfavorableElements"
            />

            <!-- Da Yun Timeline -->
            <DaYunTimeline :cycles="result.daYun" />

            <!-- Hour missing notice -->
            <div v-if="missingHour" class="mt-4 p-4 rounded-lg bg-ink-faint/10 border border-ink-faint/30 text-center">
              <p class="font-sans text-sm text-ink-medium">
                出生时辰未设置，时柱暂不显示。
                <NuxtLink :to="`/profile/${currentProfile?.id}`" class="text-cinnabar hover:underline">前往设置</NuxtLink>
              </p>
            </div>

            <!-- Recalculate -->
            <div class="flex justify-center mt-8">
              <button @click="computeResult" class="btn-seal">
                <span>重新排盘</span>
              </button>
            </div>
          </div>
        </template>
      </ToolPageLayout>
    </div>
  </div>
</template>
