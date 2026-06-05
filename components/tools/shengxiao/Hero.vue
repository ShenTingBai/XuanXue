<template>
  <div class="fade-in card-warm rounded-xl p-8 mb-6" :style="{ '--delay': '0.05s' }">
    <div class="flex items-start gap-4 sm:gap-6">
      <span class="flex-shrink-0 text-5xl sm:text-6xl" aria-hidden="true">{{
        result.animalEmoji
      }}</span>
      <div class="min-w-0">
        <h1 class="font-display text-3xl sm:text-4xl text-ink-dark">
          {{ result.animal }}
        </h1>
        <p class="font-sans text-sm sm:text-base text-ink-medium mt-1">
          {{ result.stemBranch }}年 · {{ result.year }} · {{ result.yangOrYin }}性
        </p>
        <!-- TaiSui annotation — almanac-style seal + commentary -->
        <div class="mt-5 pt-4 border-t border-ink-faint/15">
          <div class="flex items-start gap-3 sm:gap-4">
            <!-- Seal stamp -->
            <div
              class="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-sm flex items-center justify-center font-display text-[10px] sm:text-xs leading-none tracking-[0.15em] select-none"
              :class="taiSuiSealClass(relations.primary)"
            >
              太岁
            </div>
            <!-- Annotation body -->
            <div class="min-w-0 pt-0.5">
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  class="font-display text-lg sm:text-xl leading-none"
                  :class="taiSuiRelationClass(relations.primary)"
                >
                  {{ relations.primary }}
                </span>
                <span class="font-sans text-[0.6875rem] text-ink-light tracking-wider">
                  {{ relations.currentYear }}年 · 太岁批注
                </span>
              </div>
              <p class="font-sans text-xs sm:text-sm text-ink-medium mt-1.5 leading-relaxed">
                {{ taiSuiInterpretation(relations.primary) }}
              </p>
              <!-- Secondary positive note when negative dominates -->
              <p
                v-if="relations.secondary"
                class="font-sans text-[0.6875rem] text-jade mt-1.5 leading-relaxed"
              >
                另得{{ relations.secondary }}之助
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShengXiaoResult } from '~/composables/useShengXiao'

const props = defineProps<{
  result: ShengXiaoResult
}>()

const AUSPICIOUS_RELATIONS = new Set(['三合', '六合'])

const TAI_SUI_INTERPRETATIONS: Record<string, string> = {
  三合: '与太岁三合，贵人运旺，诸事顺遂。宜积极拓展、把握机遇，可望有大成。',
  六合: '与太岁六合，人缘佳、合作顺。易得贵人提携，利人际与感情，百事亨通。',
  值太岁: '本命年值太岁，所谓"太岁当头坐，无喜必有祸"。运势波动较大，宜守不宜攻，凡事三思后行。',
  冲太岁: '与太岁相冲，易生大变——迁居、换职、关系动荡。谨言慎行，方可平稳过渡。',
  刑太岁: '与太岁相刑，防口舌是非、合同纠纷。待人宜宽、处事宜稳，莫争一时之气。',
  害太岁: '与太岁相害，防小人暗算、误会中伤。重要事务亲自确认，勿轻信他人。',
  破太岁: '与太岁相破，有小破财、计划受阻之象。影响较轻，细心谨慎即可化解。',
  平: '与太岁平和，无大起大落。按部就班，静水流深，亦是福气。',
}

/** Derive primary (more impactful) and secondary TaiSui relation labels */
const relations = computed(() => {
  const { positive, negative } = props.result.taiSuiRelationships
  const primary = negative !== '平' ? negative : positive
  const secondary = negative !== '平' && positive !== '平' ? positive : null
  return { primary, secondary, currentYear: props.result.taiSuiRelationships.currentYear }
})

function taiSuiSealClass(relation: string): string {
  if (AUSPICIOUS_RELATIONS.has(relation)) {
    return 'border-2 border-jade/40 text-jade bg-jade/[0.06]'
  }
  if (relation === '平') {
    return 'border-2 border-ink-faint/25 text-ink-light bg-ink-faint/8'
  }
  return 'border-2 border-cinnabar/40 text-cinnabar bg-cinnabar/[0.06]'
}

function taiSuiRelationClass(relation: string): string {
  if (AUSPICIOUS_RELATIONS.has(relation)) return 'text-jade'
  if (relation === '平') return 'text-ink-light'
  return 'text-cinnabar'
}

function taiSuiInterpretation(relation: string): string {
  return TAI_SUI_INTERPRETATIONS[relation] || ''
}
</script>
