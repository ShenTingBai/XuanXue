function isValidDate(year: number, month: number, day: number): boolean {
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  // Leap year: February has 29 days
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
    daysInMonth[2] = 29
  }
  return day <= daysInMonth[month]
}

export function parseDate(str: string): { year: number; month: number; day: number } | null {
  const datePart = str.split('T')[0]
  const parts = datePart.split('-')
  if (parts.length !== 3) return null
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  if (!isValidDate(year, month, day)) return null
  return { year, month, day }
}

/**
 * Format a date string as a relative time description in Chinese.
 *
 * @param dateStr - ISO date string (e.g., "2026-06-04T10:30:00Z")
 * @returns Relative time description: "刚刚", "X分钟前", "X小时前", "昨天", "X天前", "X周前", or the date itself
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  // SQLite datetime('now') returns UTC in "YYYY-MM-DD HH:MM:SS" format
  // without timezone marker. JavaScript Date.parse treats this as local
  // time, causing an offset equal to the timezone (e.g. 8h in UTC+8).
  // Append 'Z' to force UTC interpretation.
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z'
  const target = new Date(normalized).getTime()
  if (isNaN(target)) return dateStr

  const diffMs = now - target
  if (diffMs < 0) return '刚刚'
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`

  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
