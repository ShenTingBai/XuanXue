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

/** 默认可信代理：本机回环（IPv4、IPv6、IPv4 映射 IPv6）。 */
const DEFAULT_TRUSTED_PROXIES = '127.0.0.1,::1,::ffff:127.0.0.1'

let cachedTrustedRaw: string | null = null
let cachedTrustedProxies: Set<string> = new Set()

/**
 * Parse trusted proxy IPs from TRUSTED_PROXY_IPS env var.
 * Defaults to localhost addresses (IPv4, IPv6, IPv4-mapped IPv6).
 *
 * 结果按 env 原值缓存：可信集合是常量，不必每请求重建。
 * `TRUSTED_PROXY_IPS` 必须列出**全部**代理跳（如 CDN 回源 IP），
 * 漏配只会退化为按代理 IP 限流，不会放宽安全性。
 */
function getTrustedProxies(): Set<string> {
  const raw = process.env.TRUSTED_PROXY_IPS || DEFAULT_TRUSTED_PROXIES
  if (raw !== cachedTrustedRaw) {
    cachedTrustedRaw = raw
    cachedTrustedProxies = new Set(
      raw
        .split(',')
        .map(s => normalizeAddress(s))
        .filter(Boolean),
    )
  }
  return cachedTrustedProxies
}

/** 去掉 IPv6 方括号与 IPv4 端口后缀，便于与可信代理集合比较。 */
function normalizeAddress(value: string): string {
  let addr = value.trim().toLowerCase()
  if (addr.startsWith('[')) {
    const end = addr.indexOf(']')
    if (end !== -1) addr = addr.slice(1, end)
    return addr
  }
  // 仅 IPv4 形如 1.2.3.4:5678；IPv6 的冒号属于地址本身，不能截断。
  const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(addr)
  return ipv4WithPort ? ipv4WithPort[1] : addr
}

/**
 * Get the client IP from an event.
 *
 * Only trusts X-Forwarded-For / X-Real-IP when the immediate upstream
 * connection is from a trusted proxy. Otherwise falls back to the raw
 * socket remoteAddress, which cannot be spoofed by the client.
 *
 * 2026-09-15 修复：不再取 X-Forwarded-For 的**最左值**。
 * 常见的 `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`
 * 会把客户端自带的 XFF **前置**到链首，最左值完全由攻击者控制，
 * 每请求换一个伪造 IP 即可让限流永不触发。
 * 现改为**从右向左**跳过可信代理，返回第一个不可信地址：
 * 右侧是真实代理链，左侧才是可伪造部分。
 */
export function getClientIp(event: H3Event): string {
  const remoteAddress: string = event.node?.req?.socket?.remoteAddress || 'unknown'
  const trustedProxies = getTrustedProxies()

  if (trustedProxies.has(normalizeAddress(remoteAddress))) {
    const forwarded = getHeader(event, 'x-forwarded-for')
    if (forwarded) {
      const chain = String(forwarded)
        .split(',')
        .map(s => normalizeAddress(s))
        .filter(Boolean)
      // 从右向左取第一个不可信地址；链上全部可信时不返回可伪造的左端值。
      for (let i = chain.length - 1; i >= 0; i--) {
        if (!trustedProxies.has(chain[i])) return chain[i]
      }
    }
    const realIp = getHeader(event, 'x-real-ip')
    if (realIp) {
      const normalized = normalizeAddress(String(realIp))
      // X-Real-IP 由代理单值覆盖写入，但仅在非可信地址时才作为客户端地址。
      if (normalized && !trustedProxies.has(normalized)) return normalized
    }
  }

  return remoteAddress
}
