<script setup lang="ts">
import {
  calculateConstellation,
  getZodiacIndex,
  ZODIACS,
  type ConstellationResult,
} from '~/composables/useConstellation'
import { parseDate } from '~/utils/date'

const { currentProfile, restoreSession } = useAuth()
const router = useRouter()

import ConstellationHero from '~/components/tools/constellation/Hero.vue'
import ConstellationAttributes from '~/components/tools/constellation/ConstellationAttributes.vue'
import ThreeLuminaries from '~/components/tools/constellation/ThreeLuminaries.vue'
import ConstellationCompatibility from '~/components/tools/constellation/ConstellationCompatibility.vue'
import HoroscopePanel from '~/components/tools/constellation/HoroscopePanel.vue'
import YiJiPanel from '~/components/tools/constellation/YiJiPanel.vue'
import ConstellationNav from '~/components/tools/constellation/Nav.vue'
import ToolEditorialShell from '~/components/editorial/ToolEditorialShell.vue'
import SectionHeading from '~/components/editorial/SectionHeading.vue'
import ScrollTopButton from '~/components/tools/ScrollTopButton.vue'
import ExportButton from '~/components/tools/ExportButton.vue'
import { useExportImage } from '~/composables/useExportImage'
import SkeletonCard from '~/components/tools/SkeletonCard.vue'
import SkeletonBars from '~/components/tools/SkeletonBars.vue'
import { calculateNatalChart, serializeNatalChart } from '~/composables/useNatalChart'
import NatalChart from '~/components/tools/constellation/NatalChart.vue'
import NatalChartGuide from '~/components/tools/constellation/NatalChartGuide.vue'
import type { NatalChartData } from '~/composables/useNatalChart'
import MethodologyNote, { type ClassicalSource } from '~/components/tools/MethodologyNote.vue'
import ProfileAutoFillBanner from '~/components/tools/ProfileAutoFillBanner.vue'

// ── Methodology data ──
const constellationClassical: ClassicalSource[] = [
  { method: '黄道十二宫', source: 'Ptolemy《Tetrabiblos》（公元2世纪），现代西方占星学基础体系' },
  { method: '四元素分类', source: '古希腊元素体系（Empedocles），火土风水四元素与星座性格关联' },
  {
    method: '守护星体系',
    source: '传统占星学行星守护体系，日/月/金/水/火/木/土/天/海/冥十星配十二宫',
  },
  {
    method: '三光（日月上升）',
    source: 'Astrolog 标准布局，Asc 左侧 9 点钟方向，日月上升三光解读',
  },
  { method: '星盘计算', source: 'astronomy-engine v2.1.19 计算行星真实位置（VSOP87 理论）' },
]
const constellationSynthesis: string[] = [
  '配对相容性为元素相容理论工程简化（great/good/bad 三级）',
  '今日运势 + 宜忌为模板拼接（非占星学日月运行实时推演）',
  '解释文本为现代白话转述（非 Ptolemy 原文）',
]

/**
 * 卷目（Ⅰ–Ⅳ）与脚注。
 *
 * 卷目只列页面**已有**的四段阅读内容（星座分析、本命星盘、今日运势与宜忌、速配星座），
 * 不为凑长度新增段（设计系统：卷目只是既有段序的目录）。星座选择器是输入控件，
 * 放正文而不占卷目左栏。
 * 脚注写本页真实边界：运势与宜忌的来源性质、星盘计算的依据。
 */
const indexItems = [
  { num: 'Ⅰ', label: '星座分析', href: '#constellation-analysis' },
  { num: 'Ⅱ', label: '本命星盘', href: '#constellation-natal' },
  { num: 'Ⅲ', label: '今日运势与宜忌', href: '#constellation-today' },
  { num: 'Ⅳ', label: '速配星座', href: '#constellation-match' },
]

/**
 * 卷目脚注：只写本页内容来源性质（一行，窄屏隐藏）。
 *
 * 星盘引擎依据（astronomy-engine / VSOP87）由报头 meta 承担，脚注不再复述同一句；
 * 正式引用标题与出处保留在「注」面板的经典来源列表中，不因关键词重复而删除。
 */
const indexFootnote = '今日运势为模板拼接'

useSeoMeta({
  title: '星座星盘 — 玄·道',
  ogTitle: '星座星盘 — 玄·道',
  description: '探索你的星座特征、今日运势、星盘轨迹和缘分匹配，发现星空下的你。',
  ogDescription: '探索你的星座特征、今日运势、星盘轨迹和缘分匹配，发现星空下的你。',
  ogType: 'website',
})

const result = ref<ConstellationResult | null>(null)
const loading = ref(true)
const missingBirthInfo = ref(false)
const error = ref('')
const selectedZodiac = ref(0)
/** The user's actual birth zodiac index — immutable by exploration */
const userZodiacIndex = ref(0)
const natalChartData = ref<NatalChartData | null>(null)
const chartTextCopied = ref(false)
const chartTextTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const showScrollTop = ref(false)
const resultRef = ref<HTMLElement | null>(null)
const { exportToImage, isExporting } = useExportImage()

async function copyChartText() {
  if (!natalChartData.value) return
  const text = serializeNatalChart(natalChartData.value)
  try {
    await navigator.clipboard.writeText(text)
    chartTextCopied.value = true
    if (chartTextTimer.value) clearTimeout(chartTextTimer.value)
    chartTextTimer.value = setTimeout(() => {
      chartTextCopied.value = false
    }, 2000)
  } catch {
    // Fallback: select text in a temporary textarea
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    chartTextCopied.value = true
    if (chartTextTimer.value) clearTimeout(chartTextTimer.value)
    chartTextTimer.value = setTimeout(() => {
      chartTextCopied.value = false
    }, 2000)
  }
}

function handleExport() {
  if (resultRef.value) {
    exportToImage(resultRef.value, '星座星盘.png')
  }
}

function handleScroll() {
  showScrollTop.value = window.scrollY > 300
}

function scrollToTop() {
  const prefersReducedMotion = import.meta.client
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  if (!prefersReducedMotion) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    window.scrollTo({ top: 0 })
  }
}

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

  window.addEventListener('scroll', handleScroll, { passive: true })
  computeResult()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (chartTextTimer.value) clearTimeout(chartTextTimer.value)
})

function computeResult() {
  if (!currentProfile.value?.birth_date) return
  loading.value = true
  error.value = ''

  const parsed = parseDate(currentProfile.value.birth_date)
  if (!parsed) {
    error.value = '出生日期格式无效，请修改个人信息'
    loading.value = false
    return
  }
  const { year, month, day } = parsed

  // 计算本命星盘（仅在首次加载时，使用真实出生数据）
  if (!natalChartData.value && currentProfile.value?.birth_date) {
    const parsedBirth = parseDate(currentProfile.value.birth_date)
    if (parsedBirth) {
      natalChartData.value = calculateNatalChart(
        parsedBirth.year,
        parsedBirth.month,
        parsedBirth.day,
        currentProfile.value?.birth_hour ?? null,
        currentProfile.value?.birth_minute ?? null,
      )
    }
  }

  try {
    result.value = calculateConstellation(
      month,
      day,
      new Date(),
      year,
      month,
      day,
      currentProfile.value?.birth_hour,
      currentProfile.value?.birth_minute,
    )
    userZodiacIndex.value = getZodiacIndex(month, day)
    selectedZodiac.value = userZodiacIndex.value
  } catch {
    error.value = '计算星座出错，请稍后重试'
  }
  loading.value = false
}

function selectZodiac(index: number) {
  selectedZodiac.value = index
  loading.value = true
  error.value = ''

  const month = ZODIACS[index].startMonth
  const day = ZODIACS[index].startDay
  // Parse actual birth date for natal moon/rising sign (never re-derive from exploration date)
  const parsedBirth = currentProfile.value?.birth_date
    ? parseDate(currentProfile.value.birth_date)
    : undefined
  const birthYear = parsedBirth?.year
  const birthMonth = parsedBirth?.month
  const birthDay = parsedBirth?.day

  try {
    result.value = calculateConstellation(
      month,
      day,
      new Date(),
      birthYear,
      birthMonth,
      birthDay,
      currentProfile.value?.birth_hour,
      currentProfile.value?.birth_minute,
    )
  } catch {
    error.value = '计算星座出错，请稍后重试'
  }
  loading.value = false
}

const zodiacShortNames = ZODIACS.map(z => z.name.slice(0, 2))

function scrollToConstellationNav() {
  const el = document.querySelector('[data-constellation-nav]')
  el?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <ToolEditorialShell
    :index-items="indexItems"
    :index-footnote="indexFootnote"
    seal="星"
    edition="工具 · 星座星盘（黄道十二宫）"
    title="星座星盘"
    subtitle="探索你的星座特征、今日运势、星盘轨迹和缘分匹配，发现星空下的你。"
    status-text="内部验证中"
    meta-text="星盘引擎 astronomy-engine v2.1.19"
  >
    <!--
      星座选择：原本占用页面左栏（左栏只放卷目），迁到正文。
      与结果淡入区分离，切换星座时按钮不被重建，键盘焦点留在刚触发的按钮上。
    -->
    <div v-if="!missingBirthInfo" data-constellation-nav class="mb-8">
      <div class="hidden lg:block max-w-[20rem]">
        <ConstellationNav :current-index="selectedZodiac" @select="selectZodiac" />
      </div>
      <div class="lg:hidden flex gap-2 overflow-x-auto pb-2 scroll-hint-x">
        <button
          v-for="(name, idx) in zodiacShortNames"
          :key="idx"
          :aria-current="idx === selectedZodiac ? 'true' : undefined"
          :class="[
            'flex-shrink-0 px-3 py-2.5 min-h-[44px] rounded-lg text-sm transition-colors',
            idx === selectedZodiac
              ? 'constellation-mobile-nav-active text-cinnabar'
              : 'text-ink-medium constellation-mobile-nav-inactive',
          ]"
          @click="selectZodiac(idx)"
          @keydown.space.prevent="selectZodiac(idx)"
        >
          {{ name }}
        </button>
      </div>
    </div>

    <!-- Screen reader status -->
    <div role="status" class="sr-only" aria-live="polite">
      {{ loading ? '正在计算...' : result ? '结果已就绪' : '' }}
    </div>

    <!-- Missing birth info -->
    <div v-if="missingBirthInfo" class="max-w-[48rem] mx-auto">
      <ProfileAutoFillBanner
        :profile-name="currentProfile?.nickname || ''"
        :is-filled="false"
        :missing-birth="true"
        :profile-id="currentProfile?.id"
      />
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="space-y-6" aria-busy="true" aria-live="polite">
      <span class="sr-only">正在加载...</span>
      <SkeletonCard />
      <SkeletonBars />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <p class="font-sans text-base text-cinnabar" role="alert">{{ error }}</p>
      <div class="flex justify-center mt-6">
        <NuxtLink :to="`/profile/${currentProfile?.id}`" class="btn-cin inline-flex">
          <span>前往编辑档案</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Result：四段阅读内容（卷目锚点） -->
    <template v-else-if="result">
      <!-- 顶部工具条：仅保留导出入口（历史记录已下线）；不进入导出区域 -->
      <div class="flex items-center justify-between mb-6">
        <span></span>
        <ExportButton
          v-if="result"
          :target-ref="resultRef"
          filename="星座星盘.png"
          :is-exporting="isExporting"
          @export="handleExport"
        />
      </div>

      <Transition name="content-fade" mode="out-in">
        <div ref="resultRef" :key="selectedZodiac" aria-live="polite" aria-atomic="true">
          <!-- Ⅰ 星座分析 -->
          <section
            id="constellation-analysis"
            class="editorial-section editorial-section--first"
            aria-labelledby="constellation-analysis-heading"
          >
            <div class="flex items-center justify-between gap-4">
              <SectionHeading
                num="Ⅰ"
                title="星座分析"
                heading-id="constellation-analysis-heading"
              />
              <MethodologyNote
                :classical="constellationClassical"
                :synthesis="constellationSynthesis"
                tool="星座"
              />
            </div>
            <ConstellationHero :result="result" />

            <ConstellationAttributes :result="result" />

            <ThreeLuminaries
              :result="result"
              :selected-zodiac="selectedZodiac"
              :user-zodiac-index="userZodiacIndex"
            />
          </section>

          <!-- ═══ Ⅱ 本命星盘 ═══ -->
          <section
            id="constellation-natal"
            class="editorial-section"
            aria-labelledby="constellation-natal-heading"
          >
            <SectionHeading num="Ⅱ" title="本命星盘" heading-id="constellation-natal-heading" />
            <div v-if="natalChartData" class="fade-in" :style="{ '--delay': '0.3s' }">
              <div class="card-warm rounded-xl p-4 sm:p-6 flex justify-center">
                <NatalChart :data="natalChartData" />
              </div>
              <p class="text-center mt-3">
                <span class="text-xs text-ink-medium font-sans tracking-wider">
                  ── 基于出生日期计算，Astrolog 标准布局（Asc 左侧 9 点钟方向）──
                </span>
              </p>
              <div class="flex justify-center mt-2">
                <button
                  class="text-sm text-ink-medium border chart-copy-btn rounded px-3 py-1.5 hover:text-cinnabar transition-colors"
                  :aria-label="chartTextCopied ? '已复制' : '复制星盘文本，可粘贴给 AI 解读'"
                  @click="copyChartText"
                  @keydown.enter="copyChartText"
                >
                  <span v-if="chartTextCopied">✓ 已复制</span>
                  <span v-else>📋 复制星盘文本</span>
                </button>
              </div>

              <NatalChartGuide v-if="result" :data="natalChartData" :result="result" />
            </div>

            <!-- 缺少出生年份时的提示 -->
            <div v-else class="fade-in" :style="{ '--delay': '0.3s' }">
              <div class="card-warm rounded-xl p-8 text-center opacity-65">
                <p class="font-sans text-sm text-ink-medium mb-3">需要出生年份以计算行星位置</p>
                <NuxtLink
                  :to="`/profile/${currentProfile?.id}`"
                  class="text-xs text-cinnabar font-sans underline underline-offset-2"
                >
                  编辑档案 → 填写完整出生日期
                </NuxtLink>
              </div>
            </div>
          </section>

          <!-- Ⅲ 今日运势与宜忌 -->
          <section
            id="constellation-today"
            class="editorial-section"
            aria-labelledby="constellation-today-heading"
          >
            <SectionHeading
              num="Ⅲ"
              title="今日运势与宜忌"
              heading-id="constellation-today-heading"
            />
            <HoroscopePanel :horoscope="result.todayHoroscope" />

            <YiJiPanel :yi="result.todayYi" :ji="result.todayJi" />
          </section>

          <!-- Ⅳ 速配星座 -->
          <section
            id="constellation-match"
            class="editorial-section"
            aria-labelledby="constellation-match-heading"
          >
            <SectionHeading num="Ⅳ" title="速配星座" heading-id="constellation-match-heading" />
            <ConstellationCompatibility :items="result.compatibility" />
          </section>
        </div>
      </Transition>

      <!-- Action buttons -->
      <div class="flex flex-wrap gap-3 justify-center my-8">
        <button
          class="btn-cin"
          @click="scrollToConstellationNav"
          @keydown.space.prevent="scrollToConstellationNav"
        >
          <span>切换星座</span>
        </button>
      </div>
    </template>

    <!-- 根级附加区：回到顶部不属于阅读流，放在外壳同级 -->
    <template #after>
      <ScrollTopButton
        v-if="result && showScrollTop"
        @click="scrollToTop"
        @keydown.enter="scrollToTop"
      />
    </template>
  </ToolEditorialShell>
</template>

<style scoped>
.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.25s ease;
}
.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}

.constellation-mobile-nav-active {
  background: color-mix(in srgb, var(--color-cinnabar) 10%, transparent);
}
.constellation-mobile-nav-inactive:hover {
  background: color-mix(in srgb, var(--color-paper-medium) 50%, transparent);
}
.chart-copy-btn {
  border-color: color-mix(in srgb, var(--color-ink-faint) 20%, transparent);
}
.chart-copy-btn:hover {
  border-color: color-mix(in srgb, var(--color-cinnabar) 30%, transparent);
}
</style>
