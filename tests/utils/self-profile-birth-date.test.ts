import { describe, it, expect } from 'vitest'
import {
  normalizeBirthDate,
  isAtLeastFourteen,
  diffBirthDate,
  describeBirthDate,
  InvalidAsOfDateError,
} from '~/utils/self-profile/birth-date'
import type { RawBirthDate } from '~/types/self-profile'

/**
 * 本人档案出生日期规范化纯函数测试（只编写，不运行）。
 *
 * 独立预期覆盖：
 * - 公历闰日/非法日/小数/字符串/超界；
 * - 农历闰月未选、2024 不存在闰二月、2023 闰二月初一→2023-03-22、
 *   2024 正月初一→2024-02-10、1900 十一月十一→1901-01-01
 *   （复用已批准 R3 黄金 SX-301/SX-105/SX-001 作为独立事实，不修改黄金）；
 * - 农历月末越界拒绝且不可自动滚动；
 * - 原历法切换同公历日期仍属于差异。
 *
 * 年龄边界固定 asOfDate=2026-09-09：2012-09-09 允许、2012-09-10 拒绝；
 * 2012-02-29 在 2026-02-28 拒绝、2026-03-01 允许。asOfDate 无效返回调用错误，
 * 不用系统今天生成预期。异常转换不得输出默认日期。
 */

const AS_OF = '2026-09-09'

function solar(year: number, month: number, day: number): RawBirthDate {
  return { calendar: 'solar', year, month, day, isLeapMonth: null }
}
function lunar(year: number, month: number, day: number, isLeapMonth: boolean): RawBirthDate {
  return { calendar: 'lunar', year, month, day, isLeapMonth }
}

describe('normalizeBirthDate 公历', () => {
  it('合法公历日期通过并保留 raw 与规范化日期', () => {
    const r = normalizeBirthDate(solar(2024, 2, 10), AS_OF)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.birthDate.solarDate).toBe('2024-02-10')
      expect(r.birthDate.raw).toEqual(solar(2024, 2, 10))
      expect(r.birthDate.conversionVersion).toContain('lunar-javascript')
    }
  })

  it('公历闰年 2 月 29 日存在', () => {
    const r = normalizeBirthDate(solar(2024, 2, 29), AS_OF)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.birthDate.solarDate).toBe('2024-02-29')
  })

  it('非闰年 2 月 29 日拒绝', () => {
    const r = normalizeBirthDate(solar(2023, 2, 29), AS_OF)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('INVALID_INPUT')
  })

  it('非法月日拒绝', () => {
    expect(normalizeBirthDate(solar(2026, 2, 30), AS_OF).ok).toBe(false)
    expect(normalizeBirthDate(solar(2026, 13, 1), AS_OF).ok).toBe(false)
  })

  it('小数/字符串/NaN/无穷年月日拒绝', () => {
    // 小数属于 number，由运行时日期校验拒绝。
    expect(normalizeBirthDate(solar(2024.5, 2, 10), AS_OF).ok).toBe(false)
    // @ts-expect-error 故意传字符串
    expect(
      normalizeBirthDate(
        { calendar: 'solar', year: '2024', month: 2, day: 10, isLeapMonth: null },
        AS_OF,
      ).ok,
    ).toBe(false)
    // NaN 属于 number，但不是有效年月日。
    expect(normalizeBirthDate(solar(NaN, 2, 10), AS_OF).ok).toBe(false)
    // Infinity 属于 number，但不是有效年月日。
    expect(normalizeBirthDate(solar(Infinity, 2, 10), AS_OF).ok).toBe(false)
  })

  it('数组/额外字段/未知历法拒绝', () => {
    // @ts-expect-error 故意传数组
    expect(normalizeBirthDate([1, 2, 3], AS_OF).ok).toBe(false)
    // @ts-expect-error 故意传额外字段
    expect(
      normalizeBirthDate(
        { calendar: 'solar', year: 2024, month: 2, day: 10, isLeapMonth: null, extra: 1 },
        AS_OF,
      ).ok,
    ).toBe(false)
    // @ts-expect-error 故意传未知历法
    expect(
      normalizeBirthDate(
        { calendar: 'unknown', year: 2024, month: 2, day: 10, isLeapMonth: null },
        AS_OF,
      ).ok,
    ).toBe(false)
  })

  it('solar 的 isLeapMonth 必须为 null', () => {
    // @ts-expect-error 故意传 false
    expect(
      normalizeBirthDate(
        { calendar: 'solar', year: 2024, month: 2, day: 10, isLeapMonth: false },
        AS_OF,
      ).ok,
    ).toBe(false)
  })

  it('超出 1901-01-01 下界拒绝', () => {
    const r = normalizeBirthDate(solar(1900, 12, 31), AS_OF)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('UNSUPPORTED_DATE')
  })

  it('晚于 asOfDate 拒绝', () => {
    const r = normalizeBirthDate(solar(2026, 9, 10), AS_OF)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('UNSUPPORTED_DATE')
  })

  it('asOfDate 无效抛 InvalidAsOfDateError（调用方错误）', () => {
    expect(() => normalizeBirthDate(solar(2024, 2, 10), 'not-a-date')).toThrow(InvalidAsOfDateError)
  })
})

describe('normalizeBirthDate 农历', () => {
  it('2024 正月初一 → 2024-02-10（黄金 SX-105）', () => {
    const r = normalizeBirthDate(lunar(2024, 1, 1, false), AS_OF)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.birthDate.solarDate).toBe('2024-02-10')
  })

  it('2023 闰二月初一 → 2023-03-22（黄金 SX-301）', () => {
    const r = normalizeBirthDate(lunar(2023, 2, 1, true), AS_OF)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.birthDate.solarDate).toBe('2023-03-22')
  })

  it('1900 十一月十一 → 1901-01-01（黄金 SX-001，下界对应农历 1900）', () => {
    const r = normalizeBirthDate(lunar(1900, 11, 11, false), AS_OF)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.birthDate.solarDate).toBe('1901-01-01')
  })

  it('农历 isLeapMonth 未选（null）拒绝', () => {
    // @ts-expect-error 故意传 null 农历闰月
    expect(
      normalizeBirthDate(
        { calendar: 'lunar', year: 2024, month: 1, day: 1, isLeapMonth: null },
        AS_OF,
      ).ok,
    ).toBe(false)
  })

  it('2024 不存在闰二月拒绝', () => {
    const r = normalizeBirthDate(lunar(2024, 2, 1, true), AS_OF)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.field).toBe('month')
  })

  it('农历月末越界拒绝且不自动滚动', () => {
    // 2023 闰二月只有 29 天：30 日必须拒绝，不得滚动到三月。
    const r = normalizeBirthDate(lunar(2023, 2, 30, true), AS_OF)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.field).toBe('day')
  })

  it('农历年份超界（> asOfDate 公历年）拒绝', () => {
    const r = normalizeBirthDate(lunar(2027, 1, 1, false), AS_OF)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.code).toBe('UNSUPPORTED_DATE')
  })
})

describe('isAtLeastFourteen', () => {
  it('2012-09-09 在 2026-09-09 已满 14', () => {
    expect(isAtLeastFourteen('2012-09-09', '2026-09-09')).toBe(true)
  })

  it('2012-09-10 在 2026-09-09 未满 14', () => {
    expect(isAtLeastFourteen('2012-09-10', '2026-09-09')).toBe(false)
  })

  it('2 月 29 日出生：2026-02-28 未到周年（非闰年），2026-03-01 已到', () => {
    expect(isAtLeastFourteen('2012-02-29', '2026-02-28')).toBe(false)
    expect(isAtLeastFourteen('2012-02-29', '2026-03-01')).toBe(true)
  })

  it('不只看年份：2012-12-31 在 2026-01-01 未满', () => {
    expect(isAtLeastFourteen('2012-12-31', '2026-01-01')).toBe(false)
  })

  it('asOfDate 无效抛调用错误', () => {
    expect(() => isAtLeastFourteen('2012-09-09', 'bad')).toThrow(InvalidAsOfDateError)
  })
})

describe('diffBirthDate / describeBirthDate', () => {
  it('原历法变化即使规范化同日仍属修改', () => {
    const current = normalizeBirthDate(lunar(2024, 1, 1, false), AS_OF)
    const candidate = normalizeBirthDate(solar(2024, 2, 10), AS_OF)
    expect(current.ok).toBe(true)
    expect(candidate.ok).toBe(true)
    if (current.ok && candidate.ok) {
      expect(current.birthDate.solarDate).toBe(candidate.birthDate.solarDate)
      const diff = diffBirthDate(current.birthDate, candidate.birthDate)
      expect(diff.status).toBe('modified')
    }
  })

  it('完全相同的字段组为 kept', () => {
    const a = normalizeBirthDate(solar(2024, 2, 10), AS_OF)
    const b = normalizeBirthDate(solar(2024, 2, 10), AS_OF)
    if (a.ok && b.ok) {
      expect(diffBirthDate(a.birthDate, b.birthDate).status).toBe('kept')
    }
  })

  it('首次创建为 added', () => {
    const c = normalizeBirthDate(solar(2024, 2, 10), AS_OF)
    if (c.ok) {
      expect(diffBirthDate(null, c.birthDate).status).toBe('added')
    }
  })

  it('describeBirthDate 保留原表达与规范化日期', () => {
    const r = normalizeBirthDate(lunar(2023, 2, 1, true), AS_OF)
    if (r.ok) {
      const d = describeBirthDate(r.birthDate)
      expect(d.raw).toEqual(lunar(2023, 2, 1, true))
      expect(d.solarDate).toBe('2023-03-22')
    }
  })
})
