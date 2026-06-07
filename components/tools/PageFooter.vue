<template>
  <footer class="page-footer" role="contentinfo">
    <div class="max-w-grid mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Ink rule: cinnabar seal-dot + fading brush-stroke -->
      <div class="footer-rule" aria-hidden="true">
        <span class="footer-rule__dot"></span>
        <span class="footer-rule__stroke"></span>
      </div>
      <p class="footer-text">
        <span class="footer-brand">玄·道</span>
        <span class="footer-dot" aria-hidden="true">·</span>
        <span
          >本结果为算法推演，仅供娱乐参考，不代表实际情况。本服务不构成医疗、投资、法律或其他专业建议。如有需要，请咨询相关专业人士。</span
        >
        <span class="footer-dot" aria-hidden="true">·</span>
        <NuxtLink to="/privacy" class="footer-link">隐私政策</NuxtLink>
      </p>
    </div>
  </footer>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   页脚 · Scroll Foot
   收笔 — 朱砂落纸，一笔淡墨，一行署名
   ═══════════════════════════════════════════════ */

.page-footer {
  padding: 3rem 0 2.5rem;
}

/* ── Rule: cinnabar dot + fading ink stroke ── */
.footer-rule {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.footer-rule__dot {
  width: 4px;
  height: 4px;
  border-radius: 1px;
  background: var(--color-cinnabar);
  flex-shrink: 0;
  opacity: 0.55;
}

.footer-rule__stroke {
  flex: 1;
  height: 1px;
  margin-left: 0.5rem;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--color-ink-faint) 30%, transparent),
    transparent 100%
  );
}

/* ── Text line ── */
.footer-text {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--color-ink-light);
  letter-spacing: 0.04em;
  margin: 0;
}

.footer-brand {
  font-family: var(--font-display);
  font-size: 0.8125rem;
  color: var(--color-ink-medium);
  letter-spacing: 0.15em;
}

.footer-dot {
  margin: 0 0.375rem;
  color: var(--color-ink-faint);
}

.footer-link {
  color: var(--color-ink-light);
  text-decoration: none;
  transition: color var(--transition-fast, 0.15s ease);
}

.footer-link:hover {
  color: var(--color-cinnabar);
}
</style>
