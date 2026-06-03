<template>
  <div class="fade-in card-warm rounded-xl p-8 mb-6" :style="{ '--delay': '0.05s' }">
    <div class="flex items-start gap-4 sm:gap-6">
      <span class="flex-shrink-0 text-5xl sm:text-6xl" aria-hidden="true">{{ result.animalEmoji }}</span>
      <div class="min-w-0">
        <h1 class="font-display text-3xl sm:text-4xl text-ink-dark">
          {{ result.animal }}
        </h1>
        <p class="font-sans text-sm sm:text-base text-ink-medium mt-1">
          {{ result.stemBranch }}年 · {{ result.year }} · {{ result.yangOrYin }}性
        </p>
        <div class="flex flex-wrap gap-2 mt-3">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans border"
            :class="badgeClass(result.wuXing)"
          >
            {{ result.naYin }}命
          </span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans bg-ink-faint/20 text-ink-medium border border-ink-faint/30">
            {{ result.earthlyBranch }} · {{ result.direction }}
          </span>
        </div>

        <!-- TaiSui relationship -->
        <div class="flex flex-wrap gap-2 mt-4">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-sans border"
            :class="taiSuiBadgeClass(result.taiSuiRelationships.positive)">
            <span aria-hidden="true">{{ taiSuiIcon(result.taiSuiRelationships.positive) }}</span>
            {{ result.taiSuiRelationships.currentYear }}年太岁：{{ result.taiSuiRelationships.positive }}
          </span>
          <span v-if="result.taiSuiRelationships.negative !== '平'"
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-sans border"
            :class="taiSuiBadgeClass(result.taiSuiRelationships.negative)">
            <span aria-hidden="true">{{ taiSuiIcon(result.taiSuiRelationships.negative) }}</span>
            {{ result.taiSuiRelationships.currentYear }}年太岁：{{ result.taiSuiRelationships.negative }}
          </span>
        </div>
        <p class="font-sans text-xs text-ink-light/80 mt-2 leading-relaxed max-w-md">
          {{ taiSuiInterpretation(result.taiSuiRelationships.positive, result.taiSuiRelationships.negative) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShengXiaoResult } from '~/composables/useShengXiao'

defineProps<{
  result: ShengXiaoResult
}>()

const AUSPICIOUS_RELATIONS = new Set(['三合', '六合'])

const TAI_SUI_INTERPRETATIONS: Record<string, string> = {
  '三合': '与太岁三合，贵人运旺，诸事顺遂，宜积极拓展、把握机遇。',
  '六合': '与太岁六合，人缘佳、合作顺，易得助力，利人际与感情。',
  '值太岁': '本命年值太岁，运势波动大，宜守不宜攻，凡事三思后行。',
  '冲太岁': '与太岁相冲，易生大变（搬家、换工作、关系变动），谨言慎行。',
  '刑太岁': '与太岁相刑，防口舌是非、合同纠纷，待人宜宽、处事宜稳。',
  '害太岁': '与太岁相害，防小人暗算、误会中伤，重要事务亲自确认。',
  '破太岁': '与太岁相破，有小破财、计划受阻之象，但影响较轻，细心可解。',
  '平': '与太岁平和，无大起大落，按部就班即可。',
}

function taiSuiBadgeClass(relation: string): string {
  if (AUSPICIOUS_RELATIONS.has(relation)) {
    return 'border-jade/30 text-jade bg-jade/5'
  }
  if (relation === '平') {
    return 'border-ink-faint/30 text-ink-medium bg-ink-faint/10'
  }
  return 'border-cinnabar/30 text-cinnabar bg-cinnabar/5'
}

function taiSuiIcon(relation: string): string {
  if (AUSPICIOUS_RELATIONS.has(relation)) return '✦'
  if (relation === '平') return '·'
  return '⚠'
}

function taiSuiInterpretation(positive: string, negative: string): string {
  // If there's a negative relationship, show its interpretation (more impactful)
  if (negative !== '平') {
    return TAI_SUI_INTERPRETATIONS[negative] || ''
  }
  // Otherwise show the positive one
  return TAI_SUI_INTERPRETATIONS[positive] || ''
}

function badgeClass(wuXing: string): string {
  const map: Record<string, string> = {
    '木': 'border-wuxing-wood/30 text-wuxing-wood bg-wuxing-wood/5',
    '火': 'border-wuxing-fire/30 text-wuxing-fire bg-wuxing-fire/5',
    '土': 'border-wuxing-earth/30 text-wuxing-earth bg-wuxing-earth/5',
    '金': 'border-wuxing-metal/30 text-wuxing-metal bg-wuxing-metal/5',
    '水': 'border-wuxing-water/30 text-wuxing-water bg-wuxing-water/5',
  }
  return map[wuXing] || 'border-ink-faint/30 text-ink-medium bg-ink-faint/10'
}
</script>
