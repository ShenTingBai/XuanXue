<template>
  <div class="fade-in mb-6" :style="{ '--delay': '0.15s' }">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div
        v-for="item in items"
        :key="item.label"
        class="wuxing-card"
        :class="[`wuxing-card--${item.color}`]"
      >
        <div class="font-display text-lg sm:text-xl text-ink-dark mb-0.5">{{ item.value }}</div>
        <div class="font-sans text-xs text-ink-medium tracking-wider">{{ item.label }}</div>
      </div>
    </div>

    <!-- NaYin explanation footnote -->
    <p class="mt-3 font-sans text-xs text-ink-medium leading-relaxed">
      纳音为古乐律十二律吕配六十甲子，{{ result.stemBranch }}年属「<span class="text-cinnabar font-medium">{{ result.naYin }}</span>」。
      <template v-if="nayinWuxing !== result.wuXing">
        其五行属<span class="text-cinnabar font-medium">{{ nayinWuxing }}</span>，与生肖五行<span class="text-cinnabar font-medium">{{ result.wuXing }}</span>有别——纳音定命格底色，生肖定外显气质。
      </template>
      <template v-else>
        其五行与生肖五行同为<span class="text-cinnabar font-medium">{{ result.wuXing }}</span>，内外一致，表里如一。
      </template>
    </p>

    <!-- Lucky info subsection -->
    <div class="mt-5 pt-4 border-t border-ink-faint/15">
      <h3 class="font-sans text-xs text-ink-medium tracking-widest mb-3">幸运信息</h3>
      <div class="grid grid-cols-3 gap-3">
        <div class="text-center">
          <div class="font-display text-base text-ink-dark mb-0.5">{{ result.lucky.numbers.join('、') }}</div>
          <div class="font-sans text-xs text-ink-medium tracking-wider">幸运数字</div>
        </div>
        <div class="text-center">
          <div class="font-display text-base text-ink-dark mb-0.5">{{ result.lucky.colors.join('、') }}</div>
          <div class="font-sans text-xs text-ink-medium tracking-wider">幸运颜色</div>
        </div>
        <div class="text-center">
          <div class="font-display text-base text-ink-dark mb-0.5">{{ result.lucky.direction }}</div>
          <div class="font-sans text-xs text-ink-medium tracking-wider">幸运方位</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShengXiaoResult } from '~/composables/useShengXiao'
import { getNayinWuxing } from '~/constants/bazi'

const props = defineProps<{
  result: ShengXiaoResult
}>()

const nayinWuxing = computed(() => getNayinWuxing(props.result.heavenlyStem, props.result.earthlyBranch) || props.result.wuXing)

function wuxingColor(): string {
  const map: Record<string, string> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' }
  return map[props.result.wuXing] || 'earth'
}

const items = [
  { label: '五行', value: props.result.wuXing, color: wuxingColor() },
  { label: '纳音', value: props.result.naYin, color: 'earth' },
  { label: '地支', value: props.result.earthlyBranch, color: wuxingColor() },
  { label: '方向', value: props.result.direction, color: 'earth' },
]
</script>
