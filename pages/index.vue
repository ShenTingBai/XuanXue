<script setup lang="ts">
import { getMonthPillar } from '~/composables/useSolarTerms'
import { Lunar } from 'lunar-javascript'
import { STEMS, BRANCHES } from '~/constants/bazi'
import { WUXING_COLORS, WUXING_FALLBACK_COLOR, getStemIndex, getNayinWuxing } from '~/constants/bazi'
import { calculateBaZi } from '~/composables/useBaZi'
import { calculateShenSha } from '~/composables/useShenSha'
import DailyFortuneStick from '~/components/home/DailyFortuneStick.vue'
import { formatRelativeTime } from '~/utils/date'
import { getDailyWuxing } from '~/composables/useDailyWuxing'

const SOLAR_TERM_NAMES = [
  '立春',
  '惊蛰',
  '清明',
  '立夏',
  '芒种',
  '小暑',
  '立秋',
  '白露',
  '寒露',
  '立冬',
  '大雪',
  '小寒',
]

useHead({ title: '玄·道 — 玄天机 · 道命理' })

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
  trigram?: string
}

const tools: Tool[] = [
  {
    id: 'bazi',
    name: '八字',
    char: '命',
    description: '了解你的先天命格、性格特质和人生大运',
    route: '/tools/bazi',
    available: true,
    accent: '#C62828',
    trigram: '☰',
  },
  {
    id: 'yijing',
    name: '六爻',
    char: '卦',
    description: '针对具体问题（事业、感情、决策）获得卦象指引',
    route: '/tools/yijing',
    available: true,
    accent: '#2C5F7C',
    trigram: '☵',
  },
  {
    id: 'shengxiao',
    name: '生肖',
    char: '肖',
    description: '查看你的生肖性格、幸运元素和年度运势',
    route: '/tools/shengxiao',
    available: true,
    accent: '#3D6B4B',
    trigram: '☷',
  },
  {
    id: 'constellation',
    name: '星座',
    char: '星',
    description: '查看你的星座特征、今日宜忌和配对分析',
    route: '/tools/constellation',
    available: true,
    accent: '#7A5E12',
    trigram: '☲',
  },
  {
    id: 'ziwei',
    name: '紫微斗数',
    char: '斗',
    description: '天星回宫 ・ 十二宫精批 ・ 星曜解读 ・ 大限流年',
    route: '/tools/ziwei',
    available: true,
    accent: '#6B5B4F',
    trigram: '☴',
  },
  {
    id: 'hehun',
    name: '合婚',
    char: '合',
    description: '双方八字合婚匹配分析，了解姻缘深浅',
    route: '/tools/hehun',
    available: true,
    accent: '#C62828',
    trigram: '⚢',
  },
  {
    id: 'name-test',
    name: '姓名',
    char: '名',
    description: '五格剖象姓名分析，了解名字的吉凶数理',
    route: '/tools/name-test',
    available: true,
    accent: '#2C5F7C',
    trigram: '⚣',
  },
  {
    id: 'cezi',
    name: '测字',
    char: '测',
    description: '一字一世界，拆解字形探玄机，笔画之间见乾坤',
    route: '/tools/cezi',
    available: true,
    accent: '#5E5E5E',
    trigram: '☰',
  },
  {
    id: 'zeji',
    name: '择日',
    char: '择',
    description: '黄历择吉，结合建除十二星与二十八宿，为重要事项挑选良辰吉日',
    route: '/tools/zeji',
    available: true,
    accent: '#C62828',
    trigram: '☲',
  },
]

const sessionReady = ref(false)

// ── Recent Activity ──
interface RecentItem {
  id: number
  type: string
  created_at: string
  relativeTime: string
  icon: string
  route: string
}

const recentActivity = ref<RecentItem[]>([])
const recentLoading = ref(false)

const toolTypeMap: Record<string, { icon: string; route: string }> = {
  bazi: { icon: '命', route: '/tools/bazi' },
  shengxiao: { icon: '肖', route: '/tools/shengxiao' },
  constellation: { icon: '星', route: '/tools/constellation' },
  yijing: { icon: '卦', route: '/tools/yijing' },
  ziwei: { icon: '斗', route: '/tools/ziwei' },
  hehun: { icon: '合', route: '/tools/hehun' },
  'name-test': { icon: '名', route: '/tools/name-test' },
  cezi: { icon: '测', route: '/tools/cezi' },
  zeji: { icon: '择', route: '/tools/zeji' },
}

async function fetchRecentActivity() {
  if (!import.meta.client) return
  const { getAuthHeaders } = useAuth()
  const headers = getAuthHeaders()
  if (!headers.Authorization) return
  recentLoading.value = true
  try {
    const data = await $fetch<{ id: number; type: string; created_at: string }[]>(
      '/api/divinations',
      {
        headers,
      },
    )
    recentActivity.value = data.slice(0, 5).map(item => {
      const mapped = toolTypeMap[item.type]
      return {
        id: item.id,
        type: item.type,
        created_at: item.created_at,
        relativeTime: formatRelativeTime(item.created_at),
        icon: mapped?.icon || '玄',
        route: mapped?.route || '/',
      }
    })
  } catch {
    // Best-effort — don't show the section if fetch fails
  } finally {
    recentLoading.value = false
  }
}

// ── 今日玄机：实时天文信息 ──
const todayAstro = computed(() => {
  if (!import.meta.client) return null
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const ys = (((y - 4) % 10) + 10) % 10
  const yb = (((y - 4) % 12) + 12) % 12
  const mp = getMonthPillar(y, m, d)
  let termIdx = -1
  for (let i = 0; i < 12; i++) {
    const t = getSolarTerm(y, i)
    if (t.month === m && d >= t.day - 2) termIdx = i
  }
  const lunar = Lunar.fromYmd(y, m, d)
  return {
    lunarMonth: lunar.getMonthInChinese(),
    lunarDay: lunar.getDayInChinese(),
    yearGanZhi: STEMS[ys] + BRANCHES[yb],
    monthGanZhi: mp.stem + mp.branch,
    solarTerm: termIdx >= 0 ? SOLAR_TERM_NAMES[termIdx] : null,
    weekday: ['日', '一', '二', '三', '四', '五', '六'][now.getDay()],
    dateStr: `${y}年${m}月${d}日`,
  }
})

// ── 命盘预览：示例八字数据 ──
const sampleInput = {
  birthYear: 1990,
  birthMonth: 5,
  birthDay: 15,
  birthHour: 11,
  birthCalendar: 'solar' as const,
  gender: '男' as const,
}

const sampleBaZi = computed(() => {
  try {
    return calculateBaZi(sampleInput)
  } catch {
    return null
  }
})

const sampleShenSha = computed(() => {
  if (!sampleBaZi.value) return []
  const { yearPillar, monthPillar, dayPillar, hourPillar, dayMaster } = sampleBaZi.value
  return calculateShenSha({
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar: hourPillar ?? null,
    dayMaster,
    dayMasterIndex: getStemIndex(dayPillar.stem),
    gender: '男',
  })
})

// Prominent shensha for display (deduplicated, notable ones)
const prominentShenSha = computed(() => {
  const notable = ['天乙贵人', '文昌贵人', '福星贵人', '太极贵人', '禄神', '桃花', '华盖']
  const seen = new Set<string>()
  return sampleShenSha.value.filter(s => {
    if (!notable.includes(s.name) || seen.has(s.name)) return false
    seen.add(s.name)
    return true
  })
})

const samplePillars = computed(() => {
  if (!sampleBaZi.value) return []
  const labels = ['年柱', '月柱', '日柱', '时柱']
  const pillars = [
    sampleBaZi.value.yearPillar,
    sampleBaZi.value.monthPillar,
    sampleBaZi.value.dayPillar,
    sampleBaZi.value.hourPillar,
  ]
  return pillars
    .map((p, i) => ({ label: labels[i], data: p }))
    .filter((p): p is { label: string; data: NonNullable<typeof p.data> } => p.data !== null)
})

const dailyWuxing = computed(() => getDailyWuxing())

onMounted(() => {
  restoreSession()
  sessionReady.value = true
  if (currentProfile.value) {
    fetchRecentActivity()
  }
})

// Refresh recent activity each time user navigates back to home
const route = useRoute()
watch(
  () => route.path,
  path => {
    if (path === '/' && currentProfile.value) {
      fetchRecentActivity()
    }
  },
)

const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen relative">
    <!-- ═══ Loading Skeleton ═══ -->
    <div
      v-if="!sessionReady"
      class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10"
    >
      <div class="space-y-6">
        <div class="mb-12 sm:mb-16">
          <div class="skeleton-pulse h-12 w-64 mb-3 rounded" />
          <div class="skeleton-pulse h-5 w-48 mb-8 rounded" />
          <div class="skeleton-pulse h-px w-44 rounded" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <div v-for="n in 5" :key="n" class="tool-card rounded-xl p-6 sm:p-7">
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
        <!-- ── Hero ── -->
        <section class="relative overflow-hidden" aria-labelledby="hero-heading">
          <div
            class="relative"
            style="
              background:
                radial-gradient(
                  ellipse 50% 40% at 70% 25%,
                  rgba(156, 26, 28, 0.02) 0%,
                  transparent 60%
                ),
                radial-gradient(
                  ellipse 35% 30% at 20% 75%,
                  rgba(44, 26, 14, 0.015) 0%,
                  transparent 50%
                );
            "
          >
            <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
              <div class="flex flex-col items-center text-center max-w-2xl mx-auto">
                <!-- Stamp -->
                <div class="anim-rise mb-8">
                  <span class="seal-icon seal-icon--hero" aria-hidden="true">玄</span>
                </div>

                <!-- Title -->
                <h1 id="hero-heading" class="anim-rise anim-delay-1 font-display hero-title">
                  玄<span class="title-dot"></span>道<span class="title-dot"></span
                  ><span class="text-cinnabar-deeper">知天命</span>
                </h1>

                <!-- Incantation -->
                <div class="hero-incant anim-rise anim-delay-2">
                  <span class="hero-incant__line">{{
                    tools
                      .filter(t => t.available)
                      .slice(0, 5)
                      .map(t => t.name)
                      .join(' · ')
                  }}</span>
                  <span class="hero-incant__divider"></span>
                  <span class="hero-incant__line">中式命理，一应俱全</span>
                </div>

                <!-- CTA -->
                <div class="anim-rise anim-delay-4 flex gap-4 mt-10">
                  <button class="btn-cin" @click="goToLogin">开始推演</button>
                  <NuxtLink to="/login" class="btn-ink no-underline"> 已有档案 </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── 何为命理 ── -->
        <section
          class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
          aria-label="何为命理"
        >
          <div class="section-header">
            <h2>何 为 命 理</h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            <div class="card-warm rounded-xl p-8 text-center anim-rise" style="--delay: 0.05s">
              <span class="seal-icon seal-icon--lg mb-4" aria-hidden="true">古</span>
              <h3 class="font-display text-lg text-ink-dark mb-3 tracking-[0.15em]">古法传承</h3>
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                基于《三命通会》《渊海子平》《易经》等经典古籍，延续千年命理推算体系。
              </p>
            </div>
            <div class="card-warm rounded-xl p-8 text-center anim-rise" style="--delay: 0.15s">
              <span class="seal-icon seal-icon--lg mb-4" aria-hidden="true">全</span>
              <h3 class="font-display text-lg text-ink-dark mb-3 tracking-[0.15em]">一应俱全</h3>
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                四柱八字、紫微斗数、六爻占卜、生肖星座、姓名测字——命理之术，尽汇于此。
              </p>
            </div>
            <div class="card-warm rounded-xl p-8 text-center anim-rise" style="--delay: 0.25s">
              <span class="seal-icon seal-icon--lg mb-4" aria-hidden="true">简</span>
              <h3 class="font-display text-lg text-ink-dark mb-3 tracking-[0.15em]">即问即答</h3>
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                输入出生年月日时，即刻生成专属命盘。无需等待，一查便知。
              </p>
            </div>
          </div>
        </section>

        <!-- ── 命盘预览 ── -->
        <section
          class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
          aria-label="命盘预览"
        >
          <div class="section-header">
            <h2>命 盘 预 览</h2>
          </div>

          <p class="font-sans text-sm text-ink-medium tracking-[0.15em] text-center mt-2 mb-6">
            示例：1990年5月15日 午时
          </p>

          <div
            v-if="sampleBaZi"
            class="card-warm card-warm--elevated rounded-xl p-8 anim-rise"
          >
            <!-- Four pillars -->
            <div class="grid grid-cols-4 gap-4 sm:gap-6">
              <div
                v-for="pillar in samplePillars"
                :key="pillar.label"
                class="flex flex-col items-center text-center"
              >
                <span class="font-sans text-[0.6875rem] text-ink-light tracking-[0.15em] mb-2">
                  {{ pillar.label }}
                </span>
                <span class="font-display text-2xl text-ink-dark tracking-[0.2em] mb-1">
                  {{ pillar.data.stem }}{{ pillar.data.branch }}
                </span>
                <div class="flex items-center gap-1.5 mb-1">
                  <span
                    class="inline-block w-2.5 h-2.5 rounded-full"
                    :style="{ background: WUXING_COLORS[pillar.data.stemWuxing] || WUXING_FALLBACK_COLOR }"
                    :aria-label="pillar.data.stemWuxing"
                  ></span>
                  <span class="font-sans text-xs text-ink-medium">{{ pillar.data.stemWuxing }}</span>
                </div>
                <span class="font-sans text-[0.6875rem] text-ink-light tracking-[0.1em]">
                  {{ getNayinWuxing(pillar.data.stem, pillar.data.branch) || '—' }}命
                </span>
              </div>
            </div>

            <!-- Divider -->
            <div
              class="my-5 h-px"
              style="background: color-mix(in srgb, var(--color-ink-faint) 50%, transparent)"
              aria-hidden="true"
            ></div>

            <!-- Day master + shensha -->
            <div class="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-6">
              <div class="flex items-center gap-2">
                <span class="font-sans text-sm text-ink-medium">日主：</span>
                <span
                  class="font-display text-lg"
                  :style="{ color: WUXING_COLORS[sampleBaZi.dayMasterWuxing] || WUXING_FALLBACK_COLOR }"
                >
                  {{ sampleBaZi.dayMaster }}{{ sampleBaZi.dayMasterWuxing }}
                </span>
                <span class="font-sans text-sm text-ink-medium">（{{ sampleBaZi.dayMasterStrength }}）</span>
              </div>

              <span
                class="hidden sm:block w-px h-5"
                style="background: color-mix(in srgb, var(--color-ink-faint) 50%, transparent)"
                aria-hidden="true"
              ></span>

              <div v-if="prominentShenSha.length > 0" class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span class="font-sans text-xs text-ink-light tracking-[0.1em]">神煞：</span>
                <span
                  v-for="s in prominentShenSha"
                  :key="s.name"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-sans"
                  :class="s.category === '吉' ? 'text-jade' : s.category === '凶' ? 'text-cinnabar' : 'text-ink-medium'"
                  style="font-size: 0.6875rem; letter-spacing: 0.08em; background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent)"
                >
                  {{ s.name }}
                </span>
              </div>
            </div>

            <!-- Footer note -->
            <p class="mt-5 font-sans text-xs text-ink-light tracking-[0.1em]">
              * 此为示例命盘，
              <NuxtLink to="/login" class="text-cinnabar no-underline hover:underline">登录</NuxtLink>
              后可排自己的盘
            </p>
          </div>
        </section>

        <!-- ── 术数工具 ── -->
        <section
          class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
          aria-label="术数工具"
        >
          <div class="section-header">
            <h2>术 数 工 具</h2>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div
              v-for="tool in tools"
              :key="tool.id"
              :class="['tool-card--new', tool.available ? '' : 'opacity-50 cursor-default']"
              :aria-label="tool.available ? tool.name : tool.name + '（即将推出）'"
              :aria-disabled="tool.available ? undefined : 'true'"
            >
              <span class="tool-card__trigram" aria-hidden="true">{{ tool.trigram || '☰' }}</span>
              <span
                class="seal-icon seal-icon--lg"
                :style="
                  tool.available
                    ? { marginBottom: '20px' }
                    : {
                        marginBottom: '20px',
                        background: 'var(--color-ink-light)',
                        boxShadow: 'none',
                      }
                "
                >{{ tool.char }}</span
              >
              <div
                class="tool-card__name"
                style="
                  font-size: 19px;
                  color: var(--color-ink);
                  letter-spacing: 0.25em;
                  margin-bottom: 8px;
                "
              >
                {{ tool.name }}
              </div>
              <p class="font-sans text-xs text-ink-medium tracking-[0.08em] leading-relaxed">
                {{ tool.description }}
              </p>
            </div>
          </div>

          <div class="text-center mt-8">
            <NuxtLink to="/login" class="btn-cin no-underline inline-flex">
              <span>登录探索全部工具</span>
            </NuxtLink>
          </div>
        </section>

        <!-- ── 三步入门 ── -->
        <section
          class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
          aria-label="如何开始"
        >
          <div class="section-header">
            <h2>如 何 开 始</h2>
          </div>

          <div
            class="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-8 sm:gap-16 mt-6"
          >
            <div
              class="flex flex-col items-center text-center max-w-[12rem] anim-rise"
              style="--delay: 0.05s"
            >
              <span
                class="seal-icon seal-icon--lg mb-4"
                aria-hidden="true"
                style="font-family: var(--font-display)"
                >壹</span
              >
              <h3 class="font-display text-base text-ink-dark mb-2 tracking-[0.15em]">填写出生</h3>
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                输入你的出生年月日时，只需一次。
              </p>
            </div>

            <div class="hidden sm:flex items-center pt-10" aria-hidden="true">
              <svg
                class="w-6 h-6 text-ink-faint/30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <div
              class="flex flex-col items-center text-center max-w-[12rem] anim-rise"
              style="--delay: 0.15s"
            >
              <span
                class="seal-icon seal-icon--lg mb-4"
                aria-hidden="true"
                style="font-family: var(--font-display)"
                >贰</span
              >
              <h3 class="font-display text-base text-ink-dark mb-2 tracking-[0.15em]">即刻排盘</h3>
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                系统自动推算四柱八字、紫微命盘、星盘轨迹。
              </p>
            </div>

            <div class="hidden sm:flex items-center pt-10" aria-hidden="true">
              <svg
                class="w-6 h-6 text-ink-faint/30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <div
              class="flex flex-col items-center text-center max-w-[12rem] anim-rise"
              style="--delay: 0.25s"
            >
              <span
                class="seal-icon seal-icon--lg mb-4"
                aria-hidden="true"
                style="font-family: var(--font-display)"
                >叁</span
              >
              <h3 class="font-display text-base text-ink-dark mb-2 tracking-[0.15em]">解读天命</h3>
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                查看运势分析、神煞流年、五行喜忌，洞察人生玄机。
              </p>
            </div>
          </div>
        </section>

        <!-- ── 分割线 + CTA ── -->
        <section class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div class="divider-seal mb-10">
            <span class="divider-seal__line" aria-hidden="true"></span>
            <span
              class="seal-icon"
              style="width: 26px; height: 26px; font-size: 10px"
              aria-hidden="true"
              >玄</span
            >
            <span class="divider-seal__word">玄·道</span>
            <span
              class="seal-icon"
              style="width: 26px; height: 26px; font-size: 10px"
              aria-hidden="true"
              >道</span
            >
            <span class="divider-seal__line" aria-hidden="true"></span>
          </div>

          <div class="flex justify-center gap-4 flex-wrap">
            <button class="btn-cin" @click="goToLogin">开始推演</button>
            <NuxtLink to="/login" class="btn-ink no-underline">浏览命盘</NuxtLink>
          </div>
        </section>
      </div>
    </template>

    <!-- ════════════════════════════════════ -->
    <!--  AUTHENTICATED                      -->
    <!-- ════════════════════════════════════ -->
    <template v-if="sessionReady && currentProfile">
      <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
        <!-- ═══ Left/Right 50/50: Greeting + 今日玄机 ✦ 今日命签 ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-12 sm:mb-16">
          <!-- ── Left column: Greeting (top) + Today's Mystery (bottom), equal height ── -->
          <div class="flex flex-col gap-4 sm:gap-6">
            <!-- Top half: Greeting -->
            <div class="flex-1 min-h-0 anim-rise">
              <div class="flex flex-col items-start justify-center h-full gap-2 sm:gap-3">
                <div class="flex items-center gap-3 sm:gap-4">
                  <span
                    class="hidden sm:block w-6 h-px flex-shrink-0"
                    style="
                      background: linear-gradient(to right, rgba(156, 26, 28, 0.4), transparent);
                    "
                    aria-hidden="true"
                  />
                  <h1
                    class="font-display text-3xl sm:text-4xl lg:text-5xl"
                    style="color: var(--color-ink); letter-spacing: 0.05em"
                  >
                    {{ greeting.prefix }}，<span class="text-cinnabar-deeper">{{
                      currentProfile.nickname
                    }}</span>
                  </h1>
                  <!-- 岁次 seal -->
                  <span
                    class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[0.6875rem] tracking-[0.15em] text-ink-medium/60 border border-ink-faint/20 font-sans"
                    style="transform: rotate(-1deg)"
                    >{{ todayAstro?.yearGanZhi || '' }}</span
                  >
                </div>
                <div class="flex items-center gap-3 ml-0 sm:ml-10">
                  <span
                    class="seal-icon"
                    style="width: 26px; height: 26px; font-size: 10px; border-radius: 3px"
                    aria-hidden="true"
                    >玄</span
                  >
                  <p
                    class="ui"
                    style="font-size: 13px; color: var(--color-ink-light); letter-spacing: 0.15em"
                  >
                    {{ greeting.subtitle }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Bottom half: 今日玄机 -->
            <div class="flex-1 min-h-0 anim-rise" style="--delay: 0.1s">
              <div
                class="talisman-card h-full flex flex-col items-center justify-center text-center"
                aria-label="今日黄历"
              >
                <span
                  class="absolute top-3 left-3 text-[1rem] opacity-15"
                  style="color: #c62828"
                  aria-hidden="true"
                  >☰</span
                >
                <span
                  class="absolute top-3 right-3 text-[1rem] opacity-15"
                  style="color: #c62828"
                  aria-hidden="true"
                  >☷</span
                >
                <template v-if="todayAstro">
                  <span class="talisman-seal--sm mb-2" aria-hidden="true">玄</span>
                  <p class="talisman-lunar-date">
                    {{ todayAstro.lunarMonth }}月{{ todayAstro.lunarDay }}
                  </p>
                  <p class="talisman-gregorian">
                    {{ todayAstro.dateStr }} · 星期{{ todayAstro.weekday }}
                  </p>
                  <div class="flex items-center justify-center gap-3 mb-1.5">
                    <span class="talisman-ganzhi">{{ todayAstro.yearGanZhi }}年</span>
                    <span class="w-px h-2 bg-ink-faint/20" aria-hidden="true"></span>
                    <span class="talisman-ganzhi">{{ todayAstro.monthGanZhi }}月</span>
                  </div>
                  <div v-if="todayAstro.solarTerm" class="talisman-term-badge">
                    · {{ todayAstro.solarTerm }} ·
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- ── Right column: Fortune stick, full height ── -->
          <div class="anim-rise" style="--delay: 0.2s">
            <DailyFortuneStick tall class="w-full h-full" />
          </div>
        </div>


        <!-- 五行穿衣指南 -->
        <div class="daily-wuxing mt-6 card-warm p-6 anim-rise" style="--delay: 0.3s">
          <div class="section-header">
            <h2>今 日 穿 衣</h2>
          </div>
          <p class="text-sm text-ink/50 mb-3">
            今日{{ dailyWuxing.dayStem }}日（{{ dailyWuxing.dayWuxing }}），宜着：
          </p>
          <div class="flex gap-2 flex-wrap">
            <span v-for="color in dailyWuxing.luckyColorNames" :key="color"
              class="px-3 py-1 rounded-full text-sm bg-cinnabar/10 text-cinnabar">
              {{ color }}
            </span>
          </div>
          <p class="text-xs text-ink/30 mt-2">
            避：{{ dailyWuxing.avoidColorNames.join('、') }}
          </p>
        </div>

        <!-- Section header -->
        <div class="section-header anim-rise anim-delay-1">
          <h2>推 演 工 具</h2>
        </div>

        <!-- Tool grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <NuxtLink
            v-for="(tool, index) in tools.filter(t => t.available)"
            :key="tool.id"
            :to="tool.route"
            :aria-label="'打开' + tool.name + '工具'"
            class="tool-card--new block no-underline group anim-rise"
            :class="'anim-delay-' + (index + 1)"
          >
            <span class="tool-card__trigram" aria-hidden="true">{{ tool.trigram || '☰' }}</span>
            <span class="seal-icon seal-icon--lg" style="margin-bottom: 16px">{{ tool.char }}</span>
            <div
              class="tool-card__name"
              style="
                font-size: 19px;
                color: var(--color-ink);
                letter-spacing: 0.25em;
                margin-bottom: 4px;
              "
            >
              {{ tool.name }}
            </div>
            <p
              class="ui"
              style="
                font-size: 12px;
                color: var(--color-ink-light);
                letter-spacing: 0.08em;
                line-height: 1.6;
              "
            >
              {{ tool.description }}
            </p>
          </NuxtLink>

          <div
            v-for="(tool, index) in tools.filter(t => !t.available)"
            :key="tool.id"
            :aria-label="tool.name + '（即将上线）'"
            aria-disabled="true"
            class="tool-card--new opacity-50 cursor-default anim-rise"
            :class="'anim-delay-' + (tools.filter(t => t.available).length + index + 1)"
          >
            <span class="tool-card__trigram" aria-hidden="true">{{ tool.trigram || '☰' }}</span>
            <span
              class="seal-icon seal-icon--lg"
              style="margin-bottom: 16px; background: var(--color-ink-light); box-shadow: none"
              >{{ tool.char }}</span
            >
            <div
              class="tool-card__name"
              style="
                font-size: 19px;
                color: var(--color-ink);
                letter-spacing: 0.25em;
                margin-bottom: 4px;
              "
            >
              {{ tool.name }}
            </div>
            <p
              class="ui"
              style="
                font-size: 12px;
                color: var(--color-ink-light);
                letter-spacing: 0.08em;
                line-height: 1.6;
              "
            >
              {{ tool.description }}
            </p>
            <span
              class="ui"
              style="
                position: absolute;
                top: 12px;
                right: 12px;
                padding: 2px 8px;
                border-radius: 999px;
                font-size: 9px;
                border: 1px solid rgba(44, 26, 14, 0.08);
                color: var(--color-ink-light);
              "
              >即将推出</span
            >
          </div>
        </div>

        <!-- ═══ 最近使用 ═══ -->
        <section
          v-if="recentActivity.length > 0 || recentLoading"
          class="anim-rise"
          aria-label="最近使用"
        >
          <div class="section-header">
            <h2>最近使用</h2>
          </div>

          <!-- Loading state -->
          <div v-if="recentLoading" class="flex gap-3 overflow-x-auto pb-2">
            <div
              v-for="n in 5"
              :key="n"
              class="flex-shrink-0 w-20 skeleton-pulse h-20 rounded-lg"
            />
          </div>

          <!-- Recent items -->
          <div v-else class="flex gap-3 overflow-x-auto pb-2">
            <NuxtLink
              v-for="item in recentActivity"
              :key="item.id"
              :to="item.route"
              class="flex-shrink-0 card-warm rounded-lg p-3 w-20 flex flex-col items-center gap-1.5 no-underline hover:border-cinnabar/20 transition-all group"
              :aria-label="'最近：' + item.type"
            >
              <span
                class="seal-icon text-xs w-8 h-8 group-hover:bg-cinnabar transition-colors"
                style="border-radius: 0.25rem"
                aria-hidden="true"
                >{{ item.icon }}</span
              >
              <span
                class="text-[0.6875rem] text-ink-medium/70 tracking-[0.08em] leading-tight text-center"
              >
                {{ item.relativeTime }}
              </span>
            </NuxtLink>
          </div>
        </section>

        <!-- Empty state -->
        <div v-if="!recentLoading && recentActivity.length === 0" class="text-center py-8">
          <p class="text-[0.75rem] text-ink-light/60 tracking-[0.1em]">
            暂无记录，开始探索玄学工具吧
          </p>
        </div>
      </div>
    </template>

    <!-- ── Footer (shared by both views) ── -->
    <PageFooter v-if="sessionReady" />
  </div>
</template>

<style scoped>
/* ═══ Hero Title ═══ */
.hero-title {
  font-size: 4.25rem;
  color: var(--color-ink-darkest);
  letter-spacing: 0.3em;
  line-height: 1.2;
  margin-bottom: 0.75rem;
  text-shadow: 0 1px 2px rgba(26, 15, 10, 0.06);
}

/* ═══ 灵符纸卡 ═══ */

.talisman-card {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  padding: 1.75rem 1.5rem;
  text-align: center;
  background: #faf0e0;
  border: 1px solid rgba(198, 40, 40, 0.08);
}
@media (min-width: 640px) {
  .talisman-card {
    padding: 2rem;
  }
}
.talisman-seal--sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 2px;
  background: var(--color-cinnabar);
  transform: rotate(-3deg);
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 0.5rem;
  color: var(--color-paper-lightest);
}
.talisman-lunar-date {
  font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', cursive;
  font-size: 1.75rem;
  color: var(--color-ink-dark);
  letter-spacing: 0.2em;
  margin-bottom: 0.25rem;
}
@media (min-width: 640px) {
  .talisman-lunar-date {
    font-size: 2rem;
  }
}
.talisman-gregorian {
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  letter-spacing: 0.15em;
  margin-bottom: 1.25rem;
}
.talisman-ganzhi {
  font-size: 0.75rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.15em;
}
.talisman-term-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  letter-spacing: 0.15em;
  background: rgba(198, 40, 40, 0.06);
  color: var(--color-cinnabar);
  margin-bottom: 1.25rem;
}
</style>
