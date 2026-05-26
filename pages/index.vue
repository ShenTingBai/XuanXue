<script setup lang="ts">
useHead({ title: '首页 - 玄学' })

const { restoreSession, currentProfile } = useAuth()
const greeting = useGreeting()
const router = useRouter()

interface Tool {
  id: string
  name: string
  char: string
  description: string
  route: string
  available: boolean
  accent?: string
}

const tools: Tool[] = [
  { id: 'shengxiao', name: '生肖', char: '兽', description: '查看你的生肖性格、幸运元素和年度运势', route: '/tools/shengxiao', available: true, accent: '#3D6B4B' },
  { id: 'constellation', name: '星座', char: '辰', description: '查看你的星座特征、今日宜忌和配对分析', route: '/tools/constellation', available: true, accent: '#7A5E12' },
  { id: 'bazi', name: '八字', char: '命', description: '了解你的先天命格、性格特质和人生大运', route: '/tools/bazi', available: true, accent: '#C62828' },
  { id: 'yijing', name: '六爻', char: '卦', description: '针对具体问题（事业、感情、决策）获得卦象指引', route: '/tools/yijing', available: true, accent: '#2C5F7C' },
  { id: 'ziwei', name: '紫微斗数', char: '斗', description: '十二宫精批 ・ 星曜解读 ・ 即将上线', route: '/tools/ziwei', available: false, accent: '#6B5B4F' },
]

const sessionReady = ref(false)

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
    return
  }
  sessionReady.value = true
})
</script>

<template>
  <div class="min-h-screen relative">
    <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
      <!-- Loading skeleton during session restore -->
      <div v-if="!sessionReady" class="space-y-6">
        <!-- Skeleton greeting -->
        <div class="mb-12 sm:mb-16">
          <div class="skeleton-pulse h-12 w-64 mb-3 rounded"></div>
          <div class="skeleton-pulse h-5 w-48 mb-8 rounded"></div>
          <div class="skeleton-pulse h-px w-44 rounded"></div>
        </div>
        <!-- Skeleton tool cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <div v-for="n in 5" :key="n" class="rounded-xl p-6 sm:p-7 border border-paper-dark/30 bg-paper-lightest/50">
            <div class="flex items-start gap-4">
              <div class="skeleton-pulse w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex-shrink-0"></div>
              <div class="min-w-0 flex-1 space-y-2">
                <div class="skeleton-pulse h-6 w-20 rounded"></div>
                <div class="skeleton-pulse h-4 w-full rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template v-else-if="currentProfile">
        <!-- Greeting: scholarly scroll header -->
        <div class="mb-12 sm:mb-16 fade-in" :style="{ '--delay': '0.02s' }">
          <div class="flex flex-col items-start gap-3">
            <!-- Name line with decorative ink accent -->
            <div class="flex items-center gap-4">
              <span class="hidden sm:block w-6 h-px bg-gradient-to-r from-cinnabar/40 to-transparent" aria-hidden="true"></span>
              <h1 class="font-display text-4xl sm:text-5xl text-ink-dark leading-tight tracking-wide">
                {{ greeting.prefix }}，<span class="text-cinnabar">{{ currentProfile.nickname }}</span>
              </h1>
            </div>

            <!-- Subtitle with seal mark -->
            <div class="flex items-center gap-3 ml-0 sm:ml-10">
              <span class="seal-mark w-7 h-7 text-[9px]">玄</span>
              <p class="font-sans text-sm sm:text-base text-ink-light tracking-wider leading-relaxed">
                {{ greeting.subtitle }}
              </p>
            </div>
          </div>

          <!-- Decorative ink-branch divider -->
          <div class="mt-6 sm:mt-8 relative overflow-hidden" aria-hidden="true">
            <!-- Main branch stroke -->
            <div class="ink-branch">
              <div class="ink-branch__main"></div>
              <!-- Branch offshoots -->
              <div class="ink-branch__twig ink-branch__twig--top"></div>
              <div class="ink-branch__twig ink-branch__twig--bottom"></div>
              <div class="ink-branch__twig ink-branch__twig--far"></div>
              <!-- Tip dots -->
              <div class="ink-branch__dot ink-branch__dot--near"></div>
              <div class="ink-branch__dot ink-branch__dot--mid"></div>
              <div class="ink-branch__dot ink-branch__dot--far"></div>
            </div>
          </div>
        </div>

        <!-- Tool Grid -->
        <h2 class="sr-only">命理工具</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <NuxtLink
            v-for="(tool, index) in tools.filter(t => t.available)"
            :key="tool.id"
            :to="tool.route"
            :aria-label="'打开' + tool.name + '工具'"
            :class="[
              'tool-card rounded-xl p-6 sm:p-7 block no-underline',
              'fade-in',
              'tool-card--active'
            ]"
            :style="{ '--delay': `${(index + 1) * 0.12}s`, '--accent': tool.accent || '#C62828'  }"
          >
            <!-- Decorative top accent bar -->
            <div class="card-accent" aria-hidden="true"></div>

            <div class="flex items-start gap-4">
              <!-- Character icon — larger seal-style badge -->
              <span class="card-icon card-icon--active">
                {{ tool.char }}
              </span>

              <!-- Content -->
              <div class="min-w-0 flex-1">
                <!-- Name -->
                <div class="flex items-center gap-2 mb-1.5">
                  <h3 class="font-display text-xl sm:text-2xl text-ink-dark leading-tight">{{ tool.name }}</h3>
                </div>

                <!-- Description -->
                <p class="font-sans text-sm text-ink-medium/80 leading-relaxed">
                  {{ tool.description }}
                </p>
              </div>
            </div>

            <!-- Available hint: subtle "进入" arrow -->
            <div class="card-enter-hint" aria-hidden="true">
              <span class="enter-arrow">&rarr;</span>
            </div>
          </NuxtLink>

          <!-- Locked tools -->
          <div
            v-for="(tool, index) in tools.filter(t => !t.available)"
            :key="tool.id"
            :aria-label="tool.name + '（即将上线）'"
            aria-disabled="true"
            :class="[
              'tool-card rounded-xl p-6 sm:p-7',
              'fade-in',
              'tool-card--locked'
            ]"
            :style="{ '--delay': `${(tools.filter(t => t.available).length + index + 1) * 0.12}s`, '--accent': tool.accent || '#C62828'  }"
          >
            <!-- Decorative top accent bar -->
            <div class="card-accent" aria-hidden="true"></div>

            <div class="flex items-start gap-4">
              <!-- Character icon -->
              <span class="card-icon card-icon--locked">
                {{ tool.char }}
              </span>

              <!-- Content -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1.5">
                  <h3 class="font-display text-xl sm:text-2xl text-ink-dark leading-tight">{{ tool.name }}</h3>
                  <span class="px-2 py-0.5 rounded text-[0.6rem] tracking-wider font-sans text-ink-muted border border-paper-dark bg-paper-medium/50">
                    即将上线
                  </span>
                </div>

                <p class="font-sans text-sm text-ink-medium/80 leading-relaxed">
                  {{ tool.description }}
                </p>
              </div>
            </div>

            <!-- Locked overlay stamp -->
            <div class="locked-stamp" aria-hidden="true">
              <span>启</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
