<template>
  <div
    class="fortune-stick-wrap"
    :class="{ 'fortune-stick-wrap--tall': tall }"
  >
    <div class="slip-card" :class="{ 'slip-card--tall': tall }">
      <div class="slip-rule" aria-hidden="true" />
      <div v-if="tall" class="slip-rule slip-rule--btm" aria-hidden="true" />

      <div class="slip-body" :class="{ 'slip-body--tall': tall }">
        <!-- Header -->
        <div class="slip-hd" :class="{ 'slip-hd--tall': tall }">
          <span class="slip-chop" aria-hidden="true">命</span>
          <span class="slip-ttl" :class="{ 'slip-ttl--tall': tall }">今日命签</span>
          <span class="slip-fortune" :class="'slip-fortune--' + stick.fortune">{{ stick.fortune }}</span>
          <span class="slip-number">#{{ stick.id }}</span>
        </div>

        <!-- Title + poem in tall mode: centered, calligraphic -->
        <template v-if="tall">
          <div class="slip-divider-h" aria-hidden="true">
            <span class="slip-divider-h__dot" />
          </div>

          <h2 class="slip-title--tall">{{ stick.title }}</h2>

          <div class="slip-poem--tall">
            <span
              v-for="(line, i) in stick.poem"
              :key="i"
              class="slip-poem-line--tall"
            >{{ line }}</span>
          </div>

          <div class="slip-divider-h" aria-hidden="true">
            <span class="slip-divider-h__dot" />
          </div>

          <div class="slip-explanation--tall">
            <span class="slip-explanation--tall__prefix">解曰</span>
            <span class="slip-explanation--tall__text">{{ stick.explanation }}</span>
          </div>
        </template>

        <!-- Compact mode -->
        <template v-else>
          <h2 class="slip-title">{{ stick.title }}</h2>

          <div class="slip-poem">
            <span class="slip-poem-line">{{ stick.poem[0] }}</span>
            <span class="slip-poem-line">{{ stick.poem[1] }}</span>
          </div>

          <div class="slip-explanation">
            <span class="slip-explanation-mark" aria-hidden="true">解</span>
            <span class="slip-explanation-text">{{ stick.explanation }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getDailyFortune } from '~/constants/fortune-sticks'
import type { FortuneStick } from '~/constants/fortune-sticks'

withDefaults(defineProps<{
  tall?: boolean
}>(), {
  tall: false,
})

const stick: FortuneStick = getDailyFortune()
</script>

<style scoped>
/* ═══ 流年签 · 灵签卡片 ═══ */

.fortune-stick-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 36rem;
  margin: 0 auto;
}

.fortune-stick-wrap--tall {
  max-width: none;
  margin: 0;
  height: 100%;
}

/* ── Card base ── */
.slip-card {
  position: relative;
  background: linear-gradient(135deg, #F7F0E4 0%, #EDE3D3 40%, #E8DCC6 100%);
  border-radius: 0.625rem;
  padding: 0.875rem 1.125rem;
  width: 100%;
  box-shadow:
    inset 0 0 0 1px rgba(44, 26, 14, 0.02),
    0 2px 10px rgba(44, 26, 14, 0.02);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.slip-card--tall {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1.75rem;
}

.slip-card::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.3;
  background-image: radial-gradient(circle at 20% 30%, rgba(139, 119, 90, 0.03) 1px, transparent 1px),
                    radial-gradient(circle at 70% 60%, rgba(139, 119, 90, 0.02) 1px, transparent 1px);
  background-size: 40px 40px, 60px 60px;
  pointer-events: none;
  border-radius: inherit;
}

.slip-card:hover {
  box-shadow:
    inset 0 0 0 1px rgba(198, 40, 40, 0.02),
    0 4px 16px rgba(44, 26, 14, 0.035);
}

/* ── Top / Bottom rules ── */
.slip-rule {
  position: absolute;
  left: 20%;
  right: 20%;
  height: 2px;
  z-index: 0;
  pointer-events: none;
  background: repeating-linear-gradient(90deg,
    rgba(198, 40, 40, 0.11) 0px,
    rgba(198, 40, 40, 0.11) 6px,
    transparent 6px,
    transparent 10px);
  border-radius: 0 0 1px 1px;
}
.slip-rule { top: -1px; }
.slip-rule--btm {
  bottom: -1px;
  border-radius: 1px 1px 0 0;
  opacity: 0.5;
}

.slip-body {
  position: relative;
  z-index: 1;
}

.slip-body--tall {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ════════════════════════════════ */
/*  Compact Mode Styles             */
/* ════════════════════════════════ */

/* ── Header ── */
.slip-hd {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
}

.slip-chop {
  flex-shrink: 0;
  width: 1.125rem;
  height: 1.125rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-cinnabar-deeper, #9C1A1C);
  color: var(--color-paper-lightest, #F5F0E8);
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.5rem;
  transform: rotate(-3deg);
  border-radius: 2px;
}

.slip-ttl {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.8125rem;
  color: var(--color-ink-dark, #2C1810);
  letter-spacing: 0.2em;
  font-weight: 400;
  margin-right: auto;
}

.slip-fortune {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.6rem;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  letter-spacing: 0.08em;
  transform: rotate(-0.5deg);
  line-height: 1.3;
}

.slip-fortune--上吉 {
  background: rgba(61, 107, 75, 0.1);
  color: #3D6B4B;
  border: 1px solid rgba(61, 107, 75, 0.15);
}

.slip-fortune--中吉 {
  background: rgba(122, 94, 18, 0.08);
  color: #7A5E12;
  border: 1px solid rgba(122, 94, 18, 0.13);
}

.slip-fortune--下吉 {
  background: rgba(198, 40, 40, 0.05);
  color: rgba(198, 40, 40, 0.55);
  border: 1px solid rgba(198, 40, 40, 0.1);
}

.slip-fortune--下下 {
  background: rgba(198, 40, 40, 0.08);
  color: #C62828;
  border: 1px solid rgba(198, 40, 40, 0.16);
}

.slip-number {
  font-size: 0.55rem;
  color: var(--color-ink-light, #8A7A6A);
  font-family: 'Noto Sans SC', sans-serif;
  opacity: 0.55;
  letter-spacing: 0.05em;
}

.slip-title {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.8125rem;
  color: var(--color-ink-dark, #2C1810);
  letter-spacing: 0.15em;
  font-weight: 400;
  margin-bottom: 0.25rem;
}

/* ── Poem compact ── */
.slip-poem {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.slip-poem-line {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.7rem;
  color: var(--color-ink-medium, #5A4A3A);
  letter-spacing: 0.06em;
  line-height: 1.5;
}

.slip-poem-line:last-child::after {
  content: '。';
  color: var(--color-ink-faint, #A89888);
}

/* ── Explanation compact ── */
.slip-explanation {
  display: flex;
  gap: 0.25rem;
  align-items: flex-start;
  margin-top: 0.25rem;
  padding-top: 0.3125rem;
  border-top: 1px solid rgba(44, 26, 14, 0.035);
}

.slip-explanation-mark {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.875rem;
  height: 0.875rem;
  margin-top: 1px;
  border-radius: 50%;
  background: rgba(198, 40, 40, 0.06);
  color: var(--color-cinnabar, #C62828);
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.45rem;
}

.slip-explanation-text {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.65rem;
  color: var(--color-ink-light, #8A7A6A);
  line-height: 1.55;
  letter-spacing: 0.02em;
}

/* ════════════════════════════════ */
/*  Tall Mode — 书法条幅排版        */
/* ════════════════════════════════ */

/* ── Header tweaks ── */
.slip-hd--tall {
  margin-bottom: 0;
  flex-shrink: 0;
}

.slip-ttl--tall {
  font-size: 0.75rem;
  letter-spacing: 0.25em;
  opacity: 0.7;
}

/* ── Horizontal dividers ── */
.slip-divider-h {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-shrink: 0;
  margin: 0.5rem 0;
}

.slip-divider-h::before,
.slip-divider-h::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(44, 26, 14, 0.06) 30%,
    rgba(44, 26, 14, 0.06) 70%,
    transparent
  );
}

.slip-divider-h__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(198, 40, 40, 0.2);
  flex-shrink: 0;
}

/* ── Title — 签题 ── */
.slip-title--tall {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 1.15rem;
  color: var(--color-ink-dark, #2C1810);
  text-align: center;
  letter-spacing: 0.35em;
  font-weight: 400;
  line-height: 1.5;
  flex-shrink: 0;
  margin: 0.15rem 0;
}

/* ── Poem — 诗签四句 ── */
.slip-poem--tall {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  flex: 1;
  min-height: 0;
  padding: 0.25rem 0;
}

.slip-poem-line--tall {
  display: block;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.95rem;
  color: var(--color-ink-medium, #5A4A3A);
  text-align: center;
  letter-spacing: 0.18em;
  line-height: 1.7;
  font-weight: 450;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}

.slip-poem-line--tall::after {
  content: '。';
  opacity: 0.3;
  margin-left: 1px;
}

/* ── Explanation — 解曰 ── */
.slip-explanation--tall {
  display: flex;
  gap: 0.4rem;
  align-items: flex-start;
  flex-shrink: 0;
  padding: 0.5rem 0.25rem 0;
}

.slip-explanation--tall__prefix {
  flex-shrink: 0;
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.65rem;
  color: var(--color-cinnabar, #C62828);
  letter-spacing: 0.15em;
  opacity: 0.7;
  margin-top: 0.05rem;
}

.slip-explanation--tall__text {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.72rem;
  color: var(--color-ink-light, #8A7A6A);
  line-height: 1.7;
  letter-spacing: 0.03em;
}

/* ════════════════════════════════ */
/*  Animation                       */
/* ════════════════════════════════ */
.fade-in {
  animation: slipAppear 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay, 0s);
}

@keyframes slipAppear {
  from { opacity: 0; transform: translateY(8px) scale(0.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
