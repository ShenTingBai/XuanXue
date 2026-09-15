/**
 * 八字历法适配器测试。
 *
 * 期望值来源：docs/product/evidence/bazi/bazi-golden-cases.yaml（BZ-401/BZ-402/BZ-403 与
 * 日柱锚点样例），均为 A 级来源（国标、香港天文台、日本国立天文台）核验所得，
 * **不是**适配器输出反填。
 *
 * 重点覆盖 R-BZ-004 记录的已知陷阱：`getJieQiTable()` 同名节气的全大写别名
 * 属于相邻年份，适配器必须按目标公历年份筛选。
 */

import { describe, expect, it } from 'vitest'
import { BaziAdapterError, baziCalendarAdapter } from '~/utils/bazi/calendar-adapter'
import { isNearMidnight } from '~/utils/bazi/pillars'

describe('baziCalendarAdapter.jieInstants', () => {
  it('2026 年十二个"节"的日历日与 A 级来源一致（NAOJ 时刻换算北京时间）', () => {
    const instants = baziCalendarAdapter.jieInstants(2026)
    expect(instants['小寒'].date).toBe('2026-01-05')
    expect(instants['立春'].date).toBe('2026-02-04')
    expect(instants['惊蛰'].date).toBe('2026-03-05')
    expect(instants['清明'].date).toBe('2026-04-05')
    expect(instants['立夏'].date).toBe('2026-05-05')
    expect(instants['芒种'].date).toBe('2026-06-05')
    expect(instants['小暑'].date).toBe('2026-07-07')
    expect(instants['立秋'].date).toBe('2026-08-07')
    expect(instants['白露'].date).toBe('2026-09-07')
    expect(instants['寒露'].date).toBe('2026-10-08')
    expect(instants['立冬'].date).toBe('2026-11-07')
    expect(instants['大雪'].date).toBe('2026-12-07')
  })

  it('2000 年十二个"节"的日历日与香港天文台对照表一致', () => {
    const instants = baziCalendarAdapter.jieInstants(2000)
    expect(instants['小寒'].date).toBe('2000-01-06')
    expect(instants['立春'].date).toBe('2000-02-04')
    expect(instants['惊蛰'].date).toBe('2000-03-05')
    expect(instants['清明'].date).toBe('2000-04-04')
    expect(instants['立夏'].date).toBe('2000-05-05')
    expect(instants['芒种'].date).toBe('2000-06-05')
    expect(instants['小暑'].date).toBe('2000-07-07')
    expect(instants['立秋'].date).toBe('2000-08-07')
    expect(instants['白露'].date).toBe('2000-09-07')
    expect(instants['寒露'].date).toBe('2000-10-08')
    expect(instants['立冬'].date).toBe('2000-11-07')
    expect(instants['大雪'].date).toBe('2000-12-07')
  })

  it('同名节气的全大写别名不得被取用（大雪取本年而非相邻年）', () => {
    const instants = baziCalendarAdapter.jieInstants(2000)
    // 陷阱：2000-08-07 视角下 大雪 = 2000-12-07，而 DA_XUE = 1999-12-07。
    expect(instants['大雪'].date).toBe('2000-12-07')
    expect(instants['立春'].date).toBe('2000-02-04')
    expect(instants['小寒'].date).toBe('2000-01-06')
  })

  it('芒种跨 JST/CST 日界：北京时间应为 6 月 5 日 23:48', () => {
    const instants = baziCalendarAdapter.jieInstants(2026)
    expect(instants['芒种'].instant).toBe('2026-06-05 23:48')
  })

  it('立春时刻为北京时间（2026-02-04 04:02）', () => {
    const instants = baziCalendarAdapter.jieInstants(2026)
    expect(instants['立春'].instant).toBe('2026-02-04 04:02')
  })

  it('秒级时刻按分四舍五入，与 A 级来源的分钟口径一致', () => {
    // 依赖库秒级值 2026-05-05 19:48:44、2026-08-07 19:42:43；A 级来源发布为 19:49、19:43。
    const instants = baziCalendarAdapter.jieInstants(2026)
    expect(instants['立夏'].instant).toBe('2026-05-05 19:49')
    expect(instants['立秋'].instant).toBe('2026-08-07 19:43')
  })

  it('取整不得把边界推过日界（1911 立夏 00:00:18 仍属当日）', () => {
    const instants = baziCalendarAdapter.jieInstants(1911)
    expect(instants['立夏'].instant.endsWith(' 00:00')).toBe(true)
    expect(instants['立夏'].instant.slice(0, 10)).toBe(instants['立夏'].date)
    expect(isNearMidnight(instants['立夏'].instant)).toBe(true)
  })

  it('支持范围下界年份也能取到十二个"节"', () => {
    const instants = baziCalendarAdapter.jieInstants(1901)
    expect(instants['立春'].date.startsWith('1901-')).toBe(true)
    expect(instants['大雪'].date.startsWith('1901-')).toBe(true)
  })
})

describe('baziCalendarAdapter.dayGanZhi', () => {
  it('国标 §6.3.2 锚点为甲子日', () => {
    expect(baziCalendarAdapter.dayGanZhi('1949-10-01')).toBe('甲子')
  })

  it('跨年代样例与锚点算术一致', () => {
    expect(baziCalendarAdapter.dayGanZhi('1901-01-01')).toBe('己卯')
    expect(baziCalendarAdapter.dayGanZhi('1964-07-14')).toBe('甲子')
    expect(baziCalendarAdapter.dayGanZhi('2000-01-01')).toBe('戊午')
    expect(baziCalendarAdapter.dayGanZhi('2024-06-15')).toBe('庚戌')
    expect(baziCalendarAdapter.dayGanZhi('2026-09-14')).toBe('辛卯')
  })

  it('非法日期抛适配器错误，不返回默认干支', () => {
    expect(() => baziCalendarAdapter.dayGanZhi('2026-02-30')).toThrow(BaziAdapterError)
    expect(() => baziCalendarAdapter.dayGanZhi('not-a-date')).toThrow(BaziAdapterError)
  })
})

describe('baziCalendarAdapter 农历换算', () => {
  it('公历 → 农历：2023-03-22 为闰二月初一', () => {
    expect(baziCalendarAdapter.solarToLunar(2023, 3, 22)).toEqual({
      year: 2023,
      month: 2,
      day: 1,
      isLeapMonth: true,
    })
  })

  it('农历 → 公历：2023 闰二月初一 = 2023-03-22', () => {
    expect(baziCalendarAdapter.lunarToSolar(2023, 2, 1, true)).toBe('2023-03-22')
  })

  it('不存在的闰月与越界日抛错，不自动滚动', () => {
    // 2023 年只有闰二月（HKO 该年对照表中「閏」仅出现一次）。
    expect(() => baziCalendarAdapter.lunarToSolar(2023, 3, 1, true)).toThrow(BaziAdapterError)
    expect(() => baziCalendarAdapter.lunarToSolar(2023, 2, 31, false)).toThrow(BaziAdapterError)
    expect(() => baziCalendarAdapter.lunarToSolar(2023, 2, 0, false)).toThrow(BaziAdapterError)
  })
})
