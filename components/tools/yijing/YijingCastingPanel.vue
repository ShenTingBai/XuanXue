<template>
  <div class="fade-in" :style="{ '--delay': '0.05s' }">
    <!-- Mode toggle -->
    <div class="flex justify-end mb-4">
      <button
        class="btn-ghost text-sm"
        aria-label="切换起卦方式"
        @click="toggleMode"
        @keydown.enter="toggleMode"
      >
        <span v-if="mode === 'coin'">数字起卦 &rarr;</span>
        <span v-else>&larr; 摇卦起卦</span>
      </button>
    </div>

    <!-- Coin casting mode -->
    <div v-if="mode === 'coin'" class="card-paper-solid rounded-xl p-8 text-center">
      <h2 class="font-display text-2xl sm:text-3xl text-ink-dark mb-6">
        摇卦
      </h2>

      <!-- Three coins -->
      <div class="flex justify-center gap-5 mb-6" aria-label="三枚铜钱">
        <div
          v-for="n in 3"
          :key="n"
          class="coin-circle"
          :class="{
            'coin-flipping': isFlipping,
            'coin-heads': currentToss > 0 && currentToss <= 6 && coinResults[currentToss - 1] && coinResults[currentToss - 1][n - 1] === 3,
            'coin-tails': currentToss > 0 && currentToss <= 6 && coinResults[currentToss - 1] && coinResults[currentToss - 1][n - 1] === 2,
          }"
          :style="{ animationDelay: `${(n - 1) * 0.1}s` }"
          aria-hidden="true"
        >
          <span v-if="currentToss > 0 && coinResults[currentToss - 1]" class="coin-face">{{ coinResults[currentToss - 1][n - 1] === 3 ? '乾' : '坤' }}</span>
          <span v-else class="coin-face">?</span>
        </div>
      </div>

      <!-- Progress -->
      <p class="font-sans text-sm text-ink-light mb-6" aria-live="polite" aria-atomic="true">
        <template v-if="currentToss === 0">
          请诚心默念所问之事，然后摇动铜钱
        </template>
        <template v-else-if="currentToss < 6">
          第 {{ currentToss }}/6 次
        </template>
        <template v-else>
          装卦完成
        </template>
      </p>

      <!-- Toss button -->
      <button
        class="btn-seal mb-3"
        :disabled="currentToss >= 6"
        :aria-busy="isFlipping ? 'true' : undefined"
        @click="handleTossClick"
        @keydown.space.prevent="handleTossClick"
      >
        <span>{{ currentToss >= 6 ? '卦象已成' : isFlipping ? '摇动中...' : '摇卦' }}</span>
      </button>

      <!-- Reset -->
      <div class="mt-4">
        <button
          class="btn-ghost text-sm"
          :disabled="currentToss === 0"
          @click="$emit('reset')"
          @keydown.enter="$emit('reset')"
          @keydown.space.prevent="$emit('reset')"
        >
          重新起卦
        </button>
      </div>
    </div>

    <!-- Number casting mode -->
    <div v-else class="card-paper-solid rounded-xl p-8">
      <h2 class="font-display text-2xl sm:text-3xl text-ink-dark mb-6 text-center">
        数字起卦
      </h2>

      <p class="font-sans text-sm text-ink-light mb-6 text-center leading-relaxed">
        请输入三个数字（1-8）。<br class="sm:hidden" />
        第一个为上卦数，第二个为下卦数，第三个为动爻数。
      </p>

      <form class="max-w-sm mx-auto space-y-5" @submit.prevent="handleNumberSubmit">
        <div>
          <label for="yijing-upper" class="block font-sans text-sm text-ink mb-2">上卦数字（1-8）</label>
          <input
            id="yijing-upper"
            v-model="upperNum"
            type="number"
            min="1"
            max="8"
            class="input-ink"
            placeholder="如 1 为乾"
            required
          />
        </div>

        <div>
          <label for="yijing-lower" class="block font-sans text-sm text-ink mb-2">下卦数字（1-8）</label>
          <input
            id="yijing-lower"
            v-model="lowerNum"
            type="number"
            min="1"
            max="8"
            class="input-ink"
            placeholder="如 8 为坤"
            required
          />
        </div>

        <div>
          <label for="yijing-moving" class="block font-sans text-sm text-ink mb-2">动爻数字（1-6）</label>
          <input
            id="yijing-moving"
            v-model="movingNum"
            type="number"
            min="1"
            max="6"
            class="input-ink"
            placeholder="动爻位置"
            required
          />
        </div>

        <div class="text-center pt-2">
          <button type="submit" class="btn-seal" @keydown.space.prevent="handleNumberSubmit">
            <span>起卦</span>
          </button>
        </div>
      </form>

      <div v-if="validationError" role="alert" class="text-cinnabar text-sm mt-2 text-center">
        {{ validationError }}
      </div>

      <div class="text-center mt-4">
        <button
          class="btn-ghost text-sm"
          @click="$emit('reset')"
          @keydown.enter="$emit('reset')"
          @keydown.space.prevent="$emit('reset')"
        >
          重新起卦
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'

const props = defineProps<{
  mode: 'coin' | 'number'
  currentToss: number
  coinResults: number[][]
}>()

const emit = defineEmits<{
  toss: []
  'cast-number': [{ first: number; second: number; third: number }]
  reset: []
  'update:mode': [value: 'coin' | 'number']
}>()

// Number inputs
const upperNum = ref<number | null>(null)
const lowerNum = ref<number | null>(null)
const movingNum = ref<number | null>(null)

// Validation state
const validationError = ref('')

// Clear validation when inputs change or mode changes
watch([upperNum, lowerNum, movingNum], () => {
  validationError.value = ''
})

watch(() => props.mode, () => {
  validationError.value = ''
})

// Flipping animation state
const isFlipping = ref(false)
const tossTimer = ref<ReturnType<typeof setTimeout> | null>(null)

function toggleMode() {
  const newMode = props.mode === 'coin' ? 'number' : 'coin'
  emit('update:mode', newMode)
}

function handleTossClick() {
  if (props.currentToss >= 6 || isFlipping.value) return

  isFlipping.value = true

  // Brief flip animation, then emit toss
  tossTimer.value = setTimeout(() => {
    isFlipping.value = false
    tossTimer.value = null
    emit('toss')
  }, 600)
}

onUnmounted(() => {
  if (tossTimer.value) clearTimeout(tossTimer.value)
})

function handleNumberSubmit() {
  const first = upperNum.value
  const second = lowerNum.value
  const third = movingNum.value

  if (first === null || second === null || third === null) return

  // Validate ranges before clamping
  if (first < 1 || first > 8) {
    validationError.value = '上卦数字超出范围（1-8），请重新输入。'
    return
  }
  if (second < 1 || second > 8) {
    validationError.value = '下卦数字超出范围（1-8），请重新输入。'
    return
  }
  if (third < 1 || third > 6) {
    validationError.value = '动爻数字超出范围（1-6），请重新输入。'
    return
  }

  validationError.value = ''

  emit('cast-number', { first, second, third })
}
</script>

<style scoped>
.coin-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #D4A017, #B8860B, #8B6914, #B8860B, #D4A017);
  border: 2px solid #7A5E12;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.25),
    inset 0 1px 2px rgba(255, 215, 0, 0.3);
  position: relative;
}

.coin-circle.coin-flipping {
  animation: coinFlip 0.6s ease-in-out;
}

.coin-circle.coin-heads::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  border: 1px solid rgba(255, 215, 0, 0.15);
}

.coin-circle.coin-tails::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  border: 1px solid rgba(139, 105, 20, 0.3);
}

.coin-face {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 0.85rem;
  @apply text-paper-lightest;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  line-height: 1;
  z-index: 1;
}

@keyframes coinFlip {
  0% { transform: rotateY(0deg); }
  50% { transform: rotateY(720deg); }
  100% { transform: rotateY(720deg); }
}
</style>
