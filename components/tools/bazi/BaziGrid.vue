<template>
  <div class="fade-in" :style="{ '--delay': '0.05s' }">
    <InkDivider>四柱排盘</InkDivider>

    <!-- Desktop: full grid -->
    <div class="hidden sm:block">
      <div class="grid grid-cols-4 gap-0 border border-cinnabar/25 rounded-lg overflow-hidden">
        <!-- Header -->
        <div v-for="h in headers" :key="h.label"
          class="py-1.5 px-2 text-center border-b border-cinnabar/25 text-[0.65rem] text-ink-medium tracking-widest font-sans"
          :class="h.isDay ? 'bg-cinnabar/7' : 'bg-cinnabar/4'"
          :style="h.isDay ? { 'border-right': '1px solid rgba(198,40,40,0.25)' } : {}"
        >
          {{ h.label }}
          <span v-if="h.isDay" class="text-cinnabar text-[0.55rem] ml-1">日主</span>
        </div>

        <!-- Stem row -->
        <div v-for="(p, idx) in pillars" :key="'stem-' + idx"
          class="py-2.5 px-2 text-center text-2xl sm:text-3xl font-sans font-medium border-b border-paper-dark"
          :class="[idx < 3 ? 'border-r border-paper-dark' : '', idx === 2 ? 'bg-cinnabar/3' : '']"
          :style="{ color: wuxingColor(p.stemWuxing) }"
        >
          {{ p.stem }}
        </div>

        <!-- Branch row -->
        <div v-for="(p, idx) in pillars" :key="'branch-' + idx"
          class="pb-2.5 px-2 text-center text-2xl sm:text-3xl font-sans font-medium border-b border-paper-dark"
          :class="[idx < 3 ? 'border-r border-paper-dark' : '', idx === 2 ? 'bg-cinnabar/3' : '']"
          :style="{ color: wuxingColor(p.branchWuxing) }"
        >
          {{ p.branch }}
        </div>

        <!-- Ten God row -->
        <div v-for="(p, idx) in pillars" :key="'tg-' + idx"
          class="py-1.5 px-2 text-center border-b border-paper-dark"
          :class="[idx < 3 ? 'border-r border-paper-dark' : '', idx === 2 ? 'bg-cinnabar/3' : '']"
        >
          <span class="inline-block px-2 py-0.5 rounded-full text-[0.6rem] leading-tight font-sans"
            :class="tenGodBadgeClass(p.stemTenGod)">
            {{ p.stemTenGod }}
          </span>
        </div>

        <!-- Hidden Stems row -->
        <div v-for="(p, idx) in pillars" :key="'hs-' + idx"
          class="py-2 px-2 text-center text-xs sm:text-sm text-ink-light leading-relaxed border-b border-paper-dark"
          :class="[idx < 3 ? 'border-r border-paper-dark' : '', idx === 2 ? 'bg-cinnabar/3' : '']"
        >
          <span v-for="(hs, hIdx) in p.hiddenStems" :key="hIdx"
            class="inline-block mr-1 last:mr-0"
            :style="{ color: wuxingColor(hs.wuxing) }">
            {{ hs.stem }}
          </span>
        </div>

        <!-- NaYin row -->
        <div v-for="(p, idx) in pillars" :key="'ny-' + idx"
          class="py-1.5 px-2 text-center text-[0.6rem] text-ink-lighter font-sans"
          :class="[idx < 3 ? 'border-r border-paper-dark' : '', idx === 2 ? 'bg-cinnabar/3' : '']"
        >
          {{ getNaYin(p.stem, p.branch) }}
        </div>
      </div>
    </div>

    <!-- Mobile: horizontal scroll cards -->
    <div class="sm:hidden">
      <div class="overflow-x-auto -mx-4 px-4 pb-3 scrollbar-hide">
        <div class="inline-flex gap-2">
          <div v-for="(p, idx) in pillars" :key="'card-' + idx"
            class="inline-flex flex-col w-[72px] rounded-lg overflow-hidden flex-shrink-0"
            :class="idx === 2 ? 'border-2 border-cinnabar' : 'border border-cinnabar/20'"
          >
            <!-- Mobile header -->
            <div class="py-1 text-center font-sans"
              :class="idx === 2 ? 'bg-cinnabar/10' : 'bg-cinnabar/4'"
            >
              <span class="text-[0.55rem] text-ink-medium tracking-wider">
                {{ ['年', '月', '日', '时'][idx] }}柱
              </span>
            </div>
            <!-- Stem -->
            <div class="py-1 text-center text-xl font-sans font-medium"
              :style="{ color: wuxingColor(p.stemWuxing) }">
              {{ p.stem }}
            </div>
            <!-- Branch -->
            <div class="pb-1 text-center text-xl font-sans font-medium"
              :style="{ color: wuxingColor(p.branchWuxing) }">
              {{ p.branch }}
            </div>
            <!-- Ten God -->
            <div class="px-1 pb-1 text-center">
              <span class="inline-block px-1.5 py-0.5 rounded-full text-[0.5rem] font-sans"
                :class="tenGodBadgeClass(p.stemTenGod)">
                {{ p.stemTenGod }}
              </span>
            </div>
            <!-- Hidden Stems -->
            <div class="px-1 pb-1 text-center text-[0.55rem] text-ink-light leading-tight">
              <span v-for="(hs, hIdx) in p.hiddenStems" :key="hIdx"
                class="mr-0.5" :style="{ color: wuxingColor(hs.wuxing) }">
                {{ hs.stem }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="text-center text-[0.55rem] text-ink-lighter mt-0.5">← 左右滑动查看四柱 →</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BaZiPillar } from '~/composables/useBaZi'

defineProps<{
  pillars: BaZiPillar[]
}>()

const headers = [
  { label: '年柱', isDay: false },
  { label: '月柱', isDay: false },
  { label: '日柱', isDay: true },
  { label: '时柱', isDay: false },
]

const wuxingColors: Record<string, string> = {
  '木': '#4A7C59', '火': '#C62828', '土': '#B8860B',
  '金': '#8E8E8E', '水': '#2C5F7C',
}

function wuxingColor(wx: string): string {
  return wuxingColors[wx] || '#6B5B4F'
}

function tenGodBadgeClass(tg: string): string {
  if (tg === '日主') return 'bg-ink-dark/10 text-ink-dark'
  if (['正印', '偏印'].includes(tg)) return 'bg-wuxing-wood/10 text-wuxing-wood'
  if (['正官', '偏官'].includes(tg)) return 'bg-cinnabar/10 text-cinnabar'
  if (['正财', '偏财'].includes(tg)) return 'bg-[rgba(184,134,11,0.1)] text-gold'
  if (['食神', '伤官'].includes(tg)) return 'bg-wuxing-water/10 text-wuxing-water'
  return 'bg-ink-faint/20 text-ink-medium'
}

/** Simplified NaYin lookup (60-cycle pair index) */
const NAYIN_TABLE = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金',
  '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
  '泉中水', '屋上土', '霹雳火', '松柏木', '长流水',
  '沙中金', '山下火', '平地木', '壁上土', '金箔金',
  '佛灯火', '天河水', '大驿土', '钗钏金', '桑柘木',
  '大溪水', '沙中土', '天上火', '石榴木', '大海水',
]

function getNaYin(stem: string, branch: string): string {
  const stemIdx = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(stem)
  const branchIdx = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'].indexOf(branch)
  if (stemIdx < 0 || branchIdx < 0) return ''
  // Sexagenary cycle position formula
  const k = Math.floor(((stemIdx - branchIdx) / 2) + 6) % 6
  const sexagenaryPos = ((stemIdx + 10 * k) % 60 + 60) % 60
  return NAYIN_TABLE[Math.floor(sexagenaryPos / 2)] || ''
}
</script>
