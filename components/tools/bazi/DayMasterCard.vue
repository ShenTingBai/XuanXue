<template>
  <div class="fade-in" :style="{ '--delay': '0.3s' }">
    <div class="section-header section-header--tool">
      <span class="bar" aria-hidden="true"></span>
      <span class="seal-icon text-[9px] w-7 h-7" aria-hidden="true">主</span>
      <h2>日主分析</h2>
    </div>

    <p class="font-sans text-base text-ink-light mb-3 leading-relaxed">
      日主是你出生那天的天干，代表你的核心特质。"喜用神"是对你有利的能量，
      "忌神"是容易与你有冲突的能量，生活中可有意平衡。
    </p>

    <div class="card-warm rounded-xl p-8">
      <div class="flex items-center gap-4 mb-4">
        <div class="flex-shrink-0 w-14 h-14 rounded-xl bg-cinnabar/5 border border-cinnabar/20 flex items-center justify-center">
          <span class="font-display text-2xl text-cinnabar">{{ dayMaster }}</span>
        </div>
        <div>
          <div class="font-sans text-base font-medium text-ink-dark">
            {{ dayMaster }}{{ dayMasterWuxing }}
          </div>
          <div class="font-sans text-base" :class="strengthColorClass">
            {{ dayMasterStrength }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <h4 class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-2">喜用神</h4>
          <div class="flex gap-2">
            <span v-for="el in favorableElements" :key="el"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-sans font-medium"
              :class="elementBgClass(el)" :style="{ color: elementColor(el) }">
              {{ el }}
            </span>
          </div>
        </div>
        <div>
          <h4 class="font-sans text-xs font-medium text-ink-dark tracking-wider mb-2">忌神</h4>
          <div class="flex gap-2">
            <span v-for="el in unfavorableElements" :key="el"
              class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-sans font-medium"
              :class="elementBgClass(el)" :style="{ color: elementColor(el) }">
              {{ el }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { wuxingColor, strengthColorClass as strengthColorClassFn } from '~/constants/bazi'

const props = defineProps<{
  dayMaster: string
  dayMasterWuxing: string
  dayMasterStrength: string
  favorableElements: string[]
  unfavorableElements: string[]
}>()

const strengthColorClass = computed(() => strengthColorClassFn(props.dayMasterStrength))

const ELEMENT_BG: Record<string, string> = {
  '木': 'bg-wuxing-wood/8', '火': 'bg-wuxing-fire/8', '土': 'bg-wuxing-earth/8',
  '金': 'bg-wuxing-metal/8', '水': 'bg-wuxing-water/8',
}

function elementColor(el: string): string { return wuxingColor(el) }
function elementBgClass(el: string): string { return ELEMENT_BG[el] || 'bg-paper-medium/50' }
</script>
