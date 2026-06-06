/**
 * 命簿生日智能填入
 *
 * 工具页加载时，从当前登录档案中提取生日数据，提供"一键填入"功能。
 * 不自动填入——由用户主动点击触发。
 */

import { Lunar, Solar } from 'lunar-javascript'
import { useAuth } from './useAuth'

export interface AutoFillConfig {
  /** 工具需要的日历类型 */
  calendarNeeded: 'solar' | 'lunar' | 'both'
}

export interface AutoFillBirthData {
  year: number
  month: number
  day: number
  hour: number | null
  gender: 'male' | 'female' | null
  calendar: 'solar' | 'lunar'
  /** true if cross-calendar conversion happened */
  wasConverted: boolean
  /** e.g., "阳历 1990-05-15 → 农历 四月初二" */
  conversionNote: string
  /** Source profile nickname */
  profileName: string
}

/** Parse a YYYY-MM-DD birth_date string into components */
function parseBirthDate(dateStr: string): { year: number; month: number; day: number } | null {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return null
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  return { year, month, day }
}

/** Map Profile gender ('男'|'女') to our API ('male'|'female') */
function mapGender(g: string | null | undefined): 'male' | 'female' | null {
  if (g === '男') return 'male'
  if (g === '女') return 'female'
  return null
}

/** Convert solar date to lunar date string for display */
function formatLunarDate(year: number, month: number, day: number): string {
  const lunar = Lunar.fromYmd(year, month, day)
  return `农历 ${lunar.getMonthInChinese()}${lunar.getDayInChinese()}`
}

/** Convert solar to lunar and return the lunar year/month/day */
function solarToLunar(year: number, month: number, day: number): { year: number; month: number; day: number } {
  const solar = Solar.fromYmd(year, month, day)
  const lunar = solar.getLunar()
  return { year: lunar.getYear(), month: lunar.getMonth(), day: lunar.getDay() }
}

/** Convert lunar to solar */
function lunarToSolar(year: number, month: number, day: number): { year: number; month: number; day: number } {
  const lunar = Lunar.fromYmd(year, month, day)
  const solar = lunar.getSolar()
  return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() }
}

export function useProfileAutoFill(config: AutoFillConfig = { calendarNeeded: 'both' }) {
  const { currentProfile } = useAuth()

  const showBanner = ref(false)
  const isFilled = ref(false)
  const birthData = ref<AutoFillBirthData | null>(null)

  /** Check if profile has complete birthday data and prepare the fill data */
  function checkAvailability(): void {
    const profile = currentProfile.value
    if (!profile) {
      showBanner.value = false
      return
    }

    // Need at minimum: birth_date
    if (!profile.birth_date) {
      showBanner.value = false
      return
    }

    const parsed = parseBirthDate(profile.birth_date)
    if (!parsed) {
      showBanner.value = false
      return
    }

    const profileCalendar = (profile.birth_calendar as 'solar' | 'lunar') || 'solar'

    // Check if the tool needs this calendar type or can convert
    const canConvert = config.calendarNeeded === 'both' || config.calendarNeeded === profileCalendar
    if (!canConvert) {
      showBanner.value = false
      return
    }

    showBanner.value = true
  }

  /** Execute the fill: read profile, optionally convert calendar, return data */
  function applyAutoFill(): AutoFillBirthData | null {
    const profile = currentProfile.value
    if (!profile || !profile.birth_date) return null

    const parsed = parseBirthDate(profile.birth_date)
    if (!parsed) return null

    let { year, month, day } = parsed
    let hour = profile.birth_hour ?? null
    const gender = mapGender(profile.gender)
    const profileCalendar = (profile.birth_calendar as 'solar' | 'lunar') || 'solar'
    let wasConverted = false
    let conversionNote = ''

    // Handle calendar conversion
    if (config.calendarNeeded === 'lunar' && profileCalendar === 'solar') {
      const lunar = solarToLunar(year, month, day)
      const solarDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const lunarStr = formatLunarDate(lunar.year, lunar.month, lunar.day)
      conversionNote = `阳历 ${solarDate} → ${lunarStr}`
      year = lunar.year
      month = lunar.month
      day = lunar.day
      wasConverted = true
    } else if (config.calendarNeeded === 'solar' && profileCalendar === 'lunar') {
      const solar = lunarToSolar(year, month, day)
      const lunarStr = formatLunarDate(year, month, day)
      const solarDate = `${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')}`
      conversionNote = `${lunarStr} → 阳历 ${solarDate}`
      year = solar.year
      month = solar.month
      day = solar.day
      wasConverted = true
    }

    const data: AutoFillBirthData = {
      year,
      month,
      day,
      hour,
      gender,
      calendar: config.calendarNeeded === 'both' ? profileCalendar : config.calendarNeeded,
      wasConverted,
      conversionNote,
      profileName: profile.nickname || '未命名',
    }

    birthData.value = data
    isFilled.value = true
    return data
  }

  /** Revoke fill = clear form data */
  function revokeAutoFill(): void {
    birthData.value = null
    isFilled.value = false
    checkAvailability()
  }

  /** Call this when user manually edits any field after fill */
  function markEdited(): void {
    isFilled.value = false
    showBanner.value = false
  }

  // Watch profile changes to re-check availability
  watch(() => currentProfile.value?.id, () => {
    checkAvailability()
  })

  // Initial check
  if (import.meta.client) {
    checkAvailability()
  }

  return {
    showBanner: readonly(showBanner),
    isFilled: readonly(isFilled),
    birthData: readonly(birthData),
    checkAvailability,
    applyAutoFill,
    revokeAutoFill,
    markEdited,
  }
}
