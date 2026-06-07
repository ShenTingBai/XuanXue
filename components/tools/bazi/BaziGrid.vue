<template>
  <div class="fade-in" :style="{ '--delay': '0.05s' }">
    <p class="font-sans text-base text-ink-light mb-3 leading-relaxed">
      年柱代表家族根基，月柱代表成长环境，日柱代表你自己和婚姻，时柱代表晚年与子女。
    </p>

    <div class="card-warm rounded-xl p-8">
      <!-- Desktop: full grid -->
      <div class="hidden sm:block">
        <table
          class="border-2 bazi-border-accent rounded-lg overflow-clip w-full table-fixed border-separate"
          style="border-spacing: 0"
          aria-label="四柱排盘"
        >
          <thead>
            <tr>
              <th
                v-for="(h, idx) in headers"
                :key="h.label"
                scope="col"
                class="py-1.5 px-2 text-center border-b bazi-border-accent text-xs text-ink-medium tracking-widest font-sans"
                :class="[
                  h.isDay ? 'bazi-th-highlight' : 'bazi-th-tint',
                  idx < 3 ? 'border-r-2 bazi-border-accent' : '',
                ]"
              >
                {{ h.label }}
                <span v-if="h.isDay" class="text-cinnabar text-xs ml-1">日主</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Stem row -->
            <tr>
              <td
                v-for="(p, idx) in pillars"
                :key="'stem-' + idx"
                class="py-2.5 px-2 text-center text-2xl sm:text-3xl font-sans font-medium border-b bazi-border-soft"
                :class="[
                  idx < 3 ? 'border-r-2 bazi-border-soft' : '',
                  idx === 2 ? 'bazi-td-highlight' : '',
                ]"
                :style="{ color: wuxingColor(p.stemWuxing) }"
              >
                {{ p.stem }}<span class="sr-only">({{ p.stemWuxing }})</span>
              </td>
            </tr>
            <!-- Branch row -->
            <tr>
              <td
                v-for="(p, idx) in pillars"
                :key="'branch-' + idx"
                class="pb-2.5 px-2 text-center text-2xl sm:text-3xl font-sans font-medium border-b bazi-border-soft"
                :class="[
                  idx < 3 ? 'border-r-2 bazi-border-soft' : '',
                  idx === 2 ? 'bazi-td-highlight' : '',
                ]"
                :style="{ color: wuxingColor(p.branchWuxing) }"
              >
                {{ p.branch }}<span class="sr-only">({{ p.branchWuxing }})</span>
              </td>
            </tr>
            <!-- Ten God row -->
            <tr>
              <td
                v-for="(p, idx) in pillars"
                :key="'tg-' + idx"
                class="py-1.5 px-2 text-center border-b bazi-border-soft"
                :class="[
                  idx < 3 ? 'border-r-2 bazi-border-soft' : '',
                  idx === 2 ? 'bazi-td-highlight' : '',
                ]"
              >
                <span
                  class="inline-block px-2 py-0.5 rounded-full text-xs leading-tight font-sans"
                  :class="tenGodBadgeClass(p.stemTenGod)"
                >
                  {{ p.stemTenGod }}
                </span>
              </td>
            </tr>
            <!-- Hidden Stems row -->
            <tr>
              <td
                v-for="(p, idx) in pillars"
                :key="'hs-' + idx"
                class="py-2 px-2 text-center text-sm sm:text-base text-ink-light leading-relaxed border-b bazi-border-soft"
                :class="[
                  idx < 3 ? 'border-r-2 bazi-border-soft' : '',
                  idx === 2 ? 'bazi-td-highlight' : '',
                ]"
              >
                <span
                  v-for="(hs, hIdx) in p.hiddenStems"
                  :key="hIdx"
                  class="inline-block mr-1 last:mr-0"
                  :style="{ color: wuxingColor(hs.wuxing) }"
                >
                  {{ hs.stem }}
                </span>
              </td>
            </tr>
            <!-- NaYin row -->
            <tr>
              <td
                v-for="(p, idx) in pillars"
                :key="'ny-' + idx"
                class="py-1.5 px-2 text-center text-xs text-ink-muted font-sans border-b bazi-border-soft"
                :class="[
                  idx < 3 ? 'border-r-2 bazi-border-soft' : '',
                  idx === 2 ? 'bazi-td-highlight' : '',
                ]"
              >
                {{ getNaYin(p.stem, p.branch) }}
              </td>
            </tr>
            <!-- Interpretation row -->
            <tr>
              <td
                v-for="(p, idx) in pillars"
                :key="'interp-' + idx"
                class="py-1.5 px-2 text-left align-top"
                :class="[
                  idx < 3 ? 'border-r-2 bazi-border-subtle' : '',
                  idx === 2 ? 'bazi-td-highlight' : '',
                ]"
              >
                <p
                  v-if="p.interpretation"
                  class="border-l-2 bazi-border-faint pl-2 py-1 font-sans text-[0.6875rem] text-ink-muted leading-relaxed"
                >
                  {{ p.interpretation }}
                </p>
              </td>
            </tr>
            <!-- Palace row (胎元/命宫/身宫) -->
            <tr v-if="palaces">
              <td colspan="4" class="py-2 px-2 text-center border-t-2 bazi-border-accent">
                <div class="flex justify-center gap-6 text-sm font-sans">
                  <div v-if="palaces.taiYuan">
                    <span class="text-ink-muted mr-1">胎元</span>
                    <span :style="{ color: wuxingColor(palaces.taiYuan.stemWuxing) }"
                      >{{ palaces.taiYuan.stem }}{{ palaces.taiYuan.branch }}</span
                    >
                  </div>
                  <div v-if="palaces.mingGong">
                    <span class="text-ink-muted mr-1">命宫</span>
                    <span :style="{ color: wuxingColor(palaces.mingGong.stemWuxing) }"
                      >{{ palaces.mingGong.stem }}{{ palaces.mingGong.branch }}</span
                    >
                  </div>
                  <div v-if="palaces.shenGong">
                    <span class="text-ink-muted mr-1">身宫</span>
                    <span :style="{ color: wuxingColor(palaces.shenGong.stemWuxing) }"
                      >{{ palaces.shenGong.stem }}{{ palaces.shenGong.branch }}</span
                    >
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile: horizontal scroll cards -->
      <div class="sm:hidden">
        <div class="overflow-x-auto -mx-4 px-4 pb-3">
          <div class="inline-flex gap-2" role="list" aria-label="四柱排盘">
            <div
              v-for="(p, idx) in pillars"
              :key="'card-' + idx"
              role="listitem"
              class="inline-flex flex-col w-[104px] rounded-lg overflow-hidden flex-shrink-0"
              :class="
                idx === 2
                  ? 'border-2 border-cinnabar bazi-td-highlight'
                  : 'border border-paper-dark'
              "
            >
              <!-- Mobile header -->
              <div
                class="py-1 text-center font-sans"
                :class="idx === 2 ? 'bazi-th-highlight' : 'bazi-th-tint'"
              >
                <span class="text-xs text-ink-medium tracking-wider">
                  {{ ['年', '月', '日', '时'][idx] }}柱
                </span>
                <span v-if="idx === 2" class="text-xs leading-none text-cinnabar">日主</span>
              </div>
              <!-- Stem -->
              <div
                class="py-1 text-center text-xl font-sans font-medium"
                :style="{ color: wuxingColor(p.stemWuxing) }"
              >
                {{ p.stem }}<span class="sr-only">({{ p.stemWuxing }})</span>
              </div>
              <!-- Branch -->
              <div
                class="pb-1 text-center text-xl font-sans font-medium"
                :style="{ color: wuxingColor(p.branchWuxing) }"
              >
                {{ p.branch }}<span class="sr-only">({{ p.branchWuxing }})</span>
              </div>
              <!-- Ten God -->
              <div class="px-1 pb-1 text-center">
                <span
                  class="inline-block px-1.5 py-0.5 rounded-full text-xs font-sans"
                  :class="tenGodBadgeClass(p.stemTenGod)"
                >
                  {{ p.stemTenGod }}
                </span>
              </div>
              <!-- Hidden Stems -->
              <div class="px-1 pb-1 text-center text-xs text-ink-light leading-tight">
                <span
                  v-for="(hs, hIdx) in p.hiddenStems"
                  :key="hIdx"
                  class="mr-0.5"
                  :style="{ color: wuxingColor(hs.wuxing) }"
                >
                  {{ hs.stem }}
                </span>
              </div>
              <!-- NaYin -->
              <div class="px-1 pb-1 text-center text-xs text-ink-muted font-sans">
                {{ getNaYin(p.stem, p.branch) }}
              </div>
              <!-- Interpretation -->
              <div v-if="p.interpretation" class="px-1 pb-1">
                <p
                  class="border-l-2 bazi-border-faint pl-1.5 font-sans text-[0.6875rem] text-ink-muted leading-tight"
                >
                  {{ p.interpretation }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <!-- Mobile palace display -->
        <div v-if="palaces" class="sm:hidden mt-3 pt-3 border-t bazi-divider">
          <div class="flex justify-center gap-4 text-sm font-sans">
            <div v-if="palaces.taiYuan">
              <span class="text-ink-muted text-xs mr-0.5">胎</span>
              <span :style="{ color: wuxingColor(palaces.taiYuan.stemWuxing) }"
                >{{ palaces.taiYuan.stem }}{{ palaces.taiYuan.branch }}</span
              >
            </div>
            <div v-if="palaces.mingGong">
              <span class="text-ink-muted text-xs mr-0.5">命</span>
              <span :style="{ color: wuxingColor(palaces.mingGong.stemWuxing) }"
                >{{ palaces.mingGong.stem }}{{ palaces.mingGong.branch }}</span
              >
            </div>
            <div v-if="palaces.shenGong">
              <span class="text-ink-muted text-xs mr-0.5">身</span>
              <span :style="{ color: wuxingColor(palaces.shenGong.stemWuxing) }"
                >{{ palaces.shenGong.stem }}{{ palaces.shenGong.branch }}</span
              >
            </div>
          </div>
          <div class="text-center text-xs text-ink-muted mt-1 font-sans">胎元 · 命宫 · 身宫</div>
        </div>
      </div>

      <!-- Shared legend (below both desktop and mobile views) -->
      <div
        class="mt-4 pt-3 border-t bazi-divider grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm text-ink-muted font-sans"
      >
        <div>天干 — 外在表现，他人可见的特质</div>
        <div>地支 — 内在根基，潜藏的能量与倾向</div>
        <div>十神 — 六亲关系与人际互动模式</div>
        <div>藏干 — 地支中暗藏的天干能量</div>
        <div>纳音 — 五行音律，命格气质类型</div>
        <div>批注 — 四柱解读参考</div>
        <!-- Ten god color legend -->
        <div
          class="col-span-2 sm:col-span-3 grid grid-cols-5 gap-x-2 gap-y-0.5 text-xs mt-1 pt-1.5 border-t bazi-legend-divider"
        >
          <span class="text-wuxing-wood">印—学识</span>
          <span class="text-cinnabar">官—事业</span>
          <span class="text-gold">财—财富</span>
          <span class="text-wuxing-water">食伤—才华</span>
          <span class="text-wuxing-earth">比劫—人际</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BaZiPillar, BaZiPalace } from '~/composables/useBaZi'
import { wuxingColor, getNaYin } from '~/constants/bazi'

const props = defineProps<{
  pillars: BaZiPillar[]
  palaces?: {
    taiYuan: BaZiPalace | null
    mingGong: BaZiPalace | null
    shenGong: BaZiPalace | null
  } | null
}>()

const allHeaders = [
  { label: '年柱', isDay: false },
  { label: '月柱', isDay: false },
  { label: '日柱', isDay: true },
  { label: '时柱', isDay: false },
]

const headers = computed(() => {
  return allHeaders.slice(0, props.pillars.length)
})

function tenGodBadgeClass(tg: string): string {
  if (tg === '日主') return 'bazi-tg-rikishin text-ink-dark'
  if (['正印', '偏印'].includes(tg)) return 'bazi-tg-wood text-wuxing-wood'
  if (['正官', '偏官'].includes(tg)) return 'bazi-tg-official text-cinnabar'
  if (['正财', '偏财'].includes(tg)) return 'bazi-tg-gold text-gold'
  if (['食神', '伤官'].includes(tg)) return 'bazi-tg-water text-wuxing-water'
  if (['比肩', '劫财'].includes(tg)) return 'bazi-tg-earth text-wuxing-earth'
  return 'bazi-tg-fallback text-ink-medium'
}
</script>

<style scoped>
.bazi-th-highlight {
  background: color-mix(in srgb, var(--color-cinnabar) 18%, transparent);
}
.bazi-th-tint {
  background: color-mix(in srgb, var(--color-cinnabar) 4%, transparent);
}
.bazi-td-highlight {
  background: color-mix(in srgb, var(--color-cinnabar) 15%, transparent);
}
.bazi-border-accent {
  border-color: color-mix(in srgb, var(--color-cinnabar) 50%, transparent);
}
.bazi-border-soft {
  border-color: color-mix(in srgb, var(--color-cinnabar) 30%, transparent);
}
.bazi-border-subtle {
  border-color: color-mix(in srgb, var(--color-cinnabar) 20%, transparent);
}
.bazi-border-faint {
  border-color: color-mix(in srgb, var(--color-cinnabar) 25%, transparent);
}
.bazi-tg-official {
  background: color-mix(in srgb, var(--color-cinnabar) 10%, transparent);
}
.bazi-tg-rikishin {
  background: color-mix(in srgb, var(--color-ink-dark) 10%, transparent);
}
.bazi-tg-wood {
  background: color-mix(in srgb, var(--color-wuxing-wood) 10%, transparent);
}
.bazi-tg-gold {
  background: color-mix(in srgb, var(--color-gold) 10%, transparent);
}
.bazi-tg-water {
  background: color-mix(in srgb, var(--color-wuxing-water) 10%, transparent);
}
.bazi-tg-earth {
  background: color-mix(in srgb, var(--color-wuxing-earth) 10%, transparent);
}
.bazi-tg-fallback {
  background: color-mix(in srgb, var(--color-ink-faint) 20%, transparent);
}
.bazi-divider {
  border-color: color-mix(in srgb, var(--color-paper-dark) 50%, transparent);
}
.bazi-legend-divider {
  border-color: color-mix(in srgb, var(--color-paper-dark) 30%, transparent);
}
</style>
