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

export function toSafeProfile(row: Record<string, unknown> | undefined): SafeProfile | never {
  if (!row) throw new Error('Profile row is undefined')
  const { pin, ...safe } = row
  return {
    id: safe.id as number,
    nickname: safe.nickname as string,
    birth_date: (safe.birth_date as string) ?? null,
    birth_calendar: (safe.birth_calendar as string) ?? null,
    birth_hour: (safe.birth_hour as number) ?? null,
    birth_minute: (safe.birth_minute as number) ?? null,
    gender: (safe.gender as string) ?? null,
    created_at: safe.created_at as string,
    updated_at: safe.updated_at as string,
  }
}
