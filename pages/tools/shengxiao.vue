<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { calculateShengXiao, getAnimalIndex, type ShengXiaoResult } from '~/composables/useShengXiao'
import { parseDate } from '~/utils/date'

const { currentProfile, restoreSession } = useAuth()
const router = useRouter()

import ShengXiaoHero from '~/components/tools/shengxiao/Hero.vue'
import WuXingGrid from '~/components/tools/shengxiao/WuXingGrid.vue'
import PersonalityCard from '~/components/tools/shengxiao/Personality.vue'
import CompatibilityGrid from '~/components/tools/shengxiao/CompatibilityGrid.vue'
import AnimalNav from '~/components/tools/shengxiao/AnimalNav.vue'
import FortuneBars from '~/components/tools/FortuneBars.vue'
import InkDivider from '~/components/tools/InkDivider.vue'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import SkeletonBars from '~/components/tools/SkeletonBars.vue'

useHead({ title: '生肖 - 玄学' })

const result = ref<ShengXiaoResult | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const selectedAnimal = ref<number | null>(null)
const loadingTimer = ref<ReturnType<typeof setTimeout> | null>(null)

onMounted(() => {
  restoreSession()
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
  const parsed = parseDate(currentProfile.value.birth_date)
  if (!parsed) { loading.value = false; return }
  const year = parsed.year
  const calendar = currentProfile.value.birth_calendar || 'solar'

  if (loadingTimer.value) clearTimeout(loadingTimer.value)
  loadingTimer.value = setTimeout(() => {
    result.value = calculateShengXiao(year, calendar, new Date())
    selectedAnimal.value = getAnimalIndex(year)
    loading.value = false
  }, 200)
}

onUnmounted(() => {
  if (loadingTimer.value) clearTimeout(loadingTimer.value)
})

function selectAnimal(index: number) {
  if (!currentProfile.value?.birth_date) return
  selectedAnimal.value = index
  loading.value = true

  const currentYear = new Date().getFullYear()
  const currentAnimalIdx = getAnimalIndex(currentYear)
  const diff = ((currentAnimalIdx - index) % 12 + 12) % 12
  const representativeYear = currentYear - diff

  if (loadingTimer.value) clearTimeout(loadingTimer.value)
  loadingTimer.value = setTimeout(() => {
    result.value = calculateShengXiao(representativeYear, currentProfile.value?.birth_calendar || 'solar')
    loading.value = false
  }, 200)
}

const currentYear = computed(() => new Date().getFullYear())

function scrollToAnimalNav() {
  const el = document.querySelector('[data-animal-nav]')
  el?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <div class="ink-wash-bg min-h-screen">
    <div class="relative z-10">
      <ToolPageLayout>
        <template #nav>
          <AnimalNav
            v-if="selectedAnimal !== null"
            :currentIndex="selectedAnimal"
            @select="selectAnimal"
          />
        </template>
        <template #mobile-nav>
          <div data-animal-nav class="flex gap-2 overflow-x-auto px-4 py-2">
            <button
              v-for="(animal, idx) in ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']"
              :key="idx"
              @click="selectAnimal(idx)"
              @keydown.enter="selectAnimal(idx)"
              @keydown.space.prevent="selectAnimal(idx)"
              :aria-current="idx === selectedAnimal ? 'true' : undefined"
              :class="[
                'flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors',
                idx === selectedAnimal ? 'bg-cinnabar/10 text-cinnabar' : 'text-ink-medium hover:bg-paper-medium/50',
              ]"
            >
              {{ animal }}
            </button>
          </div>
        </template>

        <!-- Screen reader status -->
        <div role="status" class="sr-only" aria-live="polite">
          {{ loading ? '正在计算...' : result ? '结果已就绪' : '' }}
        </div>

        <!-- Missing birth info -->
        <div v-if="missingBirthInfo" class="text-center py-16">
          <p class="font-sans text-lg text-ink-medium mb-4">请先完善出生信息</p>
          <p class="font-sans text-sm text-ink-light mb-6">需要填写出生日期以计算生肖排盘</p>
          <NuxtLink
            :to="`/profile/${currentProfile?.id}`"
            class="btn-seal inline-flex"
          >
            <span>前往编辑档案</span>
          </NuxtLink>
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="loading" class="space-y-6" aria-busy="true" aria-live="polite">
          <span class="sr-only">正在加载...</span>
          <SkeletonCard />
          <SkeletonBars />
        </div>

        <!-- Result -->
        <template v-else-if="result">
          <div aria-live="polite" aria-atomic="true">
          <ShengXiaoHero :result="result" />
          <WuXingGrid :result="result" />

          <!-- Lucky information -->
          <div class="fade-in card-paper-solid rounded-2xl mt-6" :style="{ '--delay': '0.25s' }">
            <InkDivider>幸运信息</InkDivider>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-8">
              <div>
                <h4 class="font-noto text-ink-400 text-sm mb-2">幸运数字</h4>
                <p class="font-noto text-ink-700 text-lg">{{ result.lucky.numbers.join('、') }}</p>
              </div>
              <div>
                <h4 class="font-noto text-ink-400 text-sm mb-2">幸运颜色</h4>
                <p class="font-noto text-ink-700 text-lg">{{ result.lucky.colors.join('、') }}</p>
              </div>
              <div>
                <h4 class="font-noto text-ink-400 text-sm mb-2">幸运方位</h4>
                <p class="font-noto text-ink-700 text-lg">{{ result.lucky.direction }}</p>
              </div>
            </div>
          </div>

          <PersonalityCard :result="result" />

          <InkDivider>{{ currentYear }}年流年运势</InkDivider>
          <FortuneBars
            :items="[
              { label: '事业', score: result.fortune.career.score },
              { label: '财运', score: result.fortune.wealth.score },
              { label: '感情', score: result.fortune.love.score },
              { label: '健康', score: result.fortune.health.score },
            ]"
          />

          <CompatibilityGrid :items="result.compatibility" />

          <div class="flex flex-wrap gap-3 justify-center mt-8">
            <button
              @click="computeResult"
              @keydown.enter="computeResult"
              @keydown.space.prevent="computeResult"
              class="btn-seal"
            >
              <span>📜 重新排盘</span>
            </button>
            <button
              @click="scrollToAnimalNav"
              @keydown.enter="scrollToAnimalNav"
              @keydown.space.prevent="scrollToAnimalNav"
              class="btn-seal"
            >
              <span>切换生肖</span>
            </button>
          </div>
          </div>
        </template>
      </ToolPageLayout>
    </div>
  </div>
</template>
