<script setup lang="ts">
import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace'

defineProps<{
  palace: IFunctionalPalace
  isSelected: boolean
  isMingGong: boolean
  onClick: () => void
}>()
</script>

<template>
  <div
    class="palace-cell h-full cursor-pointer select-none flex flex-col"
    :class="[
      isSelected ? 'ring-2 ring-cinnabar bg-cinnabar/5' : 'border border-paper-dark/30 hover:border-cinnabar/40 hover:bg-cinnabar/[0.02]',
      isMingGong ? 'border-cinnabar/50' : '',
    ]"
    @click="onClick"
    @keydown.enter="onClick"
    @keydown.space.prevent="onClick"
    role="button"
    :tabindex="0"
    :aria-label="`${palace.name} - ${palace.earthlyBranch}宫`"
  >
    <!-- 顶栏：地支 + 宫名 -->
    <div class="flex items-center justify-between px-1.5 py-0.5 border-b border-paper-dark/20">
      <span class="text-xs font-semibold text-cinnabar-dark/70 font-serif">{{ palace.earthlyBranch }}</span>
      <span
        class="text-[10px] px-1.5 py-0.5 rounded"
        :class="isMingGong
          ? 'bg-cinnabar text-paper font-medium'
          : 'bg-ink-dark/5 text-ink-dark/70'"
      >{{ palace.name }}</span>
    </div>

    <!-- 主星 -->
    <div class="px-1.5 py-1 min-h-[28px]">
      <div v-if="palace.majorStars.length > 0" class="flex flex-wrap gap-x-1">
        <span
          v-for="star in palace.majorStars"
          :key="star.name"
          class="text-[11px] font-medium text-ink-dark leading-tight"
          :class="{
            'text-amber-700': star.name === '紫微',
            'text-emerald-700': star.name === '天机',
            'text-orange-600': star.name === '太阳',
            'text-slate-600': star.name === '武曲',
            'text-rose-600': ['廉贞', '贪狼'].includes(star.name),
            'text-indigo-600': star.name === '天府',
            'text-blue-600': star.name === '太阴',
            'text-stone-500': ['七杀', '破军'].includes(star.name),
            'text-ink-light': star.brightness === '陷',
          }"
        >
          {{ star.name }}<span v-if="star.brightness && star.brightness !== '平'" class="text-[9px] opacity-60">[{{ star.brightness }}]</span>
        </span>
      </div>
      <div v-else class="text-[10px] text-ink-light/50 italic">(空)</div>
    </div>

    <!-- 辅星 -->
    <div v-if="palace.minorStars.length > 0" class="px-1.5 pb-0.5 flex flex-wrap gap-x-1">
      <span
        v-for="star in palace.minorStars"
        :key="star.name"
        class="text-[9px] text-ink-light"
      >{{ star.name }}</span>
    </div>

    <!-- 四化 chip -->
    <div v-if="palace.majorStars.some(s => s.mutagen)" class="px-1.5 pb-0.5 flex flex-wrap gap-0.5">
      <span
        v-for="star in palace.majorStars.filter(s => s.mutagen)"
        :key="star.name"
        class="text-[8px] px-1 rounded-sm font-medium"
        :class="{
          'bg-red-50 text-red-700': star.mutagen === '禄',
          'bg-blue-50 text-blue-700': star.mutagen === '权',
          'bg-green-50 text-green-700': star.mutagen === '科',
          'bg-gray-100 text-gray-500': star.mutagen === '忌',
        }"
      >{{ star.name }}化{{ star.mutagen }}</span>
    </div>

    <!-- 大限 -->
    <div v-if="palace.decadalRange && palace.decadalRange[0] > 0" class="px-1.5 pb-0.5 mt-auto">
      <span class="text-[8px] text-ink-light/60">{{ palace.decadalRange[0] }}~{{ palace.decadalRange[1] }}</span>
    </div>
  </div>
</template>
