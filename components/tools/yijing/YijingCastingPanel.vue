<template>
  <div class="fade-in" :style="{ '--delay': '0.05s' }">
    <!-- Mode tab switcher -->
    <div class="flex justify-center mb-6" role="tablist" aria-label="起卦方式">
      <div class="inline-flex rounded-lg border border-ink-faint/25 bg-paper-dark/60 p-0.5">
        <button
          ref="coinTabRef"
          role="tab"
          :aria-selected="mode === 'coin'"
          class="tab-btn"
          :class="mode === 'coin' ? 'tab-active' : 'tab-inactive'"
          @click="emit('update:mode', 'coin')"
          @keydown.left.prevent="focusNumberTab"
          @keydown.right.prevent="focusNumberTab"
        >
          摇卦
        </button>
        <button
          ref="numberTabRef"
          role="tab"
          :aria-selected="mode === 'number'"
          class="tab-btn"
          :class="mode === 'number' ? 'tab-active' : 'tab-inactive'"
          @click="emit('update:mode', 'number')"
          @keydown.left.prevent="focusCoinTab"
          @keydown.right.prevent="focusCoinTab"
        >
          数字起卦
        </button>
      </div>
    </div>

    <!-- Coin casting mode -->
    <div v-if="mode === 'coin'" class="casting-card rounded-xl p-6 sm:p-8 text-center">

      <!-- Toss progress indicator -->
      <div class="flex justify-center gap-1.5 mb-6" aria-hidden="true">
        <span
          v-for="n in 6"
          :key="n"
          class="w-2.5 h-2.5 rounded-full transition-all duration-500"
          :class="n <= currentToss ? 'bg-cinnabar/70' : 'bg-ink-dark/10'"
        ></span>
      </div>

      <!-- Three coins -->
      <div class="flex justify-center gap-5 mb-5" aria-label="三枚铜钱">
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
          <span v-if="currentToss > 0 && coinResults[currentToss - 1]" class="coin-face">{{ coinResults[currentToss - 1][n - 1] === 3 ? '字' : '背' }}</span>
          <span v-else class="coin-face">?</span>
        </div>
      </div>

      <!-- Progress text -->
      <p class="font-sans text-sm text-ink-light mb-6 leading-relaxed" aria-live="polite" aria-atomic="true">
        <template v-if="currentToss === 0">
          诚心默念所问之事，然后摇动铜钱
        </template>
        <template v-else-if="currentToss < 6">
          第 <strong class="text-cinnabar">{{ currentToss }}</strong>/6 次
        </template>
        <template v-else>
          卦象已成，正在解卦...
        </template>
      </p>

      <!-- Toss button -->
      <button
        class="btn-seal mb-3"
        :disabled="currentToss >= 6 || isFlipping"
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
    <div v-else class="casting-card rounded-xl p-6 sm:p-8">
      <p class="font-sans text-sm text-ink-light mb-6 text-center leading-relaxed">
        心有所想，随即以三个数字起卦。数字分定上卦、下卦与动爻。
      </p>

      <form class="max-w-xs mx-auto" novalidate @submit.prevent="handleNumberSubmit">
        <!-- Three number inputs with bagua symbols -->
        <div class="space-y-5">
          <!-- Upper trigram -->
          <div>
            <label for="yijing-upper" class="block font-sans text-xs text-ink-light/60 mb-1.5 tracking-wider text-center">上 卦 — 天数</label>
            <input
              id="yijing-upper"
              v-model="upperNum"
              type="number"
              min="1"
              max="8"
              class="input-ink text-center text-lg"
              placeholder="1 – 8"
              required
              @blur="validateNumberInput('upper')"
            />
          </div>

          <!-- Lower trigram -->
          <div>
            <label for="yijing-lower" class="block font-sans text-xs text-ink-light/60 mb-1.5 tracking-wider text-center">下 卦 — 地数</label>
            <input
              id="yijing-lower"
              v-model="lowerNum"
              type="number"
              min="1"
              max="8"
              class="input-ink text-center text-lg"
              placeholder="1 – 8"
              required
              @blur="validateNumberInput('lower')"
            />
          </div>

          <!-- Moving line -->
          <div>
            <label for="yijing-moving" class="block font-sans text-xs text-ink-light/60 mb-1.5 tracking-wider text-center">动 爻 — 变数</label>
            <input
              id="yijing-moving"
              v-model="movingNum"
              type="number"
              min="1"
              max="6"
              class="input-ink text-center text-lg"
              placeholder="1 – 6"
              required
              @blur="validateNumberInput('moving')"
            />
          </div>
        </div>

        <!-- Validation error -->
        <div v-if="validationError" role="alert" class="text-cinnabar text-sm mt-4 text-center font-sans">
          {{ validationError }}
        </div>

        <!-- Submit -->
        <div class="text-center mt-6">
          <button type="submit" class="btn-seal" @keydown.space.prevent="handleNumberSubmit">
            <span>起卦</span>
          </button>
        </div>
      </form>

      <div class="text-center mt-4">
        <button
          class="btn-ghost text-sm"
          @click="$emit('reset')"
          @keydown.enter="$emit('reset')"
          @keydown.space.prevent="$emit('reset')"
        >
          清空重填
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue'

const coinTabRef = ref<HTMLElement | null>(null)
const numberTabRef = ref<HTMLElement | null>(null)

function focusCoinTab() { coinTabRef.value?.focus() }
function focusNumberTab() { numberTabRef.value?.focus() }

const props = defineProps<{
  mode: 'coin' | 'number'
  currentToss: number
  coinResults: number[][]
  processing?: boolean
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

function validateNumberInput(field: 'upper' | 'lower' | 'moving') {
  const val = field === 'upper' ? upperNum.value : field === 'lower' ? lowerNum.value : movingNum.value
  if (val === null) return
  const max = field === 'moving' ? 6 : 8
  if (val < 1 || val > max) {
    const label = field === 'upper' ? '上卦' : field === 'lower' ? '下卦' : '动爻'
    validationError.value = `${label}数字超出范围（1-${max}），请重新输入。`
  } else {
    validationError.value = ''
  }
}

function handleNumberSubmit() {
  if (props.processing) return

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
.casting-card {
  background: rgba(44, 24, 16, 0.03);
  border: 1px solid rgba(44, 24, 16, 0.08);
  box-shadow: 0 2px 12px rgba(44, 24, 16, 0.04);
}

.coin-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6B5B3A, #5A4A2E, #4A3F28, #3D3420, #4A3F28);
  border: 2px solid #3D3420;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 3px rgba(180, 160, 120, 0.15);
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
  border: 1px solid rgba(180, 160, 120, 0.1);
}

.coin-circle.coin-tails::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  border: 1px solid rgba(61, 52, 32, 0.2);
}

.coin-face {
  font-family: 'Ma Shan Zheng', cursive;
  font-size: 0.95rem;
  color: #D4C5B0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  line-height: 1;
  z-index: 1;
}

@keyframes coinFlip {
  0% { transform: rotateY(0deg); }
  50% { transform: rotateY(720deg); }
  100% { transform: rotateY(720deg); }
}

.tab-btn {
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  font-family: var(--font-display);
  letter-spacing: 0.12em;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.25s ease;
}

.tab-inactive {
  color: var(--color-ink-medium);
}
.tab-inactive:hover {
  color: var(--color-ink-medium);
  background: color-mix(in srgb, var(--color-ink-medium) 4%, transparent);
}

.tab-active {
  color: var(--color-ink-darkest);
  background: var(--color-paper);
  box-shadow:
    0 1px 3px color-mix(in srgb, var(--color-ink-muted) 10%, transparent),
    0 0 0 1px color-mix(in srgb, var(--color-ink-muted) 6%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .coin-circle.coin-flipping {
    animation: none;
  }
  .tab-btn {
    transition: none;
  }
}

@media (min-width: 640px) {
  .coin-circle {
    width: 56px;
    height: 56px;
  }
  .coin-face {
    font-size: 1.1rem;
  }
}
</style>
