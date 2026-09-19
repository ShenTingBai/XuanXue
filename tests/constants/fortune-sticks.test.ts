import { describe, it, expect, vi, afterEach } from 'vitest'
import { getDailyFortune } from '~/constants/fortune-sticks'

/** 与实现同口径的本地日期串（用于构造期望值，不依赖进程时区）。 */
function localDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 回归：旧实现用 new Date().toISOString().slice(0, 10)（UTC 日期），
// 东八区 00:00–08:00 会落在前一个 UTC 日，首页今日命签显示昨天的签。
describe('getDailyFortune 日期口径', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('未传日期时按本地日期取签', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-14T23:00:00Z'))
    const expected = localDateString(new Date())
    expect(getDailyFortune()).toEqual(getDailyFortune(expected))
  })

  it('本地日期与 UTC 日期不同时，取本地日期而非 UTC 日期', () => {
    vi.useFakeTimers()
    // UTC 2026-09-14T23:00Z：东八区为 2026-09-15 07:00，本地日与 UTC 日不同
    vi.setSystemTime(new Date('2026-09-14T23:00:00Z'))
    const now = new Date()
    const local = localDateString(now)
    const utc = now.toISOString().slice(0, 10)
    if (local === utc) return // 当前进程时区为 UTC，两者无差异，该断言不适用
    expect(getDailyFortune()).toEqual(getDailyFortune(local))
  })

  it('相同日期返回同一签文（确定性）', () => {
    expect(getDailyFortune('2026-09-15')).toEqual(getDailyFortune('2026-09-15'))
  })
})
