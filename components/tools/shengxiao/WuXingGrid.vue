<template>
  <div class="fade-in mb-6" :style="{ '--delay': '0.15s' }">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div
        v-for="item in items"
        :key="item.label"
        class="wuxing-card"
        :class="[`wuxing-card--${item.color}`, item.label === '纳音' ? 'cursor-pointer' : '']"
        @click="item.label === '纳音' ? toggleNayinExpanded() : undefined"
        @keydown.enter="item.label === '纳音' ? toggleNayinExpanded() : undefined"
        @keydown.space.prevent="item.label === '纳音' ? toggleNayinExpanded() : undefined"
        :tabindex="item.label === '纳音' ? 0 : undefined"
        :role="item.label === '纳音' ? 'button' : undefined"
        :aria-expanded="item.label === '纳音' ? nayinExpanded : undefined"
      >
        <div class="flex items-center gap-1.5">
          <div class="font-display text-lg sm:text-xl text-ink-dark mb-0.5">{{ item.value }}</div>
          <span v-if="item.label === '纳音'" class="text-[0.65rem] text-ink-light mb-0.5" aria-hidden="true">{{ nayinExpanded ? '▾' : '▸' }}</span>
        </div>
        <div class="font-sans text-xs text-ink-light tracking-wider">{{ item.label }}</div>

        <!-- Nayin explanation (expandable) -->
        <Transition name="nayin-expand">
          <div v-if="item.label === '纳音' && nayinExpanded" class="nayin-explanation mt-2 pt-2 border-t border-ink-faint/10">
            <p class="nayin-explanation__text">
              纳音为古乐律十二律吕配六十甲子，{{ result.stemBranch }}年属「{{ result.naYin }}」。
              <span v-if="nayinWuxing !== result.wuXing">
                其五行属<span class="nayin-explanation__wuxing">{{ nayinWuxing }}</span>，与生肖五行<span class="nayin-explanation__wuxing">{{ result.wuXing }}</span>有别——纳音定命格底色，生肖定外显气质。
              </span>
              <span v-else>
                其五行与生肖五行同为<span class="nayin-explanation__wuxing">{{ result.wuXing }}</span>，内外一致，表里如一。
              </span>
            </p>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Lucky info subsection -->
    <div class="mt-5 pt-4 border-t border-ink-faint/15">
      <h3 class="font-sans text-[0.72rem] text-ink-medium tracking-widest mb-3">幸运信息</h3>
      <div class="grid grid-cols-3 gap-3">
        <div class="text-center">
          <div class="font-display text-base text-ink-dark mb-0.5">{{ result.lucky.numbers.join('、') }}</div>
          <div class="font-sans text-[0.72rem] text-ink-medium tracking-wider">幸运数字</div>
        </div>
        <div class="text-center">
          <div class="font-display text-base text-ink-dark mb-0.5">{{ result.lucky.colors.join('、') }}</div>
          <div class="font-sans text-[0.72rem] text-ink-medium tracking-wider">幸运颜色</div>
        </div>
        <div class="text-center">
          <div class="font-display text-base text-ink-dark mb-0.5">{{ result.lucky.direction }}</div>
          <div class="font-sans text-[0.72rem] text-ink-medium tracking-wider">幸运方位</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nayin-explanation {
  overflow: hidden;
}

.nayin-explanation__text {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.72rem;
  color: var(--color-ink-medium);
  line-height: 1.65;
  letter-spacing: 0.03em;
}

.nayin-explanation__wuxing {
  color: var(--color-cinnabar);
  font-weight: 500;
}

/* Nayin expand transition */
.nayin-expand-enter-active,
.nayin-expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.nayin-expand-enter-from,
.nayin-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.nayin-expand-enter-to,
.nayin-expand-leave-from {
  opacity: 1;
  max-height: 6rem;
}
</style>

<script setup lang="ts">
import type { ShengXiaoResult } from '~/composables/useShengXiao'
import { getNayinWuxing } from '~/constants/bazi'

const props = defineProps<{
  result: ShengXiaoResult
}>()

const nayinExpanded = ref(false)

function toggleNayinExpanded() {
  nayinExpanded.value = !nayinExpanded.value
}

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
