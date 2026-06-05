<script setup lang="ts">
import { WUXING_COLORS, WUXING_FALLBACK_COLOR } from '~/constants/bazi'

const props = withDefaults(
  defineProps<{
    nickname: string
    wuXing?: string | null
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    wuXing: null,
    size: 'md',
  },
)

const firstChar = computed(() => {
  const s = props.nickname.trim()
  return s.length > 0 ? s[0] : '?'
})

const sizeMap: Record<string, string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-lg',
  lg: 'w-[72px] h-[72px] text-3xl',
}

/**
 * Deterministic hash-color from a string. Produces a muted traditional-Chinese
 * palette hue (avoiding overly bright colors).
 */
function hashColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }
  // Use hue in 0-360 range, then pick a rich muted tone
  const h = ((hash % 360) + 360) % 360
  const s = 35 + (hash % 25) // 35-60% saturation — muted, not garish
  const l = 30 + (hash % 15) // 30-45% lightness — dark enough for white text
  return `hsl(${h}, ${s}%, ${l}%)`
}

const bgColor = computed(() => {
  if (props.wuXing && WUXING_COLORS[props.wuXing]) {
    return WUXING_COLORS[props.wuXing]
  }
  return hashColor(props.nickname)
})

const sizeClass = computed(() => sizeMap[props.size])
</script>

<template>
  <div
    :class="['avatar-circle', sizeClass]"
    :style="{ backgroundColor: bgColor }"
    :aria-label="`${nickname} 的头像`"
    role="img"
  >
    <span class="avatar-char">{{ firstChar }}</span>
  </div>
</template>

<style scoped>
.avatar-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(26, 15, 10, 0.12);
  user-select: none;
}
.avatar-char {
  color: #fff;
  font-family: var(--font-display);
  line-height: 1;
}
</style>
