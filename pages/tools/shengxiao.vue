<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { calculateShengXiao, type ShengXiaoResult } from '~/composables/useShengXiao'

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
  const birthDate = new Date(currentProfile.value.birth_date)
  const year = birthDate.getFullYear()
  const calendar = currentProfile.value.birth_calendar || 'solar'

  if (loadingTimer.value) clearTimeout(loadingTimer.value)
  loadingTimer.value = setTimeout(() => {
    result.value = calculateShengXiao(year, calendar, new Date())
    selectedAnimal.value = computeAnimalIndex(year)
    loading.value = false
  }, 200)
}

function computeAnimalIndex(year: number): number {
  return ((year - 4) % 12 + 12) % 12
}

onUnmounted(() => {
  if (loadingTimer.value) clearTimeout(loadingTimer.value)
})

function selectAnimal(index: number) {
  if (!currentProfile.value?.birth_date) return
  selectedAnimal.value = index
  loading.value = true

  const currentYear = new Date().getFullYear()
  const currentAnimalIdx = computeAnimalIndex(currentYear)
  const diff = ((index - currentAnimalIdx) % 12 + 12) % 12
  const representativeYear = currentYear - diff

  if (loadingTimer.value) clearTimeout(loadingTimer.value)
  loadingTimer.value = setTimeout(() => {
    result.value = calculateShengXiao(representativeYear, currentProfile.value?.birth_calendar || 'solar')
    loading.value = false
  }, 200)
}

const currentYear = computed(() => new Date().getFullYear())
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
          <button
            v-for="(animal, idx) in ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']"
            :key="idx"
            @click="selectAnimal(idx)"
            :class="[
              'flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors',
              idx === selectedAnimal ? 'bg-cinnabar/10 text-cinnabar' : 'text-ink-medium hover:bg-paper-medium/50',
            ]"
          >
            {{ animal }}
          </button>
        </template>

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
        <div v-else-if="loading" class="space-y-6">
          <SkeletonCard />
          <SkeletonBars />
        </div>

        <!-- Result -->
        <template v-else-if="result">
          <ShengXiaoHero :result="result" />
          <WuXingGrid :result="result" />
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
            <button @click="computeResult" class="btn-seal">
              <span>📜 重新排盘</span>
            </button>
          </div>
        </template>
      </ToolPageLayout>
    </div>
  </div>
</template>
