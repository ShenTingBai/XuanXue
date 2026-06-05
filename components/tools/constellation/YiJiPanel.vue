<template>
  <div class="fade-in mt-8 mb-6" :style="{ '--delay': '0.25s' }">
    <div class="section-header">
      <h2>今日宜忌</h2>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <!-- Yi card -->
      <div class="yiji-card yiji-card--yi">
        <h4 class="font-sans text-sm font-medium text-wuxing-wood mb-3 flex items-center gap-1.5">
          <span aria-hidden="true" class="w-1.5 h-1.5 rounded-full bg-wuxing-wood inline-block" />
          宜
        </h4>
        <ul class="space-y-2">
          <li
            v-for="item in yi"
            :key="item"
            class="font-sans text-sm text-ink-medium flex items-start gap-2"
          >
            <span
              class="w-1.5 h-1.5 rounded-full bg-wuxing-wood mt-1 flex-shrink-0"
              aria-hidden="true"
            />
            {{ item }}
          </li>
        </ul>
      </div>

      <!-- Ji card -->
      <div class="yiji-card yiji-card--ji">
        <h4 class="font-sans text-sm font-medium text-cinnabar mb-3 flex items-center gap-1.5">
          <span aria-hidden="true" class="w-1.5 h-1.5 rounded-full bg-cinnabar inline-block" />
          忌
        </h4>
        <ul class="space-y-2">
          <li
            v-for="item in ji"
            :key="item"
            class="font-sans text-sm text-ink-medium flex items-start gap-2"
          >
            <span
              class="w-1.5 h-1.5 rounded-full bg-cinnabar/60 mt-1 flex-shrink-0"
              aria-hidden="true"
            />
            {{ item }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  yi: string[]
  ji: string[]
}>()
</script>
