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
      <span class="font-sans">{{ animal.name }}</span>
      <span class="text-[0.625rem] text-ink-light ml-auto flex-shrink-0">{{ animal.branch }}</span>
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
  { name: '子鼠', emoji: '🐭', branch: '子' },
  { name: '丑牛', emoji: '🐮', branch: '丑' },
  { name: '寅虎', emoji: '🐯', branch: '寅' },
  { name: '卯兔', emoji: '🐰', branch: '卯' },
  { name: '辰龙', emoji: '🐲', branch: '辰' },
  { name: '巳蛇', emoji: '🐍', branch: '巳' },
  { name: '午马', emoji: '🐴', branch: '午' },
  { name: '未羊', emoji: '🐑', branch: '未' },
  { name: '申猴', emoji: '🐵', branch: '申' },
  { name: '酉鸡', emoji: '🐔', branch: '酉' },
  { name: '戌狗', emoji: '🐶', branch: '戌' },
  { name: '亥猪', emoji: '🐷', branch: '亥' },
]
</script>
