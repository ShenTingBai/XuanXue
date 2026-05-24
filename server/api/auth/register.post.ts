import { dbGet, dbRun } from '../../database/db'
import { createSessionToken } from '../../utils/auth'
import { toSafeProfile } from '../../utils/profile'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { nickname, pin } = body || {}

  if (!nickname || !pin) {
    throw createError({ statusCode: 400, statusMessage: '昵称和PIN码不能为空' })
  }

  if (!/^\d{4}$/.test(pin)) {
    throw createError({ statusCode: 400, statusMessage: 'PIN码必须为4位数字' })
  }

  const trimmed = nickname.trim()
  if (trimmed.length < 1 || trimmed.length > 20) {
    throw createError({ statusCode: 400, statusMessage: '昵称长度为1-20个字符' })
  }

  const existing = dbGet('SELECT id FROM profiles WHERE nickname = ?', [trimmed])
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: '该昵称已被使用' })
  }

  const result = dbRun('INSERT INTO profiles (nickname, pin) VALUES (?, ?)', [trimmed, pin])
  const profile = dbGet('SELECT * FROM profiles WHERE id = ?', [result.lastInsertRowid])

  const token = createSessionToken(result.lastInsertRowid)

  return { token, profile: toSafeProfile(profile!) }
})
