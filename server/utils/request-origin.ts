import { getHeader, getRequestURL } from 'h3'
import type { H3Event } from 'h3'

/**
 * 同源校验：对 POST/PUT/PATCH/DELETE 比较 Origin 与当前请求源。
 * 缺失或格式非法的 Origin 一律按 403 处理；结合 Sec-Fetch-Site 拒绝 cross-site。
 * 只记录固定错误类型，不记录请求体、凭证、Cookie 或完整 URL 查询。
 */
export function assertSameOriginMutation(event: H3Event): void {
  const method = event.method
  if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH' && method !== 'DELETE') {
    return
  }

  const origin = getHeader(event, 'origin')
  if (!origin || typeof origin !== 'string') {
    throw createError({ statusCode: 403, statusMessage: '请求来源无效' })
  }

  let originUrl: URL
  try {
    originUrl = new URL(origin)
  } catch {
    throw createError({ statusCode: 403, statusMessage: '请求来源无效' })
  }

  const requestUrl = getRequestURL(event)
  if (originUrl.origin !== requestUrl.origin) {
    throw createError({ statusCode: 403, statusMessage: '请求来源无效' })
  }

  const secFetchSite = getHeader(event, 'sec-fetch-site')
  if (secFetchSite === 'cross-site') {
    throw createError({ statusCode: 403, statusMessage: '请求来源无效' })
  }
}
