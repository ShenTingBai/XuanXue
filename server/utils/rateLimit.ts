import { getHeader } from 'h3'
import type { H3Event } from 'h3'

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
// Periodic cleanup of stale entries (every 5 minutes)
const cleanupInterval = setInterval(cleanup, CLEANUP_INTERVAL).unref()

/** Destroy the periodic cleanup timer. Call during graceful shutdown. */
export function destroyRateLimiter(): void {
  clearInterval(cleanupInterval)
  rateMap.clear()
}

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
 * Parse trusted proxy IPs from TRUSTED_PROXY_IPS env var.
 * Defaults to localhost addresses (IPv4, IPv6, IPv4-mapped IPv6).
 */
function getTrustedProxies(): Set<string> {
  const raw = process.env.TRUSTED_PROXY_IPS || '127.0.0.1,::1,::ffff:127.0.0.1'
  return new Set(raw.split(',').map(s => s.trim().toLowerCase()))
}

/**
 * Get the client IP from an event.
 *
 * Only trusts X-Forwarded-For / X-Real-IP when the immediate upstream
 * connection is from a trusted proxy. Otherwise falls back to the raw
 * socket remoteAddress, which cannot be spoofed by the client.
 *
 * When behind a trusted proxy, the leftmost IP in X-Forwarded-For is
 * the original client (per RFC 7239).
 */
export function getClientIp(event: H3Event): string {
  const remoteAddress: string = event.node?.req?.socket?.remoteAddress || 'unknown'
  const trustedProxies = getTrustedProxies()

  if (trustedProxies.has(remoteAddress.toLowerCase())) {
    const forwarded = getHeader(event, 'x-forwarded-for')
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim()
    }
    const realIp = getHeader(event, 'x-real-ip')
    if (realIp) return (realIp as string).trim()
  }

  return remoteAddress
}
