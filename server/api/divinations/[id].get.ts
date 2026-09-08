import { dbGet } from '../../database/db'
import { checkRateLimit } from '../../utils/rateLimit'
import { safeJsonParse } from '../../utils/json'
import { canReadHistory } from '../../../constants/tool-catalog'

export default defineEventHandler(async event => {
  const idParam = getRouterParam(event, 'id')
  // Validate that the id parameter consists only of digits before parseInt
  if (!idParam || !/^\d+$/.test(idParam)) {
    throw createError({ statusCode: 400, statusMessage: '无效的测算记录ID' })
  }
  const id = parseInt(idParam, 10)

  const profileId = event.context.profileId
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: '会话已失效，请重新登录' })
  }

  // Rate limiting: 10 requests per minute per profile
  if (!checkRateLimit(`divination-detail:${profileId}`, 10, 60000)) {
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  const record = dbGet(
    'SELECT id, profile_id, type, input_data, result_data, created_at FROM divination_results WHERE id = ?',
    [id],
  )

  if (!record) {
    throw createError({ statusCode: 404, statusMessage: '测算记录不存在' })
  }

  if ((record.profile_id as number) !== profileId) {
    throw createError({ statusCode: 403, statusMessage: '无权访问此记录' })
  }

  // 归属通过后再按记录 type 检查历史读取策略；disabled 或未知工具类型返回 403，
  // 不解析、不返回输入与结果正文，避免通过错误顺序泄露其他账号记录内容。
  const recordType = record.type as string
  if (!canReadHistory(recordType)) {
    throw createError({ statusCode: 403, statusMessage: '当前工具暂不支持读取历史' })
  }

  return {
    id: record.id,
    type: recordType,
    input_data: safeJsonParse(record.input_data),
    result_data: safeJsonParse(record.result_data),
    created_at: record.created_at,
  }
})
