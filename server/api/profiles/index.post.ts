import { dbGet, dbRun } from '../../database/db'
import { toSafeProfile } from '../../utils/profile'
import { getClientIp, checkRateLimit } from '../../utils/rateLimit'
import { parseDate } from '../../../utils/date'

export default defineEventHandler(async (event) => {
  const profileId = (event.context as any).profileId as number | undefined
  if (!profileId) {
    throw createError({ statusCode: 401, statusMessage: '会话已失效，请重新登录' })
  }

  // Rate limiting: 5 sub-profile creations per minute
  const clientIp = getClientIp(event)
  if (!checkRateLimit(`profile-create:${profileId}`, 5, 60000)) {
    throw createError({ statusCode: 429, statusMessage: '请求过于频繁，请稍后再试' })
  }

  const body = (await readBody(event)) || {}

  // Validate nickname
  if (!body.nickname || typeof body.nickname !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '请提供昵称' })
  }
  const nickname = body.nickname.trim()
  if (nickname.length < 2 || nickname.length > 20) {
    throw createError({ statusCode: 400, statusMessage: '昵称长度应为 2-20 个字符' })
  }

  // Check nickname uniqueness
  const existing = dbGet('SELECT id FROM profiles WHERE nickname = ?', [nickname])
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: '昵称已被使用' })
  }

  // Optional birth info validation
  let birthDate: string | null = null
  let birthCalendar: string | null = null
  let birthHour: number | null = null
  let birthMinute: number | null = null
  let gender: string | null = null
  let birthPlace: string | null = null
  let birthLongitude: number | null = null

  if (body.birth_date !== undefined && body.birth_date !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.birth_date)) {
      throw createError({ statusCode: 400, statusMessage: '日期格式应为 YYYY-MM-DD' })
    }
    if (!parseDate(body.birth_date)) {
      throw createError({ statusCode: 400, statusMessage: '无效的日期' })
    }
    birthDate = body.birth_date
  }

  if (body.birth_calendar !== undefined && body.birth_calendar !== null) {
    if (!['solar', 'lunar'].includes(body.birth_calendar)) {
      throw createError({ statusCode: 400, statusMessage: '历法取值: solar/lunar' })
    }
    birthCalendar = body.birth_calendar
  }

  if (body.birth_hour !== undefined && body.birth_hour !== null) {
    const h = body.birth_hour
    if (typeof h !== 'number' || h < 0 || h > 23 || !Number.isInteger(h)) {
      throw createError({ statusCode: 400, statusMessage: '时辰范围为 0-23' })
    }
    birthHour = h
  }

  if (body.birth_minute !== undefined && body.birth_minute !== null) {
    const m = body.birth_minute
    if (typeof m !== 'number' || m < 0 || m > 59 || !Number.isInteger(m)) {
      throw createError({ statusCode: 400, statusMessage: '分钟范围为 0-59' })
    }
    birthMinute = m
  }

  if (body.gender !== undefined && body.gender !== null) {
    if (!['男', '女'].includes(body.gender)) {
      throw createError({ statusCode: 400, statusMessage: '性别取值: 男/女' })
    }
    gender = body.gender
  }

  if (body.birth_place !== undefined && body.birth_place !== null) {
    if (typeof body.birth_place !== 'string' || body.birth_place.length > 50) {
      throw createError({ statusCode: 400, statusMessage: '出生地长度不能超过50个字符' })
    }
    birthPlace = body.birth_place
  }

  if (body.birth_longitude !== undefined && body.birth_longitude !== null) {
    if (typeof body.birth_longitude !== 'number' || body.birth_longitude < -180 || body.birth_longitude > 180) {
      throw createError({ statusCode: 400, statusMessage: '经度范围为 -180 至 180' })
    }
    birthLongitude = body.birth_longitude
  }

  // Insert sub-profile (no PIN — sub-profiles don't have their own login)
  const result = dbRun(
    `INSERT INTO profiles (nickname, pin, birth_date, birth_calendar, birth_hour, birth_minute, gender, birth_place, birth_longitude, parent_profile_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nickname, '', birthDate, birthCalendar, birthHour, birthMinute, gender, birthPlace, birthLongitude, profileId]
  )

  const subProfile = dbGet('SELECT * FROM profiles WHERE id = ?', [result.lastInsertRowid])
  if (!subProfile) {
    throw createError({ statusCode: 500, statusMessage: '创建子档案失败' })
  }

  return toSafeProfile(subProfile)
})
