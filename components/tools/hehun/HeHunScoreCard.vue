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
        <ScoreRing :score="Math.round(totalScore)" :size="64" :stroke-color="grade?.color" />
      </div>

      <div class="banner-right">
        <p class="banner-desc">{{ grade ? grade.description : '输入双方信息后开始合婚' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HeHunGrade } from '~/constants/hehun'
import ScoreRing from '~/components/tools/ScoreRing.vue'

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
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.08em;
  margin-top: 0.125rem;
}

.banner-center {
  flex-shrink: 0;
}

.banner-right {
  flex: 1;
  min-width: 0;
}

.banner-desc {
  font-family: var(--font-sans);
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
