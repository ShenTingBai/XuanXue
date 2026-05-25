<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { calculateBaZi, type BaZiResult, type BaZiPillar } from '~/composables/useBaZi'
import { WUXING_COLORS as ELEMENT_COLORS } from '~/constants/bazi'
import BaziGrid from '~/components/tools/bazi/BaziGrid.vue'
import BaziInfoSidebar from '~/components/tools/bazi/BaziInfoSidebar.vue'
import ElementAnalysis from '~/components/tools/bazi/ElementAnalysis.vue'
import DayMasterCard from '~/components/tools/bazi/DayMasterCard.vue'
import DaYunTimeline from '~/components/tools/bazi/DaYunTimeline.vue'
import InkDivider from '~/components/tools/InkDivider.vue'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import SkeletonBars from '~/components/tools/SkeletonBars.vue'

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

function parseDate(str: string): { year: number; month: number; day: number } | null {
  const parts = str.split('T')[0].split('-')
  if (parts.length !== 3) return null
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  return { year, month, day }
}

function getCurrentAge(): number {
  if (!currentProfile.value?.birth_date) return 0
  const parsed = parseDate(currentProfile.value.birth_date)
  if (!parsed) return 0
  const now = new Date()
  let age = now.getFullYear() - parsed.year
  const monthDiff = now.getMonth() + 1 - parsed.month
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.day)) {
    age--
  }
  return Math.max(0, age)
}

const currentDaYunIndex = computed(() => {
  if (!result.value?.daYun.length) return -1
  const age = getCurrentAge()
  return result.value.daYun.findIndex(c => age >= c.startAge && age <= c.endAge)
})

function computeResult() {
  if (!currentProfile.value?.birth_date) return

  loading.value = true
  error.value = ''

  // Clear previous timeout
  if (loadingTimer.value) clearTimeout(loadingTimer.value)

  const parsed = parseDate(currentProfile.value.birth_date)
  if (!parsed) { loading.value = false; return }
  const { year, month, day } = parsed
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
            <button
              @click="computeResult"
              @keydown.enter="computeResult"
              @keydown.space.prevent="computeResult"
              class="btn-seal"
            >
              <span>📜 重新排盘</span>
            </button>
          </div>
        </div>

        <!-- Result -->
        <template v-else-if="result">
          <div class="max-w-2xl mx-auto">
            <!-- Personal info summary (mobile/tablet only, desktop uses right sidebar) -->
            <div class="xl:hidden mb-6 p-4 sm:p-5 rounded-xl bg-cinnabar/3 border border-cinnabar/15">
              <div class="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-sm">
                <div>
                  <span class="text-ink-light">出生</span>
                  <strong class="text-ink-dark ml-1">{{ result.birthYear }}年</strong>
                  <span class="text-ink-light ml-2">{{ result.birthCalendar === 'solar' ? '阳历' : '农历' }}</span>
                </div>
                <div>
                  <span class="text-ink-light">生肖</span>
                  <strong class="text-ink-dark ml-1">{{ animalName }}</strong>
                </div>
                <div v-if="result.gender">
                  <span class="text-ink-light">性别</span>
                  <strong class="text-ink-dark ml-1">{{ result.gender }}</strong>
                </div>
                <div>
                  <span class="text-ink-light">本命</span>
                  <strong class="text-cinnabar ml-1 font-display text-lg">{{ result.dayMaster }}{{ result.dayMasterWuxing }}</strong>
                </div>
                <div>
                  <span class="text-ink-light">力量</span>
                  <strong class="ml-1" :class="result.dayMasterStrength === '强' || result.dayMasterStrength === '偏强' ? 'text-cinnabar' : result.dayMasterStrength === '偏弱' || result.dayMasterStrength === '弱' ? 'text-wuxing-water' : 'text-gold'">{{ result.dayMasterStrength }}</strong>
                </div>
                <div>
                  <span class="text-ink-light">喜用神</span>
                  <span v-for="el in result.favorableElements" :key="el" class="ml-1 font-medium" :style="{ color: ELEMENT_COLORS[el] }">{{ el }}</span>
                </div>
                <div v-if="result.unfavorableElements.length">
                  <span class="text-ink-light">忌神</span>
                  <span v-for="el in result.unfavorableElements" :key="el" class="ml-1 opacity-60" :style="{ color: ELEMENT_COLORS[el] }">{{ el }}</span>
                </div>
              </div>
            </div>

            <!-- End: Personal info summary -->

            <!-- Brief intro -->
            <div class="mb-6 p-3 rounded-lg bg-paper-lightest/50 border border-paper-dark/30 text-center">
              <p class="font-sans text-xs text-ink-light">
                以下是你的八字排盘结果，底部有解读总结
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
            <DaYunTimeline :cycles="result.daYun" :current-cycle-idx="currentDaYunIndex" />

            <!-- Reading Guide -->
            <div class="mt-8 p-5 sm:p-6 rounded-xl bg-gradient-to-br from-cinnabar/3 to-paper-lightest border border-cinnabar/15">
              <h3 class="font-display text-xl text-cinnabar mb-4 flex items-center gap-2">
                <span class="inline-block w-1.5 h-5 bg-cinnabar rounded-sm" aria-hidden="true"></span>
                你的八字解读
              </h3>

              <div class="space-y-3 font-sans text-sm text-ink-medium leading-relaxed">
                <p>
                  <strong class="text-ink-dark">你是{{ result.dayMaster }}{{ result.dayMasterWuxing }}命。</strong>
                  日主代表你自己——你出生那天的天干是「{{ result.dayMaster }}」，五行属「{{ result.dayMasterWuxing }}」。
                  命局整体力量<strong class="text-ink-dark">{{ result.dayMasterStrength }}</strong>。
                </p>

                <p>
                  五行之中，对你最有帮助的能量是
                  <strong class="text-cinnabar">{{ result.favorableElements.join('、') }}</strong>，
                  生活中可多接触这些元素相关的事物。
                </p>

                <p v-if="result.unfavorableElements.length > 0">
                  而<strong class="text-ink-dark">{{ result.unfavorableElements.join('、') }}</strong>与你相克，
                  适当平衡即可，不必刻意回避。
                </p>

                <p v-if="result.daYun.length > 0">
                  你目前处于大运周期中，
                  人生每十年换一次运，具体走势可参考上方「大运」时间线。
                </p>
              </div>
            </div>

            <!-- Hour missing notice -->
            <div v-if="missingHour" class="mt-4 p-4 rounded-lg bg-ink-faint/10 border border-ink-faint/30 text-center">
              <p class="font-sans text-sm text-ink-medium">
                出生时辰未设置，时柱暂不显示。
                <NuxtLink :to="`/profile/${currentProfile?.id}`" class="text-cinnabar hover:underline">前往设置</NuxtLink>
              </p>
            </div>

            <!-- Recalculate -->
            <div class="flex justify-center mt-8">
              <button
                @click="computeResult"
                @keydown.enter="computeResult"
                @keydown.space.prevent="computeResult"
                class="btn-seal"
              >
                <span>重新排盘</span>
              </button>
            </div>
          </div>
        </template>
      </ToolPageLayout>
    </div>
  </div>
</template>
