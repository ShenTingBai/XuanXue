<template>
  <div class="fade-in fortune-wrap" :style="{ '--delay': '0.15s' }">
    <div class="oracle-slip">
      <div class="oracle-rule" aria-hidden="true" />

      <div class="oracle-hd">
        <div class="oracle-chop" aria-hidden="true">日</div>
        <h2 class="oracle-ttl">今日运势</h2>
        <span class="oracle-date">{{ dateLabel }}</span>
      </div>

      <!-- No birth data -->
      <p v-if="!hasBirthData" class="oracle-body-empty">
        暂无出生信息，<NuxtLink :to="`/profile/${profile.id}`" class="oracle-link">完善档案</NuxtLink> 后可查看今日运势
      </p>

      <!-- Fortune body -->
      <template v-else>
        <div class="oracle-divider" aria-hidden="true" />
        <div class="oracle-body">
          <p class="oracle-line" v-for="(line, i) in fortuneLines" :key="i">{{ line }}</p>
        </div>
        <div class="oracle-foot">
          <span class="oracle-tag oracle-tag--yi">
            <span class="tag-label">宜</span>
            <span class="tag-items">{{ yiItems }}</span>
          </span>
          <span class="oracle-tag oracle-tag--ji">
            <span class="tag-label">忌</span>
            <span class="tag-items">{{ jiItems }}</span>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Profile } from '~/composables/useAuth'
import { parseDate } from '~/utils/date'
import { calculateShengXiao } from '~/composables/useShengXiao'
import { calculateConstellation } from '~/composables/useConstellation'

const props = defineProps<{
  profile: Profile
}>()

const parsedDate = computed(() => {
  if (!props.profile.birth_date) return null
  return parseDate(props.profile.birth_date)
})

const hasBirthData = computed(() => !!parsedDate.value)

const shengXiaoResult = computed(() => {
  const pd = parsedDate.value
  if (!pd) return null
  return calculateShengXiao(pd.year)
})

const constellationResult = computed(() => {
  const pd = parsedDate.value
  if (!pd) return null
  return calculateConstellation(pd.month, pd.day)
})

/** Per-dimension scores merging both systems */
const dimensionScores = computed(() => {
  const sx = shengXiaoResult.value
  const cs = constellationResult.value
  const scores: Record<string, number[]> = {}

  if (sx) {
    scores.overall = [avg(sx.fortune)]
    scores.career = [sx.fortune.career.score]
    scores.wealth = [sx.fortune.wealth.score]
    scores.love = [sx.fortune.love.score]
    scores.health = [sx.fortune.health.score]
  }
  if (cs) {
    ;(scores.overall ??= []).push(cs.todayHoroscope.overall)
    ;(scores.love ??= []).push(cs.todayHoroscope.love)
    ;(scores.career ??= []).push(cs.todayHoroscope.career)
    ;(scores.wealth ??= []).push(cs.todayHoroscope.wealth)
    ;(scores.health ??= []).push(cs.todayHoroscope.health)
  }

  const result: Record<string, number> = {}
  for (const [key, vals] of Object.entries(scores)) {
    result[key] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  // Guard: ensure all dimensions have a value even if a system returned nothing
  result.overall ??= 50
  result.career ??= 50
  result.wealth ??= 50
  result.love ??= 50
  result.health ??= 50
  return result as { overall: number; career: number; wealth: number; love: number; health: number }
})

function avg(f: { career: { score: number }; wealth: { score: number }; love: { score: number }; health: { score: number } }): number {
  return Math.round((f.career.score + f.wealth.score + f.love.score + f.health.score) / 4)
}

/** Pick template item by score bracket */
function level(score: number): keyof typeof DIM_TEXTS.career {
  if (score >= 80) return 'high'
  if (score >= 65) return 'good'
  if (score >= 50) return 'medium'
  if (score >= 35) return 'low'
  return 'veryLow'
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

const fortuneLines = computed(() => {
  const s = dimensionScores.value
  const lines: string[] = []

  // Opening — overall
  lines.push(pick(DIM_TEXTS.overall[level(s.overall)], s.overall))

  // Career
  lines.push(pick(DIM_TEXTS.career[level(s.career)], s.career))

  // Wealth
  lines.push(pick(DIM_TEXTS.wealth[level(s.wealth)], s.wealth))

  // Love
  lines.push(pick(DIM_TEXTS.love[level(s.love)], s.love))

  // Health
  lines.push(pick(DIM_TEXTS.health[level(s.health)], s.health))

  return lines
})

const yiItems = computed(() => {
  const s = dimensionScores.value
  const items: string[] = []
  if (s.career >= 65) items.push('进取')
  if (s.wealth >= 65) items.push('投资')
  if (s.love >= 65) items.push('交际')
  if (s.health >= 65) items.push('运动')
  if (s.overall >= 65) { items.push('决策') }
  else if (s.overall >= 50) { items.push('规划') }
  else { items.push('静思', '守成') }
  // Deduplicate and limit
  return [...new Set(items)].slice(0, 5).join(' · ')
})

const jiItems = computed(() => {
  const s = dimensionScores.value
  const items: string[] = []
  if (s.career < 50) items.push('冒进')
  if (s.wealth < 50) items.push('投资')
  if (s.love < 50) items.push('争执')
  if (s.health < 50) items.push('熬夜')
  if (s.overall < 35) items.push('出行')
  if (s.overall < 50) items.push('冲动')
  if (items.length === 0) items.push('大意')
  return [...new Set(items)].slice(0, 5).join(' · ')
})

const dateLabel = ref('')
import { onMounted, onUnmounted } from 'vue'

let dateTimer: ReturnType<typeof setInterval> | null = null

function updateDateLabel() {
  const d = new Date()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  dateLabel.value = `${d.getMonth() + 1}月${d.getDate()}日 · ${weekdays[d.getDay()]}`
}

onMounted(() => {
  updateDateLabel()
  dateTimer = setInterval(updateDateLabel, 60_000) // update every minute
})

onUnmounted(() => {
  if (dateTimer !== null) clearInterval(dateTimer)
})

// ── Dimension templates ──

type DimLevel = 'high' | 'good' | 'medium' | 'low' | 'veryLow'

const DIM_TEXTS: Record<string, Record<DimLevel, string[]>> = {
  overall: {
    high: ['今日运势亨通，吉星照临，百事可为。', '天时地利人和，运势鼎盛，宜趁势进取。'],
    good: ['运势渐入佳境，贵人相助，事半功倍。', '云开月朗，今日运势良好，宜主动出击。'],
    medium: ['运势平稳，按部即安，不宜冒进。', '风平浪静之日，宜持中守正，以静制动。'],
    low: ['运势稍滞，宜谨言慎行，凡事三思。', '云霭遮日，运势欠佳，宜敛藏锋芒。'],
    veryLow: ['运势低迷，宜静不宜动，韬光养晦。', '时运不济，宜守不宜攻，静待时机。'],
  },
  career: {
    high: ['事业运旺盛，利于开拓新局，把握良机。', '职场运势强劲，有望获得重要突破，大展宏图。'],
    good: ['事业运良好，贵人相助，事半功倍。', '工作进展顺利，宜乘势推进，扩大战果。'],
    medium: ['事业运平稳，按部就班即可，不宜冒进。', '工作无大波澜，踏实做事，稳中求进。'],
    low: ['事业运欠佳，易遇阻力，宜沉着应对。', '职场多阻，需谨慎行事，避免与人争执。'],
    veryLow: ['事业受阻，宜守不宜攻，养精蓄锐。', '职场不利，谨防小人，以退为进方为上策。'],
  },
  wealth: {
    high: ['财运亨通，正财偏财俱佳，宜积极布局。', '财星高照，投资理财有望获利，把握良机。'],
    good: ['财运良好，正财稳健，合作求财有利。', '财运不错，宜合理规划，可适度投资。'],
    medium: ['财运平稳，宜守不宜攻，注意节制开支。', '财星平平，不宜投机，稳扎稳打为上。'],
    low: ['财运欠佳，谨防破财，勿轻信他人推荐。', '财运不稳，宜保守理财，避免冲动消费。'],
    veryLow: ['财运低迷，不宜投资，守财为上。', '破财之象，需格外谨慎处理财务事务。'],
  },
  love: {
    high: ['感情运旺盛，桃花盛开，宜主动表达心意。', '感情极佳，与伴侣关系升温，甜蜜和睦。'],
    good: ['感情运良好，适合约会沟通，增进情谊。', '桃花运不错，单身者有望结识良缘。'],
    medium: ['感情运平稳，宜多些耐心，平淡见真情。', '感情无大波动，多些陪伴胜过千言万语。'],
    low: ['感情运欠佳，易生误会，需多加沟通。', '感情需谨慎，避免因小事激化矛盾。'],
    veryLow: ['感情多阻，宜冷静处理，不可冲动行事。', '感情运势低迷，独善其身为上。'],
  },
  health: {
    high: ['身体健康，精力充沛，宜适当运动。', '身体状况极佳，精神饱满，神采奕奕。'],
    good: ['身体状况良好，保持规律作息即可。', '健康平稳，精力充足，状态不错。'],
    medium: ['健康平稳，注意劳逸结合，避免过劳。', '身体无大碍，注意作息规律即可。'],
    low: ['健康欠佳，注意休息，避免过度劳累。', '身体易感疲劳，宜适当调养，不可勉强。'],
    veryLow: ['健康低迷，需格外注意休养，不可熬夜。', '身体虚弱，宜静养调理，切忌过度消耗。'],
  },
}
</script>

<style scoped>
.fortune-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
}

.oracle-slip {
  position: relative;
  background: var(--color-paper-card, #E8DCC6);
  border-radius: 0.75rem;
  padding: 1.75rem 2rem;
  width: 100%;
  box-shadow:
    inset 0 0 0 1px rgba(44, 26, 14, 0.015),
    0 4px 20px rgba(44, 26, 14, 0.04);
  transition: box-shadow 0.35s ease;
}
.oracle-slip:hover {
  box-shadow:
    inset 0 0 0 1px rgba(198, 40, 40, 0.03),
    0 6px 28px rgba(44, 26, 14, 0.06);
}

.oracle-rule {
  position: absolute;
  top: -1px;
  left: 20%;
  right: 20%;
  height: 2px;
  background: repeating-linear-gradient(90deg,
    rgba(198, 40, 40, 0.12) 0px,
    rgba(198, 40, 40, 0.12) 6px,
    transparent 6px,
    transparent 10px);
  border-radius: 0 0 1px 1px;
}

.oracle-hd {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.oracle-chop {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-cinnabar-deeper, #9C1A1C);
  color: var(--color-paper-lightest, #F5F0E8);
  font-family: var(--font-display);
  font-size: 0.625rem;
  transform: rotate(-4deg);
}

.oracle-ttl {
  font-family: var(--font-display);
  font-size: 1.0625rem;
  color: var(--color-ink-dark, #2C1810);
  letter-spacing: 0.18em;
  font-weight: 400;
  margin: 0;
}

.oracle-date {
  margin-left: auto;
  font-size: 0.6875rem;
  color: var(--color-ink-light, #8A7A6A);
  font-family: 'Noto Sans SC', sans-serif;
  white-space: nowrap;
}

.oracle-divider {
  height: 1px;
  margin: 0.875rem 0 1rem;
  background: linear-gradient(90deg,
    rgba(198, 40, 40, 0.08) 0%,
    rgba(198, 40, 40, 0.02) 50%,
    transparent 100%);
}

.oracle-body {
  font-family: 'Noto Sans SC', sans-serif;
  line-height: 1.9;
  color: var(--color-ink-medium, #5A4A3A);
  letter-spacing: 0.03em;
}

.oracle-line {
  font-size: 0.8125rem;
  margin: 0 0 0.25rem;
}
.oracle-line:last-child {
  margin-bottom: 0;
}

.oracle-body-empty {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.8125rem;
  color: var(--color-ink-light, #8A7A6A);
  margin-top: 0.75rem;
}

.oracle-link {
  color: var(--color-cinnabar, #C62828);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: rgba(198, 40, 40, 0.3);
  transition: text-decoration-color 0.2s;
}
.oracle-link:hover {
  text-decoration-color: rgba(198, 40, 40, 0.8);
}

.oracle-foot {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  padding-top: 0.875rem;
  border-top: 1px solid rgba(44, 26, 14, 0.04);
  flex-wrap: wrap;
}

.oracle-tag {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.tag-label {
  font-family: var(--font-display);
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  flex-shrink: 0;
}

.tag-items {
  font-family: 'Noto Sans SC', sans-serif;
  letter-spacing: 0.08em;
}

.oracle-tag--yi .tag-label,
.oracle-tag--yi .tag-items {
  color: var(--color-jade);
}

.oracle-tag--ji .tag-label,
.oracle-tag--ji .tag-items {
  color: var(--color-cinnabar);
}

.fade-in {
  animation: fadeInUp 0.5s ease both;
  animation-delay: var(--delay, 0s);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
