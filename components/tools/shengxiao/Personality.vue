<template>
  <div class="fade-in mb-6" :style="{ '--delay': '0.35s' }">
    <InkDivider>性格特征</InkDivider>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
      <!-- Pros -->
      <div class="card-paper-solid rounded-xl p-5">
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
      <div class="card-paper-solid rounded-xl p-5">
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
import InkDivider from '~/components/tools/InkDivider.vue'

defineProps<{
  result: ShengXiaoResult
}>()
</script>
