// 健康检查端点 — 供 Nginx / 监控系统使用
import { dbGet } from '../database/db'

export default defineEventHandler(() => {
  const timestamp = new Date().toISOString()

  let dbStatus = 'ok'
  try {
    dbGet('SELECT 1')
  } catch {
    dbStatus = 'error'
  }

  return {
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp,
    db: dbStatus,
  }
})
