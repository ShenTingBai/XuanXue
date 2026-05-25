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
}

const tools: Tool[] = [
  { id: 'shengxiao', name: '生肖', char: '兽', description: '生肖排盘 · 五行性格 · 生肖配对', route: '/tools/shengxiao', available: true },
  { id: 'constellation', name: '星座', char: '辰', description: '十二星座 · 性格特征 · 今日运势', route: '/tools/constellation', available: true },
  { id: 'bazi', name: '八字', char: '命', description: '四柱排盘 · 十神定位 · 五行生克', route: '/tools/bazi', available: true },
  { id: 'yijing', name: '六爻', char: '卦', description: '数字起卦 · 卦象解读 · 吉凶判断', route: '/tools/yijing', available: false },
  { id: 'ziwei', name: '紫微斗数', char: '斗', description: '十二宫排盘 · 星曜分析 · 命盘解读', route: '/tools/ziwei', available: false },
]

onMounted(() => {
  restoreSession()
  if (!currentProfile.value) {
    router.push('/login')
  }
})
</script>

<template>
  <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
    <template v-if="currentProfile">
      <!-- Greeting -->
      <div class="mb-10 sm:mb-14 fade-in">
        <div class="flex items-center gap-3 mb-2">
          <h1 class="font-display text-3xl sm:text-4xl text-ink-dark">
            {{ greeting.prefix }}，{{ currentProfile.nickname }}
          </h1>
          <span class="seal-mark w-7 h-7 text-[9px] hidden sm:flex">安</span>
        </div>
        <p class="font-sans text-ink-medium text-sm sm:text-base tracking-wider">
          {{ greeting.subtitle }}
        </p>
      </div>

      <!-- Tool Grid -->
      <h2 class="sr-only">命理工具</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      <div
        v-for="(tool, index) in tools"
        :key="tool.id"
        :tabindex="tool.available ? 0 : -1"
        :role="tool.available ? 'button' : undefined"
        :aria-label="tool.available ? ('打开' + tool.name + '工具') : (tool.name + '（即将上线）')"
        :aria-disabled="!tool.available || undefined"
                @click="tool.available && router.push(tool.route)"
        @keydown.enter="tool.available && router.push(tool.route)"
        @keydown.space.prevent="tool.available && router.push(tool.route)"
        :class="[
          'tool-card rounded-xl p-6 sm:p-7',
          'fade-in',
          tool.available ? '' : 'tool-card--locked'
        ]"
        :style="{ '--delay': `${(index + 1) * 0.1}s` }"
      >
        <!-- Character icon -->
        <div class="mb-4">
          <span
            :class="[
              'inline-flex items-center justify-center w-12 h-12 rounded-lg text-xl',
              tool.available
                ? 'bg-cinnabar/5 text-cinnabar border border-cinnabar/20'
                : 'bg-paper-medium/50 text-ink-light border border-paper-dark'
            ]"
          >
            {{ tool.char }}
          </span>
        </div>

        <!-- Name & badge -->
        <div class="flex items-center gap-2 mb-2">
          <h3 class="font-display text-xl text-ink-dark">{{ tool.name }}</h3>
          <span
            v-if="!tool.available"
            class="px-2 py-0.5 rounded text-[0.625rem] tracking-wider bg-paper-medium text-ink-medium border border-paper-dark"
          >
            即将上线
          </span>
        </div>

        <!-- Description -->
        <p class="text-sm text-ink-medium leading-relaxed">
          {{ tool.description }}
        </p>

        <!-- Decorative corner (available only) -->
        <div
          v-if="tool.available"
          class="absolute top-0 right-0 w-12 h-12 overflow-hidden"
        >
          <div class="absolute top-0 right-0 w-6 h-6 bg-cinnabar/10 rounded-bl-lg" />
        </div>
      </div>
    </div>
    </template>
  </div>
</template>
