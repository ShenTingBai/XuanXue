<template>
  <div class="fade-in" :style="{ '--delay': '0.3s' }">
    <InkDivider>日主分析</InkDivider>

    <p class="font-sans text-xs text-ink-light/70 mb-3 leading-relaxed">
      日主是你出生那天的天干，代表你的核心特质。"喜用神"是对你有利的能量，
      "忌神"是容易与你有冲突的能量，生活中可有意平衡。
    </p>

    <div class="card-paper-solid rounded-xl p-5 sm:p-6">
      <div class="flex items-center gap-4 mb-4">
        <div class="flex-shrink-0 w-14 h-14 rounded-xl bg-cinnabar/5 border border-cinnabar/20 flex items-center justify-center">
          <span class="font-display text-2xl text-cinnabar">{{ dayMaster }}</span>
        </div>
        <div>
          <div class="font-sans text-base font-medium text-ink-dark">
            {{ dayMaster }}{{ dayMasterWuxing }}
          </div>
          <div class="font-sans text-sm" :class="strengthColorClass">
            {{ dayMasterStrength }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <h4 class="font-sans text-xs text-ink-light tracking-wider mb-2">喜用神</h4>
          <div class="flex gap-2">
            <span v-for="el in favorableElements" :key="el"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-sans font-medium"
              :class="elementBgClass(el)" :style="{ color: elementColor(el) }">
              {{ el }}
            </span>
          </div>
        </div>
        <div>
          <h4 class="font-sans text-xs text-ink-light tracking-wider mb-2">忌神</h4>
          <div class="flex gap-2">
            <span v-for="el in unfavorableElements" :key="el"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-sans font-medium"
              :class="[elementBgClass(el), 'opacity-60']" :style="{ color: elementColor(el) }">
              {{ el }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  dayMaster: string
  dayMasterWuxing: string
  dayMasterStrength: string
  favorableElements: string[]
  unfavorableElements: string[]
}>()

const strengthColorClass = computed(() => {
  const s = props.dayMasterStrength
  if (s === '强' || s === '偏强') return 'text-cinnabar font-medium'
  if (s === '偏弱' || s === '弱') return 'text-wuxing-water font-medium'
  return 'text-gold font-medium'
})

const ELEMENT_BG: Record<string, string> = {
  '木': 'bg-wuxing-wood/8', '火': 'bg-wuxing-fire/8', '土': 'bg-wuxing-earth/8',
  '金': 'bg-wuxing-metal/8', '水': 'bg-wuxing-water/8',
}

const ELEMENT_COLORS: Record<string, string> = {
  '木': '#4A7C59', '火': '#C62828', '土': '#B8860B',
  '金': '#8E8E8E', '水': '#2C5F7C',
}

function elementColor(el: string): string { return ELEMENT_COLORS[el] || '#6B5B4F' }
function elementBgClass(el: string): string { return ELEMENT_BG[el] || 'bg-paper-medium/50' }
</script>
