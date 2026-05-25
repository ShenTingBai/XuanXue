<template>
  <div class="fade-in" :style="{ '--delay': '0.05s' }">
    <InkDivider>四柱排盘</InkDivider>

    <p class="font-sans text-sm text-ink-light/70 mb-3 leading-relaxed">
      年柱代表家族根基，月柱代表成长环境，日柱代表你自己和婚姻，时柱代表晚年与子女。
    </p>

    <div class="card-paper-solid rounded-xl p-4 sm:p-5">
    <!-- Desktop: full grid -->
    <div class="hidden sm:block">
      <div class="grid gap-0 border border-cinnabar/25 rounded-lg overflow-hidden"
        :style="{ gridTemplateColumns: `repeat(${pillars.length}, 1fr)` }"
      >
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
      <div class="mt-4 pt-3 border-t border-paper-dark/50 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-ink-lighter font-sans">
        <div>天干 — 上面的彩色大字</div>
        <div>地支 — 下面的彩色大字</div>
        <div>十神 — 人际关系标签</div>
        <div>藏干 — 地支暗藏能量</div>
        <div>纳音 — 五行音律气质</div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import type { BaZiPillar } from '~/composables/useBaZi'
import InkDivider from '~/components/tools/InkDivider.vue'
import { WUXING_COLORS, WUXING_FALLBACK_COLOR, STEMS, BRANCHES } from '~/constants/bazi'

const props = defineProps<{
  pillars: BaZiPillar[]
}>()

const headers = computed(() => {
  const allHeaders = [
    { label: '年柱', isDay: false },
    { label: '月柱', isDay: false },
    { label: '日柱', isDay: true },
    { label: '时柱', isDay: false },
  ]
  return allHeaders.slice(0, props.pillars.length)
})

function wuxingColor(wx: string): string {
  return WUXING_COLORS[wx] || WUXING_FALLBACK_COLOR
}

function tenGodBadgeClass(tg: string): string {
  if (tg === '日主') return 'bg-ink-dark/10 text-ink-dark'
  if (['正印', '偏印'].includes(tg)) return 'bg-wuxing-wood/10 text-wuxing-wood'
  if (['正官', '偏官'].includes(tg)) return 'bg-cinnabar/10 text-cinnabar'
  if (['正财', '偏财'].includes(tg)) return 'bg-gold/10 text-gold'
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
  const stemIdx = STEMS.indexOf(stem)
  const branchIdx = BRANCHES.indexOf(branch)
  if (stemIdx < 0 || branchIdx < 0) return ''
  // Valid sexagenary pairs: stem and branch indices must have same parity
  if ((stemIdx - branchIdx) % 2 !== 0) return ''
  // Sexagenary cycle position formula
  const k = (((stemIdx - branchIdx) / 2) + 6) % 6
  const sexagenaryPos = ((stemIdx + 10 * k) % 60 + 60) % 60
  return NAYIN_TABLE[Math.floor(sexagenaryPos / 2)] || ''
}
</script>
