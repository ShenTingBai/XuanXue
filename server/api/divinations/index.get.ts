import { dbAll } from '../../database/db'
import { checkRateLimit } from '../../utils/rateLimit'
import { safeJsonParse } from '../../utils/json'
import { DIVINATION_TYPES } from './shared'

const VALID_TYPES = new Set<string>(DIVINATION_TYPES)

export default defineEventHandler(async event => {
  const profileId = event.context.profileId
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: '会话已失效，请重新登录' })
  }

  // Rate limiting: 10 requests per minute per profile
  if (!checkRateLimit(`divination-list:${profileId}`, 10, 60000)) {
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  const query = getQuery(event)
  const type = query.type as string | undefined

  // Validate type against known set — reject invalid types with 400
  if (type && !VALID_TYPES.has(type)) {
    throw createError({
      statusCode: 400,
      statusMessage: `无效的测算类型，支持: ${DIVINATION_TYPES.join(', ')}`,
    })
  }

  let sql = 'SELECT id, type, input_data, created_at FROM divination_results WHERE profile_id = ?'
  const params: (string | number | null)[] = [profileId]

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
