import { randomBytes } from 'node:crypto'
import { getResponseHeader, setResponseHeader } from 'h3'

/**
 * 每请求 CSP nonce 注入。
 *
 * 2026-09-15 修复：CSP 由 nuxt.config.ts 的 routeRules 声明，Nitro 的 routeRules
 * handler 直接把它写到 event 上，**不经过** renderer 的 ctx.response.headers
 * （renderer 只返回 content-type / x-powered-by）。旧写法只读 response.headers，
 * 恒取到 undefined，nonce 替换被静默跳过 —— 响应头里始终是 'unsafe-inline'，
 * 而 <script nonce="..."> 属性照常注入，形成「有 nonce 却不生效」的假象。
 * 因此必须优先用 getResponseHeader(event, ...) 读取，并写回同一个 event。
 */
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    // Generate a cryptographically random nonce per request
    const nonce = randomBytes(16).toString('hex')

    // 优先读 event（routeRules 写入处），兼容 renderer 直接给出 CSP 的情况。
    // Replace 'unsafe-inline' in script-src with per-request nonce.
    // style-src 'unsafe-inline' is kept as-is because Vue injects inline styles
    // via Vite during hydration, and they cannot use nonces.
    // Using a specific regex to target script-src only — not the first occurrence,
    // which would break if CSP directives are reordered.
    const fromEvent = getResponseHeader(event, 'content-security-policy')
    const headers = response.headers as Record<string, string | undefined> | undefined
    const fromResponse =
      headers?.['content-security-policy'] ?? headers?.['Content-Security-Policy']
    const csp =
      typeof fromEvent === 'string'
        ? fromEvent
        : typeof fromResponse === 'string'
          ? fromResponse
          : undefined

    if (csp) {
      setResponseHeader(
        event,
        'Content-Security-Policy',
        csp.replace(/script-src\s+'self'\s+'unsafe-inline'/, `script-src 'self' 'nonce-${nonce}'`),
      )
    }

    // Inject nonce attribute into all <script> tags in the HTML body.
    // Nuxt 3 inlines __NUXT__ state and module scripts — each needs the nonce.
    // The negative lookahead prevents double-injection on tags that already
    // carry a nonce (e.g. from third-party integrations or future Nuxt versions).
    if (typeof response.body === 'string') {
      response.body = response.body.replace(
        /<script(?![^>]*\snonce[=])/gi,
        `<script nonce="${nonce}"`,
      )
    }
  })
})
