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
    class="palace-cell h-full cursor-pointer select-none flex flex-col overflow-hidden relative"
    :class="[
      isSelected ? 'z-[2]' : '',
      isMingGong ? 'cell-ming' : '',
    ]"
    @click="onClick"
    @keydown.enter="onClick"
    @keydown.space.prevent="onClick"
    role="button"
    :tabindex="0"
    :aria-label="`${palace.name} - ${palace.earthlyBranch}宫${isMingGong ? '（命宫）' : ''}`"
  >

    <!-- Selection glow -->
    <div
      v-if="isSelected"
      class="absolute inset-0 z-0 pointer-events-none"
      style="box-shadow: inset 0 0 18px rgba(198,40,40,0.15), 0 0 10px rgba(198,40,40,0.08); border: 1px solid #C62828;"
    />

    <!-- Top bar: branch + name -->
    <div class="relative z-[1] flex items-baseline gap-1 px-2 pt-1.5 pb-0.5">
      <span class="text-[0.55rem] text-ink-light/50 font-display tracking-[0.06em]">{{ palace.earthlyBranch }}</span>
      <span
        class="font-display text-[0.9rem] leading-tight tracking-[0.05em] font-semibold"
        :class="isMingGong ? 'text-cinnabar' : 'text-ink-deep'"
      >{{ palace.name }}</span>
      <span v-if="isMingGong" class="text-[0.6rem] text-cinnabar/70 ml-0.5" aria-hidden="true">命</span>
    </div>

    <!-- Major stars -->
    <div class="relative z-[1] px-2 mb-1.5">
      <div v-if="palace.majorStars.length > 0" class="font-sans text-[0.9rem] text-cinnabar leading-relaxed tracking-[0.05em] overflow-hidden text-ellipsis whitespace-nowrap font-semibold">
        {{ palace.majorStars.map(s => s.name).join(' ') }}
      </div>
      <div v-else class="font-sans text-[0.65rem] text-ink-light/50 italic tracking-[0.04em]">空宫</div>
    </div>

    <!-- Minor stars -->
    <div v-if="palace.minorStars.length > 0" class="relative z-[1] px-2 pb-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
      <span class="font-sans text-[0.68rem] leading-snug tracking-[0.03em] text-ink-medium">
        {{ palace.minorStars.map(s => s.name).join(' ') }}
      </span>
    </div>

    <!-- 四化 chips -->
    <div v-if="palace.majorStars.some(s => s.mutagen) || palace.minorStars.some(s => s.mutagen)" class="relative z-[1] px-2 pb-1.5 flex flex-wrap gap-0.5">
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

    <!-- Decadal range -->
    <div v-if="palace.decadal?.range && palace.decadal.range[0] > 0" class="relative z-[1] px-2 pb-1.5 mt-auto">
      <span class="text-[0.7rem] text-ink-medium/60 tracking-[0.04em] font-medium">{{ palace.decadal.range[0] }}~{{ palace.decadal.range[1] }}岁</span>
    </div>
  </div>
</template>

<style scoped>
.palace-cell:hover {
  background: rgba(107, 91, 79, 0.04);
}

.palace-cell:focus-visible {
  outline: 2px solid #C62828;
  outline-offset: -2px;
}

.mutagen-chip {
  font-size: 0.6rem;
  padding: 0.03rem 0.28rem;
  border-radius: 2px;
  letter-spacing: 0.04em;
  font-family: 'Noto Serif SC', serif;
  line-height: 1.4;
}

.mutagen-chip.lu { background: rgba(198,40,40,0.1); color: #C62828; border: 0.5px solid rgba(198,40,40,0.15); }
.mutagen-chip.quan { background: rgba(74,140,111,0.1); color: #3D7A5E; border: 0.5px solid rgba(74,140,111,0.15); }
.mutagen-chip.ke { background: rgba(107,168,200,0.1); color: #5A94B4; border: 0.5px solid rgba(107,168,200,0.15); }
.mutagen-chip.ji { background: rgba(93,78,55,0.08); color: #5D4E37; border: 0.5px solid rgba(93,78,55,0.1); }

.cell-ming::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #C62828;
  opacity: 0.75;
  z-index: 2;
  pointer-events: none;
}
</style>
