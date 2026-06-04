import { randomBytes } from 'node:crypto'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    // Generate a cryptographically random nonce per request
    const nonce = randomBytes(16).toString('hex')

    // Replace 'unsafe-inline' in script-src with per-request nonce.
    // style-src 'unsafe-inline' is kept as-is because Vue injects inline styles
    // via Vite during hydration, and they cannot use nonces.
    // Using a specific regex to target script-src only — not the first occurrence,
    // which would break if CSP directives are reordered.
    const csp = response.headers?.['Content-Security-Policy']
    if (csp) {
      setResponseHeader(
        event,
        'Content-Security-Policy',
        csp.replace(/script-src\s+'self'\s+'unsafe-inline'/, `script-src 'self' 'nonce-${nonce}'`)
      )
    }

    // Inject nonce attribute into all <script> tags in the HTML body.
    // Nuxt 3 inlines __NUXT__ state and module scripts — each needs the nonce.
    // The negative lookahead prevents double-injection on tags that already
    // carry a nonce (e.g. from third-party integrations or future Nuxt versions).
    if (typeof response.body === 'string') {
      response.body = response.body.replace(
        /<script(?![^>]*\snonce[=])/gi,
        `<script nonce="${nonce}"`
      )
    }
  })
})
