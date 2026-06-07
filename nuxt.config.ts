export default defineNuxtConfig({
  compatibilityDate: '2026-05-24',
  experimental: {
    appManifest: false,
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/eslint', '@vite-pwa/nuxt', '@nuxtjs/sitemap'],
  css: ['~/assets/css/main.css'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '玄·道 — 玄天机 · 道命理',
      short_name: '玄·道',
      description: '传统命理推演平台：八字、紫微斗数、六爻占卜、生肖运势、星座星盘',
      theme_color: '#F5F0E8',
      background_color: '#F5F0E8',
      display: 'standalone',
      orientation: 'portrait-primary',
      start_url: '/',
      icons: [
        {
          src: 'pwa-icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    },
    workbox: {
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        {
          urlPattern: '/api/.*',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
  },
  sitemap: {
    exclude: ['/api/**'],
  },
  runtimeConfig: {
    public: {
      siteUrl: 'https://xuanxue.example.com',
    },
  },
  app: {
    head: {
      title: '玄·道 - 命理互动平台',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
        {
          name: 'description',
          content: '八字、紫微斗数、六爻、生肖、星座——输入生辰，即刻排盘。中式命理推演平台。',
        },
        { property: 'og:title', content: '玄·道 — 中式命理推演平台' },
        {
          property: 'og:description',
          content: '八字、紫微斗数、六爻、生肖、星座——输入生辰，即刻排盘。',
        },
        { property: 'og:image', content: '/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: '玄·道 — 中式命理推演平台' },
        {
          name: 'twitter:description',
          content: '八字、紫微斗数、六爻、生肖、星座——输入生辰，即刻排盘。',
        },
        { name: 'twitter:image', content: '/og-image.png' },
      ],
      link: [
        // Ma Shan Zheng (2.6MB) 不预加载——通过 @font-face font-display: swap 按需加载。
        // 子集化后（~50KB）可恢复 preload。见 public/fonts/README-SUBSET.md
        {
          rel: 'preload',
          href: '/fonts/noto-sans-sc-v40-chinese-simplified-regular.woff2',
          as: 'font',
          type: 'font/woff2',
          crossorigin: 'anonymous',
        },
        {
          rel: 'preload',
          href: '/fonts/noto-sans-sc-v40-chinese-simplified-500.woff2',
          as: 'font',
          type: 'font/woff2',
          crossorigin: 'anonymous',
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=2' },
      ],
    },
  },
  routeRules: {
    '/tools/**': { ssr: false },
    '/profile/**': { ssr: false },
    '/**': {
      headers: {
        // CSP nonce is injected via server/plugins/csp.ts: replaces 'unsafe-inline' with 'nonce-{nonce}' per request.
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests",
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
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
