<script setup lang="ts">
import { calculateBaZi, type BaZiResult } from '~/composables/useBaZi'
import { getMonthPillar } from '~/composables/useSolarTerms'
import { Lunar } from 'lunar-javascript'
import { STEMS, BRANCHES, getAnimal } from '~/constants/bazi'
import BaziGrid from '~/components/tools/bazi/BaziGrid.vue'
import ElementAnalysis from '~/components/tools/bazi/ElementAnalysis.vue'
import DayMasterSeal from '~/components/tools/bazi/DayMasterSeal.vue'
import DailyFortuneStick from '~/components/home/DailyFortuneStick.vue'

const SOLAR_TERM_NAMES = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒']

useHead({ title: '玄 · 道 — 玄天机 · 道命理' })

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
  trigram?: string
}

const tools: Tool[] = [
  {
    id: 'bazi', name: '八字', char: '命',
    description: '了解你的先天命格、性格特质和人生大运',
    landingDescription: '四柱推命 · 十神大运 · 流年神煞',
    route: '/tools/bazi', available: true, accent: '#C62828', trigram: '☰',
  },
  {
    id: 'yijing', name: '六爻', char: '卦',
    description: '针对具体问题（事业、感情、决策）获得卦象指引',
    landingDescription: '摇卦起数 · 爻辞解读 · 变卦推断',
    route: '/tools/yijing', available: true, accent: '#2C5F7C', trigram: '☵',
  },
  {
    id: 'shengxiao', name: '生肖', char: '肖',
    description: '查看你的生肖性格、幸运元素和年度运势',
    landingDescription: '生肖运势 · 五行属性 · 相性配对',
    route: '/tools/shengxiao', available: true, accent: '#3D6B4B', trigram: '☷',
  },
  {
    id: 'constellation', name: '星座', char: '星',
    description: '查看你的星座特征、今日宜忌和配对分析',
    landingDescription: '星盘轨迹 · 今日宜忌 · 缘分深浅',
    route: '/tools/constellation', available: true, accent: '#7A5E12', trigram: '☲',
  },
  {
    id: 'ziwei', name: '紫微斗数', char: '斗',
    description: '天星回宫 ・ 十二宫精批 ・ 星曜解读 ・ 大限流年',
    landingDescription: '排十二宫垣，解星曜布局与穷通祸福',
    route: '/tools/ziwei', available: true, accent: '#6B5B4F', trigram: '☴',
  },
  {
    id: 'hehun', name: '合婚', char: '合',
    description: '双方八字合婚匹配分析，了解姻缘深浅',
    landingDescription: '年柱日柱 · 五行互补 · 十神配偶',
    route: '/tools/hehun', available: true, accent: '#C62828', trigram: '⚢',
  },
  {
    id: 'name-test', name: '姓名', char: '名',
    description: '五格剖象姓名分析，了解名字的吉凶数理',
    landingDescription: '五格剖象 · 三才五行 · 数理吉凶',
    route: '/tools/name-test', available: true, accent: '#2C5F7C', trigram: '⚣',
  },
  {
    id: 'cezi', name: '测字', char: '测',
    description: '一字一世界，拆解字形探玄机，笔画之间见乾坤',
    landingDescription: '字形拆解 · 笔画五行 · 吉凶断语',
    route: '/tools/cezi', available: true, accent: '#5E5E5E', trigram: '☰',
  },
]

const sessionReady = ref(false)

// ── 命盘预览：固定示例数据（引擎驱动）──
const sampleBazi = computed<BaZiResult | null>(() => {
  if (!import.meta.client) return null
  try {
    return calculateBaZi({
      birthYear: 1990, birthMonth: 5, birthDay: 15,
      birthCalendar: 'solar', birthHour: 12, gender: '男',
    })
  } catch { return null }
})

// 四柱数组（过滤掉可能的 null，如缺时柱时）
const baziPillars = computed(() => {
  const r = sampleBazi.value
  if (!r) return []
  return [r.yearPillar, r.monthPillar, r.dayPillar, r.hourPillar].filter(Boolean) as import('~/composables/useBaZi').BaZiPillar[]
})

// ── 今日玄机：实时天文信息 ──
const todayAstro = computed(() => {
  if (!import.meta.client) return null
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const ys = ((y - 4) % 10 + 10) % 10
  const yb = ((y - 4) % 12 + 12) % 12
  const mp = getMonthPillar(y, m, d)
  let termIdx = -1
  for (let i = 0; i < 12; i++) {
    const t = getSolarTerm(y, i)
    if (t.month === m && d >= t.day - 2) termIdx = i
  }
  const lunar = Lunar.fromYmd(y, m, d)
  return {
    lunarMonth: (lunar as any).getMonthInChinese(),
    lunarDay: (lunar as any).getDayInChinese(),
    yearGanZhi: STEMS[ys] + BRANCHES[yb],
    monthGanZhi: mp.stem + mp.branch,
    solarTerm: termIdx >= 0 ? SOLAR_TERM_NAMES[termIdx] : null,
    weekday: ['日', '一', '二', '三', '四', '五', '六'][now.getDay()],
    dateStr: `${y}年${m}月${d}日`,
  }
})

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
        <section
          class="relative overflow-hidden"
          aria-labelledby="hero-heading"
        >
          <div class="relative" style="background:
            radial-gradient(ellipse 50% 40% at 70% 25%, rgba(156,26,28,0.02) 0%, transparent 60%),
            radial-gradient(ellipse 35% 30% at 20% 75%, rgba(44,26,14,0.015) 0%, transparent 50%);">
            <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
              <div class="flex flex-col items-center text-center max-w-2xl mx-auto">

                <!-- Stamp -->
                <div
                  class="anim-rise mb-8"
                >
                  <span
                    class="seal-icon seal-icon--hero"
                    aria-hidden="true"
                  >玄</span>
                </div>

                <!-- Title -->
                <h1
                  id="hero-heading"
                  class="anim-rise anim-delay-1 font-display"
                  style="font-size: 68px; color: #1A0F0A; letter-spacing: 0.3em; line-height: 1.2; margin-bottom: 12px; text-shadow: 0 1px 2px rgba(26,15,10,0.06);"
                >
                  玄<span class="title-dot"></span>道<span class="title-dot"></span><span class="text-cinnabar-deeper">知天命</span>
                </h1>

                <!-- Incantation -->
                <div class="hero-incant anim-rise anim-delay-2">
                  <span class="hero-incant__line">玄天机</span>
                  <span class="hero-incant__divider"></span>
                  <span class="hero-incant__line">道命理</span>
                  <span class="hero-incant__divider"></span>
                  <span class="hero-incant__line">玄道在手</span>
                  <span class="hero-incant__divider"></span>
                  <span class="hero-incant__line">天地万物</span>
                  <span class="hero-incant__divider"></span>
                  <span class="hero-incant__line">皆可问之</span>
                </div>

                <!-- CTA -->
                <div class="anim-rise anim-delay-4 flex gap-4 mt-10">
                  <button
                    class="btn-cin"
                    @click="goToLogin"
                  >
                    开始推演
                  </button>
                  <NuxtLink
                    to="/login"
                    class="btn-ink no-underline"
                  >
                    已有档案
                  </NuxtLink>
                </div>

              </div>
            </div>
          </div>
        </section>

        <!-- ── 今日玄机（灵符纸卡）── -->
        <section class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16" aria-label="今日玄机">
          <div class="section-header">
            <span class="bar" aria-hidden="true"></span>
            <h2>今 日 玄 机</h2>
          </div>

          <div class="max-w-md mx-auto">
            <div class="talisman-card">
              <span class="absolute top-3 left-3 text-[1rem] opacity-25" style="color:#C62828;" aria-hidden="true">☰</span>
              <span class="absolute top-3 right-3 text-[1rem] opacity-25" style="color:#C62828;" aria-hidden="true">☷</span>

              <template v-if="todayAstro">
                <div class="talisman-seal">
                  <span class="font-display text-sm text-white">玄</span>
                </div>

                <p class="talisman-lunar-date">{{ todayAstro.lunarMonth }}月{{ todayAstro.lunarDay }}</p>
                <p class="talisman-gregorian">{{ todayAstro.dateStr }} · 星期{{ todayAstro.weekday }}</p>

                <div class="flex items-center justify-center gap-4 mb-4">
                  <span class="talisman-ganzhi">{{ todayAstro.yearGanZhi }}年</span>
                  <span class="w-px h-3 bg-ink-dark/5" aria-hidden="true"></span>
                  <span class="talisman-ganzhi">{{ todayAstro.monthGanZhi }}月</span>
                </div>

                <div v-if="todayAstro.solarTerm" class="talisman-term-badge">
                  · {{ todayAstro.solarTerm }} ·
                </div>

                <div class="talisman-divider" aria-hidden="true"></div>

                <NuxtLink to="/login" class="talisman-cta">
                  登录查看个人运势 →
                </NuxtLink>
              </template>
            </div>
          </div>
        </section>

        <!-- ── 术数工具 ── -->
        <section
          class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 sm:pt-24 sm:pb-16"
          aria-label="术数工具"
        >
          <div class="section-header">
            <span class="bar" aria-hidden="true"></span>
            <h2>术 数 工 具</h2>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <template v-for="(tool, index) in tools" :key="tool.id">
              <!-- Available tools -->
              <NuxtLink
                v-if="tool.available"
                :to="tool.route"
                :aria-label="'探索' + tool.name"
                class="tool-card--new block no-underline group"
              >
                <span class="tool-card__trigram" aria-hidden="true">{{ tool.trigram || '☰' }}</span>
                <span class="seal-icon seal-icon--lg" style="margin-bottom:20px;">{{ tool.char }}</span>
                <div class="tool-card__name" style="font-size:19px;color:var(--color-ink);letter-spacing:0.25em;margin-bottom:8px;transition:color 0.3s;">{{ tool.name }}</div>
                <p class="ui" style="font-size:10px;color:var(--color-ink-light);letter-spacing:0.12em;line-height:1.7;">
                  {{ tool.landingDescription }}
                </p>
              </NuxtLink>

              <!-- Locked tools -->
              <div
                v-else
                :aria-label="tool.name + '（即将推出）'"
                aria-disabled="true"
                class="tool-card--new opacity-50 cursor-default"
              >
                <span class="tool-card__trigram" aria-hidden="true">{{ tool.trigram || '☰' }}</span>
                <div class="seal-icon seal-icon--lg" style="margin-bottom:20px;background:var(--color-ink-light);box-shadow:none;">{{ tool.char }}</div>
                <div class="tool-card__name" style="font-size:19px;color:var(--color-ink);letter-spacing:0.25em;margin-bottom:8px;">{{ tool.name }}</div>
                <p class="ui" style="font-size:10px;color:var(--color-ink-light);letter-spacing:0.12em;line-height:1.7;">
                  {{ tool.landingDescription }}
                </p>
              </div>
            </template>
          </div>

          <!-- 更多工具提示 -->
          <div class="text-center mt-6">
            <NuxtLink to="/login" class="btn-ink no-underline inline-flex">
              探索全部工具
            </NuxtLink>
          </div>
        </section>

      
        <!-- ── 命盘预览（复用项目组件）── -->
        <section class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16" aria-label="命盘预览">
          <div class="section-header">
            <span class="bar" aria-hidden="true"></span>
            <h2>命 盘 预 览</h2>
          </div>

          <div class="card-warm card-warm--elevated p-6 sm:p-10 lg:p-11">
            <template v-if="sampleBazi">
              <!-- 标题 -->
              <div class="flex items-center gap-3 pb-4 mb-6 border-b border-paper-dark/20 flex-wrap">
                <span class="seal-icon" aria-hidden="true">命</span>
                <h3 class="font-display text-lg sm:text-xl text-ink-dark tracking-[0.3em] leading-relaxed">示例命盘</h3>
                <span class="text-[0.6rem] sm:text-[0.65rem] text-ink-light/60 ml-auto tracking-[0.15em]">1990年5月15日 · 午时 · 男</span>
              </div>

              <!-- 四柱表格（复用项目 BaziGrid） -->
              <div class="mb-6">
                <BaziGrid :pillars="baziPillars" />
              </div>

              <!-- 日主印章 + 五行分析 -->
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DayMasterSeal
                  :birth-year="sampleBazi.birthYear"
                  :birth-calendar="sampleBazi.birthCalendar"
                  :animal-name="getAnimal(sampleBazi.birthYear)"
                  :gender="sampleBazi.gender"
                  :day-master="sampleBazi.dayMaster"
                  :day-master-wuxing="sampleBazi.dayMasterWuxing"
                  :day-master-strength="sampleBazi.dayMasterStrength"
                  :favorable-elements="sampleBazi.favorableElements"
                  :unfavorable-elements="sampleBazi.unfavorableElements"
                />
                <ElementAnalysis
                  :element-counts="sampleBazi.elementCounts"
                  :element-percentages="sampleBazi.elementPercentages"
                  :day-master="sampleBazi.dayMaster"
                  :day-master-wuxing="sampleBazi.dayMasterWuxing"
                  :day-master-strength="sampleBazi.dayMasterStrength"
                  :month-branch="sampleBazi.monthPillar?.branch || ''"
                />
              </div>
            </template>

            <template v-else>
              <div class="py-12 text-center">
                <div class="skeleton-pulse h-64 w-full max-w-lg mx-auto rounded" />
              </div>
            </template>

            <p class="text-[0.55rem] text-ink-faint/60 text-center mt-5 tracking-[0.1em]" v-if="sampleBazi">* 此为示例命盘，登录后可排自己的盘</p>
          </div>
        </section>

        <!-- ── 分割线 + CTA ── -->
        <section class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16 sm:py-12 sm:pb-20">
          <div class="divider-seal mb-10">
            <span class="divider-seal__line" aria-hidden="true"></span>
            <span class="seal-icon" style="width:26px;height:26px;font-size:10px;" aria-hidden="true">玄</span>
            <span class="divider-seal__word">玄 · 道</span>
            <span class="seal-icon" style="width:26px;height:26px;font-size:10px;" aria-hidden="true">道</span>
            <span class="divider-seal__line" aria-hidden="true"></span>
          </div>

          <div class="flex justify-center gap-4 flex-wrap">
            <button class="btn-cin" @click="goToLogin">开始推演</button>
            <NuxtLink to="/login" class="btn-ink no-underline">浏览命盘</NuxtLink>
          </div>
        </section>

        <!-- ── Footer ── -->
        <footer class="border-t" style="border-color:rgba(44,26,14,0.03);" role="contentinfo">
          <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <span class="font-display" style="font-size:15px;color:var(--color-ink);letter-spacing:0.3em;">玄 · 道</span>
                <span style="font-size:9px;color:var(--color-ink-faint);">·</span>
                <span class="ui" style="font-size:11px;color:var(--color-ink-light);">玄天机 · 道命理</span>
              </div>
              <p class="ui" style="font-size:11px;color:var(--color-ink-faint);">
                &copy; {{ new Date().getFullYear() }} 玄 · 道 · 仅供娱乐参考
              </p>
            </div>
          </div>
        </footer>

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
                    style="background:linear-gradient(to right, rgba(156,26,28,0.4), transparent);"
                    aria-hidden="true"
                  />
                  <h1 class="font-display text-3xl sm:text-4xl lg:text-5xl" style="color:var(--color-ink);letter-spacing:0.05em;">
                    {{ greeting.prefix }}，<span class="text-cinnabar-deeper">{{ currentProfile.nickname }}</span>
                  </h1>
                  <!-- 岁次 seal -->
                  <span
                    class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[0.5rem] tracking-[0.15em] text-ink-faint/60 border border-ink-faint/10 font-sans"
                    style="transform:rotate(-1deg);"
                  >{{ todayAstro?.yearGanZhi || '' }}</span>
                </div>
                <div class="flex items-center gap-3 ml-0 sm:ml-10">
                  <span
                    class="seal-icon"
                    style="width:26px;height:26px;font-size:10px;border-radius:3px;"
                    aria-hidden="true"
                  >玄</span>
                  <p class="ui" style="font-size:13px;color:var(--color-ink-light);letter-spacing:0.15em;">
                    {{ greeting.subtitle }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Bottom half: 今日玄机 -->
            <div class="flex-1 min-h-0 anim-rise" style="--delay:0.1s">
              <div class="talisman-card h-full flex flex-col items-center justify-center text-center" aria-label="今日黄历">
                <span class="absolute top-3 left-3 text-[1rem] opacity-15" style="color:#C62828;" aria-hidden="true">☰</span>
                <span class="absolute top-3 right-3 text-[1rem] opacity-15" style="color:#C62828;" aria-hidden="true">☷</span>
                <template v-if="todayAstro">
                  <span class="talisman-seal--sm mb-2" aria-hidden="true">玄</span>
                  <p class="talisman-lunar-date">{{ todayAstro.lunarMonth }}月{{ todayAstro.lunarDay }}</p>
                  <p class="talisman-gregorian">{{ todayAstro.dateStr }} · 星期{{ todayAstro.weekday }}</p>
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
          <div class="anim-rise" style="--delay:0.2s">
            <DailyFortuneStick tall class="w-full h-full" />
          </div>
        </div>

        <!-- Section header -->
        <div class="section-header anim-rise anim-delay-1">
          <span class="bar" aria-hidden="true"></span>
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
            <span class="seal-icon seal-icon--lg" style="margin-bottom:16px;">{{ tool.char }}</span>
            <div class="tool-card__name" style="font-size:19px;color:var(--color-ink);letter-spacing:0.25em;margin-bottom:4px;">{{ tool.name }}</div>
            <p class="ui" style="font-size:12px;color:var(--color-ink-light);letter-spacing:0.08em;line-height:1.6;">{{ tool.description }}</p>
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
            <span class="seal-icon seal-icon--lg" style="margin-bottom:16px;background:var(--color-ink-light);box-shadow:none;">{{ tool.char }}</span>
            <div class="tool-card__name" style="font-size:19px;color:var(--color-ink);letter-spacing:0.25em;margin-bottom:4px;">{{ tool.name }}</div>
            <p class="ui" style="font-size:12px;color:var(--color-ink-light);letter-spacing:0.08em;line-height:1.6;">{{ tool.description }}</p>
            <span class="ui" style="position:absolute;top:12px;right:12px;padding:2px 8px;border-radius:999px;font-size:9px;border:1px solid rgba(44,26,14,0.08);color:var(--color-ink-light);">即将推出</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>

/* ═══ 灵符纸卡 ═══ */

.talisman-card {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  padding: 1.75rem 1.5rem;
  text-align: center;
  background: #FAF0E0;
  border: 1px solid rgba(198, 40, 40, 0.08);
}
@media (min-width: 640px) {
  .talisman-card { padding: 2rem; }
}
.talisman-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.375rem;
  background: var(--color-cinnabar);
  transform: rotate(-3deg);
  margin-bottom: 1rem;
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
  font-family: "Ma Shan Zheng", "STKaiti", "KaiTi", cursive;
  font-size: 1.75rem;
  color: var(--color-ink-dark);
  letter-spacing: 0.2em;
  margin-bottom: 0.25rem;
}
@media (min-width: 640px) {
  .talisman-lunar-date { font-size: 2rem; }
}
.talisman-gregorian {
  font-size: 0.6rem;
  color: var(--color-ink-faint);
  letter-spacing: 0.15em;
  margin-bottom: 1.25rem;
}
.talisman-ganzhi {
  font-size: 0.7rem;
  color: var(--color-ink-mid);
  letter-spacing: 0.15em;
  opacity: 0.8;
}
.talisman-term-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  background: rgba(198, 40, 40, 0.06);
  color: var(--color-cinnabar);
  margin-bottom: 1.25rem;
}
.talisman-divider {
  width: 6rem;
  height: 1px;
  margin: 1rem auto;
  background: repeating-linear-gradient(
    90deg,
    rgba(44, 26, 14, 0.08) 0px,
    rgba(44, 26, 14, 0.08) 4px,
    transparent 4px,
    transparent 8px
  );
}
.talisman-cta {
  display: inline-block;
  font-size: 0.65rem;
  color: var(--color-ink-light);
  letter-spacing: 0.15em;
  text-decoration: none;
  transition: color 0.2s ease;
  opacity: 0.6;
}
.talisman-cta:hover {
  color: var(--color-cinnabar);
  opacity: 1;
}
</style>
