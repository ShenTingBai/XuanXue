<template>
  <div class="fade-in" :style="{ '--delay': delay }">
    <!-- ══ Grade banner ══ -->
    <div class="score-banner" role="region" aria-label="合婚评分">
      <div class="banner-left">
        <div class="banner-grade" :style="{ color: grade?.color ?? 'var(--color-cinnabar)' }">
          {{ grade ? grade.level : '--' }}
        </div>
        <div class="banner-label">
          {{ grade ? grade.label : '待计算' }}
        </div>
      </div>

      <div class="banner-center">
        <div class="score-ring-wrap">
          <svg viewBox="0 0 120 120" class="score-ring">
            <!-- Background circle -->
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="color-mix(in srgb, var(--color-ink-faint) 18%, transparent)"
              stroke-width="8"
            />
            <!-- Progress arc -->
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              :stroke="grade?.color ?? 'var(--color-cinnabar)'"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="326.7"
              :stroke-dashoffset="326.7 - (326.7 * totalScore) / 100"
              transform="rotate(-90 60 60)"
              class="score-arc"
            />
          </svg>
          <div class="score-text">
            <span class="score-num">{{ Math.round(totalScore) }}</span>
            <span class="score-unit">分</span>
          </div>
        </div>
      </div>

      <div class="banner-right">
        <p class="banner-desc">{{ grade ? grade.description : '输入双方信息后开始合婚' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HeHunGrade } from '~/constants/hehun'

defineProps<{
  totalScore: number
  grade: HeHunGrade | null
  delay?: string
}>()
</script>

<style scoped>
.score-banner {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.5rem 1.75rem;
  background: linear-gradient(
    135deg,
    var(--color-paper-lightest) 0%,
    var(--color-paper-light) 100%
  );
  border-radius: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--color-ink-faint) 15%, transparent);
  box-shadow:
    0 2px 12px color-mix(in srgb, var(--color-ink-muted) 4%, transparent),
    0 0 0 1px color-mix(in srgb, var(--color-ink-muted) 2%, transparent) inset;
}

@media (max-width: 639px) {
  .score-banner {
    flex-direction: column;
    text-align: center;
    padding: 1.25rem;
    gap: 0.75rem;
  }
}

.banner-left {
  flex-shrink: 0;
  text-align: center;
  min-width: 5rem;
}

.banner-grade {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 2rem;
  line-height: 1.1;
  letter-spacing: 0.2em;
}

.banner-label {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.08em;
  margin-top: 0.125rem;
}

.banner-center {
  flex-shrink: 0;
}

.score-ring-wrap {
  position: relative;
  width: 4.5rem;
  height: 4.5rem;
}

.score-ring {
  width: 100%;
  height: 100%;
}

.score-arc {
  transition: stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1);
}

.score-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-num {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-ink);
  line-height: 1;
}

.score-unit {
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  letter-spacing: 0.05em;
}

.banner-right {
  flex: 1;
  min-width: 0;
}

.banner-desc {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.75rem;
  color: var(--color-ink-medium);
  line-height: 1.65;
  letter-spacing: 0.03em;
}

/* ── Animation ── */
.fade-in {
  animation: bannerIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay, 0s);
}

@keyframes bannerIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
