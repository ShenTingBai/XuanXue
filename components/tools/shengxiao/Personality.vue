<template>
  <div class="fade-in mb-6" :style="{ '--delay': '0.35s' }">
    <div class="section-header section-header--tool">
      <span class="bar" aria-hidden="true"></span>
      <span class="seal-icon text-[9px] w-7 h-7" aria-hidden="true">性</span>
      <h2>性格特征</h2>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
      <!-- Pros -->
      <div class="card-warm rounded-xl p-5">
        <h4 class="font-sans text-sm font-medium text-wuxing-wood mb-3 flex items-center gap-1.5">
          <span aria-hidden="true">▸</span> 优点
        </h4>
        <ul class="space-y-1.5">
          <li
            v-for="pro in result.personalityPro"
            :key="pro"
            class="font-sans text-sm text-ink-medium flex items-start gap-2"
          >
            <span class="text-wuxing-wood mt-0.5 flex-shrink-0" aria-hidden="true">●</span>
            {{ pro }}
          </li>
        </ul>
      </div>
      <!-- Cons -->
      <div class="card-warm rounded-xl p-5">
        <h4 class="font-sans text-sm font-medium text-cinnabar mb-3 flex items-center gap-1.5">
          <span aria-hidden="true">▸</span> 缺点
        </h4>
        <ul class="space-y-1.5">
          <li
            v-for="con in result.personalityCon"
            :key="con"
            class="font-sans text-sm text-ink-medium flex items-start gap-2"
          >
            <span class="text-cinnabar/70 mt-0.5 flex-shrink-0" aria-hidden="true">○</span>
            {{ con }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ShengXiaoResult } from '~/composables/useShengXiao'

defineProps<{
  result: ShengXiaoResult
}>()
</script>
