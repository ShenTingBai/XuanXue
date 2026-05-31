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
      style="box-shadow: inset 0 0 18px color-mix(in srgb, var(--color-cinnabar) 15%, transparent), 0 0 10px color-mix(in srgb, var(--color-cinnabar) 8%, transparent); border: 1px solid var(--color-cinnabar);"
    />

    <!-- Top bar: branch + name -->
    <div class="relative z-[1] flex items-baseline gap-1 px-2 pt-1.5 pb-0.5">
      <span class="text-[0.55rem] text-ink-light/80 font-display tracking-[0.06em]">{{ palace.earthlyBranch }}</span>
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
      <div v-else class="font-sans text-[0.65rem] text-ink-light/80 italic tracking-[0.04em]">空宫</div>
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
      <span class="text-[0.7rem] text-ink-medium/80 tracking-[0.04em] font-medium">{{ palace.decadal.range[0] }}~{{ palace.decadal.range[1] }}岁</span>
    </div>
  </div>
</template>

<style scoped>
.palace-cell:hover {
  background: color-mix(in srgb, var(--color-ink-medium) 4%, transparent);
}

.palace-cell:focus-visible {
  outline: 2px solid var(--color-cinnabar);
  outline-offset: -2px;
}

.mutagen-chip {
  font-size: 0.6rem;
  padding: 0.03rem 0.28rem;
  border-radius: 2px;
  letter-spacing: 0.04em;
  font-family: var(--font-sans);
  line-height: 1.4;
}

.mutagen-chip.lu { background: color-mix(in srgb, var(--color-cinnabar) 10%, transparent); color: var(--color-cinnabar); border: 0.5px solid color-mix(in srgb, var(--color-cinnabar) 15%, transparent); }
.mutagen-chip.quan { background: rgba(74,140,111,0.1); color: #3D7A5E; border: 0.5px solid rgba(74,140,111,0.15); }
.mutagen-chip.ke { background: rgba(107,168,200,0.1); color: #5A94B4; border: 0.5px solid rgba(107,168,200,0.15); }
.mutagen-chip.ji { background: color-mix(in srgb, var(--color-ink-muted) 8%, transparent); color: var(--color-ink-muted); border: 0.5px solid color-mix(in srgb, var(--color-ink-muted) 10%, transparent); }

.cell-ming::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-cinnabar);
  opacity: 0.75;
  z-index: 2;
  pointer-events: none;
}
</style>
