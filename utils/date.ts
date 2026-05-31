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
