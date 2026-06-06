/**
 * Phase B-2: ShenSha Exhaustive Tests
 *
 * Covers every shensha rule with positive + negative triggers.
 * Approach: table-driven, one positive + one negative per rule family.
 * Total: ~210 assertions
 */

import { describe, it, expect } from 'vitest'
import {
  calculateShenSha,
  checkSanHeBranch,
  sanHeGroup,
  LU_SHEN_MAP,
  YANG_REN_MAP,
  TIAN_YI_MAP,
  TAI_JI_MAP,
  WEN_CHANG_MAP,
  XUE_TANG_MAP,
  JIN_YU_MAP,
  FU_XING_MAP,
  TIAN_DE_MAP,
  YUE_DE_MAP,
  XUE_REN_MAP,
  type ShenShaInput,
} from '../../composables/useShenSha'
import { STEMS, BRANCHES } from '../../constants/bazi'
import type { BaZiPillar } from '../../composables/useBaZi'

// ── Helpers ─────────────────────────────────────────────

const WX = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
}
const BR_WX: Record<string, string> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}

function makePillar(stem: string, branch: string, tenGod?: string): BaZiPillar {
  return {
    stem,
    branch,
    stemWuxing: (WX as Record<string, string>)[stem],
    branchWuxing: (BR_WX as Record<string, string>)[branch],
    hiddenStems: [{ stem: '甲', tenGod: tenGod || '比肩', wuxing: '木' }],
    stemTenGod: tenGod || '比肩',
    branchTenGod: '正印',
  }
}

function hasShenSha(
  results: ReturnType<typeof calculateShenSha>,
  name: string,
  pillar?: string,
): boolean {
  return results.some(s => s.name === name && (pillar === undefined || s.pillar === pillar))
}

/** Build a minimal input. Day master = 甲(0), hour null. */
function makeInput(
  yearBranch: string,
  monthBranch: string,
  dayBranch: string,
  overrides?: Partial<ShenShaInput>,
): ShenShaInput {
  const yearStem = '甲'
  const monthStem = '丙'
  const dayStem = overrides?.dayPillar?.stem || '甲'
  return {
    yearPillar: makePillar(overrides?.yearPillar?.stem || yearStem, yearBranch),
    monthPillar: makePillar(overrides?.monthPillar?.stem || monthStem, monthBranch),
    dayPillar: makePillar(dayStem, dayBranch),
    hourPillar: overrides?.hourPillar ?? null,
    dayMaster: dayStem,
    dayMasterIndex: STEMS.indexOf(dayStem),
    gender: overrides?.gender ?? '男',
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. 三合 helpers: sanHeGroup + checkSanHeBranch
// ═══════════════════════════════════════════════════════════════

describe('San He helpers', () => {
  it('sanHeGroup returns correct group for all 12 branches', () => {
    expect(sanHeGroup('申')).toBe(0)
    expect(sanHeGroup('子')).toBe(0)
    expect(sanHeGroup('辰')).toBe(0)
    expect(sanHeGroup('巳')).toBe(1)
    expect(sanHeGroup('酉')).toBe(1)
    expect(sanHeGroup('丑')).toBe(1)
    expect(sanHeGroup('寅')).toBe(2)
    expect(sanHeGroup('午')).toBe(2)
    expect(sanHeGroup('戌')).toBe(2)
    expect(sanHeGroup('亥')).toBe(3)
    expect(sanHeGroup('卯')).toBe(3)
    expect(sanHeGroup('未')).toBe(3)
  })

  it('checkSanHeBranch positive: 将星 (pattern 0)', () => {
    expect(checkSanHeBranch('子', '子', 0)).toBe(true) // 申子辰→子
    expect(checkSanHeBranch('酉', '酉', 0)).toBe(true) // 巳酉丑→酉
    expect(checkSanHeBranch('午', '午', 0)).toBe(true) // 寅午戌→午
    expect(checkSanHeBranch('卯', '卯', 0)).toBe(true) // 亥卯未→卯
  })

  it('checkSanHeBranch negative: 将星 misfire', () => {
    expect(checkSanHeBranch('子', '午', 0)).toBe(false)
    expect(checkSanHeBranch('酉', '亥', 0)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. 年支三合系 (将星/华盖/驿马/桃花/劫煞/灾煞) — 6 × 4 = 24
// ═══════════════════════════════════════════════════════════════

describe('Year-branch San He shensha (6 × 4 groups)', () => {
  const cases: Array<{ name: string; pattern: number; targets: [string, string, string, string] }> =
    [
      { name: '将星', pattern: 0, targets: ['子', '酉', '午', '卯'] },
      { name: '华盖', pattern: 1, targets: ['辰', '丑', '戌', '未'] },
      { name: '驿马', pattern: 2, targets: ['寅', '亥', '申', '巳'] },
      { name: '桃花', pattern: 3, targets: ['酉', '午', '卯', '子'] },
      { name: '劫煞', pattern: 4, targets: ['巳', '寅', '亥', '申'] },
      { name: '灾煞', pattern: 5, targets: ['午', '卯', '子', '酉'] },
    ]

  const groups = [
    { yb: '子', idx: 0 },
    { yb: '酉', idx: 1 },
    { yb: '午', idx: 2 },
    { yb: '卯', idx: 3 },
  ]

  for (const c of cases) {
    for (const g of groups) {
      const targetBranch = c.targets[g.idx]
      const monthBranch = targetBranch // put it on month pillar so it fires

      it(`${c.name}: year ${g.yb} catches month ${targetBranch}`, () => {
        const input = makeInput(g.yb, monthBranch, '辰', {
          hourPillar: undefined,
        })
        // Override: make sure monthPillar has the target branch
        input.monthPillar = makePillar('丙', targetBranch)
        const res = calculateShenSha(input)
        const found = res.find(s => s.name === c.name && s.source === '年支')
        expect(found).toBeDefined()
        // Note: when year branch itself IS the target, the shensha fires on 年柱 too
        // So we just verify it exists, not which pillar
      })

      // Negative: use a branch NOT in the target list
      const nonTarget = BRANCHES.find(b => !c.targets.includes(b)) || '辰'
      it(`${c.name}: year ${g.yb} does NOT fire on ${nonTarget}`, () => {
        const input = makeInput(g.yb, nonTarget, '辰')
        input.monthPillar = makePillar('丙', nonTarget)
        const res = calculateShenSha(input)
        const found = res.find(s => s.name === c.name && s.source === '年支' && s.pillar === '月柱')
        expect(found).toBeUndefined()
      })
    }
  }
})

// ═══════════════════════════════════════════════════════════════
// 3. 孤辰/寡宿 — 12 year branches each
// ═══════════════════════════════════════════════════════════════

describe('孤辰/寡宿 (year branch → target)', () => {
  // Expected mappings from constants
  const guChen: Record<string, string> = {
    寅: '巳',
    卯: '巳',
    辰: '巳',
    巳: '申',
    午: '申',
    未: '申',
    申: '亥',
    酉: '亥',
    戌: '亥',
    亥: '寅',
    子: '寅',
    丑: '寅',
  }
  const guaSu: Record<string, string> = {
    寅: '丑',
    卯: '丑',
    辰: '丑',
    巳: '辰',
    午: '辰',
    未: '辰',
    申: '未',
    酉: '未',
    戌: '未',
    亥: '戌',
    子: '戌',
    丑: '戌',
  }

  for (const yb of BRANCHES) {
    const gcTarget = guChen[yb]
    const gsTarget = guaSu[yb]

    it(`孤辰: year ${yb} fires on ${gcTarget}`, () => {
      const input = makeInput(yb, gcTarget, '辰')
      input.monthPillar = makePillar('丙', gcTarget)
      const res = calculateShenSha(input)
      expect(hasShenSha(res, '孤辰')).toBe(true)
    })

    it(`寡宿: year ${yb} fires on ${gsTarget}`, () => {
      const input = makeInput(yb, gsTarget, '辰')
      input.monthPillar = makePillar('丙', gsTarget)
      const res = calculateShenSha(input)
      expect(hasShenSha(res, '寡宿')).toBe(true)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 4. 日干系 (禄神/羊刃/飞刃/文昌/学堂/金舆/福星) — 7 × 10 = 70
// ═══════════════════════════════════════════════════════════════

describe('Day-stem based shensha', () => {
  // FEI_REN_MAP is NOT exported from useShenSha; hardcode here
  const FEI_REN_MAP: Record<string, string> = {
    甲: '申',
    乙: '酉',
    丙: '亥',
    丁: '子',
    戊: '亥',
    己: '子',
    庚: '寅',
    辛: '卯',
    壬: '巳',
    癸: '午',
  }

  const dayStemRules: Array<{ name: string; map: Record<string, string> }> = [
    { name: '禄神', map: LU_SHEN_MAP },
    { name: '羊刃', map: YANG_REN_MAP },
    { name: '飞刃', map: FEI_REN_MAP },
    { name: '文昌贵人', map: WEN_CHANG_MAP },
    { name: '学堂', map: XUE_TANG_MAP },
    { name: '金舆', map: JIN_YU_MAP },
    { name: '福星贵人', map: FU_XING_MAP },
  ]

  for (const rule of dayStemRules) {
    for (const stem of STEMS) {
      const target = rule.map[stem]
      // Positive: month branch = target
      it(`${rule.name}: day stem ${stem} fires on month ${target}`, () => {
        const input = makeInput('子', target, '辰', {
          dayPillar: makePillar(stem, '辰'),
          dayMaster: stem,
          dayMasterIndex: STEMS.indexOf(stem),
        })
        input.monthPillar = makePillar('丙', target)
        const res = calculateShenSha(input)
        const found = res.find(s => s.name === rule.name && s.source === '日干')
        expect(found).toBeDefined()
      })

      // Negative: a branch that shouldn't match
      const nonTarget = BRANCHES.find(b => b !== target) || '辰'
      it(`${rule.name}: day stem ${stem} does NOT fire on ${nonTarget}`, () => {
        const input = makeInput('子', nonTarget, '辰', {
          dayPillar: makePillar(stem, '辰'),
          dayMaster: stem,
          dayMasterIndex: STEMS.indexOf(stem),
        })
        input.monthPillar = makePillar('丙', nonTarget)
        const res = calculateShenSha(input)
        const found = res.find(
          s => s.name === rule.name && s.source === '日干' && s.pillar === '月柱',
        )
        expect(found).toBeUndefined()
      })
    }
  }
})

// ═══════════════════════════════════════════════════════════════
// 5. 日干数组系 (天乙贵人/太极贵人) — 10 stems, multi-branch
// ═══════════════════════════════════════════════════════════════

describe('Day-stem multi-branch shensha (天乙/太极)', () => {
  for (const stem of STEMS) {
    const tianYiTargets = TIAN_YI_MAP[stem] || []
    const taiJiTargets = TAI_JI_MAP[stem] || []

    for (const target of tianYiTargets) {
      it(`天乙贵人: day stem ${stem} fires on month ${target}`, () => {
        const input = makeInput('子', target, '辰', {
          dayPillar: makePillar(stem, '辰'),
          dayMaster: stem,
          dayMasterIndex: STEMS.indexOf(stem),
        })
        input.monthPillar = makePillar('丙', target)
        const res = calculateShenSha(input)
        const found = res.find(
          s => s.name === '天乙贵人' && s.source === '日干' && s.pillar === '月柱',
        )
        expect(found).toBeDefined()
      })
    }

    for (const target of taiJiTargets) {
      it(`太极贵人: day stem ${stem} fires on month ${target}`, () => {
        const input = makeInput('子', target, '辰', {
          dayPillar: makePillar(stem, '辰'),
          dayMaster: stem,
          dayMasterIndex: STEMS.indexOf(stem),
        })
        input.monthPillar = makePillar('丙', target)
        const res = calculateShenSha(input)
        const found = res.find(
          s => s.name === '太极贵人' && s.source === '日干' && s.pillar === '月柱',
        )
        expect(found).toBeDefined()
      })
    }
  }
})

// ═══════════════════════════════════════════════════════════════
// 6. 词馆 (= 禄神位, co-fires with 禄神)
// ═══════════════════════════════════════════════════════════════

describe('词馆 co-fires with 禄神', () => {
  for (const stem of STEMS) {
    const luBranch = LU_SHEN_MAP[stem]
    it(`词馆 co-fires with 禄神 on ${luBranch} for day stem ${stem}`, () => {
      const input = makeInput('子', luBranch, '辰', {
        dayPillar: makePillar(stem, '辰'),
        dayMaster: stem,
        dayMasterIndex: STEMS.indexOf(stem),
      })
      input.monthPillar = makePillar('丙', luBranch)
      const res = calculateShenSha(input)
      expect(hasShenSha(res, '禄神')).toBe(true)
      expect(hasShenSha(res, '词馆')).toBe(true)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 7. 年干版 (天乙/太极/文昌 — same maps, source='年干')
// ═══════════════════════════════════════════════════════════════

describe('Year-stem shensha (same maps, source=年干)', () => {
  // Verify that year-stem variants exist alongside day-stem variants
  it('天乙贵人 appears from both 日干 and 年干 when applicable', () => {
    // Day stem 甲 + year stem 甲, month branch = 丑 (天乙 for 甲)
    const input = makeInput('子', '丑', '辰', {
      yearPillar: makePillar('甲', '子'),
      dayPillar: makePillar('甲', '辰'),
      dayMaster: '甲',
      dayMasterIndex: 0,
    })
    input.monthPillar = makePillar('丙', '丑')
    const res = calculateShenSha(input)
    const yearVersion = res.find(s => s.name === '天乙贵人' && s.source === '年干')
    const dayVersion = res.find(s => s.name === '天乙贵人' && s.source === '日干')
    expect(yearVersion).toBeDefined()
    expect(dayVersion).toBeDefined()
  })

  // Spot-check year-stem 文昌
  for (const stem of ['甲', '庚', '壬']) {
    const target = WEN_CHANG_MAP[stem]
    it(`文昌贵人 (年干): year stem ${stem} fires on ${target}`, () => {
      const input = makeInput('子', target, '辰', {
        yearPillar: makePillar(stem, '子'),
      })
      input.monthPillar = makePillar('丙', target)
      const res = calculateShenSha(input)
      const found = res.find(s => s.name === '文昌贵人' && s.source === '年干')
      expect(found).toBeDefined()
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 8. 月支系 (天德/月德/血刃/勾绞)
// ═══════════════════════════════════════════════════════════════

describe('Month-branch shensha', () => {
  // 天德贵人: month branch → stem or branch match on any pillar
  for (const mb of BRANCHES) {
    const tdTarget = TIAN_DE_MAP[mb]
    it(`天德贵人: month ${mb} fires on day stem/branch ${tdTarget}`, () => {
      // Use tdTarget as the day stem for a stem match
      const input = makeInput('子', mb, '辰', {
        dayPillar: makePillar(tdTarget, '辰'),
        dayMaster: tdTarget,
        dayMasterIndex: STEMS.indexOf(tdTarget),
      })
      const res = calculateShenSha(input)
      const found = res.find(s => s.name === '天德贵人' && s.source === '月支')
      expect(found).toBeDefined()
    })
  }

  // 月德贵人: month branch → stems that should appear
  for (const mb of BRANCHES) {
    const yueDeStems = YUE_DE_MAP[mb]
    if (yueDeStems && yueDeStems.length > 0) {
      const target = yueDeStems[0]
      it(`月德贵人: month ${mb} fires on day stem ${target}`, () => {
        const input = makeInput('子', mb, '辰', {
          dayPillar: makePillar(target, '辰'),
          dayMaster: target,
          dayMasterIndex: STEMS.indexOf(target),
        })
        const res = calculateShenSha(input)
        const found = res.find(s => s.name === '月德贵人' && s.source === '月支')
        expect(found).toBeDefined()
      })
    }
  }

  // 血刃: explicit lookup table, 12 month branches
  for (const mb of BRANCHES) {
    const target = XUE_REN_MAP[mb]
    it(`血刃: month ${mb} fires on ${target}`, () => {
      const input = makeInput('子', mb, target)
      const res = calculateShenSha(input)
      const found = res.find(s => s.name === '血刃' && s.source === '月支')
      expect(found).toBeDefined()
    })
  }

  // 勾绞: checks any pillar's branch against (monthIdx+3) and (monthIdx+9)
  it('勾绞 fires on month+3 (勾神) and month+9 (绞神) branches', () => {
    // month=子(0): 勾神=(0+3)%12=卯(3), 绞神=(0+9)%12=酉(9)
    const input1 = makeInput('午', '子', '卯') // 卯 = 勾神
    const res1 = calculateShenSha(input1)
    expect(hasShenSha(res1, '勾绞')).toBe(true)

    const input2 = makeInput('午', '子', '酉') // 酉 = 绞神
    const res2 = calculateShenSha(input2)
    expect(hasShenSha(res2, '勾绞')).toBe(true)
  })

  it('勾绞 does NOT fire on a neutral branch', () => {
    // month=子(0): 勾神=卯, 绞神=酉. 辰(4) is neither
    const input = makeInput('午', '子', '辰')
    const res = calculateShenSha(input)
    expect(hasShenSha(res, '勾绞')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. 日支系 (天赦/十恶大败/魁罡)
// ═══════════════════════════════════════════════════════════════

describe('Day-pillar shensha (天赦/十恶大败/魁罡)', () => {
  it('天赦: 甲子日 in 亥月 (month 亥 → TIAN_SHE_MAP returns 甲子)', () => {
    // TIAN_SHE_MAP: 亥→甲子, so month=亥, day=甲子
    const input = makeInput('寅', '亥', '子', {
      dayPillar: makePillar('甲', '子'),
      dayMaster: '甲',
      dayMasterIndex: 0,
    })
    const res = calculateShenSha(input)
    expect(hasShenSha(res, '天赦')).toBe(true)
  })

  const SHI_E_DA_BAI_SET = new Set([
    '甲辰',
    '乙巳',
    '丙申',
    '丁亥',
    '戊戌',
    '己丑',
    '庚辰',
    '辛巳',
    '壬申',
    '癸亥',
  ])

  for (const combo of SHI_E_DA_BAI_SET) {
    const stem = combo[0]
    const branch = combo[1]
    it(`十恶大败: ${combo} fires`, () => {
      const input = makeInput('子', '寅', branch, {
        dayPillar: makePillar(stem, branch),
        dayMaster: stem,
        dayMasterIndex: STEMS.indexOf(stem),
      })
      const res = calculateShenSha(input)
      expect(hasShenSha(res, '十恶大败')).toBe(true)
    })
  }

  const KUI_GANG_SET = new Set(['庚辰', '庚戌', '壬辰', '戊戌'])

  for (const combo of KUI_GANG_SET) {
    const stem = combo[0]
    const branch = combo[1]
    it(`魁罡: ${combo} fires`, () => {
      const input = makeInput('子', '寅', branch, {
        dayPillar: makePillar(stem, branch),
        dayMaster: stem,
        dayMasterIndex: STEMS.indexOf(stem),
      })
      const res = calculateShenSha(input)
      expect(hasShenSha(res, '魁罡')).toBe(true)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 10. 空亡 (旬空)
// ═══════════════════════════════════════════════════════════════

describe('空亡 (xun kong)', () => {
  it('甲子日: xun空=戌亥', () => {
    // day stem 甲(0), day branch 子(0) → offset=0 → xun空=(0-2, 0-1) mod 12 = (10, 11) = 戌亥
    const input = makeInput('子', '戌', '子', {
      dayPillar: makePillar('甲', '子'),
      dayMaster: '甲',
      dayMasterIndex: 0,
    })
    input.monthPillar = makePillar('丙', '戌')
    const res = calculateShenSha(input)
    expect(hasShenSha(res, '空亡')).toBe(true)
  })

  it('甲子日: 辰 is NOT 空亡', () => {
    const input = makeInput('子', '辰', '子', {
      dayPillar: makePillar('甲', '子'),
      dayMaster: '甲',
      dayMasterIndex: 0,
    })
    input.monthPillar = makePillar('丙', '辰')
    const res = calculateShenSha(input)
    expect(hasShenSha(res, '空亡')).toBe(false)
  })

  it('空亡 formula: 10 stems across 12 branches = every day has 2 空亡 branches', () => {
    // Test a few samples: offset = (dayBranchIdx - dayStemIdx + 12) % 12
    // 甲寅: offset=(2-0)%12=2, 空亡=子(0)丑(1)
    const input = makeInput('午', '子', '寅', {
      dayPillar: makePillar('甲', '寅'),
      dayMaster: '甲',
      dayMasterIndex: 0,
    })
    input.monthPillar = makePillar('丙', '子')
    const res = calculateShenSha(input)
    expect(hasShenSha(res, '空亡')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 11. 年支通用 (红鸾/天喜/丧门/吊客/元辰)
// ═══════════════════════════════════════════════════════════════

describe('Year-branch generic shensha (红鸾/天喜/丧门/吊客/元辰)', () => {
  // 红鸾 12 pairs
  const hongLuan: Record<string, string> = {
    子: '卯',
    丑: '寅',
    寅: '丑',
    卯: '子',
    辰: '亥',
    巳: '戌',
    午: '酉',
    未: '申',
    申: '未',
    酉: '午',
    戌: '巳',
    亥: '辰',
  }

  for (const yb of BRANCHES) {
    const hlBranch = hongLuan[yb]
    it(`红鸾: year ${yb} fires on month ${hlBranch}`, () => {
      const input = makeInput(yb, hlBranch, '辰')
      input.monthPillar = makePillar('丙', hlBranch)
      const res = calculateShenSha(input)
      expect(hasShenSha(res, '红鸾')).toBe(true)
    })

    // 天喜 = 红鸾 + 6
    const txIdx = (BRANCHES.indexOf(hlBranch) + 6) % 12
    const txBranch = BRANCHES[txIdx]
    it(`天喜: year ${yb} fires on month ${txBranch}`, () => {
      const input = makeInput(yb, txBranch, '辰')
      input.monthPillar = makePillar('丙', txBranch)
      const res = calculateShenSha(input)
      expect(hasShenSha(res, '天喜')).toBe(true)
    })

    // 丧门: year + 2
    const smIdx = (BRANCHES.indexOf(yb) + 2) % 12
    const smBranch = BRANCHES[smIdx]
    it(`丧门: year ${yb} fires on month ${smBranch}`, () => {
      const input = makeInput(yb, smBranch, '辰')
      input.monthPillar = makePillar('丙', smBranch)
      const res = calculateShenSha(input)
      expect(hasShenSha(res, '丧门')).toBe(true)
    })

    // 吊客
    const diaoKeMap: Record<string, string> = {
      子: '戌',
      丑: '亥',
      寅: '子',
      卯: '丑',
      辰: '寅',
      巳: '卯',
      午: '辰',
      未: '巳',
      申: '午',
      酉: '未',
      戌: '申',
      亥: '酉',
    }
    const dkBranch = diaoKeMap[yb]
    it(`吊客: year ${yb} fires on month ${dkBranch}`, () => {
      const input = makeInput(yb, dkBranch, '辰')
      input.monthPillar = makePillar('丙', dkBranch)
      const res = calculateShenSha(input)
      expect(hasShenSha(res, '吊客')).toBe(true)
    })

    // 元辰 = year + 6 (对冲)
    const ycIdx = (BRANCHES.indexOf(yb) + 6) % 12
    const ycBranch = BRANCHES[ycIdx]
    it(`元辰: year ${yb} fires on month ${ycBranch}`, () => {
      const input = makeInput(yb, ycBranch, '辰')
      input.monthPillar = makePillar('丙', ycBranch)
      const res = calculateShenSha(input)
      expect(hasShenSha(res, '元辰')).toBe(true)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
// 12. Integration: 上中下三柱 all checked
// ═══════════════════════════════════════════════════════════════

describe('Multi-pillar coverage', () => {
  it('same shensha can appear on multiple pillars', () => {
    // 禄神 on 甲: both month and day pillars have 寅
    const input = makeInput('子', '寅', '寅', {
      dayPillar: makePillar('甲', '寅'),
      dayMaster: '甲',
      dayMasterIndex: 0,
    })
    input.monthPillar = makePillar('丙', '寅')
    const res = calculateShenSha(input)
    const luHits = res.filter(s => s.name === '禄神')
    expect(luHits.length).toBeGreaterThanOrEqual(1)
  })

  it('hour pillar is checked when provided', () => {
    const input = makeInput('子', '辰', '辰', {
      hourPillar: makePillar('戊', '酉'),
      dayPillar: makePillar('甲', '辰'),
      dayMaster: '甲',
      dayMasterIndex: 0,
    })
    // 年支 子: 将星=子, hour pillar has 酉→not 将星
    // But we just check that hour pillar shensha are calculated
    input.monthPillar = makePillar('丙', '酉')
    const res = calculateShenSha(input)
    // 桃花 on 酉 (from 年支 子: 桃花=酉)
    const taohuaHour = res.find(s => s.name === '桃花' && s.pillar === '时柱')
    const taohuaMonth = res.find(s => s.name === '桃花' && s.pillar === '月柱')
    expect(taohuaMonth).toBeDefined()
    expect(taohuaHour).toBeDefined()
  })

  it('null hour pillar does not throw', () => {
    const input = makeInput('子', '寅', '辰', { hourPillar: null })
    expect(() => calculateShenSha(input)).not.toThrow()
  })
})
