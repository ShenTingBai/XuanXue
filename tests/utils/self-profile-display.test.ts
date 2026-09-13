import { describe, expect, it } from 'vitest'
import type { NormalizedBirthDate, RawBirthDate } from '~/types/self-profile'
import {
  formatRecordNote,
  formatSolarDisplay,
  formatUpdatedAt,
  lunarCounterpart,
  lunarDayName,
  lunarMonthName,
  rawCalendarLabel,
  resolveStatusKind,
  statusLabel,
} from '~/utils/self-profile/display'

function solarRaw(year: number, month: number, day: number): RawBirthDate {
  return { calendar: 'solar', year, month, day, isLeapMonth: null }
}

function lunarRaw(year: number, month: number, day: number, isLeapMonth: boolean): RawBirthDate {
  return { calendar: 'lunar', year, month, day, isLeapMonth }
}

function normalized(raw: RawBirthDate, solarDate: string): NormalizedBirthDate {
  return {
    raw,
    solarDate,
    conversionVersion: 'lunar-javascript 1.7.7 / self-profile-date-v1',
    confirmedAt: '2026-09-13T02:15:00.000Z',
  }
}

describe('formatSolarDisplay', () => {
  it('规范化公历转中文展示', () => {
    expect(formatSolarDisplay('1990-05-05')).toBe('1990年5月5日')
    expect(formatSolarDisplay('2000-02-05')).toBe('2000年2月5日')
  })

  it('非法输入原样返回，展示层不抛错', () => {
    expect(formatSolarDisplay('1990/05/05')).toBe('1990/05/05')
    expect(formatSolarDisplay('')).toBe('')
  })
})

describe('农历名称', () => {
  it('月名覆盖正月与腊月', () => {
    expect(lunarMonthName(1)).toBe('正月')
    expect(lunarMonthName(11)).toBe('冬月')
    expect(lunarMonthName(12)).toBe('腊月')
  })

  it('日名覆盖初十、二十、三十与廿x 写法', () => {
    expect(lunarDayName(1)).toBe('初一')
    expect(lunarDayName(9)).toBe('初九')
    expect(lunarDayName(10)).toBe('初十')
    expect(lunarDayName(11)).toBe('十一')
    expect(lunarDayName(20)).toBe('二十')
    expect(lunarDayName(21)).toBe('廿一')
    expect(lunarDayName(30)).toBe('三十')
  })
})

describe('formatRecordNote 主副口径', () => {
  it('农历填写：展示原文与「本人填写」', () => {
    expect(formatRecordNote(normalized(lunarRaw(2000, 1, 1, false), '2000-02-05'))).toBe(
      '农历 2000年 正月初一 · 本人填写',
    )
  })

  it('农历闰月：标注闰月且不吞掉日月', () => {
    expect(formatRecordNote(normalized(lunarRaw(2023, 2, 1, true), '2023-03-22'))).toBe(
      '农历 2023年 二月初一（闰月） · 本人填写',
    )
  })

  it('公历填写：展示农历对照并标注「依公历换算」，不冒充本人填写', () => {
    expect(formatRecordNote(normalized(solarRaw(1990, 5, 5), '1990-05-05'))).toBe(
      '农历 1990年 四月十一 · 依公历换算',
    )
  })

  it('规范化日期非法时不编造对照', () => {
    expect(formatRecordNote(normalized(solarRaw(1990, 5, 5), '1990/05/05'))).toBe('')
  })
})

describe('lunarCounterpart 与既有黄金样例一致', () => {
  it('1901-01-01 反查为农历 1900 年冬月十一（对应 R3 黄金 SX-001）', () => {
    expect(lunarCounterpart('1901-01-01')).toBe('农历 1900年 冬月十一')
  })

  it('闰年 2 月 29 日可反查', () => {
    expect(lunarCounterpart('2012-02-29')).toBe('农历 2012年 二月初八')
  })
})

describe('formatUpdatedAt', () => {
  it('按 Asia/Shanghai 展示到分钟', () => {
    expect(formatUpdatedAt('2026-09-13T02:15:00.000Z')).toBe('2026-09-13 10:15')
  })

  it('空值与非法值不抛错', () => {
    expect(formatUpdatedAt('')).toBe('')
    expect(formatUpdatedAt('not-a-date')).toBe('not-a-date')
  })
})

describe('状态与原始口径标签', () => {
  it('状态种类由档案与日期共同决定', () => {
    expect(resolveStatusKind(false, false)).toBe('empty')
    expect(resolveStatusKind(true, false)).toBe('deleted')
    expect(resolveStatusKind(true, true)).toBe('saved')
  })

  it('状态文案与原型一致', () => {
    expect(statusLabel('saved')).toBe('出生日期已保存')
    expect(statusLabel('deleted')).toBe('出生日期已删除')
    expect(statusLabel('empty')).toBe('尚未建档')
  })

  it('原始口径标签区分公历与农历', () => {
    expect(rawCalendarLabel(solarRaw(1990, 5, 5))).toBe('公历（本人主动填写）')
    expect(rawCalendarLabel(lunarRaw(2000, 1, 1, false))).toBe('农历（本人主动填写）')
  })
})
