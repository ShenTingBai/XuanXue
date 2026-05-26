import { dbGet, dbRun } from '../../database/db'
import { getProfileIdFromToken } from '../../utils/auth'
import { toSafeProfile } from '../../utils/profile'
import { getClientIp, checkRateLimit } from '../../utils/rateLimit'
import { parseDate } from '../../../utils/date'

export default defineEventHandler(async (event) => {
  const idRaw = event.context.params!.id
  if (!/^\d+$/.test(idRaw)) {
    throw createError({ statusCode: 400, statusMessage: '无效的档案ID' })
  }
  const id = parseInt(idRaw)
  if (isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: '无效的档案ID' })
  }

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const profileIdFromToken = token ? getProfileIdFromToken(token) : null
  if (!profileIdFromToken) {
    throw createError({ statusCode: 401, statusMessage: '会话已失效，请重新登录' })
  }
  if (profileIdFromToken !== id) {
    throw createError({ statusCode: 403, statusMessage: '无权修改此档案' })
  }

  // Rate limiting: 10 updates per minute per profile
  const clientIp = getClientIp(event)
  if (!checkRateLimit(`profile-update:${id}`, 10, 60000)) {
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  const body = (await readBody(event)) || {}
  const updates: string[] = []
  const values: any[] = []

  if (body.birth_date !== undefined) {
    if (body.birth_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(body.birth_date)) {
      throw createError({ statusCode: 400, statusMessage: '日期格式应为 YYYY-MM-DD' })
    }
    if (body.birth_date !== null) {
      if (!parseDate(body.birth_date)) {
        throw createError({ statusCode: 400, statusMessage: '无效的日期' })
      }
    }
    updates.push('birth_date = ?')
    values.push(body.birth_date ?? null)
  }

  if (body.birth_calendar !== undefined) {
    if (body.birth_calendar !== null && !['solar', 'lunar'].includes(body.birth_calendar)) {
      throw createError({ statusCode: 400, statusMessage: '历法取值: solar/lunar' })
    }
    updates.push('birth_calendar = ?')
    values.push(body.birth_calendar ?? null)
  }

  if (body.birth_hour !== undefined) {
    const h = body.birth_hour
    if (h !== null && (typeof h !== 'number' || h < 0 || h > 23 || !Number.isInteger(h))) {
      throw createError({ statusCode: 400, statusMessage: '时辰范围为 0-23' })
    }
    updates.push('birth_hour = ?')
    values.push(h ?? null)
  }

  if (body.birth_minute !== undefined) {
    const m = body.birth_minute
    if (m !== null && (typeof m !== 'number' || m < 0 || m > 59 || !Number.isInteger(m))) {
      throw createError({ statusCode: 400, statusMessage: '分钟范围为 0-59' })
    }
    updates.push('birth_minute = ?')
    values.push(m ?? null)
  }

  if (body.gender !== undefined) {
    if (body.gender !== null && !['男', '女'].includes(body.gender)) {
      throw createError({ statusCode: 400, statusMessage: '性别取值: 男/女' })
    }
    updates.push('gender = ?')
    values.push(body.gender ?? null)
  }

  if (updates.length === 0) {
    throw createError({ statusCode: 400, statusMessage: '没有需要更新的字段' })
  }

  updates.push("updated_at = datetime('now')")
  values.push(id)

  dbRun(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`, values)
  const profile = dbGet('SELECT * FROM profiles WHERE id = ?', [id])
  if (!profile) throw createError({ statusCode: 404, statusMessage: '档案不存在' })

  return toSafeProfile(profile)
})
