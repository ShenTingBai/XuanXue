/**
 * 请求体字节边界（2026-09-15；2026-09-20 改为流式累计）。
 *
 * 体积上限必须按**真实 UTF-8 字节**判定，不能只信 Content-Length：
 * 缺失该头（Transfer-Encoding: chunked）时 `parseInt('0') === 0` 会直接放行，
 * 随后读入整包，未认证请求即可耗尽内存。
 *
 * 兜底读取改走 `readBoundedRawBody`：逐 chunk 累计字节并在超限时立即取消流，
 * 不再走 h3 的「先收集全部 chunk 再判定」完整缓冲路径。
 *
 * @author LiXinwen
 */

import { getHeader } from 'h3'
import type { H3Event } from 'h3'
import { readBoundedRawBody } from './bounded-request-body'

/**
 * 按真实字节读取并解析 JSON 请求体。
 *
 * - Content-Length 存在且超限 → 413（快速失败，不读体）
 * - 真实 UTF-8 字节超限 → 413（流式累计，超限即取消流，不先缓冲整包）
 * - 非法 JSON → 400
 * - 空体，或 JSON 顶层不是对象（数组、标量）→ {}，交由调用方按字段校验拒绝
 */
export async function readBoundedJsonBody(
  event: H3Event,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw createError({ statusCode: 413, statusMessage: '请求体过大' })
  }

  const raw = await readBoundedRawBody(event, maxBytes)
  if (raw == null || raw === '') return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: '请求体格式错误' })
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
  return parsed as Record<string, unknown>
}
