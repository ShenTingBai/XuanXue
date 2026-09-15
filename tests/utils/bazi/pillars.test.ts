import { describe, expect, it } from 'vitest'
import { BRANCHES, STEMS } from '~/constants/bazi'
import { BAZI_WUHU } from '~/constants/bazi-rules'
import {
  buildPillars,
  dayGanZhi,
  ganZhiAt,
  isNearMidnight,
  monthPillar,
  pillarFromGanZhi,
  yearGanZhi,
  type JieOccurrence,
} from '~/utils/bazi/pillars'

/**
 * 三柱纯函数：锚点算术、五虎遁、候选情形（禁止叉乘）与午夜阈值。
 *
 * 期望值来源：GB/T 33661—2017 §6.1.1（1984 甲子年）与 §6.3.2（1949-10-01 甲子日）、
 * 《三命通会》卷二·论遁月时古歌（五虎遁）、规则台账 R-BZ-008（立春同刻、禁止叉乘）。
 * 节气时刻在本文件用**合成发生列表**给出，不依赖第三方历法库；真实时刻由适配器测试与黄金样例覆盖。
 */

/** 合成"节"发生列表：只提供被测函数需要的最小信息。 */
function occurrences(entries: Array<[string, string, string, string]>): JieOccurrence[] {
  return entries.map(([name, branch, instant, date]) => ({
    name: name as JieOccurrence['name'],
    branch,
    instant,
    date,
  }))
}

describe('干支锚点算术', () => {
  it('六十甲子序按 10 干 12 支循环，可正可负', () => {
    expect(ganZhiAt(0)).toBe('甲子')
    expect(ganZhiAt(1)).toBe('乙丑')
    expect(ganZhiAt(59)).toBe('癸亥')
    expect(ganZhiAt(60)).toBe('甲子')
    expect(ganZhiAt(-1)).toBe('癸亥')
  })

  it('干支纪日锚点：1949-10-01 为甲子日（GB/T §6.3.2），相隔 60 日的日期同为甲子', () => {
    expect(dayGanZhi('1949-10-01')).toBe('甲子')
    expect(dayGanZhi('1949-11-30')).toBe('甲子')
    expect(dayGanZhi('1964-07-14')).toBe('甲子')
    expect(dayGanZhi('1950-11-30')).not.toBe('甲子')
  })

  it('相邻日在六十甲子中前进一位（含 2000 年 2 月 29 日）', () => {
    const cycleIndex = (iso: string): number => {
      const target = dayGanZhi(iso)
      for (let index = 0; index < 60; index++) {
        if (ganZhiAt(index) === target) return index
      }
      throw new Error(`not a valid ganZhi: ${target}`)
    }
    const before = cycleIndex('2000-02-28')
    expect(cycleIndex('2000-02-29')).toBe((before + 1) % 60)
    expect(cycleIndex('2000-03-01')).toBe((before + 2) % 60)
  })

  it('干支年标签以 1984 = 甲子年外推（GB/T §6.1.1）', () => {
    expect(yearGanZhi(1984)).toBe('甲子')
    expect(yearGanZhi(2044)).toBe('甲子')
    expect(yearGanZhi(1924)).toBe('甲子')
    expect(yearGanZhi(2000)).toBe('庚辰')
    expect(yearGanZhi(2026)).toBe('丙午')
  })

  it('非法日期与非法干支直接抛错，不返回近似值', () => {
    expect(() => dayGanZhi('2000-02-30')).toThrow()
    expect(() => pillarFromGanZhi('甲')).toThrow()
    expect(() => monthPillar('甲甲', '寅')).toThrow()
  })
})

describe('五虎遁月干', () => {
  it('正月（寅月）月干与古歌逐条一致', () => {
    const verses: Array<[string, string]> = [
      ['甲', '丙'],
      ['己', '丙'],
      ['乙', '戊'],
      ['庚', '戊'],
      ['丙', '庚'],
      ['辛', '庚'],
      ['丁', '壬'],
      ['壬', '壬'],
      ['戊', '甲'],
      ['癸', '甲'],
    ]
    for (const [yearGan, monthGan] of verses) {
      expect(BAZI_WUHU[yearGan]).toBe(monthGan)
      expect(monthPillar(yearGan, '寅').stem).toBe(monthGan)
    }
  })

  it('月支顺行时月干按十天干顺推，且干支组合始终落在合法配对内', () => {
    const first = monthPillar('甲', '寅')
    expect(`${first.stem}${first.branch}`).toBe('丙寅')
    expect(`${monthPillar('甲', '卯').stem}${monthPillar('甲', '卯').branch}`).toBe('丁卯')
    expect(`${monthPillar('甲', '子').stem}${monthPillar('甲', '子').branch}`).toBe('丙子')

    for (const yearGan of STEMS) {
      for (const branch of BRANCHES) {
        const pillar = monthPillar(yearGan, branch)
        // 合法甲子对：天干与地支索引同奇偶（否则不存在这一组合）。
        const stemIndex = STEMS.indexOf(pillar.stem)
        const branchIndex = BRANCHES.indexOf(pillar.branch)
        expect(Math.abs(stemIndex - branchIndex) % 2, `${yearGan}年${branch}月`).toBe(0)
      }
    }
  })

  it('五行为传统分类且来自唯一数据源', () => {
    expect(monthPillar('甲', '寅')).toEqual({
      stem: '丙',
      branch: '寅',
      stemElement: '火',
      branchElement: '木',
    })
  })
})

describe('三柱与候选情形', () => {
  /** 2000 年与 1999 年的"节"（时刻与日期为合成值，仅用于结构断言）。 */
  const around2000 = occurrences([
    ['立春', '寅', '1999-02-04 14:57', '1999-02-04'],
    ['惊蛰', '卯', '1999-03-06 09:58', '1999-03-06'],
    ['清明', '辰', '1999-04-05 14:52', '1999-04-05'],
    ['立夏', '巳', '1999-05-06 08:34', '1999-05-06'],
    ['芒种', '午', '1999-06-06 12:31', '1999-06-06'],
    ['小暑', '未', '1999-07-07 22:25', '1999-07-07'],
    ['立秋', '申', '1999-08-08 08:14', '1999-08-08'],
    ['白露', '酉', '1999-09-08 11:10', '1999-09-08'],
    ['寒露', '戌', '1999-10-09 02:34', '1999-10-09'],
    ['立冬', '亥', '1999-11-08 05:33', '1999-11-08'],
    ['大雪', '子', '1999-12-07 22:18', '1999-12-07'],
    ['小寒', '丑', '2000-01-06 09:01', '2000-01-06'],
    ['立春', '寅', '2000-02-04 20:40', '2000-02-04'],
    ['惊蛰', '卯', '2000-03-05 15:42', '2000-03-05'],
    ['清明', '辰', '2000-04-04 20:31', '2000-04-04'],
    ['立夏', '巳', '2000-05-05 14:12', '2000-05-05'],
    ['芒种', '午', '2000-06-05 18:09', '2000-06-05'],
    ['小暑', '未', '2000-07-07 04:03', '2000-07-07'],
    ['立秋', '申', '2000-08-07 14:03', '2000-08-07'],
    ['白露', '酉', '2000-09-07 16:59', '2000-09-07'],
    ['寒露', '戌', '2000-10-08 08:24', '2000-10-08'],
    ['立冬', '亥', '2000-11-07 11:26', '2000-11-07'],
    ['大雪', '子', '2000-12-07 04:07', '2000-12-07'],
  ])

  it('非边界日：唯一情形，年柱按立春分界，月柱按最近已过的「节」', () => {
    const built = buildPillars('2000-03-01', around2000)
    expect(built.scenarios).toBeNull()
    expect(built.uncertainty).toBeNull()
    expect(built.uniquePillars?.year).toMatchObject({ stem: '庚', branch: '辰' })
    // 2000-03-01 在立春之后、惊蛰之前：寅月，月干按五虎遁（庚年 → 戊）。
    expect(built.uniquePillars?.month).toMatchObject({ stem: '戊', branch: '寅' })
    expect(built.dayPillar.branch.length).toBe(1)
  })

  it('立春之前：年柱取上一年干支（以立春为年界）', () => {
    const built = buildPillars('2000-01-20', around2000)
    expect(built.uniquePillars?.year).toMatchObject({ stem: '己', branch: '卯' })
    // 小寒之后、立春之前为丑月，月干按己年五虎遁推得。
    expect(built.uniquePillars?.month.branch).toBe('丑')
  })

  it('立春当日：恰好两个完整情形，年柱与月柱同刻切换，不做叉乘', () => {
    const built = buildPillars('2000-02-04', around2000)
    expect(built.uniquePillars).toBeNull()
    expect(built.scenarios).toHaveLength(2)
    const [pre, post] = built.scenarios!
    expect(pre!.branch).toBe('pre')
    expect(post!.branch).toBe('post')
    expect(pre!.reason).toContain('立春前')
    expect(post!.reason).toContain('立春后')
    // 整组切换：前为 己卯年 + 丑月，后为 庚辰年 + 寅月。
    expect(`${pre!.yearPillar.stem}${pre!.yearPillar.branch}`).toBe('己卯')
    expect(`${post!.yearPillar.stem}${post!.yearPillar.branch}`).toBe('庚辰')
    expect(pre!.monthPillar.branch).toBe('丑')
    expect(post!.monthPillar.branch).toBe('寅')
    // 不存在跨情形拼合出来的第三、第四种组合。
    const pairs = built.scenarios!.map(item => `${item.yearPillar.stem}${item.monthPillar.branch}`)
    expect(new Set(pairs).size).toBe(2)
    expect(pairs).not.toContain('己寅')
    expect(pairs).not.toContain('庚丑')
    expect(built.uncertainty?.affected).toEqual(['year', 'month'])
  })

  it('非立春的「节」当日：两个情形共享年柱，只有月柱不同，且标明受影响的柱', () => {
    const built = buildPillars('2000-06-05', around2000)
    expect(built.scenarios).toHaveLength(2)
    const [pre, post] = built.scenarios!
    expect(`${pre!.yearPillar.stem}${pre!.yearPillar.branch}`).toBe(
      `${post!.yearPillar.stem}${post!.yearPillar.branch}`,
    )
    expect(pre!.monthPillar.branch).toBe('巳')
    expect(post!.monthPillar.branch).toBe('午')
    expect(pre!.reason).toBe('芒种前')
    expect(post!.reason).toBe('芒种后')
    expect(built.uncertainty?.boundary.term).toBe('芒种')
    expect(built.uncertainty?.affected).toEqual(['month'])
    expect(built.uncertainty?.boundary.precision).toBe('minute')
  })

  it('边界时间文字取自交节时刻（分钟级）', () => {
    const built = buildPillars('2000-02-04', around2000)
    expect(built.scenarios![0]!.reason).toBe('立春前（当日 00:00 至 20:40）')
    expect(built.scenarios![1]!.reason).toBe('立春后（20:40 至当日 24:00）')
    expect(built.uncertainty?.boundary.instant).toBe('2000-02-04 20:40')
  })

  it('缺失前置「节」或同日出现两个「节」时抛错（不猜测）', () => {
    const onlyLichun = occurrences([['立春', '寅', '2000-02-04 20:40', '2000-02-04']])
    // 该日期之前没有任何「节」：无法确定月支，必须抛错而不是假定时段。
    expect(() => buildPillars('2000-01-01', onlyLichun)).toThrow()
    const duplicated = occurrences([
      ['立春', '寅', '2000-02-04 20:40', '2000-02-04'],
      ['惊蛰', '卯', '2000-02-04 21:00', '2000-02-04'],
    ])
    expect(() => buildPillars('2000-02-04', duplicated)).toThrow()
  })
})

describe('午夜阈值', () => {
  it('距 00:00 与 24:00 不足阈值分钟时判为迫近日界（严格小于）', () => {
    expect(isNearMidnight('2000-02-04 00:00')).toBe(true)
    expect(isNearMidnight('2000-02-04 00:04')).toBe(true)
    expect(isNearMidnight('2000-02-04 00:05')).toBe(false)
    expect(isNearMidnight('2000-02-04 23:56')).toBe(true)
    expect(isNearMidnight('2000-02-04 23:55')).toBe(false)
    expect(isNearMidnight('2000-02-04 12:00')).toBe(false)
  })

  it('时刻格式非法时抛错', () => {
    expect(() => isNearMidnight('2000-02-04')).toThrow()
  })
})
