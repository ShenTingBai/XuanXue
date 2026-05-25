interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateMap = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of rateMap.entries()) {
    if (now > entry.resetAt) {
      rateMap.delete(key)
    }
  }
}

/**
 * Check if a request is rate-limited.
 * @param key - Unique identifier (IP or profile ID)
 * @param maxAttempts - Maximum allowed attempts in the window
 * @param windowMs - Time window in milliseconds
 * @returns true if request is allowed, false if rate-limited
 */
export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): boolean {
  cleanup()
  const now = Date.now()
  const entry = rateMap.get(key)

  if (!entry || now > entry.resetAt) {
    // First request or window expired — reset
    rateMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxAttempts) {
    return false
  }

  entry.count++
  return true
}

/**
 * Get the client IP from an event.
 */
export function getClientIp(event: any): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return (forwarded as string).split(',')[0].trim()
  }
  const ip = getHeader(event, 'x-real-ip')
  if (ip) return ip as string
  return event.node?.req?.socket?.remoteAddress || 'unknown'
}
