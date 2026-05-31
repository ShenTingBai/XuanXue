import { createHash } from 'node:crypto'

export default defineNuxtConfig({
  compatibilityDate: '2026-05-24',
  experimental: {
    appManifest: false,
  },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  nitro: {
    hooks: {
      'render:response'(response: { headers: Record<string, string> }) {
        const nonce = createHash('sha256').update(crypto.randomUUID()).digest('base64url')
        const csp = response.headers['Content-Security-Policy']
        if (csp) {
          response.headers['Content-Security-Policy'] = csp.replace(/'unsafe-inline'/g, `'nonce-${nonce}'`)
        }
      },
    } as any,
  },
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
    '/tools/**': { ssr: false },
    '/profile/**': { ssr: false },
    '/**': {
      headers: {
        // CSP nonce is injected via Nitro render:response hook, replacing 'unsafe-inline' at runtime.
        // The nonce is generated per-request using crypto.randomUUID.
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
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
