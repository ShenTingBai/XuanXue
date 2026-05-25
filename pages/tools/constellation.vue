<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { calculateConstellation, getZodiacIndex, ZODIACS, type ConstellationResult } from '~/composables/useConstellation'

const { currentProfile, restoreSession } = useAuth()
const router = useRouter()

import ConstellationHero from '~/components/tools/constellation/Hero.vue'
import HoroscopePanel from '~/components/tools/constellation/HoroscopePanel.vue'
import YiJiPanel from '~/components/tools/constellation/YiJiPanel.vue'
import ConstellationNav from '~/components/tools/constellation/Nav.vue'
import FortuneBars from '~/components/tools/FortuneBars.vue'
import InkDivider from '~/components/tools/InkDivider.vue'
import ToolPageLayout from '~/components/tools/ToolPageLayout.vue'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import SkeletonBars from '~/components/tools/SkeletonBars.vue'

const result = ref<ConstellationResult | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const selectedZodiac = ref(0)
const loadingTimer = ref<ReturnType<typeof setTimeout> | null>(null)

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

onUnmounted(() => {
  if (loadingTimer.value) clearTimeout(loadingTimer.value)
})

function computeResult() {
  if (!currentProfile.value?.birth_date) return
  loading.value = true

  const [, month, day] = currentProfile.value.birth_date.split('-').map(Number)

  if (loadingTimer.value) clearTimeout(loadingTimer.value)
  loadingTimer.value = setTimeout(() => {
    result.value = calculateConstellation(month, day, new Date())
    selectedZodiac.value = getZodiacIndex(month, day)
    loading.value = false
  }, 200)
}

function selectZodiac(index: number) {
  selectedZodiac.value = index
  loading.value = true

  if (loadingTimer.value) clearTimeout(loadingTimer.value)
  loadingTimer.value = setTimeout(() => {
    result.value = calculateConstellation(
      ZODIACS[index].startMonth,
      ZODIACS[index].startDay,
      new Date()
    )
    loading.value = false
  }, 200)
}

const currentYear = computed(() => new Date().getFullYear())

function compatibilityBadgeClass(level: string): string {
  return level === 'great'
    ? 'bg-wuxing-wood/10 text-wuxing-wood'
    : level === 'good'
      ? 'bg-compat-good/10 text-gold'
      : 'bg-cinnabar/5 text-cinnabar/80'
}

function compatibilityBorderClass(level: string): string {
  return level === 'great'
    ? 'hover:border-compat-great'
    : level === 'good'
      ? 'hover:border-compat-good'
      : 'hover:border-cinnabar/30'
}
</script>

<template>
  <div class="ink-wash-bg min-h-screen">
    <div class="relative z-10">
      <ToolPageLayout>
        <template #nav>
          <ConstellationNav
            :currentIndex="selectedZodiac"
            @select="selectZodiac"
          />
        </template>
        <template #mobile-nav>
          <button
            v-for="(name, idx) in ['白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯','水瓶','双鱼']"
            :key="idx"
            @click="selectZodiac(idx)"
            :aria-current="idx === selectedZodiac ? 'true' : undefined"
            :class="[
              'flex-shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors',
              idx === selectedZodiac ? 'bg-cinnabar/10 text-cinnabar' : 'text-ink-medium hover:bg-paper-medium/50',
            ]"
          >
            {{ name }}
          </button>
        </template>

        <!-- Missing birth info -->
        <div v-if="missingBirthInfo" class="text-center py-16">
          <p class="font-sans text-lg text-ink-medium mb-4">请先完善出生信息</p>
          <p class="font-sans text-sm text-ink-light mb-6">需要填写出生日期以计算星座运势</p>
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
          <ConstellationHero :result="result" />
          <HoroscopePanel :horoscope="result.todayHoroscope" />

          <YiJiPanel :yi="result.todayYi" :ji="result.todayJi" />

          <!-- Personality -->
          <div class="fade-in mb-6" :style="{ '--delay': '0.35s' }">
            <InkDivider>性格特征</InkDivider>
            <div class="card-paper-solid rounded-xl p-5">
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                {{ result.personality }}
              </p>
            </div>
          </div>

          <!-- Compatibility -->
          <div class="fade-in mb-6" :style="{ '--delay': '0.45s' }">
            <InkDivider>速配星座</InkDivider>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                v-for="item in result.compatibility"
                :key="item.name"
                class="card-paper-solid rounded-xl p-3 sm:p-4 text-center transition-all duration-300 cursor-default hover:-translate-y-0.5"
                :class="compatibilityBorderClass(item.level)"
                :title="item.label"
              >
                <div class="text-2xl sm:text-3xl mb-1" aria-hidden="true">{{ item.symbol }}</div>
                <div class="font-display text-base text-ink-dark">{{ item.name }}</div>
                <span
                  class="inline-block mt-1 px-2 py-0.5 rounded text-[0.625rem] font-sans tracking-wider"
                  :class="compatibilityBadgeClass(item.level)"
                >
                  {{ item.label }}
                </span>
              </div>
            </div>
          </div>

          <!-- Refresh button -->
          <div class="flex flex-wrap gap-3 justify-center mt-8">
            <button @click="computeResult" class="btn-seal">
              <span>🔄 刷新运势</span>
            </button>
          </div>
        </template>
      </ToolPageLayout>
    </div>
  </div>
</template>
