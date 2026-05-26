<template>
  <div v-if="!hexagram" class="text-center py-8 text-ink-light font-sans text-sm">
    暂无卦象
  </div>

  <div v-else class="hexagram-container fade-in" :style="{ '--delay': '0.15s' }">
    <!-- Hexagram label -->
    <div v-if="label" class="mb-3">
      <span class="font-sans text-xs tracking-widest text-ink-medium uppercase">{{ label }}</span>
    </div>

    <div class="flex items-start gap-5 sm:gap-6">
      <!-- Yao lines -->
      <div class="flex-shrink-0">
        <div class="card-paper-solid rounded-lg px-4 py-3 inline-flex flex-col-reverse gap-1.5" role="img" :aria-label="`${hexagram.name}卦象`">
          <div
            v-for="(yao, idx) in hexagram.lines"
            :key="idx"
            class="yao-line"
            :class="{
              'yao-line--yang': yao.isYang,
              'yao-line--yin': !yao.isYang,
              'yao-line--changing': yao.isChanging,
              'yao-line--shi': hexagram.shiPosition === (idx + 1),
              'yao-line--ying': hexagram.yingPosition === (idx + 1),
            }"
          >
            <!-- Yang line -->
            <template v-if="yao.isYang">
              <span class="yao-bar yao-bar--solid"></span>
            </template>
            <!-- Yin line -->
            <template v-else>
              <span class="yao-bar yao-bar--left"></span>
              <span class="yao-gap"></span>
              <span class="yao-bar yao-bar--right"></span>
            </template>

            <!-- Position marker -->
            <span class="yao-label" aria-hidden="true">
              <template v-if="hexagram.shiPosition === (idx + 1)">世</template>
              <template v-else-if="hexagram.yingPosition === (idx + 1)">应</template>
              <template v-else>{{ ['初', '二', '三', '四', '五', '上'][idx] }}</template>
            </span>
          </div>
        </div>
      </div>

      <!-- Name and judgment -->
      <div class="min-w-0 pt-1">
        <h3 class="font-display text-xl sm:text-2xl text-ink-dark leading-tight mb-1">
          {{ hexagram.name }}
        </h3>
        <p v-if="hexagram.judgment" class="font-sans text-sm text-ink-light leading-relaxed">
          {{ hexagram.judgment }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { YaoResult } from '~/composables/useYijing'

interface HexagramProp {
  name: string
  judgment: string
  lines: YaoResult[]
  shiPosition?: number
  yingPosition?: number
}

defineProps<{
  hexagram: HexagramProp | null
  label?: string
}>()
</script>

<style scoped>
.yao-line {
  display: flex;
  align-items: center;
  gap: 0;
  height: 12px;
  position: relative;
}

.yao-bar {
  display: block;
  height: 5px;
  border-radius: 2px;
  background: #2C1810;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.yao-bar--solid {
  width: 52px;
}

.yao-bar--left,
.yao-bar--right {
  width: 22px;
}

.yao-gap {
  width: 8px;
  flex-shrink: 0;
}

/* Increasing/decreasing line */
.yao-bar--left {
  border-radius: 2px 0 0 2px;
}

.yao-bar--right {
  border-radius: 0 2px 2px 0;
}

.yao-label {
  position: absolute;
  right: -1.75rem;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.65rem;
  color: #7A6A5C;
  line-height: 1;
  white-space: nowrap;
}

/* Changing yao */
.yao-line--changing .yao-bar {
  background: #C62828;
  animation: pulseGlow 2s ease-in-out infinite;
}

/* 世 position */
.yao-line--shi .yao-label {
  color: #C62828;
  font-weight: 500;
}

/* 应 position */
.yao-line--ying .yao-label {
  color: #7A5E12;
  font-weight: 500;
}

@media (min-width: 640px) {
  .yao-bar--solid {
    width: 64px;
  }
  .yao-bar--left,
  .yao-bar--right {
    width: 27px;
  }
  .yao-gap {
    width: 10px;
  }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0px #C62828; }
  50% { box-shadow: 0 0 8px #C62828; }
}
</style>
