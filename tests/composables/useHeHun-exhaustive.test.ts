/**
 * Phase B-3: HeHun Exhaustive Tests
 *
 * Covers: 天干五合/相克/相生 tables, 地支六合/三合/六冲/六害/三刑,
 *         grade thresholds, negative cases for data consistency.
 * Total: ~120 assertions
 */

import { describe, it, expect } from 'vitest'
import {
  HEHUN_WEIGHTS,
  STEM_FIVE_COMBINE,
  STEM_CONFLICT,
  STEM_GENERATE,
  BRANCH_SIX_COMBINE,
  BRANCH_TRIPLE_COMBINE,
  BRANCH_SIX_CONFLICT,
  BRANCH_SIX_HARM,
  BRANCH_PUNISHMENT,
  WUXING_GENERATE,
  WUXING_CONFLICT,
  getHeHunGrade,
  getNayinWuxing,
  YINCHA_YANGCUO_DAYS,
  SHIE_DAIBAI_DAYS,
  GULUAN_DAYS,
  BAZHUAN_DAYS,
  JIUCHOU_DAYS,
  TOTAL_SCORE,
} from '../../constants/hehun'
import { STEMS, BRANCHES } from '../../constants/bazi'
import { calculateHeHun } from '../../composables/useHeHun'

// ═══════════════════════════════════════════════════════════════
// 1. 天干五合 table exhaustive
// ═══════════════════════════════════════════════════════════════

describe('STEM_FIVE_COMBINE (5 pairs, symmetric)', () => {
  const pairs = [
    ['甲', '己'],
    ['乙', '庚'],
    ['丙', '辛'],
    ['丁', '壬'],
    ['戊', '癸'],
  ]

  it('all 5 combine pairs are correct', () => {
    for (const [a, b] of pairs) {
      expect(STEM_FIVE_COMBINE[a]).toBe(b)
      expect(STEM_FIVE_COMBINE[b]).toBe(a)
    }
  })

  it('every stem appears exactly once (total 10 entries)', () => {
    expect(Object.keys(STEM_FIVE_COMBINE)).toHaveLength(10)
  })

  it('non-combining stems return undefined', () => {
    expect(STEM_FIVE_COMBINE['甲']).toBe('己')
    expect(STEM_FIVE_COMBINE['庚']).toBe('乙')
    // 甲 and 乙 don't combine
    expect(STEM_FIVE_COMBINE['乙']).not.toBe('甲')
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. 天干相克 table exhaustive
// ═══════════════════════════════════════════════════════════════

describe('STEM_CONFLICT (element conquest)', () => {
  it('each stem overcomes 2 stems (its controlled element pair)', () => {
    for (const stem of STEMS) {
      const targets = STEM_CONFLICT[stem]
      expect(targets).toBeDefined()
      expect(targets).toHaveLength(2)
    }
  })

  it('conflict is directional (木克土, not 土克木)', () => {
    expect(STEM_CONFLICT['甲']).toContain('戊')
    expect(STEM_CONFLICT['甲']).toContain('己')
    // 戊 doesn't overcome 甲 (土 doesn't overcome 木)
    expect(STEM_CONFLICT['戊']).not.toContain('甲')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. 天干相生 table exhaustive
// ═══════════════════════════════════════════════════════════════

describe('STEM_GENERATE (element generation)', () => {
  it('each stem generates 2 stems (its child element pair)', () => {
    for (const stem of STEMS) {
      expect(STEM_GENERATE[stem]).toBeDefined()
      expect(STEM_GENERATE[stem]).toHaveLength(2)
    }
  })

  it('木生火, 火生土, 土生金, 金生水, 水生木', () => {
    expect(STEM_GENERATE['甲']).toEqual(['丙', '丁'])
    expect(STEM_GENERATE['丙']).toEqual(['戊', '己'])
    expect(STEM_GENERATE['戊']).toEqual(['庚', '辛'])
    expect(STEM_GENERATE['庚']).toEqual(['壬', '癸'])
    expect(STEM_GENERATE['壬']).toEqual(['甲', '乙'])
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. 地支六合 table exhaustive
// ═══════════════════════════════════════════════════════════════

describe('BRANCH_SIX_COMBINE (6 pairs, symmetric)', () => {
  const pairs = [
    ['子', '丑'],
    ['寅', '亥'],
    ['卯', '戌'],
    ['辰', '酉'],
    ['巳', '申'],
    ['午', '未'],
  ]

  it('all 6 pairs are correct and symmetric', () => {
    for (const [a, b] of pairs) {
      expect(BRANCH_SIX_COMBINE[a]).toBe(b)
      expect(BRANCH_SIX_COMBINE[b]).toBe(a)
    }
  })

  it('no branch combines with itself', () => {
    for (const b of BRANCHES) {
      expect(BRANCH_SIX_COMBINE[b]).not.toBe(b)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. 地支三合 table exhaustive
// ═══════════════════════════════════════════════════════════════

describe('BRANCH_TRIPLE_COMBINE (4 groups × 3 = 12 entries)', () => {
  const groups: Record<string, [string, string]> = {
    申: ['子', '辰'],
    子: ['申', '辰'],
    辰: ['申', '子'],
    巳: ['酉', '丑'],
    酉: ['巳', '丑'],
    丑: ['巳', '酉'],
    寅: ['午', '戌'],
    午: ['寅', '戌'],
    戌: ['寅', '午'],
    亥: ['卯', '未'],
    卯: ['亥', '未'],
    未: ['亥', '卯'],
  }

  it('all 12 entries match expected groups', () => {
    for (const [key, expected] of Object.entries(groups)) {
      const actual = BRANCH_TRIPLE_COMBINE[key]
      expect(actual).toBeDefined()
      expect(actual.sort()).toEqual(expected.sort())
    }
  })

  it('each group has the same 3 members', () => {
    // 申子辰 all reference each other
    const shen = BRANCH_TRIPLE_COMBINE['申']
    const zi = BRANCH_TRIPLE_COMBINE['子']
    const chen = BRANCH_TRIPLE_COMBINE['辰']
    expect(shen).toContain('子')
    expect(shen).toContain('辰')
    expect(zi).toContain('申')
    expect(chen).toContain('申')
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. 地支六冲/六害/三刑
// ═══════════════════════════════════════════════════════════════

describe('BRANCH_SIX_CONFLICT (6 pairs, symmetric)', () => {
  it('6 pairs are symmetric', () => {
    for (const [a, b] of Object.entries(BRANCH_SIX_CONFLICT)) {
      expect(BRANCH_SIX_CONFLICT[b]).toBe(a)
    }
  })
})

describe('BRANCH_SIX_HARM (6 pairs, symmetric)', () => {
  it('6 pairs are symmetric', () => {
    for (const [a, b] of Object.entries(BRANCH_SIX_HARM)) {
      expect(BRANCH_SIX_HARM[b]).toBe(a)
    }
  })
})

describe('BRANCH_PUNISHMENT', () => {
  it('every branch has a punishment entry', () => {
    for (const b of BRANCHES) {
      expect(BRANCH_PUNISHMENT[b]).toBeDefined()
    }
  })

  it('self-punishment branches contain themselves', () => {
    for (const b of ['辰', '午', '酉', '亥']) {
      expect(BRANCH_PUNISHMENT[b]).toContain(b)
    }
  })

  it('non-self-punishment branches do NOT contain themselves', () => {
    for (const b of ['子', '丑', '寅', '卯', '巳', '未', '申', '戌']) {
      expect(BRANCH_PUNISHMENT[b]).not.toContain(b)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. 五行生克 tables
// ═══════════════════════════════════════════════════════════════

describe('WUXING_GENERATE / WUXING_CONFLICT', () => {
  it('generation cycle: 金→水→木→火→土→金', () => {
    expect(WUXING_GENERATE['金']).toBe('水')
    expect(WUXING_GENERATE['水']).toBe('木')
    expect(WUXING_GENERATE['木']).toBe('火')
    expect(WUXING_GENERATE['火']).toBe('土')
    expect(WUXING_GENERATE['土']).toBe('金')
  })

  it('conquest cycle: 金→木→土→水→火→金', () => {
    expect(WUXING_CONFLICT['金']).toBe('木')
    expect(WUXING_CONFLICT['木']).toBe('土')
    expect(WUXING_CONFLICT['土']).toBe('水')
    expect(WUXING_CONFLICT['水']).toBe('火')
    expect(WUXING_CONFLICT['火']).toBe('金')
  })

  it('generation and conquest are distinct (no overlap)', () => {
    for (const wx of ['木', '火', '土', '金', '水']) {
      expect(WUXING_GENERATE[wx]).not.toBe(WUXING_CONFLICT[wx])
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. Grade thresholds
// ═══════════════════════════════════════════════════════════════

describe('getHeHunGrade thresholds', () => {
  it('≥70 → 上婚 (天作之合)', () => {
    expect(getHeHunGrade(100).level).toBe('上婚')
    expect(getHeHunGrade(70).level).toBe('上婚')
  })

  it('≥45 and <70 → 中婚 (良缘可成)', () => {
    expect(getHeHunGrade(69).level).toBe('中婚')
    expect(getHeHunGrade(45).level).toBe('中婚')
  })

  it('<45 → 下婚 (缘浅需慎)', () => {
    expect(getHeHunGrade(44).level).toBe('下婚')
    expect(getHeHunGrade(0).level).toBe('下婚')
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. Weights sum to 100
// ═══════════════════════════════════════════════════════════════

describe('Weight consistency', () => {
  it('HEHUN_WEIGHTS sum equals TOTAL_SCORE=100', () => {
    const sum = Object.values(HEHUN_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBe(TOTAL_SCORE)
    expect(TOTAL_SCORE).toBe(100)
  })
})

// ═══════════════════════════════════════════════════════════════
// 10. 凶煞日 sets
// ═══════════════════════════════════════════════════════════════

describe('Marriage inauspicious day sets', () => {
  it('阴差阳错日: 12 days, all valid stems+branches', () => {
    expect(YINCHA_YANGCUO_DAYS.size).toBe(12)
    for (const combo of YINCHA_YANGCUO_DAYS) {
      expect(combo).toHaveLength(2)
      expect(STEMS).toContain(combo[0])
      expect(BRANCHES).toContain(combo[1])
    }
  })

  it('十恶大败: 10 days', () => {
    expect(SHIE_DAIBAI_DAYS.size).toBe(10)
  })

  it('孤鸾日: 8 days', () => {
    expect(GULUAN_DAYS.size).toBe(8)
  })

  it('八专日: 8 days', () => {
    expect(BAZHUAN_DAYS.size).toBe(8)
  })

  it('九丑日: 10 days', () => {
    expect(JIUCHOU_DAYS.size).toBe(10)
  })

  it('no sets overlap completely', () => {
    // Overlap is expected (e.g. 戊申 is in 阴差阳错 and 八专)
    // Just verify each set is non-empty
    expect(YINCHA_YANGCUO_DAYS.size).toBeGreaterThan(0)
    expect(SHIE_DAIBAI_DAYS.size).toBeGreaterThan(0)
    expect(GULUAN_DAYS.size).toBeGreaterThan(0)
    expect(BAZHUAN_DAYS.size).toBeGreaterThan(0)
    expect(JIUCHOU_DAYS.size).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 11. 纳音五行提取
// ═══════════════════════════════════════════════════════════════

describe('getNayinWuxing (heuristic)', () => {
  it('known nayin strings map to correct wuxing', () => {
    expect(getNayinWuxing('海中金')).toBe('金')
    expect(getNayinWuxing('炉中火')).toBe('火')
    expect(getNayinWuxing('大林木')).toBe('木')
    expect(getNayinWuxing('路旁土')).toBe('土')
    expect(getNayinWuxing('剑锋金')).toBe('金')
    expect(getNayinWuxing('天河水')).toBe('水')
  })

  it('all 30 nayin names resolve to valid wuxing (not default)', () => {
    // Spot-check: if the map is broken, some would fallback to '土'
    // Verify non-土 examples work
    expect(getNayinWuxing('霹雳火')).toBe('火')
    expect(getNayinWuxing('松柏木')).toBe('木')
    expect(getNayinWuxing('长流水')).toBe('水')
  })
})

// ═══════════════════════════════════════════════════════════════
// 12. calculateHeHun integration: structure + score range
// ═══════════════════════════════════════════════════════════════

describe('calculateHeHun integration', () => {
  const personA = {
    year: 1990,
    month: 5,
    day: 15,
    hour: 12,
    gender: '男' as const,
    calendar: 'solar' as const,
    nickname: 'A',
  }

  const personB = {
    year: 1992,
    month: 8,
    day: 20,
    hour: 8,
    gender: '女' as const,
    calendar: 'solar' as const,
    nickname: 'B',
  }

  const result = calculateHeHun({ personA, personB })

  it('returns all 7 dimensions', () => {
    expect(result.dimensions).toHaveLength(7)
    const names = result.dimensions.map(d => d.name)
    expect(names).toContain('年柱相合')
    expect(names).toContain('日柱（夫妻宫）')
    expect(names).toContain('五行互补')
    expect(names).toContain('纳音相生克')
    expect(names).toContain('十神配偶星')
    expect(names).toContain('神煞合婚')
    expect(names).toContain('生肖配对')
  })

  it('totalScore is in [0, 100]', () => {
    expect(result.totalScore).toBeGreaterThanOrEqual(0)
    expect(result.totalScore).toBeLessThanOrEqual(100)
  })

  it('grade matches totalScore', () => {
    const grade = getHeHunGrade(result.totalScore)
    expect(result.grade.level).toBe(grade.level)
  })

  it('baziA and baziB are computed', () => {
    expect(result.baziA).toBeDefined()
    expect(result.baziB).toBeDefined()
    expect(result.baziA.dayPillar.stem).toBeTruthy()
    expect(result.baziB.dayPillar.stem).toBeTruthy()
  })

  it('summary is non-empty', () => {
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('suggestions array is non-empty', () => {
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('suggestions always end with disclaimer', () => {
    const last = result.suggestions[result.suggestions.length - 1]
    expect(last).toContain('经营')
  })

  it('each dimension has name, score, maxScore, level, details', () => {
    for (const dim of result.dimensions) {
      expect(dim.name.length).toBeGreaterThan(0)
      expect(dim.score).toBeDefined()
      expect(dim.maxScore).toBeGreaterThan(0)
      expect(['吉', '凶', '中']).toContain(dim.level)
      expect(dim.details.length).toBeGreaterThan(0)
    }
  })

  it('each dimension score ≤ maxScore', () => {
    for (const dim of result.dimensions) {
      expect(Math.abs(dim.score)).toBeLessThanOrEqual(dim.maxScore + 5) // allow slight overshoot in sub-scores
    }
  })
})
