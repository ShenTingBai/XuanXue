export default defineNitroPlugin(() => {
  // CSP nonce injection is deferred — currently uses 'unsafe-inline'
  // per CLAUDE.md. Re-enable nonce strategy when @nuxtjs/csp or
  // proper Nitro hook injection is implemented.
})
