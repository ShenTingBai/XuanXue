<script setup lang="ts">
import InkDivider from '~/components/tools/InkDivider.vue'

useHead({ title: '玄学 - 命理推演 · 知己知天' })

const { restoreSession, currentProfile } = useAuth()
const greeting = useGreeting()
const router = useRouter()

interface Tool {
  id: string
  name: string
  char: string
  description: string
  landingDescription: string
  route: string
  available: boolean
  accent?: string
}

const tools: Tool[] = [
  {
    id: 'bazi', name: '八字', char: '命',
    description: '了解你的先天命格、性格特质和人生大运',
    landingDescription: '观四柱八字，洞悉先天命格与人生起伏',
    route: '/tools/bazi', available: true, accent: '#C62828',
  },
  {
    id: 'yijing', name: '六爻', char: '卦',
    description: '针对具体问题（事业、感情、决策）获得卦象指引',
    landingDescription: '卜问一事一情，卦象指引抉择方向',
    route: '/tools/yijing', available: true, accent: '#2C5F7C',
  },
  {
    id: 'shengxiao', name: '生肖', char: '肖',
    description: '查看你的生肖性格、幸运元素和年度运势',
    landingDescription: '察生肖本性，知流年吉凶与幸运所向',
    route: '/tools/shengxiao', available: true, accent: '#3D6B4B',
  },
  {
    id: 'constellation', name: '星座', char: '星',
    description: '查看你的星座特征、今日宜忌和配对分析',
    landingDescription: '探星盘轨迹，明今日宜忌与缘分深浅',
    route: '/tools/constellation', available: true, accent: '#7A5E12',
  },
  {
    id: 'ziwei', name: '紫微斗数', char: '斗',
    description: '十二宫精批 ・ 星曜解读 ・ 即将上线',
    landingDescription: '排十二宫垣，解星曜布局与穷通祸福',
    route: '/tools/ziwei', available: false, accent: '#6B5B4F',
  },
]

const sessionReady = ref(false)

onMounted(() => {
  restoreSession()
  sessionReady.value = true
})

const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen relative">
    <!-- ═══ Loading Skeleton ═══ -->
    <div v-if="!sessionReady" class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
      <div class="space-y-6">
        <div class="mb-12 sm:mb-16">
          <div class="skeleton-pulse h-12 w-64 mb-3 rounded" />
          <div class="skeleton-pulse h-5 w-48 mb-8 rounded" />
          <div class="skeleton-pulse h-px w-44 rounded" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <div v-for="n in 5" :key="n" class="rounded-xl p-6 sm:p-7 border border-paper-dark/30 bg-paper-lightest/50">
            <div class="flex items-start gap-4">
              <div class="skeleton-pulse w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex-shrink-0" />
              <div class="min-w-0 flex-1 space-y-2">
                <div class="skeleton-pulse h-6 w-20 rounded" />
                <div class="skeleton-pulse h-4 w-full rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════ -->
    <!--  LANDING PAGE — Unauthenticated    -->
    <!-- ════════════════════════════════════ -->
    <template v-if="sessionReady && !currentProfile">
      <div class="relative z-10">
        <!-- ── Hero Section ── -->
        <section
          class="relative overflow-hidden"
          aria-labelledby="hero-heading"
        >
          <!-- Watermark character -->
          <span
            class="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
            aria-hidden="true"
          >
            <span class="font-display text-[14rem] sm:text-[20rem] lg:text-[26rem] leading-none opacity-[0.025] text-ink-dark">
              玄
            </span>
          </span>

          <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
            <div class="flex flex-col items-center text-center max-w-xl mx-auto">
              <!-- Seal mark -->
              <div
                class="fade-in mb-8"
                :style="{ '--delay': '0.05s' }"
              >
                <span
                  class="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 border-2 border-cinnabar rounded-full font-display text-2xl sm:text-3xl text-cinnabar"
                  style="transform: rotate(-3deg)"
                  aria-hidden="true"
                >
                  玄
                </span>
              </div>

              <!-- Title -->
              <h1
                id="hero-heading"
                class="fade-in font-display text-5xl sm:text-6xl lg:text-7xl text-ink-dark leading-tight tracking-wide mb-6"
                :style="{ '--delay': '0.1s' }"
              >
                玄学
              </h1>

              <!-- Tagline -->
              <p
                class="fade-in font-sans text-sm sm:text-base text-ink-medium tracking-[0.25em] mb-8"
                :style="{ '--delay': '0.15s' }"
              >
                命理推演 · 知己知天
              </p>

              <!-- Description -->
              <p
                class="fade-in font-sans text-sm sm:text-base text-ink-light/90 leading-relaxed max-w-md mb-10"
                :style="{ '--delay': '0.2s' }"
              >
                融汇八字、六爻、紫微、生肖、星座诸法，<br class="hidden sm:block" />
                以传统命理智慧，助你洞见自我、趋吉避凶。
              </p>

              <!-- CTA Button -->
              <div
                class="fade-in mb-8"
                :style="{ '--delay': '0.25s' }"
              >
                <button
                  class="btn-seal"
                  @click="goToLogin"
                >
                  <span>开 始 推 演</span>
                </button>
              </div>

              <!-- Login hint -->
              <p
                class="fade-in font-sans text-xs text-ink-medium/70"
                :style="{ '--delay': '0.3s' }"
              >
                已有档案？
                <NuxtLink to="/login" class="text-cinnabar hover:underline transition-colors">
                  去登录
                </NuxtLink>
              </p>
            </div>
          </div>
        </section>

        <!-- ── Decorative Divider ── -->
        <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 relative z-10" aria-hidden="true">
          <!-- Ink branch -->
          <div class="fade-in mb-4" :style="{ '--delay': '0.35s' }">
            <div class="ink-branch">
              <div class="ink-branch__main" />
              <div class="ink-branch__twig ink-branch__twig--top" />
              <div class="ink-branch__twig ink-branch__twig--bottom" />
              <div class="ink-branch__twig ink-branch__twig--far" />
              <div class="ink-branch__dot ink-branch__dot--near" />
              <div class="ink-branch__dot ink-branch__dot--mid" />
              <div class="ink-branch__dot ink-branch__dot--far" />
            </div>
          </div>

          <!-- Section heading -->
          <div
            class="fade-in flex items-center justify-center gap-3 mb-10 sm:mb-14"
            :style="{ '--delay': '0.38s' }"
          >
            <span class="seal-mark w-6 h-6 text-[0.6rem]" aria-hidden="true">术</span>
            <h2 class="font-display text-2xl sm:text-3xl text-ink-dark tracking-wider">
              推演之术
            </h2>
            <span class="seal-mark w-6 h-6 text-[0.6rem]" aria-hidden="true">法</span>
          </div>
        </div>

        <!-- ── Tool Cards Grid ── -->
        <section
          class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 lg:pb-32 relative z-10"
          aria-label="命理工具"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <!-- Available tools -->
            <NuxtLink
              v-for="(tool, index) in tools.filter(t => t.available)"
              :key="tool.id"
              :to="tool.route"
              :aria-label="'探索' + tool.name"
              :class="[
                'tool-card rounded-xl p-6 sm:p-7 block no-underline',
                'fade-in',
                'tool-card--active'
              ]"
              :style="{ '--delay': `${0.4 + index * 0.1}s`, '--accent': tool.accent || '#C62828' }"
            >
              <div class="card-accent" aria-hidden="true" />
              <div class="flex items-start gap-4">
                <span class="card-icon card-icon--active">
                  {{ tool.char }}
                </span>
                <div class="min-w-0 flex-1">
                  <h3 class="font-display text-xl sm:text-2xl text-ink-dark leading-tight mb-1.5">
                    {{ tool.name }}
                  </h3>
                  <p class="font-sans text-sm text-ink-medium/80 leading-relaxed">
                    {{ tool.landingDescription }}
                  </p>
                </div>
              </div>
              <div class="card-enter-hint" aria-hidden="true">
                <span class="enter-arrow">&rarr;</span>
              </div>
            </NuxtLink>

            <!-- Locked tool -->
            <div
              v-for="(tool, index) in tools.filter(t => !t.available)"
              :key="tool.id"
              :aria-label="tool.name + '（即将推出）'"
              aria-disabled="true"
              :class="[
                'tool-card rounded-xl p-6 sm:p-7',
                'fade-in',
                'tool-card--locked'
              ]"
              :style="{ '--delay': `${0.4 + tools.filter(t => t.available).length * 0.1 + index * 0.1}s`, '--accent': tool.accent || '#C62828' }"
            >
              <div class="card-accent" aria-hidden="true" />
              <div class="flex items-start gap-4">
                <span class="card-icon card-icon--locked">
                  {{ tool.char }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 mb-1.5">
                    <h3 class="font-display text-xl sm:text-2xl text-ink-dark leading-tight">
                      {{ tool.name }}
                    </h3>
                    <span class="px-2 py-0.5 rounded text-[0.6rem] tracking-wider font-sans text-ink-muted border border-paper-dark bg-paper-medium/50">
                      即将推出
                    </span>
                  </div>
                  <p class="font-sans text-sm text-ink-medium/80 leading-relaxed">
                    {{ tool.landingDescription }}
                  </p>
                </div>
              </div>
              <div class="locked-stamp" aria-hidden="true">
                <span>启</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <!-- ════════════════════════════════════ -->
    <!--  NAVIGATION — Authenticated        -->
    <!-- ════════════════════════════════════ -->
    <template v-if="sessionReady && currentProfile">
      <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
        <!-- ── Greeting ── -->
        <div class="mb-12 sm:mb-16 fade-in" :style="{ '--delay': '0.02s' }">
          <div class="flex flex-col items-start gap-3">
            <div class="flex items-center gap-4">
              <span class="hidden sm:block w-6 h-px bg-gradient-to-r from-cinnabar/40 to-transparent" aria-hidden="true" />
              <h1 class="font-display text-4xl sm:text-5xl text-ink-dark leading-tight tracking-wide">
                {{ greeting.prefix }}，<span class="text-cinnabar">{{ currentProfile.nickname }}</span>
              </h1>
            </div>
            <div class="flex items-center gap-3 ml-0 sm:ml-10">
              <span class="seal-mark w-7 h-7 text-[9px]">玄</span>
              <p class="font-sans text-sm sm:text-base text-ink-light tracking-wider leading-relaxed">
                {{ greeting.subtitle }}
              </p>
            </div>
          </div>
          <div class="mt-6 sm:mt-8 relative overflow-hidden" aria-hidden="true">
            <div class="ink-branch">
              <div class="ink-branch__main" />
              <div class="ink-branch__twig ink-branch__twig--top" />
              <div class="ink-branch__twig ink-branch__twig--bottom" />
              <div class="ink-branch__twig ink-branch__twig--far" />
              <div class="ink-branch__dot ink-branch__dot--near" />
              <div class="ink-branch__dot ink-branch__dot--mid" />
              <div class="ink-branch__dot ink-branch__dot--far" />
            </div>
          </div>
        </div>

        <!-- ── Ink Divider with Seal Mark ── -->
        <div class="mb-8 sm:mb-12 fade-in" :style="{ '--delay': '0.15s' }" aria-hidden="true">
          <div class="flex items-center justify-center gap-3 mb-2">
            <span class="seal-mark w-6 h-6 text-[0.6rem]" aria-hidden="true">术</span>
            <InkDivider>命理推演</InkDivider>
            <span class="seal-mark w-6 h-6 text-[0.6rem]" aria-hidden="true">法</span>
          </div>
        </div>

        <!-- ── Tool Grid ── -->
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
            :style="{ '--delay': `${(index + 1) * 0.12}s`, '--accent': tool.accent || '#C62828' }"
          >
            <div class="card-accent" aria-hidden="true" />
            <div class="flex items-start gap-4">
              <span class="card-icon card-icon--active">
                {{ tool.char }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1.5">
                  <h3 class="font-display text-xl sm:text-2xl text-ink-dark leading-tight">{{ tool.name }}</h3>
                </div>
                <p class="font-sans text-sm text-ink-medium/80 leading-relaxed">
                  {{ tool.description }}
                </p>
              </div>
            </div>
            <div class="card-enter-hint" aria-hidden="true">
              <span class="enter-arrow">&rarr;</span>
            </div>
          </NuxtLink>

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
            :style="{ '--delay': `${(tools.filter(t => t.available).length + index + 1) * 0.12}s`, '--accent': tool.accent || '#C62828' }"
          >
            <div class="card-accent" aria-hidden="true" />
            <div class="flex items-start gap-4">
              <span class="card-icon card-icon--locked">
                {{ tool.char }}
              </span>
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
            <div class="locked-stamp" aria-hidden="true">
              <span>启</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
