import { dbAll } from '../../database/db'
import { getProfileIdFromToken } from '../../utils/auth'
import { checkRateLimit } from '../../utils/rateLimit'
import { safeJsonParse } from '../../utils/json'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const profileId = token ? getProfileIdFromToken(token) : null
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: '会话已失效，请重新登录' })
  }

  // Rate limiting: 10 requests per minute per profile
  if (!checkRateLimit(`divination-list:${profileId}`, 10, 60000)) {
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  const query = getQuery(event)
  const type = query.type as string | undefined

  let sql = 'SELECT id, type, input_data, created_at FROM divination_results WHERE profile_id = ?'
  const params: any[] = [profileId]

  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }

  sql += ' ORDER BY created_at DESC LIMIT 20'

  const rows = dbAll(sql, params)

  // Parse input_data JSON for convenience, but exclude result_data from list
  return rows.map(row => ({
    id: row.id,
    type: row.type,
    input_data: safeJsonParse(row.input_data),
    created_at: row.created_at,
  }))
})
