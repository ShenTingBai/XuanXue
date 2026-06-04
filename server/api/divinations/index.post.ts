import { dbGet, dbRun } from '../../database/db'
import { checkRateLimit } from '../../utils/rateLimit'
import { DIVINATION_TYPES } from './shared'

const VALID_TYPES = new Set<string>(DIVINATION_TYPES)

export default defineEventHandler(async (event) => {
  const profileId = event.context.profileId
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: '会话已失效，请重新登录' })
  }

  // Rate limiting: 10 requests per minute per profile
  if (!checkRateLimit(`divination-create:${profileId}`, 10, 60000)) {
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  const body = (await readBody(event)) || {}
  const { type, input_data, result_data } = body

  if (!type || typeof type !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '缺少测算类型' })
  }

  if (!VALID_TYPES.has(type)) {
    throw createError({ statusCode: 400, statusMessage: `无效的测算类型，支持: ${DIVINATION_TYPES.join(', ')}` })
  }

  if (!input_data) {
    throw createError({ statusCode: 400, statusMessage: '缺少输入数据' })
  }

  if (!result_data) {
    throw createError({ statusCode: 400, statusMessage: '缺少结果数据' })
  }

  let inputDataStr: string
  try {
    inputDataStr = typeof input_data === 'string' ? input_data : JSON.stringify(input_data)
  } catch {
    throw createError({ statusCode: 400, statusMessage: '输入数据格式无效' })
  }
  let resultDataStr: string
  try {
    resultDataStr = typeof result_data === 'string' ? result_data : JSON.stringify(result_data)
  } catch {
    throw createError({ statusCode: 400, statusMessage: '结果数据格式无效' })
  }

  // Size limits: prevent oversized payloads from exhausting memory or bloating the database
  const MAX_PAYLOAD_BYTES = 100_000
  if (Buffer.byteLength(inputDataStr) > MAX_PAYLOAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '输入数据过大' })
  }
  if (Buffer.byteLength(resultDataStr) > MAX_PAYLOAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: '结果数据过大' })
  }

  const { lastInsertRowid } = dbRun(
    'INSERT INTO divination_results (profile_id, type, input_data, result_data) VALUES (?, ?, ?, ?)',
    [profileId, type, inputDataStr, resultDataStr]
  )

  // Get created_at for the response
  const record = dbGet('SELECT created_at FROM divination_results WHERE id = ?', [lastInsertRowid])

  return {
    id: lastInsertRowid,
    created_at: record?.created_at || new Date().toISOString(),
  }
})
