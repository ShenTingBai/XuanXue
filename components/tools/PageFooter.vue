<template>
  <footer class="colophon" role="contentinfo">
    <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Top rule: 玄-centered ink-ruled divider -->
      <div class="colophon-rule" aria-hidden="true">
        <span class="colophon-rule__line"></span>
        <span class="colophon-rule__seal">玄</span>
        <span class="colophon-rule__line"></span>
      </div>

      <!-- Body: sutra-fold colophon -->
      <div class="colophon-body">
        <!-- Dual seal stamps -->
        <div class="colophon-seals" aria-hidden="true">
          <span class="colophon-seal">玄</span>
          <span class="colophon-seal">道</span>
        </div>

        <!-- Tagline -->
        <p class="colophon-tagline">玄天机 · 道命理</p>

        <!-- Legal colophon text -->
        <div class="colophon-legal">
          <p>&copy; {{ new Date().getFullYear() }} 玄·道 · 仅供娱乐参考</p>
          <p>本结果为算法推演，仅供娱乐参考，不代表实际情况。</p>
        </div>

        <!-- Closing mark: 经折装尾题 -->
        <p class="colophon-fin" aria-hidden="true">终</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   经折尾跋 · Sutra-Fold Colophon
   传统经折装典籍末页 — 木轴收束，钤印落纸
   ═══════════════════════════════════════════════ */

.colophon {
  padding: 3rem 0 2.5rem;
}

@media (min-width: 640px) {
  .colophon {
    padding: 4rem 0 3rem;
  }
}

/* ── Top decorative rule ── */

.colophon-rule {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  margin-bottom: 2rem;
}

.colophon-rule__line {
  width: 3.5rem;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--color-ink-faint) 35%, transparent) 30%,
    color-mix(in srgb, var(--color-ink-faint) 35%, transparent) 70%,
    transparent
  );
}

.colophon-rule__seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  background: color-mix(in srgb, var(--color-cinnabar) 55%, transparent);
  color: var(--color-paper-lightest);
  font-family: var(--font-display);
  font-size: 0.5625rem;
  border-radius: 1px;
  transform: rotate(-3deg);
  flex-shrink: 0;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--color-cinnabar) 25%, transparent);
}

/* ── Body: centered colophon column ── */

.colophon-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

/* ── Dual seal stamps ── */

.colophon-seals {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.colophon-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  background: var(--color-cinnabar);
  color: var(--color-paper-lightest);
  font-family: var(--font-display);
  font-size: 0.8125rem;
  border-radius: 2px;
  box-shadow:
    0 1px 3px color-mix(in srgb, var(--color-cinnabar) 30%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--color-paper-lightest) 15%, transparent);
}

.colophon-seal:first-child {
  transform: rotate(-2deg);
}

.colophon-seal:last-child {
  transform: rotate(2deg);
}

/* ── Tagline ── */

.colophon-tagline {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.3em;
  margin: 0;
}

/* ── Legal text ── */

.colophon-legal {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.colophon-legal p {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--color-ink-light);
  line-height: 1.7;
  letter-spacing: 0.04em;
  margin: 0;
}

/* ── Closing fin mark: 终 ── */

.colophon-fin {
  margin-top: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--font-display);
  font-size: 0.75rem;
  color: color-mix(in srgb, var(--color-ink-faint) 30%, transparent);
  letter-spacing: 0.3em;
  user-select: none;
}

.colophon-fin::before,
.colophon-fin::after {
  content: '';
  width: 2rem;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--color-ink-faint) 15%, transparent)
  );
}

.colophon-fin::after {
  background: linear-gradient(
    to left,
    transparent,
    color-mix(in srgb, var(--color-ink-faint) 15%, transparent)
  );
}
</style>
