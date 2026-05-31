# Pre-Deployment Checklist

Items deferred until the project is prepared for public launch.

## Security Hardening

### 1. Token Storage: localStorage → httpOnly Cookie

- **Current:** Auth token in `localStorage` key `xuanxue:session`
- **Risk:** Any same-origin XSS can steal the token
- **Requires:**
  - Rewrite server auth flow to set httpOnly, Secure, SameSite=Strict cookies
  - Update `useAuth.ts` to stop reading/writing localStorage for session
  - Update all page `onMounted` restoreSession calls
  - Add CSRF protection (double-submit cookie pattern)

### 2. PIN Expansion: 4-digit → 6+ Alphanumeric

- **Current:** PIN restricted to exactly 4 digits (10,000 combinations)
- **Risk:** Low entropy (rate limiting mitigates brute-force for now)
- **Requires:**
  - Schema migration (no stored PIN length marker)
  - Update validation in `register.post.ts` and `login.post.ts`
  - PIN-reset flow for existing users on first login after migration

### 3. CSP Nonce Strategy

- **Current:** Using `'unsafe-inline'` for scripts (documented tradeoff)
- **Target:** Proper nonce injection via `@nuxtjs/csp` module or Nitro render hooks
- **Requires:** `server/plugins/csp.ts` re-enable + inject nonce into Nuxt's inline `<script>` tags

---

*Deferred per team decision on 2026-05-31. Audit reports: `docs/superpowers/audits/`*
