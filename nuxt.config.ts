export default defineNuxtConfig({
  compatibilityDate: '2026-05-24',
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: '玄学 - 命理互动平台',
      htmlAttrs: { lang: 'zh-CN' },
      link: [
        // FIXME: Google Fonts may be blocked in mainland China.
        // For production, download Ma Shan Zheng and Noto Sans SC (weights 400, 500)
        // as WOFF2 files and serve them from /public/fonts/ with @font-face rules.
        // See: https://gwfh.mranftl.com/fonts (google-webfonts-helper)
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Sans+SC:wght@400;500&display=swap' },
      ],
    },
  },
  routeRules: {
    '/**': {
      headers: {
        // FIXME: 'unsafe-inline' in script-src weakens XSS protection.
        // Nuxt 3 injects inline scripts for hydration and does not natively
        // support nonce-based CSP. Removing 'unsafe-inline' will break
        // hydration without a nonce-based approach (see app.head.nonce in
        // Nuxt docs). For production hardening, implement a nonce strategy
        // via Nitro render hooks or a Nuxt module like @nuxtjs/csp, then
        // drop 'unsafe-inline' from script-src.
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data:; connect-src 'self'",
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
  },
})
