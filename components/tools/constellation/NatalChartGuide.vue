<template>
  <div class="fade-in mt-6 mb-6" :style="{ '--delay': '0.35s' }">
    <div class="card-warm rounded-xl p-6 sm:p-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-display text-xl text-ink-dark">📖 星盘阅读指南</h2>
        <button
          :aria-expanded="expanded"
          aria-controls="chart-guide-content"
          class="marginal-toggle"
          @click="expanded = !expanded"
          @keydown.enter="expanded = !expanded"
          @keydown.space.prevent="expanded = !expanded"
        >
          <span class="marginal-toggle__rule" aria-hidden="true"></span>
          <span>{{ expanded ? '收起' : '展开' }}</span>
          <span class="marginal-toggle__arrow" aria-hidden="true">▼</span>
        </button>
      </div>

      <!-- Content (expandable) -->
      <Transition name="guide-expand">
        <div v-if="expanded" id="chart-guide-content">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- ═══ Left: Symbol Legend ═══ -->
            <div>
              <h4
                class="font-sans text-sm font-medium text-ink-dark mb-3 pb-2 border-b border-ink-faint/20"
              >
                符号图例
              </h4>

              <!-- Planets -->
              <div class="mb-4">
                <p class="font-sans text-xs text-ink-medium mb-2 tracking-wider">行星符号</p>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div v-for="p in planetLegend" :key="p.id" class="flex items-center gap-2">
                    <span class="text-sm w-6 text-center flex-shrink-0" aria-hidden="true">{{
                      p.glyph
                    }}</span>
                    <span class="font-sans text-xs text-ink-medium">{{ p.name }}</span>
                    <span class="font-sans text-xs text-ink-light ml-auto">{{ p.ringLabel }}</span>
                  </div>
                </div>
              </div>

              <!-- Aspect lines -->
              <div class="mb-4">
                <p class="font-sans text-xs text-ink-medium mb-2 tracking-wider">相位线</p>
                <div class="space-y-1.5">
                  <div v-for="a in aspectLegend" :key="a.type" class="flex items-center gap-2">
                    <span
                      class="w-8 flex-shrink-0"
                      :class="a.dashed ? 'border-t-2 border-dashed' : 'border-t-2'"
                      :style="{ borderColor: a.color, opacity: 0.5 }"
                      aria-hidden="true"
                    />
                    <span class="font-sans text-xs text-ink-medium"
                      >{{ a.symbol }} {{ a.label }}</span
                    >
                    <span class="font-sans text-xs text-ink-light ml-auto">{{ a.meaning }}</span>
                  </div>
                </div>
              </div>

              <!-- Rings -->
              <div class="mb-4">
                <p class="font-sans text-xs text-ink-medium mb-2 tracking-wider">三圈轨道</p>
                <div class="space-y-1">
                  <p class="font-sans text-xs text-ink-medium">
                    内圈 → 个人行星（日、月）— 性格内核
                  </p>
                  <p class="font-sans text-xs text-ink-medium">
                    中圈 → 社会行星（水、金、火）— 日常互动
                  </p>
                  <p class="font-sans text-xs text-ink-medium">
                    外圈 → 世代行星（木、土）— 时代背景
                  </p>
                </div>
              </div>

              <!-- Houses -->
              <div>
                <p class="font-sans text-xs text-ink-medium mb-2 tracking-wider">
                  12 宫位 · 代表的人生领域
                </p>
                <div class="grid grid-cols-3 gap-x-2 gap-y-1">
                  <p
                    v-for="h in houseNames"
                    :key="h.num"
                    class="font-sans text-xs text-ink-medium leading-relaxed"
                  >
                    <span class="text-cinnabar font-medium">{{ h.num }}</span> {{ h.label }}
                  </p>
                </div>
              </div>
            </div>

            <!-- ═══ Right: Your Chart Summary ═══ -->
            <div>
              <h4
                class="font-sans text-sm font-medium text-ink-dark mb-3 pb-2 border-b border-ink-faint/20"
              >
                你的星盘速览
              </h4>

              <!-- Big Three -->
              <div class="mb-4">
                <p class="font-sans text-xs text-ink-medium mb-2 tracking-wider">三巨头</p>
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm" aria-hidden="true">☀</span>
                    <span class="font-sans text-sm text-ink-dark">太阳 · {{ result.name }}</span>
                    <span class="font-sans text-xs text-ink-medium ml-auto">外在性格</span>
                  </div>
                  <div v-if="result.moonSign" class="flex items-center gap-2">
                    <span class="text-sm" aria-hidden="true">☽</span>
                    <span class="font-sans text-sm text-ink-dark"
                      >月亮 · {{ result.moonSign.name }}</span
                    >
                    <span class="font-sans text-xs text-ink-medium ml-auto">内在情感</span>
                  </div>
                  <div v-if="result.risingSign" class="flex items-center gap-2">
                    <span class="text-sm" aria-hidden="true">↑</span>
                    <span class="font-sans text-sm text-ink-dark"
                      >上升 · {{ result.risingSign.name }}</span
                    >
                    <span class="font-sans text-xs text-ink-medium ml-auto">社交面具</span>
                  </div>
                </div>
              </div>

              <!-- Element distribution -->
              <div v-if="elementBreakdown.length > 0" class="mb-4">
                <p class="font-sans text-xs text-ink-medium mb-2 tracking-wider">
                  元素分布（7颗行星）
                </p>
                <div class="space-y-1.5">
                  <div
                    v-for="eb in elementBreakdown"
                    :key="eb.element"
                    class="flex items-center gap-2"
                  >
                    <span class="font-sans text-xs text-ink-medium w-8">{{ eb.element }}象</span>
                    <div class="flex-1 h-1.5 bg-ink-dark/6 rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :style="{ width: eb.pct + '%', backgroundColor: eb.color }"
                      />
                    </div>
                    <span class="font-sans text-xs text-ink-medium w-12 text-right"
                      >{{ eb.count }}颗</span
                    >
                  </div>
                </div>
                <p class="font-sans text-xs text-ink-medium mt-2 leading-relaxed">
                  {{ elementConclusion }}
                </p>
              </div>

              <!-- House focus -->
              <div v-if="houseFocus.length > 0" class="mb-4">
                <p class="font-sans text-xs text-ink-medium mb-2 tracking-wider">宫位焦点</p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="hf in houseFocus"
                    :key="hf.house"
                    class="inline-flex items-center px-2 py-1 rounded text-xs font-sans"
                    :class="
                      hf.dominant
                        ? 'bg-cinnabar/10 text-cinnabar border border-cinnabar/20'
                        : 'bg-ink-faint/10 text-ink-medium border border-ink-faint/15'
                    "
                  >
                    第{{ hf.house }}宫 · {{ hf.count }}颗
                  </span>
                </div>
              </div>

              <!-- Stellium alert -->
              <div
                v-if="stelliums.length > 0"
                class="mb-4 p-3 rounded-lg bg-cinnabar/5 border border-cinnabar/15"
              >
                <p class="font-sans text-xs text-ink-dark font-medium mb-1">⚠ 群星汇聚</p>
                <p class="font-sans text-xs text-ink-medium leading-relaxed">
                  <template v-for="(s, i) in stelliums" :key="s.label">
                    {{ s.label }}<span v-if="i < stelliums.length - 1">；</span>
                  </template>
                  ——此领域能量高度集中，是你人生的核心舞台。
                </p>
              </div>

              <!-- Aspect summary -->
              <div>
                <p class="font-sans text-xs text-ink-medium mb-2 tracking-wider">相位类型</p>
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="w-3 h-3 rounded-full bg-jade-light/40 border border-jade-light/60"
                      aria-hidden="true"
                    />
                    <span class="font-sans text-xs text-ink-medium"
                      >和谐 {{ aspectCounts.harmonious }}</span
                    >
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span
                      class="w-3 h-3 rounded-full bg-cinnabar/30 border border-cinnabar/40"
                      aria-hidden="true"
                    />
                    <span class="font-sans text-xs text-ink-medium"
                      >紧张 {{ aspectCounts.challenging }}</span
                    >
                  </div>
                </div>
                <p class="font-sans text-xs text-ink-medium mt-2 leading-relaxed">
                  {{ aspectConclusion }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NatalChartData } from '~/composables/useNatalChart'
import type { ConstellationResult } from '~/composables/useConstellation'
import { PLANET_META } from '~/constants/planet-data'
import { ZODIACS } from '~/composables/useConstellation'

const props = defineProps<{
  data: NatalChartData
  result: ConstellationResult
}>()

const expanded = ref(false)

// ── Planet legend ────────────────────────────────────────────────

const RING_LABELS: Record<string, string> = {
  inner: '个人',
  mid: '社会',
  outer: '世代',
}

const planetLegend = computed(() =>
  Object.values(PLANET_META).map(m => ({
    id: m.id,
    glyph: m.glyph,
    name: m.name,
    ringLabel: RING_LABELS[m.ring] || '',
  })),
)

// ── Aspect legend ─────────────────────────────────────────────────

const aspectLegend = [
  {
    type: 'conjunction',
    symbol: '☌',
    label: '合相 · 融合强化',
    meaning: '蓝色（和谐）',
    color: 'var(--color-jade-light)',
    dashed: false,
  },
  {
    type: 'trine',
    symbol: '△',
    label: '三合 · 顺畅助力',
    meaning: '蓝色（和谐）',
    color: 'var(--color-jade-light)',
    dashed: false,
  },
  {
    type: 'sextile',
    symbol: '⚹',
    label: '六合 · 潜在机遇',
    meaning: '虚线（和谐）',
    color: 'var(--color-jade-light)',
    dashed: true,
  },
  {
    type: 'square',
    symbol: '□',
    label: '刑相 · 内在张力',
    meaning: '红色（紧张）',
    color: 'var(--color-cinnabar)',
    dashed: false,
  },
  {
    type: 'opposition',
    symbol: '☍',
    label: '对冲 · 两极拉扯',
    meaning: '红色（紧张）',
    color: 'var(--color-cinnabar)',
    dashed: false,
  },
]

// ── House labels ──────────────────────────────────────────────────

const houseNames = [
  { num: 1, label: '命宫·自我' },
  { num: 2, label: '财帛·价值' },
  { num: 3, label: '兄弟·沟通' },
  { num: 4, label: '田宅·家庭' },
  { num: 5, label: '子女·恋爱' },
  { num: 6, label: '奴仆·工作' },
  { num: 7, label: '夫妻·合作' },
  { num: 8, label: '疾厄·偏财' },
  { num: 9, label: '迁移·远行' },
  { num: 10, label: '官禄·事业' },
  { num: 11, label: '福德·交友' },
  { num: 12, label: '玄秘·潜意识' },
]

// ── Element breakdown ─────────────────────────────────────────────

const ELEMENT_ORDER = ['火', '土', '风', '水'] as const
const ELEMENT_COLORS: Record<string, string> = {
  火: '#C62828',
  土: '#7A5E12',
  风: '#3D6B4B',
  水: '#2C5F7C',
}

const elementBreakdown = computed(() => {
  const counts: Record<string, number> = { 火: 0, 土: 0, 风: 0, 水: 0 }
  for (const p of props.data.planets) {
    const el = ZODIACS[p.signIndex].element
    counts[el] = (counts[el] || 0) + 1
  }
  return ELEMENT_ORDER.map(el => ({
    element: el,
    count: counts[el],
    pct: Math.round((counts[el] / 7) * 100),
    color: ELEMENT_COLORS[el],
  }))
})

const dominantElement = computed(() => {
  let max = 0
  let dom = ''
  for (const eb of elementBreakdown.value) {
    if (eb.count > max) {
      max = eb.count
      dom = eb.element
    }
  }
  return max >= 3 ? dom : ''
})

const elementConclusion = computed(() => {
  const dom = dominantElement.value
  if (!dom) return '元素分布较均衡，性格层面适应力强，不偏执于一端。'
  const map: Record<string, string> = {
    火: `火象占优（${dom}），你行动力强、热情主动，是天生的开创者。`,
    土: `土象占优（${dom}），你沉稳务实、脚踏实地，善于长期耕耘与积累。`,
    风: `风象占优（${dom}），你思维活跃、善于沟通，在社交与创意领域如鱼得水。`,
    水: `水象占优（${dom}），你情感丰富、直觉敏锐，内心世界深邃而富有感染力。`,
  }
  return map[dom] || ''
})

// ── House focus ────────────────────────────────────────────────────

const houseFocus = computed(() => {
  if (!props.data.hasHouses) return []
  const counts: Record<number, number> = {}
  for (const p of props.data.planets) {
    if (p.houseIndex !== null) {
      counts[p.houseIndex] = (counts[p.houseIndex] || 0) + 1
    }
  }
  return Object.entries(counts)
    .filter(([, c]) => c >= 1)
    .map(([h, c]) => ({ house: Number(h), count: c, dominant: c >= 2 }))
    .sort((a, b) => b.count - a.count)
})

// ── Stellium detection ─────────────────────────────────────────────

const stelliums = computed(() => {
  const results: Array<{ label: string }> = []

  const signCounts: Record<number, number> = {}
  for (const p of props.data.planets) {
    signCounts[p.signIndex] = (signCounts[p.signIndex] || 0) + 1
  }
  for (const [idx, count] of Object.entries(signCounts)) {
    if (count >= 3) {
      results.push({ label: `${count}颗行星落入${ZODIACS[Number(idx)].name}` })
    }
  }

  if (props.data.hasHouses) {
    const houseCounts: Record<number, number> = {}
    for (const p of props.data.planets) {
      if (p.houseIndex !== null) {
        houseCounts[p.houseIndex] = (houseCounts[p.houseIndex] || 0) + 1
      }
    }
    for (const [h, count] of Object.entries(houseCounts)) {
      if (count >= 3) {
        const hn = houseNames.find(x => x.num === Number(h))
        results.push({ label: `${count}颗行星汇聚第${h}宫（${hn?.label.split('·')[0] || ''}）` })
      }
    }
  }

  return results
})

// ── Aspect counts ──────────────────────────────────────────────────

const aspectCounts = computed(() => {
  let harmonious = 0
  let challenging = 0
  for (const a of props.data.aspects) {
    if (['conjunction', 'sextile', 'trine'].includes(a.type)) harmonious++
    else challenging++
  }
  return { harmonious, challenging }
})

const aspectConclusion = computed(() => {
  const { harmonious, challenging } = aspectCounts.value
  if (harmonious > challenging + 2) return '和谐相位居多，内在能量流动顺畅，做事事半功倍。'
  if (challenging > harmonious + 2) return '紧张相位居多，内在张力较强，但挑战恰是成长的催化剂。'
  return '和谐与紧张相位均衡，人生充满动态平衡——有助力也有磨砺。'
})
</script>

<style scoped>
.guide-expand-enter-active,
.guide-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.guide-expand-enter-from,
.guide-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.guide-expand-enter-to,
.guide-expand-leave-from {
  max-height: 2000px;
  opacity: 1;
}
</style>
