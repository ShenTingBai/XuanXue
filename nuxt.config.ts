import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isToolPubliclyAvailable, TOOL_CATALOG } from './constants/tool-catalog'

// 基于配置文件自身位置解析项目根，避免硬编码本机绝对路径。
const configDir = dirname(fileURLToPath(import.meta.url))

// 从四维工具目录派生公开范围：PWA、默认 SEO、Open Graph、Twitter 与 sitemap 共用同一来源。
const publicTools = TOOL_CATALOG.filter(tool => isToolPubliclyAvailable(tool.id))
const publicToolNames = publicTools.map(tool => tool.name)
const nonPublicToolRoutes = TOOL_CATALOG.filter(tool => !isToolPubliclyAvailable(tool.id)).map(
  tool => tool.route,
)

// 当前没有 approved/public/enabled 工具时，只保留中性定位，不列工具名称。
const publicDescription =
  publicToolNames.length > 0
    ? `传统文化自我探索：${publicToolNames.join('、')}等探索工具`
    : '传统文化自我探索'

// 敏感接口的 Service Worker 旁路：认证、档案与结果历史必须 NetworkOnly 且先于通用 API 规则匹配。
const sensitiveApiPatterns = [
  /^\/api\/auth(\/|$)/,
  /^\/api\/profiles(\/|$)/,
  /^\/api\/divinations(\/|$)/,
  /^\/api\/self-profile(\/|$)/,
]
const sensitiveRuntimeCaching = sensitiveApiPatterns.map(pattern => ({
  urlPattern: pattern,
  handler: 'NetworkOnly' as const,
  method: 'GET' as const,
}))

export default defineNuxtConfig({
  compatibilityDate: '2026-05-24',
  experimental: {
    appManifest: false,
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/eslint', '@vite-pwa/nuxt', '@nuxtjs/sitemap'],
  css: ['~/assets/css/main.css'],
  nitro: {
    hooks: {
      // 生产构建后把 sql.js 的 WASM 复制到与 sql-wasm.js 同目录的服务端输出，
      // 使 initSqlJs 默认 locateFile（__dirname 相对定位）即可加载，无需改数据库接口。
      compiled(nitro) {
        const wasmSrc = resolve(configDir, 'node_modules/sql.js/dist/sql-wasm.wasm')
        const wasmDest = join(
          nitro.options.output.serverDir,
          'node_modules/sql.js/dist/sql-wasm.wasm',
        )
        mkdirSync(dirname(wasmDest), { recursive: true })
        copyFileSync(wasmSrc, wasmDest)
      },
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '玄·道 — 传统文化自我探索',
      short_name: '玄·道',
      description: publicDescription,
      theme_color: '#F5F0E8',
      background_color: '#F5F0E8',
      display: 'standalone',
      orientation: 'portrait-primary',
      start_url: '/',
      icons: [
        { src: 'pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    workbox: {
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        // 敏感 API 先匹配，NetworkOnly：不进入持久缓存。
        ...sensitiveRuntimeCaching,
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
    exclude: ['/api/**', '/self-profile', ...nonPublicToolRoutes],
  },
  runtimeConfig: {
    public: {
      siteUrl: 'https://xuanji.me',
    },
  },
  app: {
    head: {
      title: '玄·道 - 传统文化自我探索',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
        {
          name: 'description',
          content: publicDescription,
        },
        { property: 'og:title', content: '玄·道 — 传统文化自我探索' },
        {
          property: 'og:description',
          content: publicDescription,
        },
        { property: 'og:image', content: 'https://xuanji.me/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: '玄·道 — 传统文化自我探索' },
        {
          name: 'twitter:description',
          content: publicDescription,
        },
        { name: 'twitter:image', content: 'https://xuanji.me/og-image.png' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
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
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/pwa-icon-180.png?v=1' },
        { rel: 'apple-touch-icon-precomposed', sizes: '180x180', href: '/pwa-icon-180.png?v=1' },
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
