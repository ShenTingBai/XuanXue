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
    class="h-full cursor-pointer select-none flex flex-col overflow-hidden relative border"
    :class="[isSelected ? 'z-[2] cell-selected' : 'hover:bg-paper-mid']"
    :style="{ borderColor: isSelected ? '#C62828' : 'rgba(93,78,55,0.08)' }"
    @click="onClick"
    @keydown.enter="onClick"
    @keydown.space.prevent="onClick"
    role="button"
    :tabindex="0"
    :aria-label="`${palace.name} - ${palace.earthlyBranch}宫`"
  >

    <!-- 顶栏：地支 + 宫名 -->
    <div class="flex items-baseline gap-1 px-1.5 py-0.5">
      <span class="text-[0.6rem] text-ink-light font-serif">{{ palace.earthlyBranch }}</span>
      <span
        class="font-display text-[0.8rem] leading-tight"
        :class="isMingGong ? 'text-cinnabar' : 'text-ink-dark'"
      >{{ palace.name }}</span>
    </div>

    <!-- 主星 (single joined string) -->
    <div class="mb-0.5">
      <div v-if="palace.majorStars.length > 0" class="font-serif text-[0.72rem] text-cinnabar leading-snug tracking-[0.04em]">
        {{ palace.majorStars.map(s => s.name).join('  ') }}
      </div>
      <div v-else class="font-serif text-[0.6rem] text-ink-light/50 italic">空宫</div>
    </div>

    <!-- 辅星 -->
    <div v-if="palace.minorStars.length > 0" class="px-1.5 pb-0.5">
      <span class="font-serif text-[0.6rem] cell-minor leading-tight tracking-[0.03em]">
        {{ palace.minorStars.map(s => s.name).join('  ') }}
      </span>
    </div>

    <!-- 四化 chips -->
    <div v-if="palace.majorStars.some(s => s.mutagen) || palace.minorStars.some(s => s.mutagen)" class="px-1.5 pb-0.5 flex flex-wrap gap-0.5">
      <span
        v-for="star in [...palace.majorStars, ...palace.minorStars].filter(s => s.mutagen)"
        :key="star.name + (star.mutagen || '')"
        class="mutagen-chip"
        :class="{
          'lu': star.mutagen === '禄',
          'quan': star.mutagen === '权',
          'ke': star.mutagen === '科',
          'ji': star.mutagen === '忌',
        }"
      >化{{ star.mutagen }}</span>
    </div>

    <!-- 大限 -->
    <div v-if="palace.decadal?.range && palace.decadal.range[0] > 0" class="px-1.5 pb-0.5 mt-auto">
      <span class="text-[0.5rem] text-ink-light tracking-[0.03em]">{{ palace.decadal.range[0] }}~{{ palace.decadal.range[1] }}</span>
    </div>
  </div>
</template>

<style scoped>
.mutagen-chip {
  font-size: 0.5rem;
  padding: 0.04rem 0.3rem;
  border-radius: 2px;
  letter-spacing: 0.04em;
  font-family: 'Noto Serif SC', serif;
}

.mutagen-chip.lu { background: rgba(198,40,40,0.12); color: #C62828; }
.mutagen-chip.quan { background: rgba(74,140,111,0.12); color: #4A8C6F; }
.mutagen-chip.ke { background: rgba(107,168,200,0.12); color: #6BA8C8; }
.mutagen-chip.ji { background: rgba(93,78,55,0.1); color: #5D4E37; }

.cell-minor {
  color: #5D4E37;
}

.cell-selected {
  outline: 1.5px solid #C62828;
  outline-offset: -1px;
}
</style>
