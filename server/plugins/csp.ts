import { randomUUID } from 'node:crypto'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    const headers = response.headers
    if (!headers) return
    const nonce = randomUUID()
    event.context.nonce = nonce
    const csp = headers['Content-Security-Policy']
    if (csp) {
      headers['Content-Security-Policy'] = csp.replace(/'unsafe-inline'/g, `'nonce-${nonce}'`)
    }
  })
})
