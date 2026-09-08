<script setup lang="ts">
import { getMonthPillar } from '~/composables/useSolarTerms'
import { STEMS, BRANCHES } from '~/constants/bazi'
import { WUXING_COLORS, WUXING_FALLBACK_COLOR, getNayinWuxing } from '~/constants/bazi'
import { SAMPLE_BAZI, SAMPLE_PROMINENT_SHENSHA } from '~/constants/sample-bazi'
import { isToolPubliclyAvailable, TOOL_CATALOG } from '~/constants/tool-catalog'
import DailyFortuneStick from '~/components/home/DailyFortuneStick.vue'
import PageFooter from '~/components/tools/PageFooter.vue'

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

useSeoMeta({
  title: '玄·道 — 传统文化自我探索',
  ogTitle: '玄·道 — 传统文化自我探索',
  description: '传统文化自我探索。',
  ogDescription: '传统文化自我探索。',
  ogType: 'website',
})

const { restoreSession, authStatus, currentAccount } = useAuth()
const greeting = useGreeting()

// 首页工具入口只从四维目录推导公开可用项；当前围栏期没有任何普通访客可用工具。
const publicTools = TOOL_CATALOG.filter(tool => isToolPubliclyAvailable(tool.id))
const hasPublicTools = computed(() => publicTools.length > 0)

// ── 今日玄机：懒加载天文信息（避免急切导入 lunar-javascript ~200KB）──
interface TodayAstroData {
  lunarMonth: string
  lunarDay: string
  yearGanZhi: string
  monthGanZhi: string
  solarTerm: string | null
  weekday: string
  dateStr: string
}
const todayAstro = ref<TodayAstroData | null>(null)

// ── 命盘预览：预计算的静态示例数据 ──
const sampleBaZi = SAMPLE_BAZI
const prominentShenSha = SAMPLE_PROMINENT_SHENSHA

const samplePillars = computed(() => {
  const labels = ['年柱', '月柱', '日柱', '时柱']
  const pillars = [
    sampleBaZi.yearPillar,
    sampleBaZi.monthPillar,
    sampleBaZi.dayPillar,
    sampleBaZi.hourPillar,
  ]
  return pillars
    .map((p, i) => ({ label: labels[i], data: p }))
    .filter((p): p is { label: string; data: NonNullable<typeof p.data> } => p.data !== null)
})

interface DailyWuxingData {
  luckyColorNames: string[]
  avoidColorNames: string[]
}
const dailyWuxing = ref<DailyWuxingData>({ luckyColorNames: [], avoidColorNames: [] })

const sessionReady = ref(false)

onMounted(async () => {
  await restoreSession()
  sessionReady.value = true

  // 懒加载 lunar-javascript（约 200KB），仅在客户端需要时加载
  if (import.meta.client) {
    try {
      const [{ Lunar }, { getDailyWuxing }] = await Promise.all([
        import('lunar-javascript'),
        import('~/composables/useDailyWuxing'),
      ])

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
      todayAstro.value = {
        lunarMonth: lunar.getMonthInChinese(),
        lunarDay: lunar.getDayInChinese(),
        yearGanZhi: STEMS[ys] + BRANCHES[yb],
        monthGanZhi: mp.stem + mp.branch,
        solarTerm: termIdx >= 0 ? SOLAR_TERM_NAMES[termIdx] : null,
        weekday: ['日', '一', '二', '三', '四', '五', '六'][now.getDay()],
        dateStr: `${y}年${m}月${d}日`,
      }

      const wuxingResult = getDailyWuxing()
      dailyWuxing.value = {
        luckyColorNames: wuxingResult.luckyColorNames,
        avoidColorNames: wuxingResult.avoidColorNames,
      }
    } catch {
      // Best-effort — todayAstro and dailyWuxing stay at defaults
    }
  }
})
</script>

<template>
  <div class="full-viewport relative">
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
    <template v-if="sessionReady && authStatus !== 'authenticated'">
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
                    publicTools
                      .slice(0, 5)
                      .map(t => t.name)
                      .join(' · ') || '传统文化自我探索'
                  }}</span>
                  <span class="hero-incant__divider"></span>
                  <span class="hero-incant__line">相关工具正在逐项核验</span>
                </div>

                <!-- CTA -->
                <div class="anim-rise anim-delay-4 flex gap-4 mt-10">
                  <NuxtLink to="/login" class="btn-cin no-underline inline-flex">
                    <span>登录查看状态</span>
                  </NuxtLink>
                  <NuxtLink to="/login" class="btn-ink no-underline"> 登录/注册 </NuxtLink>
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
                基于《三命通会》《渊海子平》《易经》等经典古籍，延续传统文化推演体系。
              </p>
            </div>
            <div class="card-warm rounded-xl p-8 text-center anim-rise" style="--delay: 0.15s">
              <span class="seal-icon seal-icon--lg mb-4" aria-hidden="true">全</span>
              <h3 class="font-display text-lg text-ink-dark mb-3 tracking-[0.15em]">多种探索</h3>
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                传统文化工具正在逐项核验，确认规则与来源后再逐步开放。
              </p>
            </div>
            <div class="card-warm rounded-xl p-8 text-center anim-rise" style="--delay: 0.25s">
              <span class="seal-icon seal-icon--lg mb-4" aria-hidden="true">简</span>
              <h3 class="font-display text-lg text-ink-dark mb-3 tracking-[0.15em]">可追溯</h3>
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                每条结果都会说明所使用的输入、规则、来源与版本，不虚构结论。
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

          <div v-if="sampleBaZi" class="card-warm card-warm--elevated rounded-xl p-8 anim-rise">
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
                    :style="{
                      background: WUXING_COLORS[pillar.data.stemWuxing] || WUXING_FALLBACK_COLOR,
                    }"
                    :aria-label="pillar.data.stemWuxing"
                  ></span>
                  <span class="font-sans text-xs text-ink-medium">{{
                    pillar.data.stemWuxing
                  }}</span>
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
                  :style="{
                    color: WUXING_COLORS[sampleBaZi.dayMasterWuxing] || WUXING_FALLBACK_COLOR,
                  }"
                >
                  {{ sampleBaZi.dayMaster }}{{ sampleBaZi.dayMasterWuxing }}
                </span>
                <span class="font-sans text-sm text-ink-medium"
                  >（{{ sampleBaZi.dayMasterStrength }}）</span
                >
              </div>

              <span
                class="hidden sm:block w-px h-5"
                style="background: color-mix(in srgb, var(--color-ink-faint) 50%, transparent)"
                aria-hidden="true"
              ></span>

              <div
                v-if="prominentShenSha.length > 0"
                class="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span class="font-sans text-xs text-ink-light tracking-[0.1em]">神煞：</span>
                <span
                  v-for="s in prominentShenSha"
                  :key="s.name"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-sans"
                  :class="
                    s.category === '吉'
                      ? 'text-jade'
                      : s.category === '凶'
                        ? 'text-cinnabar'
                        : 'text-ink-medium'
                  "
                  style="
                    font-size: 0.6875rem;
                    letter-spacing: 0.08em;
                    background: color-mix(in srgb, var(--color-cinnabar) 5%, transparent);
                  "
                >
                  {{ s.name }}
                </span>
              </div>
            </div>

            <!-- Footer note -->
            <p class="mt-5 font-sans text-xs text-ink-light tracking-[0.1em]">
              * 此为示例命盘，仅用于展示传统排盘形式。
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

          <!-- 当前围栏期没有公开可用工具，仅展示中性核验说明 -->
          <div
            v-if="!hasPublicTools"
            class="card-warm rounded-xl p-8 text-center anim-rise"
            style="--delay: 0.05s"
          >
            <p class="font-sans text-sm sm:text-base text-ink-medium leading-relaxed">
              相关工具正在逐项核验。
            </p>
          </div>

          <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <NuxtLink
              v-for="tool in publicTools"
              :key="tool.id"
              :to="tool.route"
              :aria-label="'打开' + tool.name + '工具'"
              class="tool-card--new block no-underline"
            >
              <span class="tool-card__trigram" aria-hidden="true">☰</span>
              <span class="seal-icon seal-icon--lg" style="margin-bottom: 20px">玄</span>
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
                {{ tool.name }}功能整理中，敬请期待。
              </p>
            </NuxtLink>
          </div>

          <div class="text-center mt-8">
            <NuxtLink to="/login" class="btn-cin no-underline inline-flex">
              <span>查看工具状态</span>
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
              <h3 class="font-display text-base text-ink-dark mb-2 tracking-[0.15em]">核验规则</h3>
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                逐项核验输入、规则与来源，不虚构默认信息。
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
              <h3 class="font-display text-base text-ink-dark mb-2 tracking-[0.15em]">整理内容</h3>
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                依据与范围进入正常阅读流，标注来源与限制。
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
              <h3 class="font-display text-base text-ink-dark mb-2 tracking-[0.15em]">逐步开放</h3>
              <p class="font-sans text-sm text-ink-medium leading-relaxed">
                通过验收后按能力门禁逐步开放，不夸大结论。
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
            <NuxtLink to="/login" class="btn-cin no-underline inline-flex">
              <span>查看工具状态</span>
            </NuxtLink>
            <NuxtLink to="/account" class="btn-ink no-underline">账号设置</NuxtLink>
          </div>
        </section>
      </div>
    </template>

    <!-- ════════════════════════════════════ -->
    <!--  AUTHENTICATED                      -->
    <!-- ════════════════════════════════════ -->
    <template v-if="sessionReady && currentAccount">
      <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
        <!-- ═══ Left/Right 50/50: Greeting + 今日玄机 ✦ 今日命签 ═══ -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch mb-12 sm:mb-16">
          <!-- ── Left column: Greeting (top) + Today's Mystery (bottom), equal height ── -->
          <div class="flex flex-col gap-4 sm:gap-6">
            <!-- Top half: Greeting -->
            <div class="anim-rise flex-1 sm:flex-[3] min-h-0">
              <div
                class="flex flex-col items-center justify-center h-full gap-2 sm:gap-3 text-center"
              >
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
                      currentAccount.nickname
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
            <div class="flex-[3] sm:flex-[2] min-h-0 anim-rise" style="--delay: 0.1s">
              <div
                class="talisman-card h-full flex items-center justify-center"
                aria-label="今日黄历"
              >
                <div class="flex flex-col items-center w-full">
                  <!-- Header bar — matching 今日命签 style -->
                  <div class="slip-hd mb-3 w-full">
                    <span class="slip-chop" aria-hidden="true">玄</span>
                    <span class="slip-ttl">今 日 玄 机</span>
                    <span v-if="todayAstro" class="slip-date-inline"
                      >{{ todayAstro.dateStr }} · 周{{ todayAstro.weekday }}</span
                    >
                    <span v-if="todayAstro?.solarTerm" class="slip-fortune slip-fortune--吉">{{
                      todayAstro.solarTerm
                    }}</span>
                  </div>

                  <!-- Divider — visible, directly below header -->
                  <div class="slip-divider-h mb-3 w-full" aria-hidden="true">
                    <span class="slip-divider-h__dot" />
                  </div>

                  <!-- Date content — natural flow, centered by parent items-center -->
                  <template v-if="todayAstro">
                    <p class="talisman-lunar-date">
                      {{ todayAstro.lunarMonth }}月{{ todayAstro.lunarDay }}
                    </p>

                    <div class="flex items-center justify-center gap-3">
                      <span class="talisman-ganzhi">{{ todayAstro.yearGanZhi }}年</span>
                      <span class="w-px h-2 bg-ink-faint/20" aria-hidden="true"></span>
                      <span class="talisman-ganzhi">{{ todayAstro.monthGanZhi }}月</span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Right column: Fortune stick + clothing guide ── -->
          <div class="flex flex-col gap-5 sm:gap-6 anim-rise" style="--delay: 0.2s">
            <!-- Fortune stick — fills most of the space -->
            <div class="flex-1 min-h-0">
              <DailyFortuneStick tall class="w-full h-full" />
            </div>
            <!-- 今日穿衣 — compact, pinned to bottom -->
            <div class="daily-wuxing-card shrink-0">
              <div class="slip-hd slip-hd--sm mb-2">
                <span class="slip-chop slip-chop--sm" aria-hidden="true">衣</span>
                <span class="slip-ttl slip-ttl--sm">今 日 穿 衣</span>
              </div>
              <div class="daily-wuxing-colors">
                <span class="daily-wuxing-label">宜着</span>
                <span
                  v-for="color in dailyWuxing.luckyColorNames"
                  :key="color"
                  class="daily-wuxing-pill"
                  >{{ color }}</span
                >
                <span class="daily-wuxing-sep">·</span>
                <span class="daily-wuxing-avoid"
                  >避 {{ dailyWuxing.avoidColorNames.join('、') }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Tool grid -->
        <div
          v-if="hasPublicTools"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
        >
          <NuxtLink
            v-for="tool in publicTools"
            :key="tool.id"
            :to="tool.route"
            :aria-label="'打开' + tool.name + '工具'"
            class="tool-card--new block no-underline group anim-rise"
          >
            <span class="tool-card__trigram" aria-hidden="true">☰</span>
            <span class="seal-icon seal-icon--lg" style="margin-bottom: 16px">玄</span>
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
              {{ tool.name }}功能整理中，敬请期待。
            </p>
          </NuxtLink>
        </div>

        <!-- 当前围栏期没有公开可用工具，仅展示中性核验说明 -->
        <div v-else class="card-warm rounded-xl p-8 text-center anim-rise">
          <p class="font-sans text-sm sm:text-base text-ink-medium leading-relaxed">
            相关工具正在逐项核验。
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

/* ═══ Slip-hd pattern — shared visual language with DailyFortuneStick ═══ */

.slip-hd {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
}

.slip-chop {
  flex-shrink: 0;
  width: 1.125rem;
  height: 1.125rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-cinnabar-deeper, #9c1a1c);
  color: var(--color-paper-lightest, #f5f0e8);
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.5rem;
  transform: rotate(-3deg);
  border-radius: 2px;
}

.slip-ttl {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.8125rem;
  color: var(--color-ink-dark, #2c1810);
  letter-spacing: 0.2em;
  font-weight: 400;
  margin-right: auto;
}

.slip-date-inline {
  font-family: var(--font-sans);
  font-size: 0.65rem;
  color: var(--color-ink-light);
  letter-spacing: 0.04em;
  opacity: 0.7;
  flex-shrink: 0;
  margin-right: 0.5rem;
}

.slip-fortune {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.6rem;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  letter-spacing: 0.08em;
  transform: rotate(-0.5deg);
  line-height: 1.3;
}

.slip-fortune--吉 {
  background: color-mix(in oklch, var(--color-ink-darkest) 6%, transparent);
  color: var(--color-ink-medium);
  border: 1px solid color-mix(in oklch, var(--color-ink-darkest) 10%, transparent);
}

/* ── Horizontal divider ── */
.slip-divider-h {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-shrink: 0;
  margin: 0.5rem 0;
}

.slip-divider-h::before,
.slip-divider-h::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(44, 26, 14, 0.12) 30%,
    rgba(44, 26, 14, 0.12) 70%,
    transparent
  );
}

.slip-divider-h__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(198, 40, 40, 0.35);
  flex-shrink: 0;
}

/* ═══ Daily Wuxing Card — compact clothing guide ═══ */

.daily-wuxing-card {
  background: color-mix(in oklch, var(--color-paper-card) 60%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-ink-darkest) 6%, transparent);
  border-radius: 0.5rem;
  padding: 0.625rem 0.875rem;
}

/* Small slip-hd variant */
.slip-hd--sm {
  margin-bottom: 0.375rem;
}

.slip-chop--sm {
  width: 20px;
  height: 20px;
  font-size: 10px;
}

.slip-ttl--sm {
  font-size: 0.75rem;
}

.daily-wuxing-colors {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
  font-size: 0.6875rem;
}

.daily-wuxing-label {
  color: var(--color-ink-light);
  flex-shrink: 0;
}

.daily-wuxing-pill {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  border-radius: 9999px;
  background: color-mix(in oklch, var(--color-cinnabar) 8%, transparent);
  color: var(--color-cinnabar);
}

.daily-wuxing-sep {
  color: var(--color-ink-faint);
}

.daily-wuxing-avoid {
  color: var(--color-ink-light);
}

@media (max-width: 639px) {
  .talisman-ganzhi {
    font-size: 0.8125rem;
  }
  .talisman-lunar-date {
    font-size: 1.5rem;
    letter-spacing: 0.12em;
  }
}
</style>
