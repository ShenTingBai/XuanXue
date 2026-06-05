import 'dotenv/config'

// Vitest global setup — loads .env for server-side tests

// CI fallback: .env is not committed to repo, GitHub Actions has no .env file
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'vitest-fallback-secret-not-for-production'
}
