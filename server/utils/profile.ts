export interface SafeProfile {
  id: number
  nickname: string
  gender: string | null
  birth_date: string | null
  birth_calendar: string | null
  birth_hour: number | null
  birth_minute: number | null
  created_at: string
  updated_at: string
}

export function toSafeProfile(row: Record<string, unknown>): SafeProfile {
  const { pin, ...safe } = row
  return safe as SafeProfile
}
