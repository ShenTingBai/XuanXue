import { dbGet } from '../../database/db'
import { getProfileIdFromToken } from '../../utils/auth'
import { checkRateLimit } from '../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  const id = parseInt(event.context.params!.id)
  if (isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的测算记录ID' })
  }

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const profileId = token ? getProfileIdFromToken(token) : null
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: '会话已失效，请重新登录' })
  }

  // Rate limiting: 10 requests per minute per profile
  if (!checkRateLimit(`divination-detail:${profileId}`, 10, 60000)) {
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  const record = dbGet(
    'SELECT id, profile_id, type, input_data, result_data, created_at FROM divination_results WHERE id = ?',
    [id]
  )

  if (!record) {
    throw createError({ statusCode: 404, statusMessage: '测算记录不存在' })
  }

  if ((record.profile_id as number) !== profileId) {
    throw createError({ statusCode: 403, statusMessage: '无权访问此记录' })
  }

  return {
    id: record.id,
    type: record.type,
    input_data: safeJsonParse(record.input_data),
    result_data: safeJsonParse(record.result_data),
    created_at: record.created_at,
  }
})

function safeJsonParse(str: unknown): unknown {
  if (typeof str !== 'string') return str
  try { return JSON.parse(str) } catch { return str }
}
