// 敏感接口禁止持久缓存：认证、本人档案和结果历史响应设置 no-store。
// 只设置响应头，不读取请求体、不记录个人数据、不改变认证或错误响应。
const SENSITIVE_API_PREFIXES = [
  '/api/auth',
  '/api/profiles',
  '/api/divinations',
  '/api/self-profile',
  '/api/result-history',
]

function isSensitivePath(pathname: string): boolean {
  return SENSITIVE_API_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export default defineEventHandler(event => {
  // 按 pathname 匹配（忽略 query），要求路径段边界，避免误伤 /api/authentic 等相似前缀。
  const pathname = getRequestURL(event).pathname
  if (isSensitivePath(pathname)) {
    setResponseHeaders(event, {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    })
  }
})
