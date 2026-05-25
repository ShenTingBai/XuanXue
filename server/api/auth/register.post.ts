import { dbGet, dbRun } from '../../database/db'
import { createSessionToken, hashPin } from '../../utils/auth'
import { toSafeProfile } from '../../utils/profile'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  let { nickname, pin } = body || {}
  nickname = nickname?.trim() ?? ''

  if (!nickname || !pin) {
    throw createError({ statusCode: 400, statusMessage: '昵称和PIN码不能为空' })
  }

  if (!/^\d{4}$/.test(pin)) {
    throw createError({ statusCode: 400, statusMessage: 'PIN码必须为4位数字' })
  }

  if (nickname.length < 1 || nickname.length > 20) {
    throw createError({ statusCode: 400, statusMessage: '昵称长度为1-20个字符' })
  }

  const existing = dbGet('SELECT id FROM profiles WHERE nickname = ?', [nickname])
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: '该昵称已被使用' })
  }

  // Hash PIN before storing
  const hashedPin = hashPin(pin)

  let result: ReturnType<typeof dbRun>
  try {
    result = dbRun('INSERT INTO profiles (nickname, pin) VALUES (?, ?)', [nickname, hashedPin])
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE constraint failed: profiles.nickname')) {
      throw createError({ statusCode: 409, statusMessage: '该昵称已被使用' })
    }
    throw err
  }
  const profile = dbGet('SELECT * FROM profiles WHERE id = ?', [result.lastInsertRowid])

  const token = createSessionToken(result.lastInsertRowid)

  return { token, profile: toSafeProfile(profile!) }
})
