<template>
  <div class="flex lg:flex-col gap-1">
    <button
      v-for="(animal, idx) in animals"
      :key="idx"
      @click="$emit('select', idx)"
      :class="[
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left',
        idx === currentIndex
          ? 'bg-cinnabar/10 text-cinnabar font-medium'
          : 'text-ink-medium hover:text-ink-dark hover:bg-paper-medium/50',
      ]"
      :aria-current="idx === currentIndex ? 'true' : undefined"
    >
      <span class="text-base flex-shrink-0" aria-hidden="true">{{ animal.emoji }}</span>
      <span class="font-sans">{{ animal.branch }}{{ animal.name }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentIndex: number
}>()

defineEmits<{
  select: [index: number]
}>()

const animals = [
  { name: '鼠', emoji: '🐭', branch: '子' },
  { name: '牛', emoji: '🐮', branch: '丑' },
  { name: '虎', emoji: '🐯', branch: '寅' },
  { name: '兔', emoji: '🐰', branch: '卯' },
  { name: '龙', emoji: '🐲', branch: '辰' },
  { name: '蛇', emoji: '🐍', branch: '巳' },
  { name: '马', emoji: '🐴', branch: '午' },
  { name: '羊', emoji: '🐑', branch: '未' },
  { name: '猴', emoji: '🐵', branch: '申' },
  { name: '鸡', emoji: '🐔', branch: '酉' },
  { name: '狗', emoji: '🐶', branch: '戌' },
  { name: '猪', emoji: '🐷', branch: '亥' },
]
</script>
