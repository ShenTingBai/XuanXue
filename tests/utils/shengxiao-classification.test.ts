// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { classifyGanZhi } from '~/utils/shengxiao/engine'

/**
 * 六十甲子分类预期测试（规则台账 §3.1）。
 *
 * 预期从独立黄金 JSON 读取；不得导入生产规则表生成预期。
 * 60 条分类是干支分类覆盖，不是 60 个公历日期换算样例。
 */

interface ClassificationCase {
  caseId: string
  inputGanZhi: string
  cycleIndex: number
  heavenlyStem: string
  earthlyBranch: string
  animal: string
  stemElement: string
  yinYang: string
  branchElement: string
  naYin: string
}

const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/fixtures/shengxiao-golden.json'), 'utf-8'),
) as {
  classification_cases: ClassificationCase[]
}

describe('shengxiao 六十甲子分类', () => {
  it('黄金 JSON 提供 60 条分类预期', () => {
    expect(fixture.classification_cases.length).toBe(60)
  })

  it('60 个干支唯一且按标准顺序（甲子→癸亥）', () => {
    const stems = '甲乙丙丁戊己庚辛壬癸'.split('')
    const branches = '子丑寅卯辰巳午未申酉戌亥'.split('')
    const expected = Array.from({ length: 60 }, (_, i) => stems[i % 10] + branches[i % 12])
    const actual = fixture.classification_cases.map(c => c.inputGanZhi)
    expect(actual).toEqual(expected)
    expect(new Set(actual).size).toBe(60)
  })

  it('12 地支生肖全部覆盖且唯一', () => {
    const animals = new Set(fixture.classification_cases.map(c => c.animal))
    expect(animals.size).toBe(12)
  })

  it('10 天干全部覆盖且唯一', () => {
    const stems = new Set(fixture.classification_cases.map(c => c.heavenlyStem))
    expect(stems.size).toBe(10)
  })

  it('30 个纳音组每组恰好两柱', () => {
    const naYinCounts = new Map<string, number>()
    for (const c of fixture.classification_cases) {
      naYinCounts.set(c.naYin, (naYinCounts.get(c.naYin) ?? 0) + 1)
    }
    expect(naYinCounts.size).toBe(30)
    for (const [name, count] of naYinCounts) {
      expect(count, `${name} 应恰好覆盖两柱`).toBe(2)
    }
  })

  it('逐字段核对 60 条分类预期', () => {
    for (const c of fixture.classification_cases) {
      const got = classifyGanZhi(c.inputGanZhi)
      expect(got.stemElement, c.caseId).toBe(c.stemElement)
      expect(got.yinYang, c.caseId).toBe(c.yinYang)
      expect(got.branchElement, c.caseId).toBe(c.branchElement)
      expect(got.naYin, c.caseId).toBe(c.naYin)
    }
  })
})
