<template>
  <div class="guardian-card fade-in" :style="{ '--delay': delay, '--accent': buddha.color }" role="region" aria-label="本命佛">
    <!-- ── Background mandala glow ── -->
    <div class="guardian-mandala" aria-hidden="true" />

    <div class="guardian-inner">
      <!-- ── Symbol watermark ── -->
      <span class="guardian-symbol" aria-hidden="true">{{ buddha.symbol }}</span>

      <!-- ── Buddha title ── -->
      <div class="guardian-header">
        <div class="guardian-seal" aria-hidden="true">佛</div>
        <h3 class="guardian-name">{{ buddha.name }}</h3>
      </div>

      <!-- ── Meaning ── -->
      <p class="guardian-meaning">{{ buddha.meaning }}</p>

      <!-- ── Description ── -->
      <p class="guardian-desc">{{ buddha.description }}</p>

      <!-- ── Mantra / 真言 ── -->
      <div class="guardian-mantra">
        <span class="guardian-mantra__deco" aria-hidden="true">◈</span>
        <span class="guardian-mantra__text">心诚则灵 · 常念圣号</span>
        <span class="guardian-mantra__deco" aria-hidden="true">◈</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GuardianBuddha } from '~/constants/guardian-buddha'

withDefaults(defineProps<{
  buddha: GuardianBuddha
  delay?: string
}>(), {
  delay: '0.45s',
})
</script>

<style scoped>
/* ════════════════════════════════════════
   本命佛 · 曼荼罗 · 佛光
   ════════════════════════════════════════ */

.guardian-card {
  position: relative;
  overflow: hidden;
  border-radius: 0.75rem;
  background: linear-gradient(135deg,
    #FBF4E6 0%,
    #F5EBD6 50%,
    #F0E4CC 100%
  );
  border: 1px solid rgba(44, 26, 14, 0.04);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--accent, #C62828) 3%, transparent),
    0 2px 12px rgba(44, 26, 14, 0.02);
}

/* ── Mandala glow effect ── */
.guardian-mandala {
  position: absolute;
  top: -40%;
  right: -20%;
  width: 80%;
  height: 140%;
  background: radial-gradient(
    ellipse at center,
    color-mix(in srgb, var(--accent, #C62828) 4%, transparent) 0%,
    color-mix(in srgb, var(--accent, #C62828) 2%, transparent) 40%,
    transparent 70%
  );
  pointer-events: none;
  border-radius: 50%;
}

.guardian-inner {
  position: relative;
  z-index: 1;
  padding: 1.375rem 1.375rem;
}

@media (min-width: 640px) {
  .guardian-inner {
    padding: 1.625rem 1.75rem;
  }
}

/* ── Symbol watermark ── */
.guardian-symbol {
  position: absolute;
  bottom: 0.375rem;
  right: 0.75rem;
  font-size: 3.5rem;
  line-height: 1;
  opacity: 0.035;
  color: var(--accent, #C62828);
  pointer-events: none;
  font-family: serif;
  user-select: none;
}

/* ── Header ── */
.guardian-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.5rem;
}

.guardian-seal {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent, #C62828);
  color: #FBF4E6;
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.5rem;
  border-radius: 50%;
  box-shadow: 0 0 6px color-mix(in srgb, var(--accent, #C62828) 15%, transparent);
}

.guardian-name {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 1.1rem;
  color: var(--accent, #C62828);
  letter-spacing: 0.2em;
  font-weight: 400;
  line-height: 1.3;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}

/* ── Meaning ── */
.guardian-meaning {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.65rem;
  color: color-mix(in srgb, var(--accent, #C62828) 50%, #8A7A6A);
  letter-spacing: 0.15em;
  line-height: 1.4;
  margin-bottom: 0.625rem;
  padding-left: 2.125rem;
}

/* ── Description ── */
.guardian-desc {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.72rem;
  color: var(--color-ink-medium, #5A4A3A);
  line-height: 1.7;
  letter-spacing: 0.03em;
  padding-left: 2.125rem;
  margin-bottom: 0.75rem;
}

/* ── Mantra ── */
.guardian-mantra {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0 0;
  border-top: 1px solid rgba(44, 26, 14, 0.04);
  margin-left: 2.125rem;
}

.guardian-mantra__deco {
  opacity: 0.12;
  color: var(--accent, #C62828);
  font-size: 0.45rem;
}

.guardian-mantra__text {
  font-family: var(--font-display, 'Ma Shan Zheng');
  font-size: 0.72rem;
  color: var(--color-ink-faint, #A89888);
  letter-spacing: 0.15em;
  opacity: 0.7;
}

/* ── Animation ── */
.fade-in {
  animation: guardianAppear 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay, 0s);
}

@keyframes guardianAppear {
  from { opacity: 0; transform: translateY(10px) scale(0.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
