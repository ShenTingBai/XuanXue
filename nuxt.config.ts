export default defineNuxtConfig({
  compatibilityDate: '2026-05-24',
  experimental: {
    appManifest: false,
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: '玄·道 - 命理互动平台',
      htmlAttrs: { lang: 'zh-CN' },
      link: [
        { rel: 'preload', href: '/fonts/ma-shan-zheng-v17-chinese-simplified-regular.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        { rel: 'preload', href: '/fonts/noto-sans-sc-v40-chinese-simplified-regular.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
        { rel: 'preload', href: '/fonts/noto-sans-sc-v40-chinese-simplified-500.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' },
      ],
    },
  },
  routeRules: {
    '/tools/**': { ssr: false },
    '/profile/**': { ssr: false },
    '/**': {
      headers: {
        // CSP nonce is injected via server/plugins/csp.ts: replaces 'unsafe-inline' with 'nonce-{nonce}' per request.
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests",
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
    '/fonts/**': {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  },
})
