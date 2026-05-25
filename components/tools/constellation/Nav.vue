<template>
  <div class="flex lg:flex-col gap-1">
    <button
      v-for="(zodiac, idx) in zodiacs"
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
      <span class="text-base flex-shrink-0" aria-hidden="true">{{ zodiac.symbol }}</span>
      <span class="font-sans">{{ zodiac.name }}</span>
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

const zodiacs = [
  { name: '白羊座', symbol: '♈' },
  { name: '金牛座', symbol: '♉' },
  { name: '双子座', symbol: '♊' },
  { name: '巨蟹座', symbol: '♋' },
  { name: '狮子座', symbol: '♌' },
  { name: '处女座', symbol: '♍' },
  { name: '天秤座', symbol: '♎' },
  { name: '天蝎座', symbol: '♏' },
  { name: '射手座', symbol: '♐' },
  { name: '摩羯座', symbol: '♑' },
  { name: '水瓶座', symbol: '♒' },
  { name: '双鱼座', symbol: '♓' },
]
</script>
