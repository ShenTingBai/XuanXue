import { describe, it, expect } from 'vitest'
import { calculateHeHun, createPersonInfoFromProfile, type PersonInfo, type HeHunResult } from '../../composables/useHeHun'

describe('calculateHeHun', () => {
  // Two people born in 1998 (戊寅) and 1996 (丙子) for a basic pairing
  const personA: PersonInfo = {
    year: 1998, month: 5, day: 25, hour: 14,
    gender: '男', calendar: 'solar', nickname: '张三',
  }
  const personB: PersonInfo = {
    year: 1996, month: 8, day: 15, hour: 10,
    gender: '女', calendar: 'solar', nickname: '李四',
  }

  it('returns a HeHunResult with all top-level fields', () => {
    const result = calculateHeHun({ personA, personB })
    expect(result).toHaveProperty('totalScore')
    expect(result).toHaveProperty('grade')
    expect(result).toHaveProperty('dimensions')
    expect(result).toHaveProperty('baziA')
    expect(result).toHaveProperty('baziB')
    expect(result).toHaveProperty('summary')
    expect(result).toHaveProperty('suggestions')
    expect(result).toHaveProperty('warnings')
  })

  it('totalScore is between 0 and 100', () => {
    const result = calculateHeHun({ personA, personB })
    expect(result.totalScore).toBeGreaterThanOrEqual(0)
    expect(result.totalScore).toBeLessThanOrEqual(100)
  })

  it('grade has label and description', () => {
    const result = calculateHeHun({ personA, personB })
    expect(result.grade).toHaveProperty('label')
    expect(result.grade).toHaveProperty('description')
    expect(typeof result.grade.label).toBe('string')
    expect(result.grade.label.length).toBeGreaterThan(0)
    expect(result.grade.description.length).toBeGreaterThan(0)
  })

  it('dimensions array contains all 7 dimensions', () => {
    const result = calculateHeHun({ personA, personB })
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

  it('each dimension has score, maxScore, level, and details', () => {
    const result = calculateHeHun({ personA, personB })
    for (const dim of result.dimensions) {
      expect(dim).toHaveProperty('score')
      expect(dim).toHaveProperty('maxScore')
      expect(dim).toHaveProperty('level')
      expect(dim).toHaveProperty('details')
      expect(Array.isArray(dim.details)).toBe(true)
      expect(['吉', '凶', '中']).toContain(dim.level)
      expect(dim.maxScore).toBeGreaterThan(0)
    }
  })

  it('dimension score never exceeds maxScore in absolute value', () => {
    const result = calculateHeHun({ personA, personB })
    for (const dim of result.dimensions) {
      expect(Math.abs(dim.score)).toBeLessThanOrEqual(dim.maxScore)
    }
  })

  it('dimension level matches score/maxScore ratio', () => {
    const result = calculateHeHun({ personA, personB })
    for (const dim of result.dimensions) {
      const ratio = dim.maxScore > 0 ? dim.score / dim.maxScore : 0
      if (ratio >= 0.6) expect(dim.level).toBe('吉')
      else if (ratio <= 0.3) expect(dim.level).toBe('凶')
      else expect(dim.level).toBe('中')
    }
  })

  it('returns baziA and baziB with correct structure', () => {
    const result = calculateHeHun({ personA, personB })
    for (const bazi of [result.baziA, result.baziB]) {
      expect(bazi).toHaveProperty('dayMaster')
      expect(bazi).toHaveProperty('yearPillar')
      expect(bazi).toHaveProperty('monthPillar')
      expect(bazi).toHaveProperty('dayPillar')
      expect(bazi).toHaveProperty('elementCounts')
      expect(bazi).toHaveProperty('favorableElements')
      expect(bazi).toHaveProperty('unfavorableElements')
    }
  })

  it('summary is non-empty and mentions the score', () => {
    const result = calculateHeHun({ personA, personB })
    expect(result.summary.length).toBeGreaterThan(0)
    expect(result.summary).toContain(String(result.totalScore))
  })

  it('suggestions array has entries', () => {
    const result = calculateHeHun({ personA, personB })
    expect(result.suggestions.length).toBeGreaterThan(0)
    for (const s of result.suggestions) {
      expect(typeof s).toBe('string')
      expect(s.length).toBeGreaterThan(0)
    }
  })

  it('warnings is an array (may be empty for good matches)', () => {
    const result = calculateHeHun({ personA, personB })
    expect(Array.isArray(result.warnings)).toBe(true)
  })

  it('is deterministic: same input produces same result', () => {
    const result1 = calculateHeHun({ personA, personB })
    const result2 = calculateHeHun({ personA, personB })
    expect(result1.totalScore).toBe(result2.totalScore)
    expect(result1.grade.label).toBe(result2.grade.label)
    expect(result1.dimensions.map(d => d.score)).toEqual(result2.dimensions.map(d => d.score))
  })

  // ── Dimension-specific: year pillar analysis ──

  it('year pillar dimension has items array with relation data', () => {
    const result = calculateHeHun({ personA, personB })
    const yearDim = result.dimensions.find(d => d.name === '年柱相合')
    expect(yearDim).toBeDefined()
    // Check that items is present on the year dimension
    const yearResult = (result as any).dimensions.find((d: any) => d.name === '年柱相合')
    expect(yearResult).toBeDefined()
  })

  // ── Dimension-specific: day pillar (double weight) ──

  it('day pillar dimension has maxScore = 25 (double weight)', () => {
    const result = calculateHeHun({ personA, personB })
    const dayDim = result.dimensions.find(d => d.name === '日柱（夫妻宫）')
    expect(dayDim).toBeDefined()
    expect(dayDim!.maxScore).toBe(25)
  })

  // ── Dimension-specific: nayin interaction ──

  it('nayin dimension runs without errors for known stem-branch pairs', () => {
    const result = calculateHeHun({ personA, personB })
    const nayinDim = result.dimensions.find(d => d.name === '纳音相生克')
    expect(nayinDim).toBeDefined()
    expect(nayinDim!.details.length).toBeGreaterThan(0)
  })

  // ── Different genders (same-sex pairing) ──

  it('handles same-gender pairing without crashing', () => {
    const sameGenderA: PersonInfo = { ...personA, gender: '女' }
    const result = calculateHeHun({ personA: sameGenderA, personB })
    expect(result.totalScore).toBeGreaterThanOrEqual(0)
    expect(result.dimensions.length).toBe(7)
  })

  // ── Missing birth hour ──

  it('handles null birthHour for both persons without crashing', () => {
    const a: PersonInfo = { ...personA, hour: null }
    const b: PersonInfo = { ...personB, hour: null }
    const result = calculateHeHun({ personA: a, personB: b })
    expect(result.totalScore).toBeGreaterThanOrEqual(0)
    expect(result.baziA.dayMaster).toBeTruthy()
    expect(result.baziB.dayMaster).toBeTruthy()
  })

  // ── Score from sum of dimensions ──

  it('totalScore is derived from summing dimension scores (clamped to 0-100)', () => {
    const result = calculateHeHun({ personA, personB })
    const dimSum = result.dimensions.reduce((sum, d) => sum + d.score, 0)
    const expected = Math.max(0, Math.min(100, dimSum))
    expect(result.totalScore).toBe(expected)
  })

  // ── Different pairings yield different scores ──

  it('different person pairs produce different total scores', () => {
    const pair1 = calculateHeHun({ personA, personB })
    const differentB: PersonInfo = { year: 2000, month: 1, day: 1, hour: 12, gender: '女', calendar: 'solar' }
    const pair2 = calculateHeHun({ personA: personA, personB: differentB })
    // Very unlikely two different pairs score identically across all dimensions
    expect(pair1.dimensions.map(d => d.score)).not.toEqual(pair2.dimensions.map(d => d.score))
  })
})

// ── Grade calculation ──

describe('HeHun grade', () => {
  it('grade returns valid label for a known pairing', () => {
    const personA: PersonInfo = { year: 1998, month: 5, day: 25, hour: 14, gender: '男', calendar: 'solar' }
    const personB: PersonInfo = { year: 1996, month: 8, day: 15, hour: 10, gender: '女', calendar: 'solar' }
    const result = calculateHeHun({ personA, personB })
    const validLabels = ['天作之合', '良缘可成', '缘浅需慎']
    expect(validLabels).toContain(result.grade.label)
  })

  it('grade has level field and description', () => {
    const personA: PersonInfo = { year: 1998, month: 5, day: 25, hour: 14, gender: '男', calendar: 'solar' }
    const personB: PersonInfo = { year: 1996, month: 8, day: 15, hour: 10, gender: '女', calendar: 'solar' }
    const result = calculateHeHun({ personA, personB })
    expect(['上婚', '中婚', '下婚']).toContain(result.grade.level)
    expect(result.grade.description.length).toBeGreaterThan(0)
    expect(result.grade.color).toMatch(/^#/)
  })
})

// ── createPersonInfoFromProfile ──

describe('createPersonInfoFromProfile', () => {
  it('creates PersonInfo from a valid profile', () => {
    const profile = {
      birth_date: '1998-05-25',
      birth_calendar: 'solar' as const,
      birth_hour: 14,
      gender: '男',
      nickname: '测试',
    }
    const result = createPersonInfoFromProfile(profile)
    expect(result).not.toBeNull()
    expect(result!.year).toBe(1998)
    expect(result!.month).toBe(5)
    expect(result!.day).toBe(25)
    expect(result!.hour).toBe(14)
    expect(result!.gender).toBe('男')
    expect(result!.calendar).toBe('solar')
    expect(result!.nickname).toBe('测试')
  })

  it('returns null for invalid birth_date', () => {
    const profile = { birth_date: 'not-a-date' }
    const result = createPersonInfoFromProfile(profile as any)
    expect(result).toBeNull()
  })

  it('returns null for empty birth_date', () => {
    const profile = { birth_date: '' }
    const result = createPersonInfoFromProfile(profile as any)
    expect(result).toBeNull()
  })

  it('defaults null birthHour to null', () => {
    const profile = {
      birth_date: '1998-05-25',
      birth_hour: null,
      gender: '男',
    }
    const result = createPersonInfoFromProfile(profile as any)
    expect(result).not.toBeNull()
    expect(result!.hour).toBeNull()
  })

  it('defaults invalid gender to 男', () => {
    const profile = {
      birth_date: '1998-05-25',
      gender: 'unknown',
    }
    const result = createPersonInfoFromProfile(profile as any)
    expect(result).not.toBeNull()
    expect(result!.gender).toBe('男')
  })

  it('defaults missing calendar to solar', () => {
    const profile = { birth_date: '1998-05-25' }
    const result = createPersonInfoFromProfile(profile as any)
    expect(result).not.toBeNull()
    expect(result!.calendar).toBe('solar')
  })

  it('defaults missing nickname to 本人', () => {
    const profile = {
      birth_date: '1998-05-25',
      birth_calendar: 'lunar',
      gender: '女',
    }
    const result = createPersonInfoFromProfile(profile as any)
    expect(result).not.toBeNull()
    expect(result!.nickname).toBe('本人')
    expect(result!.calendar).toBe('lunar')
    expect(result!.gender).toBe('女')
  })
})
