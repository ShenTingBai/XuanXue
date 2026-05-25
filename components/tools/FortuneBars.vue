<template>
  <div class="space-y-3">
    <div v-for="item in items" :key="item.label" class="fade-in" :style="{ '--delay': '0.4s' }">
      <div class="flex items-center justify-between mb-1">
        <span class="font-sans text-sm text-ink-medium">{{ item.label }}</span>
        <span
          class="font-sans text-sm font-medium"
          :class="{
            'text-wuxing-wood': item.score >= 75,
            'text-gold': item.score >= 60 && item.score < 75,
            'text-ink-medium': item.score >= 45 && item.score < 60,
            'text-cinnabar': item.score < 45,
          }"
        >
          {{ item.score }}
        </span>
      </div>
      <div class="fortune-bar" role="progressbar" :aria-valuenow="item.score" aria-valuemin="0" aria-valuemax="100" :aria-label="item.label">
        <div
          class="fortune-bar__fill"
          :class="{
            'fortune-bar__fill--great': item.score >= 75,
            'fortune-bar__fill--good': item.score >= 60 && item.score < 75,
            'fortune-bar__fill--normal': item.score >= 45 && item.score < 60,
            'fortune-bar__fill--low': item.score < 45,
          }"
          :style="{ width: item.score + '%' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface FortuneItem {
  label: string
  score: number
}

defineProps<{
  items: FortuneItem[]
}>()
</script>
