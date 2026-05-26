export default defineNuxtConfig({
  compatibilityDate: '2026-05-24',
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: '玄学 - 命理互动平台',
      htmlAttrs: { lang: 'zh-CN' },
      link: [
        { rel: 'preload', href: '/fonts/ma-shan-zheng-v17-chinese-simplified-regular.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        { rel: 'preload', href: '/fonts/noto-sans-sc-v40-chinese-simplified-regular.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        { rel: 'preload', href: '/fonts/noto-sans-sc-v40-chinese-simplified-500.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
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
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
  },
})
